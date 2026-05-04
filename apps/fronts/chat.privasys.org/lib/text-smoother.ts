// Copyright (c) Privasys. All rights reserved.
// Licensed under the GNU Affero General Public License v3.0.

/**
 * Paces a stream of text fragments at a smoother visual cadence.
 *
 * Backend SSE arrives in bursts (sealed-relay frames coalesce a few
 * detokenised vLLM deltas before flushing). Feeding those bursts
 * straight into React state causes the UI to "judder" — long pauses
 * followed by 5-15 tokens appearing all at once. The smoother keeps an
 * internal buffer and drains it character-by-character on
 * requestAnimationFrame, so the user perceives a steady typewriter.
 *
 * Strategy:
 * - push(s) appends to the buffer and starts the rAF loop.
 * - Each frame drains `max(1, ceil(buffer.length / TARGET_DRAIN_FRAMES))`
 *   characters. With TARGET_DRAIN_FRAMES = 30 (~500ms at 60fps), any
 *   sudden burst unfolds visually over half a second instead of
 *   landing in a single paint.
 * - finish() switches to a faster drain so the trailing buffer
 *   empties promptly when the stream ends, then calls onDone.
 * - cancel() drops the buffer immediately (no flush) and stops rAF.
 */
export interface TextSmoother {
    push(text: string): void;
    /** Mark the underlying stream as finished; flush remainder then onDone. */
    finish(): void;
    /** Stop and discard any unflushed text. */
    cancel(): void;
}

export interface TextSmootherOptions {
    onText: (text: string) => void;
    onDone?: () => void;
    /** Frames over which a sudden burst is spread. Default 30 (~500ms). */
    targetDrainFrames?: number;
    /** Frames over which the trailing buffer drains after finish(). Default 6. */
    finishDrainFrames?: number;
}

const TARGET_DRAIN_FRAMES_DEFAULT = 30;
const FINISH_DRAIN_FRAMES_DEFAULT = 6;

export function createTextSmoother(opts: TextSmootherOptions): TextSmoother {
    const targetFrames = Math.max(1, opts.targetDrainFrames ?? TARGET_DRAIN_FRAMES_DEFAULT);
    const finishFrames = Math.max(1, opts.finishDrainFrames ?? FINISH_DRAIN_FRAMES_DEFAULT);

    let buffer = '';
    let raf: number | null = null;
    let finishing = false;
    let cancelled = false;

    // Fall back to setTimeout if rAF is unavailable (e.g. SSR / tests).
    const schedule: (cb: () => void) => number =
        typeof requestAnimationFrame === 'function'
            ? (cb) => requestAnimationFrame(cb)
            : (cb) => (setTimeout(cb, 16) as unknown as number);
    const cancelSchedule: (id: number) => void =
        typeof cancelAnimationFrame === 'function'
            ? (id) => cancelAnimationFrame(id)
            : (id) => clearTimeout(id as unknown as ReturnType<typeof setTimeout>);

    const tick = () => {
        raf = null;
        if (cancelled) return;
        if (buffer.length === 0) {
            if (finishing) opts.onDone?.();
            return;
        }
        const frames = finishing ? finishFrames : targetFrames;
        const n = Math.max(1, Math.ceil(buffer.length / frames));
        const out = buffer.slice(0, n);
        buffer = buffer.slice(n);
        opts.onText(out);
        raf = schedule(tick);
    };

    const ensureRunning = () => {
        if (cancelled) return;
        if (raf === null) raf = schedule(tick);
    };

    return {
        push(text: string) {
            if (cancelled || !text) return;
            buffer += text;
            ensureRunning();
        },
        finish() {
            if (cancelled) return;
            finishing = true;
            ensureRunning();
        },
        cancel() {
            cancelled = true;
            buffer = '';
            if (raf !== null) {
                cancelSchedule(raf);
                raf = null;
            }
        }
    };
}

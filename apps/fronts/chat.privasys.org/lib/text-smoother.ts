// Copyright (c) Privasys. All rights reserved.
// Licensed under the GNU Affero General Public License v3.0.

/**
 * Paces a stream of text fragments at a steady visual cadence.
 *
 * Backend SSE arrives in bursts. The sealed-relay frame coalesces a
 * small number of detokenised vLLM deltas before flushing, and there
 * is additional jitter from the gateway, the network, and the React
 * scheduler. Without smoothing, the user perceives long pauses
 * punctuated by 5-10 lines of text appearing at once.
 *
 * Strategy — time-based typewriter, not buffer-fraction-based:
 *
 *  - We aim for a constant visual rate of ~120 chars/sec while idle
 *    (a comfortable reading cadence) and accelerate up to a hard
 *    ceiling of ~600 chars/sec when the buffer grows large, so we
 *    never fall more than ~MAX_LATENCY_MS behind the network stream.
 *  - On each rAF tick we drain `dt * rate` characters from the
 *    buffer, where `rate` is computed from how full the buffer is
 *    (linearly interpolated between the idle and the burst rate as
 *    the buffer crosses HIGH_WATER_CHARS).
 *  - finish() bumps the rate to the burst ceiling so the trailing
 *    buffer is emptied promptly when the stream ends.
 *  - cancel() drops the buffer immediately and stops the rAF loop.
 *
 * The previous "drain 1/N of the buffer per frame" approach made every
 * burst empty in roughly the same number of frames regardless of its
 * size, which meant a 600-char burst arriving every ~1s drew as a
 * ~100ms blast of text followed by a ~900ms pause — exactly the
 * "blocks of 5-10 lines" symptom we want to avoid. Pacing by a
 * target chars/sec rate trades a small amount of end-to-end latency
 * for a continuous typewriter cadence the user reads as smooth.
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
    /** Idle pace (chars/sec) when the buffer is small. Default 120. */
    idleCharsPerSec?: number;
    /** Burst ceiling (chars/sec) when the buffer is full. Default 600. */
    burstCharsPerSec?: number;
    /**
     * Buffer size (chars) at which the smoother accelerates from the
     * idle to the burst rate. Default 600 chars (≈ 10 lines).
     */
    highWaterChars?: number;
}

const IDLE_RATE_DEFAULT = 120;
const BURST_RATE_DEFAULT = 600;
const HIGH_WATER_DEFAULT = 600;

export function createTextSmoother(opts: TextSmootherOptions): TextSmoother {
    const idleRate = Math.max(1, opts.idleCharsPerSec ?? IDLE_RATE_DEFAULT);
    const burstRate = Math.max(idleRate, opts.burstCharsPerSec ?? BURST_RATE_DEFAULT);
    const highWater = Math.max(1, opts.highWaterChars ?? HIGH_WATER_DEFAULT);

    let buffer = '';
    let raf: number | null = null;
    let lastTickAt = 0;
    let finishing = false;
    let cancelled = false;

    // Fall back to setTimeout if rAF is unavailable (e.g. SSR / tests).
    const schedule: (cb: (t: number) => void) => number =
        typeof requestAnimationFrame === 'function'
            ? (cb) => requestAnimationFrame(cb)
            : (cb) => setTimeout(() => cb(Date.now()), 16) as unknown as number;
    const cancelSchedule: (id: number) => void =
        typeof cancelAnimationFrame === 'function'
            ? (id) => cancelAnimationFrame(id)
            : (id) => clearTimeout(id as unknown as ReturnType<typeof setTimeout>);
    const now: () => number =
        typeof performance !== 'undefined' && typeof performance.now === 'function'
            ? () => performance.now()
            : () => Date.now();

    const tick = (frameTime: number) => {
        raf = null;
        if (cancelled) return;

        if (buffer.length === 0) {
            if (finishing) opts.onDone?.();
            else lastTickAt = 0;
            return;
        }

        // Wall-clock delta since the last drained frame. Clamp the
        // first frame after an idle period to a single frame's worth
        // so we don't dump several lines at once when text starts
        // arriving after a pause.
        const t = frameTime || now();
        const dt =
            lastTickAt === 0 ? 1 / 60 : Math.min(0.25, Math.max(0, (t - lastTickAt) / 1000));
        lastTickAt = t;

        // Pick a rate between idle and burst depending on how full
        // the buffer is. finish() forces the burst rate so the
        // trailing buffer drains quickly.
        const fullness = Math.min(1, buffer.length / highWater);
        const rate = finishing
            ? burstRate
            : idleRate + (burstRate - idleRate) * fullness;

        // Always emit at least one character per frame so the
        // typewriter never stalls visually when dt is tiny (e.g. on
        // the second frame after a wake from idle).
        const n = Math.max(1, Math.min(buffer.length, Math.round(rate * dt)));
        const out = buffer.slice(0, n);
        buffer = buffer.slice(n);
        opts.onText(out);
        raf = schedule(tick);
    };

    const ensureRunning = () => {
        if (cancelled) return;
        if (raf === null) {
            // Reset wall clock so the first drained frame uses one
            // frame's worth of time, not the gap since the smoother
            // last ran.
            lastTickAt = 0;
            raf = schedule(tick);
        }
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

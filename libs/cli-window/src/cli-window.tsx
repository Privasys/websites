'use client';

import { CSSProperties, ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { DEFAULT_SCENES, Scene, Token, Tone } from './scenes';

export interface CliWindowProps {
    /** Override the default Privasys story. */
    scenes?: Scene[];
    /** Window title shown in the title bar. */
    title?: string;
    /** ms per typed character. */
    typeSpeed?: number;
    /** default ms between output lines. */
    lineDelay?: number;
    /** ms to hold a finished scene before the next one. */
    holdMs?: number;
    /** Which scene to freeze on when the user prefers reduced motion. */
    staticSceneIndex?: number;
    className?: string;
    style?: CSSProperties;
}

// Brand palette (kept inline so the component is drop-in on any site,
// independent of the host's Tailwind/theme).
const COLORS: Record<Tone, string> = {
    command: '#E6EDF3',
    flag: '#00BCF2',
    arg: '#9FE7C7',
    comment: '#7D8694',
    success: '#34E89E',
    key: '#00BCF2',
    value: '#C9D1D9',
    warn: '#E3B341',
    text: '#C9D1D9'
};

const PROMPT_COLOR = '#34E89E';
const CURSOR_COLOR = '#34E89E';

const tokenText = (tokens: Token[]) => tokens.map((t) => t.text).join('');

// Render the first `count` characters of a token list, preserving per-token colour.
function renderTyped(tokens: Token[], count: number) {
    const out: ReactNode[] = [];
    let remaining = count;
    for (let i = 0; i < tokens.length && remaining > 0; i++) {
        const t = tokens[i];
        const slice = t.text.slice(0, remaining);
        out.push(
            <span key={i} style={{ color: COLORS[t.tone ?? 'text'] }}>
                {slice}
            </span>
        );
        remaining -= t.text.length;
    }
    return out;
}

export function CliWindow({
    scenes = DEFAULT_SCENES,
    title = 'privasys',
    typeSpeed = 42,
    lineDelay = 320,
    holdMs = 2000,
    staticSceneIndex = 2,
    className,
    style
}: CliWindowProps) {
    const [sceneIndex, setSceneIndex] = useState(0);
    const [typed, setTyped] = useState(0);
    const [lines, setLines] = useState(0);
    const [active, setActive] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);

    const reducedMotion = useMemo(
        () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
        []
    );

    // Only animate while the window is on screen.
    useEffect(() => {
        const el = rootRef.current;
        if (!el || typeof IntersectionObserver === 'undefined') {
            setActive(true);
            return;
        }
        const io = new IntersectionObserver(([entry]) => setActive(entry.isIntersecting), { threshold: 0.25 });
        io.observe(el);
        return () => io.disconnect();
    }, []);

    // Reduced motion: freeze on a representative, fully-rendered scene.
    useEffect(() => {
        if (!reducedMotion) return;
        const idx = Math.min(staticSceneIndex, scenes.length - 1);
        setSceneIndex(idx);
        setTyped(tokenText(scenes[idx].command).length);
        setLines(scenes[idx].output.length);
    }, [reducedMotion, scenes, staticSceneIndex]);

    // The animation driver. async/await + a cancel flag keeps it readable and
    // tears down cleanly when the component unmounts or scrolls away.
    useEffect(() => {
        if (reducedMotion || !active) return;
        let cancelled = false;
        const timers: ReturnType<typeof setTimeout>[] = [];
        const wait = (ms: number) =>
            new Promise<void>((resolve) => {
                timers.push(setTimeout(resolve, ms));
            });

        async function run() {
            while (!cancelled) {
                for (let s = 0; s < scenes.length && !cancelled; s++) {
                    const scene = scenes[s];
                    setSceneIndex(s);
                    setTyped(0);
                    setLines(0);
                    await wait(400);

                    const cmdLen = tokenText(scene.command).length;
                    for (let i = 1; i <= cmdLen && !cancelled; i++) {
                        setTyped(i);
                        await wait(typeSpeed);
                    }
                    await wait(360);

                    for (let l = 1; l <= scene.output.length && !cancelled; l++) {
                        setLines(l);
                        await wait(scene.output[l - 1].delay ?? lineDelay);
                    }
                    await wait(scene.hold ?? holdMs);
                }
            }
        }
        run();
        return () => {
            cancelled = true;
            timers.forEach(clearTimeout);
        };
    }, [active, reducedMotion, scenes, typeSpeed, lineDelay, holdMs]);

    const scene = scenes[sceneIndex] ?? scenes[0];
    const cmdLen = tokenText(scene.command).length;
    const typingDone = typed >= cmdLen;

    return (
        <div
            ref={rootRef}
            className={className}
            style={{
                width: '100%',
                borderRadius: 14,
                overflow: 'hidden',
                background: '#0B0F17',
                border: '1px solid rgba(255,255,255,0.10)',
                boxShadow: '0 24px 60px -20px rgba(0,0,0,0.55), 0 0 0 1px rgba(0,0,0,0.2)',
                fontFamily:
                    'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
                ...style
            }}
            role='img'
            aria-label='Animated terminal: the privasys CLI signs in, deploys a confidential app, verifies its hardware attestation, calls it over RA-TLS, and wires it up for an AI agent.'
        >
            <style>{'@keyframes pvs-cli-blink{0%,49%{opacity:1}50%,100%{opacity:0}}'}</style>

            {/* Title bar */}
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '10px 14px',
                    background: 'linear-gradient(180deg, #161B26 0%, #11151E 100%)',
                    borderBottom: '1px solid rgba(255,255,255,0.06)'
                }}
                aria-hidden
            >
                <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#FF5F57' }} />
                <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#FEBC2E' }} />
                <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#28C840' }} />
                <span style={{ display: 'flex', alignItems: 'center', gap: 7, margin: '0 auto', transform: 'translateX(-14px)' }}>
                    <span style={{ fontWeight: 700, fontSize: 13, letterSpacing: 0.5 }}>
                        <span style={{ color: '#34E89E' }}>◤</span>
                        <span style={{ color: '#00BCF2' }}>◢</span>
                    </span>
                    <span style={{ color: '#8B95A5', fontSize: 12.5, fontWeight: 600 }}>{title}</span>
                </span>
            </div>

            {/* Body */}
            <div
                aria-hidden
                style={{
                    padding: '18px 18px 20px',
                    minHeight: 252,
                    fontSize: 'clamp(12px, 1.6vw, 14.5px)',
                    lineHeight: 1.7,
                    color: COLORS.text,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word'
                }}
            >
                <div>
                    <span style={{ color: PROMPT_COLOR, fontWeight: 700 }}>$&nbsp;</span>
                    {renderTyped(scene.command, typed)}
                    <span
                        style={{
                            display: 'inline-block',
                            width: 8,
                            height: '1.05em',
                            verticalAlign: 'text-bottom',
                            marginLeft: 1,
                            background: CURSOR_COLOR,
                            animation: typingDone ? 'pvs-cli-blink 1s step-end infinite' : 'none'
                        }}
                    />
                </div>
                {scene.output.slice(0, lines).map((ln, i) => (
                    <div key={`${sceneIndex}-${i}`}>
                        {ln.tokens.map((t, j) => (
                            <span key={j} style={{ color: COLORS[t.tone ?? 'text'] }}>
                                {t.text}
                            </span>
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
}

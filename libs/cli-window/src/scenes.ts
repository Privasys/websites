// Data model for the animated CLI window.
//
// A "scene" is one command typed at the prompt followed by its output. Each
// piece of text is a token with a "tone" that maps to a brand colour, so the
// command types out coloured and the output reads like a real terminal.

export type Tone =
    | 'command' // the binary / subcommands (bright)
    | 'flag' // --flags (brand blue)
    | 'arg' // positional args / strings
    | 'comment' // dim helper text
    | 'success' // green check lines
    | 'key' // field label in output
    | 'value' // field value in output
    | 'warn' // amber accent
    | 'text'; // default

export interface Token {
    text: string;
    tone?: Tone;
}

export interface OutputLine {
    tokens: Token[];
    /** ms to wait before this line appears (defaults to the component's lineDelay). */
    delay?: number;
}

export interface Scene {
    /** Tokens that get typed out after the prompt. */
    command: Token[];
    output: OutputLine[];
    /** ms to hold the finished scene before moving on (defaults to holdMs). */
    hold?: number;
}

// Small constructors keep the scene list readable.
const c = (text: string): Token => ({ text, tone: 'command' });
const f = (text: string): Token => ({ text, tone: 'flag' });
const a = (text: string): Token => ({ text, tone: 'arg' });
const line = (tokens: Token[], delay?: number): OutputLine => ({ tokens, delay });
const ok = (text: string): OutputLine => ({ tokens: [{ text: '✓ ', tone: 'success' }, { text, tone: 'success' }] });
const dim = (text: string, delay?: number): OutputLine => ({ tokens: [{ text, tone: 'comment' }], delay });
const kv = (key: string, value: string, delay?: number): OutputLine =>
    ({ tokens: [{ text: key.padEnd(13), tone: 'key' }, { text: value, tone: 'value' }], delay });

// The default story: sign in, deploy, attest, call, wire up an agent.
// Output mirrors the real `privasys` CLI (captured from a live deployment).
export const DEFAULT_SCENES: Scene[] = [
    {
        command: [c('privasys'), { text: ' auth login', tone: 'command' }],
        output: [
            dim('  Scan the QR with your Privasys Wallet, or open:'),
            line([{ text: '  https://privasys.id/device', tone: 'value' }, { text: '   code ', tone: 'comment' }, { text: 'Q7KD-9XAM', tone: 'warn' }]),
            ok('Approved on device. Signed in.')
        ]
    },
    {
        command: [c('privasys'), { text: ' apps deploy ', tone: 'command' }, a('lightpanda'), { text: ' ', tone: 'text' }, f('--watch')],
        output: [
            line([{ text: '  building   ', tone: 'comment' }, { text: 'reproducible build via GitHub Actions', tone: 'value' }]),
            line([{ text: '  uploading  ', tone: 'comment' }, { text: 'ghcr.io/privasys/lightpanda:817987b', tone: 'value' }], 500),
            line([{ text: '  starting   ', tone: 'comment' }, { text: 'Intel TDX confidential VM', tone: 'value' }], 500),
            ok('live at https://lightpanda.apps.privasys.org')
        ]
    },
    {
        command: [c('privasys'), { text: ' attest ', tone: 'command' }, a('lightpanda')],
        output: [
            kv('host', 'lightpanda.apps.privasys.org:443'),
            kv('tls', 'TLSv1.3  TLS_AES_128_GCM_SHA256', 180),
            kv('quote type', 'TDX Quote', 180),
            line([{ text: 'challenged'.padEnd(13), tone: 'key' }, { text: 'true', tone: 'value' }, { text: '  nonce 42e0ac75…', tone: 'comment' }], 180),
            line([{ text: 'workload'.padEnd(13), tone: 'key' }, { text: 'code b453d9aa…', tone: 'value' }, { text: '  image lightpanda:817987b', tone: 'comment' }], 180),
            kv('quote status', 'OK', 180),
            ok('VERIFIED   hardware attestation matches the source')
        ],
        hold: 2600
    },
    {
        command: [c('privasys'), { text: ' apps call ', tone: 'command' }, a('lightpanda'), { text: ' browse ', tone: 'command' }, f('--data'), { text: ' ', tone: 'text' }, a('\'{"url":"https://lemonde.fr"}\'')],
        output: [
            dim('  connecting over RA-TLS (verified)…'),
            line([{ text: '  <!doctype html><html lang="fr">…', tone: 'value' }], 500),
            ok('259 KB streamed directly from the enclave')
        ]
    },
    {
        command: [c('privasys'), { text: ' agents init', tone: 'command' }],
        output: [
            ok('created .mcp.json'),
            ok('created AGENTS.md'),
            dim('  Your AI agent can now deploy and verify confidential apps.', 400)
        ],
        hold: 2600
    }
];

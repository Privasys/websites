// Splits assistant content that contains reasoning blocks into a list
// of ordered segments. Supports <think>...</think> and <thinking>...
// </thinking> tags emitted inline by reasoning models (Gemma "thinking",
// DeepSeek-R1, etc.) when vLLM is started without a --reasoning-parser.
//
// During streaming the closing tag may not have arrived yet; in that
// case the trailing partial reasoning block is returned with closed=false
// so the UI can render an in-progress "Thinking…" indicator.

export type Segment =
    | { kind: 'thinking'; text: string; closed: boolean }
    | { kind: 'answer'; text: string };

const OPEN = /<(think|thinking)>/i;

export function splitReasoning(content: string): Segment[] {
    if (!content) return [];
    const out: Segment[] = [];
    let rest = content;

    while (rest.length > 0) {
        const open = rest.match(OPEN);
        if (!open || open.index === undefined) {
            if (rest) out.push({ kind: 'answer', text: rest });
            break;
        }

        const before = rest.slice(0, open.index);
        if (before) out.push({ kind: 'answer', text: before });

        const tag = open[1].toLowerCase();
        const closeRe = new RegExp(`</${tag}>`, 'i');
        const afterOpen = rest.slice(open.index + open[0].length);
        const close = afterOpen.match(closeRe);

        if (!close || close.index === undefined) {
            // Unclosed: still streaming the reasoning block.
            out.push({ kind: 'thinking', text: afterOpen, closed: false });
            break;
        }

        const inner = afterOpen.slice(0, close.index);
        out.push({ kind: 'thinking', text: inner, closed: true });
        rest = afterOpen.slice(close.index + close[0].length);
    }

    return out;
}

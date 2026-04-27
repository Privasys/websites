// Friendly display name for a model id.
//
// Model ids on the wire come in several flavours: an on-disk path
// served by vLLM ("/models/gemma4-31b"), a short alias the
// management-service publishes ("gemma4"), or a full HuggingFace
// repo name ("google/gemma-4-31b-it"). The chat UI should always
// show something the user can actually read.
//
// Rules:
//   * strip a leading "/models/" prefix.
//   * for hf-style "<org>/<model>", drop the org.
//   * try to recognise <family><major><suffix>-<size> patterns
//     ("gemma4-31b" -> "Gemma 4 31B"). Falls back to the raw
//     basename otherwise.
export function modelLabel(name: string): string {
    if (!name) return '';
    let n = name;
    if (n.startsWith('/models/')) n = n.slice('/models/'.length);
    const slash = n.indexOf('/');
    if (slash !== -1) n = n.slice(slash + 1);

    const m = /^([a-z]+)([0-9]+)(?:[._]?([a-z0-9]+))?(?:-(\d+[a-z]+))?(.*)$/i.exec(n);
    if (m) {
        const family = capitalise(m[1] ?? '');
        const version = m[2] ?? '';
        const variant = m[3] ?? '';
        const size = (m[4] ?? '').toUpperCase();
        const tail = (m[5] ?? '').replace(/^[-_]/, '');
        return [family, version, variant, size, tail].filter(Boolean).join(' ').trim();
    }
    return n;
}

function capitalise(s: string): string {
    if (!s) return s;
    return s[0].toUpperCase() + s.slice(1);
}

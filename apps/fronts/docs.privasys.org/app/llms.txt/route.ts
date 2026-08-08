import { DOCS_BASE, getLlmsPages, sectionOf, sectionTitle } from '@/lib/llms';

export const dynamic = 'force-static';

/**
 * llms.txt (https://llmstxt.org) — a markdown index of the documentation for
 * AI assistants (Claude, ChatGPT, Gemini, Perplexity, …). Each entry links the
 * HTML page and its raw-markdown twin under /md/.
 */
export function GET(): Response {
    const pages = getLlmsPages();

    const lines: string[] = [
        '# Privasys Documentation',
        '',
        '> Privasys is a confidential computing platform: applications run inside',
        '> hardware-attested enclaves (Intel SGX, Intel TDX, AMD SEV-SNP) so that',
        '> neither Privasys nor the cloud provider can see user data. The platform',
        '> covers an enclave OS for WASM and container apps, attested key management',
        '> (Enclave Vaults), confidential AI inference, an encrypted Drive, a',
        '> privacy-preserving identity wallet, and RA-TLS attested transport.',
        '',
        'This site is the technical documentation. Related sites:',
        '',
        '- [privasys.org](https://privasys.org/): product and company site, blog ([llms.txt](https://privasys.org/llms.txt))',
        '- [developer.privasys.org](https://developer.privasys.org/): developer console (sign-in required)',
        '- [chat.privasys.org](https://chat.privasys.org/): confidential AI chat',
        '',
        `The complete documentation is available as a single markdown file at [llms-full.txt](${DOCS_BASE}/llms-full.txt).`,
        'Every page listed below is also served as raw markdown at the `.md` URL next to it.',
        ''
    ];

    let current = '';
    for (const page of pages) {
        const section = sectionOf(page);
        if (section !== current) {
            current = section;
            if (lines[lines.length - 1] !== '') lines.push('');
            lines.push(`## ${sectionTitle(section)}`, '');
        }
        const desc = page.description ? `: ${page.description}` : '';
        lines.push(`- [${page.title}](${DOCS_BASE}${page.url}/)${desc} ([md](${DOCS_BASE}${page.mdPath}))`);
    }
    lines.push('');

    return new Response(lines.join('\n'), {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
}

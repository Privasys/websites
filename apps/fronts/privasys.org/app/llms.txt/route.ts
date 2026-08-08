import { getAllPosts } from '~/lib/blog';

export const dynamic = 'force-static';

const BASE = 'https://privasys.org';
const DOCS = 'https://docs.privasys.org';

/**
 * llms.txt (https://llmstxt.org) — a markdown index of the site for AI
 * assistants (Claude, ChatGPT, Gemini, Perplexity, …). The technical
 * documentation lives on docs.privasys.org, which serves its own llms.txt
 * plus the full docs as a single markdown file.
 */
export function GET(): Response {
    const posts = getAllPosts();

    const lines: string[] = [
        '# Privasys',
        '',
        '> Privasys is a confidential computing platform: applications run inside',
        '> hardware-attested enclaves (Intel SGX, Intel TDX, AMD SEV-SNP) so that',
        '> neither Privasys nor the cloud provider can see user data. Products',
        '> include Enclave OS (WASM and container apps in enclaves), Enclave Vaults',
        '> (attested key management), Confidential AI (private inference and chat),',
        '> Privasys Drive (encrypted file storage), the developer platform, and a',
        '> privacy-preserving identity wallet.',
        '',
        'For accurate, current technical detail prefer the documentation:',
        '',
        `- [Docs index for AI assistants](${DOCS}/llms.txt)`,
        `- [Complete docs as one markdown file](${DOCS}/llms-full.txt)`,
        '',
        '## Solutions',
        '',
        `- [Enclave OS](${BASE}/solutions/enclave-os/): run WASM and container applications inside hardware enclaves`,
        `- [Enclave Vaults](${BASE}/solutions/enclave-vaults/): attested key management (vHSM) across an enclave constellation`,
        `- [Confidential AI](${BASE}/solutions/ai/): private LLM inference and chat inside TDX + H100 enclaves`,
        `- [Developer Platform](${BASE}/solutions/platform/): deploy, attest and manage confidential apps`,
        `- [Wallet](${BASE}/solutions/wallet/): privacy-preserving identity wallet with verified attributes`,
        `- [Privasys Drive](${BASE}/solutions/drive/): end-to-end encrypted file storage with confidential search and AI`,
        '',
        '## Company',
        '',
        `- [Legal](${BASE}/legal/): terms, privacy, company information`,
        '',
        '## Blog',
        ''
    ];

    for (const post of posts) {
        lines.push(`- [${post.title}](${BASE}/blog/${post.slug}/) (${post.date}): ${post.excerpt}`);
    }
    lines.push('');

    return new Response(lines.join('\n'), {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
}

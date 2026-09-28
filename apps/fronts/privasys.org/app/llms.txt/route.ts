import { getAllPosts } from '~/lib/blog';

export const dynamic = 'force-static';

const BASE = 'https://privasys.org';
const DOCS = 'https://docs.privasys.org';

/**
 * llms.txt (https://llmstxt.org) — a markdown index of the site for AI
 * assistants (Claude, ChatGPT, Gemini, Perplexity, …). The technical
 * documentation lives on docs.privasys.org, which serves its own llms.txt
 * plus the full docs as a single markdown file.
 *
 * Only the Blog section is generated. The summary, key facts and Solutions
 * list are written here by hand: when a solution page is added, renamed or
 * repositioned, update this file in the same commit.
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
        '> (attested key management), Privasys AI (attested inference, the Privasys',
        '> Harness agent runtime, and Privasys Connectors to mail, calendar, files and',
        '> meetings), Privasys Drive (encrypted file storage), the developer platform,',
        '> and a privacy-preserving identity wallet.',
        '',
        '## Key facts',
        '',
        '- **Open source.** All platform infrastructure is published under AGPL-3.0 at',
        '  [github.com/Privasys](https://github.com/Privasys). Inspect the code, audit the builds,',
        '  reproduce from source. No black boxes.',
        '- **Reproducible and independently verifiable.** Builds are reproducible, enclave',
        '  measurements are published with every release, and confidential-VM images ship with',
        '  predicted boot measurements. Anyone can verify the running code by remote attestation',
        '  on every connection; trusting Privasys is not required.',
        '- **Security posture.** The 2026 attested-TLS session-binding flaw (CVE-2026-33697) is',
        '  mitigated across the platform by cryptographically binding attestation to the TLS',
        '  session, failing closed. See',
        '  [the write-up](https://privasys.org/blog/binding-attestation-to-the-tls-session/).',
        '- **Data protection by architecture.** User data is processed only inside hardware',
        '  enclaves and stored only under enclave-held keys; neither Privasys operators nor the',
        '  cloud provider can read it. Enforced by hardware and attested, not promised by policy.',
        '- **Company.** Privasys Ltd is a UK company. See',
        `  [company information](${BASE}/legal/company/).`,
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
        `- [Privasys AI](${BASE}/solutions/ai/): AI and agents you can verify. Open-weight models run in Intel TDX with the NVIDIA H100 in confidential-compute mode, and every reply carries a hardware-signed receipt of the code, weights and configuration that produced it. Privasys Harness runs the agent loop in its own attested enclave, and every call it makes leaves through a gate that admits only the attested services approved in the user's wallet`,
        `- [Privasys Connectors](${BASE}/solutions/ai/#connectors): separately attested enclaves that reach mail (any IMAP mailbox, Google, Microsoft), calendars (Google, Microsoft 365, CalDAV), files (Google Drive, OneDrive, SharePoint) and meeting transcripts (Zoom, Microsoft Teams). No credential is kept at rest, and each account has one Revoke. Agents currently leave drafts and proposals for the user to send or confirm`,
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

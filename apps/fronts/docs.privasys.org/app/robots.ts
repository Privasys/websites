import type { MetadataRoute } from 'next';

export const dynamic = 'force-static';

/**
 * AI crawlers and assistant fetchers, explicitly welcomed so that assistants
 * (Claude, ChatGPT, Gemini, Perplexity, Copilot, …) fetch live pages instead
 * of falling back to stale training data. The wildcard rule already allows
 * them; listing them makes the intent explicit and survives future tightening
 * of the wildcard. See also /llms.txt and /llms-full.txt.
 */
const AI_CRAWLERS = [
    // Anthropic (Claude)
    'ClaudeBot',
    'Claude-User',
    'Claude-SearchBot',
    // OpenAI (ChatGPT)
    'GPTBot',
    'ChatGPT-User',
    'OAI-SearchBot',
    // Google (Gemini / Vertex AI)
    'Google-Extended',
    'Google-CloudVertexBot',
    // Perplexity
    'PerplexityBot',
    'Perplexity-User',
    // Meta AI
    'meta-externalagent',
    'meta-externalfetcher',
    // Apple Intelligence
    'Applebot',
    'Applebot-Extended',
    // Amazon (Alexa / Rufus)
    'Amazonbot',
    // DuckDuckGo AI assist
    'DuckAssistBot',
    // Mistral (Le Chat)
    'MistralAI-User',
    // ByteDance (Doubao)
    'Bytespider',
    // Common Crawl (feeds many training corpora)
    'CCBot'
];

export default function robots(): MetadataRoute.Robots {
    return {
        rules: [
            {
                userAgent: AI_CRAWLERS,
                allow: '/'
            },
            {
                userAgent: '*',
                allow: '/'
            }
        ],
        sitemap: 'https://docs.privasys.org/sitemap.xml'
    };
}

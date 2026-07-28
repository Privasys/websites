'use client';

import { useEffect } from 'react';

/**
 * Hydrates the <pre class="mermaid"> blocks emitted by the markdown pipeline
 * (lib/blog.ts) into rendered diagrams. The mermaid library is imported
 * dynamically, so only posts that actually contain a diagram download it;
 * the blog page includes this component conditionally for the same reason.
 */
export function MermaidDiagrams() {
    useEffect(() => {
        let cancelled = false;

        void (async () => {
            const { default: mermaid } = await import('mermaid');
            if (cancelled) return;
            mermaid.initialize({
                startOnLoad: false,
                securityLevel: 'strict',
                theme: 'neutral',
                fontFamily: 'inherit'
            });
            try {
                await mermaid.run({ querySelector: 'pre.mermaid' });
            } catch (error) {
                // A syntax error in one diagram should not break the page;
                // the failing block keeps its source text.
                console.error('Mermaid render failed:', error);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, []);

    return null;
}

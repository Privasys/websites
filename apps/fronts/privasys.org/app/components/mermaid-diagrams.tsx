'use client';

import { useEffect } from 'react';

/**
 * Hydrates the <pre class="mermaid"> blocks emitted by the markdown pipeline
 * (lib/blog.ts) into rendered diagrams. The mermaid library is imported
 * dynamically, so only posts that actually contain a diagram download it;
 * the blog page includes this component conditionally for the same reason.
 *
 * The site theming is driven purely by prefers-color-scheme (no theme
 * toggle), so the mermaid theme follows the same media query and the
 * diagrams re-render if the scheme changes while the page is open.
 * useMaxWidth is disabled because it shrinks the whole SVG to the viewport
 * width on phones, making labels unreadable; at natural size the block
 * scrolls horizontally instead (the pre already has overflow-x: auto).
 */
export function MermaidDiagrams() {
    useEffect(() => {
        const media = window.matchMedia('(prefers-color-scheme: dark)');
        let cancelled = false;

        // mermaid.run replaces each block's content with the rendered SVG,
        // so keep the diagram source to be able to render again on a
        // colour-scheme change.
        const blocks = Array.from(document.querySelectorAll<HTMLElement>('pre.mermaid'));
        const sources = blocks.map((block) => block.textContent ?? '');

        async function render() {
            const { default: mermaid } = await import('mermaid');
            if (cancelled) return;
            blocks.forEach((block, i) => {
                block.textContent = sources[i];
                block.removeAttribute('data-processed');
            });
            // Diagram text at the code-block size. Each pre.mermaid is
            // itself styled by the .prose pre rule (0.9rem), so reading its
            // computed font-size yields exactly the size a fenced code block
            // has, in px as mermaid requires, at every breakpoint. Both
            // settings are needed in mermaid 11: sequence diagrams only
            // honour the top-level fontSize, flowcharts only
            // themeVariables.fontSize.
            const fontSize = blocks[0]
                ? Number.parseFloat(getComputedStyle(blocks[0]).fontSize)
                : 14;
            mermaid.initialize({
                startOnLoad: false,
                securityLevel: 'strict',
                theme: media.matches ? 'dark' : 'neutral',
                fontFamily: 'inherit',
                fontSize,
                themeVariables: { fontSize: `${fontSize}px` },
                flowchart: { useMaxWidth: false },
                sequence: { useMaxWidth: false }
            });
            try {
                await mermaid.run({ nodes: blocks });
            } catch (error) {
                // A syntax error in one diagram should not break the page;
                // the failing block keeps its source text.
                console.error('Mermaid render failed:', error);
            }
        }

        void render();
        const onChange = () => void render();
        media.addEventListener('change', onChange);

        return () => {
            cancelled = true;
            media.removeEventListener('change', onChange);
        };
    }, []);

    return null;
}

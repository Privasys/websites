'use client';

import { useEffect, useId, useState } from 'react';
import { useTheme } from 'next-themes';

/**
 * Renders a Mermaid diagram on the client. The `mermaid` library is imported
 * dynamically so it is only downloaded on pages that actually contain a
 * diagram (the site is statically exported and the library is large).
 *
 * Authors never use this component directly: fenced ```mermaid code blocks
 * are rewritten into <Mermaid chart="..."/> by the remark plugin in
 * source.config.ts, so the source files stay portable markdown.
 */
export function Mermaid({ chart }: { chart: string }) {
    const id = useId();
    const [svg, setSvg] = useState('');
    const { resolvedTheme } = useTheme();

    useEffect(() => {
        let cancelled = false;

        void (async () => {
            const { default: mermaid } = await import('mermaid');
            mermaid.initialize({
                startOnLoad: false,
                securityLevel: 'strict',
                theme: resolvedTheme === 'dark' ? 'dark' : 'neutral',
                fontFamily: 'inherit',
                // useMaxWidth shrinks the whole SVG to the viewport width on
                // phones, making labels unreadable; at natural size the
                // container scrolls horizontally instead.
                flowchart: { useMaxWidth: false },
                sequence: { useMaxWidth: false }
            });
            try {
                const rendered = await mermaid.render(
                    // useId() emits characters (e.g. «:») that are invalid in
                    // a DOM id, which mermaid uses for the temporary element.
                    `mermaid-${id.replace(/[^a-zA-Z0-9_-]/g, '')}`,
                    chart
                );
                if (!cancelled) setSvg(rendered.svg);
            } catch (error) {
                // A syntax error in a diagram should not blank the page;
                // leave the container empty and report in the console.
                console.error('Mermaid render failed:', error);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [chart, id, resolvedTheme]);

    return (
        <div
            // mx-auto centres a narrow diagram; a wide one overflows and
            // scrolls (flex justify-center would clip its left edge).
            className='my-6 overflow-x-auto [&_svg]:block [&_svg]:mx-auto'
            dangerouslySetInnerHTML={{ __html: svg }}
        />
    );
}

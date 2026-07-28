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
                fontFamily: 'inherit'
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
            className='my-6 flex justify-center overflow-x-auto [&_svg]:max-w-full'
            dangerouslySetInnerHTML={{ __html: svg }}
        />
    );
}

'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { useTheme } from 'next-themes';

/**
 * Mermaid 11 ignores its font-size configuration for several diagram types
 * (sequence diagrams hard-apply 16px inline), so diagrams are rendered at
 * the default 16px and the finished SVG is scaled down to the equivalent of
 * 13px text, ~80% of the body text size. Scaling the SVG keeps the layout
 * proportionate, since boxes were measured for the text they contain.
 */
const TEXT_SCALE = 13 / 16;

function scaleSvg(svg: string, factor: number): string {
    const root = new DOMParser().parseFromString(svg, 'image/svg+xml').documentElement;
    const width = Number.parseFloat(root.getAttribute('width') ?? '');
    if (Number.isFinite(width)) root.setAttribute('width', String(Math.round(width * factor)));
    const height = Number.parseFloat(root.getAttribute('height') ?? '');
    if (Number.isFinite(height)) root.setAttribute('height', String(Math.round(height * factor)));
    return new XMLSerializer().serializeToString(root);
}

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
    const figureRef = useRef<HTMLDivElement>(null);

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
                // htmlLabels keeps flowchart labels as plain SVG text so the
                // PNG export below works in every browser (foreignObject HTML
                // is dropped by some engines when an SVG is rasterised).
                flowchart: { useMaxWidth: false, htmlLabels: false },
                sequence: { useMaxWidth: false },
                state: { useMaxWidth: false }
            });
            try {
                const rendered = await mermaid.render(
                    // useId() emits characters (e.g. «:») that are invalid in
                    // a DOM id, which mermaid uses for the temporary element.
                    `mermaid-${id.replace(/[^a-zA-Z0-9_-]/g, '')}`,
                    chart
                );
                if (!cancelled) setSvg(scaleSvg(rendered.svg, TEXT_SCALE));
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

    async function downloadPng() {
        const svgEl = figureRef.current?.querySelector('svg');
        if (!svgEl) return;

        const rect = svgEl.getBoundingClientRect();
        const width = Number(svgEl.getAttribute('width')) || rect.width;
        const height = Number(svgEl.getAttribute('height')) || rect.height;

        const clone = svgEl.cloneNode(true) as SVGSVGElement;
        clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        // The diagram is rendered with font-family: inherit, which resolves
        // to the browser default once the SVG leaves the page.
        clone.style.setProperty('font-family', getComputedStyle(svgEl).fontFamily, 'important');

        const svgUrl = URL.createObjectURL(
            new Blob([new XMLSerializer().serializeToString(clone)], { type: 'image/svg+xml;charset=utf-8' })
        );
        try {
            const image = new Image();
            await new Promise((resolve, reject) => {
                image.onload = resolve;
                image.onerror = reject;
                image.src = svgUrl;
            });

            const scale = 2;
            const canvas = document.createElement('canvas');
            canvas.width = Math.round(width * scale);
            canvas.height = Math.round(height * scale);
            const context = canvas.getContext('2d');
            if (!context) return;
            context.fillStyle = getComputedStyle(document.body).backgroundColor;
            context.fillRect(0, 0, canvas.width, canvas.height);
            context.drawImage(image, 0, 0, canvas.width, canvas.height);

            const png = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
            if (!png) return;
            const page = location.pathname.split('/').filter(Boolean).pop() ?? 'diagram';
            const index = Array.from(document.querySelectorAll('svg[id^="mermaid-"]')).indexOf(svgEl) + 1;
            const link = document.createElement('a');
            link.href = URL.createObjectURL(png);
            link.download = `${page}-diagram-${index}.png`;
            link.click();
            URL.revokeObjectURL(link.href);
        } catch (error) {
            console.error('Mermaid PNG export failed:', error);
        } finally {
            URL.revokeObjectURL(svgUrl);
        }
    }

    return (
        <div ref={figureRef} className='my-6'>
            <div
                className='overflow-x-auto [&_svg]:block [&_svg]:mx-auto'
                dangerouslySetInnerHTML={{ __html: svg }}
            />
            {svg !== '' && (
                <div className='mt-1 flex justify-end'>
                    <button
                        type='button'
                        onClick={() => void downloadPng()}
                        className='cursor-pointer text-xs text-fd-muted-foreground transition-colors hover:text-fd-foreground'
                    >
                        Download PNG
                    </button>
                </div>
            )}
        </div>
    );
}

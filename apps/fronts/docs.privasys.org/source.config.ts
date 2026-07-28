import { defineDocs, defineConfig } from 'fumadocs-mdx/config';
import type { Root } from 'mdast';

/**
 * Rewrites fenced ```mermaid code blocks into <Mermaid chart="..."/> JSX
 * elements, rendered by app/components/mermaid.tsx. Authors write plain
 * fences (portable markdown, previewable on GitHub); the fence never reaches
 * the syntax highlighter.
 */
function remarkMermaidFences() {
    return (tree: Root) => {
        function walk(node: { children?: unknown[] }) {
            if (!node.children) return;
            node.children = node.children.map((child) => {
                const c = child as { type: string; lang?: string; value?: string; children?: unknown[] };
                if (c.type === 'code' && c.lang === 'mermaid') {
                    return {
                        type: 'mdxJsxFlowElement',
                        name: 'Mermaid',
                        attributes: [{ type: 'mdxJsxAttribute', name: 'chart', value: c.value ?? '' }],
                        children: []
                    };
                }
                walk(c);
                return child;
            });
        }
        walk(tree);
    };
}

export const docs = defineDocs({
    dir: 'content/docs'
});

export default defineConfig({
    mdxOptions: {
        remarkPlugins: (v) => [remarkMermaidFences, ...v]
    }
});

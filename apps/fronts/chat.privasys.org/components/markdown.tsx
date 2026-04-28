'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// Markdown renderer for assistant messages.
//
// Tailwind doesn't ship a default prose stylesheet here, so we map
// the common block elements explicitly. Kept minimal: paragraphs,
// headings, lists, code, links, tables. Code blocks render with a
// monospace background; inline code with a subtle highlight. Colours
// pull from the chat theme variables so this renders correctly in
// both dark and light mode.
export function Markdown({ children }: { children: string }) {
    return (
        <div className='space-y-3 text-[15px] leading-relaxed text-[var(--color-text-primary)]'>
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                    p: ({ children }) => <p className='whitespace-pre-wrap'>{children}</p>,
                    h1: ({ children }) => (
                        <h1 className='mt-4 text-xl font-semibold'>{children}</h1>
                    ),
                    h2: ({ children }) => (
                        <h2 className='mt-4 text-lg font-semibold'>{children}</h2>
                    ),
                    h3: ({ children }) => (
                        <h3 className='mt-3 text-base font-semibold'>{children}</h3>
                    ),
                    ul: ({ children }) => (
                        <ul className='ml-5 list-disc space-y-1'>{children}</ul>
                    ),
                    ol: ({ children }) => (
                        <ol className='ml-5 list-decimal space-y-1'>{children}</ol>
                    ),
                    li: ({ children }) => <li className='leading-relaxed'>{children}</li>,
                    a: ({ children, href }) => (
                        <a
                            href={href}
                            target='_blank'
                            rel='noreferrer'
                            className='text-[var(--color-primary-blue)] underline underline-offset-2 hover:opacity-80'
                        >
                            {children}
                        </a>
                    ),
                    strong: ({ children }) => (
                        <strong className='font-semibold'>{children}</strong>
                    ),
                    em: ({ children }) => <em className='italic'>{children}</em>,
                    blockquote: ({ children }) => (
                        <blockquote className='border-l-2 border-[var(--color-border-dark)] pl-3 text-[var(--color-text-secondary)]'>
                            {children}
                        </blockquote>
                    ),
                    code: ({ className, children }) => {
                        const text = String(children).replace(/\n$/, '');
                        const isBlock = (className ?? '').startsWith('language-');
                        if (isBlock) {
                            return (
                                <pre className='overflow-x-auto rounded-md border border-[var(--color-border-dark)] bg-[var(--color-surface-2)] p-3 text-[13px]'>
                                    <code>{text}</code>
                                </pre>
                            );
                        }
                        return (
                            <code className='rounded bg-[var(--color-surface-2)] px-1 py-0.5 font-mono text-[13px]'>
                                {text}
                            </code>
                        );
                    },
                    table: ({ children }) => (
                        <div className='overflow-x-auto'>
                            <table className='w-full border-collapse text-sm'>{children}</table>
                        </div>
                    ),
                    th: ({ children }) => (
                        <th className='border-b border-[var(--color-border-dark)] px-2 py-1 text-left font-semibold'>
                            {children}
                        </th>
                    ),
                    td: ({ children }) => (
                        <td className='border-b border-[var(--color-border-dark)] px-2 py-1 align-top'>
                            {children}
                        </td>
                    ),
                    hr: () => <hr className='my-3 border-[var(--color-border-dark)]' />
                }}
            >
                {children}
            </ReactMarkdown>
        </div>
    );
}

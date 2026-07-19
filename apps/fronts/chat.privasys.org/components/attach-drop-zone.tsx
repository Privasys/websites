'use client';

// Drag-and-drop file attach for the chat surface (§8.7). Dropping one or
// more files anywhere over the conversation opens a small intent chooser
// ("Use in this chat" vs "Add to my knowledge base"); the choice routes each
// file through the existing onAttach(file, intent) path. The drag detection
// itself is the shared @privasys/drive-client `useFileDrop` hook, the same
// one drive.privasys.org uses for folder uploads.

import { useState, type ReactNode } from 'react';
import { useFileDrop } from '@privasys/drive-client';
import type { AttachIntent } from '~/lib/drive-chat-api';

export function AttachDropZone({
    onAttach,
    children
}: {
    onAttach: (_file: File, _intent: AttachIntent) => void;
    children: ReactNode;
}) {
    const [pending, setPending] = useState<File[] | null>(null);
    const { dragActive, dropHandlers } = useFileDrop({
        onFiles: (files) => setPending(files)
    });

    const choose = (intent: AttachIntent) => {
        if (pending) for (const f of pending) onAttach(f, intent);
        setPending(null);
    };

    return (
        <div className="relative flex flex-1 flex-col" {...dropHandlers}>
            {children}

            {dragActive && (
                <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-3 z-30 flex items-center justify-center rounded-2xl border-2 border-dashed border-[var(--color-primary-blue)]/60 bg-[var(--color-primary-blue)]/[0.06]"
                >
                    <span
                        className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white shadow-lg"
                        style={{ background: 'var(--color-primary-blue)' }}
                    >
                        <UploadIcon />
                        Drop to attach
                    </span>
                </div>
            )}

            {pending && pending.length > 0 && (
                <IntentChooser
                    files={pending}
                    onChoose={choose}
                    onCancel={() => setPending(null)}
                />
            )}
        </div>
    );
}

function IntentChooser({
    files,
    onChoose,
    onCancel
}: {
    files: File[];
    onChoose: (_intent: AttachIntent) => void;
    onCancel: () => void;
}) {
    const label =
        files.length === 1 ? files[0].name : `${files.length} files`;
    return (
        <div className="absolute inset-0 z-40 flex items-center justify-center p-4">
            <button
                type="button"
                aria-label="Cancel"
                onClick={onCancel}
                className="absolute inset-0 cursor-default bg-black/40 backdrop-blur-[1px]"
            />
            <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-[var(--color-border-dark)] bg-[var(--color-surface-1)] shadow-2xl">
                <div className="border-b border-[var(--color-border-dark)] px-5 py-3.5">
                    <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                        Attach {label}
                    </p>
                    <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
                        How should I use {files.length === 1 ? 'this file' : 'these files'}?
                    </p>
                </div>
                <div className="p-2">
                    <ChooserOption
                        title="Use in this chat"
                        description="Just for this conversation. Small files are read in full; anything larger is added to your knowledge base and looked up on demand."
                        onClick={() => onChoose('session')}
                    />
                    <ChooserOption
                        title="Add to my knowledge base"
                        description="Save to your private Drive so I can draw on it in this and future chats."
                        onClick={() => onChoose('knowledge')}
                    />
                </div>
                <div className="flex justify-end border-t border-[var(--color-border-dark)] px-4 py-2.5">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="rounded-md px-3 py-1.5 text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
}

function ChooserOption({
    title,
    description,
    onClick
}: {
    title: string;
    description: string;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="flex w-full flex-col gap-0.5 rounded-xl px-3 py-2.5 text-left hover:bg-[var(--color-surface-2)]/60"
        >
            <span className="text-sm font-medium text-[var(--color-text-primary)]">{title}</span>
            <span className="text-[11px] leading-4 text-[var(--color-text-muted)]">{description}</span>
        </button>
    );
}

function UploadIcon() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M12 3v12" />
            <path d="m7 8 5-5 5 5" />
            <path d="M5 21h14" />
        </svg>
    );
}

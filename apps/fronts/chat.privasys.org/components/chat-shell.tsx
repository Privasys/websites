'use client';

import { useState } from 'react';
import type { AvailableModel, Instance } from '~/lib/types';
import { ModelPicker } from './model-picker';
import { AttestationDrawer } from './attestation-drawer';
import { ChatPanel } from './chat-panel';

// Chat shell. Wires the model picker, attestation
// drawer trigger and the streaming chat panel.
export function ChatShell({
    instance,
    initialModel,
}: {
    instance: Instance;
    initialModel: AvailableModel | null;
}) {
    const [model, setModel] = useState<AvailableModel | null>(initialModel);
    const [drawerOpen, setDrawerOpen] = useState(false);

    return (
        <div className="flex flex-1 flex-col">
            <header className="flex items-center justify-between border-b border-[var(--color-border-dark)] bg-[var(--color-surface-1)]/80 px-4 py-3 backdrop-blur">
                <div className="flex items-center gap-3">
                    <img
                        src="/favicon/privasys-logo.mini.svg"
                        alt="Privasys"
                        className="h-7 w-7"
                    />
                    <div>
                        <h1 className="text-sm font-semibold text-[var(--color-text-primary)]">
                            {instance.alias ?? instance.id}
                        </h1>
                        <p className="text-xs text-[var(--color-text-muted)]">
                            {instance.endpoint}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <ModelPicker
                        instance={instance}
                        selected={model}
                        onSelect={setModel}
                    />
                    <button
                        type="button"
                        onClick={() => setDrawerOpen(true)}
                        className="rounded-md border border-[var(--color-border-dark)] bg-[var(--color-surface-2)]/40 px-3 py-1.5 text-xs font-medium text-[var(--color-text-primary)] transition-colors hover:border-[var(--color-primary-blue)]/60 hover:text-[var(--color-primary-blue)]"
                    >
                        View attestation
                    </button>
                </div>
            </header>

            <ChatPanel instance={instance} model={model} />

            <AttestationDrawer
                open={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                instance={instance}
            />
        </div>
    );
}


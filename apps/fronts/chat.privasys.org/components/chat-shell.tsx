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
            <header className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
                <div>
                    <h1 className="text-sm font-semibold text-zinc-100">
                        {instance.alias ?? instance.id}
                    </h1>
                    <p className="text-xs text-zinc-500">{instance.endpoint}</p>
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
                        className="rounded-md border border-zinc-700 px-3 py-1.5 text-xs text-zinc-200 hover:bg-zinc-800"
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

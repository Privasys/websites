'use client';

import { useState } from 'react';
import type { AvailableModel, Instance } from '~/lib/types';
import { AppSidebar } from './app-sidebar';
import { ChatPanel } from './chat-panel';

// Gemini-style two-pane shell: persistent left sidebar + main column.
// Header lives inside the main column and is intentionally minimal —
// the conversation title sits at the top, and the secure-session pill
// + sign-in live in the sidebar.
export function ChatShell({
    instance,
    initialModel,
    disabledReason,
    userGreeting,
}: {
    instance: Instance;
    initialModel: AvailableModel | null;
    /**
     * If set, the composer is read-only and shows this hint. Used for the
     * unauthenticated empty-state where we still want users to see the layout.
     */
    disabledReason?: string;
    /** Greeting line on the empty state, e.g. "Hi Bertrand". */
    userGreeting?: string;
}) {
    const [model, setModel] = useState<AvailableModel | null>(initialModel);
    // Bumping `chatKey` resets ChatPanel state (used by "New chat").
    const [chatKey, setChatKey] = useState(0);

    return (
        <div className="flex flex-1">
            <AppSidebar
                instance={instance}
                onNewChat={() => setChatKey((n) => n + 1)}
            />
            <div className="flex min-w-0 flex-1 flex-col">
                <header className="flex items-center gap-2 border-b border-[var(--color-border-dark)]/60 px-5 py-3">
                    <h1 className="truncate text-sm font-medium text-[var(--color-text-primary)]">
                        {instance.alias ?? instance.id}
                    </h1>
                    {instance.endpoint && (
                        <span className="truncate text-xs text-[var(--color-text-muted)]">
                            · {instance.endpoint}
                        </span>
                    )}
                </header>

                <ChatPanel
                    key={chatKey}
                    instance={instance}
                    model={model}
                    onModelChange={setModel}
                    disabledReason={disabledReason}
                    userGreeting={userGreeting}
                />
            </div>
        </div>
    );
}


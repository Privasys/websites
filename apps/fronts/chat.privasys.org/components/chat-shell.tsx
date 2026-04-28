'use client';

import { useMemo, useState } from 'react';
import type { AvailableModel, Instance } from '~/lib/types';
import { useAuth } from '~/lib/privasys-auth';
import { jwtSub } from '~/lib/jwt';
import { modelLabel } from '~/lib/model-label';
import { useConversations } from '~/lib/use-conversations';
import { AppSidebar } from './app-sidebar';
import { ChatPanel } from './chat-panel';
import { SecurityView } from './security-view';
import { SignInView } from './signin-view';

type ShellView = 'chat' | 'security' | 'signin';

// Gemini-style two-pane shell: persistent left sidebar + main column.
//
// The main pane swaps between three first-class views:
//   - chat     (default) — composer + transcript
//   - security          — full-pane attestation result
//   - signin            — inline auth iframe
//
// Conversation state (history list, currently selected id, message
// persistence) is owned here so the sidebar list and the chat
// transcript stay in sync. Storage details live in
// `lib/use-conversations.ts`.
export function ChatShell({
    instance,
    initialModel,
    disabledReason,
    userGreeting
}: {
    instance: Instance;
    initialModel: AvailableModel | null;
    disabledReason?: string;
    userGreeting?: string;
}) {
    const { session } = useAuth();
    const [model, setModel] = useState<AvailableModel | null>(initialModel);
    const [view, setView] = useState<ShellView>('chat');

    const sub = useMemo(() => jwtSub(session?.accessToken), [session?.accessToken]);
    const conv = useConversations({
        instanceId: instance.id,
        sub,
        modelLabel: model ? modelLabel(model) : undefined
    });

    const goChat = () => setView('chat');

    return (
        <div className="flex flex-1">
            <AppSidebar
                instance={instance}
                conversations={conv.conversations}
                activeConversationId={conv.currentId}
                onNewChat={() => {
                    conv.startNew();
                    goChat();
                }}
                onSelectConversation={(id) => {
                    conv.select(id);
                    goChat();
                }}
                onDeleteConversation={conv.remove}
                onRenameConversation={conv.rename}
                onShowSecurity={() => setView('security')}
                onShowSignIn={() => setView('signin')}
            />
            <div className="flex min-w-0 flex-1 flex-col">
                <header className="flex items-center gap-2 border-b border-[var(--color-border-dark)]/60 px-5 py-3">
                    <h1 className="truncate text-sm font-medium text-[var(--color-text-primary)]">
                        {viewTitle(view, conv.current?.title ?? (instance.alias ?? instance.id))}
                    </h1>
                    {view === 'chat' && instance.endpoint && (
                        <span className="truncate text-xs text-[var(--color-text-muted)]">
                            · {instance.endpoint}
                        </span>
                    )}
                    {view !== 'chat' && (
                        <button
                            type="button"
                            onClick={goChat}
                            className="ml-auto rounded-md border border-[var(--color-border-dark)] bg-[var(--color-surface-2)]/50 px-3 py-1 text-xs text-[var(--color-text-secondary)] hover:border-[var(--color-primary-blue)]/60 hover:text-[var(--color-primary-blue)]"
                        >
                            Back to chat
                        </button>
                    )}
                </header>

                {view === 'security' && instance.endpoint && (
                    <SecurityView instance={instance} />
                )}

                {view === 'signin' && (
                    <SignInView onCancel={goChat} onSuccess={goChat} />
                )}

                {view === 'chat' && (
                    <ChatPanel
                        // Remount whenever the active conversation changes
                        // so internal state (input, streaming) clears.
                        key={conv.currentId ?? 'new'}
                        instance={instance}
                        model={model}
                        onModelChange={setModel}
                        token={session?.accessToken}
                        disabledReason={disabledReason}
                        userGreeting={userGreeting}
                        onConnect={!session ? () => setView('signin') : undefined}
                        initialMessages={conv.current?.messages ?? []}
                        conversationId={conv.currentId}
                        onMessagesChange={conv.setCurrentMessages}
                        onBranchFromMessage={(messageId) => {
                            conv.branchFromMessage(messageId);
                            goChat();
                        }}
                    />
                )}
            </div>
        </div>
    );
}

function viewTitle(view: ShellView, fallback: string): string {
    switch (view) {
        case 'security':
            return 'Security';
        case 'signin':
            return 'Sign in';
        default:
            return fallback;
    }
}

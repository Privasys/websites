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
    const { session, sealedSession } = useAuth();
    const [model, setModel] = useState<AvailableModel | null>(initialModel);
    const [view, setView] = useState<ShellView>('chat');

    const sub = useMemo(() => jwtSub(session?.accessToken), [session?.accessToken]);
    const conv = useConversations({
        instanceId: instance.id,
        sub,
        modelLabel: model ? modelLabel(model) : undefined
    });

    // Stable mount key for ChatPanel. We deliberately do NOT use
    // `conv.currentId` here: that value transitions from null to a
    // freshly-minted id the moment the user sends the first message
    // in a new conversation, which would remount the panel mid-stream
    // and abort the in-flight chat completion (the unmount cleanup
    // calls AbortController.abort()). Instead we only re-key on
    // explicit user actions: New chat, Select conversation, Branch.
    const [panelKey, setPanelKey] = useState<string>(() => conv.currentId ?? 'new');
    // Re-key once when hydration finishes and we land on an existing
    // conversation we hadn't seen before (page reload).
    const hydratedKeyRef = useMemo(
        () => ({ current: conv.currentId ?? 'new' }),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        []
    );
    if (conv.currentId && hydratedKeyRef.current !== conv.currentId && panelKey === 'new') {
        // First hydration after sub becomes available: adopt the id.
        hydratedKeyRef.current = conv.currentId;
        // Schedule a re-key so initialMessages reflect storage.
        // Using setState in render is fine here because it's guarded.
        setPanelKey(conv.currentId);
    }

    const goChat = () => setView('chat');

    return (
        <div className="flex flex-1">
            <AppSidebar
                instance={instance}
                conversations={conv.conversations}
                activeConversationId={conv.currentId}
                onNewChat={() => {
                    conv.startNew();
                    setPanelKey('new-' + Date.now());
                    goChat();
                }}
                onSelectConversation={(id) => {
                    conv.select(id);
                    setPanelKey(id);
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
                    <SignInView instance={instance} onCancel={goChat} onSuccess={goChat} />
                )}

                {view === 'chat' && (
                    <ChatPanel
                        // Stable mount key — only changes on explicit user
                        // navigation (new chat, select, branch). NOT on the
                        // null→id transition that happens when persisting
                        // the first message of a brand-new conversation,
                        // which would otherwise abort the in-flight stream.
                        key={panelKey}
                        instance={instance}
                        model={model}
                        onModelChange={setModel}
                        token={session?.accessToken}
                        sealedSession={sealedSession ?? undefined}
                        disabledReason={disabledReason}
                        userGreeting={userGreeting}
                        onConnect={!session ? () => setView('signin') : undefined}
                        initialMessages={conv.current?.messages ?? []}
                        conversationId={conv.currentId}
                        onMessagesChange={conv.setCurrentMessages}
                        onBranchFromMessage={(messageId) => {
                            const newId = conv.branchFromMessage(messageId);
                            if (newId) setPanelKey(newId);
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

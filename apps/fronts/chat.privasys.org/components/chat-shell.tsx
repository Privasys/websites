'use client';

import { useEffect, useMemo, useState } from 'react';
import type { AvailableModel, Instance } from '~/lib/types';
import type { AggregateAttestationStatus } from '@privasys/attestation-view';
import { useAuth } from '~/lib/privasys-auth';
import { jwtSub } from '~/lib/jwt';
import { modelLabel } from '~/lib/model-label';
import { useConversations } from '~/lib/use-conversations';
import { useEnabledTools } from '~/lib/use-enabled-tools';
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
    const { session, sealedSession, resumeSealed } = useAuth();
    const [model, setModel] = useState<AvailableModel | null>(initialModel);

    // Sealed transport must survive page reloads without a wallet
    // ceremony: the OIDC session restores via cross-site SSO, and the
    // sealed session re-bootstraps from the EncAuth voucher stored at
    // the IdP. Without this, a reload would silently leave the chat
    // without a transport (the plaintext-through-the-gateway fallback
    // no longer exists — the gateway must never see message bodies).
    useEffect(() => {
        if (!session || sealedSession) return;
        if (!instance.session_relay?.enabled || !instance.session_relay.app_host) return;
        void resumeSealed(instance.session_relay.app_host);
    }, [session, sealedSession, instance.session_relay, resumeSealed]);
    const [view, setView] = useState<ShellView>('chat');
    // Aggregate attestation status for the sidebar pill. Driven by the
    // always-mounted SecurityView (hidden when view !== 'security') so
    // the pill color reflects real verification, not just "endpoint
    // available".
    const [attestationStatus, setAttestationStatus] = useState<AggregateAttestationStatus>('verifying');

    const sub = useMemo(() => jwtSub(session?.accessToken), [session?.accessToken]);
    const conv = useConversations({
        instanceId: instance.id,
        sub,
        modelLabel: model ? modelLabel(model) : undefined
    });

    const tools = useEnabledTools(instance.id, instance.available_tools);
    const enabledToolsArray = useMemo(() => [...tools.enabled], [tools.enabled]);
    const hasTools = (instance.available_tools?.length ?? 0) > 0;

    // ChatPanel is intentionally NOT remounted via a `key` when the
    // conversation changes. Re-keying was aborting in-flight chat
    // completion fetches via the unmount cleanup. The panel observes
    // `conversationId` itself and resets local state when the parent
    // switches to a different conversation while no stream is in
    // flight; the null → minted-id transition (first message of a
    // brand-new conversation) is intentionally a no-op.

    const goChat = () => setView('chat');

    return (
        <div className="flex flex-1">
            <AppSidebar
                instance={instance}
                conversations={conv.conversations}
                activeConversationId={conv.currentId}
                attestationStatus={attestationStatus}
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
                enabledTools={tools.enabled}
                onToggleTool={tools.toggle}
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

                {view === 'security' && instance.endpoint && session && (
                    <SecurityView instance={instance} onStatus={setAttestationStatus} />
                )}
                {view !== 'security' && instance.endpoint && session && (
                    // Keep the attestation pipeline running in the
                    // background so the sidebar pill is accurate even
                    // before the user opens the Security view.
                    // Gated on `session` so we don't fire verify-quote
                    // before the Privasys ID auth iframe has minted a
                    // session — `getTokenForAudience()` otherwise
                    // rejects with "no active session iframe; call
                    // getSession() first".
                    <div className="hidden" aria-hidden="true">
                        <SecurityView instance={instance} onStatus={setAttestationStatus} />
                    </div>
                )}

                {view === 'signin' && (
                    <SignInView instance={instance} onCancel={goChat} onSuccess={goChat} />
                )}

                {view === 'chat' && (
                    <ChatPanel
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
                            conv.branchFromMessage(messageId);
                            goChat();
                        }}
                        enabledTools={hasTools ? enabledToolsArray : undefined}
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

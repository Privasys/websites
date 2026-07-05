'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { AvailableModel, Instance } from '~/lib/types';
import type { AggregateAttestationStatus } from '@privasys/attestation-view';
import { useAuth } from '~/lib/privasys-auth';
import { jwtSub } from '~/lib/jwt';
import { modelLabel } from '~/lib/model-label';
import { useConversations } from '~/lib/use-conversations';
import { useEnabledTools } from '~/lib/use-enabled-tools';
import { useUserTools } from '~/lib/use-user-tools';
import { ToolsView } from './tools-view';
import { chatServiceHost } from '~/lib/chat-service-api';
import { probeInstanceHealth } from '~/lib/instance-api';
import { isTransportError } from '~/lib/transport';
import type { SealedSession } from '@privasys/auth';
import { AppSidebar } from './app-sidebar';
import { ChatPanel, type PendingReplay } from './chat-panel';
import { SecurityView } from './security-view';
import { SignInView } from './signin-view';

type ShellView = 'chat' | 'security' | 'tools' | 'signin';

type TransportState = 'ok' | 'reconnecting' | 'stale';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

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
    const { session, sealedSession, reestablishSealed, staleReason, getSealedSession, requestAppVoucher } = useAuth();
    const [model, setModel] = useState<AvailableModel | null>(initialModel);

    // Health of the end-to-end enclave transport, independent of the OIDC
    // session (which a back-end redeploy never touches). Drives the
    // reconnect banner so the UI reacts to a stopped/redeployed VM instead
    // of only surfacing a raw 502/401 on the next prompt.
    //   ok          — live, chat normally.
    //   reconnecting — enclave unreachable or session stale; auto-recovering.
    //   stale        — enclave identity/measurement changed; needs a fresh
    //                  wallet ceremony (re-sign-in).
    const [transport, setTransport] = useState<TransportState>('ok');

    // Why we entered the reconnect flow. A 'reactive' trigger (a real request
    // 401/502, or a rejected cold-reload resume) means the sealed session is
    // dead and must be rebuilt; a 'proactive' trigger (a /healthz blip while
    // idle) most likely is NOT — so we must not tear down a working session for
    // it. Defaults to 'reactive' (the safe, authoritative path).
    const reconnectReasonRef = useRef<'proactive' | 'reactive'>('reactive');
    // Live mirror of the sealed session so the recovery effect can read it
    // without re-running every time it changes.
    const sealedSessionRef = useRef(sealedSession);
    useEffect(() => { sealedSessionRef.current = sealedSession; }, [sealedSession]);

    // chat-service is a separate enclave from the inference instance, so it
    // needs its own sealed session (the user's bearer + tool data never cross
    // the gateway's terminate path). Establish it once signed in; null until a
    // chat-service voucher exists, in which case BYO-MCP degrades gracefully.
    const [chatSession, setChatSession] = useState<SealedSession | null>(null);
    useEffect(() => {
        const host = chatServiceHost();
        if (!session || !host) {
            setChatSession(null);
            return;
        }
        let cancelled = false;
        void getSealedSession(host).then((s) => {
            if (!cancelled) setChatSession(s);
        });
        return () => {
            cancelled = true;
        };
    }, [session, getSealedSession]);

    // Establish the chat-service sealed session on demand for a user-tool
    // mutation. First a silent voucher resume (covers the just-signed-in
    // race); if there's no voucher yet, ask the wallet to issue one via a
    // push approval (incremental multi-app attestation — one tap on the
    // phone, no sign-out), then resume. `onNeedApproval` lets the caller
    // show "Approve on your phone…" while we wait. Rejects propagate so the
    // add form can show a precise message.
    const ensureChatSession = useCallback(
        async (onNeedApproval?: () => void): Promise<SealedSession | null> => {
            const host = chatServiceHost();
            if (!host) return null;
            let s = await getSealedSession(host);
            if (s) {
                setChatSession(s);
                return s;
            }
            // No voucher for chat-service yet — request one from the wallet.
            onNeedApproval?.();
            await requestAppVoucher(host); // throws no-push / timeout / no-session
            s = await getSealedSession(host);
            if (s) setChatSession(s);
            return s;
        },
        [getSealedSession, requestAppVoucher]
    );

    // Sealed transport must survive page reloads without a wallet
    // ceremony: the OIDC session restores via cross-site SSO, and the
    // sealed session re-bootstraps from the EncAuth voucher stored at
    // the IdP. Without this, a reload would silently leave the chat
    // without a transport (the plaintext-through-the-gateway fallback
    // no longer exists — the gateway must never see message bodies).
    useEffect(() => {
        if (!session || sealedSession || transport !== 'ok') return;
        if (!instance.session_relay?.enabled || !instance.session_relay.app_host) return;
        let cancelled = false;
        (async () => {
            // Cold reload: the OIDC session restored via SSO but the sealed
            // session did not (it is deliberately never persisted). Try to
            // re-establish it from the EncAuth voucher. If the enclave REJECTS
            // the voucher — it was restarted/re-created since sign-in so its
            // enc_pub rotated, and the reject arrives as a 200 with an
            // X-Privasys-EncAuth-Reject header (clean-looking in the network
            // tab) — surface the Reconnect prompt UP FRONT rather than leaving
            // the user "connected" (green attestation pill, enabled composer)
            // only to fail on the first send.
            const outcome = await reestablishSealed(instance.session_relay!.app_host!);
            if (cancelled) return;
            reconnectReasonRef.current = 'reactive';
            if (outcome === 'rejected' || outcome === 'no-voucher') {
                setTransport('stale');
            } else if (outcome === 'unavailable') {
                // Transient (enclave still booting): let the recovery loop retry.
                setTransport('reconnecting');
            }
            // 'ok' → sealedSession is now installed; stay 'ok'.
        })();
        return () => {
            cancelled = true;
        };
    }, [session, sealedSession, instance.session_relay, reestablishSealed, transport]);

    // A fresh sealed session (from a re-sign-in after a stale-back-end
    // prompt) clears the reconnect banner.
    useEffect(() => {
        if (sealedSession && transport === 'stale') setTransport('ok');
    }, [sealedSession, transport]);

    // Classify a chat-stream failure and, when it is a transport problem,
    // flip into the reconnecting state so the recovery effect below takes
    // over. Non-transport errors (validation, model errors) are left to the
    // per-message red notice. Called by ChatPanel on stream error.
    const onTransportError = useCallback((err: Error) => {
        if (isTransportError(err.message)) {
            reconnectReasonRef.current = 'reactive';
            setTransport((prev) => (prev === 'stale' ? 'stale' : 'reconnecting'));
        }
    }, []);

    // Proactive liveness: detect the enclave going away even while the user
    // is idle (stop the VM → the UI should react before the next prompt).
    // Requires SUSTAINED unreachability before reacting: a single /healthz blip
    // (gateway restart, the enclave busy with inference, a network hiccup) must
    // not flip us into recovery, because recovery tears down a working sealed
    // session — and a silent background rebind can't always complete (e.g. a
    // partitioned third-party auth iframe in Firefox), which would strand the
    // user on a false "reconnect" prompt every few minutes.
    useEffect(() => {
        if (!session || transport !== 'ok' || !instance.endpoint) return;
        let cancelled = false;
        let timer: ReturnType<typeof setTimeout>;
        let consecutiveFailures = 0;
        const tick = async () => {
            const up = await probeInstanceHealth(instance.endpoint, 5_000);
            if (cancelled) return;
            if (up) {
                consecutiveFailures = 0;
            } else {
                consecutiveFailures += 1;
                if (consecutiveFailures >= 3) {
                    reconnectReasonRef.current = 'proactive';
                    setTransport('reconnecting');
                    return;
                }
            }
            timer = setTimeout(() => void tick(), 20_000);
        };
        timer = setTimeout(() => void tick(), 20_000);
        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [session, transport, instance.endpoint]);

    // Recovery: while reconnecting, poll /healthz until the enclave answers,
    // then rebuild the sealed transport from the EncAuth voucher. A
    // measurement change comes back `rejected` → surface the hard reconnect
    // prompt; transient failures loop with a short backoff.
    useEffect(() => {
        if (transport !== 'reconnecting' || !session) return;
        let cancelled = false;
        const host =
            instance.session_relay?.enabled ? instance.session_relay.app_host : undefined;
        (async () => {
            // Self-looping retry: stays inside this single effect run so a
            // transient `unavailable` retries without needing a state change
            // to re-trigger the effect.
            //
            // A SILENT sealed resume can fail persistently (not just transiently)
            // when the enclave is perfectly reachable — most commonly because the
            // auth frame is a third-party iframe whose storage is partitioned, so
            // re-binding the EncAuth voucher needs an interactive user gesture
            // that a background resume can't make. Retrying forever would spin
            // the "connecting" banner indefinitely; after a few attempts we
            // surface the actionable Reconnect prompt (`stale`) so one click runs
            // the interactive ceremony and restores the sealed session.
            const MAX_SILENT_RESUME_TRIES = 4;
            let silentTries = 0;
            for (;;) {
                if (cancelled) return;
                // Wait until the back-end answers /healthz again.
                while (!cancelled) {
                    if (await probeInstanceHealth(instance.endpoint, 5_000)) break;
                    await sleep(5_000);
                }
                if (cancelled) return;
                if (!host) {
                    // Non-sealed instance: reachability is the whole story.
                    setTransport('ok');
                    return;
                }
                // Proactive trigger (a /healthz blip) with a sealed session
                // still in hand: it is very likely still valid, so do NOT tear
                // it down. Return to 'ok' and let the next REAL request reveal a
                // genuine failure (which re-enters here as 'reactive' and does
                // rebuild). This is what stops the idle false-positive reconnect
                // loop.
                if (reconnectReasonRef.current === 'proactive' && sealedSessionRef.current) {
                    setTransport('ok');
                    return;
                }
                const outcome = await reestablishSealed(host);
                if (cancelled) return;
                if (outcome === 'ok') {
                    setTransport('ok');
                    return;
                }
                if (outcome === 'rejected' || outcome === 'no-voucher') {
                    setTransport('stale');
                    return;
                }
                // `unavailable`: retry a few times for a genuine transient blip
                // (e.g. the enclave is still finishing its boot), then fall back
                // to the interactive Reconnect prompt since a silent resume
                // cannot recover on its own.
                silentTries += 1;
                if (silentTries >= MAX_SILENT_RESUME_TRIES) {
                    setTransport('stale');
                    return;
                }
                await sleep(3_000);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [transport, session, instance.endpoint, instance.session_relay, reestablishSealed]);

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
    const userTools = useUserTools(chatSession, session?.accessToken, ensureChatSession);
    const policyAllowsAdd = !!instance.tool_policy && instance.tool_policy !== 'locked';
    const hasAdminTools = (instance.available_tools?.length ?? 0) > 0;
    // The composer shows the Tools popover when there are admin tools, the
    // user has saved tools, or the fleet policy lets them add one.
    const showTools = hasAdminTools || userTools.tools.length > 0 || policyAllowsAdd;
    // The X-Privasys-Tools header scopes the union catalogue to enabled
    // admin + user tool names.
    const enabledToolsArray = useMemo(() => {
        const set = new Set<string>(tools.enabled);
        for (const t of userTools.tools) if (t.enabled) set.add(t.name);
        return [...set];
    }, [tools.enabled, userTools.tools]);

    // ChatPanel is intentionally NOT remounted via a `key` when the
    // conversation changes. Re-keying was aborting in-flight chat
    // completion fetches via the unmount cleanup. The panel observes
    // `conversationId` itself and resets local state when the parent
    // switches to a different conversation while no stream is in
    // flight; the null → minted-id transition (first message of a
    // brand-new conversation) is intentionally a no-op.

    const goChat = () => setView('chat');

    // Faithful replay of an assistant turn: branch a fresh conversation
    // ending at the turn's user prompt, then hand the panel the RECORDED
    // pins (seed, sampling, thinking mode, dynamic context). Same seed
    // with a fresh wall clock is a different prompt — the recorded
    // X-Privasys-Dynamic-Context is what makes the replay byte-faithful.
    const [pendingReplay, setPendingReplay] = useState<PendingReplay | null>(null);
    const replayFromMessage = useCallback((assistantMsgId: string) => {
        const msgs = conv.current?.messages ?? [];
        const i = msgs.findIndex((m) => m.id === assistantMsgId);
        if (i < 1) return;
        const userMsg = msgs[i - 1];
        const turn = msgs[i];
        if (userMsg.role !== 'user' || !turn.meta || turn.meta.seed === undefined) return;
        const newConvId = conv.branchFromMessage(userMsg.id);
        if (!newConvId) return;
        setPendingReplay({
            conversationId: newConvId,
            prompt: userMsg.content,
            sampling: {
                seed: turn.meta.seed,
                temperature: turn.meta.temperature,
                top_p: turn.meta.top_p,
                max_tokens: turn.meta.max_tokens
            },
            thinking: turn.thinking ?? false,
            dynamicContext: turn.meta.dynamic_context
        });
        goChat();
    }, [conv]);

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
                onShowTools={() => setView('tools')}
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

                {view === 'security' && instance.endpoint && session && (
                    <SecurityView instance={instance} userTools={userTools.tools} onStatus={setAttestationStatus} />
                )}
                {view === 'tools' && session && (
                    <ToolsView
                        instance={instance}
                        userTools={userTools}
                        token={session?.accessToken}
                        enabledToolNames={tools.enabled}
                        onToggleFleetTool={tools.toggle}
                    />
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
                        <SecurityView instance={instance} userTools={userTools.tools} onStatus={setAttestationStatus} />
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
                        onReplayFromMessage={replayFromMessage}
                        pendingReplay={pendingReplay}
                        onReplayConsumed={() => setPendingReplay(null)}
                        enabledTools={showTools ? enabledToolsArray : undefined}
                        enabledToolNames={showTools ? tools.enabled : undefined}
                        onToggleTool={showTools ? tools.toggle : undefined}
                        userTools={userTools.tools}
                        onToggleUserTool={userTools.setEnabled}
                        onManageTools={() => setView('tools')}
                        onRemoveUserTool={userTools.remove}
                        chatSession={chatSession}
                        transport={transport}
                        staleReason={staleReason}
                        onStreamError={onTransportError}
                        onReconnect={() => setView('signin')}
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
        case 'tools':
            return 'AI Tools';
        case 'signin':
            return 'Sign in';
        default:
            return fallback;
    }
}

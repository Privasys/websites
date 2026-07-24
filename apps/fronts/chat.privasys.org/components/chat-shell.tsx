'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { AvailableModel, Instance } from '~/lib/types';
import type { AggregateAttestationStatus } from '@privasys/attestation-view';
import { useAuth } from '~/lib/privasys-auth';
import { jwtSub } from '~/lib/jwt';
import { modelLabel } from '~/lib/model-label';
import { useConversations } from '~/lib/use-conversations';
import { useDriveConversations } from '~/lib/use-drive-conversations';
import { useChatDrive } from '~/lib/use-chat-drive';
import {
    attachToConversation,
    attachLargeFileToConversation,
    bytesToBase64,
    driveEnabled,
    finalizeConversation,
    getConversation,
    type AttachIntent,
    type ProvenanceRef
} from '~/lib/drive-chat-api';
import { STREAM_THRESHOLD } from '@privasys/drive-client';
import {
    fetchConversationNodeIds,
    fetchMemoryContext,
    mergeProvenance,
    retrieveContext
} from '~/lib/drive-rag';
import { useAIScope } from '~/lib/use-ai-scope';
import type { ChatContextPrefs } from '~/lib/conversations';
import type { ChatMessage } from '~/lib/chat-stream';
import type { AttachmentChip } from './composer';
import { useEnabledTools } from '~/lib/use-enabled-tools';
import { useUserTools } from '~/lib/use-user-tools';
import { ToolsView } from './tools-view';
import { chatServiceHost } from '~/lib/chat-service-api';
import { probeInstanceHealth } from '~/lib/instance-api';
import { isTransportError } from '~/lib/transport';
import type { SealedSession } from '@privasys/auth';
import { AppSidebar } from './app-sidebar';
import { ShareConversationDialog } from './share-conversation-dialog';
import { ChatPanel, type PendingReplay } from './chat-panel';
import { SecurityView } from './security-view';
import { KnowledgeView } from './knowledge-view';
import { ContextIntroModal } from './context-intro-modal';
import { SignInGate } from './signin-view';

type ShellView = 'chat' | 'security' | 'tools' | 'knowledge' | 'signin';

type TransportState = 'ok' | 'reconnecting' | 'stale';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Client-side threshold for "read in full" vs "indexed" attachments. Roughly
// 32k tokens of text at ~4 chars/token; larger files are indexed and looked
// up on demand rather than inlined into the chat context (§8.7).
const INLINE_THRESHOLD_BYTES = 128 * 1024;

// Whether a file's bytes can be inlined as text (used for the small-file
// "read in full" path). Conservative: only obvious text-ish types.
function isTextualFile(mime: string, name: string): boolean {
    const m = (mime || '').toLowerCase();
    if (m.startsWith('text/')) return true;
    if (/^application\/(json|xml|x-yaml|yaml|toml|x-ndjson)$/.test(m)) return true;
    if (/\.(txt|md|markdown|json|csv|tsv|yml|yaml|toml|xml|log|html?|css|js|ts|tsx|py|go|rs|java|rb|sh)$/i.test(name)) {
        return true;
    }
    return false;
}

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
            const up = await probeInstanceHealth(instance.id, 5_000);
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
                    if (await probeInstanceHealth(instance.id, 5_000)) break;
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

    // Drive integration (§8.7). Behind the `driveEnabled()` flag (presence of
    // NEXT_PUBLIC_DRIVE_APP_HOST), conversations live in the caller's Drive,
    // files attach from/to Drive, and the agent uses Drive as RAG memory. The
    // flag is a stable build-time value, so both conversation hooks are always
    // called (hooks-order safe) and we simply select which one drives the UI.
    const useDrive = driveEnabled();
    // When the inference enclave advertises the built-in Drive tools (§8.7
    // RAG-in-enclave), the model retrieves from Drive itself over the sealed
    // tool-grant. In that case the CLIENT-side retrieval (drive-rag) stands
    // down to a fallback so we don't retrieve twice; memory + search happen
    // inside the enclave with provenance in the tool_result stream.
    const enclaveHasDriveRAG = (instance.available_tools ?? []).some((t) =>
        t.name?.startsWith('drive__')
    );
    const drive = useChatDrive();
    const convModelLabel = model ? modelLabel(model) : undefined;
    const localConv = useConversations({ instanceId: instance.id, sub, modelLabel: convModelLabel });
    const driveConv = useDriveConversations({
        instanceId: instance.id,
        sub,
        modelLabel: convModelLabel,
        session: drive.session,
        tenantId: drive.tenantId
    });
    const conv = useDrive ? driveConv : localConv;

    // The user's global AI-scope (the ceiling of what the assistant may draw
    // on). Drives the per-conversation context defaults + the Context chip's
    // Knowledge folder list.
    const aiScope = useAIScope(drive.session, drive.tenantId);
    const globalContextDefaults: ChatContextPrefs = useMemo(
        () => ({
            memory: true, // Memory is always in scope (sovereign notes)
            pastConversations: aiScope.conversationsScoped || aiScope.allScoped,
            knowledge: aiScope.allScoped || aiScope.folders.some((f) => f.scoped)
        }),
        [aiScope.conversationsScoped, aiScope.allScoped, aiScope.folders]
    );

    // Per-conversation context overrides (keyed by LOCAL conversation id).
    // Undefined for a conversation means "inherit the global defaults" — the
    // choice is per-chat and in-chat, never a buried global switch (§8.7).
    const [contextByConv, setContextByConv] = useState<Record<string, ChatContextPrefs>>({});
    const resolveContext = useCallback(
        (key: string): ChatContextPrefs => contextByConv[key] ?? globalContextDefaults,
        [contextByConv, globalContextDefaults]
    );
    const setContextPref = useCallback(
        (key: string, field: keyof ChatContextPrefs, value: boolean) => {
            setContextByConv((prev) => {
                const cur = prev[key] ?? globalContextDefaults;
                return { ...prev, [key]: { ...cur, [field]: value } };
            });
        },
        [globalContextDefaults]
    );

    // First-run Context prompt: offered once, when the user starts their
    // SECOND conversation — the point cross-chat recall first helps. Sets the
    // global "past conversations" default and teaches the per-chat Context
    // chip. Seen-state is a per-user localStorage flag.
    const contextPromptSeenKey = sub ? `privasys:chat:ctx-intro:${sub}` : '';
    const [showContextIntro, setShowContextIntro] = useState(false);
    useEffect(() => {
        if (!useDrive || !drive.session || !contextPromptSeenKey) return;
        if (conv.currentId !== null || conv.conversations.length < 1) return;
        try {
            if (localStorage.getItem(contextPromptSeenKey)) return;
        } catch {
            return;
        }
        setShowContextIntro(true);
    }, [useDrive, drive.session, contextPromptSeenKey, conv.currentId, conv.conversations.length]);
    const dismissContextIntro = useCallback(() => {
        try {
            if (contextPromptSeenKey) localStorage.setItem(contextPromptSeenKey, '1');
        } catch {
            /* private mode: it'll just re-offer next session */
        }
        setShowContextIntro(false);
    }, [contextPromptSeenKey]);

    // Node ids under Chat conversations/, so retrieval can tell a past-chat
    // hit from a knowledge-base one. Fetched once per Drive session.
    const conversationNodeIdsRef = useRef<Set<string>>(new Set());
    useEffect(() => {
        if (!drive.session || !drive.tenantId) return;
        let cancelled = false;
        void fetchConversationNodeIds(drive.session, drive.tenantId).then((ids) => {
            if (!cancelled) conversationNodeIdsRef.current = ids;
        });
        return () => {
            cancelled = true;
        };
    }, [drive.session, drive.tenantId]);

    // Per-conversation Drive state (keyed by LOCAL conversation id):
    //   - provenance chips (node_id + section_id) from retrieval actually used,
    //   - which conversations have had Memory injected (first turn only),
    //   - session-attached file text to inline ("read in full"),
    //   - attachment chips shown in the composer.
    const provenanceRef = useRef<Map<string, ProvenanceRef[]>>(new Map());
    const memoryInjectedRef = useRef<Set<string>>(new Set());
    const sessionCtxRef = useRef<Map<string, { name: string; text: string }[]>>(new Map());
    const [attachmentsByConv, setAttachmentsByConv] = useState<Record<string, AttachmentChip[]>>({});
    const [driveNotice, setDriveNotice] = useState<string | null>(null);
    const [finalizing, setFinalizing] = useState(false);
    const [shareTargetId, setShareTargetId] = useState<string | null>(null);

    const addProvenance = useCallback((key: string, refs: ProvenanceRef[]) => {
        if (!refs.length) return;
        provenanceRef.current.set(key, mergeProvenance(provenanceRef.current.get(key) ?? [], refs));
    }, []);

    // Per-turn RAG augmentation: inline Memory at conversation start + the
    // semantically retrieved Drive excerpts for this prompt, plus any
    // session-attached files that should be read in full. Best effort.
    const buildAugmentation = useCallback(
        async ({
            userText,
            isFirstTurn,
            conversationId
        }: {
            userText: string;
            isFirstTurn: boolean;
            conversationId: string | null;
        }): Promise<{ messages: ChatMessage[] }> => {
            const messages: ChatMessage[] = [];
            if (!useDrive || !drive.session || !drive.tenantId) return { messages };
            const key = conversationId ?? '__pending__';
            // What the user allows this chat to draw on (per-conversation).
            const prefs = resolveContext(key);
            if (prefs.memory && isFirstTurn && !memoryInjectedRef.current.has(key)) {
                memoryInjectedRef.current.add(key);
                const mem = await fetchMemoryContext(drive.session, drive.tenantId);
                messages.push(...mem.messages);
                addProvenance(key, mem.provenance);
            }
            for (const f of sessionCtxRef.current.get(key) ?? []) {
                messages.push({
                    role: 'system',
                    content: `Attached file "${f.name}" provided by the user for this chat:\n\n${f.text}`
                });
            }
            const ret = await retrieveContext(drive.session, drive.tenantId, userText, {
                pastConversations: prefs.pastConversations,
                knowledge: prefs.knowledge,
                conversationNodeIds: conversationNodeIdsRef.current
            });
            messages.push(...ret.messages);
            addProvenance(key, ret.provenance);
            return { messages };
        },
        [useDrive, drive.session, drive.tenantId, addProvenance, resolveContext]
    );

    // Attach a picked file to the current conversation with an intent.
    const onAttachFile = useCallback(
        async (file: File, intent: AttachIntent) => {
            if (!useDrive) return;
            const chipId = `att-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
            const textual = isTextualFile(file.type, file.name);
            const small = file.size <= INLINE_THRESHOLD_BYTES;
            // A "session" (use-in-this-chat) file must fit the model context
            // budget (~32k tokens). Anything larger can't be inlined, so it
            // falls back to a KNOWLEDGE file — indexed, chunked and looked up
            // on demand rather than read in full (§8.7, decided 2026-07-19).
            const sessionTooBig = intent === 'session' && !(textual && small);
            const effectiveIntent: AttachIntent = sessionTooBig ? 'knowledge' : intent;
            const willIndex = effectiveIntent === 'knowledge' || !(textual && small);
            // Over the 8 MiB single-request cap → chunked upload into the
            // conversation's files/ folder (indexed) instead of base64 attach.
            const needsStreaming = file.size > STREAM_THRESHOLD;
            let key = driveConv.currentId ?? '__pending__';
            const chip: AttachmentChip = {
                id: chipId,
                name: file.name,
                sizeBytes: file.size,
                intent: effectiveIntent,
                indexed: willIndex,
                status: 'uploading'
            };
            setAttachmentsByConv((prev) => ({ ...prev, [key]: [...(prev[key] ?? []), chip] }));
            try {
                const ensured = await drive.ensureSession(() =>
                    setDriveNotice('Approve Drive access on your phone to attach files.')
                );
                if (!ensured) throw new Error('Drive is not connected.');
                setDriveNotice(
                    sessionTooBig
                        ? `“${file.name}” is large, so I’ve added it to your knowledge base and I’ll look up the relevant parts.`
                        : null
                );
                const target = await driveConv.ensureDriveConversationId(
                    ensured.session,
                    ensured.tenantId,
                    file.name
                );
                if (!target) throw new Error('Could not open the conversation in Drive.');
                // The conversation may have just been minted; migrate the chip
                // to its real local id so it shows under the active view.
                if (target.localId !== key) {
                    const from = key;
                    key = target.localId;
                    setAttachmentsByConv((prev) => {
                        const src = (prev[from] ?? []).filter((c) => c.id !== chipId);
                        const dst = [...(prev[key] ?? []), chip];
                        return { ...prev, [from]: src, [key]: dst };
                    });
                }
                if (needsStreaming) {
                    // Resolve the conversation's files/ folder and stream the
                    // file into it in chunks (always a knowledge file).
                    const detail = await getConversation(
                        ensured.session,
                        ensured.tenantId,
                        target.driveId
                    );
                    const filesFolderId = (detail.conversation as { files_folder_id?: string })
                        .files_folder_id;
                    if (!filesFolderId) {
                        throw new Error('Could not locate the conversation files folder.');
                    }
                    await attachLargeFileToConversation(
                        ensured.session,
                        ensured.tenantId,
                        filesFolderId,
                        file
                    );
                } else {
                    const bytes = new Uint8Array(await file.arrayBuffer());
                    await attachToConversation(ensured.session, ensured.tenantId, target.driveId, {
                        name: file.name,
                        mime: file.type || 'application/octet-stream',
                        contentBase64: bytesToBase64(bytes),
                        intent: effectiveIntent
                    });
                    if (effectiveIntent === 'session' && textual && small) {
                        const list = sessionCtxRef.current.get(key) ?? [];
                        list.push({ name: file.name, text: new TextDecoder().decode(bytes) });
                        sessionCtxRef.current.set(key, list);
                    }
                }
                setAttachmentsByConv((prev) => ({
                    ...prev,
                    [key]: (prev[key] ?? []).map((c) =>
                        c.id === chipId ? { ...c, status: 'ready' as const } : c
                    )
                }));
            } catch (e) {
                const msg = e instanceof Error ? e.message : 'Attach failed.';
                setAttachmentsByConv((prev) => ({
                    ...prev,
                    [key]: (prev[key] ?? []).map((c) =>
                        c.id === chipId ? { ...c, status: 'error' as const, error: msg } : c
                    )
                }));
            }
        },
        [useDrive, drive, driveConv]
    );

    // Finalise the current conversation into a cited digest.
    const onMarkComplete = useCallback(async () => {
        if (!useDrive || !drive.session || !drive.tenantId) return;
        const cur = driveConv.current;
        if (!cur?.driveConversationId || !driveConv.currentId) return;
        setFinalizing(true);
        try {
            const prov = provenanceRef.current.get(driveConv.currentId) ?? [];
            const res = await finalizeConversation(
                drive.session,
                drive.tenantId,
                cur.driveConversationId,
                prov
            );
            driveConv.markFinalized(driveConv.currentId, res.digest_id);
            setDriveNotice(
                `Conversation completed. Digest ${res.digest_id.slice(0, 12)}… saved to your Drive` +
                    (res.cited ? ` (${res.cited} citation${res.cited === 1 ? '' : 's'}).` : '.')
            );
        } catch (e) {
            setDriveNotice(`Could not finalise: ${e instanceof Error ? e.message : 'unknown error'}`);
        } finally {
            setFinalizing(false);
        }
    }, [useDrive, drive.session, drive.tenantId, driveConv]);

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

    // Sign-in replaces the WHOLE shell (drive.privasys.org pattern): no
    // sidebar, conversation list or signed-in user pill behind an auth
    // prompt. Reached on reconnect (stale sealed transport) or from the
    // sidebar; the signed-out case renders the gate from the page itself.
    if (view === 'signin') {
        // No stale-transport notice needed: the SDK's connect() detects the
        // refused voucher itself and renders reason-aware re-approval copy.
        return (
            <SignInGate
                instance={instance}
                onCancel={session ? goChat : undefined}
                onSuccess={goChat}
            />
        );
    }

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
                onShareConversation={useDrive ? setShareTargetId : undefined}
                onShowSecurity={() => setView('security')}
                onShowTools={() => setView('tools')}
                onShowKnowledge={useDrive ? () => setView('knowledge') : undefined}
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
                    {view === 'chat' && useDrive && driveConv.current?.driveConversationId && (
                        <div className="ml-auto flex items-center gap-2">
                            {driveConv.current.finalized ? (
                                <span className="inline-flex items-center gap-1 rounded-md border border-[var(--color-primary-green)]/40 px-2.5 py-1 text-xs text-[var(--color-primary-green)]">
                                    Completed
                                </span>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => void onMarkComplete()}
                                    disabled={finalizing}
                                    title="Finalise this conversation into a cited digest saved to your Drive"
                                    className="rounded-md border border-[var(--color-border-dark)] bg-[var(--color-surface-2)]/50 px-3 py-1 text-xs text-[var(--color-text-secondary)] hover:border-[var(--color-primary-blue)]/60 hover:text-[var(--color-primary-blue)] disabled:opacity-50"
                                >
                                    {finalizing ? 'Finalising…' : 'Mark complete'}
                                </button>
                            )}
                        </div>
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

                {view === 'chat' && driveNotice && (
                    <div className="flex items-center justify-between gap-3 border-b border-[var(--color-border-dark)]/60 bg-[var(--color-surface-2)]/40 px-5 py-2 text-xs text-[var(--color-text-secondary)]">
                        <span>{driveNotice}</span>
                        <button
                            type="button"
                            onClick={() => setDriveNotice(null)}
                            className="shrink-0 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                            aria-label="Dismiss"
                        >
                            Dismiss
                        </button>
                    </div>
                )}

                {view === 'security' && instance.endpoint && session && (
                    <SecurityView instance={instance} onStatus={setAttestationStatus} />
                )}
                {view === 'knowledge' && session && (
                    <KnowledgeView
                        session={drive.session}
                        tenantId={drive.tenantId}
                        onConnect={async () => {
                            await drive.ensureSession(() =>
                                setDriveNotice('Approve Drive access on your phone to connect.')
                            );
                            setDriveNotice(null);
                        }}
                    />
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
                        <SecurityView instance={instance} onStatus={setAttestationStatus} />
                    </div>
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
                        buildAugmentation={useDrive && !enclaveHasDriveRAG ? buildAugmentation : undefined}
                        attachEnabled={useDrive && !!session}
                        attachments={attachmentsByConv[conv.currentId ?? '__pending__'] ?? []}
                        onAttachFile={useDrive ? onAttachFile : undefined}
                        contextEnabled={useDrive && !enclaveHasDriveRAG && !!drive.session}
                        contextPrefs={resolveContext(conv.currentId ?? '__pending__')}
                        onToggleContext={(field, value) =>
                            setContextPref(conv.currentId ?? '__pending__', field, value)
                        }
                        knowledgeFolders={aiScope.folders}
                        knowledgeAllScoped={aiScope.allScoped}
                        onManageKnowledge={() => setView('knowledge')}
                    />
                )}
            </div>
            {view === 'chat' && showContextIntro && (
                <ContextIntroModal
                    onUsePastChats={async () => {
                        await drive.ensureSession();
                        await aiScope.setConversations(true);
                        dismissContextIntro();
                    }}
                    onKeepSeparate={dismissContextIntro}
                />
            )}
            {shareTargetId &&
                drive.session &&
                drive.tenantId &&
                (() => {
                    const target = conv.conversations.find((c) => c.id === shareTargetId);
                    if (!target?.driveConversationId) return null;
                    return (
                        <ShareConversationDialog
                            session={drive.session}
                            tenantId={drive.tenantId}
                            conversationId={target.driveConversationId}
                            title={target.title}
                            instanceId={instance.id}
                            onClose={() => setShareTargetId(null)}
                        />
                    );
                })()}
        </div>
    );
}

function viewTitle(view: ShellView, fallback: string): string {
    switch (view) {
        case 'security':
            return 'Security';
        case 'tools':
            return 'AI Tools';
        case 'knowledge':
            return 'Knowledge';
        case 'signin':
            return 'Sign in';
        default:
            return fallback;
    }
}

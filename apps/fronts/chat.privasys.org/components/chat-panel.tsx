'use client';

import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import type { AvailableModel, Instance } from '~/lib/types';
import {
    streamChatCompletion,
    ModelLoadingError
} from '~/lib/chat-stream';
import { DEFAULT_SAMPLING, type SamplingParams } from '~/lib/sampling';
import { modelLabel } from '~/lib/model-label';
import type { PersistedMessage, Rating, ToolInvocation } from '~/lib/conversations';
import type { AddUserToolInput, UserTool } from '~/lib/chat-service-api';
import type { SealedSession } from '@privasys/auth';
import { clearFeedback, recordFeedback } from '~/lib/pending-feedback';
import { waitForModelReady } from '~/lib/instance-api';
import { fetchToolGrant } from '~/lib/chat-service-api';
import { isTransportError } from '~/lib/transport';
import { Composer } from './composer';
import { Markdown } from './markdown';
import { MetadataDialog } from './metadata-dialog';
import { ThinkingBlock } from './thinking-block';
import { ToolCallCard } from './tool-call-card';
import { splitReasoning } from '~/lib/thinking';
import {
    SYSTEM_PROMPT,
    SYSTEM_PROMPT_SHA256,
    SYSTEM_PROMPT_VERSION
} from '~/lib/system-prompt';
import { createTextSmoother } from '~/lib/text-smoother';

interface DisplayMessage extends PersistedMessage {
    /** True while tokens are still streaming in for this message. */
    streaming?: boolean;
    /** Set while the turn is waiting for the enclave transport to recover
     *  (enclave restarting / sealed session being re-established). Transient,
     *  never persisted. The prompt is re-sent automatically once healthy. */
    reconnecting?: { startedAt: number };
}

// How many times a single send re-tries through a transport reconnect before
// giving up with a soft error. Each attempt waits out the full recovery window.
const MAX_TRANSPORT_RETRIES = 3;

let nextId = 0;
const newId = () => `m${Date.now().toString(36)}-${++nextId}`;

// Streaming chat panel.
//
// Two visual states:
//   - Empty: a centered "Where should we start?" greeting + the Composer
//     pinned in the middle of the viewport (Gemini new-chat layout).
//   - Active: scrollable message list + Composer docked at the bottom.
//
// Assistant turns render as full-width markdown (no chat bubble) with a
// per-message action row (Copy, Metadata, wall-time). User turns keep
// the right-aligned pill so the conversation flow is still obvious.
export function ChatPanel({
    instance,
    model,
    onModelChange,
    token,
    sealedSession,
    disabledReason,
    userGreeting,
    onConnect,
    initialMessages,
    conversationId,
    onMessagesChange,
    onBranchFromMessage,
    enabledTools,
    enabledToolNames,
    onToggleTool,
    userTools,
    onToggleUserTool,
    onAddTool,
    onRemoveUserTool,
    toolPolicy,
    chatSession,
    transport = 'ok',
    onStreamError,
    onReconnect
}: {
    instance: Instance;
    model: AvailableModel | null;
    onModelChange: (m: AvailableModel) => void;
    token?: string;
    sealedSession?: SealedSession;
    disabledReason?: string;
    userGreeting?: string;
    /** When set, the empty-state shows a prominent Connect button
     *  instead of a disabled composer (used in the unauth flow). */
    onConnect?: () => void;
    /** Persisted messages to hydrate from. */
    initialMessages: PersistedMessage[];
    /** Id of the conversation we are editing, or null when about to
     *  create a new one. */
    conversationId: string | null;
    /** Persist a new message list. Returns the conversation id the
     *  messages were written to (creates one when called with no
     *  active conversation). */
    onMessagesChange: (messages: PersistedMessage[]) => string | null;
    /** Fork the current conversation at the given assistant message,
     *  selecting the new conversation. The shell handles persistence
     *  + view routing; we just expose the action to MessageActions. */
    onBranchFromMessage?: (messageId: string) => void;
    /** When set, sent verbatim as the X-Privasys-Tools header to the
     *  proxy so the agentic loop is restricted to those MCP servers
     *  for this conversation. `undefined` keeps the proxy default. */
    enabledTools?: string[];
    /** Set form of the enabled tools, used to drive the composer's
     *  Tools popover checked state. */
    enabledToolNames?: Set<string>;
    /** Toggle a tool on/off from the composer's Tools popover. */
    onToggleTool?: (name: string, on: boolean) => void;
    /** The user's persistent tools (from chat-service). */
    userTools?: UserTool[];
    onToggleUserTool?: (id: string, enabled: boolean) => void | Promise<void>;
    onAddTool?: (input: AddUserToolInput) => Promise<void>;
    onRemoveUserTool?: (id: string) => void | Promise<void>;
    /** Fleet governance mode, gates the add-tool affordance. */
    toolPolicy?: string;
    /** Dedicated sealed session to chat-service, for minting tool-grants. */
    chatSession?: SealedSession | null;
    /** Enclave transport health, owned by the shell. Drives the reconnect
     *  banner so an outage/redeploy is visible without sending a prompt. */
    transport?: 'ok' | 'reconnecting' | 'stale';
    /** Report a stream failure to the shell so it can classify transport
     *  errors and start the reconnect flow. */
    onStreamError?: (err: Error) => void;
    /** Invoked when the user clicks "Reconnect" on a stale-back-end banner. */
    onReconnect?: () => void;
}) {
    const [messages, setMessages] = useState<DisplayMessage[]>(
        () => initialMessages.map((m) => ({ ...m }))
    );
    const [input, setInput] = useState('');
    const [streaming, setStreaming] = useState(false);
    const streamingRef = useRef(false);
    const [sampling, setSampling] = useState<SamplingParams>({ ...DEFAULT_SAMPLING });
    const [metaFor, setMetaFor] = useState<DisplayMessage | null>(null);
    const abortRef = useRef<AbortController | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    // Track which conversation id our current messages belong to.
    // The shell does NOT remount us when the conversation id mints
    // mid-stream (that would abort the in-flight chat completion).
    // We instead reset our local state when the parent rotates
    // `conversationId` to a *different* value AND we are not
    // currently streaming.
    const localConvIdRef = useRef<string | null>(conversationId);
    // Live mirrors of props the long-running send() closure must read at
    // RETRY time, not at call time: after the shell re-establishes the sealed
    // session it hands us a NEW SealedSession (the old proxy's frame is gone),
    // so a retry must use the current one, and the reconnect wait must observe
    // the current transport state.
    const transportRef = useRef(transport);
    const sealedSessionRef = useRef(sealedSession);
    useEffect(() => { transportRef.current = transport; }, [transport]);
    useEffect(() => { sealedSessionRef.current = sealedSession; }, [sealedSession]);

    // Sync internal state when the parent switches conversation.
    // - null → string (first message persisted): keep local state,
    //   just record the new id. Critical: must NOT clobber `messages`
    //   while a stream is in flight — onDelta is appending to it.
    // - string → different string: parent picked another conversation;
    //   reset our state to the new initialMessages. Skipped while a
    //   stream is in flight so we don't lose the assistant turn.
    useEffect(() => {
        const prev = localConvIdRef.current;
        localConvIdRef.current = conversationId;
        if (prev === conversationId) return;
        if (prev === null && conversationId !== null) return; // first-message mint
        if (streamingRef.current) return;
        setMessages(initialMessages.map((m) => ({ ...m })));
        setInput('');
    }, [conversationId, initialMessages]);

    // Persist a snapshot of the message list. Strips transient state
    // (`streaming`) so the on-disk shape matches PersistedMessage.
    const persist = useCallback(
        (next: DisplayMessage[]) => {
            const sanitized: PersistedMessage[] = next.map((m) => {
                const copy: DisplayMessage = { ...m };
                delete copy.streaming;
                delete copy.reconnecting;
                return copy;
            });
            const id = onMessagesChange(sanitized);
            if (id) localConvIdRef.current = id;
        },
        [onMessagesChange]
    );

    useEffect(() => {
        scrollRef.current?.scrollTo({
            top: scrollRef.current.scrollHeight,
            behavior: 'smooth'
        });
    }, [messages]);

    useEffect(() => () => abortRef.current?.abort(), []);

    // Mirror `streaming` into a ref so the conversationId-change
    // effect above can read the current value without re-running
    // every time `streaming` flips.
    useEffect(() => { streamingRef.current = streaming; }, [streaming]);

    const send = useCallback(async () => {
        const text = input.trim();
        if (!text || streaming || !model) return;

        const userMsg: DisplayMessage = { id: newId(), role: 'user', content: text };
        const assistantId = newId();
        const history = [...messages, userMsg];
        const startedAt = Date.now();
        const samplingSnapshot: SamplingParams = { ...sampling };

        const initial: DisplayMessage[] = [
            ...history,
            {
                id: assistantId,
                role: 'assistant',
                content: '',
                streaming: true,
                sampling: samplingSnapshot,
                startedAt
            }
        ];
        setMessages(initial);
        // Persist the user turn + placeholder eagerly so a refresh
        // mid-stream still surfaces the in-flight question. The
        // assistant body will be overwritten when streaming ends.
        persist(initial);
        setInput('');
        setStreaming(true);

        const ctrl = new AbortController();
        abortRef.current = ctrl;

        // Mint a fresh tool-grant for this turn (over chat-service's sealed
        // session) so the enclave can admit the user's own MCP tools.
        // Best-effort: no chat session / no grant just means only the fleet's
        // admin tools are available.
        let toolGrant: string | undefined;
        if (chatSession && token && enabledTools && enabledTools.length > 0) {
            toolGrant = (await fetchToolGrant(chatSession, token, instance.id)) ?? undefined;
        }

        // Pace assistant text into the UI on requestAnimationFrame so
        // bursty SSE arrivals (sealed-relay frame coalescing, vLLM
        // detokeniser hiccups) render as a steady typewriter instead
        // of a strobe. The smoother accumulates raw deltas and drains
        // a fraction of its buffer per frame; when the stream ends,
        // the trailing buffer is flushed promptly via finish().
        const smoother = createTextSmoother({
            onText: (chunk) => {
                setMessages((prev) =>
                    prev.map((m) =>
                        m.id === assistantId
                            ? { ...m, content: m.content + chunk }
                            : m
                    )
                );
            }
        });
        ctrl.signal.addEventListener('abort', () => smoother.cancel());

        // The chat stream is wrapped in a tiny retry loop so a "Model
        // is loading" 503 (e.g. right after a Spot-VM cold-start) is
        // converted into an inline "loading model…" notice + automatic
        // resend once the enclave's `/healthz` reports ready. The user
        // never sees the raw 503 string and never has to retype the
        // prompt. See lib/chat-stream.ts::ModelLoadingError and
        // lib/instance-api.ts::waitForModelReady.
        const runStream = () =>
            streamChatCompletion({
                endpoint: instance.endpoint,
                model: model.name,
                sampling: samplingSnapshot,
                messages: [
                    { role: 'system' as const, content: SYSTEM_PROMPT },
                    ...history.map(({ role, content }) => ({ role, content }))
                ],
                token,
                // Read the CURRENT sealed session so a post-reconnect retry
                // uses the freshly re-established transport, not the dead one
                // captured when send() was first called.
                sealedSession: sealedSessionRef.current ?? undefined,
                // Instances that support sealed transport must never fall
                // back to plaintext through the gateway.
                sealedRequired: !!instance.session_relay?.enabled,
                signal: ctrl.signal,
                enabledTools,
                toolGrant,
                onDelta: (delta) => {
                    smoother.push(delta);
                },
                onToolCall: (ev) => {
                    const inv: ToolInvocation = {
                        id: ev.id,
                        name: ev.name,
                        args: ev.args,
                        status: 'running',
                        startedAt: ev.started_at,
                        requiresConfirmation: ev.requires_confirmation
                    };
                    setMessages((prev) =>
                        prev.map((m) =>
                            m.id === assistantId
                                ? { ...m, toolInvocations: [...(m.toolInvocations ?? []), inv] }
                                : m
                        )
                    );
                },
                onToolResult: (ev) => {
                    setMessages((prev) =>
                        prev.map((m) => {
                            if (m.id !== assistantId) return m;
                            const list = (m.toolInvocations ?? []).map((inv) =>
                                inv.id === ev.id
                                    ? {
                                        ...inv,
                                        status: ev.status,
                                        result: ev.result,
                                        error: ev.error,
                                        finishedAt: ev.finished_at,
                                        durationMs: ev.duration_ms
                                    }
                                    : inv
                            );
                            return { ...m, toolInvocations: list };
                        })
                    );
                },
                onDone: (_full, meta) => {
                    // Drain any text still buffered by the smoother
                    // before we flip `streaming` off. The smoother
                    // calls back through onText (still running on
                    // rAF), so the assistant content keeps catching
                    // up for a few extra frames after the network
                    // stream closes.
                    smoother.finish();
                    // Stamp the system prompt identity into the per-message
                    // reproducibility block so the MetadataDialog can show
                    // (and the user can verify) which prompt produced this
                    // answer. The full text lives in version control at
                    // websites/apps/fronts/chat.privasys.org/lib/system-prompt.ts.
                    const stampedMeta = {
                        ...(meta ?? {}),
                        system_prompt_sha256: SYSTEM_PROMPT_SHA256,
                        system_prompt_version: SYSTEM_PROMPT_VERSION
                    };
                    setMessages((prev) => {
                        const next = prev.map((m) =>
                            m.id === assistantId
                                ? {
                                    ...m,
                                    streaming: false,
                                    meta: stampedMeta,
                                    finishedAt: Date.now(),
                                    loadingModel: undefined
                                }
                                : m
                        );
                        persist(next);
                        return next;
                    });
                },
                onError: (err) => {
                    smoother.cancel();
                    // Model-loading errors are handled below by the
                    // retry loop; don't paint a red error string for
                    // them — the inline "loading model…" notice will
                    // be shown instead.
                    if (err instanceof ModelLoadingError) return;
                    // Let the shell decide whether this is a transport
                    // failure (enclave down / session stale) and kick off
                    // the reconnect flow.
                    onStreamError?.(err);
                    // Transport failures are handled by the reconnect/retry
                    // loop below (inline "Reconnecting…" notice + auto-resend),
                    // so don't paint a red per-message error for them.
                    if (isTransportError(err.message)) return;
                    setMessages((prev) => {
                        const next = prev.map((m) =>
                            m.id === assistantId
                                ? { ...m, streaming: false, error: err.message, loadingModel: undefined }
                                : m
                        );
                        persist(next);
                        return next;
                    });
                }
            });

        // Wait for the shell's transport state to settle after a transport
        // error. The shell flips to 'reconnecting' (async) and drives recovery;
        // we first let it leave 'ok' (it acknowledged), then wait for a
        // terminal state. 'ok' = sealed session re-established (retry); 'stale'
        // = the enclave's measurement changed and a fresh sign-in is needed
        // (the composer's Reconnect banner takes over); 'timeout' = gave up.
        const waitForTransportResolution = async (): Promise<'ok' | 'stale' | 'timeout'> => {
            const ackDeadline = Date.now() + 4_000;
            while (transportRef.current === 'ok' && Date.now() < ackDeadline) {
                if (ctrl.signal.aborted) return 'timeout';
                await new Promise((r) => setTimeout(r, 200));
            }
            const deadline = Date.now() + 120_000;
            while (Date.now() < deadline) {
                if (ctrl.signal.aborted) return 'timeout';
                if (transportRef.current === 'ok') return 'ok';
                if (transportRef.current === 'stale') return 'stale';
                await new Promise((r) => setTimeout(r, 500));
            }
            return 'timeout';
        };

        try {
            // Unified retry loop: a single send transparently rides out a model
            // cold-start (503) AND an enclave transport blip (502/401/network)
            // without the user retyping or seeing red errors. Each branch
            // re-issues the exact same request via runStream(), which reads the
            // current sealed session so a post-reconnect retry uses the fresh
            // transport.
            let transportRetries = 0;
            for (;;) {
                try {
                    await runStream();
                    break;
                } catch (e) {
                    if (e instanceof ModelLoadingError) {
                        // Switch the placeholder to a friendly "loading model"
                        // notice while we poll the enclave. Use the model's
                        // declared `load_time_seconds` (set by the operator on
                        // the fleet's available_models JSON) as the ETA, with
                        // a sane default for unknown models.
                        const eta = model.load_time_seconds ?? 240;
                        const loadingStartedAt = Date.now();
                        setMessages((prev) =>
                            prev.map((m) =>
                                m.id === assistantId
                                    ? {
                                        ...m,
                                        streaming: true,
                                        error: undefined,
                                        reconnecting: undefined,
                                        loadingModel: { startedAt: loadingStartedAt, etaSeconds: eta }
                                    }
                                    : m
                            )
                        );
                        const ready = await waitForModelReady(instance.endpoint, model.name, {
                            timeoutMs: Math.max(eta * 2, 60) * 1000,
                            intervalMs: 5_000,
                            signal: ctrl.signal
                        });
                        if (!ready) {
                            setMessages((prev) => {
                                const next = prev.map((m) =>
                                    m.id === assistantId
                                        ? {
                                            ...m,
                                            streaming: false,
                                            loadingModel: undefined,
                                            error:
                                                'The model did not finish loading in time. Please try again in a moment.'
                                        }
                                        : m
                                );
                                persist(next);
                                return next;
                            });
                            break;
                        }
                        // Model is ready — clear the loading notice and retry.
                        setMessages((prev) =>
                            prev.map((m) =>
                                m.id === assistantId ? { ...m, loadingModel: undefined } : m
                            )
                        );
                        continue;
                    }

                    if (isTransportError((e as Error).message) && transportRetries < MAX_TRANSPORT_RETRIES) {
                        transportRetries++;
                        // Show a "Reconnecting…" notice in place of a red error;
                        // onError already notified the shell, which is recovering
                        // the sealed session.
                        setMessages((prev) =>
                            prev.map((m) =>
                                m.id === assistantId
                                    ? {
                                        ...m,
                                        streaming: true,
                                        error: undefined,
                                        loadingModel: undefined,
                                        reconnecting: { startedAt: Date.now() }
                                    }
                                    : m
                            )
                        );
                        const outcome = await waitForTransportResolution();
                        if (outcome === 'ok') {
                            setMessages((prev) =>
                                prev.map((m) =>
                                    m.id === assistantId ? { ...m, reconnecting: undefined } : m
                                )
                            );
                            continue;
                        }
                        // 'stale' → the Reconnect banner owns the next step, so
                        // leave the turn quietly pending (no red error). 'timeout'
                        // → a soft, actionable message.
                        setMessages((prev) => {
                            const next = prev.map((m) =>
                                m.id === assistantId
                                    ? {
                                        ...m,
                                        streaming: false,
                                        reconnecting: undefined,
                                        loadingModel: undefined,
                                        error:
                                            outcome === 'timeout'
                                                ? 'Could not reconnect to the secure enclave. Please try again.'
                                                : undefined
                                    }
                                    : m
                            );
                            persist(next);
                            return next;
                        });
                        break;
                    }

                    // Non-transport app error (or retries exhausted): onError
                    // already painted the message; stop here.
                    break;
                }
            }
        } finally {
            setStreaming(false);
            abortRef.current = null;
            // Any tool invocations that were still in flight when the
            // stream ended (cancellation, network error, etc.) get
            // flipped to an error state so the cards stop spinning and
            // the persisted history reflects what actually happened.
            setMessages((prev) => {
                let changed = false;
                const next = prev.map((m) => {
                    if (m.id !== assistantId || !m.toolInvocations) return m;
                    const list = m.toolInvocations.map((inv) => {
                        if (inv.status !== 'running') return inv;
                        changed = true;
                        const finishedAt = Date.now();
                        return {
                            ...inv,
                            status: 'error' as const,
                            error: 'cancelled',
                            finishedAt,
                            durationMs: finishedAt - inv.startedAt
                        };
                    });
                    return { ...m, toolInvocations: list };
                });
                if (changed) persist(next);
                return next;
            });
        }
    }, [input, streaming, model, instance.endpoint, messages, token, sampling, persist, chatSession, enabledTools, onStreamError]);

    const stop = useCallback(() => abortRef.current?.abort(), []);

    const rateMessage = useCallback(
        (id: string, rating: Rating | null, comment?: string) => {
            setMessages((prev) => {
                const next = prev.map((m) =>
                    m.id === id
                        ? rating === null
                            ? { ...m, rating: undefined, ratingComment: undefined }
                            : { ...m, rating, ratingComment: comment }
                        : m
                );
                persist(next);
                return next;
            });
            const convId = localConvIdRef.current;
            if (rating === null) {
                clearFeedback(id);
            } else if (convId) {
                recordFeedback({
                    messageId: id,
                    conversationId: convId,
                    instanceId: instance.id,
                    rating,
                    comment,
                    createdAt: Date.now()
                });
            }
        },
        [persist, instance.id]
    );

    const transportBanner =
        transport === 'ok' ? null : (
            <TransportBanner transport={transport} onReconnect={onReconnect} />
        );

    const composer = (
        <Composer
            value={input}
            onChange={setInput}
            onSend={() => void send()}
            onStop={stop}
            streaming={streaming}
            instance={instance}
            model={model}
            onModelChange={onModelChange}
            sampling={sampling}
            onSamplingChange={setSampling}
            enabledTools={enabledToolNames}
            onToggleTool={onToggleTool}
            userTools={userTools}
            onToggleUserTool={onToggleUserTool}
            onAddTool={onAddTool}
            onRemoveUserTool={onRemoveUserTool}
            toolPolicy={toolPolicy}
            placeholder={
                model
                    ? `Message ${modelLabel(model)}\u2026`
                    : 'No model loaded for this instance.'
            }
            autoFocus
            disabledReason={disabledReason}
        />
    );

    // Empty / new-chat state — Gemini-style centered hero.
    if (messages.length === 0) {
        return (
            <div className='flex flex-1 flex-col items-center justify-center px-4'>
                <div className='w-full max-w-2xl'>
                    <div className='mb-8 text-center'>
                        {userGreeting && (
                            <p className='text-2xl font-medium text-[var(--color-text-secondary)]'>
                                {userGreeting}
                            </p>
                        )}
                        <h2
                            className='mt-1 text-3xl font-semibold sm:text-4xl'
                            style={{
                                background: 'var(--brand-gradient)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                backgroundClip: 'text'
                            }}
                        >
                            Where should we start?
                        </h2>
                    </div>
                    {onConnect ? (
                        <div className='flex flex-col items-center gap-3'>
                            <button
                                type='button'
                                onClick={onConnect}
                                className='rounded-full px-6 py-2.5 text-sm font-semibold text-[var(--color-navy)] shadow-sm transition-opacity hover:opacity-90'
                                style={{ background: 'var(--brand-gradient)' }}
                            >
                                Connect to start chatting
                            </button>
                            {disabledReason && (
                                <p className='text-xs text-[var(--color-text-secondary)]'>
                                    {disabledReason}
                                </p>
                            )}
                        </div>
                    ) : (
                        <div className='flex flex-col gap-2'>
                            {transportBanner}
                            {composer}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // Active chat state — scrollable transcript + docked composer.
    return (
        <div className='flex flex-1 flex-col'>
            <div ref={scrollRef} className='flex-1 overflow-y-auto px-4 py-6'>
                <div className='mx-auto flex max-w-3xl flex-col gap-6'>
                    {messages.map((m) => (
                        <Message
                            key={m.id}
                            message={m}
                            instanceEndpoint={instance.endpoint}
                            token={token}
                            onShowMeta={() => setMetaFor(m)}
                            onRate={(rating, comment) => rateMessage(m.id, rating, comment)}
                            onBranch={
                                onBranchFromMessage
                                    ? () => onBranchFromMessage(m.id)
                                    : undefined
                            }
                            onConsentDecision={(callId, allowed) => {
                                // Optimistically reflect the decision in
                                // the local card immediately; the SSE
                                // tool_result will fill in real timing
                                // when the server side completes.
                                setMessages((prev) =>
                                    prev.map((mm) => {
                                        if (mm.id !== m.id || !mm.toolInvocations) return mm;
                                        return {
                                            ...mm,
                                            toolInvocations: mm.toolInvocations.map((inv) =>
                                                inv.id === callId
                                                    ? {
                                                        ...inv,
                                                        consent: allowed ? 'allowed' : 'denied'
                                                    }
                                                    : inv
                                            )
                                        };
                                    })
                                );
                            }}
                        />
                    ))}
                </div>
            </div>

            <div className='px-4 pb-5'>
                <div className='mx-auto max-w-3xl'>
                    {transportBanner}
                    {composer}
                </div>
                <p className='mx-auto mt-2 max-w-3xl text-center text-[11px] text-[var(--color-text-muted)]'>
                    Replies are signed by the hardware running the model. Verify
                    any response from the &ldquo;Secure enclaves
                    attestations&rdquo; panel.
                </p>
            </div>

            {metaFor && (
                <MetadataDialog
                    sampling={metaFor.sampling}
                    reproducibility={metaFor.meta}
                    elapsedMs={
                        metaFor.startedAt && metaFor.finishedAt
                            ? metaFor.finishedAt - metaFor.startedAt
                            : undefined
                    }
                    onClose={() => setMetaFor(null)}
                />
            )}
        </div>
    );
}

function Message({
    message,
    instanceEndpoint,
    token,
    onShowMeta,
    onRate,
    onBranch,
    onConsentDecision
}: {
    message: DisplayMessage;
    instanceEndpoint: string;
    token?: string;
    onShowMeta: () => void;
    onRate: (rating: Rating | null, comment?: string) => void;
    onBranch?: () => void;
    onConsentDecision: (callId: string, allowed: boolean) => void;
}) {
    if (message.role === 'user') {
        return (
            <div className='flex justify-end'>
                <div className='max-w-[80%] rounded-2xl rounded-br-sm border border-[var(--color-primary-blue)]/30 bg-[var(--color-surface-2)] px-4 py-2.5 text-sm whitespace-pre-wrap text-[var(--color-text-primary)] shadow-sm'>
                    {message.content}
                </div>
            </div>
        );
    }

    return (
        <div className='flex flex-col gap-2'>
            {message.toolInvocations && message.toolInvocations.length > 0 && (
                <div className='flex flex-col gap-1'>
                    {message.toolInvocations.map((inv) => (
                        <ToolCallCard
                            key={inv.id}
                            invocation={inv}
                            onAllow={() => {
                                void postConsent(instanceEndpoint, inv.id, true, token);
                                onConsentDecision(inv.id, true);
                            }}
                            onDeny={() => {
                                void postConsent(instanceEndpoint, inv.id, false, token);
                                onConsentDecision(inv.id, false);
                            }}
                        />
                    ))}
                </div>
            )}
            {message.content ? (
                <AssistantContent
                    content={message.content}
                    streaming={!!message.streaming}
                />
            ) : message.reconnecting ? (
                <ReconnectingNotice />
            ) : message.loadingModel ? (
                <ModelLoadingNotice info={message.loadingModel} />
            ) : message.streaming ? (
                <PendingAssistant />
            ) : null}
            {message.streaming && message.content && (
                <p className='text-sm text-[var(--color-text-muted)]'>
                    <StreamCursor />
                </p>
            )}
            {message.error && (
                <p className='text-xs text-red-400'>{message.error}</p>
            )}
            {!message.streaming && message.content && (
                <MessageActions
                    message={message}
                    onShowMeta={onShowMeta}
                    onRate={onRate}
                    onBranch={onBranch}
                />
            )}
        </div>
    );
}

function MessageActions({
    message,
    onShowMeta,
    onRate,
    onBranch
}: {
    message: DisplayMessage;
    onShowMeta: () => void;
    onRate: (rating: Rating | null, comment?: string) => void;
    onBranch?: () => void;
}) {
    const [copied, setCopied] = useState(false);
    const [showCommentBox, setShowCommentBox] = useState(false);
    const [commentDraft, setCommentDraft] = useState(message.ratingComment ?? '');
    const copy = async () => {
        try {
            await navigator.clipboard.writeText(message.content);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch {
            /* ignore */
        }
    };

    const elapsed =
        message.finishedAt && message.startedAt
            ? ((message.finishedAt - message.startedAt) / 1000).toFixed(1)
            : null;
    const tokens = approxTokens(message.content);
    const tps =
        elapsed && tokens > 0 ? (tokens / parseFloat(elapsed)).toFixed(1) : null;

    const toggleRating = (next: Rating) => {
        if (message.rating === next) {
            // Un-rate.
            onRate(null);
            setShowCommentBox(false);
            return;
        }
        onRate(next, message.ratingComment);
        if (next === 'down') setShowCommentBox(true);
    };

    return (
        <div className='flex flex-col gap-2'>
            <div className='flex items-center gap-3 text-xs text-[var(--color-text-muted)]'>
                <button
                    type='button'
                    onClick={() => void copy()}
                    className='inline-flex items-center gap-1 hover:text-[var(--color-text-primary)]'
                    title='Copy reply'
                >
                    {copied ? '\u2713 Copied' : 'Copy'}
                </button>
                <button
                    type='button'
                    onClick={onShowMeta}
                    className='inline-flex items-center gap-1 hover:text-[var(--color-text-primary)]'
                    title='View reproducibility metadata'
                >
                    Metadata
                </button>
                {onBranch && (
                    <button
                        type='button'
                        onClick={onBranch}
                        className='inline-flex items-center gap-1 hover:text-[var(--color-text-primary)]'
                        title='Fork this chat from here into a new conversation'
                    >
                        Branch
                    </button>
                )}
                <button
                    type='button'
                    onClick={() => toggleRating('up')}
                    className={`inline-flex items-center gap-1 ${
                        message.rating === 'up'
                            ? 'text-[var(--color-primary-green)]'
                            : 'hover:text-[var(--color-text-primary)]'
                    }`}
                    title='Helpful'
                    aria-pressed={message.rating === 'up'}
                >
                    <ThumbUpIcon /> {message.rating === 'up' ? 'Rated' : 'Good'}
                </button>
                <button
                    type='button'
                    onClick={() => toggleRating('down')}
                    className={`inline-flex items-center gap-1 ${
                        message.rating === 'down'
                            ? 'text-red-400'
                            : 'hover:text-[var(--color-text-primary)]'
                    }`}
                    title='Not helpful'
                    aria-pressed={message.rating === 'down'}
                >
                    <ThumbDownIcon /> {message.rating === 'down' ? 'Rated' : 'Bad'}
                </button>
                {elapsed && (
                    <span>
                        {elapsed}s{tps && ` \u00B7 ~${tps} tok/s`}
                    </span>
                )}
            </div>
            {showCommentBox && message.rating === 'down' && (
                <div className='flex flex-col gap-1.5 rounded-md border border-[var(--color-border-dark)] bg-[var(--color-surface-2)]/40 p-2'>
                    <textarea
                        value={commentDraft}
                        onChange={(e) => setCommentDraft(e.target.value)}
                        placeholder='Optional: what was wrong with this reply? Stays on this device until you leave.'
                        className='min-h-[60px] w-full resize-y rounded-sm border border-[var(--color-border-dark)] bg-transparent p-1.5 text-xs text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary-blue)]/60'
                    />
                    <div className='flex justify-end gap-2'>
                        <button
                            type='button'
                            onClick={() => setShowCommentBox(false)}
                            className='text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
                        >
                            Cancel
                        </button>
                        <button
                            type='button'
                            onClick={() => {
                                onRate('down', commentDraft.trim() || undefined);
                                setShowCommentBox(false);
                            }}
                            className='text-xs font-medium text-[var(--color-primary-blue)] hover:opacity-80'
                        >
                            Save feedback
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

function ThumbUpIcon() {
    return (
        <svg width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
            <path d='M7 10v12' />
            <path d='M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H7V10l4-8a2 2 0 0 1 4 1.88Z' />
        </svg>
    );
}

function ThumbDownIcon() {
    return (
        <svg width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
            <path d='M17 14V2' />
            <path d='M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H17v12l-4 8a2 2 0 0 1-4-1.88Z' />
        </svg>
    );
}

function StreamCursor() {
    return (
        <span className='ml-0.5 inline-block h-3 w-1 animate-pulse bg-current align-middle' />
    );
}

// Pre-first-token affordance. End-to-end latency from “user hits send”
// to the first streamed token can run several seconds (sealed-session
// bootstrap + RA-TLS handshake + GPU prefill). A bare cursor was easy
// to miss; this gives an unmistakable “something is happening” cue.
function PendingAssistant() {
    return (
        <div
            className='flex items-center gap-2 text-sm text-[var(--color-text-secondary)]'
            aria-live='polite'
        >
            <span className='inline-flex items-center gap-1'>
                <Dot delay={0} />
                <Dot delay={150} />
                <Dot delay={300} />
            </span>
            <span
                className='animate-pulse bg-clip-text text-transparent'
                style={{ backgroundImage: 'var(--brand-gradient)' }}
            >
                Analysing…
            </span>
        </div>
    );
}

// Inline notice on the pending turn while the enclave transport recovers
// (VM restarting / sealed session being re-established). The prompt is held
// and re-sent automatically once the channel is healthy, so the user never
// retypes and never sees a raw 502/401.
function ReconnectingNotice() {
    return (
        <div
            className='flex items-center gap-2 text-sm text-[var(--color-text-secondary)]'
            aria-live='polite'
        >
            <svg className='h-3.5 w-3.5 animate-spin' viewBox='0 0 24 24' aria-hidden='true'>
                <circle className='opacity-25' cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='4' fill='none' />
                <path className='opacity-75' fill='currentColor' d='M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4Z' />
            </svg>
            <span>Reconnecting to the secure enclave… your message will be sent automatically.</span>
        </div>
    );
}

// Reconnect banner shown above the composer when the enclave transport is
// not healthy. `reconnecting` (enclave unreachable or session stale, auto-
// recovering) shows a spinner; `stale` (the back-end's measurement changed,
// so the EncAuth voucher is rejected) shows a Reconnect button that routes
// to the in-panel sign-in for a fresh wallet ceremony.
function TransportBanner({
    transport,
    onReconnect
}: {
    transport: 'reconnecting' | 'stale';
    onReconnect?: () => void;
}) {
    if (transport === 'reconnecting') {
        return (
            <div
                className='mb-2 flex items-center gap-2 rounded-lg border border-amber-300/40 bg-amber-50/50 px-3 py-2 text-xs text-amber-800 dark:border-amber-500/20 dark:bg-amber-900/10 dark:text-amber-200'
                aria-live='polite'
            >
                <svg className='h-3.5 w-3.5 animate-spin' viewBox='0 0 24 24' aria-hidden='true'>
                    <circle className='opacity-25' cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='4' fill='none' />
                    <path className='opacity-75' fill='currentColor' d='M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4Z' />
                </svg>
                <span>Reconnecting to the secure enclave…</span>
            </div>
        );
    }
    return (
        <div
            className='mb-2 flex items-center justify-between gap-3 rounded-lg border border-red-300/40 bg-red-50/50 px-3 py-2 text-xs text-red-700 dark:border-red-500/20 dark:bg-red-900/10 dark:text-red-300'
            aria-live='polite'
        >
            <span>
                The secure back-end was updated, so this session can no longer be
                verified. Reconnect to continue.
            </span>
            {onReconnect && (
                <button
                    type='button'
                    onClick={onReconnect}
                    className='shrink-0 rounded-md border border-red-300/60 px-2.5 py-1 font-medium hover:bg-red-100/40 dark:border-red-500/30 dark:hover:bg-red-900/20'
                >
                    Reconnect
                </button>
            )}
        </div>
    );
}

// Inline notice shown while the GPU enclave loads the requested model
// after a cold start. Re-renders every second so the user sees the
// elapsed wall-clock vs. the operator-declared ETA. The chat panel
// polls /healthz in the background and replays the prompt for the
// user as soon as the model is ready.
function ModelLoadingNotice({
    info
}: {
    info: { startedAt: number; etaSeconds?: number };
}) {
    const [now, setNow] = useState(Date.now());
    useEffect(() => {
        const t = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(t);
    }, []);
    const elapsedSec = Math.max(0, Math.round((now - info.startedAt) / 1000));
    const eta = info.etaSeconds;
    const remaining = eta ? Math.max(0, eta - elapsedSec) : null;
    const pct = eta ? Math.min(100, Math.round((elapsedSec / eta) * 100)) : null;
    return (
        <div
            className='flex flex-col gap-2 rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)] p-3 text-sm text-[var(--color-text-secondary)]'
            aria-live='polite'
        >
            <div className='flex items-center gap-2'>
                <span className='inline-flex items-center gap-1'>
                    <Dot delay={0} />
                    <Dot delay={150} />
                    <Dot delay={300} />
                </span>
                <span
                    className='bg-clip-text text-transparent'
                    style={{ backgroundImage: 'var(--brand-gradient)' }}
                >
                    Loading the model into GPU memory…
                </span>
            </div>
            <p className='text-xs'>
                The enclave just booted, so the weights still need to be paged
                in. Your prompt will run automatically as soon as the model is
                ready — no need to resend.
            </p>
            <div className='flex items-center justify-between text-xs tabular-nums'>
                <span>Elapsed: {elapsedSec}s</span>
                {eta != null && (
                    <span>
                        {remaining != null && remaining > 0
                            ? `~${remaining}s remaining`
                            : 'Almost there…'}
                    </span>
                )}
            </div>
            {pct != null && (
                <div className='h-1 w-full overflow-hidden rounded bg-[var(--color-surface-base)]'>
                    <div
                        className='h-full rounded transition-[width] duration-1000 ease-linear'
                        style={{
                            width: `${pct}%`,
                            backgroundImage: 'var(--brand-gradient)'
                        }}
                    />
                </div>
            )}
        </div>
    );
}

function Dot({ delay }: { delay: number }) {
    return (
        <span
            className='inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--color-primary-blue)]'
            style={{ animationDelay: `${delay}ms`, animationDuration: '900ms' }}
            aria-hidden
        />
    );
}

// AssistantContent splits a (possibly streaming) assistant message into
// reasoning blocks and answer markdown. Reasoning blocks are rendered
// in a collapsible ThinkingBlock above the answer text.
//
// While the message is still streaming, we render the markdown from a
// `useDeferredValue` of the content. React 18 schedules the heavy
// react-markdown re-parse at low priority, so the typewriter cursor
// keeps drawing at 60 fps even when the answer body is several KB and
// each new character would otherwise force a fresh markdown parse on
// every animation frame. The markdown lags by at most a couple of
// frames, which is invisible to the user but cuts main-thread cost
// dramatically — this is the actual fix for the “text arrives in
// blocks of 5–10 lines” symptom (the smoother only paces *what we
// already have*; if the renderer drops frames the smoother’s ticks
// pile up and several lines paint at once).
function AssistantContent({
    content,
    streaming
}: {
    content: string;
    streaming: boolean;
}) {
    // While streaming, defer the value used for the (expensive)
    // markdown render. Once the stream finishes, render the final
    // content immediately so the user sees the canonical formatting.
    const deferred = useDeferredValue(content);
    const renderText = streaming ? deferred : content;
    const segments = useMemo(() => splitReasoning(renderText), [renderText]);
    return (
        <div className='flex flex-col gap-2'>
            {segments.map((seg, i) =>
                seg.kind === 'thinking' ? (
                    <ThinkingBlock
                        key={`t${i}`}
                        text={seg.text}
                        streaming={streaming && !seg.closed}
                    />
                ) : (
                    <Markdown key={`a${i}`}>{seg.text}</Markdown>
                )
            )}
        </div>
    );
}

// Approximate token count for display purposes only. vLLM doesn't
// always return usage on streamed responses, so we estimate using
// the rough "1 token ~ 4 characters" rule of thumb. The displayed
// throughput is therefore approximate.
function approxTokens(text: string): number {
    if (!text) return 0;
    return Math.max(1, Math.round(text.length / 4));
}

// POST the user's allow/deny decision back to the inference proxy's
// /v1/agent/confirm/{id} endpoint so the blocked agent loop can
// proceed (or short-circuit with a synthetic 'user_denied' tool
// result). Failures are intentionally swallowed: the loop has its
// own per-call timeout and will surface the error through the
// regular tool_result SSE event.
async function postConsent(
    endpoint: string,
    callId: string,
    allowed: boolean,
    token?: string
): Promise<void> {
    if (!endpoint || !callId) return;
    const url = `${endpoint.replace(/\/$/, '')}/v1/agent/confirm/${encodeURIComponent(callId)}`;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    try {
        await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify({ allowed })
        });
    } catch {
        /* network errors are surfaced via the tool_result stream */
    }
}

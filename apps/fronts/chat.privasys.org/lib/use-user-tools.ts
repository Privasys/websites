'use client';

import { useCallback, useEffect, useState } from 'react';
import type { SealedSession } from '@privasys/auth';
import {
    addUserTool,
    deleteUserTool,
    fetchUserTools,
    setUserToolEnabled,
    type AddUserToolInput,
    type UserTool
} from './chat-service-api';

// useUserTools loads and mutates the signed-in user's persistent MCP tools
// from chat-service over its dedicated sealed session. The list is the source
// of truth across sessions and devices. When there is no sealed session
// (signed out, or no chat-service voucher yet) the hook stays empty and inert
// — the chat still works with the fleet's admin tools.
export interface UserToolsState {
    tools: UserTool[];
    loading: boolean;
    error?: string;
    /** True while an add() is blocked waiting for a wallet push approval. */
    awaitingApproval: boolean;
    add: (input: AddUserToolInput) => Promise<void>;
    remove: (id: string) => Promise<void>;
    setEnabled: (id: string, enabled: boolean) => Promise<void>;
    reload: () => void;
}

export function useUserTools(
    session: SealedSession | null,
    token: string | undefined,
    /** Optional last-chance establisher: when a mutation is attempted with no
     *  sealed session in hand, this (re-)establishes it — a silent voucher
     *  resume, then, if there's no voucher yet, a wallet push approval. The
     *  `onNeedApproval` callback fires when we fall through to the push so the
     *  UI can show "Approve on your phone…". Rejects with `no-push` / `timeout`
     *  / `no-session` so add() can map them to a precise message. */
    ensureSession?: (onNeedApproval?: () => void) => Promise<SealedSession | null>
): UserToolsState {
    const [tools, setTools] = useState<UserTool[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | undefined>();
    const [awaitingApproval, setAwaitingApproval] = useState(false);
    const [nonce, setNonce] = useState(0);
    const ready = !!session && !!token;

    useEffect(() => {
        if (!session || !token) {
            setTools([]);
            return;
        }
        let cancelled = false;
        setLoading(true);
        setError(undefined);
        fetchUserTools(session, token)
            .then((t) => {
                if (!cancelled) setTools(t);
            })
            .catch((e) => {
                if (!cancelled) setError(e?.message ?? 'failed to load tools');
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [session, token, nonce]);

    const reload = useCallback(() => setNonce((n) => n + 1), []);

    const add = useCallback(
        async (input: AddUserToolInput) => {
            if (!token) throw new Error('Sign in to add a tool.');
            // The sealed session to chat-service resumes from a wallet-issued
            // voucher. If it isn't in hand yet, establish it now: a silent
            // resume first, then — if there's no voucher — a wallet PUSH
            // approval (one tap on the phone, no sign-out).
            let s = session;
            if (!s && ensureSession) {
                try {
                    s = await ensureSession(() => setAwaitingApproval(true));
                } catch (e) {
                    const m = (e as Error)?.message ?? '';
                    if (m.includes('no-push')) {
                        throw new Error(
                            'This session was not opened with the Privasys Wallet, so we ' +
                            'can’t send a phone approval. Sign in with the wallet to add tools.'
                        );
                    }
                    if (m.includes('timeout')) {
                        throw new Error(
                            'No approval received. Open the Privasys Wallet on your phone, ' +
                            'approve adding the tools back-end, then try again.'
                        );
                    }
                    throw new Error('Couldn’t verify the tools back-end. Please try again.');
                } finally {
                    setAwaitingApproval(false);
                }
            }
            if (!s) {
                throw new Error(
                    'The tools back-end isn’t verified for this session yet. ' +
                    'Approve it from the Privasys Wallet, then retry.'
                );
            }
            const created = await addUserTool(s, token, input);
            setTools((prev) => [...prev, created]);
        },
        [session, token, ensureSession]
    );

    const remove = useCallback(
        async (id: string) => {
            if (!session || !token) return;
            await deleteUserTool(session, token, id);
            setTools((prev) => prev.filter((t) => t.id !== id));
        },
        [session, token]
    );

    const setEnabled = useCallback(
        async (id: string, enabled: boolean) => {
            if (!session || !token) return;
            setTools((prev) => prev.map((t) => (t.id === id ? { ...t, enabled } : t)));
            const updated = await setUserToolEnabled(session, token, id, enabled);
            setTools((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
        },
        [session, token]
    );

    return { tools, loading: ready && loading, error, awaitingApproval, add, remove, setEnabled, reload };
}

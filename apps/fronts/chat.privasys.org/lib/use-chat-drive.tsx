'use client';

// useChatDrive - owns the chat app's sealed session to the Drive enclave
// and the caller's personal drive (tenant).
//
// Drive is a SEPARATE enclave from the inference instance and the
// chat-service back-end, so it needs its own sealed session (the same
// per-host pattern the shell already uses for chat-service). We resume it
// silently from the EncAuth voucher; when no voucher exists yet we ask the
// wallet to issue one via a push approval (one tap on the phone, no
// sign-out), exactly as `ensureChatSession` does for chat-service.
//
// Everything here is dormant unless NEXT_PUBLIC_DRIVE_APP_HOST is set
// (`driveEnabled()`), mirroring how drive.privasys.org gates on its host.

import { useCallback, useEffect, useRef, useState } from 'react';
import type { SealedSession } from '@privasys/auth';
import { useAuth } from './privasys-auth';
import { driveEnabled, driveHost, ensurePersonalTenant, getMe, type Tenant } from './drive-chat-api';

export type ChatDriveStatus =
    | 'disabled' // no Drive host configured
    | 'signed-out' // not authenticated
    | 'connecting'
    | 'ready'
    | 'error';

export interface ChatDrive {
    enabled: boolean;
    status: ChatDriveStatus;
    error: string | null;
    session: SealedSession | null;
    /** The caller's personal-drive tenant id (null until ready). */
    tenantId: string | null;
    /**
     * Establish the sealed Drive session on demand (for a user-initiated
     * action such as attaching a file): silent voucher resume first, then a
     * wallet push approval if there is no voucher yet. `onNeedApproval` lets
     * the caller show "Approve on your phone..." while we wait. Returns the
     * live session together with the caller's personal-drive tenant id (both
     * needed by an immediate Drive call, before the React state has settled).
     */
    ensureSession: (
        onNeedApproval?: () => void
    ) => Promise<{ session: SealedSession; tenantId: string } | null>;
}

export function useChatDrive(): ChatDrive {
    const { session: authSession, getSealedSession, requestAppVoucher } = useAuth();
    const enabled = driveEnabled();
    const host = driveHost();

    const [status, setStatus] = useState<ChatDriveStatus>(enabled ? 'connecting' : 'disabled');
    const [error, setError] = useState<string | null>(null);
    const [session, setSession] = useState<SealedSession | null>(null);
    const [tenantId, setTenantId] = useState<string | null>(null);
    const bootstrapping = useRef(false);

    const bootstrap = useCallback(async (s: SealedSession): Promise<string> => {
        // Right after a fresh ceremony the sealed channel can need a beat
        // before the first request lands; retry briefly instead of erroring.
        let tenant: Tenant | null = null;
        for (let attempt = 0; ; attempt++) {
            try {
                [, tenant] = await Promise.all([getMe(s), ensurePersonalTenant(s)]);
                break;
            } catch (e) {
                if (attempt >= 2) throw e;
                await new Promise((r) => setTimeout(r, 1200 * (attempt + 1)));
            }
        }
        const tid = tenant?.id ?? '';
        setSession(s);
        setTenantId(tid || null);
        setStatus('ready');
        return tid;
    }, []);

    // Resolve the sealed Drive session whenever the wallet session changes.
    useEffect(() => {
        if (!enabled || !host) {
            setStatus('disabled');
            return;
        }
        if (!authSession) {
            setStatus('signed-out');
            setSession(null);
            setTenantId(null);
            return;
        }
        let cancelled = false;
        setStatus('connecting');
        setError(null);
        void getSealedSession(host)
            .then(async (s) => {
                if (cancelled) return;
                if (!s) {
                    // Signed in, but no live sealed voucher for Drive yet.
                    // ensureSession() requests one on the first Drive action.
                    setStatus('signed-out');
                    return;
                }
                await bootstrap(s);
            })
            .catch((e: unknown) => {
                if (cancelled) return;
                setStatus('error');
                setError(e instanceof Error ? e.message : 'Could not connect to Drive.');
            });
        return () => {
            cancelled = true;
        };
    }, [enabled, host, authSession, getSealedSession, bootstrap]);

    const ensureSession = useCallback(
        async (
            onNeedApproval?: () => void
        ): Promise<{ session: SealedSession; tenantId: string } | null> => {
            if (!enabled || !host || !authSession) return null;
            if (session && tenantId) return { session, tenantId };
            if (bootstrapping.current) return null;
            bootstrapping.current = true;
            try {
                let s = await getSealedSession(host);
                if (!s) {
                    onNeedApproval?.();
                    await requestAppVoucher(host); // throws no-push / timeout / no-session
                    s = await getSealedSession(host);
                }
                if (!s) return null;
                const tid = await bootstrap(s);
                return tid ? { session: s, tenantId: tid } : null;
            } catch (e) {
                setError(e instanceof Error ? e.message : 'Could not connect to Drive.');
                return null;
            } finally {
                bootstrapping.current = false;
            }
        },
        [enabled, host, authSession, session, tenantId, getSealedSession, requestAppVoucher, bootstrap]
    );

    return { enabled, status, error, session, tenantId, ensureSession };
}

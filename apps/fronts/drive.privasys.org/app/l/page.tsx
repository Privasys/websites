'use client';

// Share-link landing page: /l?id=<linkID>#<secret>
//
// The recipient opens this after receiving a link. The whole Drive channel
// is a wallet-attested sealed session, so the visitor signs in first (the
// wallet, or an invitation to install it). Once a sealed session exists we
// resolve the link, then either redeem it (open links grant access
// immediately) or file an access request (restricted links wait for the
// owner). The link secret rides in the URL fragment and never reaches a
// server log.

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { Navbar, Footer } from '@privasys/ui';
import { useDrive } from '~/lib/use-drive';
import {
    downloadFile,
    redeemLink,
    resolveLink,
    type DriveNode,
    type ResolvedLink
} from '~/lib/drive-api';
import { FileViewer, canPreview } from '~/components/file-viewer';
import { formatBytes } from '~/lib/format';
import { FileIcon, FolderIcon, DownloadIcon, LockIcon, ShieldCheck } from '~/components/icons';

const FOOTER_LINKS = [{ label: 'Legal', href: 'https://privasys.org/legal/', external: true }];

function readParams(): { id: string; secret: string } {
    if (typeof window === 'undefined') return { id: '', secret: '' };
    const id = new URLSearchParams(window.location.search).get('id') ?? '';
    const secret = window.location.hash.replace(/^#/, '');
    return { id, secret };
}

export default function LinkPage() {
    return (
        <Suspense fallback={null}>
            <LinkLanding />
        </Suspense>
    );
}

function LinkLanding() {
    const { status, session, name, signInInto } = useDrive();
    const [params] = useState(readParams);
    const [resolved, setResolved] = useState<ResolvedLink | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [redeemState, setRedeemState] = useState<'idle' | 'granted' | 'pending'>('idle');
    const [viewing, setViewing] = useState(false);
    const ceremonyRef = useRef<HTMLDivElement>(null);
    const started = useRef(false);

    // Mount the sign-in ceremony when signed out.
    useEffect(() => {
        if (status !== 'signed-out' || started.current || !ceremonyRef.current) return;
        started.current = true;
        void signInInto(ceremonyRef.current);
    }, [status, signInInto]);

    // Resolve the link once a sealed session is live.
    const resolve = useCallback(async () => {
        if (!session || !params.id || !params.secret) return;
        setError(null);
        try {
            const r = await resolveLink(session, params.id, params.secret);
            setResolved(r);
            if (r.already_granted) setRedeemState('granted');
            else if (r.request_status === 'pending') setRedeemState('pending');
        } catch (e) {
            setError(e instanceof Error ? e.message : 'This link is invalid or has expired.');
        }
    }, [session, params]);

    useEffect(() => {
        void resolve();
    }, [resolve]);

    const act = async () => {
        if (!session || !resolved) return;
        setBusy(true);
        setError(null);
        try {
            const attributes =
                resolved.mode === 'restricted' && name ? { name } : undefined;
            const res = await redeemLink(session, params.id, params.secret, attributes);
            setRedeemState(res.status);
            if (res.status === 'granted') await resolve();
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Could not open this link.');
        } finally {
            setBusy(false);
        }
    };

    const asNode = (r: ResolvedLink): DriveNode => ({
        id: r.node.id,
        tenant_id: r.tenant_id,
        kind: r.node.kind,
        name: r.node.name,
        size_bytes: r.node.size_bytes
    });

    const download = async () => {
        if (!session || !resolved) return;
        setBusy(true);
        try {
            const bytes = await downloadFile(session, resolved.tenant_id, resolved.node.id);
            const blob = new Blob([bytes as BlobPart], { type: 'application/octet-stream' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = resolved.node.name;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Download failed.');
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="flex min-h-screen flex-col" style={{ background: 'var(--drv-surface-2)' }}>
            <Navbar brandSuffix="Drive" fullWidth />

            <main className="flex flex-1 items-center justify-center px-6 pt-14">
                <div className="w-full max-w-md py-12">
                    {!params.id || !params.secret ? (
                        <Card>
                            <p className="text-sm" style={{ color: 'var(--drv-text-muted)' }}>
                                This link is incomplete. Ask the sender for the full link.
                            </p>
                        </Card>
                    ) : status === 'signed-out' ? (
                        <Card>
                            <div className="mb-3 text-center">
                                <div className="text-lg font-semibold">You have been sent a file</div>
                                <div className="mt-1 text-xs" style={{ color: 'var(--drv-text-muted)' }}>
                                    Sign in with the Privasys Wallet, or install it, to open it securely.
                                </div>
                            </div>
                            <div ref={ceremonyRef} className="min-h-[320px] overflow-hidden rounded-xl" />
                        </Card>
                    ) : !resolved ? (
                        <Card>
                            <p className="py-6 text-center text-sm" style={{ color: 'var(--drv-text-muted)' }}>
                                {error ?? 'Opening the link…'}
                            </p>
                        </Card>
                    ) : (
                        <Card>
                            <div className="flex items-center gap-3">
                                {resolved.node.kind === 'folder' ? (
                                    <FolderIcon width={28} height={28} style={{ color: 'var(--drv-accent)' }} />
                                ) : (
                                    <FileIcon width={28} height={28} style={{ color: 'var(--drv-text-muted)' }} />
                                )}
                                <div className="min-w-0 flex-1">
                                    <div className="truncate text-[15px] font-semibold">{resolved.node.name}</div>
                                    <div className="text-xs" style={{ color: 'var(--drv-text-muted)' }}>
                                        {resolved.owner_name ? `Shared by ${resolved.owner_name}` : 'Shared with you'}
                                        {resolved.node.kind === 'file' ? ` · ${formatBytes(resolved.node.size_bytes)}` : ''}
                                    </div>
                                </div>
                            </div>

                            {redeemState === 'granted' ? (
                                <div className="mt-5 flex flex-wrap gap-2">
                                    {resolved.node.kind === 'file' && canPreview(asNode(resolved)) && (
                                        <button onClick={() => setViewing(true)} className="drv-btn-primary flex items-center gap-2 rounded-full px-4 py-2 text-sm">
                                            Open
                                        </button>
                                    )}
                                    {resolved.node.kind === 'file' && (
                                        <button
                                            onClick={() => void download()}
                                            disabled={busy}
                                            className="flex items-center gap-2 rounded-full border px-4 py-2 text-sm disabled:opacity-50"
                                            style={{ borderColor: 'var(--drv-border)' }}
                                        >
                                            <DownloadIcon width={16} height={16} /> Download
                                        </button>
                                    )}
                                </div>
                            ) : redeemState === 'pending' ? (
                                <div className="mt-5 rounded-lg border px-3 py-3 text-sm" style={{ borderColor: 'var(--drv-border)', color: 'var(--drv-text-muted)' }}>
                                    Your request is waiting for the owner to approve it. You can close
                                    this page and come back to the link later.
                                </div>
                            ) : (
                                <div className="mt-5">
                                    {resolved.mode === 'restricted' && (
                                        <p className="mb-3 text-xs" style={{ color: 'var(--drv-text-muted)' }}>
                                            The owner will review your request. You are sharing:{' '}
                                            {(resolved.required_attributes ?? []).join(', ') || 'your details'}.
                                        </p>
                                    )}
                                    <button
                                        onClick={() => void act()}
                                        disabled={busy}
                                        className="drv-btn-primary w-full rounded-full px-4 py-2.5 text-sm disabled:opacity-50"
                                    >
                                        {resolved.mode === 'restricted' ? 'Request access' : 'Open file'}
                                    </button>
                                </div>
                            )}

                            {error && <p className="mt-3 text-center text-sm text-red-500">{error}</p>}

                            <div className="mt-4 flex items-center gap-1.5 text-xs" style={{ color: 'var(--drv-text-muted)' }}>
                                <LockIcon width={13} height={13} /> Sealed end-to-end inside the enclave.
                            </div>
                        </Card>
                    )}

                    <div className="mt-4 flex items-center justify-center gap-1.5 text-xs" style={{ color: 'var(--drv-text-muted)' }}>
                        <ShieldCheck width={13} height={13} /> Attestation-verified confidential computing
                    </div>
                </div>
            </main>

            {viewing && resolved && session && (
                <FileViewer
                    session={session}
                    tenantID={resolved.tenant_id}
                    node={asNode(resolved)}
                    onClose={() => setViewing(false)}
                    onDownload={() => void download()}
                />
            )}

            <Footer
                companyLine="Every file is sealed inside a hardware-protected enclave. Attestation is verified independently, no trust required."
                links={FOOTER_LINKS}
            />
        </div>
    );
}

function Card({ children }: { children: React.ReactNode }) {
    return (
        <div
            className="rounded-2xl border p-5 shadow-sm"
            style={{ background: 'var(--drv-surface)', borderColor: 'var(--drv-border)' }}
        >
            {children}
        </div>
    );
}

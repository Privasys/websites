'use client';

// Share-link landing page: /l?id=<linkID>#<secret>
//
// The recipient opens this after receiving a link. The whole Drive channel
// is a wallet-attested sealed session, so the visitor signs in first (the
// wallet, or an invitation to install it). Once a sealed session exists we
// resolve the link and redeem it immediately: clicking the link,
// authenticating and consenting to the requested attributes IS the request,
// so no extra button stands between the visitor and the content. Open links
// grant on the spot; restricted links file the access request and this page
// polls until the owner decides. The link secret rides in the URL fragment
// and never reaches a server log.

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
import { SharedBrowser } from '~/components/shared-browser';
import { SHARE_ATTRIBUTES } from '~/lib/share-attributes';
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
    const { status, session, name, profile, signInInto } = useDrive();
    const [params] = useState(readParams);
    const [resolved, setResolved] = useState<ResolvedLink | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [state, setState] = useState<'resolving' | 'granted' | 'pending' | 'denied' | 'missing-attrs'>('resolving');
    const [missingAttrs, setMissingAttrs] = useState<string[]>([]);
    const [viewing, setViewing] = useState(false);
    const ceremonyRef = useRef<HTMLDivElement>(null);
    const started = useRef(false);
    const redeemed = useRef(false);

    // Mount the sign-in ceremony when signed out.
    useEffect(() => {
        if (status !== 'signed-out' || started.current || !ceremonyRef.current) return;
        started.current = true;
        void signInInto(ceremonyRef.current);
    }, [status, signInInto]);

    // The attributes the visitor already consented to share at sign-in,
    // matched against what the link requires.
    const presentedAttributes = useCallback(
        (r: ResolvedLink): Record<string, string> | undefined => {
            if (r.mode !== 'restricted') return undefined;
            const available: Record<string, string | undefined> = {
                name: profile?.name || profile?.display_name || name,
                email: profile?.email || profile?.display_email
            };
            const out: Record<string, string> = {};
            for (const key of r.required_attributes ?? []) {
                const v = available[key];
                if (v) out[key] = v;
            }
            return out;
        },
        [profile, name]
    );

    // Resolve, then redeem in the same breath: authenticating with the
    // requested attributes already expressed the visitor's intent.
    const resolveAndRedeem = useCallback(async () => {
        if (!session || !params.id || !params.secret) return;
        setError(null);
        try {
            const r = await resolveLink(session, params.id, params.secret);
            setResolved(r);
            if (r.already_granted) {
                setState('granted');
                if (r.node.kind === 'file' && canPreview(asNode(r))) setViewing(true);
                return;
            }
            if (r.request_status === 'pending') {
                setState('pending');
                return;
            }
            if (redeemed.current) return;
            // Restricted links need every required attribute: without them
            // no request is filed (the server enforces this too) and the
            // visitor is told what to share instead.
            const attrs = presentedAttributes(r);
            if (r.mode === 'restricted') {
                const missing = (r.required_attributes ?? []).filter((k) => !attrs?.[k]);
                if (missing.length > 0) {
                    setMissingAttrs(missing);
                    setState('missing-attrs');
                    return;
                }
            }
            redeemed.current = true;
            const res = await redeemLink(session, params.id, params.secret, attrs);
            if (res.status === 'granted') {
                setState('granted');
                if (r.node.kind === 'file' && canPreview(asNode(r))) setViewing(true);
            } else {
                setState('pending');
            }
        } catch (e) {
            setError(e instanceof Error ? e.message : 'This link is invalid or has expired.');
        }
    }, [session, params, presentedAttributes]);

    useEffect(() => {
        void resolveAndRedeem();
    }, [resolveAndRedeem]);

    // While the owner's decision is pending, poll so approval flips this
    // page to the content without a manual reload.
    useEffect(() => {
        if (state !== 'pending' || !session) return;
        const t = setInterval(async () => {
            try {
                const r = await resolveLink(session, params.id, params.secret);
                if (r.already_granted) {
                    setResolved(r);
                    setState('granted');
                    if (r.node.kind === 'file' && canPreview(asNode(r))) setViewing(true);
                } else if (r.request_status === 'denied') {
                    setState('denied');
                }
            } catch {
                /* keep polling */
            }
        }, 8000);
        return () => clearInterval(t);
    }, [state, session, params]);

    const download = async () => {
        if (!session || !resolved) return;
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
        }
    };

    const grantedFolder = state === 'granted' && resolved?.node.kind === 'folder';

    return (
        <div className="flex min-h-screen flex-col" style={{ background: 'var(--drv-surface-2)' }}>
            <Navbar brandSuffix="Drive" fullWidth />

            <main className="flex flex-1 justify-center px-6 pt-14">
                <div className={`w-full py-10 ${grantedFolder ? 'max-w-3xl' : 'max-w-md self-center'}`}>
                    {!params.id || !params.secret ? (
                        <Card>
                            <p className="text-sm" style={{ color: 'var(--drv-text-muted)' }}>
                                This link is incomplete. Ask the sender for the full link.
                            </p>
                        </Card>
                    ) : status === 'signed-out' ? (
                        <Card>
                            <div className="mb-3 text-center">
                                <div className="text-lg font-semibold">Something was shared with you</div>
                                <div className="mt-1 text-xs" style={{ color: 'var(--drv-text-muted)' }}>
                                    Sign in with the Privasys Wallet, or install it, to open it securely.
                                </div>
                            </div>
                            <div ref={ceremonyRef} className="h-[560px] w-full overflow-hidden rounded-xl" />
                        </Card>
                    ) : !resolved ? (
                        <Card>
                            <p className="py-6 text-center text-sm" style={{ color: 'var(--drv-text-muted)' }}>
                                {error ?? 'Opening the link…'}
                            </p>
                        </Card>
                    ) : grantedFolder ? (
                        <>
                            <div className="mb-4">
                                <div className="text-lg font-semibold">{resolved.node.name}</div>
                                <div className="text-xs" style={{ color: 'var(--drv-text-muted)' }}>
                                    {resolved.owner_name ? `Shared by ${resolved.owner_name}` : 'Shared with you'}
                                    {' · sealed end-to-end inside the enclave'}
                                </div>
                            </div>
                            {session && (
                                <SharedBrowser
                                    session={session}
                                    tenantID={resolved.tenant_id}
                                    rootID={resolved.node.id}
                                    rootName={resolved.node.name}
                                />
                            )}
                        </>
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

                            {state === 'granted' ? (
                                <div className="mt-5 flex flex-wrap gap-2">
                                    {resolved.node.kind === 'file' && canPreview(asNode(resolved)) && (
                                        <button onClick={() => setViewing(true)} className="drv-btn-primary flex items-center gap-2 rounded-full px-4 py-2 text-sm">
                                            Open
                                        </button>
                                    )}
                                    {resolved.node.kind === 'file' && (
                                        <button
                                            onClick={() => void download()}
                                            className="flex items-center gap-2 rounded-full border px-4 py-2 text-sm"
                                            style={{ borderColor: 'var(--drv-border)' }}
                                        >
                                            <DownloadIcon width={16} height={16} /> Download
                                        </button>
                                    )}
                                </div>
                            ) : state === 'denied' ? (
                                <div className="mt-5 rounded-lg border px-3 py-3 text-sm" style={{ borderColor: 'var(--drv-border)', color: 'var(--drv-text-muted)' }}>
                                    The owner declined this request.
                                </div>
                            ) : state === 'missing-attrs' ? (
                                <div className="mt-5 rounded-lg border px-3 py-3 text-sm" style={{ borderColor: 'var(--drv-border)', color: 'var(--drv-text-muted)' }}>
                                    The owner asks visitors to share{' '}
                                    <span style={{ color: 'var(--drv-text)' }}>
                                        {missingAttrs.map(attrLabel).join(', ')}
                                    </span>{' '}
                                    to request access. Share {missingAttrs.length === 1 ? 'it' : 'them'} from
                                    your Privasys Wallet when signing in, then open this link again.
                                </div>
                            ) : (
                                <div className="mt-5 rounded-lg border px-3 py-3 text-sm" style={{ borderColor: 'var(--drv-border)', color: 'var(--drv-text-muted)' }}>
                                    Waiting for the owner to approve your access. This page updates
                                    automatically; you can also come back to the link later.
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
                className="!mt-0"
                companyLine="Every file is sealed inside a hardware-protected enclave. Verify its attestation yourself; you don't have to trust us."
                links={FOOTER_LINKS}
            />
        </div>
    );
}

function attrLabel(key: string): string {
    return SHARE_ATTRIBUTES.find((a) => a.key === key)?.label ?? key;
}

function asNode(r: ResolvedLink): DriveNode {
    return {
        id: r.node.id,
        tenant_id: r.tenant_id,
        kind: r.node.kind,
        name: r.node.name,
        size_bytes: r.node.size_bytes
    };
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

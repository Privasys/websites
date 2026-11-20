'use client';

// An invitation link lands here: who invited you to which account, what the
// Developer Platform is, and how to sign in with the Privasys Wallet. Once
// signed in, joining adds you to the account and opens it.

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '~/lib/privasys-auth';
import { peekInvite, acceptInvite } from '~/lib/api';
import type { InvitePreview, AccountRole } from '~/lib/api';
import { setCurrentAccountId } from '~/lib/current-account';

const ROLE: Record<AccountRole, string> = {
    admin: 'an admin, who manages the team, billing and every app',
    billing: 'a billing member, who sees and manages the account\'s billing',
    member: 'a member, who sees every app in the account and can be given more on any of them'
};

type Phase = 'loading' | 'invalid' | 'ready' | 'joining' | 'joined' | 'error';

export default function InvitePage() {
    const { session, signIn, loading: authLoading } = useAuth();
    const [secret, setSecret] = useState('');
    const [invite, setInvite] = useState<InvitePreview | null>(null);
    const [phase, setPhase] = useState<Phase>('loading');
    const [error, setError] = useState('');
    // Set when the person asked to join before signing in: joining follows
    // the sign-in.
    const wantJoin = useRef(false);

    useEffect(() => {
        const token = new URLSearchParams(window.location.search).get('token') ?? '';
        setSecret(token);
        if (!token) {
            setPhase('invalid');
            return;
        }
        peekInvite(token).then((p) => {
            setInvite(p);
            setPhase(p ? 'ready' : 'invalid');
        }).catch(() => setPhase('invalid'));
    }, []);

    async function join() {
        if (!session?.accessToken) {
            wantJoin.current = true;
            try {
                await signIn();
            } catch {
                wantJoin.current = false;
            }
            return;
        }
        setPhase('joining');
        setError('');
        try {
            const { account } = await acceptInvite(session.accessToken, secret);
            setCurrentAccountId(account.kind === 'org' ? account.id : null);
            setPhase('joined');
            window.location.href = '/dashboard/';
        } catch (e) {
            setError(e instanceof Error ? e.message : 'The invitation could not be accepted.');
            setPhase('error');
        }
    }

    // After signing in from this page, carry on and join.
    useEffect(() => {
        if (session?.accessToken && wantJoin.current && phase === 'ready') {
            wantJoin.current = false;
            join();
        }
        // join reads the latest session; running it once per sign-in is the intent.
    }, [session?.accessToken, phase]);

    const card = 'p-6 sm:p-8 rounded-2xl border border-black/10 dark:border-white/10';

    return (
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
            {phase === 'loading' && <div className="text-sm text-black/50 dark:text-white/50">Opening your invitation…</div>}

            {phase === 'invalid' && (
                <div className={card}>
                    <h1 className="text-2xl font-semibold">This invitation can&apos;t be used</h1>
                    <p className="mt-3 text-sm text-black/60 dark:text-white/60">
                        It may have been used already, withdrawn, or it has expired: invitations last seven days.
                        Ask the person who invited you to send it again.
                    </p>
                </div>
            )}

            {invite && phase !== 'invalid' && phase !== 'loading' && (
                <>
                    <div className={card}>
                        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Join {invite.account_name}</h1>
                        <p className="mt-3 text-[15px] leading-relaxed text-black/70 dark:text-white/70">
                            {invite.invited_by_name || 'A colleague'} invited you to the <strong>{invite.account_name}</strong> account
                            on the Privasys Developer Platform, as {ROLE[invite.role]}.
                        </p>
                        <p className="mt-2 text-xs text-black/40 dark:text-white/40">
                            Sent to {invite.email}. The link works once and expires on {new Date(invite.expires_at).toLocaleDateString()}.
                        </p>

                        {error && <div className="mt-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-sm text-red-700 dark:text-red-300">{error}</div>}

                        <div className="mt-6 flex flex-wrap items-center gap-3">
                            <button
                                onClick={join}
                                disabled={authLoading || phase === 'joining' || phase === 'joined'}
                                className="px-5 py-2.5 text-sm font-medium rounded-lg bg-black text-white dark:bg-white dark:text-black hover:opacity-80 transition-opacity disabled:opacity-50"
                            >
                                {phase === 'joining' || phase === 'joined'
                                    ? 'Joining…'
                                    : session ? `Join ${invite.account_name}` : 'Sign in with the Privasys Wallet to join'}
                            </button>
                            {session && <span className="text-xs text-black/50 dark:text-white/50">You are signed in.</span>}
                        </div>
                    </div>

                    <div className="mt-8 grid gap-6 sm:grid-cols-2">
                        <div>
                            <h2 className="text-sm font-semibold">What is the Developer Platform?</h2>
                            <p className="mt-2 text-sm leading-relaxed text-black/60 dark:text-white/60">
                                Privasys runs applications inside confidential computing hardware, so their code and data stay
                                protected even from the machines that run them, and anyone can check exactly what is running. The
                                Developer Platform is where a team deploys those apps, watches their status, takes support requests
                                and manages who has access.
                            </p>
                        </div>
                        <div>
                            <h2 className="text-sm font-semibold">Signing in with the Privasys Wallet</h2>
                            <p className="mt-2 text-sm leading-relaxed text-black/60 dark:text-white/60">
                                There is no password: your identity lives on your phone.
                            </p>
                            <ol className="mt-2 list-decimal pl-5 space-y-1 text-sm text-black/60 dark:text-white/60">
                                <li>
                                    Install the wallet from the{' '}
                                    <a className="underline" href="https://apps.apple.com/app/privasys-wallet/id6761209489" target="_blank" rel="noreferrer">App Store</a>
                                    {' '}or{' '}
                                    <a className="underline" href="https://play.google.com/store/apps/details?id=org.privasys.wallet" target="_blank" rel="noreferrer">Google Play</a>,
                                    and create your identity.
                                </li>
                                <li>Choose the button above.</li>
                                <li>Scan the code with the wallet, or approve the request on your phone.</li>
                            </ol>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

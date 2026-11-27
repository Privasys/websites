'use client';

import type { ReactNode } from 'react';
import type { AuthFrameConfig } from '@privasys/auth';
import { chatServiceHost } from './chat-service-api';
import { driveHost } from './drive-chat-api';
import { PrivasysAuthProvider } from './privasys-auth';

// The AuthFrame for chat.privasys.org / chat.test.privasys.org, one per page.
//
// Reuses the shared `privasys-platform` OIDC client on privasys.id. When chat
// gets its own backend audience we'll switch this to a `privasys-chat` client.

// Chat's pitch for the SDK gate's left panel (page presentation). The SDK
// styles it; strings only.
const CHAT_PITCH = {
    title: 'Your conversations, sealed.',
    description:
        'Privasys Chat runs its AI model inside a hardware-protected enclave. ' +
        'The operator can never read your prompts or replies, and you can ' +
        'verify it yourself by remote attestation.',
    bullets: [
        'Sealed browser-to-enclave transport. The gateway only sees ciphertext.',
        'Chat history stays on this device. The platform stores none of it.',
        'No passwords. Sign in with the Privasys Wallet on your phone.',
        'Attestation-verified confidential computing. Verify it yourself, no need to trust the operator.'
    ]
};

// The pitch on a shared conversation's landing page.
const SHARE_PITCH = {
    title: 'A conversation was shared with you.',
    description:
        'Sign in with your Privasys Wallet to read it. Shared conversations are ' +
        'read-only; you can fork one into your own drive to carry it on. The link ' +
        'secret stays in your browser and is never sent to a server.',
    bullets: [
        'Sealed browser-to-enclave transport. The gateway only sees ciphertext.',
        'Read-only: the owner’s copy is never changed.',
        'Fork any shared conversation into your own private drive.'
    ]
};

/** The frame's configuration, read once when the page first needs it: the
 *  gate's pitch follows the page the person landed on. */
function sdkConfig(): AuthFrameConfig {
    const shared = window.location.pathname.startsWith('/shared/');
    return {
        clientId: process.env.NEXT_PUBLIC_AUTH_CLIENT_ID ?? 'privasys-platform',
        appName: 'Privasys Chat',
        authOrigin: process.env.NEXT_PUBLIC_IDP_ORIGIN ?? 'https://privasys.id',
        brokerUrl: process.env.NEXT_PUBLIC_BROKER_URL ?? 'wss://relay.privasys.org/relay',
        scope: ['openid', 'email', 'profile', 'offline_access'],
        presentation: 'page',
        pitch: shared ? SHARE_PITCH : CHAT_PITCH,
        app: {
            displayName: 'Privasys Chat',
            logoUrl: `${window.location.origin}/favicon/privasys-logo.mini.svg`
        },
        // Chat's OWN transport constraint (not an SDK default): its instances
        // are reachable only over the wallet-attested channel. A shared
        // conversation's visitor may sign in any way.
        ...(shared ? {} : { methods: ['wallet'] as const }),
        // One tap at sign-in also approves the back-ends every page uses, so
        // their channels open without asking again.
        apps: [chatServiceHost(), driveHost()].filter(Boolean)
    };
}

export function AuthProvider({ children }: { children: ReactNode }) {
    return <PrivasysAuthProvider config={sdkConfig}>{children}</PrivasysAuthProvider>;
}

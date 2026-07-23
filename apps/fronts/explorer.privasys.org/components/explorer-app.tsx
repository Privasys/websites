// Top-level explorer state machine: the connect screen (with the file-hash
// tile) until an app is connected, then the connected view (header + tabs).
// Replaces the legacy explorer.js body.classList `connected` toggle.

'use client';

import { useEffect, useState } from 'react';
import type { ConnectionConfig } from '~/lib/config';
import { connectionFromParams } from '~/lib/config';
import { useFido2Auth } from '~/components/use-fido2-auth';
import { useExplorerAuth } from '~/components/explorer-auth-context';
import { ConnectScreen } from '~/components/connect-screen';
import { ConnectedView } from '~/components/connected-view';

export function ExplorerApp() {
    const [connection, setConnection] = useState<ConnectionConfig | null>(null);
    const [fido2, fido2Actions] = useFido2Auth(connection);
    const { setNav, setAuthOpen } = useExplorerAuth();

    // Publish the connected app's auth state to the top navigation (the
    // Navbar's trailing account control lives outside this subtree).
    useEffect(() => {
        setNav({
            connected: !!connection,
            authed: fido2.status === 'complete' && !!fido2.token,
            signingIn: fido2.signingIn,
            signOut: fido2Actions.signOut
        });
        return () => setNav(null);
    }, [connection, fido2.status, fido2.token, fido2.signingIn, fido2Actions.signOut, setNav]);

    // Deep link: /?app=<name>&env=<production|development> auto-connects and
    // lands straight on Remote Attestation. Runs once after mount (client-only,
    // since the page is statically pre-rendered).
    useEffect(() => {
        const fromUrl = connectionFromParams(new URLSearchParams(window.location.search));
        if (fromUrl) setConnection((prev) => prev ?? fromUrl);
    }, []);

    if (!connection) {
        return <ConnectScreen onConnect={setConnection} />;
    }

    return (
        <ConnectedView
            connection={connection}
            fido2={fido2}
            fido2Actions={fido2Actions}
            onDisconnect={() => { setConnection(null); setAuthOpen(false); }}
        />
    );
}

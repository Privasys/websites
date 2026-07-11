// Top-level explorer state machine: the connect screen (with the file-hash
// tile) until an app is connected, then the connected view (header + tabs).
// Replaces the legacy explorer.js body.classList `connected` toggle.

'use client';

import { useState } from 'react';
import type { ConnectionConfig } from '~/lib/config';
import { useFido2Auth } from '~/components/use-fido2-auth';
import { ConnectScreen } from '~/components/connect-screen';
import { ConnectedView } from '~/components/connected-view';

export function ExplorerApp() {
    const [connection, setConnection] = useState<ConnectionConfig | null>(null);
    const [fido2, fido2Actions] = useFido2Auth(connection);

    if (!connection) {
        return <ConnectScreen onConnect={setConnection} />;
    }

    return (
        <ConnectedView
            connection={connection}
            fido2={fido2}
            fido2Actions={fido2Actions}
            onDisconnect={() => setConnection(null)}
        />
    );
}

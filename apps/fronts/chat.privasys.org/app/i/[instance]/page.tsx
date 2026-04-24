'use client';

import { use, useEffect, useState } from 'react';
import type { Instance } from '~/lib/types';
import { fetchInstance, InstanceNotFoundError, pickInitialModel } from '~/lib/instance-api';
import { ChatShell } from '~/components/chat-shell';

// chat.privasys.org/i/<instance> per the URL contract.
// `instance` is either an opaque 64-bit hex id (e.g. b1a2c3d4e5f60718)
// or a human alias (e.g. 'demo'). The boot sequence (per ai-plan.md):
//   1. Fetch the instance metadata from management-service.
//   2. (If auth.required) prompt sign-in via privasys-auth SDK.
//   3. Connect to instance.endpoint over RA-TLS, verify quote.
//   4. Render the chat shell.
//
// This first cut implements step 1 + step 4 placeholder. Auth and the
// streaming chat panel land in follow-up commits.
export default function InstancePage({ params }: { params: Promise<{ instance: string }> }) {
    const { instance: instanceId } = use(params);
    const [instance, setInstance] = useState<Instance | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const ctrl = new AbortController();
        fetchInstance(instanceId, ctrl.signal)
            .then(setInstance)
            .catch((e: unknown) => {
                if ((e as { name?: string })?.name === 'AbortError') return;
                if (e instanceof InstanceNotFoundError) {
                    setError(`No chat instance named "${instanceId}".`);
                } else {
                    setError(e instanceof Error ? e.message : 'Failed to load instance.');
                }
            });
        return () => ctrl.abort();
    }, [instanceId]);

    if (error) {
        return (
            <main className="mx-auto max-w-2xl px-6 py-16">
                <h1 className="text-2xl font-semibold">Instance unavailable</h1>
                <p className="mt-4 text-zinc-400">{error}</p>
            </main>
        );
    }

    if (!instance) {
        return (
            <main className="mx-auto max-w-2xl px-6 py-16">
                <p className="text-zinc-400">Loading {instanceId}...</p>
            </main>
        );
    }

    return <ChatShell instance={instance} initialModel={pickInitialModel(instance)} />;
}

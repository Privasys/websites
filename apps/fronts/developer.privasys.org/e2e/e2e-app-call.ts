/**
 * Direct app calls for e2e suites — the mgmt `/apps/{id}/rpc/{fn}` relay is
 * being retired (direct-sealed-app-calls plan §4b), so tests call the enclave
 * the way real clients do.
 *
 * Transport: `privasys apps call` (CLI ≥ v0.35.0) — RA-TLS direct to the
 * enclave with local attestation verification, the suite's platform token
 * presented to the app (`--token`), container endpoints resolved from the
 * manifest, wasm dispatched through the mini's typed `/rpc/<app>/<fn>` shim.
 * A plain HTTPS POST to the app's public hostname does NOT work: the gateway
 * terminates that leg and the enclave refuses plaintext app traffic on it
 * (`sealed-transport-required`) — only sealed sessions and RA-TLS clients
 * reach the app, and the CLI is the RA-TLS client.
 */
import { execFile } from 'node:child_process';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://api-test.developer.privasys.org';

/**
 * Invoke a tool on the app's enclave directly. Returns { status, body } like
 * the old relay helper so call sites keep their assertions: `status` is the
 * app's HTTP status (200 on success, the refused status on 4xx/5xx), `body`
 * the parsed JSON response (or { raw } when not JSON).
 */
export function appCall(
    token: string,
    appId: string,
    fn: string,
    params: unknown,
    opts?: { timeout?: number }
): Promise<{ status: number; body: Record<string, unknown> }> {
    const args = [
        'apps', 'call', appId, fn,
        '--data', JSON.stringify(params ?? {}),
        '--token', token
    ];
    return new Promise((resolve, reject) => {
        execFile(
            process.platform === 'win32' ? 'privasys.exe' : 'privasys',
            args,
            {
                timeout: opts?.timeout ?? 30_000,
                maxBuffer: 32 * 1024 * 1024,
                env: { ...process.env, PRIVASYS_ENDPOINT: API }
            },
            (err, stdout, stderr) => {
                let body: Record<string, unknown>;
                try {
                    body = JSON.parse(stdout);
                } catch {
                    body = { raw: stdout };
                }
                if (!err) return resolve({ status: 200, body });
                // Non-2xx surfaces as "app returned status NNN" with the body
                // already streamed to stdout; anything else (enclave
                // unreachable, attestation failure) is a transport error the
                // test should see as a rejection.
                const m = /app returned status (\d+)/.exec(`${stderr}\n${err.message}`);
                if (m) return resolve({ status: Number(m[1]), body });
                reject(new Error(`apps call ${fn} failed: ${stderr || err.message}`));
            }
        );
    });
}

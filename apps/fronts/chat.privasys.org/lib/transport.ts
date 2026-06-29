// Shared classification for chat-stream failures.
//
// A "transport" error means the end-to-end enclave channel is broken — the
// gateway can't reach the VM, or our sealed session was rejected — as opposed
// to an application-level error we should just show on the message. Transport
// errors drive the reconnect flow (banner + auto-retry); app errors don't.
//
// Patterns:
//   502/503/504 + "bad gateway"/"unreachable" = VM down or restarting;
//   401 = the enclave no longer knows our sealed session (after a restart the
//         SDK auto-rebinds same-measurement sessions, so a 401 reaching the UI
//         means the voucher was rejected — measurement changed or, until the
//         enc_pub-stability fix lands fleet-wide, a plain restart);
//   "fetch failed"/"Failed to fetch"/NetworkError/"load failed" = network.
export function isTransportError(message: string): boolean {
    if (/\b(50[234])\b|bad gateway|unreachable|sealed stream failed|failed to fetch|fetch failed|networkerror|load failed/i.test(message)) {
        return true;
    }
    return /\b401\b/.test(message);
}

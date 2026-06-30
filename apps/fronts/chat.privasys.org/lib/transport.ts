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
    // An enclave that is reachable but still WARMING UP is not a broken
    // transport: after a VM restart the model cold-loads for several minutes and
    // returns 503 with an app-level body, and the configure-then-freeze gate
    // returns "awaiting initial configuration". These have their own friendlier
    // UI (model-loading notice / starting banner) and must not trigger the
    // reconnect flow, which would show a scary "enclave unreachable" state.
    if (/model is loading|no model loaded|model load failed|awaiting initial configuration/i.test(message)) {
        return false;
    }
    if (/\b(50[234])\b|bad gateway|unreachable|sealed stream failed|failed to fetch|fetch failed|networkerror|load failed/i.test(message)) {
        return true;
    }
    // No sealed session yet (e.g. after the app was re-created and the old
    // session is dead): route into the reconnect flow, which re-establishes
    // the sealed transport or, failing that, prompts a fresh sign-in — never
    // a dead-end "sign in" string the user can't act on inline.
    if (/secure session required|sign in to establish/i.test(message)) {
        return true;
    }
    return /\b401\b/.test(message);
}

// Shared attestation types.
//
// These mirror the JSON shape returned by management-service
// `GET /api/v1/apps/{id}/attest` and consumed by:
//   * developer.privasys.org dashboard "Attestation" tab,
//   * explorer.privasys.org (once ported to Next.js),
//   * chat.privasys.org info drawer.
//
// Source of truth: platform/management-service/handlers.go AttestApp.
// Keep in sync; the developer-portal copy in
// `apps/fronts/developer.privasys.org/lib/types.ts` will be replaced
// with re-exports from this lib in a follow-up.

export interface AttestationCertificate {
    subject: string;
    issuer: string;
    serial_number: string;
    not_before: string;
    not_after: string;
    signature_algorithm: string;
    public_key_sha256: string;
}

export interface AttestationQuote {
    type: string;
    oid: string;
    is_mock: boolean;
    version?: number;
    report_data?: string;
    raw_base64?: string;
    mr_enclave?: string;
    mr_signer?: string;
    mr_td?: string;
    rtmr0?: string;
    rtmr1?: string;
    rtmr2?: string;
    rtmr3?: string;
    format?: string;
}

export interface AttestationExtension {
    oid: string;
    label: string;
    value_hex: string;
}

export interface AttestationTLS {
    version: string;
    cipher_suite: string;
}

export interface EventLogDigest {
    pcr: number;
    event_type: number;
    digest: string;       // SHA-384 hex
    data_text?: string;   // Human-readable when decodable
}

export interface AppEvent {
    timestamp: string;
    pcr: number;
    digest_sha384: string;
    digest_sha256: string;
    type: string;        // 'container_load' | 'container_unload'
    description: string;
}

export interface AttestationResult {
    certificate: AttestationCertificate;
    pem: string;
    quote: AttestationQuote | null;
    extensions: AttestationExtension[];
    tls: AttestationTLS;
    // Per-workload (SNI) certificate data
    app_extensions?: AttestationExtension[];
    app_pem?: string;
    app_quote?: AttestationQuote | null;
    // Challenge mode
    challenge_mode: boolean;
    challenge?: string;
    // Stored CWASM hash for verification against APP_CODE_HASH_OID (3.2)
    cwasm_hash?: string;
    // TCG2 event log for RTMR replay verification (TDX only)
    event_log_events?: EventLogDigest[];
    event_log_source?: string;
    // Application-level RTMR[3] events from the enclave manager
    app_events?: AppEvent[];
}

// Result of POST /api/v1/verify-quote (attestation-server proxy).
export interface QuoteVerifyResult {
    success: boolean;
    status: string;
    teeType?: string;
    mrenclave?: string;
    mrsigner?: string;
    mrtd?: string;
    isvProdId?: number;
    isvSvn?: number;
    tcbDate?: string;
    advisoryIds?: string[];
    message?: string;
    error?: string;
}

// Well-known Privasys OIDs (subset surfaced by the proxy / manager).
export const PRIVASYS_OID = {
    QUOTE: '1.3.6.1.4.1.65230.3.0',
    APP_CODE_HASH: '1.3.6.1.4.1.65230.3.2',
    EVENT_LOG: '1.3.6.1.4.1.65230.3.3',
    APP_EVENTS: '1.3.6.1.4.1.65230.3.4',
    MODEL_DIGEST: '1.3.6.1.4.1.65230.3.5',
    MULTIMODAL_DIGEST: '1.3.6.1.4.1.65230.3.6',
} as const;

// OIDs whose value bytes are UTF-8 strings, not raw hashes.
export const TEXT_OIDS: ReadonlySet<string> = new Set([
    PRIVASYS_OID.EVENT_LOG,
    PRIVASYS_OID.APP_EVENTS,
]);

// Optional expected values that the consumer can supply so the
// attestation view can render a green/red verification badge next
// to the matching workload extension. All values are lowercase hex
// strings; comparisons are case-insensitive.
export interface AttestationExpectations {
    /** Expected APP_CODE_HASH (OID 3.2). For container apps this is the
     *  registry image digest (sha256 hex without the algorithm prefix).
     *  For WASM apps this is the CWASM module SHA-256. */
    workloadImageDigest?: string;
    /** Expected MODEL_DIGEST (OID 3.5) - SHA-256 of the active AI model. */
    modelDigest?: string;
    /** Expected MULTIMODAL_DIGEST (OID 3.6). */
    multimodalDigest?: string;
    /** Optional friendly labels shown in the verification badge.
     *  Defaults to a generic "Matches expected value". */
    labels?: {
        workloadImageDigest?: string;
        modelDigest?: string;
        multimodalDigest?: string;
    };
}

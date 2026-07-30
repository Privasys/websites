// Manifest reading: tool -> endpoint, schema defaults, and binary fields.
//
// These rules used to live inside the mgmt proxy. They are LOAD-BEARING, not
// conveniences — confidential-ai once shipped a silently-wrong context window
// because a caller omitted a field and nothing applied the manifest default.
// Moving the call direct to the enclave means moving these with it.

/** Minimal shape of the parts of an app manifest a call needs. */
export interface AppManifestTool {
    endpoint?: string;
    inputSchema?: JsonSchema;
}

export interface AppManifest {
    configure?: AppManifestTool & { description?: string };
    tools?: Record<string, AppManifestTool>;
}

export interface JsonSchema {
    type?: string;
    properties?: Record<string, JsonSchemaProp>;
    required?: string[];
}

export interface JsonSchemaProp {
    'type'?: string;
    'description'?: string;
    'default'?: unknown;
    'enum'?: unknown[];
    /** JSON Schema 2020-12: how the string is encoded, e.g. "base64". */
    'contentEncoding'?: string;
    /**
     * JSON Schema 2020-12: what the decoded bytes are, e.g.
     * "application/pkcs7-mime". Its presence is the cue to render a FILE
     * PICKER rather than a text box: these fields carry binary payloads no
     * human types in, and the wire format (a base64 string) is unchanged, so
     * the CLI, MCP and agents are untouched.
     */
    'contentMediaType'?: string;
    'x-privasys'?: {
        label?: string;
        help?: string;
        /** Comma-separated file-picker filter, e.g. ".ml,.p7b". */
        accept?: string;
        secret?: boolean;
    };
}

/** True when the field should be filled from a file rather than typed. */
export function isBinaryField(prop: JsonSchemaProp | undefined): boolean {
    return !!prop?.contentMediaType;
}

/** File-picker filter for a binary field ('' when the manifest gives none). */
export function acceptFor(prop: JsonSchemaProp | undefined): string {
    return prop?.['x-privasys']?.accept ?? '';
}

/**
 * Resolve a tool name to the app's HTTP path, mirroring what the mgmt proxy
 * did: the manifest's endpoint when it declares one, else `/<tool>`.
 */
export function endpointFor(manifest: AppManifest | null | undefined, tool: string): string {
    if (manifest) {
        if (tool === 'configure' && manifest.configure?.endpoint) return manifest.configure.endpoint;
        const t = manifest.tools?.[tool];
        if (t?.endpoint) return t.endpoint;
    }
    return `/${tool}`;
}

/** The input schema a tool declares, if any. */
export function schemaFor(manifest: AppManifest | null | undefined, tool: string): JsonSchema | undefined {
    if (!manifest) return undefined;
    if (tool === 'configure') return manifest.configure?.inputSchema;
    return manifest.tools?.[tool]?.inputSchema;
}

/**
 * Fill in manifest defaults for fields the caller omitted, leaving anything
 * explicitly provided alone (including an explicit empty string or null — the
 * caller meant it). Mirrors mgmt's applyConfigureDefaults so a direct call and
 * a proxied one configure the app identically.
 */
export function applyDefaults(body: unknown, schema: JsonSchema | undefined): unknown {
    if (!schema?.properties) return body;
    if (body !== undefined && body !== null && (typeof body !== 'object' || Array.isArray(body))) {
        return body; // not a JSON object — not ours to merge into
    }
    const provided = { ...(body as Record<string, unknown> | null ?? {}) };
    for (const [name, prop] of Object.entries(schema.properties)) {
        if (prop?.default === undefined) continue;
        if (Object.prototype.hasOwnProperty.call(provided, name)) continue;
        provided[name] = prop.default;
    }
    return provided;
}

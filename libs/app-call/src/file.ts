// File → field-value helpers for binary manifest fields (contentMediaType).
//
// A binary field still travels as a base64 STRING in the JSON body — the same
// wire format the CLI, MCP and agents send — so "file support" is purely a
// reading concern: turn the picked file into that string, safely. Kept
// framework-free so every front (portal, explorer, future adopters) renders
// its own picker and shares only this logic.

/**
 * Ceiling for a file-sourced field. There is no proxy cap on the sealed path
 * any more, but encoding an accidental multi-hundred-MB pick would still hang
 * the tab; apps wanting more should take a dedicated binary body instead.
 */
export const MAX_FILE_FIELD_BYTES = 32 * 1024 * 1024;

/** A file could not become a field value (empty, oversized, unreadable). */
export class FileFieldError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'FileFieldError';
    }
}

/**
 * Read a picked file and return the base64 of its raw bytes — the value a
 * `contentEncoding: "base64"` field carries on the wire.
 */
export async function fileToBase64(file: Blob): Promise<string> {
    if (file.size === 0) throw new FileFieldError('the selected file is empty');
    if (file.size > MAX_FILE_FIELD_BYTES) {
        throw new FileFieldError(
            `file is ${formatBytes(file.size)}; the limit for a file field is ${formatBytes(MAX_FILE_FIELD_BYTES)}`);
    }
    const buf = new Uint8Array(await file.arrayBuffer());
    let bin = '';
    const CHUNK = 0x8000; // keep String.fromCharCode off the argument limit
    for (let i = 0; i < buf.length; i += CHUNK) {
        bin += String.fromCharCode(...buf.subarray(i, i + CHUNK));
    }
    return btoa(bin);
}

/** Human-readable size, for showing what was picked. */
export function formatBytes(n: number): string {
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
    return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

/** Approximate decoded size of a base64 string (for pre-filled values). */
export function base64Bytes(b64: string): number {
    return Math.floor((b64.length * 3) / 4);
}

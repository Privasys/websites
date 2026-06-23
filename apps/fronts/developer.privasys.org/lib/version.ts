import type { AppVersion } from './types';

// Shared version label (the enclave-upgrade plan, D): "<semver> · <src>:<short> · <date>",
// e.g. "v1.2.3 · git:a1b2c3d · 23 Jun 2026". Mirrors the CLI formatter so the
// portal and CLI render versions identically. Falls back gracefully.

function shortHash(h: string): string {
    const s = h.replace(/^sha256:/, '');
    return s.length > 7 ? s.slice(0, 7) : s;
}

function shortImageRef(img: string): string {
    const at = img.indexOf('@sha256:');
    if (at >= 0) return shortHash(img.slice(at + '@sha256:'.length));
    // No digest: show the tag (the ':' after the last path '/', so host:port is ignored).
    const colon = img.lastIndexOf(':');
    if (colon >= 0 && colon > img.lastIndexOf('/')) return img.slice(colon + 1);
    return img;
}

function versionSrcHash(v: AppVersion): [string, string] {
    if (v.github_commit) return ['git', shortHash(v.github_commit)];
    const img = v.container_image ?? '';
    if (img.startsWith('cloud-image:')) {
        const segs = img.split(':');
        return ['img', segs[segs.length - 1]];
    }
    if (img) return ['pkg', shortImageRef(img)];
    if (v.cwasm_hash) return ['wasm', shortHash(v.cwasm_hash)];
    return ['', ''];
}

function shortDate(s?: string): string {
    if (!s) return '';
    const t = new Date(s);
    if (isNaN(t.getTime())) return '';
    return t.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function versionLabel(v: AppVersion): string {
    const sv = v.semver || (v.version_number ? `v${v.version_number}` : '');
    const [src, hash] = versionSrcHash(v);
    const parts: string[] = [];
    if (sv) parts.push(sv);
    if (src && hash) parts.push(`${src}:${hash}`);
    const d = shortDate(v.created_at);
    if (d) parts.push(d);
    return parts.join(' · ');
}

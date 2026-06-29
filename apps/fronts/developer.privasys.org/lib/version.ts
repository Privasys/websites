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

// digest12 is the first 12 hex chars of an OCI digest (sha256[:12]), matching
// the cloud-image disk naming convention image-<name>-<channel>-<digest12>.
function digest12(d: string): string {
    const s = d.replace(/^sha256:/, '');
    return s.length > 12 ? s.slice(0, 12) : s;
}

function versionSrcHash(v: AppVersion, cloudDigest?: string): [string, string] {
    if (v.github_commit) return ['git', shortHash(v.github_commit)];
    const img = v.container_image ?? '';
    if (img.startsWith('cloud-image:')) {
        const segs = img.split(':');
        const channel = segs[segs.length - 1];
        // Show the resolved image digest with the channel so the label reflects
        // the actual image (image-<name>-<channel>-<digest12>), not just "prod".
        return ['img', cloudDigest ? `${channel}@${digest12(cloudDigest)}` : channel];
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

// parseSemverParts accepts "v1.2.3" or "1.2.3" (case-insensitive leading v) and
// returns [major, minor, patch], or null if it is not a strict 3-part semver.
// Mirrors the Go parseSemver so the portal orders versions like the server.
export function parseSemverParts(s: string): [number, number, number] | null {
    const raw = s.trim().replace(/^v/i, '');
    const parts = raw.split('.');
    if (parts.length !== 3) return null;
    const nums = parts.map(p => Number(p));
    if (nums.some(n => !Number.isInteger(n) || n < 0)) return null;
    return [nums[0], nums[1], nums[2]];
}

// cmpSemver returns >0 if a sorts after b, <0 before, 0 equal.
export function cmpSemver(a: string, b: string): number {
    const pa = parseSemverParts(a);
    const pb = parseSemverParts(b);
    if (pa && pb) {
        for (let i = 0; i < 3; i++) if (pa[i] !== pb[i]) return pa[i] - pb[i];
        return 0;
    }
    if (pa) return 1;
    if (pb) return -1;
    return a < b ? -1 : a > b ? 1 : 0;
}

// versionSemverStr returns the semver string for an AppVersion (semver, else vN).
export function versionSemverStr(v: AppVersion): string {
    return v.semver || (v.version_number ? `v${v.version_number}` : '');
}

// isStrictlyNewer reports whether candidate is a strict semver greater than
// current. Non-semver candidates return false so they are hidden on upgrade.
export function isStrictlyNewer(candidate: string, current: string): boolean {
    if (!parseSemverParts(candidate)) return false;
    if (!parseSemverParts(current)) return true; // current unknown: show all semver
    return cmpSemver(candidate, current) > 0;
}

export function versionLabel(v: AppVersion, cloudDigest?: string): string {
    const sv = v.semver || (v.version_number ? `v${v.version_number}` : '');
    const [src, hash] = versionSrcHash(v, cloudDigest);
    const parts: string[] = [];
    if (sv) parts.push(sv);
    if (src && hash) parts.push(`${src}:${hash}`);
    const d = shortDate(v.created_at);
    if (d) parts.push(d);
    return parts.join(' · ');
}

// Small display helpers for the Drive UI.

export function formatBytes(n: number): string {
    if (!n || n < 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.min(units.length - 1, Math.floor(Math.log(n) / Math.log(1024)));
    const v = n / Math.pow(1024, i);
    return `${i === 0 ? v : v.toFixed(v < 10 ? 1 : 0)} ${units[i]}`;
}

/** A short, human label for the file kind (from a mime hint or name). */
export function kindLabel(name: string, mime?: string): string {
    if (mime) {
        if (mime.startsWith('image/')) return 'Image';
        if (mime.startsWith('video/')) return 'Video';
        if (mime.startsWith('audio/')) return 'Audio';
        if (mime === 'application/pdf') return 'PDF';
        if (mime.startsWith('text/')) return 'Text';
    }
    const ext = name.split('.').pop()?.toLowerCase() ?? '';
    if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext)) return 'Image';
    if (['pdf'].includes(ext)) return 'PDF';
    if (['doc', 'docx'].includes(ext)) return 'Document';
    if (['xls', 'xlsx', 'csv'].includes(ext)) return 'Spreadsheet';
    if (['zip', 'tar', 'gz'].includes(ext)) return 'Archive';
    if (['txt', 'md'].includes(ext)) return 'Text';
    return ext ? ext.toUpperCase() : 'File';
}

/** subject:<sub> -> <sub>; leaves link/app subjects intact. */
export function granteeLabel(subject: string): string {
    if (subject.startsWith('subject:')) return subject.slice('subject:'.length);
    if (subject === 'link') return 'Anyone with the link';
    if (subject.startsWith('app:')) return `App ${subject.slice('app:'.length, 12)}…`;
    return subject;
}

/** A stable, deterministic pastel colour for an avatar from a string. */
export function avatarColor(seed: string): string {
    let h = 0;
    for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) & 0xffff;
    return `hsl(${h % 360} 55% 55%)`;
}

export function initials(label: string): string {
    const s = label.replace(/[^a-zA-Z0-9]/g, '');
    return (s.slice(0, 2) || '?').toUpperCase();
}

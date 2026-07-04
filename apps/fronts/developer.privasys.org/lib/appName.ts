// Shared app-name slug rules. An app's friendly display name (title) must
// reduce to its canonical, immutable name via: lowercase → spaces to hyphens →
// drop everything not [a-z0-9-]. Kept in lockstep with the management-service
// (slugifyDisplayName in handlers.go) and the CLI (apps create).

export function slugifyDisplayName(s: string): string {
    return s.trim().toLowerCase().replace(/ /g, '-').replace(/[^a-z0-9-]/g, '');
}

// displayNameError validates a friendly name against the canonical name it must
// reduce to. Returns a message, or '' when valid (or the field is blank).
// Structural slug faults that also make the canonical invalid (edge hyphens)
// are left to the canonical name's own checks; here we flag the user-facing
// rules and the "these two don't correspond" case.
export function displayNameError(display: string, canonical: string): string {
    const d = display.trim();
    if (!d) return '';
    if (/ {2,}/.test(d)) return 'No double spaces.';
    const slug = slugifyDisplayName(d);
    if (!slug) return 'Name must contain letters or numbers.';
    if (/--/.test(slug)) return 'No double hyphens.';
    if (canonical && slug !== canonical) return `Reduces to “${slug}”, but the app name is “${canonical}”.`;
    return '';
}

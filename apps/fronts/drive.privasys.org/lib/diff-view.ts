// Turning the enclave's diff into something a reader can follow.
//
// The comparison arrives as hunks: runs of changed lines with their
// context, each carrying the line numbers it starts at on both sides. A
// reader needs those numbers per line, and a visible break where the diff
// skipped over unchanged text, so the gaps are not mistaken for adjacency.

import type { DiffHunk } from './drive-api';

/** A row to render: either a line, or the break between two hunks. */
export type DiffRow =
    | { kind: 'gap' }
    | {
        kind: 'line';
        /** Line number in the older revision; null for an added line. */
        oldLine: number | null;
        /** Line number in the newer revision; null for a removed line. */
        newLine: number | null;
        op: ' ' | '-' | '+';
        text: string;
    };

export interface DiffView {
    rows: DiffRow[];
    added: number;
    removed: number;
}

/**
 * Number every line of every hunk on both sides, with a gap between hunks
 * that are not adjacent in the file.
 */
export function toDiffRows(hunks: DiffHunk[]): DiffView {
    const rows: DiffRow[] = [];
    let added = 0;
    let removed = 0;
    hunks.forEach((hunk, i) => {
        if (i > 0) rows.push({ kind: 'gap' });
        let oldLine = hunk.old_start;
        let newLine = hunk.new_start;
        for (const line of hunk.lines) {
            switch (line.op) {
                case '-':
                    rows.push({ kind: 'line', oldLine, newLine: null, op: '-', text: line.text });
                    oldLine++;
                    removed++;
                    break;
                case '+':
                    rows.push({ kind: 'line', oldLine: null, newLine, op: '+', text: line.text });
                    newLine++;
                    added++;
                    break;
                default:
                    rows.push({ kind: 'line', oldLine, newLine, op: ' ', text: line.text });
                    oldLine++;
                    newLine++;
            }
        }
    });
    return { rows, added, removed };
}

/** "3 added, 1 removed", or "no changes" when the revisions match. */
export function summariseDiff(view: DiffView): string {
    if (view.added === 0 && view.removed === 0) return 'no changes';
    const parts: string[] = [];
    if (view.added > 0) parts.push(`${view.added} added`);
    if (view.removed > 0) parts.push(`${view.removed} removed`);
    return parts.join(', ');
}

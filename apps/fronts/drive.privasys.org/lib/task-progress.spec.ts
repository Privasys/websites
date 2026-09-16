import { progressLabel } from './task-progress';

describe('progressLabel', () => {
    it('names the single item being worked on', () => {
        expect(progressLabel({ verb: 'Uploading', name: 'photo.png', pct: 12 })).toBe('Uploading photo.png');
    });

    it('counts position through a batch', () => {
        expect(
            progressLabel({ verb: 'Deleting', name: 'notes.md', pct: null, step: { index: 3, total: 12 } })
        ).toBe('Deleting 3 of 12: notes.md');
    });

    it('does not say "1 of 1" for a single item', () => {
        expect(
            progressLabel({ verb: 'Deleting', name: 'notes.md', pct: null, step: { index: 1, total: 1 } })
        ).toBe('Deleting notes.md');
    });

    it('stands alone when the verb is the whole message', () => {
        expect(progressLabel({ verb: 'Reading the folder…', name: '', pct: null })).toBe('Reading the folder…');
    });
});

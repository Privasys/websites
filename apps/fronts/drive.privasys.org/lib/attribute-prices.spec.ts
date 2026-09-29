import { formatCredits, perVisitorCost, priceOf } from './attribute-prices';
import type { ShareAttribute } from './share-attributes';

const attr = (over: Partial<ShareAttribute>): ShareAttribute => ({
    key: 'x',
    label: 'X',
    assurance: 'basic',
    billable: false,
    ...over
});

const over18 = attr({ key: 'age_over_18', assurance: 'gov', billable: true, marketplaceKey: 'privasys:age_over_18' });
const over21 = attr({ key: 'age_over_21', assurance: 'gov', billable: true, marketplaceKey: 'privasys:age_over_21' });
const email = attr({ key: 'email', assurance: 'verified' });
const prices = new Map([
    ['privasys:age_over_18', 50_000],
    ['privasys:age_over_21', 50_000]
]);

describe('formatCredits', () => {
    it('shows credits as pounds at the platform rate', () => {
        expect(formatCredits(1_000_000)).toBe('£1.00');
        expect(formatCredits(50_000)).toBe('£0.05');
    });

    it('keeps a sub-penny price visible instead of rounding it to nothing', () => {
        expect(formatCredits(1_234)).toBe('£0.0012');
    });
});

describe('priceOf', () => {
    it('reads the price by the key the marketplace sells it under', () => {
        expect(priceOf(prices, over18)).toBe(50_000);
    });

    it('has no price for an attribute the marketplace does not sell, or before the catalogue arrives', () => {
        expect(priceOf(prices, email)).toBeUndefined();
        expect(priceOf(null, over18)).toBeUndefined();
    });
});

describe('perVisitorCost', () => {
    const attrs = [over18, over21, email];

    it('adds up the paid attributes and ignores the free ones', () => {
        expect(perVisitorCost(prices, attrs, ['email', 'age_over_18', 'age_over_21'])).toBe(100_000);
    });

    it('costs nothing when nothing chosen is paid', () => {
        expect(perVisitorCost(prices, attrs, ['email'])).toBe(0);
    });

    it('refuses to total a bill it cannot price in full', () => {
        // Understating what each visitor costs is the one error this must not make.
        expect(perVisitorCost(new Map([['privasys:age_over_18', 50_000]]), attrs, ['age_over_18', 'age_over_21'])).toBeUndefined();
        expect(perVisitorCost(null, attrs, ['age_over_18'])).toBeUndefined();
    });
});

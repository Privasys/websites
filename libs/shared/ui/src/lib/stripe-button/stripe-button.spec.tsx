import { render } from '@testing-library/react';

import StripeButton from './stripe-button';

describe('StripeButton', () => {
    it('should render successfully', () => {
        const { baseElement } = render(<StripeButton link="/" cta="Boop" style="bg-blue text-white" />);
        expect(baseElement).toBeTruthy();
    });
});

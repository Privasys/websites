import { render } from '@testing-library/react';

import Button from './button';

describe('Button', () => {
    it('should render successfully', () => {
        const { baseElement } = render(<Button link="/" cta="Boop" style="bg-blue text-white" />);
        expect(baseElement).toBeTruthy();
    });
});

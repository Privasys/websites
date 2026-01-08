import { render } from '@testing-library/react';

import StickyNavbar from './sticky-navbar';

describe('StickyNavbar', () => {
    it('should render successfully', () => {
        const { baseElement } = render(<StickyNavbar styles={{ nav: 'bg-blue text-white' }}>Hello there</StickyNavbar>);
        expect(baseElement).toBeTruthy();
    });
});

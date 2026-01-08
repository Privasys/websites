import { render } from '@testing-library/react';

import FullSection from './full-section';

describe('FullSection', () => {
    it('should render successfully', () => {
        const { baseElement } = render(<FullSection styles={''} children={undefined} />);
        expect(baseElement).toBeTruthy();
    });
});

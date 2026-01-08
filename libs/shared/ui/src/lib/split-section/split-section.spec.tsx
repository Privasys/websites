import { render } from '@testing-library/react';

import SplitSection from './split-section';

describe('SplitSection', () => {
    it('should render successfully', () => {
        const { baseElement } = render(<SplitSection styles={''} children={undefined} />);
        expect(baseElement).toBeTruthy();
    });
});

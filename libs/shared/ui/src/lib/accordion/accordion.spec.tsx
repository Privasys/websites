import { render } from '@testing-library/react';

import Accordion from './accordion';

describe('Accordion', () => {
    it('should render successfully', () => {
        const { baseElement } = render(<Accordion
            title="Lorem ipsum"
            body={<>Hello there you</>}
            containerStyles="bg-white p-3 rounded"
            titleStyles="text-xl sm:text-2xl text-black"
        />);
        expect(baseElement).toBeTruthy();
    });
});

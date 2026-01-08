import { FC, PropsWithChildren } from 'react';

interface SplitSectionProps {
    styles?: string;
    bgColor?: string;
}

export const SplitSection: FC<PropsWithChildren<SplitSectionProps>> = ({ children, styles, bgColor }) => {
    return (
        <div className={`${bgColor}`}>
            <div className={`grid grid-cols-1 md:grid-cols-2 gap-12 py-24 sm:py-32 xl:py-36 px-8 md:px-24 xl:px-0 xl:max-w-7xl mx-auto ${styles ?? ''}`}>
                {children}
            </div>
        </div>
    );
};

export default SplitSection;


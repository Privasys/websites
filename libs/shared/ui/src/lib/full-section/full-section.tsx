import { FC, PropsWithChildren } from 'react';

interface FullSectionProps {
    styles?: string;
    bgColor?: string;
}

export const FullSection: FC<PropsWithChildren<FullSectionProps>> = ({ children, styles, bgColor }) => {
    return (
        <div className={`${bgColor}`}>
            <div className={`py-24 sm:py-32 xl:py-36 px-8 md:px-24 xl:px-0 xl:max-w-7xl mx-auto ${styles ?? ''}`}>
                {children}
            </div>
        </div>
    );
};

export default FullSection;
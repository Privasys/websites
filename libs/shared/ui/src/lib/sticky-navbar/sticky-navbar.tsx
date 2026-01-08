'use client';

import { useState, type HTMLAttributes, useEffect, FC, PropsWithChildren } from 'react';
import Sticky from 'react-sticky-el';
import style from './sticky-navbar.module.css';

type Prettify<T> = {
    [P in keyof T]: T[P]
} & unknown;

export interface StickyNavbarProps {
    styles?: Prettify<Partial<Record<'sticky' | 'stickyActive' | 'navWrapper' | 'nav', HTMLAttributes<HTMLDivElement>['className']>>>;
}

export const StickyNavbar: FC<PropsWithChildren<StickyNavbarProps>> = ({ styles, children }) => {

    const [fixedToggle, setFixedToggle] = useState(false);
    const [scrollElement, setScrollElement] = useState('body');

    useEffect(() => {
        setScrollElement(typeof window !== 'undefined' ? window : 'window' as any);
    }, []);

    return (
        <Sticky
            scrollElement={scrollElement}
            wrapperClassName={`${style.stickyPanel} ${styles?.sticky ?? ''}`}
            stickyClassName={`${style.stuck} ${styles?.stickyActive ?? ''}`}
            onFixedToggle={(fixed) => setFixedToggle(fixed)}
        >
            <div className={`${style.navBarWrapper} ${styles?.navWrapper ?? ''} ${fixedToggle ? '' : style.fixedToggle}`}>
                <div className={`mx-auto md:text-center ${style.navBar}`}>
                    <nav className={`${styles?.nav ?? ''}`}>
                        {children}
                    </nav>
                </div>
            </div>
        </Sticky>
    );
};

export default StickyNavbar;

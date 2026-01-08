'use client';

import { Provider as WrapBalancer } from 'react-wrap-balancer';
import { AppProgressBar as ProgressBar } from 'next-nprogress-bar';
import { motion } from 'motion/react';
import { FC, PropsWithChildren } from 'react';

export const Providers: FC<PropsWithChildren> = ({ children }) => {
    return (
        <WrapBalancer>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="bg-background text-slate-50 flex-grow flex flex-col"
            >
                {children}
                <ProgressBar
                    height="4px"
                    color="#00BFFF"
                    options={{ showSpinner: false }}
                    shallowRouting
                />
            </motion.div>
        </WrapBalancer>
    );
};

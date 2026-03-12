import type { ReactNode } from 'react';
import { Navbar } from '~/app/components/navbar';
import { Footer } from '~/app/components/footer';

export default function MarketingLayout({ children }: { children: ReactNode }) {
    return (
        <>
            <Navbar />
            <main className="flex-grow pt-14">
                {children}
            </main>
            <Footer />
        </>
    );
}

import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import { DocsNavbar } from './components/docs-navbar';

export const baseOptions: BaseLayoutProps = {
    nav: {
        title: 'Privasys',
        url: '/',
        component: <DocsNavbar />
    },
    githubUrl: 'https://github.com/Privasys'
};

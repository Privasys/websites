import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';

export const baseOptions: BaseLayoutProps = {
    nav: {
        title: 'Privasys',
        url: '/'
    },
    githubUrl: 'https://github.com/Privasys',
    links: [
        {
            text: 'Website',
            url: 'https://privasys.org',
            external: true
        },
        {
            text: 'Blog',
            url: 'https://privasys.org/blog',
            external: true
        }
    ]
};

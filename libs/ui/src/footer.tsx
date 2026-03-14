import Link from 'next/link';

export interface FooterProps {
    companyLine?: string;
    links?: { label: string; href: string; external?: boolean }[];
}

const CURRENT_YEAR = new Date().getFullYear();

export function Footer({ companyLine, links }: FooterProps) {
    return (
        <footer className="pui-footer px-6 lg:px-0">
            <div className="pui-footer-inner">
                <div className="pui-footer-company">
                    {companyLine && <span>{companyLine}</span>}
                    <span className="pui-footer-copyright">&copy; {CURRENT_YEAR} Privasys Ltd. All rights reserved.</span>
                </div>
                {links && links.length > 0 && (
                    <div className="pui-footer-links">
                        {links.map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                className="pui-footer-link"
                                {...(link.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                            >
                                {link.label}
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </footer>
    );
}

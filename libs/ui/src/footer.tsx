import Link from 'next/link';

export interface FooterProps {
    companyLine?: string;
    links?: { label: string; href: string; external?: boolean }[];
    version?: string;
    className?: string;
}

const CURRENT_YEAR = new Date().getFullYear();

export function Footer({ companyLine, links, version, className }: FooterProps) {
    return (
        <footer className={`pui-footer px-6 lg:px-0${className ? ` ${className}` : ''}`}>
            <div className="pui-footer-inner">
                <div className="pui-footer-company">
                    {companyLine && <span>{companyLine}</span>}
                    <span className="pui-footer-copyright">&copy; {CURRENT_YEAR} Privasys Ltd. All rights reserved.</span>
                </div>
                {(links || version) && (
                    <div className="pui-footer-links">
                        {links?.map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                className="pui-footer-link"
                                {...(link.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                            >
                                {link.label}
                            </Link>
                        ))}
                        {version && <span className="pui-footer-copyright">{version}</span>}
                    </div>
                )}
            </div>
        </footer>
    );
}

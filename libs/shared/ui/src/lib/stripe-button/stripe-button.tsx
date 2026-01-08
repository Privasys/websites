import Link from 'next/link';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { FC } from 'react';

function cn(...args: ClassValue[]) {
    return twMerge(clsx(args));
}

interface StripeButtonProps {
    link: string;
    cta: string;
    style: string;
    external?: boolean;
    arrowColor?: string;
}

export const StripeButton: FC<StripeButtonProps> = ({
    link,
    cta,
    style,
    external,
    arrowColor
}) => {
    if (external)
        return <a href={link} target="_blank" rel="noopener noreferrer">
            <div className={cn('group inline-flex items-center px-4 py-1.5 font-bold transition', style)}>
                {cta}
                <svg className={`mt-0.5 ml-2 -mr-1 ${arrowColor ? `stroke-[${arrowColor}]` : 'stroke-white'} stroke-2`} stroke={arrowColor} fill="none" width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
                    <path className="opacity-0 transition group-hover:opacity-100" d="M0 5h7"></path>
                    <path className="transition group-hover:translate-x-[3px]" d="M1 1l4 4-4 4"></path>
                </svg>
            </div>
        </a>;
    else return <Link href={link}>
        <div className={cn('group inline-flex items-center px-4 py-1.5 font-bold transition', style)}>
            {cta}
            <svg className={`mt-0.5 ml-2 -mr-1 ${arrowColor ? `stroke-[${arrowColor}]` : 'stroke-white'} stroke-2`} stroke={arrowColor} fill="none" width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
                <path className="opacity-0 transition group-hover:opacity-100" d="M0 5h7"></path>
                <path className="transition group-hover:translate-x-[3px]" d="M1 1l4 4-4 4"></path>
            </svg>
        </div>
    </Link>;
};

export default StripeButton;

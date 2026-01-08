import Link from 'next/link';

interface ButtonProps {
    link: string;
    cta: string;
    style: string;
    external?: boolean;
}

export const Button = (props: ButtonProps) => props.external ? <a href={props.link} target="_blank" rel="noopener noreferrer">
    <div className={`${props.style} rounded-lg transition ease-in-out delay-150 hover:-translate-y-1 hover:scale-110 duration-300 text-center font-bold w-48 py-2 px-4`}>
        {props.cta}
    </div>
</a> : <Link href={props.link}>
    <div className={`${props.style} rounded-lg transition ease-in-out delay-150 hover:-translate-y-1 hover:scale-110 duration-300 text-center font-bold w-48 py-2 px-4`}>
        {props.cta}
    </div>
</Link>;

export default Button;

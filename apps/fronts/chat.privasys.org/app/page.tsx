import { redirect } from 'next/navigation';

const DEFAULT_INSTANCE = process.env.NEXT_PUBLIC_DEFAULT_INSTANCE ?? 'demo';

// chat.privasys.org/ -> /i/<default> per the URL contract
// in plans/ai-plan.md.
export default function HomePage() {
    redirect(`/i/${DEFAULT_INSTANCE}`);
}

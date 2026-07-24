import { redirect } from 'next/navigation';

// Relying-party management lives on the Attributes page (consume side on
// top, provider/catalogue below). Kept as a redirect so old links work.
export default function RelyingPartiesRedirect() {
    redirect('/dashboard/attributes');
}

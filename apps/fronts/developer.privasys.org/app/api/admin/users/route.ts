import { NextResponse } from 'next/server';
import { auth } from '~/lib/auth';

const IDP_URL = process.env.AUTH_PRIVASYS_ISSUER || process.env.IDP_ADMIN_URL || '';
const IDP_ADMIN_TOKEN = process.env.IDP_ADMIN_TOKEN || '';

function isAdmin(session: any): boolean {
    return session?.roles?.includes('privasys-platform:admin') ?? false;
}

// GET /api/admin/users — list all IdP users with roles.
export async function GET() {
    const session = await auth();
    if (!isAdmin(session)) {
        return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    const res = await fetch(`${IDP_URL}/admin/users`, {
        headers: { Authorization: `Bearer ${IDP_ADMIN_TOKEN}` },
    });
    if (!res.ok) {
        const body = await res.text();
        return NextResponse.json({ error: body }, { status: res.status });
    }
    return NextResponse.json(await res.json());
}

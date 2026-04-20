import { NextRequest, NextResponse } from 'next/server';
import { verifyJwt } from '~/lib/verify-jwt';

const IDP_URL = process.env.AUTH_PRIVASYS_ISSUER || process.env.IDP_ADMIN_URL || '';
const IDP_ADMIN_TOKEN = process.env.IDP_ADMIN_TOKEN || '';

// GET /api/admin/users — list all IdP users with roles.
export async function GET(req: NextRequest) {
    const claims = await verifyJwt(req);
    if (!claims?.roles?.includes('privasys-platform:admin')) {
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

import { NextRequest, NextResponse } from 'next/server';
import { verifyJwt } from '~/lib/verify-jwt';

const IDP_URL = process.env.AUTH_PRIVASYS_ISSUER || process.env.IDP_ADMIN_URL || '';
const IDP_ADMIN_TOKEN = process.env.IDP_ADMIN_TOKEN || '';

// POST /api/admin/roles — grant a role.
// Body: { user_id, role }
export async function POST(req: NextRequest) {
    const claims = await verifyJwt(req);
    if (!claims?.roles?.includes('privasys-platform:admin')) {
        return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const res = await fetch(`${IDP_URL}/admin/roles`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${IDP_ADMIN_TOKEN}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    });
    if (!res.ok) {
        const data = await res.json().catch(() => ({ error: res.statusText }));
        return NextResponse.json(data, { status: res.status });
    }
    return NextResponse.json(await res.json());
}

// DELETE /api/admin/roles — revoke a role.
// Body: { user_id, role }
export async function DELETE(req: NextRequest) {
    const claims = await verifyJwt(req);
    if (!claims?.roles?.includes('privasys-platform:admin')) {
        return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const res = await fetch(`${IDP_URL}/admin/roles`, {
        method: 'DELETE',
        headers: {
            Authorization: `Bearer ${IDP_ADMIN_TOKEN}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    });
    if (!res.ok) {
        const data = await res.json().catch(() => ({ error: res.statusText }));
        return NextResponse.json(data, { status: res.status });
    }
    return NextResponse.json(await res.json());
}

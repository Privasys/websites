import { getSkillFiles } from '@/lib/skill';

export const dynamic = 'force-static';
export const dynamicParams = false;

/**
 * The Privasys agent skill as plain files: /skills/privasys/SKILL.md and
 * /skills/privasys/references/<name>.md, so relative links inside SKILL.md
 * resolve. Linked from /llms.txt.
 */
export async function generateStaticParams(): Promise<{ path: string[] }[]> {
    return (await getSkillFiles()).map((f) => ({ path: f.path.split('/') }));
}

export async function GET(
    _req: Request,
    { params }: { params: Promise<{ path: string[] }> }
): Promise<Response> {
    const { path } = await params;
    const file = (await getSkillFiles()).find((f) => f.path === path.join('/'));
    if (!file) {
        return new Response('Not found', { status: 404 });
    }
    return new Response(file.content, {
        headers: { 'Content-Type': 'text/markdown; charset=utf-8' }
    });
}

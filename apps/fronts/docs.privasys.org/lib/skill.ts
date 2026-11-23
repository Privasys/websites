/**
 * The Privasys agent skill (SKILL.md and its references, in the Agent Skills
 * format), served at /skills/privasys/ for agents that fetch skills over the
 * web. Its single source is the CLI repository, which also bundles it into
 * `privasys agents init`; the build reads it from there so the two never
 * drift. The reference files are the ones SKILL.md itself lists.
 */
export const SKILL_PATH = '/skills/privasys';

const SOURCE = 'https://raw.githubusercontent.com/Privasys/cli/main/plugins/privasys/skills/privasys';

export interface SkillFile {
    /** Path relative to the skill folder: SKILL.md, references/x.md. */
    path: string;
    content: string;
}

async function fetchText(path: string): Promise<string> {
    const res = await fetch(`${SOURCE}/${path}`);
    if (!res.ok) {
        throw new Error(`skill: fetching ${path} failed with ${res.status}`);
    }
    return res.text();
}

let files: Promise<SkillFile[]> | undefined;

/** Every file of the skill, fetched once per build. */
export function getSkillFiles(): Promise<SkillFile[]> {
    files ??= (async () => {
        const skill = await fetchText('SKILL.md');
        const refs = [...new Set(skill.match(/references\/[a-z0-9-]+\.md/g) ?? [])].sort();
        const out: SkillFile[] = [{ path: 'SKILL.md', content: skill }];
        for (const ref of refs) {
            out.push({ path: ref, content: await fetchText(ref) });
        }
        return out;
    })();
    return files;
}

import { docs } from '@/.source';
import { loader } from 'fumadocs-core/source';

const fumadocsSource = docs.toFumadocsSource();
// fumadocs-mdx v11 returns files as a lazy function, resolve it for fumadocs-core v15
const files = typeof fumadocsSource.files === 'function'
    ? (fumadocsSource.files as unknown as () => unknown[])()
    : fumadocsSource.files;

export const source = loader({
    baseUrl: '/',
    source: { files } as any // eslint-disable-line @typescript-eslint/no-explicit-any
});

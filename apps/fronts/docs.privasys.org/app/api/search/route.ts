import { source } from '@/lib/source';
import { createFromSource } from 'fumadocs-core/search/server';

const searchAPI = createFromSource(source);

export const revalidate = false;
export const GET = searchAPI.staticGET;

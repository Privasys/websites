// The auth SDK is a browser bundle: importing it pulls in modules that
// build a TextEncoder at load time. Node has them, just not on the global
// object under jest's default environment.
import { TextDecoder, TextEncoder } from 'node:util';

const g = globalThis as unknown as Record<string, unknown>;
g.TextEncoder ??= TextEncoder;
g.TextDecoder ??= TextDecoder;

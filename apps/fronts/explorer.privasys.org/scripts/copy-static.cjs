const fs = require('fs');
const path = require('path');

const [src, dst] = process.argv.slice(2);
if (!src || !dst) { console.error('Usage: copy-static.js <src> <dst>'); process.exit(1); }

const STATIC_EXTS = new Set(['.html', '.css', '.js', '.ico', '.png', '.svg', '.jpg', '.webp', '.woff2']);

fs.rmSync(dst, { recursive: true, force: true });
fs.mkdirSync(dst, { recursive: true });
for (const f of fs.readdirSync(src)) {
    const full = path.join(src, f);
    if (fs.statSync(full).isFile() && STATIC_EXTS.has(path.extname(f))) {
        fs.cpSync(full, path.join(dst, f));
    }
}
console.log('Copied static files from', src, 'to', dst);

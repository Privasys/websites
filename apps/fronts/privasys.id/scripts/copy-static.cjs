const fs = require('fs');
const path = require('path');

const [src, dst] = process.argv.slice(2);
if (!src || !dst) { console.error('Usage: copy-static.js <src> <dst>'); process.exit(1); }

const STATIC_EXTS = new Set(['.html', '.css', '.js', '.ico', '.png', '.svg', '.jpg', '.webp', '.woff2', '.json']);

fs.rmSync(dst, { recursive: true, force: true });
fs.mkdirSync(dst, { recursive: true });

function copyDir(srcDir, dstDir) {
    for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
        const srcPath = path.join(srcDir, entry.name);
        const dstPath = path.join(dstDir, entry.name);
        if (entry.name === 'node_modules' || entry.name === 'scripts' || entry.name === 'e2e') continue;
        if (entry.isDirectory()) {
            fs.mkdirSync(dstPath, { recursive: true });
            copyDir(srcPath, dstPath);
        } else if (STATIC_EXTS.has(path.extname(entry.name)) || entry.name === 'apple-app-site-association') {
            fs.cpSync(srcPath, dstPath);
        }
    }
}

copyDir(src, dst);
console.log('Copied static files from', src, 'to', dst);

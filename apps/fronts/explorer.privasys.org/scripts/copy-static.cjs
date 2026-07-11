const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

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

// Cache-bust local CSS/JS references in index.html by content hash. The OVH
// host sends no Cache-Control, so browsers were serving stale style.css /
// explorer.js while index.html updated. A content-hash query gives each changed
// asset a fresh URL (nginx ignores the query and serves the file), so a deploy
// is picked up immediately; unchanged assets keep their hash and stay cached.
const indexPath = path.join(dst, 'index.html');
if (fs.existsSync(indexPath)) {
    let html = fs.readFileSync(indexPath, 'utf8');
    html = html.replace(/(href|src)="([^"']+\.(?:css|js))"/g, (m, attr, ref) => {
        if (/^[a-z]+:\/\//i.test(ref) || ref.startsWith('//')) return m; // skip external URLs
        const assetPath = path.join(dst, ref.split('?')[0]);
        if (!fs.existsSync(assetPath)) return m;
        const v = crypto.createHash('sha1').update(fs.readFileSync(assetPath)).digest('hex').slice(0, 10);
        return `${attr}="${ref.split('?')[0]}?v=${v}"`;
    });
    fs.writeFileSync(indexPath, html);
    console.log('Cache-busted local asset references in index.html');
}

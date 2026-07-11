// Builds the embedded attestation component bundle for the explorer:
//   1. Tailwind (v4, via @tailwindcss/postcss) generates the CSS the shared
//      @privasys/attestation-view component uses, scanning the lib source.
//   2. The theme vars are re-rooted (:root -> :host) so they resolve inside the
//      shadow root the component is mounted in (see attestation/mount.tsx).
//   3. esbuild bundles mount.tsx (React + react-dom + the lib + the generated
//      CSS inlined as text) into a single self-contained attestation.bundle.js.
//
// Output (attestation/tailwind.generated.css and attestation.bundle.js) is
// git-ignored and produced fresh on every build.

const path = require('path');
const fs = require('fs');
const postcss = require('postcss');
const tailwind = require('@tailwindcss/postcss');
const esbuild = require('esbuild');

const appDir = process.argv[2];
if (!appDir) { console.error('Usage: build-attestation.cjs <appDir>'); process.exit(1); }
const attDir = path.join(appDir, 'attestation');
const inputCssPath = path.join(attDir, 'tailwind.css');
const generatedCssPath = path.join(attDir, 'tailwind.generated.css');
const bundlePath = path.join(appDir, 'attestation.bundle.js');

(async () => {
    const inputCss = fs.readFileSync(inputCssPath, 'utf8');
    const res = await postcss([tailwind()]).process(inputCss, { from: inputCssPath });
    // The component is mounted in a shadow root; :host is its styling root.
    const css = res.css.replace(/:root\b/g, ':host');
    fs.writeFileSync(generatedCssPath, css);
    console.log(`Tailwind CSS generated (${css.length} bytes)`);

    await esbuild.build({
        entryPoints: [path.join(attDir, 'mount.tsx')],
        bundle: true,
        format: 'iife',
        jsx: 'automatic',
        loader: { '.css': 'text' },
        define: { 'process.env.NODE_ENV': '"production"' },
        minify: true,
        target: ['es2020'],
        outfile: bundlePath,
        logLevel: 'warning'
    });
    console.log(`Built ${path.basename(bundlePath)} (${fs.statSync(bundlePath).size} bytes)`);
})().catch((e) => { console.error(e); process.exit(1); });

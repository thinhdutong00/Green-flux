import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { build, transform } from 'esbuild';

const root = new URL('../', import.meta.url);
const source = new URL('public/', root);
const output = new URL('dist/', root);
const pages = [
  { path: 'index.html', script: 'script.js' },
  { path: 'preventivo/index.html', script: 'preventivo/form.mjs' },
];

// Keep editable sources separate; publish self-contained pages without blocking
// stylesheet requests or a chain of JavaScript module downloads.
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await cp(source, output, { recursive: true });

for (const page of pages) {
  let html = await readFile(new URL(page.path, source), 'utf8');
  const stylesheets = [...html.matchAll(/<link rel="stylesheet" href="([^"]+)"\s*\/>/g)];
  for (const [tag, href] of stylesheets) {
    let css = await readFile(new URL(href.slice(1), source), 'utf8');
    if (page.path === 'index.html') {
      for (const [url, fontPath] of css.matchAll(/url\("(\/assets\/fonts\/[^\"]+\.woff2)"\)/g)) {
        const font = await readFile(new URL(fontPath.slice(1), source));
        css = css.replace(url, `url("data:font/woff2;base64,${font.toString('base64')}")`);
      }
    }
    const result = await transform(css, {
      loader: 'css', minify: true, target: ['chrome110', 'firefox115', 'safari16.4'],
    });
    html = html.replace(tag, `<style>${result.code}</style>`);
  }
  if (page.path === 'index.html') {
    html = html.replace(/\s*<link rel="preload"[^>]+as="font"[^>]*\/>/g, '');
  }
  const result = await build({
    entryPoints: [fileURLToPath(new URL(page.script, source))],
    bundle: true, minify: true, write: false, platform: 'browser',
    format: 'iife', target: 'es2022', legalComments: 'none',
  });
  html = html.replace(/\s*<script(?: type="module")? src="[^"]+"(?: defer)?><\/script>/g, '');
  html = html.replace('</body>', `<script>${result.outputFiles[0].text}</script>\n</body>`);
  await writeFile(new URL(page.path, output), html);
  console.log(`Built ${page.path}`);
}

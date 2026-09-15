import { readFile, writeFile, access } from 'node:fs/promises';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { PurgeCSS } from 'purgecss';
import { transform } from 'esbuild';

// Include interactive markup and state classes, not just the initial viewport.
// Keep CSS variables/keyframes/font faces: these can be used by open menus/forms.
export async function optimizePages(output, pagePaths, scriptPaths) {
  const scripts = await Promise.all(scriptPaths.map(async path => ({raw: await readFile(path, 'utf8'), extension: 'js'})));
  const hasAvif = async url => {
    try { await access(join(output, url.replace(/\.webp$/, '.avif'))); return true; }
    catch { return false; }
  };
  const avif = value => value.replace(/\.webp\b/g, '.avif');
  const stats = [];
  for (const path of pagePaths) {
    let html = await readFile(join(output, path), 'utf8');
    // A 768px candidate matches common mobile DPR without downloading 960px.
    html = html.replaceAll('/assets/images/heat-pump-home-480.webp 480w,', '/assets/images/heat-pump-home-480.webp 480w, /assets/images/heat-pump-home-768.webp 768w,');
    html = html.replace(/<img\b[^>]*loading="lazy"[^>]*>/g, tag => tag.includes('fetchpriority=') ? tag : tag.replace('<img', '<img fetchpriority="low"'));
    html = html.replace(/<link\b[^>]*href="\/assets\/favicon.ico"[^>]*>/g, tag => tag.includes('apple-touch-icon') ? tag : tag.replace('favicon.ico','favicon.png').replace('image/x-icon','image/png'));
    const cssParts = [];
    const styles = [...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>|<link\b[^>]*rel="stylesheet"[^>]*>/g)];
    for (const [tag, inline] of styles) {
      cssParts.push(inline ?? await readFile(join(output, tag.match(/href="([^"]+)"/)[1]), 'utf8'));
      html = html.replace(tag, '');
    }
    // Use AVIF where supported; retain the original responsive WebP fallback.
    for (const match of [...html.matchAll(/<img\b[^>]*>/g)]) {
      const tag = match[0];
      const src = tag.match(/\bsrc="([^"]+\.webp)"/)?.[1];
      if (!src || !await hasAvif(src)) continue;
      const set = tag.match(/\bsrcset="([^"]+)"/)?.[1] || src;
      const sizes = tag.match(/\bsizes="([^"]+)"/)?.[1];
      const source = `<source type="image/avif" srcset="${avif(set)}"${sizes ? ` sizes="${sizes}"` : ''}>`;
      const start = html.indexOf(tag);
      const inPicture = html.lastIndexOf('<picture', start) > html.lastIndexOf('</picture>', start);
      html = html.replace(tag, inPicture ? source + tag : `<picture class="gf-responsive-image">${source}${tag}</picture>`);
    }
    for (const match of [...html.matchAll(/<link\b[^>]*rel="preload"[^>]*>/g)]) {
      const tag = match[0];
      const src = tag.match(/href="([^"]+\.webp)"/)?.[1];
      if (src && await hasAvif(src)) html = html.replace(tag, avif(tag).replace('image/webp', 'image/avif'));
    }
    let css = cssParts.join('\n') + '\n.gf-responsive-image{display:contents}picture>source{display:none}';
    // CSS backgrounds get the same format negotiation as HTML pictures.
    for (const match of [...css.matchAll(/url\((['"]?)(\/assets\/[^)'"\s]+\.webp)\1\)/g)]) {
      if (await hasAvif(match[2])) css = css.replaceAll(match[0], `image-set(url("${avif(match[2])}") type("image/avif"),url("${match[2]}") type("image/webp"))`);
    }
    const [purged] = await new PurgeCSS().purge({
      content: [{raw: html, extension: 'html'}, ...scripts],
      css: [{raw: css}],
      dynamicAttributes: ['open', 'hidden', 'aria-expanded', 'aria-invalid', 'data-step'],
      safelist: ['html', 'body', 'is-open', 'is-visible', 'is-hidden', 'is-selected', 'is-scrolled', 'gf-mobile-ready', 'gf-menu-open', 'menu-open', 'reveal-ready', 'js'],
    });
    const minified = (await transform(purged.css, {loader: 'css', minify: true, target: ['chrome110','firefox115','safari16.4']})).code;
    // Each page's small stylesheet is inline: no blocking CSS round trip.
    html = html.replace('</head>', `<style>${minified}</style></head>`);
    // Content-addressed scripts make long-lived caching safe across releases.
    for (const match of [...html.matchAll(/<script\b[^>]*src="(\/[^"?]+)"[^>]*>/g)]) {
      const bytes = await readFile(join(output, match[1]));
      const hash = createHash('sha256').update(bytes).digest('hex').slice(0,12);
      html = html.replace(match[0], match[0].replace(match[1], match[1]+'?v='+hash));
    }
    await writeFile(join(output, path), html);
    stats.push({page: '/'+path.replace(/index\.html$/, ''), cssBefore: Buffer.byteLength(css), cssAfter: Buffer.byteLength(minified)});
  }
  return stats;
}

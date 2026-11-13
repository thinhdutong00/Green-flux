import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { loadGuides, guideRoutes, guideRoute, guideIndexRoute } from '../scripts/render-guides.mjs';

const guides = await loadGuides();
const routes = await guideRoutes();
const read = route => readFileSync(`public${route}index.html`, 'utf8');
const sitemap = readFileSync('public/sitemap.xml', 'utf8');
const textOnly = html => html.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');

test('Every published guide is rendered once, with its own canonical, title, description and heading', () => {
  assert(guides.length >= 10);
  const titles = new Set(), descriptions = new Set();
  for (const guide of guides) {
    const route = guideRoute(guide.slug), html = read(route);
    assert(html.includes(`<link rel="canonical" href="https://green-flux.com${route}">`), route);
    assert.equal((html.match(/<h1\b/g) || []).length, 1, route);
    assert(!/name="robots"/.test(html), `${route}: le guide pubblicate restano indicizzabili`);
    assert(!/\{\{|BOZZA|da confermare|___/.test(html), `${route}: nessun segnaposto`);
    const title = html.match(/<title>(.*?)<\/title>/)[1], description = html.match(/name="description" content="(.*?)"/)[1];
    assert(!titles.has(title) && !descriptions.has(description), `${route}: title e description unici`);
    titles.add(title); descriptions.add(description);
    const ids = [...html.matchAll(/ id="([^"]+)"/g)].map(match => match[1]);
    assert.deepEqual(ids.filter((id, index) => ids.indexOf(id) !== index), [], `${route}: id duplicati`);
  }
});

test('Guides are in the sitemap; drafts and the pages already excluded stay out', () => {
  for (const route of routes) assert(sitemap.includes(`<loc>https://green-flux.com${route}</loc>`), route);
  const drafts = readdirSync('content/guides').filter(name => name.endsWith('.html')).map(name => name.replace(/\.html$/, '')).filter(slug => !guides.some(guide => guide.slug === slug));
  for (const slug of drafts) {
    assert(!existsSync(`public/guide/${slug}/index.html`), `bozza generata: ${slug}`);
    assert(!sitemap.includes(`/guide/${slug}/`), `bozza in sitemap: ${slug}`);
    for (const route of routes) assert(!read(route).includes(`/guide/${slug}/`), `${route} collega la bozza ${slug}`);
  }
  for (const excluded of ['/landing/', '/thank-you/']) assert(!sitemap.includes(excluded), excluded);
});

test('Guides link to each other, to the index and to an existing service page', () => {
  const index = read(guideIndexRoute);
  for (const guide of guides) {
    const route = guideRoute(guide.slug), html = read(route);
    assert(index.includes(`href="${route}"`), `indice senza ${route}`);
    assert(html.includes(`href="${guideIndexRoute}"`), `${route} senza link all'indice`);
    for (const slug of guide.related) assert(html.includes(`href="${guideRoute(slug)}"`), `${route} → ${slug}`);
    assert(existsSync(`public${guide.service[0]}index.html`) && html.includes(`href="${guide.service[0]}"`), `${route}: servizio collegato`);
    for (const match of html.matchAll(/href="(\/guide\/[^"#]+)/g)) assert(routes.includes(match[1]), `${route} → ${match[1]}`);
  }
});

test('Structured data matches what the page shows and measurement is loaded once', () => {
  for (const guide of guides) {
    const route = guideRoute(guide.slug), html = read(route);
    const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(match => JSON.parse(match[1]));
    const graph = blocks.flatMap(block => block['@graph']);
    const article = graph.find(node => node['@type'] === 'Article');
    assert.equal(article.headline, guide.title);
    assert.equal(article.dateModified, guide.updated);
    const faq = graph.find(node => node['@type'] === 'FAQPage');
    const shown = [...html.matchAll(/<details><summary>([\s\S]*?)<\/summary>/g)].length;
    assert.equal(faq ? faq.mainEntity.length : 0, shown, `${route}: FAQ visibili e marcate`);
    for (const script of ['lead-attribution.mjs', 'ads-measurement.mjs']) assert.equal(html.split(script).length - 1, 1, `${route}: ${script}`);
    assert(!/gtag\(|AW-\d+\/|conversion/i.test(textOnly(html)), `${route}: nessun evento di conversione in pagina`);
  }
});

test('Guides do not publish unverified company promises', () => {
  for (const guide of guides) {
    const text = textOnly(read(guideRoute(guide.slug)));
    assert(!/preventivo gratuito|risparmio garantito|a partire da \d|entro 35 km|garanzia (di )?10 anni|progetti realizzati|clienti soddisfatti/i.test(text), guide.slug);
    if (guide.quote !== 'pompe-di-calore') assert(!/gratuit/i.test(text), `${guide.slug}: “gratuito” è confermato solo per il sopralluogo pompe di calore`);
    assert(/Fonti consultate/.test(text) && guide.sources.length >= 3, `${guide.slug}: fonti`);
  }
});

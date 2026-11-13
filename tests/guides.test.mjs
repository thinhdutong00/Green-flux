import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { loadGuides, guideRoutes, guideRoute, guideIndexRoute, guideIndexLabel } from '../scripts/render-guides.mjs';

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

const content = JSON.parse(readFileSync('content/site-content.json', 'utf8'));
const serviceIds = new Set(content.services.map(service => service.quote));
const htmlFiles = (dir = 'public') => readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? htmlFiles(`${dir}/${entry.name}`) : entry.name === 'index.html' ? [`${dir}/${entry.name}`] : []);
const links = html => [...html.matchAll(/<a\b[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/g)].map(match => [match[1], textOnly(match[2]).trim()]);

test('Guides and the hub start and end with a link to the real quote form, without a second form', () => {
  for (const route of routes) {
    const html = read(route), guide = guides.find(item => guideRoute(item.slug) === route);
    const expected = guide ? `/preventivo/?servizio=${guide.quote}` : '/preventivo/';
    if (guide) assert(serviceIds.has(guide.quote), `${route}: servizio non previsto dal modulo`);
    assert(!/<form\b/.test(html), `${route}: nessun modulo in pagina`);
    const hero = html.match(/<section class="internal-hero-shell">[\s\S]*?<main/)[0];
    const box = hero.match(/<div class="gf-hero-action gd-request"><a class="gd-button" href="([^"]+)"><span>([^<]+)<\/span><span class="gd-button-icon"><svg[\s\S]*?<\/svg><\/span><\/a><p>([\s\S]*?)<\/p><\/div>/);
    assert(box, `${route}: pulsante nella testata`);
    assert.equal(box[1], expected, route);
    const label = guide?.requestLabel || 'Richiedi un preventivo';
    assert.equal(box[2], label, route);
    assert(box[3].length > 40 && box[3].length < 170, `${route}: riga sotto il pulsante`);
    assert.equal(html.split('gd-request').length - 1, 1, `${route}: una sola richiesta nella testata`);
    const own = html.replace(/<section class="header-primary">[\s\S]*?<\/section>\s*<section class="internal-hero-section">/, '');
    assert(!own.includes('↗'), `${route}: nessuna freccia a carattere nei contenuti (su iPhone diventa un’emoji)`);
    const cta = html.match(/<section class="cta-section">[\s\S]*?<\/section>/)[0];
    assert(cta.includes(`href="${expected}"`) && cta.includes(`<p class="primary-button-text">${label}</p>`), `${route}: chiusura`);
    assert.equal((cta.match(/class="gf-cta-note/g) || []).length, 2, `${route}: testo dell’argomento e passaggio successivo`);
    assert(/Nel modulo indichi i recapiti e il comune/.test(textOnly(cta)), route);
    assert(!/[?&](nome|email|telefono|name|phone)=/i.test(html), `${route}: nessun dato personale negli indirizzi`);
    assert(!/gd-contact/.test(html), `${route}: il riquadro laterale è stato sostituito`);
  }
});

test('The hub is “Guide e consigli”, groups every guide and each guide leads back to it', () => {
  const index = read(guideIndexRoute);
  assert.match(index, new RegExp(`<h1[^>]*>${guideIndexLabel}</h1>`));
  assert.match(index, /<title>Guide e consigli[^<]* \| Green Flux<\/title>/);
  const sections = [...index.matchAll(/<section class="gf-section[^"]*" id="([a-z]+)"><div class="gf-wrap"><h2>[\s\S]*?<\/section>/g)];
  assert(sections.length >= 2);
  let listed = 0;
  for (const [section, id] of sections) {
    const cards = [...section.matchAll(/<a class="gf-catalog-card" href="([^"]+)"><img title="[^"]{10,}"[^>]* alt="[^"]{10,}"[^>]*><div><h3>([^<]+)<\/h3><p>([^<]{40,})<\/p>/g)];
    assert(cards.length > 0, `gruppo vuoto: ${id}`);
    assert(index.includes(`<a href="#${id}">`), `argomento senza collegamento: ${id}`);
    listed += cards.length;
  }
  assert.equal(listed, guides.length, 'ogni guida compare una volta, con titolo, descrizione e link');
  for (const guide of guides) {
    const html = read(guideRoute(guide.slug));
    assert(html.includes(`<a href="${guideIndexRoute}">${guideIndexLabel}</a><span aria-hidden="true">/</span><span aria-current="page">`), `${guide.slug}: percorso`);
    assert(html.includes(`Torna a ${guideIndexLabel}`), guide.slug);
  }
});

test('The shared menu shows “Informazioni” with “Chi siamo” and “Guide e consigli”, and no single guide', () => {
  const pages = htmlFiles().map(file => [file, readFileSync(file, 'utf8')]).filter(([, html]) => html.includes('gf-desktop-header'));
  assert(pages.length >= 30);
  for (const [file, html] of pages) {
    const nav = html.match(/<nav class="nav-menu vg-nav-menu"[\s\S]*?<\/nav>/)[0];
    assert(!/>Chi siamo<\/a>\{?\{?DESKTOP|class="nav-link header vg-nav-link" href="\/chi-siamo\/">Chi siamo/.test(nav), `${file}: “Chi siamo” non è più una voce principale`);
    const trigger = nav.match(/<button class="services-nav-trigger" type="button" aria-expanded="false" aria-controls="desktop-info-menu">Informazioni /);
    assert(trigger, `${file}: voce Informazioni`);
    const panel = nav.match(/<div class="services-menu" id="desktop-info-menu" inert>[\s\S]*?<\/div>\s*<\/div>/)[0];
    assert.deepEqual(links(panel), [['/chi-siamo/', 'Chi siamo'], [guideIndexRoute, guideIndexLabel]], file);
    assert.equal(links(nav).filter(([, label]) => label === guideIndexLabel).length, 1, `${file}: una sola voce Guide e consigli`);
    assert(!links(nav).some(([href]) => /^\/guide\/[^/]+\//.test(href)), `${file}: nessuna guida singola nel menu`);
  }
  const mobile = readFileSync('public/assets/js/mobile-header-template.mjs', 'utf8').replace(/\\"/g, '"');
  const home = readFileSync('public/index.html', 'utf8');
  for (const [name, source, prefix] of [['menu mobile', mobile, 'gf-'], ['menu mobile della home', home, '']]) {
    const section = source.match(new RegExp(`<details class="${prefix}menu-section" name="mobile-navigation"><summary><span>Informazioni</span>[\\s\\S]*?</details>`));
    assert(section, name);
    assert.deepEqual(links(section[0]), [['/chi-siamo/', 'Chi siamo'], [guideIndexRoute, guideIndexLabel]], name);
    assert(!new RegExp(`class="${prefix}menu-primary-link" href="/chi-siamo/"`).test(source), `${name}: “Chi siamo” solo nel sottomenu`);
  }
});

test('Guides carry described images and no filler headings', () => {
  for (const route of routes) {
    const html = read(route), guide = guides.find(item => guideRoute(item.slug) === route);
    const heroImage = html.match(/<img title="([^"]*)"[^>]*class="hero-bg-image"[^>]*>|<img class="hero-bg-image"[^>]*>/)[0];
    assert(/ alt="[^"]{15,}"/.test(heroImage) && / title="[^"]{10,}"/.test(heroImage), `${route}: immagine della testata con testo alternativo e titolo`);
    assert(!/Parti dal dubbio|Dubbi che restano|Per continuare|Come usare le guide|non un’opinione|Qui serve franchezza/.test(textOnly(html)), `${route}: titoli e frasi di riempimento`);
    if (!guide) continue;
    const figures = [...html.matchAll(/<figure class="gd-figure"><img title="([^"]+)"[^>]* alt="([^"]+)"[^>]* width="\d+" height="\d+"[^>]*><figcaption>([\s\S]*?)<\/figcaption><\/figure>/g)];
    assert.equal(figures.length, 1, `${route}: un’immagine nel testo`);
    assert(figures[0][1].length > 15 && figures[0][2].length > 25 && /Immagine illustrativa\./.test(figures[0][3]), `${route}: titolo, testo alternativo e didascalia`);
    assert(existsSync(`public/assets/${guide.figure.image}`) && guide.figure.image !== guide.image, `${route}: immagine diversa da quella della testata`);
    assert(!html.includes('<!--figure-->'), route);
  }
});

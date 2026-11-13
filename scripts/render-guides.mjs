// Guide di approfondimento: pagine sotto /guide/, generate da content/guides/*.html, e pagina di raccolta
// “Guide e consigli” (/guide/). Il modulo usa la stessa impaginazione delle pagine interne (page/write di
// render-site.mjs) e non modifica template, footer o contenuti delle altre pagine.
import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const guidesDir = join(root, 'content/guides');
export const guideIndexRoute = '/guide/';
export const guideIndexLabel = 'Guide e consigli';
export const guideRoute = slug => `/guide/${slug}/`;

// Ordine e titoli dei gruppi nell'indice: il lettore cerca per esigenza, non per tecnologia.
const groups = [
  ['costi', 'Costi, preventivi e incentivi', 'Quanto si spende, che cosa comprende un preventivo e quali agevolazioni si possono chiedere.'],
  ['casa', 'La pompa di calore nella tua casa', 'Termosifoni, caldaia da sostituire, appartamento, potenza: le verifiche che cambiano il progetto.'],
  ['scelta', 'Conviene? Confronti e consumi', 'Criteri per capire se è la scelta adatta e quando valutare un’altra soluzione.'],
  ['altri', 'Fotovoltaico, climatizzazione, ventilazione e ristrutturazioni', 'Gli altri impianti che Green Flux progetta e installa.']
];

const formatDate = iso => new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(iso + 'T12:00:00Z'));

export async function loadGuides() {
  let files = [];
  try { files = (await readdir(guidesDir)).filter(name => name.endsWith('.html')).sort(); } catch { return []; }
  const guides = [];
  for (const name of files) {
    const raw = await readFile(join(guidesDir, name), 'utf8');
    const match = raw.match(/^<!--\s*(\{[\s\S]*?\})\s*-->\s*/);
    if (!match) throw new Error(`Guida senza intestazione JSON: ${name}`);
    const meta = JSON.parse(match[1]);
    meta.slug = name.replace(/\.html$/, '');
    meta.body = raw.slice(match[0].length).trim();
    for (const key of ['title', 'description', 'lead', 'group', 'card', 'updated', 'published', 'image', 'imageAlt', 'imageTitle', 'ctaTitle', 'requestText', 'ctaText', 'faqs', 'sources'])
      if (meta[key] === undefined) throw new Error(`Guida ${name}: manca "${key}"`);
    if (!groups.some(([id]) => id === meta.group)) throw new Error(`Guida ${name}: gruppo sconosciuto "${meta.group}"`);
    guides.push(meta);
  }
  // Le bozze restano nel repository ma non vengono generate, collegate o inserite nella sitemap.
  return guides.filter(guide => guide.status !== 'draft').sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
}

export async function guideRoutes() {
  const guides = await loadGuides();
  return guides.length ? [guideIndexRoute, ...guides.map(guide => guideRoute(guide.slug))] : [];
}

export async function renderGuides({ page, write, esc, link, quote, img, origin }) {
  const guides = await loadGuides();
  if (!guides.length) return [];
  const bySlug = Object.fromEntries(guides.map(guide => [guide.slug, guide]));
  const jsonLd = data => `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`;
  const guideCards = list => `<div class="gf-information-grid">${list.map(guide => `<article class="gf-information-item gd-card"><h3>${link(guideRoute(guide.slug), guide.title)}</h3><p>${esc(guide.card)}</p></article>`).join('')}</div>`;
  // Componenti riutilizzabili per la richiesta di preventivo, usati da ogni guida e da “Guide e consigli”.
  // Sono collegamenti al modulo reale di /preventivo/: nessun secondo modulo, nessun dato raccolto in pagina.
  const requestLabel = 'Richiedi un preventivo';
  const nextStep = 'Nel modulo indichi i recapiti e il comune dell’immobile: ti ricontattiamo per capire il lavoro e concordare il sopralluogo.';
  // A) Nella testata: pulsante verso il modulo e, sotto, una riga su che cosa succede dopo la richiesta.
  // La freccia è un disegno SVG: il carattere «↗» su iPhone viene mostrato come emoji.
  const arrowIcon = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M7 17 17 7M8 7h9v9"/></svg>';
  const requestBox = (text, url) => `<div class="gf-hero-action gd-request"><a class="gd-button" href="${esc(url)}"><span>${requestLabel}</span><span class="gd-button-icon">${arrowIcon}</span></a><p>${esc(text)}</p></div>`;
  // Immagini: testo alternativo e titolo descrivono il soggetto; la didascalia dichiara che sono illustrative.
  const picture = (asset, alt, title, eager = false) => img(asset, alt, '', eager).replace('<img ', `<img title="${esc(title)}" `);
  const figure = data => data ? `<figure class="gd-figure">${picture(data.image, data.alt, data.title)}<figcaption>${esc(data.caption)} <span>Immagine illustrativa.</span></figcaption></figure>` : '';
  const heroImage = (html, alt, title) => swap(html, /(<img class="hero-bg-image"[^>]*?) alt=""/, (_, before) => `${before} alt="${esc(alt)}" title="${esc(title)}"`, 'immagine della testata');
  // B) Chiusura della pagina: stessa sezione delle pagine interne, con testo dell’argomento e passaggio successivo.
  const finalCta = text => `<div class="gd-cta-text"><p class="gf-cta-note">${esc(text)}</p><p class="gf-cta-note gd-cta-step">${esc(nextStep)}</p></div>`;
  const swap = (html, pattern, replacement, what) => { if (!pattern.test(html)) throw new Error(`Guide: ${what} non trovato nella pagina generata`); return html.replace(pattern, replacement); };
  const withRequest = (html, { requestText, ctaText, url, imageAlt, imageTitle }) => {
    html = heroImage(html, imageAlt, imageTitle);
    html = swap(html, /<div class="gf-hero-action">[\s\S]*?<\/p><\/div>/, () => requestBox(requestText, url), 'riquadro della testata');
    html = swap(html, /(<section class="cta-section">[\s\S]*?)<p class="gf-cta-note">[\s\S]*?<\/p>/, (_, before) => before + finalCta(ctaText), 'testo della chiusura');
    return swap(html, /(<section class="cta-section">[\s\S]*?<p class="primary-button-text">)[^<]*(<\/p>)/, (_, before, after) => before + requestLabel + after, 'pulsante della chiusura');
  };
  const finish = (html, head) => html
    .replace('<meta property="og:type" content="website">', '<meta property="og:type" content="article">')
    .replace('</head>', `<link rel="stylesheet" href="/assets/css/guides.css">${head}</head>`);

  for (const guide of guides) {
    const route = guideRoute(guide.slug);
    for (const slug of guide.related || []) if (!bySlug[slug]) throw new Error(`Guida ${guide.slug}: collegamento a guida inesistente "${slug}"`);
    const headings = [...guide.body.matchAll(/<h2 id="([^"]+)">([\s\S]*?)<\/h2>/g)].map(([, id, text]) => [id, text.replace(/<[^>]+>/g, '')]);
    const requestUrl = quote(guide.quote);
    const toc = headings.length > 2 ? `<nav class="gd-toc" aria-label="In questa guida"><p class="gf-eyebrow">In questa guida</p><ul>${headings.map(([id, text]) => `<li><a href="#${id}">${esc(text)}</a></li>`).join('')}</ul></nav>` : '';
    const aside = toc ? `<aside class="gd-aside">${toc}</aside>` : '';
    const related = (guide.related || []).map(slug => bySlug[slug]);
    const service = guide.service ? `<p class="gf-support-link">${esc(guide.service[2] || 'Il servizio collegato a questa guida:')} ${link(guide.service[0], guide.service[1] + ' →')}</p>` : '';
    const body = `<section class="gf-section gd-article"><div class="gf-wrap gd-layout"><article class="gd-prose"><p class="gd-meta">Guida Green Flux · aggiornata il ${esc(formatDate(guide.updated))}</p>${guide.body.replace('<!--figure-->', figure(guide.figure))}</article>${aside}</div></section>
    ${guide.faqs.length ? `<section class="gf-section gf-paper" id="domande"><div class="gf-wrap gf-faq-layout"><div><h2>Domande frequenti</h2></div><div class="gf-faq-list">${guide.faqs.map(([question, answer]) => `<details><summary>${esc(question)}</summary><p>${esc(answer)}</p></details>`).join('')}</div></div></section>` : ''}
    <section class="gf-section" id="approfondimenti"><div class="gf-wrap">${related.length ? `<h2>Guide collegate</h2>${guideCards(related)}` : ''}${service}<p class="gd-area">Green Flux ha sede a Padova, in Via Trieste 19. Per sapere se lavoriamo nel tuo comune indicalo nella richiesta: lo verifichiamo al primo contatto.</p><div class="gd-sources" id="fonti"><h3>Fonti consultate</h3><p>Verificate il ${esc(formatDate(guide.updated))}. Norme, incentivi e prezzi cambiano: i riferimenti servono a orientarsi e non sostituiscono la verifica sul tuo caso.</p><ul>${guide.sources.map(([label, url]) => `<li>${url ? `<a href="${esc(url)}">${esc(label)}</a>` : esc(label)}</li>`).join('')}</ul><p>${link(guideIndexRoute, `Torna a ${guideIndexLabel} →`)}</p></div></div></section>`;
    const graph = [
      { '@type': 'Article', '@id': origin + route + '#article', headline: guide.title, description: guide.description, inLanguage: 'it-IT', datePublished: guide.published, dateModified: guide.updated, image: [`${origin}/assets/${guide.image}`, ...(guide.figure ? [`${origin}/assets/${guide.figure.image}`] : [])], author: { '@id': origin + '/#organization' }, publisher: { '@id': origin + '/#organization' }, mainEntityOfPage: { '@id': origin + route } },
      { '@type': 'BreadcrumbList', itemListElement: [['Home', '/'], [guideIndexLabel, guideIndexRoute], [guide.title, route]].map(([name, url], index) => ({ '@type': 'ListItem', position: index + 1, name, item: origin + url })) }
    ];
    if (guide.faqs.length) graph.push({ '@type': 'FAQPage', '@id': origin + route + '#domande', mainEntity: guide.faqs.map(([question, answer]) => ({ '@type': 'Question', name: question, acceptedAnswer: { '@type': 'Answer', text: answer } })) });
    let html = page(route, guide.title, guide.lead, body, { image: guide.image, kicker: guide.kicker || 'Guide Green Flux', quote: guide.quote, seoTitle: guide.seoTitle || guide.title, metaDescription: guide.description, ctaTitle: guide.ctaTitle });
    html = finish(withRequest(html, { requestText: guide.requestText, ctaText: guide.ctaText, url: requestUrl, imageAlt: guide.imageAlt, imageTitle: guide.imageTitle }), jsonLd({ '@context': 'https://schema.org', '@graph': graph }))
      .replace('<span aria-current="page">', `${link(guideIndexRoute, guideIndexLabel)}<span aria-hidden="true">/</span><span aria-current="page">`);
    await write(route, html, guide.title, 'guide');
  }

  const indexTitle = guideIndexLabel;
  const indexLead = `${guides.length} guide su pompe di calore, fotovoltaico, climatizzazione, ventilazione e ristrutturazioni: costi, incentivi, verifiche tecniche e criteri di scelta, con le fonti e la data dell’ultimo aggiornamento.`;
  const shown = groups.map(([id, title, text]) => [id, title, text, guides.filter(guide => guide.group === id)]).filter(([, , , list]) => list.length);
  const hubCards = list => `<div class="gf-catalog-grid gd-catalog">${list.map(guide => `<a class="gf-catalog-card" href="${guideRoute(guide.slug)}">${picture(guide.image, guide.imageAlt, guide.imageTitle)}<div><h3>${esc(guide.title)}</h3><p>${esc(guide.card)}</p><span class="gf-text-link">Leggi la guida <span aria-hidden="true">→</span></span></div></a>`).join('')}</div>`;
  const indexBody = `<section class="gf-section"><div class="gf-wrap"><h2>Che cosa trovi in queste guide</h2><p class="gf-section-lead">Le guide sono pubblicate da Green Flux, impresa di impianti con sede a Padova. Riportano prezzi di mercato, incentivi e norme con la fonte e la data dell’ultima verifica. Non contengono prezzi Green Flux: quelli si definiscono con il preventivo, dopo il sopralluogo.</p><nav class="gd-topics" aria-label="Argomenti delle guide"><ul>${shown.map(([id, title, , list]) => `<li><a href="#${id}">${esc(title)} <span>${list.length}</span></a></li>`).join('')}</ul></nav></div></section>
  ${shown.map(([id, title, text, list], index) => `<section class="gf-section${index % 2 === 0 ? ' gf-paper' : ''}" id="${id}"><div class="gf-wrap"><h2>${esc(title)}</h2><p class="gf-section-lead">${esc(text)}</p>${hubCards(list)}</div></section>`).join('')}`;
  const indexGraph = { '@context': 'https://schema.org', '@graph': [
    { '@type': 'CollectionPage', '@id': origin + guideIndexRoute + '#guide', name: indexTitle, inLanguage: 'it-IT', hasPart: guides.map(guide => ({ '@type': 'Article', headline: guide.title, url: origin + guideRoute(guide.slug) })) },
    { '@type': 'BreadcrumbList', itemListElement: [['Home', '/'], [guideIndexLabel, guideIndexRoute]].map(([name, url], index) => ({ '@type': 'ListItem', position: index + 1, name, item: origin + url })) }
  ] };
  const indexPage = page(guideIndexRoute, indexTitle, indexLead, indexBody, { image: 'images/energy-consultation-1600.webp', kicker: 'Green Flux · Informazioni', seoTitle: 'Guide e consigli su pompe di calore, fotovoltaico e impianti', metaDescription: 'Guide e consigli Green Flux su costi, incentivi, compatibilità e scelta degli impianti: pompe di calore, fotovoltaico, climatizzazione, ventilazione e ristrutturazioni.', ctaTitle: 'Vuoi una valutazione sulla tua casa?' });
  const indexHtml = finish(withRequest(indexPage, { requestText: 'Indica il lavoro che hai in mente e il comune dell’immobile: ti ricontattiamo per capire l’intervento e concordare il sopralluogo.', ctaText: 'Per passare dalle indicazioni generali alla tua casa servono un sopralluogo e i dati dell’impianto che hai oggi.', url: quote(), imageAlt: 'Due persone valutano documenti e progetto di un impianto davanti a un computer', imageTitle: 'Guide e consigli Green Flux sugli impianti di casa' }), jsonLd(indexGraph))
    .replace('<meta property="og:type" content="article">', '<meta property="og:type" content="website">');
  await write(guideIndexRoute, indexHtml, indexTitle, 'guide-index');
  return [guideIndexRoute, ...guides.map(guide => guideRoute(guide.slug))];
}

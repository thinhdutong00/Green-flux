import { readFile, writeFile, mkdir, rm, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join, dirname, resolve } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const publicRoot = join(root, 'public');
export let content = JSON.parse(await readFile(join(root, 'content/site-content.json'), 'utf8'));
let profile = JSON.parse(await readFile(join(root, 'content/green-flux-profile.json'), 'utf8'));
const previousRoutes = JSON.parse(await readFile(join(root, 'content/previous-routes.json'), 'utf8'));
let imageDimensions = JSON.parse(await readFile(join(root, 'content/image-dimensions.json'), 'utf8'));
const origin = 'https://green-flux-nine.vercel.app';
const supportRoute = '/servizi/progettazione-e-supporto/';
export const serviceRoute = slug => `/servizi/${slug}/`;
export let routes = ['/', '/servizi/', ...content.services.map(s => serviceRoute(s.slug)), supportRoute, '/chi-siamo/', '/contatti/', '/preventivo/', '/privacy-policy/', '/cookie-policy/', '/termini-condizioni/'];
const esc = value => String(value).replace(/[&<>"']/g, x => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
const paragraphs = values => values.map(t => `<p>${esc(t)}</p>`).join('');
const list = values => `<ul>${values.map(t => `<li>${esc(t)}</li>`).join('')}</ul>`;
const link = (url, label, cls = '') => `<a${cls ? ` class="${cls}"` : ''} href="${esc(url)}">${esc(label)}</a>`;
const quote = id => `/preventivo/${id ? '?servizio=' + encodeURIComponent(id) : ''}`;
const template = async name => readFile(join(root, `templates/${name}.html`), 'utf8');
const fill = (text, values) => text.replace(/\{\{([^{}]+)\}\}/g, (all, key) => values[key] ?? all);

function redirectFor(route) {
  const slug = route.split('/').filter(Boolean).at(-1);
  const direct = {
    '/metodo/': '/chi-siamo/#come-lavoriamo', '/progetti/': '/servizi/',
    '/progetti/costruzioni/': serviceRoute('impianti-completi'), '/progetti/fotovoltaico/': serviceRoute('fotovoltaico'),
    '/blog/': '/servizi/', '/servizi/consulenza/': '/contatti/',
    '/servizi/fotovoltaico-residenziale/': serviceRoute('fotovoltaico'), '/servizi/fotovoltaico-aziendale/': serviceRoute('fotovoltaico'),
    '/servizi/edilizia/': serviceRoute('impianti-completi'), '/servizi/manutenzione/': '/contatti/',
    '/servizi/batterie-accumulo/': serviceRoute('fotovoltaico')
  };
  for (const s of content.support) direct[serviceRoute(s.id)] = supportRoute + '#' + s.id;
  if (direct[route]) return direct[route];
  if (route.startsWith('/zone/')) {
    const topic = {'fotovoltaico': serviceRoute('fotovoltaico'), 'pompe-calore': serviceRoute('pompe-calore'), 'climatizzazione': serviceRoute('climatizzazione'), 'consulenza-energetica': supportRoute, 'efficientamento-energetico': serviceRoute('impianti-completi'), 'batterie-accumulo': serviceRoute('fotovoltaico'), 'manutenzione': '/contatti/'};
    return topic[slug] || '/contatti/#dove-operiamo';
  }
  if (route.startsWith('/blog/')) {
    if (/pompa/.test(slug)) return serviceRoute('pompe-calore');
    if (/climatizzatore/.test(slug)) return serviceRoute('climatizzazione');
    if (/diagnosi/.test(slug)) return supportRoute + '#diagnosi-energetiche';
    if (/aziende-green|recensioni|installatori/.test(slug)) return '/chi-siamo/#come-lavoriamo';
    if (/manutenzione|pulizia/.test(slug)) return '/contatti/';
    return serviceRoute('fotovoltaico');
  }
  throw new Error(`Missing redirect for ${route}`);
}
export let redirects = Object.fromEntries(previousRoutes.filter(r => !routes.includes(r)).map(r => [r, redirectFor(r)]));
function rewriteLinks(text) {
  return text.replace(/href="([^"#]+)(#[^"]*)?"/g, (all, path, hash = '') => redirects[path] ? `href="${esc(redirects[path])}${redirects[path].includes('#') ? '' : hash}"` : all);
}
const sections = pairs => pairs.map(([title, text]) => `<article class="gf-information-item"><h3>${esc(title)}</h3><p>${esc(text)}</p></article>`).join('');
function navMarkup(prefix = '') {
  const arrow = '<span aria-hidden="true">⌄</span>';
  return `${link('/', 'Home', prefix+'menu-primary-link')}${link('/chi-siamo/', 'Chi siamo', prefix+'menu-primary-link')}
  <details class="${prefix}menu-section" name="mobile-navigation"><summary><span>Impianti</span>${arrow}</summary><div class="${prefix}menu-section-links">${content.services.map(s => link(serviceRoute(s.slug), s.title)).join('')}${link('/servizi/', 'Tutti gli impianti', prefix+'menu-all-link')}</div></details>
  <details class="${prefix}menu-section" name="mobile-navigation"><summary><span>Progettazione e supporto</span>${arrow}</summary><div class="${prefix}menu-section-links">${content.support.map(s => link(supportRoute+'#'+s.id, s.title)).join('')}${link(supportRoute, 'Come ti affianchiamo', prefix+'menu-all-link')}</div></details>${link('/contatti/', 'Contatti', prefix+'menu-primary-link')}`;
}
function footerMarkup() {
  return `<footer class="footer-section section-padding"><div class="vg-layout-blockcontainer container vg-container"><div class="content-wrapper footer">
  <div class="content-top footer"><div class="footer-content-left"><h2 class="heading-3">Il partner tecnico per i tuoi progetti.</h2><p class="footer-summary">Impianti tecnologici, competenze idrauliche ed elettriche. Dalla scelta del sistema alla sua realizzazione.</p></div></div>
  <div class="footer-link-columns"><nav class="footer-link-group" aria-label="Impianti"><p class="footer-link-title">Impianti</p><ul class="footer-link-list">${content.services.map(s => `<li>${link(serviceRoute(s.slug),s.title)}</li>`).join('')}</ul></nav>
  <nav class="footer-link-group" aria-label="Supporto al progetto"><p class="footer-link-title">Progettazione e supporto</p><ul class="footer-link-list">${content.support.map(s => `<li>${link(supportRoute+'#'+s.id,s.title)}</li>`).join('')}</ul></nav>
  <nav class="footer-link-group" aria-label="Azienda"><p class="footer-link-title">Green Flux</p><ul class="footer-link-list">${[['/chi-siamo/','Chi siamo'],['/chi-siamo/#come-lavoriamo','Come lavoriamo'],['/contatti/','Contatti'],['/preventivo/','Richiedi un preventivo']].map(([u,t])=>`<li>${link(u,t)}</li>`).join('')}</ul></nav>
  <address class="footer-company-info"><p class="footer-link-title">Contatti</p><p>GREEN FLUX srls</p><p>Via Trieste, 19<br>35121 Padova (PD)</p><p>${link('tel:+393755521420','+39 375 552 1420')}</p><p>${link('mailto:info@green-flux.com','info@green-flux.com')}</p></address></div>
  <div aria-label="Green Flux" class="footer-brand-text">Green Flux</div><div class="content-bottom footer"><p class="body-text-16">2026 © Green Flux. Tutti i diritti riservati.</p><nav class="navitem-list footer" aria-label="Informazioni legali">${[['/privacy-policy/','Privacy'],['/cookie-policy/','Cookie'],['/termini-condizioni/','Termini e condizioni']].map(([u,t])=>link(u,t,'navtext')).join('')}</nav></div></div></div></footer>`;
}
function img(asset, alt, cls = '', eager = false) {
  const generated = asset.startsWith('images/');
  const full = `/assets/${asset}`;
  const [width, height] = imageDimensions[full];
  const srcset = generated ? `${full.replace(/-\d+\.webp$/, '-480.webp')} 480w, ${full.replace(/-\d+\.webp$/, '-960.webp')} 960w, ${full} ${asset.match(/-(\d+)\.webp$/)[1]}w` : `${full.replace('-750.webp','-400.webp')} 400w, ${full} 750w`;
  return `<img class="${cls}" src="${full}" srcset="${srcset}" sizes="${eager?'100vw':'(max-width: 767px) 100vw, 50vw'}" alt="${esc(alt)}" width="${width}" height="${height}" loading="${eager?'eager':'lazy'}" decoding="async"${eager?' fetchpriority="high"':''}${asset.includes('heat-pump-home')?' data-image-asset="heat-pump-home"':''}>`;
}
function cards(items) {
  return `<div class="gf-catalog-grid">${items.map(s => `<a class="gf-catalog-card" href="${serviceRoute(s.slug)}">${img(s.image,s.imageAlt)}<div><p class="gf-eyebrow">${esc(s.category)}</p><h3>${esc(s.title)}</h3><p>${esc(s.summary)}</p><span class="gf-text-link">Scopri il servizio <span aria-hidden="true">↗</span></span></div></a>`).join('')}</div>`;
}
function schema(route, title, description) {
  return {'@context':'https://schema.org','@graph':[{'@type':'Organization','@id':origin+'/#organization','name':'Green Flux','legalName':'GREEN FLUX srls','url':origin+'/','telephone':'+393755521420','email':'info@green-flux.com','address':{'@type':'PostalAddress','streetAddress':'Via Trieste, 19','postalCode':'35121','addressLocality':'Padova','addressRegion':'PD','addressCountry':'IT'},'sameAs':Object.values(profile.social)}, {'@type':'WebPage','@id':origin+route,'url':origin+route,'name':title,description,'inLanguage':'it-IT','about':{'@id':origin+'/#organization'}}]};
}

export async function renderSite() {
  content = JSON.parse(await readFile(join(root, 'content/site-content.json'), 'utf8'));
  profile = JSON.parse(await readFile(join(root, 'content/green-flux-profile.json'), 'utf8'));
  imageDimensions = JSON.parse(await readFile(join(root, 'content/image-dimensions.json'), 'utf8'));
  routes = ['/', '/servizi/', ...content.services.map(s => serviceRoute(s.slug)), supportRoute, '/chi-siamo/', '/contatti/', '/preventivo/', '/privacy-policy/', '/cookie-policy/', '/termini-condizioni/'];
  redirects = Object.fromEntries(previousRoutes.filter(r => !routes.includes(r)).map(r => [r, redirectFor(r)]));
  const header = await template('header');
  const footer = footerMarkup();
  const ctaTemplate = await template('cta');
  const audit = {};
  async function write(route, html, title) {
    html = rewriteLinks(html);
    if (/\{\{[^{}]+\}\}/.test(html)) throw new Error(`Unfilled template in ${route}`);
    const target = join(publicRoot, route, 'index.html');
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, html);
    audit[route] = { title, source_url: content.company_source, kind: 'canonical' };
  }
  function page(route, title, lead, body, options = {}) {
    const asset = options.image || 'images/heat-pump-home-1600.webp';
    const hero = `<section class="internal-hero-shell">${img(asset,'','hero-bg-image',true)}<section class="header-primary">${header}</section><section class="internal-hero-section"><div class="vg-layout-blockcontainer container vg-container"><div class="internal-hero-content"><p class="internal-hero-kicker">${esc(options.kicker || 'Green Flux · Impianti tecnologici')}</p><h1 class="internal-hero-heading">${esc(title)}</h1><p class="internal-hero-text">${esc(lead)}</p></div></div></section></section>`;
    const cta = options.cta === false ? '' : fill(ctaTemplate, {CTA_TITLE:esc(options.ctaTitle || 'Parliamo del tuo impianto.'),QUOTE_URL:quote(options.quote)});
    return `<!doctype html><html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(title)} | Green Flux</title><meta name="description" content="${esc(lead)}"><link rel="canonical" href="${origin+route}"><link rel="icon" href="/assets/favicon.ico"><meta property="og:title" content="${esc(title)} | Green Flux"><meta property="og:description" content="${esc(lead)}"><meta property="og:url" content="${origin+route}"><meta property="og:image" content="${origin}/assets/${asset}"><meta property="og:type" content="website"><meta name="twitter:card" content="summary_large_image"><link rel="preload" href="/assets/fonts/plus-jakarta-sans-400.woff2" as="font" type="font/woff2" crossorigin>${['site','green-flux','brand','desktop-header','editorial'].map(name=>`<link rel="stylesheet" href="/assets/css/${name}.css">`).join('')}<script type="application/ld+json">${JSON.stringify(schema(route,title,lead)).replace(/</g,'\\u003c')}</script></head><body class="gf-content-page"><a class="vg-skip-link" href="#contenuto">Vai al contenuto</a>${hero}<main id="contenuto"><nav class="gf-crumbs gf-wrap" aria-label="Percorso">${link('/','Home')}<span aria-hidden="true">/</span>${route.startsWith('/servizi/')&&route!='/servizi/'?link('/servizi/','Impianti e servizi')+'<span aria-hidden="true">/</span>':''}<span aria-current="page">${esc(title)}</span></nav>${body}${cta}</main>${footer}<script defer src="/assets/js/site.js"></script><script type="module" src="/assets/js/green-flux.mjs"></script></body></html>`;
  }

  for (const s of content.services) {
    const body = `<section class="gf-section"><div class="gf-wrap gf-intro"><div><p class="gf-eyebrow">Il servizio</p><h2>${esc(s.introTitle)}</h2>${paragraphs(s.overview)}</div><aside class="gf-preparation"><h2>Per il primo confronto</h2><p>Se li hai già disponibili, questi elementi aiutano a descrivere il progetto.</p>${list(s.prepare)}${link(quote(s.quote),'Parla del tuo progetto ↗','gf-button')}</aside></div></section>
    <section class="gf-section gf-paper" id="quando-valutarlo"><div class="gf-wrap"><p class="gf-eyebrow">Le tue esigenze</p><h2>Quando valutarlo</h2><div class="gf-information-grid gf-three">${sections(s.situations)}</div></div></section>
    <section class="gf-section" id="progetto"><div class="gf-wrap"><p class="gf-eyebrow">Le scelte tecniche</p><h2>${esc(s.checksTitle)}</h2><div class="gf-information-grid">${sections(s.checks)}</div><p class="gf-support-link">Hai bisogno anche di un progetto, di una diagnosi o di supporto documentale? ${link(supportRoute,'Scopri i servizi che accompagnano l’impianto ↗')}</p></div></section>
    <section class="gf-section gf-paper" id="domande"><div class="gf-wrap gf-faq-layout"><div><p class="gf-eyebrow">Prima di decidere</p><h2>Le domande su ${esc(s.title.toLowerCase())}</h2></div><div class="gf-faq-list">${s.faqs.map(([q,a])=>`<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}</div></div></section>
    <section class="gf-section"><div class="gf-wrap"><h2>Nel progetto possono entrare anche</h2>${cards(s.related.map(id=>content.services.find(x=>x.slug===id)))}${s.sources.length?`<p class="gf-source-links">Approfondimenti tecnici: ${s.sources.map(x=>link(x.url,x.label)).join(' · ')}</p>`:''}</div></section>`;
    await write(serviceRoute(s.slug),page(serviceRoute(s.slug),s.title,s.lead,body,{image:s.image,kicker:s.category,quote:s.quote,ctaTitle:'Parliamo del tuo impianto.'}),s.title);
  }
  const hubBody = `<section class="gf-section"><div class="gf-wrap"><p class="gf-eyebrow">Gli impianti</p><h2>Scegli l’esigenza da cui partire</h2><p class="gf-section-lead">Riscaldamento, energia solare, aria, acqua e controllo: ogni pagina spiega a cosa serve la soluzione e quali aspetti valutare.</p>${cards(content.services)}</div></section>
  <section class="gf-section gf-paper"><div class="gf-wrap gf-intro"><div><p class="gf-eyebrow">I servizi tecnici</p><h2>Dal progetto alla gestione dei documenti</h2><p>Progettazione, pratiche e permessi, diagnosi energetiche, supporto per agevolazioni e formule assicurative accompagnano l’offerta Green Flux. Il perimetro si definisce sul singolo intervento.</p>${link(supportRoute,'Progettazione e supporto ↗','gf-button')}</div><div class="gf-information-grid gf-one">${sections([['Devi scegliere la tecnologia?','Parti dal problema che vuoi risolvere: comfort, consumi, acqua calda o ristrutturazione. Puoi chiedere un confronto anche senza avere già scelto l’impianto.'],['Devi coordinare più sistemi?','La pagina Impianti completi ti aiuta a definire funzioni, spazi, lavorazioni e priorità.']])}</div></div></section>`;
  await write('/servizi/',page('/servizi/','Impianti e servizi Green Flux','Dieci ambiti impiantistici e cinque servizi di supporto per abitazioni, attività e immobili industriali.',hubBody), 'Impianti e servizi Green Flux');

  const supportBody = `<section class="gf-section"><div class="gf-wrap"><h2>Cinque servizi, ciascuno con un compito preciso</h2><p class="gf-section-lead">Puoi indicare uno di questi servizi nella richiesta, oppure chiedere di inserirlo nel progetto dell’impianto. Attività, documenti e responsabilità vanno chiariti nella proposta.</p><nav class="gf-anchor-nav" aria-label="Servizi di supporto">${content.support.map(s=>link('#'+s.id,s.title)).join('')}</nav></div></section>
  ${content.support.map((s,i)=>`<section id="${s.id}" class="gf-section ${i%2===0?'gf-paper':''}"><div class="gf-wrap gf-support-detail"><div><p class="gf-eyebrow">0${i+1} · Servizio di supporto</p><h2>${esc(s.title)}</h2><p>${esc(s.text)}</p>${link(quote(s.id),'Richiedi questo servizio ↗','gf-button')}</div><dl><dt>Quando è utile</dt><dd>${esc(s.use)}</dd><dt>Cosa preparare</dt><dd>${esc(s.prepare)}</dd><dt>Cosa chiarire nella proposta</dt><dd>${esc(s.clarify)}</dd></dl></div></section>`).join('')}`;
  await write(supportRoute,page(supportRoute,'Progettazione e supporto','I servizi Green Flux che affiancano la scelta e la realizzazione degli impianti, con attività e responsabilità da definire sul progetto.',supportBody,{image:'images/project-plans-1600.webp',quote:'consulenza',ctaTitle:'Quale supporto serve al tuo progetto?'}),'Progettazione e supporto');

  const aboutBody = `<section class="gf-section"><div class="gf-wrap gf-intro"><div><p class="gf-eyebrow">Chi siamo</p><h2>Competenze idrauliche ed elettriche nello stesso progetto</h2><p>Green Flux realizza impianti per abitazioni, attività del terziario e immobili industriali. L’azienda si avvale di tecnici che operano da oltre 15 anni nel settore delle energie rinnovabili.</p><p>Il lavoro può partire dalla sostituzione di un generatore o coinvolgere più sistemi in una ristrutturazione. La collaborazione con professionisti qualificati permette di affiancare installazione, progettazione e servizi di supporto.</p>${link('/servizi/','Conosci gli impianti e i servizi ↗','gf-button')}</div>${img('images/technician-heat-pump-1086.webp','Immagine illustrativa: tecnico con tablet accanto a una pompa di calore','gf-editorial-photo')}</div></section>
  <section class="gf-section gf-paper" id="come-lavoriamo"><div class="gf-wrap"><p class="gf-eyebrow">Come impostare il lavoro insieme</p><h2>Un progetto chiaro prima dell’intervento</h2><div class="gf-information-grid">${sections([['01 · Le esigenze','Il confronto parte dall’immobile, dall’impianto esistente e da ciò che vuoi ottenere: comfort, acqua calda, produzione elettrica o un sistema completo.'],['02 · Le scelte tecniche','Progettazione e, quando richiesta, diagnosi energetica aiutano a valutare le soluzioni e i collegamenti con gli altri impianti.'],['03 · Il perimetro della proposta','Forniture, installazione, servizi, documenti e attività di altri professionisti devono risultare riconoscibili nella proposta concordata.'],['04 · La realizzazione','L’intervento viene affrontato con le competenze necessarie alla parte idraulica ed elettrica e con i professionisti coinvolti nel progetto.']])}</div></div></section>
  <section class="gf-section"><div class="gf-wrap gf-intro"><div><h2>Una sede, un contatto diretto</h2><p>GREEN FLUX srls ha sede in Via Trieste, 19, 35121 Padova (PD). Indica il comune dell’immobile per chiedere la disponibilità dell’intervento.</p>${link('/contatti/','Contatta Green Flux ↗','gf-button')}</div><div><h2>Hai già un tecnico di riferimento?</h2><p>Segnala i professionisti coinvolti e la fase del progetto. È utile chiarire fin dal primo confronto quali attività sono già definite e quali devono essere coordinate.</p></div></div></section>`;
  await write('/chi-siamo/',page('/chi-siamo/','Green Flux, il partner tecnico per i tuoi impianti','Competenze nelle energie rinnovabili, nell’idraulica e nell’elettrico per seguire il tuo progetto impiantistico.',aboutBody,{image:'images/technical-plant-1600.webp'}),'Chi siamo');

  const contactBody = `<section class="gf-section"><div class="gf-wrap gf-contact-grid"><div><p class="gf-eyebrow">Parliamone direttamente</p><h2>Di quale impianto hai bisogno?</h2><p>Indica il comune, la situazione attuale e il risultato che cerchi. Se hai già un progetto, segnala a che punto si trova.</p><p>${link('tel:+393755521420','+39 375 552 1420','gf-contact-link')}</p><p>${link('mailto:info@green-flux.com','info@green-flux.com','gf-contact-link')}</p><p>${link('https://wa.me/393755521420','Scrivi su WhatsApp ↗','gf-button')}</p><p>Preferisci una richiesta guidata? ${link('/preventivo/','Prepara il preventivo →')}</p></div><div>${await template('contact-form')}</div></div></section>
  <section class="gf-section gf-paper" id="dove-operiamo"><div class="gf-wrap gf-intro"><div><h2>Dove si trova il tuo immobile?</h2><p>La sede Green Flux è in Via Trieste, 19, 35121 Padova (PD).</p><p>Per abitazioni, attività e immobili industriali, la disponibilità dell’intervento si conferma direttamente con l’azienda indicando il comune e il tipo di lavoro.</p></div><div><h2>Per rendere utile il primo confronto</h2>${list(['Descrivi l’impianto o il problema da affrontare.','Indica se si tratta di sostituzione, nuova installazione o ristrutturazione.','Segnala le tempistiche desiderate e gli altri lavori previsti.'])}</div></div></section>`;
  await write('/contatti/',page('/contatti/','Contatta Green Flux','Raccontaci il tuo immobile e le tue esigenze. Puoi chiedere informazioni su un impianto o sul supporto necessario al progetto.',contactBody,{image:'images/project-plans-1600.webp',cta:false}),'Contatti');

  const footerLinks = [['/servizi/','Impianti'],[supportRoute,'Progettazione e supporto'],['/chi-siamo/','Chi siamo'],['/contatti/','Contatti'],['/preventivo/','Richiedi un preventivo']].map(([u,t])=>link(u,t)).join('');
  const cardTemplate = await template('home-service-card');
  const homeCards = content.services.map((s,i)=>{
    let card = cardTemplate.replace(/href="[^"]+"/,`href="${serviceRoute(s.slug)}"`).replace(/aria-label="[^"]+"/,`aria-label="Scopri ${esc(s.title)}"`).replace(/ id="[^"]+"/,` id="${s.quote}"`);
    if(i!==0)card=card.replace(' reveal featured',' reveal');
    card=card.replace(/<img\b[^>]*>/,img(s.image,s.imageAlt));
    card=card.replace(/(<span class="solution-category">)[\s\S]*?(<\/span>)/,`$1${esc(s.category)}$2`).replace(/<h3>[^<]*<\/h3>/,`<h3>${esc(s.title)}</h3>`).replace(/<p>[^<]*<\/p>/,`<p>${esc(s.summary)}</p>`);
    return card;
  }).join('');
  const homeValues = {HOME_HEADER:header.replace('header gf-desktop-header','header gf-desktop-header gf-home-desktop-header'),HOME_MOBILE_NAV:navMarkup(),HOME_SERVICE_CARDS:homeCards,HOME_FOOTER_LINKS:footerLinks};
  for(const s of content.support){homeValues['SUPPORT_TITLE_'+s.id]=esc(s.title);homeValues['SUPPORT_TEXT_'+s.id]=esc(s.text);}
  await write('/',fill(await template('home'),homeValues),'Green Flux · Pompe di calore e impianti');
  for(const [name,route,title] of [['privacy','/privacy-policy/','Informativa privacy'],['cookies','/cookie-policy/','Informativa cookie'],['terms','/termini-condizioni/','Termini e condizioni']])await write(route,fill(await template(name),{HEADER:header,FOOTER:footer}),title);
  const energy = new Set(['pompe-di-calore','fotovoltaico','solare-termico','biomassa','caldaie','condizionatori','impianti-completi','diagnosi-energetiche']);
  const catalogue = [...content.services.map(s=>({id:s.quote,label:s.title,group:'Impianti',...(energy.has(s.quote)?{energy:true}:{}),...(['fotovoltaico','solare-termico'].includes(s.quote)?{solar:true}:{})})),...content.support.map(s=>({id:s.id,label:s.title,group:'Servizi',...(energy.has(s.id)?{energy:true}:{})})),{id:'consulenza',label:'Consulenza / non so ancora',group:'Consulenza'}];
  const quoteOptions = catalogue.map((s,i)=>`<label class="quote-option" data-astro-cid-ord5nrut=""><input class="quote-option-input" data-astro-cid-ord5nrut="" name="servizio" type="checkbox" value="${s.id}"><span class="quote-option-key" data-astro-cid-ord5nrut="">${String.fromCharCode(65+i)}</span><span class="quote-option-text" data-astro-cid-ord5nrut="">${esc(s.label)}</span></label>`).join('');
  await write('/preventivo/',fill(await template('quote'),{QUOTE_OPTIONS:quoteOptions}),'Richiedi un preventivo');
  await writeFile(join(publicRoot,'preventivo/catalog.mjs'),`// Generated from content/site-content.json by scripts/render-site.mjs.\nexport const services = ${JSON.stringify(catalogue,null,2)};\n`);
  await writeFile(join(publicRoot,'assets/js/mobile-header-template.mjs'),`// Generated from templates/mobile-header.html and content/site-content.json.\nexport const mobileHeaderMarkup = ${JSON.stringify(fill(await template('mobile-header'),{MOBILE_NAV:navMarkup('gf-')}))};\n`);
  // Remove only the audited legacy pages. Their URLs remain as permanent redirects.
  for(const old of Object.keys(redirects))await rm(join(publicRoot,old,'index.html'),{force:true});
  async function removeEmpty(dir){for(const e of await readdir(dir,{withFileTypes:true}))if(e.isDirectory())await removeEmpty(join(dir,e.name));if(dir!==publicRoot&&(await readdir(dir)).length===0)await rm(dir,{recursive:true});}
  await removeEmpty(publicRoot);
  await writeFile(join(root,'content/redirects.json'),JSON.stringify(redirects,null,2)+'\n');
  await writeFile(join(publicRoot,'_redirects'),Object.entries(redirects).flatMap(([from,to])=>[`${from} ${to} 301`,`${from.slice(0,-1)} ${to} 301`]).join('\n')+'\n');
  const vercel=JSON.parse(await readFile(join(root,'vercel.json'),'utf8'));
  vercel.redirects=Object.entries(redirects).map(([source,destination])=>({source:source.slice(0,-1),destination,permanent:true}));
  await writeFile(join(root,'vercel.json'),JSON.stringify(vercel,null,2)+'\n');
  await writeFile(join(root,'docs/content-audit.json'),JSON.stringify({reviewed_at:content.reviewed_at,total_pages:routes.length,source_url:content.company_source,pages:audit},null,2)+'\n');
  await writeFile(join(publicRoot,'llms.txt'),'# Green Flux\n\nImpianti residenziali, terziari e industriali.\n\n'+[['/','Home'],['/servizi/','Impianti e servizi'],...content.services.map(s=>[serviceRoute(s.slug),s.title]),[supportRoute,'Progettazione e supporto'],['/chi-siamo/','Chi siamo'],['/contatti/','Contatti']].map(([u,t])=>`- [${t}](${origin+u})`).join('\n')+'\n');
  console.log(`Rendered ${routes.length} canonical pages and ${Object.keys(redirects).length} legacy redirects.`);
}
if(process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url))await renderSite();

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateSiteVisit } from '../public/preventivo/site-visit-data.mjs';
import { bonusEstimate, bonusCeiling, bonusRates, euro } from '../public/assets/js/renovation-bonus.mjs';

const html = readFileSync('public/landing/ristrutturazione/index.html', 'utf8');

test('The renovation landing is a draft outside the index and the sitemap', () => {
  assert(html.includes('name="robots" content="noindex, nofollow"'));
  assert(!readFileSync('public/sitemap.xml', 'utf8').includes('/landing/ristrutturazione/'));
  assert(!/\{\{[^{}]+\}\}/.test(html));
});

test('The renovation form sends a short site-visit request with the job and the start date in the message', () => {
  assert(html.includes('data-site-visit-form'));
  assert(html.includes('<input type="hidden" name="service" value="impianti-completi">'));
  for (const name of ['name', 'phone', 'city', 'notes', 'email', 'privacy', 'website']) assert(html.includes(`name="${name}"`), name);
  const notes = html.match(/name="notes" value="([^"]+)"/)[1];
  assert.equal(notes, 'Landing ristrutturazione — lavoro: non indicato — superficie: non indicata — inizio: da definire');
  for (const group of ['rn-work', 'rn-size', 'rn-start']) assert.equal([...html.matchAll(new RegExp(`type="radio" name="${group}"`, 'g'))].length, 4, group);
  // One question per step, contact details last; the step classes are literal so the production CSS purge keeps their rules.
  for (const step of ['rn-s1', 'rn-s2', 'rn-s3', 'rn-s4']) assert(html.includes(`class="rn-quiz-step ${step}"`), step);
  const script = readFileSync('public/assets/js/renovation-landing.mjs', 'utf8'); const css = readFileSync('public/assets/css/renovation-landing.css', 'utf8');
  for (const mark of ['rn-quiz-on', 'rn-at-1', 'rn-at-2', 'rn-at-3', 'rn-at-4']) assert(script.includes(`'${mark}'`) && css.includes(`.${mark}`), mark);
  // The lead, the bullets and the buttons stay under the title; the video straddles the hero and the bonus section.
  const hero = html.slice(html.indexOf('hp-hero-layout'), html.indexOf('data-rn-lead'));
  assert(hero.includes('hp-hero-lead') && hero.includes('hp-hero-actions') && !hero.includes('data-rn-video'));
  const bridge = html.indexOf('class="rn-video-bridge"');
  assert(bridge > html.indexOf('data-rn-lead') && bridge < html.indexOf('id="bonus"') && html.includes('rn-after-video" id="bonus"'));
  assert(!css.includes('data-rn-at') && html.includes('data-rn-nav hidden') && html.includes('data-rn-video') && html.includes('/assets/video/ristrutturazione.mp4'));
  assert(!html.includes('Lo dico al telefono'));
  const longest = `Landing ristrutturazione — lavoro: casa o villetta completa — superficie: meno di 60 m² — inizio: tra 3 e 6 mesi`;
  for (const value of [notes, longest]) assert.deepEqual(validateSiteVisit({ name: 'Test Locale', phone: '+390491234567', city: 'Padova', service: 'impianti-completi', email: '', notes: value, website: '', privacy: true }), []);
});

test('The renovation landing sells the outcome and pushes the 2026 bonus without inventing commitments', () => {
  for (const trade of ['Progetto e permessi', 'Demolizioni e opere murarie', 'Impianto idraulico e bagni', 'Riscaldamento e raffrescamento', 'Impianto elettrico', 'Pavimenti e finiture']) assert(html.includes(`<li>${trade}</li>`), trade);
  // One contact person who coordinates the works: no partner logos, no placeholder names.
  assert(html.includes('Ristrutturi casa con un unico referente.') && html.includes('id="referente"') && !html.includes('Nome in arrivo') && !html.includes('rn-logo-placeholder'));
  const copy = html.slice(html.indexOf('<main'), html.indexOf('</main>')).replace(/<[^>]*>/g, ' ');
  // The page talks about the result, never about how many firms do the work.
  assert(!/garanzia unica|prezzo bloccato|cinque|\bditt[ae]\b|\bimpres[ae]\b|lavorano insieme|collabor/i.test(copy));
  for (const condition of ['50% sull’abitazione principale', '36% sugli altri immobili', '96.000 €', 'in 10 anni', 'Il 50% è certo per le spese pagate nel 2026.', 'la legge non è ancora approvata']) assert(copy.includes(condition), condition);
  // Prices, guarantee, instalments and capacity stay marked until the owner confirms them.
  assert.equal([...html.matchAll(/class="rn-tbd"/g)].length, 5);
  // No price of the works on the page: a renovation is too broad for a "from x euro" figure.
  assert(!/€\/m²|€\/mese|rn-tier-price/.test(html));
  assert(html.includes('<p class="hp-eyebrow rn-eyebrow">FAQ</p><h2 class="rn-h2" id="faq-title">Domande frequenti</h2>'));
  assert(!html.includes('Foto segnaposto') && html.includes('/assets/lavori/cantiere-prima-560.webp') && html.includes('/assets/lavori/impianto-dopo-560.webp'));
});

test('Every section after the hero closes with the same call to action', () => {
  const sections = html.split('<section ').slice(2);
  assert.equal(sections.length, 10);
  const withoutCta = ['id="domande"'];
  for (const section of sections.filter(section => !withoutCta.some(id => section.slice(0, 80).includes(id)))) assert(section.includes('<a class="hp-button" href="#valutazione">Richiedi il sopralluogo</a>'), section.slice(0, 60));
  assert.equal([...html.matchAll(/class="rn-vs-row"/g)].length, 6);
  assert.equal([...html.matchAll(/<em>incluso<\/em>/g)].length, 4);
  assert.equal([...html.matchAll(/<article class="rn-tier[ "]/g)].length, 3);
});

test('The bonus estimate follows the 2026 rates, the 96,000 euro ceiling and ten yearly instalments', () => {
  assert.deepEqual(bonusEstimate(20000, bonusRates.main), { total: 10000, yearly: 1000, net: 10000, capped: false });
  assert.deepEqual(bonusEstimate(40000, bonusRates.other), { total: 14400, yearly: 1440, net: 25600, capped: false });
  assert.deepEqual(bonusEstimate(120000, bonusRates.main), { total: 48000, yearly: 4800, net: 72000, capped: true });
  assert.equal(bonusCeiling, 96000);
  assert.equal(euro(2000), '2.000 €');
  assert.equal(euro(120000), '120.000 €');
  // The static figures shown before the script runs match the default inputs.
  assert.deepEqual(bonusEstimate(60000, bonusRates.main), { total: 30000, yearly: 3000, net: 30000, capped: false });
  assert(html.includes('value="60000"') && html.includes('<dd data-rn-total>30.000 €</dd>') && html.includes('<dd data-rn-year>3.000 €</dd>') && html.includes('Su 60.000 € di lavori, 30.000 € tornano a te.'));
});

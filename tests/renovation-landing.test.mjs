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

test('The renovation form sends a short site-visit request for complete systems', () => {
  assert(html.includes('data-site-visit-form'));
  assert(html.includes('<input type="hidden" name="service" value="impianti-completi">'));
  for (const name of ['name', 'phone', 'city', 'notes', 'email', 'privacy', 'website']) assert(html.includes(`name="${name}"`), name);
  const notes = [...html.matchAll(/<option value="(Landing ristrutturazione[^"]+)"/g)].map(match => match[1]);
  assert.equal(notes.length, 6);
  for (const value of notes) assert.deepEqual(validateSiteVisit({ name: 'Test Locale', phone: '+390491234567', city: 'Padova', service: 'impianti-completi', email: '', notes: value, website: '', privacy: true }), []);
});

test('The renovation landing sells the outcome: no single warranty, no fixed price, no story about the firms', () => {
  for (const trade of ['Opere edili', 'Idraulica e riscaldamento', 'Impianto elettrico', 'Progetto e permessi', 'Progetto degli impianti']) assert(html.includes(`<h3>${trade}</h3>`), trade);
  const copy = html.slice(html.indexOf('<main'), html.indexOf('</main>')).replace(/<[^>]*>/g, ' ');
  // The page talks about the result, never about how many firms do the work.
  assert(!/garanzia unica|prezzo bloccato|chiavi in mano|cinque|\bditt[ae]\b|\bimpres[ae]\b|lavorano insieme|collabor/i.test(copy));
  for (const condition of ['50% sull’abitazione principale', '36% negli altri casi', '10 quote annuali', '96.000 €']) assert(html.includes(condition), condition);
});

test('Every section after the hero closes with the same call to action', () => {
  const sections = html.split('<section ').slice(2);
  assert.equal(sections.length, 8);
  for (const section of sections.filter(section => !section.startsWith('class="rn-sec rn-white" id="chi-lavora"') && !section.startsWith('class="rn-sec rn-white" id="domande"'))) assert(section.includes('<a class="hp-button" href="#valutazione">Richiedi il sopralluogo</a>'), section.slice(0, 60));
  assert.equal([...html.matchAll(/class="rn-vs-row"/g)].length, 6);
  assert.equal([...html.matchAll(/<em>incluso<\/em>/g)].length, 5);
});

test('The bonus estimate follows the 2026 rates, the 96,000 euro ceiling and ten yearly instalments', () => {
  assert.deepEqual(bonusEstimate(20000, bonusRates.main), { total: 10000, yearly: 1000, net: 10000, capped: false });
  assert.deepEqual(bonusEstimate(40000, bonusRates.other), { total: 14400, yearly: 1440, net: 25600, capped: false });
  assert.deepEqual(bonusEstimate(120000, bonusRates.main), { total: 48000, yearly: 4800, net: 72000, capped: true });
  assert.equal(bonusCeiling, 96000);
  assert.equal(euro(2000), '2.000 €');
  assert.equal(euro(120000), '120.000 €');
  // The static figures shown before the script runs match the default inputs.
  assert(html.includes('value="40000"') && html.includes('<dd data-rn-total>20.000 €</dd>') && html.includes('<dd data-rn-year>2.000 €</dd>'));
});

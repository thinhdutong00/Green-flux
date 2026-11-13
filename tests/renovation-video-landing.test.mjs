import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const first = readFileSync('public/landing/ristrutturazione/index.html', 'utf8');
const second = readFileSync('public/landing/ristrutturazione-video/index.html', 'utf8');
const text = html => html.slice(html.indexOf('<main'), html.indexOf('</main>')).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');

test('The second renovation landing is hidden like the first one', () => {
  assert(second.includes('name="robots" content="noindex, nofollow"'));
  assert(!readFileSync('public/sitemap.xml', 'utf8').includes('/landing/ristrutturazione-video/'));
  assert(!/\{\{[^{}]+\}\}/.test(second));
});

test('Its hero is the video and the content of the first hero becomes the second section', () => {
  const sections = second.split('<section ').slice(1);
  // Full-screen video, with no booking button under it.
  assert(sections[0].startsWith('class="hp-hero rn-video-hero"') && sections[0].includes('data-rn-video') && !sections[0].includes('hp-button') && !sections[0].includes('#valutazione'));
  assert(!sections[0].includes('<h1') && !sections[0].includes('data-rn-lead'));
  assert(sections[1].startsWith('class="hp-hero rn-hero rn-hero-second"'));
  for (const part of ['<h1 id="hero-title">', 'hp-hero-lead', 'hp-hero-bullets', 'hp-hero-actions', 'data-rn-lead', 'rn-quiz-step rn-s4']) assert(sections[1].includes(part), part);
  assert.equal([...second.matchAll(/data-rn-video[ >]/g)].length, 1);
  assert(!second.includes('rn-video-bridge') && !second.includes('rn-after-video') && second.includes('rn-landing rn-video-first"'));
});

test('Everything else matches the first landing, and requests say which landing they come from', () => {
  assert.equal(second.split('<section ').length, first.split('<section ').length + 1);
  const rest = html => html.slice(html.indexOf('id="bonus"'));
  assert.equal(rest(second).replace(/ rn-after-video/g, ''), rest(first).replace(/ rn-after-video/g, ''));
  for (const phrase of ['Ristrutturi casa con un unico referente. Verifica quali lavori puoi portare in detrazione.', 'Domande frequenti', 'Su 60.000 € di spese ammesse, la detrazione può arrivare a 30.000 €.']) assert(text(second).includes(phrase), phrase);
  assert(second.includes('value="Landing ristrutturazione video — lavoro: non indicato — superficie: non indicata — inizio: da definire"'));
  assert(first.includes('value="Landing ristrutturazione — lavoro: non indicato'));
  assert(readFileSync('public/assets/js/renovation-landing.mjs', 'utf8').includes("notes.value.split(' — ')[0]"));
});

test('Neither renovation landing shows the phone number or a call link', () => {
  for (const page of [first, second]) {
    assert(!page.includes('tel:') && !/375\s?552\s?1420/.test(page.replace(/wa\.me\/\d+/g, '')));
    assert(!/[Cc]hiama il|hp-header-phone|hp-call-link|data-hp-sticky-call/.test(page));
    assert(page.includes('class="hp-sticky-bar rn-sticky-two"'));
  }
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(`../public/${path}`, import.meta.url), 'utf8');
const main = read('servizi/pompe-calore/index.html');
const video = read('landing/pompe-calore-video/index.html');
const area = JSON.parse(readFileSync(new URL('../content/heat-pump-comuni.json', import.meta.url), 'utf8'));
const comuni = area.provinces.flatMap(province => province.comuni);

test('The ad variant keeps only the hero, with the video right before the same short form, and stays out of search', () => {
  assert(video.includes('name="robots" content="noindex, follow"'));
  assert(video.includes('<link rel="canonical" href="https://green-flux.com/servizi/pompe-calore/">'));
  assert(!read('sitemap.xml').includes('/landing/pompe-calore-video/'));
  assert.equal((video.match(/<section\b/g) || []).length, 1);
  const h1 = html => html.match(/<h1 id="hero-title">.*?<\/h1>/s)[0];
  const form = html => html.match(/<form class="hp-lead-form"[\s\S]*?<\/form>/)[0];
  assert.equal(h1(video), h1(main));
  assert.equal(form(video), form(main));
  assert(video.indexOf('data-hp-video') > video.indexOf('id="hero-title"'));
  assert(video.indexOf('data-hp-video-play') < video.indexOf('data-lead-form'));
  assert(!video.includes('tel:') && !video.includes('wa.me') && !video.includes('data-hp-open'));
  for (const anchor of video.matchAll(/href="#([^"]+)"/g)) assert(video.includes(`id="${anchor[1]}"`), anchor[1]);
});

test('The town field is a dropdown of the municipalities within 35 km of Padova, on both landings', () => {
  assert.equal(area.radiusKm, 35);
  assert.equal(new Set(comuni).size, comuni.length);
  assert(comuni.length > 140 && comuni.length < 170);
  for (const name of ['Padova', 'Abano Terme', 'Selvazzano Dentro', 'Cittadella', 'Este', 'Monselice', 'Piove di Sacco', 'Camposampiero', 'Gazzo', 'Vicenza', 'Mira', 'Castelfranco Veneto']) assert(comuni.includes(name), name);
  for (const name of ['Montagnana', 'Venezia', 'Treviso', 'Rovigo', 'Chioggia', 'Bassano del Grappa', 'Carceri']) assert(!comuni.includes(name), name);
  for (const html of [main, video]) {
    const select = html.match(/<select id="lead-city" name="comune"[\s\S]*?<\/select>/)[0];
    assert(select.startsWith('<select id="lead-city" name="comune" autocomplete="address-level2" aria-describedby="lead-city-error"><option value="" selected>Seleziona</option><optgroup label="Provincia di Padova"><option>Padova</option>'));
    assert.equal((select.match(/<option>/g) || []).length, comuni.length);
    assert(select.endsWith('<option value="Altro comune">Altro comune</option></select>'));
    assert(!/<input[^>]*id="lead-city"/.test(html));
  }
});

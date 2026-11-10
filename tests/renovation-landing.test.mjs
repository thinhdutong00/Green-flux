import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateSiteVisit } from '../public/preventivo/site-visit-data.mjs';

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

test('The renovation landing presents five independent firms without a single shared warranty', () => {
  for (const role of ['Idraulica e impianti termici', 'Impresa edile', 'Elettricista', 'Geometra', 'Termotecnico']) assert(html.includes(`<p class="hp-compat-tag">${role}</p>`), role);
  assert(!/garanzia unica/i.test(html));
  for (const condition of ['50% sull’abitazione principale', '36% negli altri casi', '10 quote annuali']) assert(html.includes(condition), condition);
});

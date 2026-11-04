import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeAttribution, captureAttribution, attributionKey, attributionLifetime } from '../public/assets/js/lead-attribution.mjs';
import { saveAdsConsent } from '../public/assets/js/ads-consent.mjs';
import { createRequestSender, deliveryKey } from '../public/assets/js/request-delivery.mjs';

function browser(url, referrer = '') {
  const values = new Map();
  const storage = { getItem: k => values.get(k) ?? null, setItem: (k, v) => values.set(k, v), removeItem: k => values.delete(k) };
  const b = { location: new URL(url), document: { referrer }, localStorage: storage, sessionStorage: storage };
  b.parent = b; return b;
}
test('Attribution requires consent and positive evidence; missing click ids never by themselves imply SEO', () => {
  assert.equal(normalizeAttribution().entryPage, '');
  assert.equal(normalizeAttribution({ consent: false }).submissionPage, '');
  assert.equal(normalizeAttribution({ consent: false, params: { gclid: 'abc' } }).source, 'Non rilevata');
  for (const key of ['gclid', 'gbraid', 'wbraid']) assert.equal(normalizeAttribution({ consent: true, params: { [key]: 'abc_123' } }).source, 'Google Ads');
  assert.equal(normalizeAttribution({ consent: true, params: { utm_source: 'google', utm_medium: 'cpc', utm_campaign: 'Padova pompe' } }).source, 'Google Ads');
  assert.equal(normalizeAttribution({ consent: true, params: { utm_source: 'google', utm_medium: 'organic' } }).source, 'Google organico');
  assert.equal(normalizeAttribution({ consent: true, referrer: 'https://www.google.it/' }).source, 'Non rilevata');
  assert.equal(normalizeAttribution({ consent: true, referrer: 'https://www.google.it/search?q=private' }).source, 'Google organico');
  assert.equal(normalizeAttribution({ consent: true, referrer: 'https://www.google.com/maps/place/example?email=test@example.com' }).source, 'Google Maps');
  assert.equal(normalizeAttribution({ consent: true, params: { utm_source: 'gbp', utm_medium: 'organic' } }).source, 'Google Maps');
  assert.equal(normalizeAttribution({ consent: true, referrer: 'https://l.instagram.com/' }).source, 'Social');
  assert.equal(normalizeAttribution({ consent: true, referrer: 'https://www.google.it.evil.example/' }).source, 'Referral');
  assert.equal(normalizeAttribution({ consent: true, referrer: 'https://example.com/path' }).source, 'Referral');
  assert.equal(normalizeAttribution({ consent: true, params: { utm_source: 'newsletter', utm_medium: 'email' } }).source, 'Altre fonti');
  assert.equal(normalizeAttribution({ consent: true }).source, 'Non rilevata');
});
test('Same-origin embedded forms retain the consented landing acquisition; refusal and expiry erase it', () => {
  const now = Date.now();
  const parent = browser('https://green-flux.com/servizi/pompe-calore/?gclid=TEST_CLICK&utm_campaign=Padova&email=private@example.com', 'https://www.google.com/');
  assert.equal(captureAttribution(parent, now).consent, false);
  assert.equal(parent.sessionStorage.getItem(attributionKey), null);
  saveAdsConsent(parent, true, now);
  const first = captureAttribution(parent, now);
  assert.equal(first.source, 'Google Ads'); assert(first.campaign.includes('Padova'));
  assert(!parent.sessionStorage.getItem(attributionKey).includes('private@example.com'));
  const saved = parent.sessionStorage.getItem(attributionKey);
  assert.equal(captureAttribution(parent, now + 1000).source, 'Google Ads');
  assert.equal(parent.sessionStorage.getItem(attributionKey), saved);
  const frame = browser('https://green-flux.com/preventivo/?servizio=pompe-di-calore&embed=1'); frame.parent = parent;
  assert.equal(captureAttribution(frame, now + 1000).entryPage, '/servizi/pompe-calore/');
  assert.equal(captureAttribution(frame, now + 1000).submissionPage, '/preventivo/');
  parent.location = new URL('https://green-flux.com/preventivo/'); parent.document.referrer = 'https://green-flux.com/servizi/pompe-calore/';
  assert.equal(captureAttribution(frame, now + 2000).source, 'Google Ads');
  assert.equal(captureAttribution(frame, now + attributionLifetime + 1).source, 'Non rilevata');
  saveAdsConsent(parent, false, now + 3000);
  assert.equal(captureAttribution(frame, now + 3000).consent, false);
  assert.equal(parent.sessionStorage.getItem(attributionKey), null);
});
test('Blocked browser storage does not interrupt the request and only allowlisted URL metadata is kept', () => {
  const b = browser('https://green-flux.com/contatti/');
  Object.defineProperty(b, 'localStorage', { get() { throw new Error('blocked'); } });
  assert.equal(captureAttribution(b).consent, false);
  const result = normalizeAttribution({ consent: true, params: { utm_campaign: '=IMPORTXML secret', gclid: 'valid_123', email: 'secret@example.com' }, referrer: 'https://www.google.com/search?q=secret@example.com', submissionPage: 'https://green-flux.com/preventivo/?phone=private' });
  assert(!JSON.stringify(result).includes('secret')); assert.equal(result.submissionPage, '/preventivo/');
});
test('Re-entering the same timed-out form reuses its requestId without storing contact fields in the technical retry key', async () => {
  const b = browser('https://green-flux.com/contatti/'); const calls = [];
  const now = Date.now(); let counter = 0;
  const options = { browser: b, now: () => now, createId: () => `aaaaaaaa-bbbb-4ccc-8ddd-${String(++counter).padStart(12, '0')}`, fetchRequest: async (_url, options) => { calls.push(JSON.parse(options.body)); return { ok: true, json: async () => ({ accepted: true }) }; } };
  await createRequestSender('contact', options)({ name: 'TEST', email: 'private@example.com' });
  await createRequestSender('contact', options)({ name: 'TEST', email: 'private@example.com' });
  assert.equal(calls[0].requestId, calls[1].requestId);
  assert(!b.sessionStorage.getItem(deliveryKey).includes('private@example.com'));
  await createRequestSender('contact', options)({ name: 'TEST diverso', email: 'private@example.com' });
  assert.notEqual(calls[1].requestId, calls[2].requestId);
});

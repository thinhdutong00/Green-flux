import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { services, validateQuote, quoteText, spaceOptions } from '../public/preventivo/data.mjs';
import { delivery, sendQuote } from '../public/preventivo/delivery.mjs';
import handler from '../api/preventivo.mjs';

const sample = () => ({ services: ['trattamento-acqua'], property: 'abitazione', project: 'nuovo', consumption: '', spaces: ['interni'], timeline: 'tre-mesi', name: 'Test Locale', email: 'test@example.com', phone: '', city: 'Padova', notes: 'Dati di test: nessun invio reale.', privacy: true, website: '', elapsed: 5000, requestId: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee' });

test('Il catalogo copre tutti i 15 servizi della home e i collegamenti preselezionati', () => {
  const home = readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
  assert.equal(services.filter(service => service.id !== 'consulenza').length, 15);
  for (const service of services.filter(service => service.id !== 'consulenza')) {
    assert(home.includes(`id="${service.id}"`));
    assert(home.includes(`href="/preventivo/?servizio=${service.id}"`));
  }
});

test('La validazione accetta un recapito e rifiuta dati mancanti, opzioni arbitrarie e spazi non pertinenti', () => {
  assert.deepEqual(validateQuote(sample()), []);
  assert.deepEqual(validateQuote({ ...sample(), email: '', phone: '+39 333 123 4567' }), []);
  for (const invalid of [{ email: '', phone: '' }, { email: 'non-email' }, { phone: 'abcd123' }, { name: ' ' }, { city: '' }, { privacy: false }, { services: ['sconosciuto'] }, { spaces: ['tetto-falda'] }, { notes: 'a'.repeat(2001) }]) assert(validateQuote({ ...sample(), ...invalid }).length);
  assert(spaceOptions(['fotovoltaico']).some(space => space.id === 'tetto-falda'));
  assert(!spaceOptions(['trattamento-acqua']).some(space => space.id === 'tetto-falda'));
});

test('Il riepilogo comprende tutti i servizi e prepara i contatti senza trasmettere dati', async () => {
  const data = { ...sample(), services: services.map(service => service.id) };
  for (const service of services) assert(quoteText(data).includes(service.label));
  assert.equal(delivery.mode, 'handoff');
  const result = await sendQuote(data);
  assert(result.handoff);
  assert.equal(new URL(result.links.whatsapp).pathname, '/393755521420');
  assert.equal(new URL(result.links.whatsapp).searchParams.get('text'), quoteText(data));
  assert(result.links.email.startsWith('mailto:info@green-flux.com?'));
});

test('Endpoint email: convalida, configurazione, destinatario fisso, idempotenza ed errori senza invii reali', async () => {
  const originalFetch = globalThis.fetch;
  const previousKey = process.env.RESEND_API_KEY;
  const previousFrom = process.env.QUOTE_FROM_EMAIL;
  let calls = [], mode = 'success';
  globalThis.fetch = async (url, options) => {
    calls.push({ url, ...options });
    if (mode === 'network') throw new Error('Errore simulato');
    return { ok: mode === 'success', json: async () => mode === 'success' ? { id: 'receipt-test' } : { message: 'Errore simulato' } };
  };
  const request = async (overrides = {}, body = sample()) => {
    const req = { method: 'POST', headers: { 'content-type': 'application/json', origin: 'https://example.test', host: 'example.test', 'x-real-ip': '192.0.2.1' }, body, ...overrides };
    const res = { headers: {}, setHeader(k, v) { this.headers[k] = v; }, status(code) { this.code = code; return this; }, json(value) { this.payload = value; return this; } };
    await handler(req, res); return res;
  };
  try {
    delete process.env.RESEND_API_KEY; delete process.env.QUOTE_FROM_EMAIL;
    assert.equal((await request({ method: 'GET' })).code, 405);
    assert.equal((await request({}, { ...sample(), services: 'bad' })).code, 400);
    assert.equal((await request({}, { ...sample(), website: 'spam' })).code, 400);
    assert.equal((await request({}, { ...sample(), privacy: false })).code, 400);
    assert.equal((await request()).code, 503); assert.equal(calls.length, 0);
    process.env.RESEND_API_KEY = 'test-key'; process.env.QUOTE_FROM_EMAIL = 'Test <test@example.com>';
    const accepted = await request({}, { ...sample(), to: 'unauthorized@example.com' });
    assert.equal(accepted.code, 200); assert.equal(accepted.payload.accepted, true);
    const outbound = JSON.parse(calls[0].body);
    assert.deepEqual(outbound.to, ['info@green-flux.com']); assert.equal(outbound.reply_to, 'test@example.com'); assert.equal(outbound.text, quoteText(sample()));
    await request(); assert.equal(calls[0].headers['Idempotency-Key'], calls[1].headers['Idempotency-Key']);
    mode = 'provider'; assert.equal((await request()).code, 502);
    mode = 'network'; assert.equal((await request()).code, 502); assert.equal((await request()).code, 502);
    assert.equal((await request()).code, 429);
  } finally {
    globalThis.fetch = originalFetch;
    if (previousKey === undefined) delete process.env.RESEND_API_KEY; else process.env.RESEND_API_KEY = previousKey;
    if (previousFrom === undefined) delete process.env.QUOTE_FROM_EMAIL; else process.env.QUOTE_FROM_EMAIL = previousFrom;
  }
});

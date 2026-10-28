import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequestSender, submitAndRedirect } from '../public/assets/js/request-delivery.mjs';
import { heatingOptions, distributionOptions, timelines, heatPumpRequestText } from '../public/preventivo/heat-pump-data.mjs';
import { questionsFor } from '../public/preventivo/funnel-data.mjs';
import { quoteText } from '../public/preventivo/data.mjs';
import handler from '../api/preventivo.mjs';

const requestId = '11111111-2222-4333-8444-555555555555';
const heatPump = () => ({
  kind: 'heat-pump', clientType: 'Privato', city: 'Padova', propertyType: 'Abitazione singola',
  heating: heatingOptions[0].value, distribution: distributionOptions[0].value, area: '', outdoorSpace: '',
  functions: 'Vorrei un consiglio', timeline: timelines[0], name: 'Test Locale', company: '',
  phone: '+39 3331234567', email: '', notes: 'Dati di test, nessun invio reale.', privacy: true,
  website: '', elapsed: 5000, requestId,
});

test('Delivery confirms acceptance before navigating; iframe requests redirect the whole landing', async () => {
  let resolveDelivery;
  const visited = [];
  const parent = { location: { origin: 'https://example.test', assign: path => visited.push(['parent', path]) } };
  const browser = { parent, location: { origin: 'https://example.test', assign: path => visited.push(['iframe', path]) } };
  const pending = submitAndRedirect(() => new Promise(resolve => { resolveDelivery = resolve; }), {}, browser);
  assert.deepEqual(visited, []);
  resolveDelivery({ accepted: true });
  await pending;
  assert.deepEqual(visited, [['parent', '/thank-you/']]);
  visited.length = 0;
  for (const sender of [async () => { throw new Error('Invio fallito'); }, async () => ({ accepted: false }), async () => ({ handoff: true })]) {
    await assert.rejects(submitAndRedirect(sender, {}, browser));
    assert.deepEqual(visited, []);
  }
  browser.parent = browser;
  await submitAndRedirect(async () => ({ accepted: true }), {}, browser);
  assert.deepEqual(visited, [['iframe', '/thank-you/']]);
});

test('Retries reuse the request id and changed requests receive a new id; errors never count as acceptance', async () => {
  const calls = [];
  let tick = 1000, ids = 0, mode = 'error';
  const sender = createRequestSender('heat-pump', {
    now: () => tick, createId: () => `id-${++ids}`,
    fetchRequest: async (url, options) => {
      calls.push({ url, ...options, payload: JSON.parse(options.body) });
      return { ok: mode !== 'error', json: async () => mode === 'success' ? { accepted: true } : { message: 'Invio non disponibile.' } };
    },
  });
  tick += 5000;
  await assert.rejects(sender({ name: 'Test' }), /Invio non disponibile/);
  mode = 'success';
  assert.deepEqual(await sender({ name: 'Test' }), { accepted: true });
  await sender({ name: 'Test modificato' });
  assert.equal(calls[0].payload.requestId, calls[1].payload.requestId);
  assert.notEqual(calls[1].payload.requestId, calls[2].payload.requestId);
  assert.equal(calls[0].payload.elapsed, 5000);
  assert.equal(calls[0].payload.kind, 'heat-pump');
  assert.equal(calls[0].url, '/api/preventivo');
  assert.equal(calls[0].method, 'POST');
  mode = 'unconfirmed';
  await assert.rejects(sender({ name: 'Test' }));
});

test('The email endpoint validates all active forms and sends their complete summaries to the fixed recipient', async () => {
  const previousFetch = globalThis.fetch, previousKey = process.env.RESEND_API_KEY, previousFrom = process.env.QUOTE_FROM_EMAIL;
  const outbound = [];
  globalThis.fetch = async (_url, options) => { outbound.push(JSON.parse(options.body)); return { ok: true, json: async () => ({ id: 'mock-receipt' }) }; };
  const invoke = async body => {
    const response = { setHeader() {}, status(code) { this.code = code; return this; }, json(payload) { this.payload = payload; } };
    await handler({ method: 'POST', headers: { 'content-type': 'application/json', origin: 'https://example.test', host: 'example.test', 'x-real-ip': '192.0.2.31' }, body }, response);
    return response;
  };
  try {
    process.env.RESEND_API_KEY = 'test-key'; process.env.QUOTE_FROM_EMAIL = 'Test <test@example.com>';
    assert.equal((await invoke(heatPump())).code, 200);
    assert.equal(outbound[0].text, heatPumpRequestText(heatPump()));
    assert(!Object.hasOwn(outbound[0], 'reply_to'));
    const conditional = { kind: 'conditional', funnel: 'conditional', services: ['fotovoltaico'], answers: { fotovoltaico: Object.fromEntries(questionsFor(['fotovoltaico']).map(q => [q.id, q.options[0]])) }, propertyType: 'Abitazione singola', timeline: timelines[0], name: 'Test Locale', email: 'test@example.com', phone: '', city: 'Padova', notes: '', privacy: true, website: '', elapsed: 5000, requestId };
    assert.equal((await invoke(conditional)).code, 200);
    assert.equal(outbound[1].text, quoteText(conditional));
    assert.equal(outbound[1].reply_to, conditional.email);
    const contact = { kind: 'contact', name: 'Test Locale', email: 'test@example.com', phone: '', subject: 'Richiesta Informazioni', notes: 'Informazioni sul progetto.', privacy: true, website: '', elapsed: 5000, requestId };
    assert.equal((await invoke(contact)).code, 200);
    assert(outbound[2].text.includes(contact.notes));
    for (const message of outbound) assert.deepEqual(message.to, ['info@green-flux.com']);
    for (const invalid of [{ ...heatPump(), phone: '' }, { ...heatPump(), privacy: false }, { ...heatPump(), heating: 'arbitrario' }, { ...conditional, answers: {} }, { ...contact, privacy: false }, { ...contact, subject: 'arbitrario' }, { ...heatPump(), kind: 'arbitrario' }]) assert.equal((await invoke(invalid)).code, 400);
    assert.equal(outbound.length, 3);
    delete process.env.RESEND_API_KEY;
    const unavailable = await invoke(heatPump());
    assert.equal(unavailable.code, 503); assert.notEqual(unavailable.payload.accepted, true);
    assert.equal(outbound.length, 3);
  } finally {
    globalThis.fetch = previousFetch;
    if (previousKey === undefined) delete process.env.RESEND_API_KEY; else process.env.RESEND_API_KEY = previousKey;
    if (previousFrom === undefined) delete process.env.QUOTE_FROM_EMAIL; else process.env.QUOTE_FROM_EMAIL = previousFrom;
  }
});

test('The thank-you URL is available for preview and excluded from indexing and the sitemap', () => {
  const html = readFileSync('public/thank-you/index.html', 'utf8');
  assert(html.includes('name="robots" content="noindex, follow"'));
  assert(html.includes('entro 24 ore.'));
  assert(!readFileSync('public/sitemap.xml', 'utf8').includes('/thank-you/'));
});

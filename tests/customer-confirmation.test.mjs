import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/preventivo.mjs';
import { customerConfirmation } from '../lib/customer-confirmation.mjs';
import { heatingOptions, distributionOptions, timelines, heatPumpRequestText } from '../public/preventivo/heat-pump-data.mjs';

const sample = () => ({
  kind: 'heat-pump', clientType: 'Azienda', city: 'Padova', propertyType: 'Azienda o negozio',
  heating: heatingOptions[0].value, distribution: distributionOptions[0].value,
  area: '81–120 m²', outdoorSpace: 'Giardino o cortile', functions: 'Riscaldamento e acqua calda', timeline: timelines[0],
  name: 'Cliente di test', company: 'Attività di test', phone: '+39 3331234567', email: 'cliente@example.test',
  notes: 'Valutare riscaldamento e acqua calda.', privacy: true,
  website: '', elapsed: 5000, requestId: '22222222-3333-4444-8555-666666666666',
});
let requestCount = 0;

async function withProvider(mode, check) {
  const previous = { fetch: globalThis.fetch, key: process.env.RESEND_API_KEY, from: process.env.QUOTE_FROM_EMAIL, error: console.error };
  const calls = [], errors = [];
  process.env.RESEND_API_KEY = 'test-key';
  process.env.QUOTE_FROM_EMAIL = 'Green Flux <test@example.test>';
  console.error = (...args) => errors.push(args);
  globalThis.fetch = async (url, options) => {
    const payload = JSON.parse(options.body);
    calls.push({ url, payload, headers: options.headers });
    const primary = payload.to[0] === 'info@green-flux.com';
    if ((primary && mode === 'primary-network') || (!primary && mode === 'confirmation-network')) throw new Error('Errore di rete simulato');
    const ok = !((primary && mode === 'primary-error') || (!primary && mode === 'confirmation-error'));
    return { ok, status: ok ? 200 : 429, json: async () => ok ? { id: primary ? 'business-receipt' : 'customer-receipt' } : { message: 'Errore simulato' } };
  };
  const invoke = async (data = sample()) => {
    const response = { setHeader() {}, status(code) { this.code = code; return this; }, json(payload) { this.payload = payload; } };
    await handler({ method: 'POST', headers: { 'content-type': 'application/json', origin: 'https://example.test', host: 'example.test', 'x-real-ip': `192.0.2.${100 + ++requestCount}` }, body: data }, response);
    return response;
  };
  try { await check({ calls, errors, invoke }); }
  finally {
    globalThis.fetch = previous.fetch; console.error = previous.error;
    if (previous.key === undefined) delete process.env.RESEND_API_KEY; else process.env.RESEND_API_KEY = previous.key;
    if (previous.from === undefined) delete process.env.QUOTE_FROM_EMAIL; else process.env.QUOTE_FROM_EMAIL = previous.from;
  }
}

test('Customer confirmations include the complete heat-pump request in HTML and text, after the business email succeeds', async () => {
  await withProvider('success', async ({ calls, invoke }) => {
    const response = await invoke();
    assert.equal(response.code, 200); assert.equal(response.payload.accepted, true); assert.equal(response.payload.confirmationStatus, 'sent');
    assert.deepEqual(response.payload.receipt, { id: sample().requestId, kind: 'heat-pump' });
    assert.equal(calls.length, 2);
    assert.deepEqual(calls[0].payload.to, ['info@green-flux.com']);
    const confirmation = calls[1].payload;
    assert.deepEqual(confirmation.to, [sample().email]);
    assert.equal(confirmation.from, process.env.QUOTE_FROM_EMAIL); assert.equal(confirmation.reply_to, 'info@green-flux.com');
    assert(confirmation.text.includes(heatPumpRequestText(sample())));
    for (const expected of [sample().name, sample().company, sample().city, sample().phone, sample().notes, 'Ti ricontattiamo']) {
      assert(confirmation.text.includes(expected), expected); assert(confirmation.html.includes(expected), expected);
    }
    assert.equal(confirmation.headers['Auto-Submitted'], 'auto-generated');
    assert.notEqual(calls[0].headers['Idempotency-Key'], calls[1].headers['Idempotency-Key']);
  });
});

test('Invalid forms and a failed business notification never generate a customer receipt', async () => {
  for (const mode of ['primary-error', 'primary-network']) await withProvider(mode, async ({ calls, invoke }) => {
    const response = await invoke();
    assert.equal(response.code, 502); assert.notEqual(response.payload.accepted, true); assert.equal(calls.length, 1);
  });
  await withProvider('success', async ({ calls, invoke }) => {
    for (const invalid of [{ privacy: false }, { email: 'non-email' }, { name: '' }]) assert.equal((await invoke({ ...sample(), ...invalid })).code, 400);
    assert.equal(calls.length, 0);
  });
});

test('A confirmation outage preserves the accepted request and conversion receipt, without logging personal data', async () => {
  for (const mode of ['confirmation-error', 'confirmation-network']) await withProvider(mode, async ({ calls, errors, invoke }) => {
    const response = await invoke();
    assert.equal(response.code, 200); assert.equal(response.payload.accepted, true); assert.equal(response.payload.confirmationStatus, 'failed');
    assert.deepEqual(response.payload.receipt, { id: sample().requestId, kind: 'heat-pump' });
    assert.equal(calls.length, 2); assert.equal(errors.length, 1);
    const log = JSON.stringify(errors);
    assert(log.includes(sample().requestId)); assert(!log.includes(sample().email)); assert(!log.includes(sample().name)); assert(!log.includes('test-key'));
  });
});

test('A phone-only enquiry sends only the business email; confirmation HTML escapes user-supplied content', async () => {
  await withProvider('success', async ({ calls, invoke }) => {
    const response = await invoke({ ...sample(), email: '' });
    assert.equal(response.payload.accepted, true); assert.equal(response.payload.confirmationStatus, 'not_requested'); assert.equal(calls.length, 1);
  });
  const email = customerConfirmation('<img src=x onerror="alert(1)"> & Rossi', 'Dettagli: <script>alert(1)</script>\nEmail: cliente@example.test');
  assert(!email.html.includes('<img')); assert(!email.html.includes('<script>'));
  assert(email.html.includes('&lt;img')); assert(email.html.includes('&lt;script&gt;')); assert(email.html.includes('&amp; Rossi'));
  assert(email.html.includes('<br>Email: cliente@example.test'));
  assert(email.text.includes('<script>alert(1)</script>'));
});

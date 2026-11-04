import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { createHmac } from 'node:crypto';
import { createOutbox } from '../lib/crm-outbox.mjs';
import { buildCrmRecord, signedEnvelope, recoveryEmailText } from '../lib/crm-record.mjs';
import handler from '../api/preventivo.mjs';
import retryHandler from '../api/crm-retry.mjs';

const id = '12345678-1234-4123-8123-123456789abc';
const data = { kind: 'contact', requestId: id, name: 'TEST CRM', phone: '', email: 'test@example.com', subject: 'Richiesta Informazioni', notes: 'Nessuna richiesta reale', privacy: true, website: '', elapsed: 5000 };
const sample = () => buildCrmRecord(data, 'contact', 'Richiesta di test', new Date().toISOString());
test('Resend retries remain idempotent when storage fails and the receipt time or consent changes', () => {
  const first = sample();
  const retry = { ...first, crm: { ...first.crm, receivedAt: new Date(Date.now() + 60000).toISOString(), source: 'Google Ads', campaign: 'another value' } };
  assert.equal(recoveryEmailText(first), recoveryEmailText(retry));
  assert(recoveryEmailText(first).includes(first.requestId));
});
function memory() {
  const values = new Map();
  return { values, async read(k) { return values.get(k) || null; }, async create(k, v) { if (!values.has(k)) values.set(k, structuredClone(v)); return values.get(k); }, async remove(keys) { keys.forEach(k => values.delete(k)); }, async pending(prefix) { return { blobs: [...values.keys()].filter(k => k.startsWith(prefix)).map(pathname => ({ pathname, uploadedAt: new Date() })) }; } };
}
test('Durable outbox retains confirmed requests during Sheets outages and replays them without duplicate rows', async () => {
  const storage = memory(); let unavailable = true, attempts = 0; const rows = new Map();
  const outbox = createOutbox(storage, async c => { attempts++; if (unavailable) throw new Error('Sheets down'); const duplicate = rows.has(c.requestId); rows.set(c.requestId, c); return { duplicate }; });
  const record = sample();
  await outbox.prepare(record);
  assert.equal((await outbox.accepted(record, 'resend-real-receipt')).status, 'pending');
  assert([...storage.values.keys()].some(p => p.includes('/confirmed/')));
  unavailable = false;
  const recovered = await outbox.retry(async () => { throw new Error('Confirmed records must never resend email'); });
  assert.equal(recovered.registered, 1); assert.equal(rows.size, 1);
  assert.deepEqual(await outbox.retry(async () => 'unused'), { registered: 0, pending: 0, uncertain: 0, expired: 0 });
  const done = await outbox.prepare(record); assert(done.done);
  assert.equal(attempts, 2);
  await assert.rejects(outbox.prepare({ ...record, fingerprint: 'another-payload' }), /request_id_conflict/);
  assert([...storage.values.keys()].every(p => p.includes('/done/')));
  assert(!JSON.stringify([...storage.values.values()]).includes(data.email));
});
test('Timeout after a Sheets write is retried with the same requestId; a lost success cannot insert a second row', async () => {
  const storage = memory(); const rows = new Map(); let first = true;
  const outbox = createOutbox(storage, async c => { const duplicate = rows.has(c.requestId); rows.set(c.requestId, c); if (first) { first = false; throw new Error('Response lost after commit'); } return { duplicate }; });
  const record = sample(); await outbox.prepare(record); await outbox.accepted(record, 'resend-receipt');
  assert.equal((await outbox.retry(async () => 'unused')).registered, 1); assert.equal(rows.size, 1);
});
test('Staged requests recover primary-email timeouts within the idempotency window and never blindly resend after it', async () => {
  const storage = memory(); let primary = 0, synced = 0;
  const outbox = createOutbox(storage, async () => { synced++; return { duplicate: false }; });
  const now = Date.now(); const record = { ...sample(), createdAt: new Date(now - 120000).toISOString() };
  await outbox.prepare(record);
  assert.equal((await outbox.retry(async r => { primary++; assert.equal(r.requestId, id); return 'resend-confirmed'; }, now)).registered, 1);
  assert.equal(primary, 1); assert.equal(synced, 1);
  const old = { ...sample(), requestId: '87654321-1234-4123-8123-123456789abc', createdAt: new Date(now - 25 * 3600000).toISOString() };
  await outbox.prepare(old);
  assert.equal((await outbox.retry(async () => { primary++; }, now)).uncertain, 1); assert.equal(primary, 1);
});
test('The live endpoint preserves business and customer emails when Sheets is unavailable; no PII enters logs or public responses', async () => {
  const env = { ...process.env }, oldFetch = globalThis.fetch, oldError = console.error; const logs = [], calls = [];
  process.env.RESEND_API_KEY = 'test-resend-secret'; process.env.QUOTE_FROM_EMAIL = 'Test <test@example.com>';
  process.env.GREEN_FLUX_CRM_URL = 'https://script.google.com/macros/s/test/exec'; process.env.GREEN_FLUX_CRM_SECRET = 'test-crm-secret';
  delete process.env.BLOB_STORE_ID; delete process.env.BLOB_READ_WRITE_TOKEN;
  console.error = (...args) => logs.push(JSON.stringify(args));
  globalThis.fetch = async (url, options) => { calls.push({ url: String(url), options }); if (String(url).includes('script.google.com')) throw new Error('Sheets unavailable'); return { ok: true, json: async () => ({ id: 'resend-receipt' }) }; };
  const response = { setHeader() {}, status(c) { this.code = c; return this; }, json(v) { this.payload = v; } };
  try {
    await handler({ method: 'POST', headers: { host: 'example.test', origin: 'https://example.test', 'content-type': 'application/json', 'x-real-ip': '192.0.2.250' }, body: data }, response);
    assert.equal(response.code, 200); assert.equal(response.payload.accepted, true); assert.equal(response.payload.crmStatus, 'email_recovery');
    const emails = calls.filter(c => c.url.includes('resend.com')).map(c => JSON.parse(c.options.body));
    assert.deepEqual(emails[0].to, ['info@green-flux.com']); assert(emails[0].text.includes(id)); assert.deepEqual(emails[1].to, ['test@example.com']);
    for (const text of [JSON.stringify(logs), JSON.stringify(response.payload)]) { assert(!text.includes(data.email)); assert(!text.includes(data.name)); assert(!text.includes('test-crm-secret')); }
  } finally { process.env = env; globalThis.fetch = oldFetch; console.error = oldError; }
});
test('The retry endpoint rejects anonymous requests and discloses no queued data', async () => {
  const response = { setHeader() {}, status(c) { this.code = c; return this; }, json(v) { this.payload = v; } };
  await retryHandler({ method: 'POST', headers: {} }, response);
  assert.equal(response.code, 401); assert.deepEqual(response.payload, { ok: false });
});
function scriptHarness() {
  const rows = [['Data', 'Nome e cognome', 'Telefono', 'Email', 'Città', 'Provenienza', 'Annuncio / campagna', 'Servizio richiesto', 'Stato richiesta', 'Contattato', 'Data e ora contatto', 'Comunicazioni / note', 'Preventivo', 'Accettato', 'ID richiesta', 'Pagina di ingresso', 'Pagina di invio', 'Evidenza attribuzione']];
  const state = { failCommit: false, commits: 0, rows, locked: false };
  const choices = { 6: ['Google Ads', 'Google organico', 'Google Maps', 'Diretto', 'Social', 'Referral', 'Altro', 'Non rilevata'], 8: ['Pompe di calore', 'Fotovoltaico', 'Altro'], 9: ['Nuova', 'Da contattare'] };
  const book = { getId: () => '1_T3GS1bZUXE_5FQXKOeEd1gOzJmjKoBtiJksfyRGHvw', getSpreadsheetTimeZone: () => 'Europe/Rome', getSheetByName: () => sheet };
  const sheet = { getParent: () => book, getSheetId: () => 0, getLastRow: () => rows.length, getMaxRows: () => 1000, getRange: (row, col, height = 1, width = 1) => ({ getValues: () => Array.from({ length: height }, (_, i) => Array.from({ length: width }, (_, j) => rows[row - 1 + i]?.[col - 1 + j] ?? '')), getDataValidation: () => choices[col] ? { getCriteriaType: () => 'VALUE_IN_LIST', getCriteriaValues: () => [choices[col]] } : null, createTextFinder: value => ({ matchEntireCell() { return this; }, matchCase() { return this; }, findNext: () => rows.slice(1).some(r => r[14] === value) }) }) };
  const context = vm.createContext({ console: { error() {} }, Date, JSON, Number, String, Object, Math,
    SpreadsheetApp: { openById(id) { assert.equal(id, book.getId()); return book; }, flush() {}, DataValidationCriteria: { VALUE_IN_LIST: 'VALUE_IN_LIST' } },
    Sheets: { Spreadsheets: { batchUpdate(body, sheetId) {
      assert(state.locked); assert.equal(sheetId, book.getId());
      if (state.failCommit) throw new Error('Sheets batch rejected');
      const update = body.requests[0].updateCells;
      assert(update.rows[0].values.every(c => !('formulaValue' in c.userEnteredValue)));
      const values = update.rows[0].values.map(c => c.userEnteredValue.stringValue ?? c.userEnteredValue.numberValue);
      for (const [column, allowed] of Object.entries(choices)) assert(allowed.includes(values[Number(column) - 1]));
      assert.equal(update.fields, 'userEnteredValue');
      rows[update.range.startRowIndex] = values; state.commits++;
    } } },
    PropertiesService: { getScriptProperties: () => ({ getProperty: () => 'test-secret' }) },
    Utilities: { Charset: { UTF_8: 'utf8' }, computeHmacSha256Signature: (text, key) => [...createHmac('sha256', key).update(text).digest()], formatDate: (date, timeZone) => { const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).formatToParts(date).map(p => [p.type, p.value])); return ['year', 'month', 'day', 'hour', 'minute', 'second'].map(k => parts[k]).join(','); } },
    LockService: { getScriptLock: () => ({ waitLock() { assert(!state.locked); state.locked = true; }, hasLock: () => state.locked, releaseLock() { state.locked = false; } }) }, ContentService: { MimeType: { JSON: 'json' }, createTextOutput: text => ({ setMimeType: () => JSON.parse(text) }) }
  });
  vm.runInContext(readFileSync('integrations/google-sheets/Code.gs', 'utf8'), context);
  state.context = context;
  state.invoke = envelope => context.doPost({ postData: { contents: JSON.stringify(envelope) } });
  return state;
}
test('Apps Script rejects invalid signatures and replays; atomic requestId deduplication preserves commercial edits and neutralizes formulas', () => {
  const { invoke, rows, context } = scriptHarness();
  const crm = { ...sample().crm, name: '=IMPORTXML("secret")', phone: '+390000000000', notes: '=FORMULA', resendId: 'confirmed-email' };
  assert.equal(invoke(signedEnvelope(crm, 'wrong-secret')).reason, 'unauthorized');
  assert.equal(invoke(signedEnvelope(crm, 'test-secret', Date.now() - 600000)).reason, 'unauthorized');
  assert.equal(invoke(signedEnvelope(crm, 'test-secret')).ok, true); assert.equal(rows.length, 2);
  assert.equal(rows[1][8], 'Da contattare'); assert.equal(rows[1][1], crm.name); assert.equal(rows[1][2], crm.phone); assert(rows[1][11].startsWith('=FORMULA')); assert.equal(typeof rows[1][0], 'number');
  assert.equal(rows[1][7], 'Altro'); assert(rows[1][11].includes('Richiesta Informazioni'));
  rows[1][8] = 'In trattativa'; rows[1][11] = 'Nota commerciale reale';
  assert.equal(invoke(signedEnvelope(crm, 'test-secret')).duplicate, true); assert.equal(rows.length, 2); assert.equal(rows[1][8], 'In trattativa'); assert.equal(rows[1][11], 'Nota commerciale reale');
  assert.equal(context.gfRomeSerial_(new Date('2026-11-04T15:23:00Z')), Date.UTC(2026, 10, 4, 16, 23) / 86400000 + 25569);
  assert.equal(context.gfRomeSerial_(new Date('2026-07-04T15:23:00Z')), Date.UTC(2026, 6, 4, 17, 23) / 86400000 + 25569);
});
test('Rejected atomic writes leave no partial rows; recovery uses strict live dropdowns and preserves full service details', () => {
  const state = scriptHarness();
  const crm = { ...sample().crm, source: 'Altre fonti', service: 'Condizionatori, Fotovoltaico', resendId: 'confirmed-email' };
  state.failCommit = true;
  assert.equal(state.invoke(signedEnvelope(crm, 'test-secret')).reason, 'write_failed');
  assert.equal(state.rows.length, 1); assert.equal(state.commits, 0); assert.equal(state.locked, false);
  state.failCommit = false;
  assert.equal(state.invoke(signedEnvelope(crm, 'test-secret')).ok, true);
  assert.equal(state.rows.length, 2); assert.equal(state.rows[1][5], 'Altro'); assert.equal(state.rows[1][7], 'Altro'); assert(state.rows[1][11].includes(crm.service));
  assert.equal(state.invoke(signedEnvelope(crm, 'test-secret')).duplicate, true); assert.equal(state.commits, 1);
});

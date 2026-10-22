import test from 'node:test';
import assert from 'node:assert/strict';
import {
  heatingOptions, distributionOptions, timelines, readHeatPumpRequest,
  validateHeatPumpRequest, heatPumpSummary, heatPumpRequestText,
} from '../public/preventivo/heat-pump-data.mjs';

const sample = () => ({
  clientType: 'Privato', city: 'Padova', propertyType: 'Abitazione singola',
  heating: heatingOptions[0].value, distribution: distributionOptions[0].value,
  area: '', outdoorSpace: '', functions: 'Vorrei un consiglio', timeline: timelines[0],
  name: 'Test Locale', company: '', phone: '+39 333 123 4567', email: '', notes: '', privacy: true,
});

test('Heat-pump requests support private clients, companies and sole traders with relevant property choices', () => {
  assert.deepEqual(validateHeatPumpRequest(sample()), []);
  for (const clientType of ['Azienda', 'Ditta individuale']) {
    const data = { ...sample(), clientType, propertyType: 'Azienda o negozio', company: 'Attività di test' };
    assert.deepEqual(validateHeatPumpRequest(data), []);
    assert(validateHeatPumpRequest({ ...data, company: '' }).some(issue => issue.field === 'azienda' && issue.step === 5));
  }
  const changedClient = { ...sample(), clientType: 'Azienda', company: 'Attività di test' };
  assert(validateHeatPumpRequest(changedClient).some(issue => issue.field === 'immobile' && issue.step === 1));
});

test('Each missing answer points back to its correct step, including earlier answers on final review', () => {
  const checks = [['clientType', 0], ['city', 1], ['propertyType', 1], ['heating', 2], ['distribution', 3], ['functions', 4], ['timeline', 4], ['name', 5], ['phone', 5]];
  for (const [field, step] of checks) {
    const issues = validateHeatPumpRequest({ ...sample(), [field]: '' });
    assert.equal(issues[0].step, step, field);
  }
  assert(validateHeatPumpRequest({ ...sample(), privacy: false }).some(issue => issue.field === 'privacy' && issue.step === 5));
});

test('Unknown technical details and optional dimensions never prevent a valid enquiry', () => {
  const data = { ...sample(), heating: 'Non lo so / da valutare', distribution: 'Non lo so / da valutare', area: 'Non lo so', outdoorSpace: 'Da verificare' };
  assert.deepEqual(validateHeatPumpRequest(data), []);
  assert.deepEqual(validateHeatPumpRequest({ ...data, area: '', outdoorSpace: '' }), []);
  assert.equal(validateHeatPumpRequest({ ...data, area: '999', outdoorSpace: 'Tetto' }).filter(issue => issue.step === 3).length, 2);
});

test('A reachable phone number is required while email is optional and validated when supplied', () => {
  for (const phone of ['+39 333 123 4567', '0039 3331234567', '(049) 123-4567']) assert.deepEqual(validateHeatPumpRequest({ ...sample(), phone }), []);
  for (const phone of ['', '333', 'abc1234567', '+1234567890123456', '333+1234567']) assert(validateHeatPumpRequest({ ...sample(), phone }).some(issue => issue.field === 'telefono'));
  assert.deepEqual(validateHeatPumpRequest({ ...sample(), email: 'test@example.com' }), []);
  assert(validateHeatPumpRequest({ ...sample(), email: 'test@' }).some(issue => issue.field === 'email'));
});

test('The editable summary and outgoing request retain the heat-pump answers and omit stale company data for a private client', () => {
  const data = { ...sample(), area: '81–120 m²', outdoorSpace: 'Giardino o cortile', company: 'Vecchia azienda', notes: 'Valutare i radiatori esistenti.' };
  const summary = heatPumpSummary(data);
  assert.deepEqual(summary.map(row => row.step), [0, 1, 2, 3, 3, 3, 4, 4]);
  assert(summary.find(row => row.label === 'Immobile').value.includes('Padova'));
  const text = heatPumpRequestText(data);
  for (const expected of ['Pompe di calore', data.heating, data.distribution, data.functions, data.area, data.outdoorSpace, data.phone, data.notes]) assert(text.includes(expected));
  assert(!text.includes('Vecchia azienda'));
  assert(!text.includes('Azienda / Ditta:'));
  assert(heatPumpRequestText({ ...data, clientType: 'Azienda', company: 'Attività test' }).includes('Azienda / Ditta: Attività test'));
});

test('Form values are trimmed and message limits are enforced before handoff', () => {
  const form = new FormData();
  form.set('nome', '  Test Locale  '); form.set('comune', ' Padova ');
  form.set('telefono', ' +39 3331234567 '); form.set('privacy', 'on');
  const data = readHeatPumpRequest(form);
  assert.equal(data.name, 'Test Locale'); assert.equal(data.city, 'Padova');
  assert.equal(data.phone, '+39 3331234567'); assert.equal(data.email, ''); assert.equal(data.privacy, true);
  assert.deepEqual(validateHeatPumpRequest({ ...sample(), notes: 'a'.repeat(2000) }), []);
  assert(validateHeatPumpRequest({ ...sample(), notes: 'a'.repeat(2001) }).some(issue => issue.field === 'messaggio'));
});

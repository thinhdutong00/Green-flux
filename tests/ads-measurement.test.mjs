import test from 'node:test';
import assert from 'node:assert/strict';
import { saveConversionReceipt, readConversionReceipt, recordConfirmedConversion, conversionReceiptKey, conversionReceiptLifetime } from '../public/assets/js/conversion-receipt.mjs';
import { readAdsConsent, saveAdsConsent, consentSettings, adsConsentKey, adsConsentLifetime } from '../public/assets/js/ads-consent.mjs';
import { submitAndRedirect } from '../public/assets/js/request-delivery.mjs';

const requestId = '11111111-2222-4333-8444-555555555555';
function browserFixture() {
  const values = new Map();
  const storage = { getItem: key => values.get(key) ?? null, setItem: (key,value) => values.set(key,value), removeItem: key => values.delete(key) };
  const browser = { sessionStorage: storage, localStorage: storage, location: { origin: 'https://example.test', pathname: '/thank-you/', hash: '', assign() {} } };
  browser.CustomEvent = class { constructor(type, options) { this.type = type; this.detail = options.detail; } };
  browser.parent = browser;
  return { browser, values };
}

test('Only an accepted heat-pump delivery provides a conversion receipt, including when the quiz is embedded', async () => {
  const { browser: parent, values } = browserFixture();
  const iframe = { parent, location: { origin: parent.location.origin } };
  const receipt = { id: requestId, kind: 'heat-pump' };
  saveAdsConsent(parent, true);
  await submitAndRedirect(async () => ({ accepted: true, receipt }), {}, { browser: iframe });
  assert.equal(readConversionReceipt(parent).id, requestId);
  const stored = JSON.parse(values.get(conversionReceiptKey));
  assert.deepEqual(Object.keys(stored).sort(), ['expiresAt','id','kind','sent','version']);
  for (const result of [{ accepted: false, receipt }, { handoff: true }, { accepted: true, receipt: { ...receipt, kind: 'contact' } }, { accepted: true }]) {
    await submitAndRedirect(async () => result, {}, { browser: iframe });
    assert.equal(readConversionReceipt(parent), null);
  }
  saveAdsConsent(parent, false);
  await submitAndRedirect(async () => ({ accepted: true, receipt }), {}, { browser: iframe });
  assert.equal(readConversionReceipt(parent), null);
});

test('Direct visits, failed deliveries, other pages, reloads and expired receipts do not create conversions', () => {
  const { browser, values } = browserFixture();
  const events = [];
  const send = id => events.push(id);
  assert.equal(recordConfirmedConversion(browser, send), false);
  saveConversionReceipt(browser, { id: requestId, kind: 'heat-pump' }, 1000);
  browser.location.hash = '#completa-invio';
  assert.equal(recordConfirmedConversion(browser, send, 2000), false);
  browser.location.hash = ''; browser.location.pathname = '/preventivo/';
  assert.equal(recordConfirmedConversion(browser, send, 2000), false);
  browser.location.pathname = '/thank-you/';
  assert.equal(recordConfirmedConversion(browser, send, 2000), true);
  assert.equal(recordConfirmedConversion(browser, send, 2000), false);
  assert.deepEqual(events, [requestId]);
  assert.equal(readConversionReceipt(browser, 1001 + conversionReceiptLifetime), null);
  assert(!values.has(conversionReceiptKey));
  assert.equal(saveConversionReceipt(browser, { id: 'arbitrary', kind: 'heat-pump' }), false);
});

test('Advertising requires a current explicit choice; analytics and personalization stay denied', () => {
  const { browser, values } = browserFixture();
  assert.equal(readAdsConsent(browser, 1000), null);
  saveAdsConsent(browser, true, 1000);
  assert.equal(readAdsConsent(browser, 2000), true);
  assert.deepEqual(consentSettings(true), { ad_storage: 'granted', ad_user_data: 'granted', analytics_storage: 'denied', ad_personalization: 'denied' });
  saveAdsConsent(browser, false, 2000);
  assert.equal(readAdsConsent(browser, 3000), false);
  assert(Object.values(consentSettings(false)).every(value => value === 'denied'));
  assert.equal(readAdsConsent(browser, 2001 + adsConsentLifetime), null);
  assert(!values.has(adsConsentKey));
});

test('Blocked storage cannot create a conversion or break form completion', async () => {
  const { browser } = browserFixture();
  Object.defineProperty(browser, 'sessionStorage', { get() { throw new Error('Storage blocked'); } });
  Object.defineProperty(browser, 'localStorage', { get() { throw new Error('Storage blocked'); } });
  let visited;
  browser.location.assign = path => { visited = path; };
  await submitAndRedirect(async () => ({ accepted: true, receipt: { id: requestId, kind: 'heat-pump' } }), {}, { browser });
  assert.equal(visited, '/thank-you/');
  assert.equal(readConversionReceipt(browser), null);
  assert.equal(readAdsConsent(browser), null);
  assert.equal(recordConfirmedConversion(browser, () => assert.fail('Unexpected conversion')), false);
});

test('The deployed entry point blocks Google until consent and records the accepted request only after the tag loads', async () => {
  const { browser } = browserFixture();
  browser.top = browser;
  browser.location.hostname = 'green-flux.com';
  browser.addEventListener = () => {};
  saveConversionReceipt(browser, { id: requestId, kind: 'heat-pump' });
  const nodes = [];
  const scripts = [];
  function element() {
    const children = new Map();
    return {
      dataset: {}, listeners: {}, setAttribute() {}, focus() {}, remove() {},
      addEventListener(name, handler) { this.listeners[name] = handler; },
      querySelector(selector) { if (!children.has(selector)) children.set(selector, element()); return children.get(selector); },
    };
  }
  const doc = { cookie: '', dispatchEvent() {}, createElement: element, head: { append: node => scripts.push(node) }, body: { append: (...items) => nodes.push(...items) } };
  const previous = { window: globalThis.window, document: globalThis.document, location: globalThis.location };
  try {
    globalThis.window = browser; globalThis.document = doc; globalThis.location = browser.location;
    await import('../public/assets/js/ads-measurement.mjs?consent-integration');
    const conversions = () => browser.dataLayer.filter(command => command[0] === 'event' && command[1] === 'conversion');
    assert.equal(scripts.length, 0);
    assert.equal(conversions().length, 0);
    nodes[0].querySelector('[data-consent-accept]').listeners.click();
    assert.equal(scripts.length, 1);
    assert.equal(new URL(scripts[0].src).searchParams.get('id'), 'AW-18501721820');
    assert.equal(conversions().length, 0);
    scripts[0].listeners.load();
    assert.equal(conversions().length, 1);
    assert.deepEqual(conversions()[0][2], { send_to: 'AW-18501721820/c3AoCIbZsq0dENy9p_ZE', transaction_id: requestId, value: 0, currency: 'EUR' });
    nodes[0].querySelector('[data-consent-reject]').listeners.click();
    assert.equal(readAdsConsent(browser), false);
    assert.equal(conversions().length, 1);
    assert.equal(readConversionReceipt(browser).sent, true);
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete globalThis[key]; else globalThis[key] = value;
    }
  }
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { initClarity, readClarityConsent, saveClarityConsent, CLARITY_CONSENT_KEY } from '../public/assets/js/clarity.mjs';

function fixture(host = 'green-flux.com', pathname = '/servizi/pompe-calore/') {
  const values = new Map(), scripts = [], events = new Map(), windowEvents = new Map(), privateNodes = [];
  const browser = {
    location: { hostname: host, pathname, protocol: 'https:' },
    localStorage: { getItem: key => values.get(key) ?? null, setItem: (key,value) => values.set(key,value) },
    CustomEvent: class { constructor(type, options) { this.type = type; this.detail = options.detail; } },
    addEventListener: (name,fn) => windowEvents.set(name, fn),
  };
  browser.top = browser;
  const nodes = [0,1].map(() => ({ setAttribute: (key,value) => privateNodes.push([key,value]) }));
  const doc = {
    documentElement: { dataset: {} }, cookie: '',
    dispatchEvent: event => events.get(event.type)?.(event),
    addEventListener: (name,fn) => events.set(name, fn),
    querySelectorAll: () => nodes,
    createElement: () => ({ dataset: {}, listeners: {}, addEventListener(name,fn) { this.listeners[name] = fn; }, remove() {} }),
    head: { append: script => scripts.push(script) },
  };
  return { browser, doc, values, scripts, privateNodes, windowEvents };
}

test('Clarity waits for its own consent, independently of an existing advertising choice', () => {
  const f = fixture();
  f.values.set('green-flux:ads-consent:v1', '{"version":1,"ads":true}');
  initClarity('testproject', f.browser, f.doc);
  assert.equal(f.scripts.length, 0);
  assert.equal(readClarityConsent(f.browser), null);
  saveClarityConsent(false, f.browser, f.doc);
  assert.equal(f.scripts.length, 0);
  saveClarityConsent(true, f.browser, f.doc);
  assert.equal(f.scripts.length, 1);
  assert.equal(f.scripts[0].src, 'https://www.clarity.ms/tag/testproject');
  assert.equal(f.doc.documentElement.dataset.clarityStatus, 'loading');
  assert.equal(f.privateNodes.length, 2);
  assert(f.privateNodes.every(([key,value]) => key === 'data-clarity-mask' && value === 'true'));
  const calls = Array.from(f.browser.clarity.q, args => Array.from(args));
  assert.deepEqual(calls[0], ['consentv2', { ad_Storage: 'denied', analytics_Storage: 'granted' }]);
  initClarity('testproject', f.browser, f.doc);
  saveClarityConsent(true, f.browser, f.doc);
  assert.equal(f.scripts.length, 1);
  f.scripts[0].listeners.load();
  assert.equal(f.doc.documentElement.dataset.clarityStatus, 'ready');
});

test('Revocation stops recording, clears cookies, and never reloads an unfinished form', () => {
  const f = fixture();
  saveClarityConsent(true, f.browser, f.doc);
  initClarity('testproject', f.browser, f.doc);
  saveClarityConsent(false, f.browser, f.doc);
  assert.equal(f.doc.documentElement.dataset.clarityStatus, 'stopped');
  const calls = Array.from(f.browser.clarity.q, args => Array.from(args));
  assert(calls.some(args => args[0] === 'stop'));
  assert(calls.some(args => args[0] === 'consentv2' && args[1].analytics_Storage === 'denied'));
  assert.match(f.doc.cookie, /Max-Age=0/);
  saveClarityConsent(true, f.browser, f.doc);
  assert.equal(f.scripts.length, 1);
  assert.equal(f.doc.documentElement.dataset.clarityStatus, 'stopped');
});

test('Clarity is excluded from previews, other pages, insecure origins, and embedded frames', () => {
  for (const modify of [f => { f.browser.location.hostname = 'preview.vercel.app'; }, f => { f.browser.location.pathname = '/thank-you/'; }, f => { f.browser.location.pathname = '/'; }, f => { f.browser.location.protocol = 'http:'; }, f => { f.browser.top = {}; }]) {
    const f = fixture(); modify(f);
    saveClarityConsent(true, f.browser, f.doc);
    initClarity('testproject', f.browser, f.doc);
    assert.equal(f.scripts.length, 0);
  }
});

test('Expired, corrupted, or blocked storage cannot imply consent; an explicit current-page choice still works', () => {
  const f = fixture();
  saveClarityConsent(true, f.browser, f.doc, 1000);
  assert.equal(readClarityConsent(f.browser, 2000), true);
  assert.equal(readClarityConsent(f.browser, 1000 + 181 * 86400000), null);
  f.values.set(CLARITY_CONSENT_KEY, '{broken');
  assert.equal(readClarityConsent(f.browser), null);
  Object.defineProperty(f.browser, 'localStorage', { get() { throw Error('blocked'); } });
  initClarity('testproject', f.browser, f.doc);
  assert.equal(f.scripts.length, 0);
  saveClarityConsent(true, f.browser, f.doc);
  assert.equal(f.scripts.length, 1);
});

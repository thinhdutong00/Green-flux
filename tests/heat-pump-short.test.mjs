import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/preventivo.mjs';
import { readShortRequest, validateShortRequest, shortRequestText } from '../public/preventivo/heat-pump-short-data.mjs';
import { captureAttribution, normalizeAttribution } from '../public/assets/js/lead-attribution.mjs';
import { buildCrmRecord } from '../lib/crm-record.mjs';
import { safeLeadEvent, trackLeadEvent } from '../public/assets/js/lead-events.mjs';
import { saveAdsConsent } from '../public/assets/js/ads-consent.mjs';
import { CLARITY_CONSENT_KEY } from '../public/assets/js/clarity.mjs';
import { readSubmissionStatus, saveSubmissionStatus } from '../public/assets/js/submission-status.mjs';
import { submitAndRedirect, createRequestSender } from '../public/assets/js/request-delivery.mjs';
import { landingRequestError } from '../public/assets/js/landing-request-messages.mjs';

const sample = () => ({ kind: 'heat-pump-short', name: 'TEST TECNICO', phone: '+390491234567', city: 'Padova', heating: 'Non lo so', email: 'cliente@example.test', privacy: true, website: '', elapsed: 5000, requestId: '22222222-3333-4444-8555-666666666666' });
const storage = () => { const entries = new Map(); return { getItem: k => entries.get(k) ?? null, setItem: (k,v) => entries.set(k,v), removeItem: k => entries.delete(k) }; };
function browser() {
  const value = { location: { hostname: 'green-flux.com', origin: 'https://green-flux.com', href: 'https://green-flux.com/servizi/pompe-calore/?utm_source=google&utm_medium=cpc&utm_campaign=heat-pump&utm_term=radiatori&email=private', search: '?utm_source=google&utm_medium=cpc&utm_campaign=heat-pump&utm_term=radiatori&email=private' }, document: { referrer: 'https://www.google.com/search?q=private' }, localStorage: storage(), sessionStorage: storage() };
  value.top = value.parent = value;
  return value;
}

test('The short form accepts an omitted email value and unknown heating, while validating any provided email', () => {
  assert.deepEqual(validateShortRequest(sample()), []);
  assert.deepEqual(validateShortRequest({ ...sample(), city: '', heating: '' }), []);
  assert(shortRequestText({ ...sample(), city: '', heating: '' }).includes('Immobile: Da chiedere al telefono'));
  for (const email of ['', '   ']) assert.deepEqual(validateShortRequest({ ...sample(), email }), []);
  for (const [field, value] of [['name',''],['phone','123'],['city','x'],['heating','arbitrary'],['privacy',false],['email',undefined],['email','invalid'],['email',{}]]) assert(validateShortRequest({ ...sample(), [field]: value }).length, field);
  const data = new FormData();
  for (const [key,value] of [['nome',' TEST '],['telefono',' +390491234567 '],['comune',' Padova '],['riscaldamento','Non lo so'],['email',` ${sample().email} `],['privacy','on']]) data.set(key,value);
  assert.deepEqual(validateShortRequest(readShortRequest(data)), []);
  assert.equal(readShortRequest(data).email, sample().email);
  assert(shortRequestText(sample()).includes(`Email: ${sample().email}`));
  data.delete('email');
  assert.equal(readShortRequest(data).email, '');
  assert.deepEqual(validateShortRequest(readShortRequest(data)), []);
  assert(shortRequestText(readShortRequest(data)).includes('Email: Non indicata'));
});

test('The short-form backend validates email when provided and sends distinct idempotent business and customer confirmations after acceptance', async () => {
  const previous = { fetch: globalThis.fetch, key: process.env.RESEND_API_KEY, from: process.env.QUOTE_FROM_EMAIL };
  const calls = [], delivered = new Map(); let fail = false, sequence = 0;
  process.env.RESEND_API_KEY = 'test-key'; process.env.QUOTE_FROM_EMAIL = 'test@example.test';
  globalThis.fetch = async (_url, opts) => {
    const payload = JSON.parse(opts.body), key = opts.headers['Idempotency-Key'];
    calls.push({payload,key});
    if (!delivered.has(key)) delivered.set(key, payload);
    return { ok: !fail, status: fail ? 500 : 200, json: async () => fail ? {} : { id: 'provider-id' } };
  };
  const invoke = async (data = sample()) => {
    const res = { setHeader() {}, status(code) { this.code = code; return this; }, json(body) { this.body = body; } };
    await handler({method:'POST', headers:{'content-type':'application/json',host:'example.test',origin:'https://example.test','x-real-ip':`198.51.100.${++sequence}`}, body:data},res);
    return res;
  };
  try {
    for (let i = 0; i < 2; i++) {
      const res = await invoke();
      assert.equal(res.body.accepted, true); assert.equal(res.body.confirmationStatus, 'sent');
      assert.equal(res.body.receipt.kind, 'heat-pump');
    }
    assert.equal(delivered.size,2); assert.equal(calls.length,4);
    assert.deepEqual(calls[0].payload.to,['info@green-flux.com']); assert.equal(calls[0].payload.reply_to, sample().email);
    assert.equal(calls[0].payload.text, shortRequestText(sample()));
    const confirmation = calls[1].payload;
    assert.deepEqual(confirmation.to, [sample().email]);
    assert.equal(confirmation.reply_to, 'info@green-flux.com');
    assert(confirmation.text.includes(shortRequestText(sample())));
    assert(confirmation.text.includes('la prenderà in carico'));
    assert(confirmation.html.includes(sample().email));
    assert(!confirmation.text.includes('24 ore'));
    assert.notEqual(calls[0].key, calls[1].key);
    assert.equal(calls[0].key, calls[2].key); assert.equal(calls[1].key, calls[3].key);
    for (const data of [{...sample(),website:'spam'}, {...sample(),elapsed:0}, {...sample(),privacy:false}, {...sample(),phone:''}, {...sample(),email:'invalid'}, {...sample(),email:undefined}]) assert.equal((await invoke(data)).code,400);
    assert.equal(calls.length, 4, 'Invalid requests must not reach the email provider');
    fail = true;
    const failure = await invoke(); assert.equal(failure.code,502); assert.notEqual(failure.body.accepted,true);
    assert.equal(calls.length, 5, 'A failed business delivery must not send a customer confirmation');
  } finally {
    globalThis.fetch = previous.fetch;
    for (const [key,value] of [['RESEND_API_KEY',previous.key],['QUOTE_FROM_EMAIL',previous.from]]) if (value === undefined) delete process.env[key]; else process.env[key]=value;
  }
});

test('A short request without email sends only the business notification and registers an empty CRM email without placeholders', async () => {
  const env = { ...process.env }, previousFetch = globalThis.fetch;
  const emails = [], records = [];
  process.env.RESEND_API_KEY = 'test-key';
  process.env.QUOTE_FROM_EMAIL = 'test@example.test';
  process.env.GREEN_FLUX_CRM_URL = 'https://script.google.com/macros/s/test/exec';
  process.env.GREEN_FLUX_CRM_SECRET = 'test-only-crm-secret';
  delete process.env.BLOB_STORE_ID;
  delete process.env.BLOB_READ_WRITE_TOKEN;
  globalThis.fetch = async (url, options) => {
    const payload = JSON.parse(options.body);
    if (String(url).includes('script.google.com')) {
      const record = JSON.parse(payload.payload);
      records.push(record);
      return { ok: true, json: async () => ({ ok: true, requestId: record.requestId }) };
    }
    assert.equal(String(url), 'https://api.resend.com/emails');
    emails.push(payload);
    return { ok: true, json: async () => ({ id: 'mock-provider-acceptance' }) };
  };
  try {
    for (const [index, email] of ['', '   '].entries()) {
      const data = { ...sample(), email, attribution: { consent: false, submissionPage: '/servizi/pompe-calore/' } };
      const response = { setHeader() {}, status(code) { this.code = code; return this; }, json(body) { this.body = body; } };
      await handler({ method: 'POST', headers: { 'content-type': 'application/json', host: 'example.test', origin: 'https://example.test', 'x-real-ip': `198.51.100.${200 + index}` }, body: data }, response);
      assert.equal(response.code, 200);
      assert.equal(response.body.accepted, true);
      assert.equal(response.body.confirmationStatus, 'not_requested');
      assert.equal(response.body.crmStatus, 'registered');
    }
    assert.equal(emails.length, 2, 'Only one business notification per accepted submission');
    for (const email of emails) {
      assert.deepEqual(email.to, ['info@green-flux.com']);
      assert(!('reply_to' in email));
      assert(!email.text.includes('example.test'));
    }
    assert.equal(records.length, 2);
    for (const record of records) {
      assert.equal(record.email, '');
      assert.equal(record.service, 'Pompe di calore');
      assert.equal(record.source, 'Non rilevata');
      assert.equal(record.submissionPage, '/servizi/pompe-calore/');
      assert.equal(record.resendId, 'mock-provider-acceptance');
    }
  } finally { process.env = env; globalThis.fetch = previousFetch; }
});

test('Attribution preserves consented UTM across the iframe, strips unrelated URL queries and never guesses paid traffic', () => {
  const top = browser();
  const denied = captureAttribution(top);
  assert.equal(denied.params,undefined); assert(!denied.submissionPage.includes('?')); assert.equal(denied.referrer,undefined);
  assert.equal(normalizeAttribution(denied).source,'Non rilevata');
  saveAdsConsent(top,true);
  const first = captureAttribution(top);
  assert.equal(first.params.utm_campaign,'heat-pump'); assert.equal(first.params.utm_term,'radiatori');
  const frame = { parent:top, location:{origin:top.location.origin,href:'https://green-flux.com/preventivo/?servizio=pompe-di-calore&embed=1'} };
  const embedded = captureAttribution(frame);
  assert.equal(embedded.entryPage,'/servizi/pompe-calore/'); assert.equal(embedded.submissionPage,'/preventivo/');
  assert.equal(embedded.source,'Google Ads');
  assert(!JSON.stringify(embedded).includes('private'));
  const record = buildCrmRecord({...sample(),attribution:embedded},'heat-pump-short',shortRequestText(sample()));
  assert.equal(record.crm.service,'Pompe di calore'); assert.equal(record.crm.email,sample().email);
  assert.equal(record.crm.source,'Google Ads'); assert(record.crm.campaign.includes('heat-pump'));
  saveAdsConsent(top,false);
  assert.equal(captureAttribution(frame).params,undefined);
  assert.equal(normalizeAttribution({consent:false,params:{gclid:'not-permitted'}}).params,undefined);
  assert.equal(normalizeAttribution({submissionPage:top.location.href}).source,'Non rilevata');
  assert.equal(normalizeAttribution({submissionPage:top.location.href}).entryPage,'');
});

test('Diagnostic events whitelist non-personal fields, require analytics consent and never create advertising conversions', () => {
  const event = safeLeadEvent('quiz_step_complete',{form_position:'quiz',step:2,name:'Private',phone:'private',answers:'private'});
  assert.deepEqual(Object.keys(event).sort(),['event','flow_version','form_position','service','step'].sort());
  assert.equal(safeLeadEvent('conversion'),null);
  assert.deepEqual(safeLeadEvent('lead_cta_click', { name: 'Private', email: 'private@example.test', text: 'Private' }), { event: 'lead_cta_click', service: 'heat-pump', form_position: 'landing', flow_version: 'short-v1' });
  const top=browser(), sent=[];top.clarity=(...args)=>sent.push(args);
  assert.equal(trackLeadEvent('lead_form_success',{},top),false);
  top.localStorage.setItem(CLARITY_CONSENT_KEY,JSON.stringify({version:1,analytics:true,expiresAt:Date.now()+100000}));
  assert.equal(trackLeadEvent('lead_form_success',{email:'private'},top),true);
  assert.deepEqual(sent,[['event','lead_form_success']]); assert(!JSON.stringify(top.dataLayer).includes('private'));
  top.location.hostname='localhost';assert.equal(trackLeadEvent('lead_form_submit',{},top),false);
});

test('Failed short submissions stay in the form, retries keep the same id, and success UI is independent of advertising consent', async () => {
  const top=browser(), visits=[], ids=[]; let fail=true, count=0;
  top.location.assign=path=>visits.push(path);
  const sender=createRequestSender('heat-pump-short',{createId:()=>`id-${++count}`,fetchRequest:async (_url,opts)=>{
    ids.push(JSON.parse(opts.body).requestId); return {ok:!fail,status:fail?502:200,json:async()=>fail?{}:{accepted:true,receipt:{kind:'heat-pump',id:sample().requestId}}};
  }});
  await assert.rejects(submitAndRedirect(sender,sample(),{browser:top,redirectOnError:false}));
  assert.deepEqual(visits,[]);assert.equal(readSubmissionStatus(top),null);
  fail=false;
  await submitAndRedirect(sender,sample(),{browser:top,redirectOnError:false});
  assert.equal(ids[0],ids[1]);assert.deepEqual(visits,['/thank-you/']);
  assert.equal(readSubmissionStatus(top).kind,'heat-pump'); assert.equal(top.sessionStorage.getItem('green-flux:confirmed-request'),null);
  assert.equal(readSubmissionStatus(browser()),null);
  saveSubmissionStatus(top,'heat-pump',100);assert.equal(readSubmissionStatus(top,100+16*60*1000),null);
});

test('Landing delivery errors retain retry guidance without exposing phone or WhatsApp actions from shared API messages', async () => {
  for (const status of [400, 429, 502, 503, 'network']) {
    const top = browser();
    const sender = createRequestSender('heat-pump-short', {
      browser: top,
      createId: () => sample().requestId,
      fetchRequest: async () => {
        if (status === 'network') throw new TypeError('Failed to fetch');
        return { ok: false, status, json: async () => ({ message: 'Riprova, chiamaci al +39 375 552 1420 oppure usa WhatsApp.' }) };
      },
    });
    await assert.rejects(submitAndRedirect(sender, sample(), { browser: top, redirectOnError: false }), error => {
      const message = landingRequestError(error);
      assert.match(message, /riprova/i);
      assert.doesNotMatch(message, /WhatsApp|375|chiam|wa\.me|tel:/i);
      return true;
    });
    assert.equal(readSubmissionStatus(top), null);
  }
});

import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/preventivo.mjs';
import { services } from '../public/preventivo/catalog.mjs';
import { readSiteVisit, validateSiteVisit, siteVisitText } from '../public/preventivo/site-visit-data.mjs';
import { buildCrmRecord } from '../lib/crm-record.mjs';
import { readSubmissionStatus } from '../public/assets/js/submission-status.mjs';
import { createRequestSender, submitAndRedirect } from '../public/assets/js/request-delivery.mjs';
const sample = () => ({ kind:'site-visit',name:'Test Locale',phone:'+390491234567',city:'Padova',service:'fotovoltaico',email:'',notes:'',privacy:true,website:'',elapsed:5000,requestId:'11111111-2222-4333-8444-555555555555' });

test('A brief site visit requires contact, municipality and a real choice without invented technical answers', () => {
  for (const id of [...services.map(s=>s.id),'da-valutare']) {
    const data = {...sample(),service:id};
    assert.deepEqual(validateSiteVisit(data),[]);
    const record=buildCrmRecord(data,'site-visit',siteVisitText(data));
    assert.equal(record.crm.service,id==='da-valutare'?'Da valutare insieme':services.find(s=>s.id===id).label);
    assert.equal(record.crm.name,data.name);assert.equal(record.crm.phone,data.phone);assert.equal(record.crm.city,data.city);
    assert(!/Consumi:|Riscaldamento attuale:|Tipo di immobile:|Tempistiche:/.test(record.text));
    assert.equal(record.crm.source,'Non rilevata');
  }
  for (const [key,value] of [['name',''],['phone','123'],['city',''],['service','arbitrary'],['service',''],['email','wrong'],['privacy',false],['notes','x'.repeat(2001)]]) assert(validateSiteVisit({...sample(),[key]:value}).some(e=>e.name===key));
  const form=new FormData();for(const [key,value] of Object.entries(sample()))form.set(key,key==='privacy'?'on':` ${value} `);
  const data=readSiteVisit(form);assert.equal(data.name,'Test Locale');assert.equal(data.privacy,true);assert.deepEqual(validateSiteVisit(data),[]);
});

test('Brief requests reuse delivery, confirmations, CRM signing and provider deduplication without external traffic', async () => {
  const oldFetch=globalThis.fetch, oldEnv={...process.env};
  const calls=[], unique=new Map();let failBusiness=false, failConfirmation=false, seq=0;
  delete process.env.BLOB_STORE_ID; delete process.env.BLOB_READ_WRITE_TOKEN;
  // Explicitly isolate this test from a developer shell's production configuration.
  for(const key of Object.keys(process.env))if(/REDIS|KV_REST|UPSTASH/.test(key))delete process.env[key];
  process.env.RESEND_API_KEY='test-key';process.env.QUOTE_FROM_EMAIL='test@example.test';
  process.env.GREEN_FLUX_CRM_URL='https://script.google.com/macros/s/test-only/exec';process.env.GREEN_FLUX_CRM_SECRET='test-secret';
  globalThis.fetch=async (url,opts)=>{
    const body=JSON.parse(opts.body);calls.push({url:String(url),body,headers:opts.headers});
    if(String(url).includes('script.google.com'))return {ok:true,json:async()=>({ok:true,requestId:JSON.parse(body.payload).requestId})};
    assert.equal(String(url),'https://api.resend.com/emails');
    const confirmation=body.to[0]!=='info@green-flux.com';
    if(confirmation?failConfirmation:failBusiness)return {ok:false,status:502,json:async()=>({})};
    unique.set(opts.headers['Idempotency-Key'],body);
    return {ok:true,json:async()=>({id:'mock-id'})};
  };
  const invoke=async data=>{const res={setHeader(){},status(code){this.code=code;return this;},json(body){this.body=body;}};await handler({method:'POST',headers:{'content-type':'application/json',host:'example.test',origin:'https://example.test','x-real-ip':`192.0.2.${++seq}`},body:data},res);return res;};
  try {
    const data={...sample(),email:'client@example.test'};
    for(let i=0;i<2;i++){const res=await invoke(data);assert.equal(res.code,200);assert.equal(res.body.receipt.kind,'site-visit');assert.equal(res.body.confirmationStatus,'sent');assert.equal(res.body.crmStatus,'registered');}
    assert.equal(unique.size,2,'Business and customer have separate, stable idempotency keys');
    const business=calls.find(c=>c.body.to?.[0]==='info@green-flux.com').body;
    assert.equal(business.reply_to,data.email);assert(business.text.includes(siteVisitText(data)));
    const confirmation=calls.find(c=>c.body.to?.[0]===data.email).body;
    assert(confirmation.text.includes(siteVisitText(data)));assert(!confirmation.text.includes('24 ore'));
    const crm=calls.find(c=>c.url.includes('script.google.com')).body;
    assert(crm.signature);const payload=JSON.parse(crm.payload);assert.equal(payload.kind,'site-visit');assert.equal(payload.service,'Fotovoltaico');assert.equal(payload.requestId,data.requestId);
    const before=calls.length;for(const invalid of [{...data,email:undefined},{...data,phone:''},{...data,service:'arbitrary'},{...data,privacy:false},{...data,website:'spam'},{...data,elapsed:0}])assert.equal((await invoke(invalid)).code,400);
    assert.equal(calls.length,before);
    failBusiness=true;const failed=await invoke(data);assert.equal(failed.code,502);assert(!failed.body.accepted);assert.equal(calls.length,before+1);
    failBusiness=false;failConfirmation=true;const accepted=await invoke({...data,service:'pompe-di-calore'});assert.equal(accepted.body.accepted,true);assert.equal(accepted.body.receipt.kind,'heat-pump');assert.equal(accepted.body.confirmationStatus,'failed');
    const phoneOnly=await invoke(sample());assert.equal(phoneOnly.body.confirmationStatus,'not_requested');
  } finally {globalThis.fetch=oldFetch;for(const key of Object.keys(process.env))if(!(key in oldEnv))delete process.env[key];Object.assign(process.env,oldEnv);}
});

test('Brief request failure stays in the form; a retry keeps its ID and success works without advertising consent', async () => {
  const entries=new Map(), destinations=[],ids=[];let fail=true,t=10000;
  const storage={getItem:key=>entries.get(key)??null,setItem:(k,v)=>entries.set(k,v),removeItem:k=>entries.delete(k)};
  const browser={location:{origin:'https://green-flux.com',hostname:'green-flux.com',href:'https://green-flux.com/preventivo/',assign:p=>destinations.push(p)},sessionStorage:storage,localStorage:storage,document:{referrer:''}};browser.parent=browser.top=browser;
  const sender=createRequestSender('site-visit',{browser,now:()=>t,createId:()=>sample().requestId,fetchRequest:async(_url,opts)=>{ids.push(JSON.parse(opts.body).requestId);return {ok:!fail,status:fail?502:200,json:async()=>fail?{}:{accepted:true,receipt:{id:sample().requestId,kind:'site-visit'}}};}});
  t+=5000;await assert.rejects(submitAndRedirect(sender,sample(),{browser,redirectOnError:false}));assert.deepEqual(destinations,[]);assert.equal(readSubmissionStatus(browser),null);
  fail=false;await submitAndRedirect(sender,sample(),{browser,redirectOnError:false});assert.equal(ids[0],ids[1]);assert.deepEqual(destinations,['/thank-you/']);assert.equal(readSubmissionStatus(browser).kind,'site-visit');assert.equal(storage.getItem('green-flux:confirmed-request'),null);
});

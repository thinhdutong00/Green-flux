import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync,readdirSync,existsSync,statSync } from 'node:fs';
import { join,resolve,relative } from 'node:path';
import { services,quoteText } from '../public/preventivo/data.mjs';
import { propertyTypes,annualConsumptions,installationSpaces,timelines,serviceId,validateFunnel,readFunnel,questionsFor,adjacentFunnelStep } from '../public/preventivo/funnel-data.mjs';
import { textContactLinks } from '../public/assets/js/handoff.mjs';
import { mobileHeaderForService } from '../public/assets/js/mobile-header.mjs';
const root=resolve('public');const walk=dir=>readdirSync(dir,{withFileTypes:true}).flatMap(x=>x.isDirectory()?walk(join(dir,x.name)):[join(dir,x.name)]);const pages=walk(root).filter(p=>p.endsWith('.html'));
const answersFor = ids => Object.fromEntries(ids.map(id => [id, Object.fromEntries(questionsFor([id]).map(q => [q.id, q.options[0]]))]));
const sample=()=>({funnel:'conditional',services:['fotovoltaico','smart-home'],answers:answersFor(['fotovoltaico','smart-home']),propertyType:propertyTypes[0],timeline:timelines[2],name:'Test Locale',email:'test@example.com',phone:'',city:'Padova',notes:'Contenuto di test, nessun invio.',privacy:true});
test('Every copied and added route has a local destination and its required assets',()=>{
 const errors=[];
 for(const page of pages){const html=readFileSync(page,'utf8');
  for(const match of html.matchAll(/\b(?:href|src|poster)="([^"#]+)"/g)){
   const url=match[1];if(!url.startsWith('/')||url.startsWith('//'))continue;
   const path=decodeURIComponent(url.split(/[?#]/)[0]);let target=join(root,path);if(existsSync(target)&&statSync(target).isDirectory())target=join(target,'index.html');
   if(!existsSync(target))errors.push(`${relative(root,page)} → ${path}`);
  }
  for(const match of html.matchAll(/(?:srcset|imagesrcset)="([^"]+)"/g))for(const part of match[1].split(',')){const path=part.trim().split(/\s+/)[0];if(path.startsWith('/')&&!existsSync(join(root,path)))errors.push(`${relative(root,page)} srcset → ${path}`);}
 }
 for(const css of walk(root).filter(p=>p.endsWith('.css'))){for(const m of readFileSync(css,'utf8').matchAll(/url\(['"]?([^)'"\s]+)/g)){if(m[1].startsWith('/')&&!existsSync(join(root,m[1])))errors.push(`${relative(root,css)} → ${m[1]}`);}}
 assert.deepEqual([...new Set(errors)],[]);
});
test('Marketing pages use Green Flux identity and never ship reference lead or ad integrations',()=>{
 for(const page of pages){const html=readFileSync(page,'utf8');assert(!/info@venetagreen|393669224744|04626150272|AW-11114392153|uc4g2w3pct|google-ads-tracking\.js|lead-platform\.js|google-reviews\//.test(html),relative(root,page));assert(html.includes('Green Flux'),page);}
});
test('Every Green Flux technology has its own explanation, decision criteria and matching quote',()=>{
 const {services:catalogue,support}=JSON.parse(readFileSync('content/site-content.json'));
 assert.equal(catalogue.length,10);assert.equal(support.length,5);
 const titles=new Set();
 for(const service of catalogue){const html=readFileSync(join(root,'servizi',service.slug,'index.html'),'utf8');assert(html.includes(`servizio=${service.quote}`));assert(html.includes(service.introTitle));assert(!titles.has(service.introTitle));titles.add(service.introTitle);for(const [question] of service.faqs)assert(html.includes(question));assert.equal([...html.matchAll(/<h1\b/g)].length,1);assert(!html.includes('venetagreen-trust'));}
 const supportPage=readFileSync(join(root,'servizi/progettazione-e-supporto/index.html'),'utf8');
 for(const item of support){assert(supportPage.includes(`id="${item.id}"`));assert(!supportPage.includes(`servizio=${item.id}`));assert.equal(serviceId(item.id),null);}
});
test('The six-step funnel starts with the name, then the ten installations, and supports direct links',()=>{
 const html=readFileSync(join(root,'preventivo/index.html'),'utf8');assert.equal([...html.matchAll(/data-step="\d+"/g)].length,6);
 const step1=html.match(/data-step="1"[\s\S]*?<\/section>/)[0];
 const step2=html.match(/data-step="2"[\s\S]*?<\/section>/)[0];
 assert(step1.includes('name="nome"'));assert(!step1.includes('name="immobile"'));assert(!step1.includes('name="servizio"'));
 const contacts=html.match(/data-step="6"[\s\S]*?<\/section>/)[0];
 assert(contacts.includes('name="immobile"'));assert(!contacts.includes('name="nome"'));
 assert.equal([...step2.matchAll(/name="servizio"/g)].length,10);
 for(const s of services){assert(step2.includes(`value="${s.id}"`),s.id);assert.equal(serviceId(s.id),s.id);assert.deepEqual(validateFunnel({...sample(),services:[s.id],answers:answersFor([s.id])}),[]);}
 assert.equal(serviceId('pompe-calore'),'pompe-di-calore');assert.equal(serviceId('fotovoltaico-residenziale'),'fotovoltaico');assert.equal(serviceId('climatizzazione'),'condizionatori');assert.equal(serviceId('arbitrary'),null);
 assert(!supportQuoteLinks().length);
});
function supportQuoteLinks(){
 return pages.flatMap(page=>[...readFileSync(page,'utf8').matchAll(/href="(\/preventivo\/\?servizio=([^"&]+))"/g)].filter(m=>!services.some(s=>s.id===m[2])).map(m=>`${page}: ${m[1]}`));
}
test('Every installation page carries its service through header, content, footer and mobile quote links',()=>{
 const {services:catalogue}=JSON.parse(readFileSync('content/site-content.json'));
 const quoteLinks=html=>[...html.matchAll(/href="(\/preventivo\/[^"\s]*)"/g)].map(match=>match[1]);
 for(const service of catalogue){
  const html=readFileSync(join(root,'servizi',service.slug,'index.html'),'utf8');
  const context=html.match(/<body[^>]*data-quote-service="([^"]+)"/)[1];
  assert.equal(context,service.quote);
  const links=quoteLinks(html);
  assert(links.length>=4,service.slug);
  for(const href of [...links,...quoteLinks(mobileHeaderForService(context))]){
   assert.equal(href,`/preventivo/?servizio=${service.quote}`,service.slug);
  }
 }
 for(const route of ['','servizi','servizi/progettazione-e-supporto','contatti']){
  const html=readFileSync(join(root,route,'index.html'),'utf8');
  assert(!html.includes('data-quote-service='),route);
  assert(quoteLinks(html).includes('/preventivo/'),route);
 }
 assert.deepEqual(quoteLinks(mobileHeaderForService()),['/preventivo/']);
});
test('Preselected installation journeys skip service selection in both directions and retain the name and relevant answers',()=>{
 for(const requested of [...services.map(service=>service.id),'pompe-calore','climatizzazione','fotovoltaico-residenziale']){
  const id=serviceId(requested);
  const form=new FormData();form.set('servizio',id);
  assert.equal(validateFunnel(readFunnel(form))[0].step,0);
  form.set('nome','Test Locale');
  let current=0;const visited=[current];
  while(current<5){
   assert(!validateFunnel(readFunnel(form)).some(issue=>issue.step===current));
   current=adjacentFunnelStep(current,1,requested);visited.push(current);
   for(const question of questionsFor([id]).filter(question=>question.step===current))form.set(question.name,question.options[0]);
   if(current===4)form.set('tempistiche',timelines[0]);
  }
  assert.deepEqual(visited,[0,2,3,4,5],requested);
  form.set('immobile',propertyTypes[0]);form.set('comune','Padova');form.set('email','test@example.com');form.set('privacy','on');
  const data=readFunnel(form);
  assert.deepEqual(validateFunnel(data),[]);
  assert.deepEqual(data.services,[id]);
  assert(quoteText(data).includes(services.find(service=>service.id===id).label));
  const back=[current];
  while(current>0){current=adjacentFunnelStep(current,-1,requested);back.push(current);}
  assert.deepEqual(back,[5,4,3,2,0],requested);
  assert.equal(adjacentFunnelStep(0,-1,requested),0);
  assert.equal(adjacentFunnelStep(5,1,requested),5);
 }
 for(const requested of [undefined,null,'','invalid','consulenza','__proto__']){
  assert.equal(adjacentFunnelStep(0,1,requested),1);
  assert.equal(adjacentFunnelStep(2,-1,requested),1);
  const form=new FormData();form.set('nome','Test Locale');
  assert.equal(validateFunnel(readFunnel(form))[0].step,1);
 }
});
test('Conditional validation requires only relevant answers, including each selected installation',()=>{
 assert.equal(validateFunnel({...sample(),name:''})[0].step,0);
 assert.equal(validateFunnel({...sample(),propertyType:''})[0].step,5);
 assert.deepEqual(validateFunnel(sample()),[]);assert.deepEqual(validateFunnel({...sample(),email:'',phone:'+39 333 123 4567'}),[]);
 for(const changes of [{services:[]},{services:['invalid']},{services:['fotovoltaico','fotovoltaico']},{propertyType:''},{answers:{}},{timeline:''},{name:' '},{email:'',phone:''},{email:'broken'},{phone:'abcdef'},{city:''},{privacy:false},{notes:'x'.repeat(2001)}])assert(validateFunnel({...sample(),...changes}).length,JSON.stringify(changes));
 const allIds=services.map(s=>s.id);
 assert.deepEqual(validateFunnel({...sample(),services:allIds,answers:answersFor(allIds)}),[]);
 for(const id of allIds){
  const valid={...sample(),services:[id],answers:answersFor([id])};
  assert.equal(questionsFor([id]).length,2,id);
  for(const q of questionsFor([id])){
   const missing={...valid,answers:{[id]:{...valid.answers[id],[q.id]:''}}};
   assert.equal(validateFunnel(missing)[0].step,q.step);
   for(const answer of q.options)assert.deepEqual(validateFunnel({...valid,answers:{[id]:{...valid.answers[id],[q.id]:answer}}}),[]);
  }
 }
 const water={...sample(),services:['trattamento-acqua'],answers:answersFor(['trattamento-acqua'])};
 assert.deepEqual(validateFunnel(water),[]);
 assert(!questionsFor(water.services).some(q=>q.options.some(o=>o.includes('kWh')||o.includes('Tetto'))));
 const multi=sample();delete multi.answers['smart-home'].funzioni;
 assert(validateFunnel(multi).some(e=>e.step===2&&e.message.includes('Smart home')));
 for(const propertyType of propertyTypes)for(const timeline of timelines)assert.deepEqual(validateFunnel({...sample(),propertyType,timeline}),[]);
});
test('Summary and contact links retain conditional answers and discard deselected installations',()=>{
 const d=sample();const text=quoteText(d);
 for(const value of [d.propertyType,d.timeline,d.name,d.email,d.city,d.notes,'Smart home e automazioni',...Object.values(d.answers).flatMap(Object.values)])assert(text.includes(value),value);
 const links=textContactLinks(text);assert(links.email.startsWith('mailto:info@green-flux.com?'));assert.equal(new URL(links.whatsapp).pathname,'/393755521420');assert.equal(new URL(links.whatsapp).searchParams.get('text'),text);
 const data=new FormData();data.append('servizio','smart-home');data.set('nome','  Test  ');data.set('privacy','on');
 data.set('risposta.smart-home.funzioni','Luci e consumi elettrici');data.set('risposta.fotovoltaico.consumi',annualConsumptions[0]);
 const parsed=readFunnel(data);assert.deepEqual(parsed.services,['smart-home']);assert.equal(parsed.name,'Test');assert.equal(parsed.privacy,true);
 assert.equal(parsed.answers['smart-home'].funzioni,'Luci e consumi elettrici');assert(!parsed.answers.fotovoltaico);
 const changed={...d,services:['smart-home']};
 assert(!quoteText(changed).includes('kWh'));assert(!quoteText(changed).includes('Fotovoltaico'));
 assert.deepEqual(questionsFor(['fotovoltaico']).map(q=>q.options),[annualConsumptions,installationSpaces]);
});

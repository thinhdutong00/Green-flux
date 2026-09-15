import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync,readdirSync,existsSync,statSync } from 'node:fs';
import { join,resolve,relative } from 'node:path';
import { services,quoteText } from '../public/preventivo/data.mjs';
import { propertyTypes,annualConsumptions,installationSpaces,timelines,serviceId,validateFunnel,readFunnel } from '../public/preventivo/funnel-data.mjs';
import { textContactLinks } from '../public/assets/js/handoff.mjs';
const root=resolve('public');const walk=dir=>readdirSync(dir,{withFileTypes:true}).flatMap(x=>x.isDirectory()?walk(join(dir,x.name)):[join(dir,x.name)]);const pages=walk(root).filter(p=>p.endsWith('.html'));
const sample=()=>({funnel:'reference',services:['fotovoltaico','smart-home'],propertyType:propertyTypes[0],annualConsumption:annualConsumptions[1],installationSpace:'Impianto esistente',timeline:timelines[2],name:'Test Locale',email:'test@example.com',phone:'',city:'Padova',notes:'Contenuto di test, nessun invio.',privacy:true});
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
 for(const item of support){assert(supportPage.includes(`id="${item.id}"`));assert(supportPage.includes(`servizio=${item.id}`));}
});
test('The six-step funnel includes every service and works with direct service links',()=>{
 const html=readFileSync(join(root,'preventivo/index.html'),'utf8');assert.equal([...html.matchAll(/data-step="\d+"/g)].length,6);
 for(const s of services){assert(html.includes(`value="${s.id}"`),s.id);assert.equal(serviceId(s.id),s.id);assert.deepEqual(validateFunnel({...sample(),services:[s.id]}),[]);}
 assert.equal(serviceId('pompe-calore'),'pompe-di-calore');assert.equal(serviceId('fotovoltaico-residenziale'),'fotovoltaico');assert.equal(serviceId('climatizzazione'),'condizionatori');assert.equal(serviceId('arbitrary'),null);
});
test('Funnel validation preserves answers and rejects missing steps, bad contacts and unchecked privacy',()=>{
 assert.deepEqual(validateFunnel(sample()),[]);assert.deepEqual(validateFunnel({...sample(),email:'',phone:'+39 333 123 4567'}),[]);
 for(const changes of [{services:[]},{services:['invalid']},{propertyType:''},{annualConsumption:'invalid'},{installationSpace:'invalid'},{timeline:''},{name:' '},{email:'',phone:''},{email:'broken'},{phone:'abcdef'},{city:''},{privacy:false},{notes:'x'.repeat(2001)}])assert(validateFunnel({...sample(),...changes}).length,JSON.stringify(changes));
 for(const type of propertyTypes)for(const annual of annualConsumptions)for(const space of installationSpaces)for(const timeline of timelines)assert.deepEqual(validateFunnel({...sample(),propertyType:type,annualConsumption:annual,installationSpace:space,timeline}),[]);
});
test('Summary carries all six funnel answers and only prepares the Green Flux recipient',()=>{
 const d=sample();const text=quoteText(d);for(const value of [d.propertyType,d.annualConsumption,d.installationSpace,d.timeline,d.name,d.email,d.city,d.notes,'Smart home e automazioni'])assert(text.includes(value));
 const links=textContactLinks(text);assert(links.email.startsWith('mailto:info@green-flux.com?'));assert.equal(new URL(links.whatsapp).pathname,'/393755521420');assert.equal(new URL(links.whatsapp).searchParams.get('text'),text);
 const data=new FormData();data.append('servizio','smart-home');data.set('nome','  Test  ');data.set('privacy','on');const parsed=readFunnel(data);assert.deepEqual(parsed.services,['smart-home']);assert.equal(parsed.name,'Test');assert.equal(parsed.privacy,true);
});

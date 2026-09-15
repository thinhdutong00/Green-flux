import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { services } from '../public/preventivo/data.mjs';
import { serviceId } from '../public/preventivo/funnel-data.mjs';
import { mobileHeaderMarkup } from '../public/assets/js/mobile-header-template.mjs';
const walk=dir=>readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(join(dir,e.name)):[join(dir,e.name)]);
const pages=walk('public').filter(p=>p.endsWith('index.html'));
const textOnly=html=>html.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi,'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ');

test('Only documented activities appear in the catalogue and legacy requests become consultation',()=>{
 assert.equal(services.length,17);
 for(const id of ['batterie-accumulo','manutenzione','edilizia']){
  assert(!services.some(s=>s.id===id));
  assert.equal(serviceId(id),'consulenza');
  assert(!mobileHeaderMarkup.includes(`/servizi/${id}/`));
 }
 assert.equal(serviceId('efficientamento-energetico'),'consulenza');
 assert.equal(services[0].id,'pompe-di-calore');
 const quote=readFileSync('public/preventivo/index.html','utf8');
 const optionIds=[...quote.matchAll(/name="servizio"[^>]*value="([^"]+)"/g)].map(m=>m[1]);
 assert.deepEqual(new Set(optionIds),new Set(services.map(s=>s.id)));
});

test('Every page has an editorial audit record and no imported commercial promises',()=>{
 const audit=JSON.parse(readFileSync('docs/content-audit.json','utf8'));
 assert.equal(audit.total_pages,pages.length);
 for(const file of pages){
  const html=readFileSync(file,'utf8'),route='/'+file.replace(/^public\//,'').replace(/index\.html$/,'');
  assert(audit.pages[route],route);
  const text=textOnly(html);
  assert(!/VenetaGreen|preventivo gratuito|comuni coperti|regioni servite|squadra tecnica|progetti realizzati|Conto Termico|Ecobonus|giugno 2026|manutenzione programmata|batterie di accumulo|cappotto/i.test(text),route);
  for(const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)){
   const data=JSON.parse(m[1]);
   assert(!/"(?:areaServed|aggregateRating|review|offers|datePublished)"/.test(m[1]),route);
   const org=data['@graph'].find(n=>n['@type']==='Organization');
   assert.equal(org.legalName,'GREEN FLUX srls');
   assert.equal(org.email,'info@green-flux.com');
   assert.equal(org.address.addressLocality,'Padova');
  }
 }
});

test('Territorial pages require availability confirmation and do not imply local branches',()=>{
 for(const file of pages.filter(p=>p.startsWith('public/zone/'))){
  const text=textOnly(readFileSync(file,'utf8'));
  assert(text.includes('La disponibilità va chiesta direttamente a Green Flux'),file);
  assert(text.includes('La sede Green Flux è in Via Trieste, 19, 35121 Padova'),file);
  assert(!/comuni serviti|copertura pubblicata|sopralluoghi sul territorio|richieste arrivano da/i.test(text),file);
 }
});

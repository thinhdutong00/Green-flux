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

test('Only the ten installations appear in the quote catalogue; unsupported legacy requests are not preselected',()=>{
 assert.equal(services.length,10);
 for(const id of ['batterie-accumulo','manutenzione','edilizia']){
  assert(!services.some(s=>s.id===id));
  assert.equal(serviceId(id),null);
  assert(!mobileHeaderMarkup.includes(`/servizi/${id}/`));
 }
 assert.equal(serviceId('efficientamento-energetico'),null);
 assert.equal(serviceId('fotovoltaico-aziendale'),'fotovoltaico');
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

test('Consolidation keeps 19 canonical pages and redirects every removed URL without chains',()=>{
 const previous=JSON.parse(readFileSync('content/previous-routes.json'));
 const redirects=JSON.parse(readFileSync('content/redirects.json'));
 const current=new Set(pages.map(p=>'/'+p.replace(/^public\//,'').replace(/index\.html$/,'')));
 assert.equal(current.size,19);assert.equal(Object.keys(redirects).length,132);
 assert(!pages.some(p=>/^public\/(zone|blog|progetti)\//.test(p)));
 for(const old of previous){assert(current.has(old)||redirects[old],old);if(redirects[old]){const destination=redirects[old].split('#')[0];assert(current.has(destination),old);assert(!redirects[destination],old);}}
 for(const page of pages){const html=readFileSync(page,'utf8');for(const m of html.matchAll(/href="([^"?#]+)[^"]*"/g))assert(!redirects[m[1]],`${page} links to retired ${m[1]}`);}
 const text=textOnly(readFileSync('public/contatti/index.html','utf8'));
 assert(text.includes('Via Trieste, 19'));assert(text.includes('disponibilità dell’intervento si conferma direttamente'));
});

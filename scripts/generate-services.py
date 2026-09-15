"""Extend the imported service template with Green Flux's documented service catalog."""
import json,copy,sys
from pathlib import Path
from bs4 import BeautifulSoup
ROOT=Path(__file__).resolve().parents[1];PUBLIC=ROOT/'public';ORIGIN='https://green-flux-nine.vercel.app'
DATA=json.loads((ROOT/'content/green-flux-services.json').read_text())
BASE={'fotovoltaico-residenziale':('Fotovoltaico residenziale','Impianti per casa progettati su consumi, tetto disponibile e autoconsumo.','fotovoltaico'),'fotovoltaico-aziendale':('Fotovoltaico aziendale','Soluzioni per imprese e attività produttive, con analisi tecnica e studio dei consumi.','fotovoltaico'),'pompe-calore':('Pompe di calore','Riscaldamento, raffrescamento e acqua calda integrati con il fabbisogno dell’edificio.','pompe-di-calore'),'climatizzazione':('Climatizzazione efficiente','Comfort estivo e invernale con macchine dimensionate sui tuoi ambienti.','condizionatori'),'consulenza':('Consulenza energetica','Analisi di consumi, edificio e priorità prima di scegliere gli interventi.','progettazione'),'batterie-accumulo':('Batterie di accumulo','Accumulo fotovoltaico dimensionato su produzione e consumi reali.','fotovoltaico'),'manutenzione':('Manutenzione impianti','Controlli e assistenza per rendimento, sicurezza e continuità degli impianti.','impianti'),'edilizia':('Riqualificazione energetica','Interventi coordinati su involucro, coperture e impianti.','impianti-completi')}
CATALOG={**BASE,**{d['slug']:(d['title'],d['lead'],d['image']) for d in DATA}}
template=(PUBLIC/'servizi/pompe-calore/index.html').read_text()
def text(node,value):
 if node is not None:node.clear();node.append(value)
def picture(img,asset,alt):
 img['src']=f'/assets/{asset}-750.webp';img['srcset']=f'/assets/{asset}-400.webp 400w, /assets/{asset}-750.webp 750w';img['alt']=alt;img['width']='750';img['height']='500'
 img.attrs.pop('data-image-id',None);img.attrs.pop('data-image-kind',None)
 if img.parent.name=='picture':
  for src in img.parent.select('source'):src['srcset']=img['srcset']
def cards(section,slugs):
 prototypes=section.select('.single-service-card')
 wrapper=section.select_one('.service-card-wrapper')
 if not prototypes or not wrapper:return
 model=copy.deepcopy(prototypes[0]);wrapper.clear()
 for slug in slugs:
  title,lead,asset=CATALOG[slug];card=copy.deepcopy(model)
  text(card.select_one('h3'),title);text(card.select_one('.service-title > .body-text-16:not(.zone-card-meta)'),lead)
  meta=card.select_one('.zone-card-meta')
  if meta:meta.decompose()
  icon=card.select_one('.service-icon-wrapper img')
  if icon:icon['src']='/assets/ui/asset-009.svg';icon['alt']=''
  a=card.select_one('a');a['href']=f'/servizi/{slug}/';text(a.select_one('.primary-button-text'),'APPROFONDISCI')
  wrapper.append(card)
for d in DATA:
 s=BeautifulSoup(template,'html.parser');title=d['title'];slug=d['slug'];url=ORIGIN+f'/servizi/{slug}/'
 text(s.title,title+' | Green Flux');text(s.h1,title)
 hero=s.select_one('.internal-hero-shell');p=hero.select_one('.internal-hero-description') or hero.select_one('.internal-hero-content p:last-child')
 if p:text(p,d['lead'])
 for p in hero.select('p'):
  if 'dimensionate sul fabbisogno' in p.get_text():text(p,d['lead'])
 crumb=s.select_one('.vg-breadcrumbs') or s.select_one('nav[aria-label="Percorso"]')
 if crumb:
  last=crumb.select('li')[-1];text(last,title)
 # The exact reference feature, image/text, details, process and FAQ layout is retained.
 for block,pair in zip(s.select('.feature-section:not(._02) .feature-text'),d['features']):
  ps=block.select('p');text(ps[0],pair[0]);text(ps[1],pair[1])
 case=s.select_one('.case-study-section');text(case.h2,d['intro']);text(case.select_one('.title-top p'),d['lead'])
 for block,pair in zip(case.select('.text-wrap'),d['features'][:2]):
  ps=block.select('p');text(ps[0],pair[0]);text(ps[1],pair[1])
 details=s.select('main > .service-section')[0];text(details.h2,'Cosa valutiamo per il tuo progetto')
 for block,pair in zip(details.select('.single-service-card'),d['details']):text(block.h3,pair[0]);text(block.select_one('.service-title p'),pair[1])
 for block,pair in zip(s.select('.features-text'),d['includes']+[['Perché Green Flux','Competenze elettriche e idrauliche, professionisti qualificati e un unico interlocutore per realizzare il sistema.']]):
  ps=block.select('p');text(ps[0],pair[0]);text(ps[1],pair[1])
 for block,pair in zip(s.select('.project-text'),d['includes']):
  ps=block.select('p');text(ps[0],pair[0]);text(ps[1],pair[1])
 for block,pair in zip(s.select('.single-faq'),d['faqs']):text(block.h3,pair[0]);text(block.select_one('.faq-answer p'),pair[1])
 for image in [hero.select_one('.hero-bg-image'),case.select_one('.case-study-image'),s.select_one('.faq-image')]:
  if image:picture(image,d['image'],title)
 process=s.select_one('.project-section');process['style']=f'background-image:linear-gradient(180deg,rgba(0,0,0,.3),rgba(0,0,0,.65)),url(/assets/{d["image"]}-750.webp);background-position:center;background-size:cover'
 for sec in s.select('main > .service-section')[1:]:
  if sec.has_attr('data-internal-links-for'):
   sec['data-internal-links-for']=f'/servizi/{slug}/';text(sec.h2,'Approfondisci il tuo intervento');text(sec.select_one('.service-section-title > p.body-text-16'),'Collega esigenze, servizi e progettazione per preparare una richiesta più precisa.')
  cards(sec,d['related'])
 for a in s.select('a[href="/preventivo/"]'):a['href']=f'/preventivo/?servizio={slug}'
 for tag in s.select('meta[name="description"],meta[property="og:description"],meta[name="twitter:description"]'):tag['content']=d['lead']
 for tag in s.select('meta[property="og:title"],meta[name="twitter:title"]'):tag['content']=title+' | Green Flux'
 for tag in s.select('meta[property="og:url"]'):tag['content']=url
 for tag in s.select('meta[property="og:image"],meta[name="twitter:image"]'):tag['content']=ORIGIN+f'/assets/{d["image"]}-750.webp'
 for tag in s.select('meta[property^="og:image:"],meta[name="twitter:image:alt"],link[rel="preload"][as="image"]'):tag.decompose()
 s.select_one('link[rel="canonical"]')['href']=url
 for tag in s.select('script[type="application/ld+json"]'):
  schema=json.loads(tag.string)
  for entity in schema.get('@graph',[]):
   if entity.get('@type')=='WebPage':entity.update({'@id':url,'url':url,'name':title+' | Green Flux'})
  tag.string=json.dumps(schema,ensure_ascii=False)
 out=PUBLIC/'servizi'/slug/'index.html';out.parent.mkdir(parents=True,exist_ok=True);out.write_text(str(s))
# Add the new services to the reference catalog using its own cards.
p=PUBLIC/'servizi/index.html';s=BeautifulSoup(p.read_text(),'html.parser');listing=s.select_one('.service-collection-list');model=copy.deepcopy(listing.select_one('.service-collection-item'))
for d in DATA:
 existing=listing.find(id=d['slug'])
 if existing:existing.decompose()
 card=copy.deepcopy(model);card['id']=d['slug'];text(card.h3,d['title']);text(card.select_one('.service-title p'),d['lead']);card.select_one('a')['href']=f'/servizi/{d["slug"]}/'
 img=card.select_one('img');img['src']=f'/assets/{d["image"]}-400.webp';img['alt']=d['title'];img['class']=['icon','service-card-icon','gf-service-photo'];listing.append(card)
p.write_text(str(s))
# Keep every new route reachable from the global footer, with the same typography.
for p in PUBLIC.rglob('index.html'):
 s=BeautifulSoup(p.read_text(),'html.parser');footer=s.select_one('.footer-brand-text')
 if footer and not s.select_one('.gf-footer-extra'):
  nav=s.new_tag('nav',attrs={'class':'gf-footer-extra','aria-label':'Altri impianti e servizi Green Flux'})
  for d in DATA:
   a=s.new_tag('a',href=f'/servizi/{d["slug"]}/');a.string=d['title'];nav.append(a)
  footer.insert_before(nav)
 p.write_text(str(s))
(ROOT/'content/service-routes.json').write_text(json.dumps({k:{'title':v[0],'description':v[1],'image':v[2]} for k,v in CATALOG.items()},ensure_ascii=False,indent=2)+'\n')
print('Added',len(DATA),'services;',len(CATALOG),'service pages total.')

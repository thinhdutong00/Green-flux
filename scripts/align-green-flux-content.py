"""Apply the verified Green Flux editorial model to the existing visual templates.

The reference site's page structure is retained; company claims come exclusively
from content/green-flux-profile.json. Legacy URLs remain available as request aids.
Requires BeautifulSoup, as do the existing import utilities. This is not a build step.
"""
import copy,json,re,html
from pathlib import Path
from bs4 import BeautifulSoup,NavigableString
ROOT=Path(__file__).resolve().parents[1]; PUBLIC=ROOT/'public'; ORIGIN='https://green-flux-nine.vercel.app'
PROFILE=json.loads((ROOT/'content/green-flux-profile.json').read_text())
SERVICES={d['slug']:d for d in json.loads((ROOT/'content/service-pages.json').read_text())}
GUIDES={d['slug']:d for d in json.loads((ROOT/'content/editorial-pages.json').read_text())}
PAGES={'/'+str(p.relative_to(PUBLIC)).replace('index.html',''):BeautifulSoup(p.read_text(),'html.parser') for p in PUBLIC.rglob('index.html')}
META={}; CATALOG=[d for d in SERVICES.values() if d['kind']=='service']; SOURCE=PROFILE['source_url']
UNCONFIRMED={'/servizi/batterie-accumulo/':'/servizi/consulenza/','/servizi/manutenzione/':'/servizi/consulenza/','/servizi/edilizia/':'/servizi/impianti-completi/'}
LOCATIONS={'veneto':'Veneto','friuli-venezia-giulia':'Friuli-Venezia Giulia','friuli':'Friuli-Venezia Giulia'}
LOCAL_TOPICS={'fotovoltaico':'fotovoltaico-residenziale','pompe-calore':'pompe-calore','climatizzazione':'climatizzazione','consulenza-energetica':'consulenza','efficientamento-energetico':'edilizia','batterie-accumulo':'batterie-accumulo','manutenzione':'manutenzione'}

def txt(node,value):
 if node is not None: node.clear();node.append(value)
def setall(s,selector,value):
 for node in s.select(selector):txt(node,value)
def fragment(markup):return BeautifulSoup(markup,'html.parser')
def inner(node,markup):
 node.clear()
 for child in list(fragment(markup).contents):node.append(child)
def esc(value):return html.escape(str(value),quote=True)
def copy_node(node):return copy.deepcopy(node)
def title(route,title,lead,kind='page'):
 META[route]={'title':title,'description':lead,'kind':kind,'source_url':SOURCE}
 s=PAGES[route];txt(s.title,title+' | Green Flux');txt(s.h1,title)
 for node in s.select('meta[name="description"],meta[property="og:description"],meta[name="twitter:description"]'):node['content']=lead
 for node in s.select('meta[property="og:title"],meta[name="twitter:title"]'):node['content']=title+' | Green Flux'
 for node in s.select('meta[property="og:url"]'):node['content']=ORIGIN+route
 canonical=s.select_one('link[rel="canonical"]')
 if not canonical:canonical=s.new_tag('link',rel='canonical');s.head.append(canonical)
 canonical['href']=ORIGIN+route
 for node in s.select('.internal-hero-text,.internal-hero-description'):txt(node,lead)
 # Compact metadata removes imported regional coverage, prices, ratings and article dates.
 for node in s.select('script[type="application/ld+json"]'):node.decompose()
 schema={'@context':'https://schema.org','@graph':[{'@type':'Organization','@id':ORIGIN+'/#organization','name':'Green Flux','legalName':'GREEN FLUX srls','url':ORIGIN+'/','telephone':'+393755521420','email':'info@green-flux.com','address':{'@type':'PostalAddress','streetAddress':'Via Trieste, 19','postalCode':'35121','addressLocality':'Padova','addressRegion':'PD','addressCountry':'IT'},'sameAs':list(PROFILE['social'].values())},{'@type':'WebPage','@id':ORIGIN+route,'url':ORIGIN+route,'name':title,'description':lead,'inLanguage':'it-IT','about':{'@id':ORIGIN+'/#organization'}}]}
 node=s.new_tag('script',type='application/ld+json');node.string=json.dumps(schema,ensure_ascii=False);s.head.append(node)
 crumb=s.select_one('.vg-breadcrumbs')
 if crumb:
  labels=crumb.select('li')
  if labels and not labels[-1].select_one('a'):txt(labels[-1],title)

def pair_blocks(s,selector,pairs):
 for block,pair in zip(s.select(selector),pairs):
  ps=block.select('p');
  if len(ps)>=2:txt(ps[0],pair[0]);txt(ps[1],pair[1])

def faq(section,pairs):
 if not section:return
 blocks=section.select('.single-faq')
 if not blocks:return
 model=copy_node(blocks[0]);parent=blocks[0].parent
 for b in blocks:b.decompose()
 for q,a in pairs:
  block=copy_node(model);txt(block.select_one('h3'),q);answer=block.select_one('.faq-answer')
  inner(answer,'<div class="feature-faq-text"><p class="body-text-16 text-neutral-03">'+esc(a)+'</p></div>')
  parent.append(block)

def image_asset(img,asset,alt):
 if not img:return
 img['src']=f'/assets/{asset}-750.webp';img['srcset']=f'/assets/{asset}-400.webp 400w, /assets/{asset}-750.webp 750w';img['alt']=alt;img['width']='750';img['height']='500'
 for attr in ['data-image-id','data-image-kind']:img.attrs.pop(attr,None)
 if img.parent.name=='picture':
  for src in img.parent.select('source'):src['srcset']=img['srcset']

CARD=copy_node(PAGES['/servizi/pompe-calore/'].select_one('.single-service-card'))
# The linked card variant carries the original arrow and button structure.
LINKCARD=copy_node(PAGES['/servizi/pompe-calore/'].select('main > .service-section')[1].select_one('.single-service-card'))
SECTION=copy_node(PAGES['/zone/veneto/treviso/pompe-calore/'].select_one('main > .service-section'))
FAQMODEL=copy_node(PAGES['/zone/veneto/treviso/pompe-calore/'].select_one('main > .faq-section'))

def fill_cards(section,items,heading=None,lead=None):
 if heading:txt(section.select_one('h2'),heading)
 if lead is not None:txt(section.select_one('.service-section-title > p:not(.internal-hero-kicker)'),lead)
 wrapper=section.select_one('.service-card-wrapper')
 if not wrapper:return
 wrapper.clear()
 for item in items:
  name,desc,*url=item
  block=copy_node(LINKCARD if url else CARD)
  for meta in block.select('.zone-card-meta'):meta.decompose()
  txt(block.select_one('h3'),name);txt(block.select_one('.service-title p'),desc)
  icon=block.select_one('.service-icon-wrapper img')
  if icon:icon['src']='/assets/ui/asset-009.svg';icon['alt']=''
  a=block.select_one('a')
  if url and a:a['href']=url[0];txt(a.select_one('.primary-button-text'),'APPROFONDISCI')
  elif a:a.decompose()
  wrapper.append(block)

def cards_section(heading,lead,items,light=True):
 sec=copy_node(SECTION)
 sec['class']=['service-section','section-padding']+(['bg-neutral-02'] if light else [])
 for attr in ['data-internal-links-for']:sec.attrs.pop(attr,None)
 fill_cards(sec,items,heading,lead);return sec

def service_items(slugs):return [(SERVICES[x]['title'],SERVICES[x]['lead'],f'/servizi/{x}/') for x in slugs]

def service_pages():
 for slug,d in SERVICES.items():
  route=f'/servizi/{slug}/';s=PAGES[route]
  title(route,d['title'],d['lead'],'service' if d['kind']=='service' else 'consultation')
  setall(s,'.internal-hero-kicker','Impianti e servizi' if d['kind']=='service' else 'Consulenza')
  pair_blocks(s,'.feature-section:not(._02) .feature-text',d['features'])
  case=s.select_one('.case-study-section');txt(case.h2,d['intro']);txt(case.select_one('.title-top > p'),d['lead']);pair_blocks(case,'.text-wrap',d['features'][:2])
  sections=s.select('main > .service-section')
  fill_cards(sections[0],d['details'],'Il punto di partenza del progetto','Le informazioni utili per raccontare le tue esigenze a Green Flux.')
  setall(s,'.feature-section._02 h2','I servizi che accompagnano il progetto')
  pair_blocks(s,'.features-text',d['includes']+[['Competenze integrate','Tecnici con oltre 15 anni nelle energie rinnovabili e competenze sia idrauliche che elettriche.']])
  pair_blocks(s,'.project-text',d['features'])
  faq(s.select_one('.faq-section'),d['faqs'])
  for sec in sections[1:]:
   fill_cards(sec,service_items(d['related']),'Approfondisci il progetto','Impianti e servizi Green Flux per completare la tua richiesta.')
   for kicker in sec.select('.internal-hero-kicker'):txt(kicker,'Servizi collegati')
   if sec.has_attr('data-internal-links-for'):sec['data-internal-links-for']=route
  if d['kind']=='consultation':
   for img in [s.select_one('.hero-bg-image'),case.select_one('.case-study-image'),s.select_one('.faq-image')]:image_asset(img,d['image'],d['title'])
  for a in s.select('a[href^="/preventivo/"]'):a['href']='/preventivo/?servizio='+d['request_slug']


def service_index():
 s=PAGES['/servizi/'];title('/servizi/','Impianti e servizi Green Flux','Dieci campi d’intervento e un’offerta chiavi in mano: progettazione, installazione e servizi per il residenziale, il terziario e l’industria.')
 listing=s.select_one('.service-collection-list');model=copy_node(listing.select_one('.service-collection-item'));listing.clear()
 for d in CATALOG:
  card=copy_node(model);card['id']=d['slug'];txt(card.h3,d['title']);txt(card.select_one('.service-title p'),d['lead'])
  a=card.select_one('a');a['href']='/servizi/'+d['slug']+'/'
  image_asset(card.select_one('img'),d['image'],d['title']);listing.append(card)
 sec=listing.find_parent('section');txt(sec.h2,'Dalle pompe di calore agli impianti completi');txt(sec.select_one('.service-section-title p'),'Competenze idrauliche ed elettriche per il tuo progetto, dalla sostituzione di un generatore alla ristrutturazione completa.')
 faq(s.select_one('.faq-section'),SERVICES['consulenza']['faqs'])
 for sec in s.select('main > .service-section'):
  if sec is not listing.find_parent('section'):
   fill_cards(sec,service_items(['pompe-calore','impianti-completi','progettazione','consulenza']),'Scegli il punto di partenza','Puoi scegliere un impianto oppure raccontarci il progetto nel suo insieme.')


def region_label(slug):return LOCATIONS.get(slug,slug.replace('-',' ').title())
def zone_pages():
 routes=[r for r in PAGES if r.startswith('/zone/')]
 for route in sorted(routes,key=len):
  s=PAGES[route];parts=route.strip('/').split('/');level=len(parts);place=region_label(parts[-1]);province=region_label(parts[2]) if level>=3 else ''
  topic=LOCAL_TOPICS.get(parts[3]) if level==4 else None
  d=SERVICES[topic] if topic else None
  where=('in '+region_label(parts[1])) if level==2 else ('in provincia di '+province) if level>=3 else 'per il tuo immobile'
  name=(d['title']+': richiesta '+where) if d else ('Il tuo progetto '+where if level>1 else 'Dove si trova il tuo progetto?')
  lead=(d['lead']+' ' if d else 'Green Flux si occupa di impianti residenziali, terziari e industriali. ')+('Indica il comune dell’immobile e chiedi conferma della disponibilità per il tuo intervento.')
  title(route,name,lead,'location-request')
  setall(s,'.internal-hero-kicker','Richiesta per località')
  setall(s,'.internal-hero-content > .body-text-16','La sede Green Flux è in Via Trieste, 19, 35121 Padova. Disponibilità e modalità dell’intervento vengono concordate direttamente con l’azienda.')
  main=s.main
  for sec in list(main.find_all('section',recursive=False)):
   if not any(c in sec.get('class',[]) for c in ['internal-hero-shell','venetagreen-trust','cta-section','footer-section']):sec.decompose()
  anchor=main.select_one(':scope > .venetagreen-trust') or main.select_one(':scope > .cta-section')
  new=[]
  new.append(cards_section('Partiamo dalla tua richiesta','Località, immobile e obiettivi permettono di avviare il confronto.',[
   ('Località','Indica il comune esatto e contatta Green Flux per confermare disponibilità e modalità dell’intervento.'),
   ('Immobile','Descrivi se il progetto riguarda una casa, un’attività del terziario o un immobile industriale.'),
   ('Esigenze','Raccontaci il sistema presente e ciò che desideri realizzare o sostituire.')]))
  if level<=2:
   children=[r for r in routes if r.startswith(route) and len(r.strip('/').split('/'))==level+1]
   new.append(cards_section('Indica la località del progetto','Scegli il percorso per preparare la richiesta a Green Flux.',[(region_label(r.strip('/').split('/')[-1]),'Descrivi il comune e il progetto; chiedi conferma della disponibilità.',r) for r in sorted(children)],False))
  elif level==3:
   children=[r for r in routes if r.startswith(route) and len(r.strip('/').split('/'))==4]
   new.append(cards_section('Quale esigenza vuoi presentare?','Scegli un argomento oppure parti dalla consulenza.',[(SERVICES[LOCAL_TOPICS[r.strip('/').split('/')[-1]]]['title'],'Una richiesta da riferire al tuo immobile e da concordare con Green Flux.',r) for r in sorted(children,key=lambda r:('pompe-calore' not in r,r))],False))
  if d:
   new.append(cards_section(d['intro'],d['lead'],d['features'],False))
   related=[topic]+[x for x in d['related'] if x!=topic]
  else:related=['pompe-calore','impianti-completi','progettazione','consulenza']
  new.append(cards_section('Impianti e servizi Green Flux','Consulta le attività dell’azienda prima di inviare la richiesta.',service_items(related)))
  new.append(cards_section('Un’offerta chiavi in mano','Un unico interlocutore con professionisti qualificati nelle diverse fasi del progetto.',[
   ('Progettazione','Studiata su misura per le esigenze del cliente.'),('Pratiche e permessi','Gestione delle autorizzazioni necessarie.'),('Diagnosi e detrazioni','Analisi energetiche e supporto per incentivi e agevolazioni.')],False))
  f=copy_node(FAQMODEL);txt(f.h2,'Prima di contattare Green Flux');txt(f.select_one('.section-title > p'),'Le informazioni per proseguire con la richiesta.')
  faq(f,[('È già confermata la disponibilità nella mia località?','La disponibilità va chiesta direttamente a Green Flux, indicando comune e intervento. La sede aziendale è a Padova.'),('Quali informazioni devo preparare?','Tipo di immobile, comune, esigenza, impianti presenti e almeno un recapito. Se non hai ancora scelto il servizio, puoi richiedere una consulenza.'),('Come viene inviata la richiesta?','Il modulo prepara un riepilogo. Completa l’invio nella tua applicazione email o in WhatsApp, oppure usa i contatti diretti.')]);new.append(f)
  for sec in new:anchor.insert_before(sec)
  for a in s.select('a[href^="/preventivo/"]'):a['href']='/preventivo/?servizio='+(d['request_slug'] if d else 'consulenza')


def guide_pages():
 for slug,d in GUIDES.items():
  route='/blog/'+slug+'/';s=PAGES[route];title(route,d['title'],d['lead'],'guide')
  txt(s.select_one('.vg-blog-post-summary'),d['lead'])
  setall(s,'.vg-blog-post-meta','Guida al progetto · '+d['category'])
  setall(s,'.vg-blog-byline','Green Flux · Informazioni per preparare la richiesta')
  crumb=s.select_one('.vg-blog-breadcrumb')
  if crumb and crumb.select('span'):txt(crumb.select('span')[-1],d['category'])
  body=s.select_one('.vg-blog-post-content')
  toc='<nav class="vg-blog-toc" aria-label="Indice della guida"><strong>In questa guida</strong><ol>'+''.join(f'<li><a href="#passaggio-{i}">{esc(h)}</a></li>' for i,(h,p) in enumerate(d['sections'],1))+'</ol></nav>'
  content=toc+''.join(f'<h2 id="passaggio-{i}">{esc(h)}</h2><p>{esc(p)}</p>' for i,(h,p) in enumerate(d['sections'],1))
  content+='<h2>Il prossimo passo</h2><p>'+esc(SERVICES[d['service']]['lead'])+'</p><p><a href="/servizi/'+d['service']+'/">'+esc(SERVICES[d['service']]['title'])+'</a> · <a href="/preventivo/?servizio='+d['service']+'">Prepara la tua richiesta</a></p>'
  inner(body,content)
  for aside in s.select('.vg-blog-consultation'):
   inner(aside,'<h2 id="valutazione-progetto">Raccontaci il tuo progetto</h2><p>Indica il comune, l’immobile e ciò che vuoi realizzare. Per informazioni puoi scrivere a <a href="mailto:info@green-flux.com">info@green-flux.com</a> o chiamare <a href="tel:+393755521420">+39 375 552 1420</a>.</p>')
  for a in s.select('a[href^="/preventivo/"]'):a['href']='/preventivo/?servizio='+d['service']
 # Rebuild the existing topic/card grid with current titles and descriptions.
 s=PAGES['/blog/'];title('/blog/','Guide per il tuo progetto Green Flux','Pompe di calore, impianti e servizi: le informazioni da raccogliere per presentare il tuo progetto a Green Flux.')
 parent=s.select_one('.vg-blog-index-section > .container');model=copy_node(s.select_one('.vg-blog-index-card'))
 existing={a['href']:copy_node(a.find_parent(class_='vg-blog-index-card')) for a in s.select('.vg-blog-index-title a')}
 parent.clear();groups=['Pompe di calore','Fotovoltaico','Climatizzazione','Scelta e progetto','Impianti esistenti','Richieste per località']
 nav=s.new_tag('nav',attrs={'class':'blog-topics','aria-label':'Argomenti delle guide'})
 parent.append(nav)
 for i,category in enumerate(groups):
  entries=[d for d in GUIDES.values() if d['category']==category];cid='argomento-'+str(i)
  nav.append(fragment(f'<a href="#{cid}">{esc(category)} <span>{len(entries)}</span></a>').a)
  section=fragment(f'<section class="blog-topic" aria-labelledby="{cid}"><h2 class="service-details-heading" id="{cid}">{esc(category)}</h2><div class="vg-blog-index-grid"></div></section>').section
  for d in entries:
   url='/blog/'+d['slug']+'/';card=copy_node(existing.get(url,model))
   for a in card.select('a'):a['href']=url
   txt(card.select_one('.vg-blog-index-title a'),d['title']);txt(card.select_one('.vg-blog-index-excerpt'),d['lead']);txt(card.select_one('.vg-blog-index-date'),category)
   for a in card.select('a[aria-label]'):a['aria-label']='Leggi: '+d['title']
   section.select_one('.vg-blog-index-grid').append(card)
  parent.append(section)
 # Retain the original Astro scope on new topic labels and wrappers.
 for attr in [a for a in parent.attrs if a.startswith("data-astro-cid-")]:
  for node in parent.find_all(True):node[attr]=""


def corporate_pages():
 s=PAGES['/chi-siamo/'];title('/chi-siamo/','Green Flux: impianti e competenze integrate',PROFILE['about'])
 about=s.select('main > .about-section')
 for sec,heading,paragraphs in [
  (about[0],'Innovazione, efficienza e sostenibilità',[PROFILE['about'],'Realizziamo sistemi completi orientati ad affidabilità, durata e risparmio, dalla sostituzione di un generatore alla ristrutturazione completa.']),
  (about[1],'Oltre 15 anni di esperienza dei tecnici',['L’esperienza nasce dal lavoro dei tecnici nelle energie rinnovabili, con competenze sviluppate sia in ambito idraulico che elettrico.'])]:
  txt(sec.h2,heading)
  ps=sec.select('p:not(.primary-button-text)')
  for j,p in enumerate(ps):txt(p,paragraphs[min(j,len(paragraphs)-1)])
  if sec.h3:txt(sec.h3,'Le competenze al servizio del progetto')
  for li,value in zip(sec.select('li'),['Competenze idrauliche ed elettriche.','Impianti per il residenziale, il terziario e l’industria.','Un unico interlocutore e professionisti qualificati.']):txt(li,value)
 for node,value in zip(about[1].select('.single-icon-box p'),['Competenze idrauliche ed elettriche.','Impianti per residenziale, terziario e industria.','Un unico interlocutore e professionisti qualificati.']):txt(node,value)
 setall(s,'.feature-section._02 h2','L’approccio Green Flux')
 pair_blocks(s,'.features-text',[('Su misura','Progettazione studiata per ogni cliente.'),('Sistemi completi','Impianti tecnologici con competenze integrate.'),('Un unico interlocutore','Collaborazione con professionisti qualificati nelle diverse fasi.')])
 team=s.select_one('.team-section');txt(team.h2,'Competenze che lavorano insieme');txt(team.select_one('.section-title p'),'Green Flux si avvale di tecnici con esperienza nelle rinnovabili e collabora con professionisti qualificati lungo la filiera.')
 for card,(name,label,desc) in zip(team.select('.single-team-card'),[('Competenze idrauliche','Impianti','Esperienza nell’ambito idraulico per i sistemi del tuo immobile.'),('Competenze elettriche','Tecnologie','Esperienza nell’ambito elettrico per impianti e automazioni.'),('Professionisti qualificati','Collaborazione','Figure coinvolte nelle diverse fasi dell’offerta chiavi in mano.')]):
  txt(card.h3,name);txt(card.select_one('.team-name p'),label);txt(card.select_one('.body-text-16.team'),desc)
 for sec in s.select('main > .service-section'):fill_cards(sec,service_items(['pompe-calore','impianti-completi','progettazione','consulenza']),'Conosci la nostra offerta','Dalle esigenze del cliente alla realizzazione degli impianti.')
 s=PAGES['/metodo/'];title('/metodo/','Un unico interlocutore per il tuo progetto',PROFILE['approach'])
 txt(s.select_one('.title.case-study h2'),'Dal generatore al sistema completo');txt(s.select_one('.service-details-paragraph'),PROFILE['approach'])
 body=s.select_one('.case-study-details-content');inner(body,'<h2>Il servizio chiavi in mano</h2>'+''.join('<h3>'+esc(h)+'</h3><p>'+esc(p)+'</p>' for h,p in [('Progettazione','Studiata su misura per ogni cliente.'),('Pratiche e permessi','Gestione delle autorizzazioni necessarie alla realizzazione.'),('Diagnosi energetiche','Analisi tecnica per ottimizzare consumi e prestazioni.'),('Detrazioni fiscali','Supporto per incentivi e agevolazioni legati al progetto.'),('Formule assicurative','Soluzioni di protezione dell’impianto da definire nella proposta.')]))
 for sec in s.select('main > .service-section'):fill_cards(sec,service_items(['progettazione','pratiche-e-permessi','diagnosi-energetiche','consulenza']),'I servizi del progetto','Approfondisci le attività che accompagnano gli impianti Green Flux.')
 project_data={
  '/progetti/':('Ambiti di intervento Green Flux','Impianti residenziali, terziari e industriali: dalla sostituzione di un generatore alla ristrutturazione completa.'),
  '/progetti/fotovoltaico/':('Il fotovoltaico nei tuoi progetti','Il fotovoltaico è un campo d’intervento Green Flux, nell’ambito degli impianti per abitazioni, terziario e industria.'),
  '/progetti/costruzioni/':('Gli impianti nella ristrutturazione','Green Flux segue il progetto impiantistico dalla sostituzione di un generatore alla ristrutturazione completa, con competenze idrauliche ed elettriche.')}
 for route,(name,lead) in project_data.items():
  s=PAGES[route];title(route,name,lead);setall(s,'.internal-hero-kicker','Ambiti di intervento')
  for note in s.select('.vg-project-image-note'):note.decompose()
  body=s.select_one('.case-study-details-content')
  if body:inner(body,'<h2>'+esc(name)+'</h2><p>'+esc(lead)+'</p><h2>Progettazione e installazione</h2><p>'+esc(PROFILE['approach'])+'</p><h2>Tre ambiti impiantistici</h2><p>Residenziale, terziario e industriale: descrivi gli spazi e le esigenze del tuo progetto.</p>')
  for sec in s.select('main > .service-section'):fill_cards(sec,service_items(['pompe-calore','fotovoltaico-residenziale','impianti-completi','progettazione']),'Dal contesto al progetto','Scegli un campo d’intervento per approfondire la tua richiesta.')
 s=PAGES['/progetti/']
 for card,name,desc in zip(s.select('.project-card'),['Fotovoltaico','Impianti per ristrutturazioni'],['Soluzioni impiantistiche per abitazioni, attività e industria.','Dalla sostituzione di un generatore agli impianti completi.']):
  txt(card.select_one('.project-title'),name)
  for p in card.select('p'):txt(p,desc)
 # The project links may be wrappers rather than .project-card elements.
 for h in s.select('.project-title'):
  txt(h,'Fotovoltaico' if 'fotovolta' in h.get_text().lower() else 'Impianti per ristrutturazioni')
  parent=h.parent
  for p in parent.select('p'):txt(p,'Impianti per il residenziale, il terziario e l’industria, con progettazione su misura.')
 s=PAGES['/contatti/'];title('/contatti/','Parla con Green Flux','Raccontaci il tuo progetto: dalla sostituzione di un generatore agli impianti completi per casa, terziario e industria.')
 setall(s,'.feature-section.contact h2','Le informazioni per iniziare')
 pair_blocks(s,'.feature-section.contact .features-text',[('La sede','Via Trieste, 19 · 35121 Padova (PD).'),('Il progetto','Descrivi l’immobile, l’impianto e ciò che vuoi realizzare.'),('La località','Indica il comune e chiedi conferma della disponibilità per l’intervento.')])
 setall(s,'.contact-information-section .contact-title > p','GREEN FLUX srls · Impianti tecnologici. Contattaci per informazioni e richieste di progetto.')
 for sec in s.select('main > .service-section'):fill_cards(sec,service_items(['consulenza','pompe-calore','impianti-completi','progettazione']),'Prepara la tua richiesta','Se hai più esigenze, racconta il progetto nel suo insieme.')
 for option in s.select('option'):
  if 'assistenza' in option.get_text().lower():txt(option,'Consulenza sul progetto');option['value']='Consulenza sul progetto'


def home():
 s=PAGES['/'];META['/']={'title':'Green Flux — Pompe di calore e impianti su misura','description':'Pompe di calore e impianti tecnologici: progettazione e installazione per residenziale, terziario e industria. Green Flux, Padova.','kind':'home','source_url':SOURCE}
 # Remove the three unverified offers while preserving every visual section.
 for a in list(s.select('a[href]')):
  if a.get('href') in UNCONFIRMED:
   card=a.find_parent(class_=lambda c:c and ('service-card' in c.split() or 'process-card' in c.split()))
   if card:card.decompose()
   else:a.decompose()
 # In the homepage, service cards are anchors themselves and support services are articles.
 for element in list(s.select('[data-service]')):
  if element.get('data-service') in ['batterie-accumulo','manutenzione','edilizia']:element.decompose()
 for card in list(s.select('.service-item')):
  if card.get('id')=='manutenzione':card.decompose()
 for node in s.find_all(string=True):
  if node.parent.name in ['script','style']:continue
  value=str(node)
  value=value.replace('Per una pompa di calore come per ogni altro impianto, seguiamo tutte le fasi: analisi, progetto, pratiche, installazione e assistenza.','Per una pompa di calore come per ogni altro impianto, l’offerta chiavi in mano comprende progettazione, pratiche, diagnosi energetiche, detrazioni fiscali e formule assicurative.')
  if value!=str(node):node.replace_with(value)
 # Refresh metadata without changing the styled, multiline homepage heading.
 heading=copy_node(s.h1);title('/',META['/']['title'],META['/']['description'],'home');s.h1.replace_with(heading);txt(s.title,META['/']['title'])


def shared():
 for route,s in PAGES.items():
  if route=='/preventivo/':
   heading=copy_node(s.h1);title(route,'Richiedi un preventivo Green Flux','Descrivi impianti, immobile e progetto. Prepara una richiesta di preventivo o consulenza per Green Flux.','form');s.h1.replace_with(heading)
   for i,label in enumerate(s.select('input[name="servizio"]')):txt(label.find_parent('label').select_one('.quote-option-key'),chr(65+i))
  if route not in META:
   current=s.h1.get_text(' ',strip=True) if s.h1 else s.title.get_text(' ',strip=True)
   desc=s.select_one('meta[name="description"]')
   title(route,current,desc.get('content','Contatti e informazioni Green Flux.') if desc else 'Contatti e informazioni Green Flux.','form' if route=='/preventivo/' else 'legal')
  # Prevent old related-card language from reintroducing offers or alleged projects.
  for card in s.select('.single-service-card'):
   a=card.select_one('a[href]')
   if not a:continue
   url=UNCONFIRMED.get(a.get('href'),a.get('href'));a['href']=url
   target=META.get(url)
   if target:
    txt(card.select_one('h3'),target['title']);txt(card.select_one('.service-title p:not(.zone-card-meta)'),target['description'])
    txt(a.select_one('.primary-button-text'),'APPROFONDISCI')
  for a in list(s.select('a[href]')):
   url=a.get('href')
   if url in UNCONFIRMED:
    a['href']=UNCONFIRMED[url];url=a['href']
    label=SERVICES['consulenza']['title'] if url.endswith('/consulenza/') else 'Impianti completi'
    if not a.find(['h2','h3','img','svg']):txt(a,label)
   if url=='/progetti/' and not a.find(['h2','h3','img','svg']):txt(a,'Interventi')
   if url.startswith('/preventivo/') and a.has_attr('aria-label'):a['aria-label']='Richiedi un preventivo Green Flux'
   for attr in ['title','aria-label']:
    if a.has_attr(attr) and url in META and re.search('realizzat|copert|servit|gratuit|accumulo|manutenzione',a[attr],re.I):a[attr]=META[url]['title']
  for node in list(s.find_all(string=True)):
   if node.parent and node.parent.name not in ['script','style']:
    value=str(node).replace('Preventivo gratuito','Richiesta di preventivo').replace('PREVENTIVO GRATUITO','RICHIEDI PREVENTIVO').replace('preventivo gratuito','preventivo').replace('Consulenza energetica','Consulenza per il progetto').replace('Zone servite','Località del progetto')
    if value!=str(node):node.replace_with(value)
  for node in s.select('.footer-summary'):txt(node,'GREEN FLUX srls · Impianti tecnologici per residenziale, terziario e industria. Competenze idrauliche ed elettriche, progettazione su misura e servizi chiavi in mano.')
  for node in s.select('.footer-content-left h3'):txt(node,'Il partner tecnico per i tuoi progetti.')
  for node in s.select('.cta-heading-2'):txt(node,'Raccontaci il tuo progetto. Troviamo la soluzione per te.')
  # Rebuild breadcrumb labels from the current page titles.
  for a in s.select('.vg-breadcrumbs a'):
   if a.get('href') in META:txt(a,META[a['href']]['title'])
  for img in s.select('img[data-image-kind]'):
   alt=img.get('alt','')
   if alt and not re.search('illustrativ|illustrazione',alt,re.I):img['alt']='Immagine illustrativa: '+alt
  # Keep actual company channels; correct copied geographic or offer annotations.
  for meta in s.select('meta[name="keywords"]'):meta.decompose()
  for tag in s.select('script[type="application/ld+json"]'):
   data=json.loads(tag.string)
   faqs=[{'@type':'Question','name':b.h3.get_text(' ',strip=True),'acceptedAnswer':{'@type':'Answer','text':b.select_one('.faq-answer').get_text(' ',strip=True)}} for b in s.select('.single-faq') if b.h3 and b.select_one('.faq-answer')]
   if faqs:data['@graph'].append({'@type':'FAQPage','mainEntity':faqs})
   tag.string=json.dumps(data,ensure_ascii=False)

service_pages();service_index();zone_pages();guide_pages();corporate_pages();home();shared()
for route,s in PAGES.items():
 p=PUBLIC/route.strip('/')/'index.html';p.write_text(str(s))
(ROOT/'docs/content-audit.json').write_text(json.dumps({'source_url':SOURCE,'verified_at':PROFILE['verified_at'],'total_pages':len(META),'pages':META},ensure_ascii=False,indent=2)+'\n')
print('Aligned',len(PAGES),'pages with the verified Green Flux profile.')

"""Import the user-authorized reference snapshot; runtime/build need only Node.
Usage: PYTHONPATH=/path/to/beautifulsoup4 python3 scripts/import-reference.py SNAPSHOT [--home]
The snapshot is deliberately kept outside Git; provenance is in docs/reference-import.json.
"""
import sys, re, json, shutil
from pathlib import Path
from bs4 import BeautifulSoup, NavigableString
SOURCE=Path(sys.argv[1]); ROOT=Path(__file__).resolve().parents[1]; PUBLIC=ROOT/'public'
ORIGIN='https://green-flux-nine.vercel.app'
REPLACEMENTS=[
 ('Veneta Green S.r.l.','GREEN FLUX srls'),('VenetaGreen','Green Flux'),('Veneta Green','Green Flux'),
 ('info@venetagreen.it','info@green-flux.com'),('+39 366 922 4744','+39 375 552 1420'),('393669224744','393755521420'),
 ('P.za della Repubblica, 2/3, 30020 Torre di Mosto (VE)','Via Trieste, 19, 35121 Padova (PD)'),
 ('P.za della Repubblica 2/3, 30020 Torre di Mosto (VE)','Via Trieste, 19, 35121 Padova (PD)'),
 ('P.za della Repubblica, 2/3, 30020 Torre di Mosto, in provincia di Venezia','Via Trieste, 19, 35121 Padova'),
 ('P.za della Repubblica, 2/3','Via Trieste, 19'),('30020 Torre di Mosto (VE)','35121 Padova (PD)'),
 ('a Torre di Mosto in provincia di Venezia','a Padova'),('Torre di Mosto','Padova'),
 ('P.IVA e C.F. 04626150272, ','') ,('P.IVA e C.F. 04626150272',''),('partita IVA e codice fiscale 04626150272, ',''),('04626150272',''),
 ('Dal 2009 progettiamo','Progettiamo'),('Dal 2009 lavoriamo nel settore energetico','I nostri tecnici lavorano da oltre 15 anni nel settore energetico'),
 ('La nostra esperienza dal 2009','L’esperienza dei nostri tecnici'),
 ('https://www.facebook.com/profile.php?id=100093107784853','https://www.facebook.com/profile.php?id=61579212246290'),
 ('https://www.instagram.com/veneta.green/','https://www.instagram.com/greenflux_impianti/'),
 ('/blog/venetagreen-recensioni-metodo-preventivo/','/blog/green-flux-recensioni-metodo-preventivo/'),
 ('https://venetagreen.it',ORIGIN),('venetagreen.it','green-flux-nine.vercel.app'),
]
STRENGTHS=[
 ('Progettazione su misura','Il punto di partenza','Il progetto viene studiato sulle esigenze del cliente, sulle caratteristiche dell’edificio e sugli impianti da integrare.'),
 ('Competenze integrate','Idraulica ed elettricità','Tecnici con oltre 15 anni di esperienza nelle energie rinnovabili e competenze sia idrauliche sia elettriche.'),
 ('Pratiche e permessi','Un percorso seguito','Supporto nella gestione delle autorizzazioni necessarie alla realizzazione del sistema.'),
 ('Diagnosi energetiche','Consumi e prestazioni','Analisi tecnica per individuare gli interventi utili a migliorare il funzionamento degli impianti.'),
 ('Detrazioni fiscali','Supporto agli incentivi','Assistenza per valutare incentivi e agevolazioni in relazione al progetto e ai requisiti applicabili.'),
 ('Impianti completi','Un unico interlocutore','Dalla sostituzione di un generatore agli impianti di una ristrutturazione, con professionisti lungo tutta la filiera.'),
]
def brand(text):
 for old,new in REPLACEMENTS: text=text.replace(old,new)
 return text

def transform(raw,path):
 soup=BeautifulSoup(raw,'html.parser')
 # Copy layout and copy, but never reuse another company's tracking or CRM destinations.
 for script in soup.select('script'):
  if script.get('src')=='/assets/js/site.js': continue
  script.decompose()
 for meta in soup.select('meta[name="venetagreen-lead-api"]'): meta.decompose()
 for el in soup.find_all(string=True):
  if el.parent.name not in ['style','script']:
   value=brand(str(el))
   if value!=str(el):el.replace_with(value)
 for el in soup.find_all(True):
  for key,value in list(el.attrs.items()):
   if isinstance(value,str) and key not in ['class','style','id']:
    # Existing asset paths stay stable, including their provenance names.
    if key in ['src','srcset','imagesrcset'] and '/assets/' in value: continue
    el[key]=brand(value)
 for img in soup.select('img'):
  if 'logo-navbar' in img.get('src','') or 'logo-footer' in img.get('src',''):
   img['src']='/assets/logo.png';img['alt']='Green Flux — impianti tecnologici';img.attrs.pop('srcset',None)
 for link in soup.select('link'):
  if any(x in link.get('rel',[]) for x in ['icon','apple-touch-icon']):link['href']='/assets/favicon.ico'
 for section in soup.select('.testimonial-section'):
  title=section.select_one('h2');desc=section.select_one('.body-text-16-center')
  if title:title.string='Il valore di un progetto seguito bene'
  if desc:desc.string='Competenze e servizi Green Flux, dall’analisi iniziale alla realizzazione.'
  for i,card in enumerate(section.select('.single-testimonial-card')):
   title,subtitle,text=STRENGTHS[i%len(STRENGTHS)]
   info=card.select_one('.client-information')
   if info:
    p=info.select('p');p[0].string=title;p[1].string=subtitle
   body=card.select_one('.vg-review-text')
   if body:body.string=text
   avatar=card.select_one('.vg-review-avatar')
   if avatar:avatar.clear();avatar.string=f'{i%len(STRENGTHS)+1:02}'
   for x in card.select('.testimonial-icon-wrapper'):x.decompose()
 for counter in soup.select('.single-counter'):
  number=counter.select_one('.heading-2');label=counter.select_one('.body-text-16')
  if number and number.get_text(strip=True)=='2009':number.string='15+';label.string='Anni di esperienza dei tecnici'
 # State the geographic request as a feasibility check until the service area is confirmed.
 for footer in soup.select('.footer-summary'):
  footer.string='Progettiamo impianti fotovoltaici, termici, elettrici e soluzioni integrate per case e aziende. Da Padova, valutiamo ogni intervento a partire dalle tue esigenze.'
 for node in soup.select('.footer-contact p'):
  if not node.get_text(strip=True):node.decompose()
 for a in soup.select('a[href]'):
  if a['href'].startswith(ORIGIN+'/'): a['href']=a['href'][len(ORIGIN):]
  if a['href'].startswith('https://www.iubenda.com/'): a['rel']='noopener noreferrer'
 for form in soup.select('form[data-lead-source]'):
  form.attrs.pop('action',None);form['data-green-flux-form']=form.get('data-lead-source');form.attrs.pop('data-lead-source',None)
  note=soup.new_tag('p',attrs={'class':'body-text-16 text-neutral-03 gf-delivery-note'})
  note.string='Prepara la richiesta e completa l’invio a Green Flux tramite email o WhatsApp.'
  form.append(note)
  submit=form.select_one('[type="submit"]')
  if submit:
   if submit.name=='input':submit['value']='Prepara richiesta'
   else:submit.clear();submit.string='PREPARA RICHIESTA →'
 if path.startswith('/progetti'):
  for p in soup.select('.internal-hero-description,.internal-hero p'):
   if 'Interventi concreti' in p.get_text():p.string='Tipologie di intervento: le immagini illustrano possibili applicazioni e non documentano cantieri Green Flux.'
 if soup.head:
  soup.head.append(soup.new_tag('link',rel='stylesheet',href='/assets/css/green-flux.css'))
  canonical=soup.select_one('link[rel="canonical"]')
  if canonical:canonical['href']=ORIGIN+path
  metadata={'@context':'https://schema.org','@graph':[
   {'@type':'Organization','@id':ORIGIN+'/#organization','name':'Green Flux','legalName':'GREEN FLUX srls','url':ORIGIN+'/','logo':ORIGIN+'/assets/logo.png','telephone':'+39 375 552 1420','email':'info@green-flux.com','address':{'@type':'PostalAddress','streetAddress':'Via Trieste, 19','postalCode':'35121','addressLocality':'Padova','addressCountry':'IT'}},
   {'@type':'WebPage','@id':ORIGIN+path,'url':ORIGIN+path,'name':soup.title.get_text() if soup.title else 'Green Flux','inLanguage':'it-IT'}]}
  tag=soup.new_tag('script',type='application/ld+json');tag.string=json.dumps(metadata,ensure_ascii=False);soup.head.append(tag)
 if soup.body:
  soup.body.append(soup.new_tag('script',type='module',src='/assets/js/green-flux.mjs'))
  if path=='/preventivo/':soup.body.append(soup.new_tag('script',type='module',src='/preventivo/wizard.mjs'))
 return str(soup)

if __name__=='__main__':
 for item in ['assets','_astro']:
  if (SOURCE/item).exists():shutil.copytree(SOURCE/item,PUBLIC/item,dirs_exist_ok=True)
 pages=[SOURCE/'index.html'] if '--home' in sys.argv else sorted(SOURCE.rglob('index.html'))
 for p in pages:
  rel=p.relative_to(SOURCE);path='/'+str(rel.parent).replace('.','').strip('/')+'/' if rel.parent!=Path('.') else '/'
  path=path.replace('venetagreen-recensioni-metodo-preventivo','green-flux-recensioni-metodo-preventivo')
  out=PUBLIC/path.lstrip('/')/'index.html';out.parent.mkdir(parents=True,exist_ok=True)
  out.write_text(transform(p.read_text(),path))
 print('Imported',len(pages),'pages')

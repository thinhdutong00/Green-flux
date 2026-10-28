import { showHandoff } from './handoff.mjs';
import { setupMobileHeader } from './mobile-header.mjs';
import { setupDesktopMenus } from './desktop-header.mjs';
import { createRequestSender, submitAndRedirect } from './request-delivery.mjs';
setupMobileHeader();
setupDesktopMenus();
const legacy={'chisiamo':'/chi-siamo/','chi-siamo':'/chi-siamo/','campidiintervento':'/servizi/','campi-di-intervento':'/servizi/','servizi':'/servizi/progettazione-e-supporto/','contatti':'/contatti/','fotovoltaico':'/servizi/fotovoltaico/','pompe-di-calore':'/servizi/pompe-calore/','condizionatori':'/servizi/climatizzazione/'};
const extra=['smart-home','solare-termico','biomassa','caldaie','ventilazione','trattamento-acqua','impianti-completi','progettazione','pratiche-e-permessi','diagnosi-energetiche','detrazioni-fiscali','formule-assicurative'];extra.forEach(id=>legacy[id]=`/servizi/${id}/`);
for(const id of ['progettazione','pratiche-e-permessi','diagnosi-energetiche','detrazioni-fiscali','formule-assicurative'])legacy[id]='/servizi/progettazione-e-supporto/#'+id;
if(location.pathname==='/'&&legacy[location.hash.slice(1)])location.replace(legacy[location.hash.slice(1)]);
document.querySelectorAll('form[data-green-flux-form]:not(.quote-form)').forEach(form=>{
 const button=form.querySelector('[type="submit"]');
 const sendRequest=createRequestSender('contact');let sending=false;
 form.addEventListener('submit',async event=>{
  event.preventDefault();if(sending||!form.reportValidity())return;
  const data=new FormData(form);const name=String(data.get('name')||data.get('nome')||'').trim();const email=String(data.get('email')||'').trim();const phone=String(data.get('phone')||data.get('telefono')||'').trim();
  const invalid=!email&&!phone?'Inserisci almeno un recapito tra email e telefono.':phone&&(!/^\+?[\d\s().-]+$/.test(phone)||phone.replace(/\D/g,'').length<7||phone.replace(/\D/g,'').length>15)?'Inserisci un numero di telefono valido.':name.length<2?'Inserisci nome e cognome.':'';
  form.querySelector('.gf-form-error')?.remove();if(invalid){const p=document.createElement('p');p.className='gf-form-error';p.setAttribute('role','alert');p.textContent=invalid;form.append(p);return;}
  const request={name,email,phone,subject:String(data.get('subject')||'Richiesta Informazioni'),notes:String(data.get('message')||data.get('messaggio')||'').trim(),privacy:data.get('privacy')==='on'};
  const text=['Richiesta di contatto — Green Flux','',`Nome: ${name}`,`Email: ${email||'Non indicata'}`,`Telefono: ${phone||'Non indicato'}`,`Oggetto: ${request.subject}`,`Messaggio: ${request.notes}`,'','Ho letto l’informativa privacy e autorizzo il ricontatto per questa richiesta.'].join('\n');
  sending=true;form.setAttribute('aria-busy','true');form.parentElement.querySelector('.gf-handoff')?.remove();
  if(button){button.disabled=true;if(button.tagName==='INPUT')button.value='Invio in corso…';else button.textContent='Invio in corso…';}
  try{await submitAndRedirect(sendRequest,request,{requestText:text});}
  catch(failure){const p=document.createElement('p');p.className='gf-form-error';p.setAttribute('role','alert');p.textContent=failure.message||'L’invio non è riuscito. I dati sono ancora nel modulo.';form.append(p);showHandoff(form.parentElement,text,{onEdit:()=>{button?.focus();}});}
  finally{sending=false;form.removeAttribute('aria-busy');if(button){button.disabled=false;if(button.tagName==='INPUT')button.value='Invia la richiesta';else button.textContent='Invia la richiesta';}}
 });
});
// Keep the original mobile menu and FAQ interactions accessible when panels close.
document.querySelectorAll('.menu-button').forEach(button=>{const header=button.closest('.header');const menu=header?.querySelector('.nav-menu');if(!menu)return;document.addEventListener('click',event=>{if(menu.classList.contains('is-open')&&!header.contains(event.target)){menu.classList.remove('is-open');button.classList.remove('is-open');button.setAttribute('aria-expanded','false');}});});

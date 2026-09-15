import { showHandoff } from './handoff.mjs';
const legacy={'chisiamo':'/chi-siamo/','chi-siamo':'/chi-siamo/','campidiintervento':'/servizi/','campi-di-intervento':'/servizi/','servizi':'/servizi/','contatti':'/contatti/','fotovoltaico':'/servizi/fotovoltaico-residenziale/','pompe-di-calore':'/servizi/pompe-calore/','condizionatori':'/servizi/climatizzazione/'};
const extra=['smart-home','solare-termico','biomassa','caldaie','ventilazione','trattamento-acqua','impianti-completi','progettazione','pratiche-e-permessi','diagnosi-energetiche','detrazioni-fiscali','formule-assicurative'];extra.forEach(id=>legacy[id]=`/servizi/${id}/`);
if(location.pathname==='/'&&legacy[location.hash.slice(1)])location.replace(legacy[location.hash.slice(1)]);
document.querySelectorAll('form[data-green-flux-form]:not(.quote-form)').forEach(form=>{
 const button=form.querySelector('[type="submit"]');form.addEventListener('submit',event=>{
  event.preventDefault();if(!form.reportValidity())return;
  const data=new FormData(form);const name=String(data.get('name')||data.get('nome')||'').trim();const email=String(data.get('email')||'').trim();const phone=String(data.get('phone')||data.get('telefono')||'').trim();
  const invalid=!email&&!phone?'Inserisci almeno un recapito tra email e telefono.':phone&&(!/^\+?[\d\s().-]+$/.test(phone)||phone.replace(/\D/g,'').length<7||phone.replace(/\D/g,'').length>15)?'Inserisci un numero di telefono valido.':name.length<2?'Inserisci nome e cognome.':'';
  form.querySelector('.gf-form-error')?.remove();if(invalid){const p=document.createElement('p');p.className='gf-form-error';p.setAttribute('role','alert');p.textContent=invalid;form.append(p);return;}
  const text=['Richiesta di contatto — Green Flux','',`Nome: ${name}`,`Email: ${email||'Non indicata'}`,`Telefono: ${phone||'Non indicato'}`,`Oggetto: ${data.get('subject')||'Informazioni'}`,`Messaggio: ${data.get('message')||data.get('messaggio')||''}`,'','Ho letto l’informativa privacy e autorizzo il ricontatto per questa richiesta.'].join('\n');
  showHandoff(form.parentElement,text,{onEdit:()=>{button?.focus();}});
 });
});
// Keep the original mobile menu and FAQ interactions accessible when panels close.
document.querySelectorAll('.menu-button').forEach(button=>{const header=button.closest('.header');const menu=header?.querySelector('.nav-menu');if(!menu)return;document.addEventListener('click',event=>{if(menu.classList.contains('is-open')&&!header.contains(event.target)){menu.classList.remove('is-open');button.classList.remove('is-open');button.setAttribute('aria-expanded','false');}});});

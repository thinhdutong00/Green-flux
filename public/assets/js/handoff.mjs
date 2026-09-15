export function textContactLinks(text,subject='Richiesta di preventivo — Green Flux'){
 return {email:`mailto:info@green-flux.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`,whatsapp:`https://wa.me/393755521420?text=${encodeURIComponent(text)}`};
}
export function showHandoff(container,text,{onEdit}={}){
 container.querySelector('.gf-handoff')?.remove();
 const section=document.createElement('section');section.className='gf-handoff';section.setAttribute('aria-label','Riepilogo della richiesta');
 section.innerHTML='<h2 tabindex="-1">Il riepilogo è pronto.</h2><p>Completa l’invio tramite email o WhatsApp. La richiesta verrà inviata solo quando confermerai nell’app scelta.</p><details><summary>Leggi il riepilogo</summary><textarea aria-label="Riepilogo della richiesta" readonly></textarea></details><div class="gf-handoff-actions"><a data-email>Apri email ↗</a><a data-whatsapp target="_blank" rel="noopener noreferrer">Apri WhatsApp ↗</a><button type="button" data-copy>Copia riepilogo</button><button type="button" data-edit>Modifica richiesta</button></div><p role="status" data-copy-status></p>';
 section.querySelector('textarea').value=text;const links=textContactLinks(text);
 section.querySelector('[data-email]').href=links.email;section.querySelector('[data-whatsapp]').href=links.whatsapp;
 section.querySelector('[data-copy]').addEventListener('click',async()=>{
  try{await navigator.clipboard.writeText(text);section.querySelector('[data-copy-status]').textContent='Riepilogo copiato.';}
  catch{section.querySelector('details').open=true;section.querySelector('textarea').select();section.querySelector('[data-copy-status]').textContent='Seleziona e copia il testo del riepilogo.';}
 });
 section.querySelector('[data-edit]').addEventListener('click',()=>{section.remove();onEdit?.();});
 container.append(section);section.querySelector('h2').focus();section.scrollIntoView({block:'center',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});return section;
}

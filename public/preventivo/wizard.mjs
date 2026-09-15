import { quoteText } from './data.mjs';
import { readFunnel, validateFunnel, serviceId } from './funnel-data.mjs';
import { showHandoff } from '../assets/js/handoff.mjs';
const wizard=document.querySelector('[data-quote-wizard]');
if(wizard){
 const form=wizard.querySelector('.quote-form');const steps=[...form.querySelectorAll('[data-step]')];
 const progress=wizard.querySelector('[data-progress]');const counter=wizard.querySelector('[data-counter]');
 const error=wizard.querySelector('[data-error-message]');const previous=wizard.querySelector('[data-prev]');const next=wizard.querySelector('[data-next]');const submit=wizard.querySelector('[data-submit]');let current=0;
 function sync(){form.querySelectorAll('.quote-option').forEach(option=>option.classList.toggle('is-selected',option.querySelector('input').checked));}
 function setStep(index,focus=false){current=Math.max(0,Math.min(index,steps.length-1));steps.forEach((step,i)=>{step.hidden=i!==current;step.setAttribute('aria-hidden',String(i!==current));});progress.style.width=`${(current+1)/steps.length*100}%`;counter.textContent=`${current+1} / ${steps.length}`;previous.hidden=current===0;next.hidden=current===steps.length-1;submit.hidden=current!==steps.length-1;error.hidden=true;if(focus){const title=steps[current].querySelector('.quote-title');title.tabIndex=-1;title.focus({preventScroll:true});window.scrollTo({top:0,behavior:'instant'});}}
 function validate(step){const issue=validateFunnel(readFunnel(new FormData(form))).find(x=>x.step===step);if(issue){error.textContent=issue.message;error.hidden=false;error.setAttribute('role','alert');return false;}error.hidden=true;return true;}
 form.addEventListener('change',()=>{sync();error.hidden=true;form.parentElement.querySelector('.gf-handoff')?.remove();});
 next.addEventListener('click',()=>{if(validate(current))setStep(current+1,true);});previous.addEventListener('click',()=>setStep(current-1,true));
 form.addEventListener('keydown',event=>{if(event.key==='Enter'&&!(event.target instanceof HTMLTextAreaElement)&&event.target.tagName!=='BUTTON'&&event.target.tagName!=='A'&&current<steps.length-1){event.preventDefault();if(validate(current))setStep(current+1,true);}});
 form.addEventListener('submit',event=>{event.preventDefault();if(current<steps.length-1){if(validate(current))setStep(current+1,true);return;}const data=readFunnel(new FormData(form));const issues=validateFunnel(data);if(issues.length){setStep(issues[0].step,true);validate(issues[0].step);return;}form.hidden=true;counter.textContent='Riepilogo';showHandoff(wizard,quoteText(data),{onEdit:()=>{form.hidden=false;setStep(5,true);}});});
 document.addEventListener('keydown',event=>{if(event.altKey||event.ctrlKey||event.metaKey||event.target.matches('input,textarea,select,button,a')||form.hidden)return;const key=event.key.toUpperCase();if(!/^[A-Z]$/.test(key))return;const option=[...steps[current].querySelectorAll('.quote-option')].find(x=>x.querySelector('.quote-option-key').textContent.trim()===key);if(option){event.preventDefault();option.click();sync();}});
 const selected=serviceId(new URLSearchParams(location.search).get('servizio'));if(selected){const input=[...form.querySelectorAll('[name="servizio"]')].find(x=>x.value===selected);if(input)input.checked=true;}
 sync();setStep(0);
}

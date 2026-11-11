// Landing ristrutturazione: intestazione, barra contatti, confronto prima/dopo e calcolo del bonus.
// Nessun evento di misurazione delle pompe di calore.
import { bonusEstimate, euro } from './renovation-bonus.mjs';

const hero = document.querySelector('.hp-hero');
const sticky = document.querySelector('[data-hp-sticky]');

// Il telefono risponde dal lunedì al venerdì, 8:00–18:00 (Europe/Rome): fuori orario la barra propone WhatsApp.
if (sticky) {
  const updateHours = () => {
    try {
      const parts = new Intl.DateTimeFormat('it-IT', { timeZone: 'Europe/Rome', weekday: 'short', hour: 'numeric', hour12: false }).formatToParts(new Date());
      const weekday = parts.find(part => part.type === 'weekday')?.value || '';
      const hour = Number(parts.find(part => part.type === 'hour')?.value);
      const open = !/^(sab|dom)/i.test(weekday) && hour >= 8 && hour < 18;
      sticky.toggleAttribute('data-closed', !open);
      const call = sticky.querySelector('[data-hp-sticky-call] span:last-child');
      if (call) call.textContent = open ? 'Chiama' : 'Chiama lun–ven';
    } catch { /* Senza Intl la barra conserva le etichette predefinite. */ }
  };
  updateHours();
  setInterval(updateHours, 60000);
}

if (hero) {
  const updateHeader = () => document.body.classList.toggle('is-scrolled', window.scrollY > hero.offsetHeight - 110);
  window.addEventListener('scroll', updateHeader, { passive: true });
  window.addEventListener('resize', updateHeader);
  updateHeader();
}

// Confronto prima/dopo: il cursore sposta la linea di taglio.
const compare = document.querySelector('[data-rn-compare]');
if (compare) {
  const range = compare.querySelector('input[type="range"]');
  const update = () => compare.style.setProperty('--pos', `${range.value}%`);
  range.addEventListener('input', update);
  update();
}

const calc = document.querySelector('[data-rn-calc]');
if (calc) {
  const range = calc.querySelector('input[type="range"]');
  const field = name => calc.querySelector(`[data-rn-${name}]`);
  const update = () => {
    const spend = Number(range.value);
    const rate = Number(calc.querySelector('input[name="rn-rate"]:checked').value);
    const result = bonusEstimate(spend, rate);
    field('spend').textContent = euro(spend);
    field('rate-label').textContent = `(${rate}%)`;
    field('total').textContent = euro(result.total);
    field('year').textContent = euro(result.yearly);
    field('net').textContent = euro(result.net);
    field('cap').hidden = !result.capped;
  };
  calc.addEventListener('input', update);
  calc.addEventListener('submit', event => event.preventDefault());
  update();
}

// Modulo: lavoro, superficie e tempi entrano nel messaggio della richiesta di sopralluogo.
// Con JavaScript le domande stanno in due passi; senza, restano tutte in fila.
const lead = document.querySelector('[data-rn-lead]');
if (lead) {
  const notes = lead.querySelector('[data-rn-notes]');
  const choice = name => lead.querySelector(`input[name="${name}"]:checked`)?.value;
  const update = () => { notes.value = `Landing ristrutturazione — lavoro: ${choice('rn-work') || 'non indicato'} — superficie: ${choice('rn-size') || 'non indicata'} — inizio: ${choice('rn-start') || 'da definire'}`; };
  lead.addEventListener('change', update);
  update();

  const next = lead.querySelector('[data-rn-next]');
  const back = lead.querySelector('[data-rn-back]');
  const progress = lead.querySelector('[data-rn-progress]');
  if (next && back && progress) {
    const go = step => {
      lead.dataset.rnAt = String(step);
      progress.querySelector('b').textContent = `Passo ${step} di 2`;
    };
    lead.classList.add('rn-quiz-on');
    for (const element of [next, back, progress]) element.hidden = false;
    go(1);
    next.addEventListener('click', () => { go(2); lead.querySelector('#lead-name')?.focus({ preventScroll: true }); });
    back.addEventListener('click', () => { go(1); lead.querySelector('input[name="rn-work"]')?.focus({ preventScroll: true }); });
  }
}

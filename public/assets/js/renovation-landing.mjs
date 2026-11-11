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

  // Passi: 1 lavoro, 2 superficie, 3 tempi, 4 recapiti. Toccando una risposta si passa alla domanda dopo.
  const next = lead.querySelector('[data-rn-next]');
  const back = lead.querySelector('[data-rn-back]');
  const nav = lead.querySelector('[data-rn-nav]');
  const progress = lead.querySelector('[data-rn-progress]');
  if (next && back && nav && progress) {
    const marks = ['rn-at-1', 'rn-at-2', 'rn-at-3', 'rn-at-4'];
    const groups = ['rn-work', 'rn-size', 'rn-start'];
    let at = 1;
    const refresh = () => { next.disabled = at < 4 && !choice(groups[at - 1]); };
    const go = (step, focus) => {
      at = Math.min(4, Math.max(1, step));
      lead.classList.remove(...marks);
      lead.classList.add(marks[at - 1]);
      progress.querySelector('b').textContent = `Passo ${at} di 4`;
      refresh();
      if (focus) (at === 4 ? lead.querySelector('#lead-name') : lead.querySelector(`input[name="${groups[at - 1]}"]:checked, input[name="${groups[at - 1]}"]`))?.focus({ preventScroll: true });
    };
    lead.classList.add('rn-quiz-on');
    nav.hidden = false;
    progress.hidden = false;
    go(1);
    lead.addEventListener('change', refresh);
    // Solo il tocco o il clic fanno avanzare da soli: con la tastiera si sceglie con le frecce e si usa "Avanti".
    for (const chip of lead.querySelectorAll('.rn-chip')) chip.addEventListener('click', event => {
      if (event.detail > 0 && event.target.matches('input')) setTimeout(() => go(at + 1, at === 3), 180);
    });
    next.addEventListener('click', () => go(at + 1, true));
    back.addEventListener('click', () => go(at - 1, true));
  }
}

// Video dell'hero: parte solo quando lo chiede chi guarda.
const video = document.querySelector('[data-rn-video]');
const videoPlay = document.querySelector('[data-rn-video-play]');
if (video && videoPlay) {
  const started = () => { video.controls = true; videoPlay.hidden = true; };
  const start = () => { started(); video.play()?.catch(() => {}); };
  video.controls = false;
  videoPlay.hidden = false;
  videoPlay.addEventListener('click', start);
  video.addEventListener('click', () => { if (!videoPlay.hidden) start(); });
  video.addEventListener('play', started, { once: true });
}

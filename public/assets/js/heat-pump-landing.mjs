import { trackLeadEvent } from './lead-events.mjs';
import { readSubmissionStatus } from './submission-status.mjs';

const hero = document.querySelector('.hp-hero');
const dialog = document.querySelector('[data-hp-quiz]');
const frame = dialog?.querySelector('[data-hp-quiz-frame]');
let opener;

// One diagnostic per primary link activation; no form values or link text.
document.querySelectorAll('a[href="#valutazione"]').forEach(link => {
  link.addEventListener('click', () => trackLeadEvent('lead_cta_click'));
});
document.querySelectorAll('[data-hp-call]').forEach(link => link.addEventListener('click', () => trackLeadEvent('lead_call_click')));
document.querySelectorAll('[data-hp-whatsapp]').forEach(link => link.addEventListener('click', () => trackLeadEvent('lead_whatsapp_click')));

// The phone is answered Monday to Friday, 8:00–18:00 (Europe/Rome): outside those hours the bar leads with WhatsApp.
const sticky = document.querySelector('[data-hp-sticky]');
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
    } catch { /* Without Intl support the bar keeps its default labels. */ }
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

if (dialog && frame && typeof dialog.showModal === 'function') {
  document.querySelectorAll('[data-hp-open]').forEach(link => {
    link.addEventListener('click', event => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      if (['heat-pump', 'heat-pump-short'].includes(readSubmissionStatus(window)?.kind)) { location.assign('/thank-you/'); return; }
      opener = link;
      if (!frame.hasAttribute('src')) frame.src = '/preventivo/?servizio=pompe-di-calore&embed=1&contact=form';
      dialog.showModal();
      document.body.classList.add('hp-quiz-open');
    });
  });
  dialog.querySelector('[data-hp-close]').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => {
    document.body.classList.remove('hp-quiz-open');
    opener?.focus({ preventScroll: true });
  });
  window.addEventListener('message', event => {
    if (event.origin !== location.origin || event.source !== frame.contentWindow) return;
    if (event.data?.type === 'green-flux:lead-event') {
      const payload = event.data.payload;
      trackLeadEvent(payload?.event, { ...payload, form_position: 'quiz' });
    }
    if (event.data?.type === 'green-flux:close-quiz' && dialog.open) dialog.close();
  });
}

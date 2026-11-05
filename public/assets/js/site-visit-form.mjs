import { readSiteVisit, validateSiteVisit } from '../../preventivo/site-visit-data.mjs';
import { serviceId } from '../../preventivo/funnel-data.mjs';
import { createRequestSender, submitAndRedirect } from './request-delivery.mjs';
import { readSubmissionStatus } from './submission-status.mjs';
import { setupMobileHeader } from './mobile-header.mjs';
import { setupDesktopMenus } from './desktop-header.mjs';

const params = new URLSearchParams(location.search);
const selected = serviceId(params.get('servizio'));
for (const form of document.querySelectorAll('[data-site-visit-form]')) {
  const send = createRequestSender('site-visit');
  const button = form.querySelector('button[type="submit"]');
  const error = form.querySelector('[data-visit-error]');
  const detailedLink = document.querySelector('[data-visit-detailed]');
  let sending = false;
  if (selected) form.elements.service.value = selected;
  const updateDetailLink = () => {
    if (!detailedLink) return;
    const url = new URL('/preventivo/', location.origin);
    url.search = location.search;
    url.searchParams.set('dettagli', '1');
    const id = serviceId(form.elements.service.value);
    if (id) url.searchParams.set('servizio', id); else url.searchParams.delete('servizio');
    detailedLink.href = url.pathname + url.search;
  };
  updateDetailLink();
  form.elements.service.addEventListener('change', updateDetailLink);
  form.addEventListener('input', event => { event.target.removeAttribute('aria-invalid'); error.hidden = true; });
  if (readSubmissionStatus(window)?.kind === 'site-visit') {
    button.disabled = true;
    button.textContent = 'Richiesta già inviata';
    form.querySelector('.visit-note').textContent = 'La tua richiesta è già arrivata. Ti ricontattiamo ai recapiti che hai indicato.';
  }
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (sending || button.disabled) return;
    const data = readSiteVisit(new FormData(form));
    const issues = validateSiteVisit(data);
    form.querySelectorAll('[aria-invalid]').forEach(field => field.removeAttribute('aria-invalid'));
    if (issues.length) {
      for (const issue of issues) form.elements[issue.name]?.setAttribute('aria-invalid', 'true');
      error.textContent = issues[0].message;
      error.hidden = false;
      form.elements[issues[0].name]?.focus();
      return;
    }
    sending = true;
    button.disabled = true;
    form.setAttribute('aria-busy', 'true');
    button.textContent = 'Invio in corso…';
    try { await submitAndRedirect(send, data, { redirectOnError: false }); }
    catch (failure) {
      error.textContent = failure.category === 'rate_limit' ? 'Attendi qualche minuto prima di riprovare. I dati sono ancora nel modulo.' : 'Non abbiamo conferma dell’invio. I dati sono ancora nel modulo: riprova oppure scrivi a info@green-flux.com.';
      error.hidden = false;
      error.tabIndex = -1;
      error.focus();
      button.disabled = false;
      button.textContent = 'Richiedi un sopralluogo ↗';
    } finally { sending = false; form.removeAttribute('aria-busy'); }
  });
}

const brief = document.querySelector('[data-visit-page]');
const detailed = document.querySelector('[data-quote-wizard]');
if (brief) {
  setupMobileHeader(brief);
  setupDesktopMenus();
  brief.querySelectorAll('a[href="/preventivo/"]').forEach(link => link.setAttribute('href', '#richiesta-breve'));
}
if (brief && detailed && (params.get('dettagli') === '1' || params.get('embed') === '1')) {
  brief.hidden = true;
  detailed.hidden = false;
  document.querySelector('.quote-skip-link')?.setAttribute('href', '#contenuto');
  const back = document.querySelector('[data-visit-brief]');
  if (back) {
    back.hidden = params.get('embed') === '1';
    const url = new URL(location.href);
    url.searchParams.delete('dettagli');
    back.href = url.pathname + url.search;
  }
  import('../../preventivo/wizard.mjs').catch(() => { brief.hidden = false; detailed.hidden = true; });
}

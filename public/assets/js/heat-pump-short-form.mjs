import { readShortRequest, validateShortRequest } from '../../preventivo/heat-pump-short-data.mjs';
import { createRequestSender, submitAndRedirect } from './request-delivery.mjs';
import { trackLeadEvent } from './lead-events.mjs';
import { readSubmissionStatus } from './submission-status.mjs';
import { CLARITY_CONSENT_EVENT } from './clarity.mjs';

const form = document.querySelector('[data-lead-form]');
if (form) {
  const button = form.querySelector('[type="submit"]');
  const status = form.querySelector('[data-lead-status]');
  const sender = createRequestSender('heat-pump-short');
  let sending = false, completed = false, started = false, viewed = false, visible = false;
  function view() { if (visible && !viewed) viewed = trackLeadEvent('lead_form_view'); }
  const observer = new IntersectionObserver(entries => { visible = entries.some(entry => entry.isIntersecting); view(); }, { threshold: 0.15 });
  observer.observe(form);
  document.addEventListener(CLARITY_CONSENT_EVENT, view);
  function existingRequest() {
    const previous = readSubmissionStatus(window);
    if (!['heat-pump', 'heat-pump-short'].includes(previous?.kind)) return;
    completed = true;
    status.textContent = 'La tua richiesta è già stata inviata. Per aggiungere un dettaglio, chiamaci o scrivici: non serve compilare di nuovo.';
    status.hidden = false;
    button.disabled = true;
    button.textContent = 'Richiesta già inviata';
  }
  existingRequest();
  window.addEventListener('pageshow', existingRequest);
  form.addEventListener('input', event => {
    if (!started) { trackLeadEvent('lead_form_start'); started = true; }
    const field = event.target;
    field.removeAttribute('aria-invalid');
    const error = document.getElementById(`${field.id}-error`);
    if (error) { error.textContent = ''; error.hidden = true; }
  });
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (sending || completed) return;
    const data = readShortRequest(new FormData(form));
    form.querySelectorAll('[data-field-error]').forEach(node => { node.textContent = ''; node.hidden = true; });
    form.querySelectorAll('[aria-invalid]').forEach(node => node.removeAttribute('aria-invalid'));
    const issues = validateShortRequest(data);
    if (issues.length) {
      for (const issue of issues) {
        const field = form.elements.namedItem(issue.field);
        field.setAttribute('aria-invalid', 'true');
        const message = document.getElementById(`${field.id}-error`);
        message.textContent = issue.message;
        message.hidden = false;
      }
      trackLeadEvent('lead_form_error', { error_category: 'validation' });
      form.elements.namedItem(issues[0].field).focus();
      return;
    }
    sending = true;
    button.disabled = true;
    button.textContent = 'Invio in corso…';
    form.setAttribute('aria-busy', 'true');
    status.hidden = true;
    trackLeadEvent('lead_form_submit');
    try {
      await submitAndRedirect(sender, data, { redirectOnError: false, onAccepted: () => { completed = true; trackLeadEvent('lead_form_success'); } });
    } catch (error) {
      status.textContent = error.message || 'La conferma non è arrivata. I dati sono ancora qui: riprova oppure chiamaci al +39 375 552 1420.';
      status.hidden = false;
      status.focus();
      trackLeadEvent('lead_form_error', { error_category: error.category || 'network_or_timeout' });
    } finally {
      sending = false;
      button.disabled = completed;
      button.textContent = completed ? 'Richiesta inviata' : 'Richiedi una valutazione';
      form.removeAttribute('aria-busy');
    }
  });
}

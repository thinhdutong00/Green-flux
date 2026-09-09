import { services, spaceOptions, hasEnergyService, validateQuote, quoteSummary, quoteText } from './data.mjs';
import { delivery, sendQuote, contactLinks } from './delivery.mjs';

const form = document.getElementById('quote-form');
const steps = [...form.querySelectorAll('[data-step]')];
const progress = document.getElementById('quote-progress');
const counter = document.getElementById('quote-counter');
const previous = document.getElementById('quote-prev');
const next = document.getElementById('quote-next');
const submit = document.getElementById('quote-submit');
const error = document.getElementById('quote-error');
const fallback = document.getElementById('quote-send-fallback');
let currentStep = 0;
let sending = false;
const startedAt = Date.now();
let requestId = window.crypto.randomUUID();
const checked = name => [...form.querySelectorAll(`input[name="${name}"]:checked`)].map(input => input.value);
const value = name => form.elements.namedItem(name).value.trim();

function readData() {
  const selectedServices = checked('services');
  return {
    services: selectedServices,
    property: value('property'),
    project: value('project'),
    consumption: hasEnergyService(selectedServices) ? value('consumption') : '',
    spaces: checked('spaces'),
    timeline: value('timeline'),
    name: value('name'),
    email: value('email'),
    phone: value('phone'),
    city: value('city'),
    notes: value('notes'),
    privacy: form.elements.namedItem('privacy').checked,
    website: value('website'),
    elapsed: Date.now() - startedAt,
    requestId,
  };
}

function clearError() {
  error.hidden = true;
  error.textContent = '';
  form.querySelectorAll('[aria-invalid]').forEach(field => {
    field.removeAttribute('aria-invalid');
    const description = field.getAttribute('aria-describedby')?.split(' ').filter(id => id !== 'quote-error').join(' ');
    if (description) field.setAttribute('aria-describedby', description);
    else field.removeAttribute('aria-describedby');
  });
}

function showError(message, fieldName) {
  error.textContent = message;
  error.hidden = false;
  if (fieldName) {
    const fields = [...form.querySelectorAll(`[name="${fieldName}"]`)];
    fields.forEach(field => {
      field.setAttribute('aria-invalid', 'true');
      field.setAttribute('aria-describedby', [field.getAttribute('aria-describedby'), 'quote-error'].filter(Boolean).join(' '));
    });
    fields[0]?.focus({ preventScroll: true });
    fields[0]?.closest('.quote-option, .quote-field, .quote-privacy')?.scrollIntoView({ block: 'nearest', behavior: 'auto' });
  } else error.scrollIntoView({ block: 'nearest', behavior: 'auto' });
}

function renderSpaces() {
  const selection = checked('services');
  const preserved = new Set(checked('spaces'));
  const container = document.getElementById('space-options');
  container.querySelectorAll('.quote-option').forEach(option => option.remove());
  spaceOptions(selection).forEach((option, index) => {
    const label = document.createElement('label');
    label.className = 'quote-option';
    const input = document.createElement('input');
    Object.assign(input, { className: 'quote-option-input', type: 'checkbox', name: 'spaces', value: option.id, checked: preserved.has(option.id) });
    const key = document.createElement('span');
    key.className = 'quote-option-key';
    key.setAttribute('aria-hidden', 'true');
    key.textContent = String.fromCharCode(65 + index);
    const text = document.createElement('span');
    text.className = 'quote-option-text';
    text.textContent = option.label;
    label.append(input, key, text);
    container.append(label);
  });
  document.getElementById('consumption-field').hidden = !hasEnergyService(selection);
}

function renderSummary() {
  const summary = document.getElementById('quote-summary');
  summary.replaceChildren();
  const data = readData();
  const indices = data.consumption ? [0, 1, 2, 2, 3, 4] : [0, 1, 2, 3, 4];
  quoteSummary(data).forEach(([label, text], index) => {
    const row = document.createElement('div');
    row.className = 'quote-summary-row';
    const term = document.createElement('dt');
    term.textContent = label;
    const description = document.createElement('dd');
    description.textContent = text;
    const edit = document.createElement('button');
    edit.type = 'button';
    edit.textContent = 'Modifica';
    edit.setAttribute('aria-label', `Modifica: ${label.toLowerCase()}`);
    edit.addEventListener('click', () => setStep(indices[index], true));
    row.append(term, description, edit);
    summary.append(row);
  });
}

function setStep(index, focus = false) {
  currentStep = Math.max(0, Math.min(index, steps.length - 1));
  steps.forEach((step, i) => { step.hidden = i !== currentStep; });
  const stepName = steps[currentStep].querySelector('.quote-step-label').textContent.trim();
  progress.setAttribute('aria-valuenow', String(currentStep + 1));
  progress.setAttribute('aria-valuetext', `Passaggio ${currentStep + 1} di ${steps.length}: ${stepName.slice(1).trim()}`);
  progress.firstElementChild.style.width = `${(currentStep + 1) / steps.length * 100}%`;
  counter.textContent = `${currentStep + 1} / ${steps.length}`;
  previous.hidden = currentStep === 0;
  next.hidden = currentStep === steps.length - 1;
  submit.hidden = currentStep !== steps.length - 1;
  fallback.hidden = true;
  clearError();
  if (currentStep === 5) renderSummary();
  if (focus) {
    window.scrollTo({ top: 0, behavior: 'instant' });
    steps[currentStep].querySelector('.quote-title').focus({ preventScroll: true });
  }
}

function advance() {
  const problem = validateQuote(readData()).find(issue => issue.step === currentStep);
  if (problem) return showError(problem.message, problem.field);
  setStep(currentStep + 1, true);
}

function refreshFallback(data) {
  const links = contactLinks(data);
  document.getElementById('quote-whatsapp').href = links.whatsapp;
  document.getElementById('quote-email').href = links.email;
}

next.addEventListener('click', advance);
previous.addEventListener('click', () => { if (!sending) setStep(currentStep - 1, true); });
form.addEventListener('input', () => {
  requestId = window.crypto.randomUUID();
  clearError();
  if (!fallback.hidden) refreshFallback(readData());
});
form.addEventListener('change', event => {
  if (event.target.name === 'services') renderSpaces();
  if (event.target.name === 'spaces' && event.target.checked) {
    const unknown = event.target.value === 'da-valutare';
    form.querySelectorAll('[name="spaces"]').forEach(input => {
      if (input !== event.target && (unknown || input.value === 'da-valutare')) input.checked = false;
    });
  }
});
form.addEventListener('submit', async event => {
  event.preventDefault();
  if (sending) return;
  if (currentStep < steps.length - 1) return advance();
  const data = readData();
  const problem = validateQuote(data)[0];
  if (problem) {
    setStep(problem.step, true);
    return showError(problem.message, problem.field);
  }
  sending = true;
  previous.disabled = true;
  submit.disabled = true;
  submit.textContent = 'Invio in corso…';
  form.setAttribute('aria-busy', 'true');
  clearError();
  fallback.hidden = true;
  try {
    const result = await sendQuote(data);
    form.hidden = true;
    document.getElementById('quote-complete').hidden = false;
    const handoff = Boolean(result.handoff);
    document.getElementById('quote-complete-title').textContent = handoff ? 'Il riepilogo è pronto.' : 'Richiesta inviata.';
    document.getElementById('quote-complete-message').textContent = handoff ? 'Scegli email o WhatsApp per aprire la richiesta già compilata. Completa l’invio nell’app scelta: il riepilogo non è ancora stato inviato a Green Flux.' : 'Grazie per averci raccontato il tuo progetto. Green Flux ti ricontatterà ai recapiti che hai indicato per approfondire la richiesta.';
    document.getElementById('quote-handoff').hidden = !handoff;
    if (handoff) {
      document.getElementById('quote-handoff-email').href = result.links.email;
      document.getElementById('quote-handoff-whatsapp').href = result.links.whatsapp;
      document.getElementById('quote-copy-text').value = quoteText(data);
      document.getElementById('quote-copy-status').textContent = '';
    } else form.reset();
    document.getElementById('quote-complete-title').focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: 'instant' });
  } catch (failure) {
    showError(failure.message || 'L’invio non è riuscito. Riprova tra poco.');
    refreshFallback(data);
    fallback.hidden = false;
  } finally {
    sending = false;
    previous.disabled = false;
    submit.disabled = false;
    submit.textContent = delivery.label;
    form.removeAttribute('aria-busy');
  }
});

document.getElementById('quote-edit').addEventListener('click', () => {
  document.getElementById('quote-complete').hidden = true;
  form.hidden = false;
  setStep(5, true);
});

document.getElementById('quote-copy').addEventListener('click', async () => {
  const text = document.getElementById('quote-copy-text');
  const status = document.getElementById('quote-copy-status');
  try {
    await navigator.clipboard.writeText(text.value);
    status.textContent = 'Riepilogo copiato.';
  } catch {
    text.closest('details').open = true;
    text.focus();
    text.select();
    status.textContent = 'Riepilogo selezionato: usa Copia per copiarlo.';
  }
});

document.addEventListener('keydown', event => {
  if (sending || event.altKey || event.ctrlKey || event.metaKey || event.target.closest('input, textarea, select, button, a, summary, [contenteditable="true"]')) return;
  const index = event.key.toUpperCase().charCodeAt(0) - 65;
  if (event.key.length !== 1 || index < 0 || index > 15) return;
  const option = steps[currentStep].querySelectorAll('.quote-option')[index];
  if (option) {
    event.preventDefault();
    option.click();
  }
});

const requested = new URLSearchParams(window.location.search).getAll('servizio');
form.querySelectorAll('[name="services"]').forEach(input => {
  input.checked = requested.includes(input.value) && services.some(service => service.id === input.value);
});
renderSpaces();
setStep(0);
submit.firstChild.textContent = `${delivery.label} `;
document.getElementById('delivery-note').textContent = delivery.note;
document.getElementById('quote-loading').hidden = true;
form.hidden = false;

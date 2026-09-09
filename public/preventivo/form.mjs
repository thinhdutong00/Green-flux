import { services, projects, consumption, spaceOptions, hasEnergyService, multipleSpaces, validateQuote, reviewEntries, quoteText } from './data.mjs';
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
const params = new URLSearchParams(window.location.search);
const embedded = params.get('embed') === '1' && window.parent !== window;
let currentStep = 0;
let sending = false;
let autoAdvance;
const startedAt = Date.now();
let requestId = window.crypto.randomUUID();
const checked = name => [...form.querySelectorAll(`input[name="${name}"]:checked`)].map(input => input.value);
const value = name => form.elements.namedItem(name)?.value?.trim() || '';

function readData() {
  const selectedServices = checked('services');
  const energy = hasEnergyService(selectedServices);
  return {
    services: selectedServices,
    project: energy ? '' : value('project'),
    consumption: energy ? value('consumption') : '',
    spaces: checked('spaces'),
    name: value('name'), email: value('email'), phone: value('phone'), city: value('city'), notes: value('notes'),
    privacy: form.elements.namedItem('privacy').checked,
    website: value('website'), elapsed: Date.now() - startedAt, requestId,
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
  const fields = fieldName ? [...form.querySelectorAll(`[name="${fieldName}"]`)] : [];
  fields.forEach(field => {
    field.setAttribute('aria-invalid', 'true');
    field.setAttribute('aria-describedby', [field.getAttribute('aria-describedby'), 'quote-error'].filter(Boolean).join(' '));
  });
  fields[0]?.focus({ preventScroll: true });
  (fields[0]?.closest('.quote-option, .quote-field, .quote-privacy') || error).scrollIntoView({ block: 'nearest', behavior: 'auto' });
}

function renderOptions(container, options, name, type, selected = []) {
  container.querySelectorAll('.quote-option').forEach(option => option.remove());
  options.forEach(option => {
    const label = document.createElement('label');
    label.className = 'quote-option';
    const input = document.createElement('input');
    Object.assign(input, { className: 'quote-option-input', type, name, value: option.id, checked: selected.includes(option.id) });
    const text = document.createElement('span');
    text.className = 'quote-option-text';
    text.textContent = option.label;
    const check = document.createElement('span');
    check.className = 'quote-option-check';
    check.setAttribute('aria-hidden', 'true');
    check.textContent = '✓';
    label.append(input, text, check);
    container.append(label);
  });
}

function renderFollowUp() {
  window.clearTimeout(autoAdvance);
  const ids = checked('services');
  const energy = hasEnergyService(ids);
  const needsName = energy ? 'consumption' : 'project';
  const selectedNeeds = checked(needsName);
  renderOptions(document.getElementById('needs-options'), energy ? consumption : projects, needsName, 'radio', selectedNeeds);
  document.getElementById('needs-label').textContent = energy ? 'Consumi' : 'Progetto';
  document.getElementById('step-title-3').textContent = energy ? 'Quanto spendi in media di bolletta al mese?' : 'Che intervento hai in mente?';
  document.getElementById('needs-hint').textContent = energy ? 'È sufficiente una stima della spesa energetica.' : 'Partiamo dalla tua situazione, anche se il progetto è ancora da definire.';
  document.getElementById('needs-legend').textContent = energy ? 'Spesa energetica mensile' : 'Tipo di intervento';
  const options = spaceOptions(ids);
  const multiple = multipleSpaces(ids);
  let spaces = checked('spaces').filter(id => options.some(option => option.id === id));
  if (!multiple) spaces = spaces.slice(0, 1);
  renderOptions(document.getElementById('space-options'), options, 'spaces', multiple ? 'checkbox' : 'radio', spaces);
  const solarOnly = ids.length > 0 && ids.every(id => services.find(service => service.id === id)?.solar);
  document.getElementById('step-title-4').textContent = solarOnly ? 'Che tipo di tetto o spazio hai?' : 'Quali spazi vuoi valutare?';
  document.getElementById('spaces-hint').textContent = multiple ? 'Puoi selezionare più spazi oppure scegliere la verifica con sopralluogo.' : 'Se non hai tutte le informazioni, scegli la verifica con sopralluogo.';
  document.getElementById('service-count').textContent = ids.length ? `${ids.length} ${ids.length === 1 ? 'servizio selezionato' : 'servizi selezionati'}` : 'Puoi scegliere anche una consulenza.';
}

function renderSummary() {
  const summary = document.getElementById('quote-summary');
  summary.replaceChildren();
  reviewEntries(readData()).forEach(({ field, label, value: text, step }) => {
    const row = document.createElement('div');
    row.className = 'quote-summary-row';
    row.dataset.field = field;
    const term = document.createElement('dt'); term.textContent = label;
    const description = document.createElement('dd'); description.textContent = text;
    const edit = document.createElement('button');
    edit.type = 'button'; edit.textContent = 'Modifica';
    edit.setAttribute('aria-label', `Modifica: ${label.toLowerCase()}`);
    edit.addEventListener('click', () => setStep(step, true));
    row.append(term, description, edit);
    if (field === 'contacts') {
      const editName = document.createElement('button');
      editName.type = 'button'; editName.textContent = 'Modifica nome'; editName.style.marginLeft = '16px';
      editName.addEventListener('click', () => setStep(0, true));
      row.append(editName);
    }
    summary.append(row);
  });
}

function refreshActions() {
  const invalid = validateQuote(readData()).some(issue => issue.step === currentStep);
  (currentStep === 5 ? submit : next).setAttribute('aria-disabled', String(invalid));
}

function setStep(index, focus = false) {
  window.clearTimeout(autoAdvance);
  form.classList.toggle('is-backward', index < currentStep);
  currentStep = Math.max(0, Math.min(index, steps.length - 1));
  steps.forEach((step, i) => { step.hidden = i !== currentStep; });
  form.classList.toggle('is-services', currentStep === 1);
  form.classList.toggle('is-review', currentStep === 5);
  form.querySelectorAll('[data-quote-name]').forEach(span => { span.textContent = value('name'); });
  const label = steps[currentStep].querySelector('.quote-step-label').textContent.slice(2).trim();
  progress.setAttribute('aria-valuenow', String(currentStep + 1));
  progress.setAttribute('aria-valuetext', `Passaggio ${currentStep + 1} di ${steps.length}: ${label}`);
  progress.firstElementChild.style.width = `${currentStep / (steps.length - 1) * 100}%`;
  counter.textContent = `Passaggio ${currentStep + 1} di ${steps.length}: ${label}`;
  previous.hidden = currentStep === 0;
  next.hidden = currentStep === 5;
  submit.hidden = currentStep !== 5;
  document.getElementById('quote-keyboard-hint').hidden = currentStep === 5;
  fallback.hidden = true;
  clearError();
  if (currentStep === 5) renderSummary();
  refreshActions();
  if (focus) {
    window.scrollTo({ top: 0, behavior: 'instant' });
    const target = window.matchMedia('(pointer: fine)').matches && [0, 4].includes(currentStep) ? steps[currentStep].querySelector('input') : steps[currentStep].querySelector('.quote-title');
    target.focus({ preventScroll: true });
  }
}

function advance() {
  if (sending || currentStep === 5) return;
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
  refreshActions();
  if (!fallback.hidden) refreshFallback(readData());
});
form.addEventListener('change', event => {
  if (event.target.name === 'services') renderFollowUp();
  if (event.target.name === 'spaces' && event.target.checked) {
    const unknown = event.target.value === 'da-valutare';
    form.querySelectorAll('[name="spaces"]').forEach(input => {
      if (input !== event.target && (unknown || input.value === 'da-valutare')) input.checked = false;
    });
  }
  refreshActions();
});
// Pointer selection advances single-choice questions. Arrow-key navigation stays
// in the radio group so keyboard users can explore all answers before Enter.
form.addEventListener('click', event => {
  const option = event.target.closest('.quote-option');
  const input = option?.querySelector('input[type="radio"]');
  if (!input || !event.detail || ![2, 3].includes(currentStep)) return;
  const from = currentStep;
  window.clearTimeout(autoAdvance);
  autoAdvance = window.setTimeout(() => { if (currentStep === from && input.checked) advance(); }, 250);
});
form.addEventListener('keydown', event => {
  if (event.key !== 'Enter' || event.isComposing || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || event.target.closest('textarea, button, a, summary') || currentStep === 5) return;
  event.preventDefault();
  advance();
});
form.addEventListener('submit', async event => {
  event.preventDefault();
  if (sending) return;
  if (currentStep < 5) return advance();
  const data = readData();
  const problem = validateQuote(data)[0];
  if (problem) {
    setStep(problem.step, true);
    return showError(problem.message, problem.field);
  }
  sending = true;
  form.inert = true;
  submit.disabled = true;
  submit.textContent = delivery.mode === 'handoff' ? 'Preparazione…' : 'Invio in corso…';
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
    counter.textContent = handoff ? 'Riepilogo pronto, da inviare.' : 'Richiesta inviata.';
    progress.setAttribute('aria-valuenow', '6');
    progress.setAttribute('aria-valuetext', counter.textContent);
  } catch (failure) {
    form.inert = false;
    showError(failure.message || 'L’invio non è riuscito. Riprova tra poco.');
    refreshFallback(data);
    fallback.hidden = false;
  } finally {
    sending = false;
    form.inert = false;
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
    text.focus(); text.select();
    status.textContent = 'Riepilogo selezionato: usa Copia per copiarlo.';
  }
});

function closeEmbedded(event) {
  if (!embedded) return;
  event.preventDefault();
  window.parent.postMessage({ type: 'greenflux:close-quote' }, window.location.origin);
}
document.querySelectorAll('.quote-brand, #quote-close, .quote-home-return').forEach(link => link.addEventListener('click', closeEmbedded));
document.addEventListener('keydown', event => { if (event.key === 'Escape') closeEmbedded(event); });

renderOptions(document.getElementById('service-options'), services, 'services', 'checkbox', params.getAll('servizio'));
renderFollowUp();
setStep(0);
submit.firstChild.textContent = `${delivery.label} `;
document.getElementById('delivery-note').textContent = delivery.note;

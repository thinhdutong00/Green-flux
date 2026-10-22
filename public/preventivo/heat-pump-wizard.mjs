import {
  heatPumpSteps, clientOptions, propertyOptions, heatingOptions, distributionOptions,
  functionOptions, areaOptions, outdoorOptions, timelines, readHeatPumpRequest,
  validateHeatPumpRequest, heatPumpSummary, heatPumpRequestText,
} from './heat-pump-data.mjs';
import { showHandoff } from '../assets/js/handoff.mjs';

const paths = {
  house: '<path d="m3 10 9-7 9 7M5 9v12h14V9M9 21v-7h6v7M16 5V2h3v6"/>',
  building: '<path d="M5 21V3h10v18M15 9h4v12M3 21h18M8 6h1m2 0h1M8 10h1m2 0h1M8 14h1m2 0h1M8 18h1m2 0h1m6-6h1m-1 4h1"/>',
  store: '<path d="M3 9h18l-3-6H6L3 9Zm2 3v9h14v-9M9 21v-6h6v6M3 9v2a2 2 0 0 0 4 0V9m0 0v2a2 2 0 0 0 4 0V9m0 0v2a2 2 0 0 0 4 0V9m0 0v2a3 3 0 0 0 6 0V9"/>',
  heat: '<path d="M12 3c1 5-6 6-6 12a6 6 0 0 0 12 0c0-3-1-5-3-7 0 3-1 4-2 4 1-3 0-6-1-9Z"/>',
  radiator: '<rect x="4" y="5" width="16" height="14" rx="2"/><path d="M8 5v14m4-14v14m4-14v14M4 9H2m2 6H2m20-6h-2m2 6h-2M7 19v3m10-3v3"/>',
  drop: '<path d="M12 2S5 10 5 15a7 7 0 0 0 14 0c0-5-7-13-7-13Zm-3 13a3 3 0 0 0 3 3"/>',
  snow: '<path d="M12 2v20M3 7l18 10M3 17 21 7M9 3l3 3 3-3M9 21l3-3 3 3M3 10l5-1-1-5m10 16-1-5 5-1M3 14l5 1-1 5m10-16-1 5 5 1"/>',
  advice: '<path d="M4 3h16v14H9l-5 4V3Z"/><path d="M9 8a3 3 0 0 1 6 0c0 2-3 2-3 4m0 2h.01"/>',
};
const element = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};
function icon(name) {
  const node = element('span', 'hpq-option-icon');
  node.setAttribute('aria-hidden', 'true');
  node.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${paths[name] || paths.house}</svg>`;
  return node;
}
export function mountHeatPumpQuiz(root, { embedded = false } = {}) {
  const template = document.querySelector('#heat-pump-quote-template');
  if (!template) throw new Error('Template del preventivo pompe di calore non disponibile.');
  root.className = 'hpq-page';
  root.replaceChildren(template.content.cloneNode(true));
  document.body.classList.add('hpq-body');
  document.title = 'Preventivo pompe di calore su misura | Green Flux';
  const form = root.querySelector('[data-hpq-form]');
  const panels = [...form.querySelectorAll('[data-hpq-step]')];
  const workspace = root.querySelector('[data-hpq-workspace]');
  const title = root.querySelector('[data-hpq-title]');
  const context = root.querySelector('[data-hpq-context]');
  const counter = root.querySelector('[data-hpq-counter]');
  const error = root.querySelector('[data-hpq-error]');
  const previous = root.querySelector('[data-hpq-prev]');
  const next = root.querySelector('[data-hpq-next]');
  const progress = root.querySelector('[data-hpq-progress]');
  const completion = root.querySelector('[data-hpq-completion]');
  let current = 0;
  let clientType = '';
  let showingCompletion = false;

  for (const [index, label] of heatPumpSteps.entries()) {
    const item = element('li');
    item.append(element('span', 'hpq-step-circle', String(index + 1)), element('span', 'hpq-step-name', label));
    progress.append(item);
  }
  const progressItems = [...progress.children];
  function fillOptions(name, options, selected = '') {
    const group = form.querySelector(`[data-hpq-options="${name}"]`);
    group.querySelectorAll('.hpq-option').forEach(node => node.remove());
    for (const option of options) {
      const label = element('label', 'hpq-option');
      const input = document.createElement('input');
      Object.assign(input, { type: 'radio', name, value: option.value, checked: option.value === selected, required: true });
      const copy = element('span', 'hpq-option-copy');
      copy.append(element('strong', '', option.label));
      if (option.description) copy.append(element('span', '', option.description));
      const check = element('span', 'hpq-option-check', '✓');
      check.setAttribute('aria-hidden', 'true');
      label.append(input, icon(option.icon), copy, check);
      group.append(label);
    }
  }
  fillOptions('cliente', clientOptions);
  fillOptions('riscaldamento', heatingOptions);
  fillOptions('distribuzione', distributionOptions);
  fillOptions('funzioni', functionOptions);
  for (const [name, options] of [['superficie', areaOptions], ['spazio-esterno', outdoorOptions], ['tempistiche', timelines]]) {
    const select = form.querySelector(`[data-hpq-select="${name}"]`);
    options.forEach(value => select.append(new Option(value, value)));
  }
  const read = () => readHeatPumpRequest(new FormData(form));
  function clearError() {
    error.hidden = true;
    form.querySelectorAll('[aria-invalid="true"]').forEach(input => input.removeAttribute('aria-invalid'));
  }
  function showError(issue) {
    error.textContent = issue.message;
    error.hidden = false;
    const input = [...form.elements].find(input => input.name === issue.field);
    if (input) { input.setAttribute('aria-invalid', 'true'); input.focus(); }
  }
  function renderSummary(data) {
    const container = root.querySelector('[data-hpq-summary]');
    container.replaceChildren();
    for (const row of heatPumpSummary(data)) {
      const item = element('div', 'hpq-summary-row');
      const modify = element('button', '', 'Modifica');
      modify.type = 'button';
      modify.setAttribute('aria-label', `Modifica ${row.label.toLowerCase()}`);
      modify.addEventListener('click', () => setStep(row.step, true));
      item.append(element('dt', '', row.label), element('dd', '', row.value), modify);
      container.append(item);
    }
  }
  function sync() {
    const data = read();
    if (data.clientType !== clientType) {
      clientType = data.clientType;
      fillOptions('immobile', propertyOptions(clientType), data.propertyType);
      const company = root.querySelector('[data-hpq-company]');
      const needed = clientType !== '' && clientType !== 'Privato';
      company.hidden = !needed;
      company.querySelector('input').disabled = !needed;
      company.querySelector('input').required = needed;
    }
    form.querySelectorAll('.hpq-option').forEach(label => label.classList.toggle('is-selected', label.querySelector('input').checked));
    context.textContent = clientType ? `Preventivo pompe di calore · ${clientType}` : 'Rispondi a poche semplici domande e richiedi un preventivo su misura.';
    if (current === 5) renderSummary(read());
  }
  function setProgress() {
    progressItems.forEach((item, index) => {
      const done = showingCompletion || index < current;
      item.classList.toggle('is-complete', done);
      item.classList.toggle('is-active', !showingCompletion && index === current);
      if (!showingCompletion && index === current) item.setAttribute('aria-current', 'step');
      else item.removeAttribute('aria-current');
      item.querySelector('.hpq-step-circle').textContent = done ? '✓' : String(index + 1);
    });
  }
  function setStep(index, focus = false) {
    current = Math.max(0, Math.min(panels.length - 1, index));
    panels.forEach((panel, position) => { panel.hidden = position !== current; });
    title.textContent = heatPumpSteps[current];
    counter.textContent = `${current + 1} di ${heatPumpSteps.length}`;
    next.textContent = current === 5 ? 'Prepara la richiesta' : 'Avanti';
    previous.disabled = current === 0;
    setProgress(); clearError(); sync();
    workspace.scrollTop = 0;
    if (focus) panels[current].querySelector('h2').focus({ preventScroll: true });
  }
  form.addEventListener('input', () => { clearError(); sync(); });
  form.addEventListener('change', () => { clearError(); sync(); });
  previous.addEventListener('click', () => setStep(current - 1, true));
  form.addEventListener('submit', event => {
    event.preventDefault();
    const data = read();
    const issues = validateHeatPumpRequest(data);
    const issue = current < 5 ? issues.find(issue => issue.step === current) : issues[0];
    if (issue) { if (issue.step !== current) setStep(issue.step, true); showError(issue); return; }
    if (current < 5) { setStep(current + 1, true); return; }
    form.hidden = true;
    completion.hidden = false;
    showingCompletion = true;
    title.textContent = 'Richiesta pronta';
    setProgress();
    showHandoff(completion, heatPumpRequestText(data), { onEdit: () => {
      showingCompletion = false;
      completion.hidden = true;
      form.hidden = false;
      setStep(5, true);
    } });
    workspace.scrollTop = 0;
  });
  form.addEventListener('keydown', event => {
    if (event.key === 'Enter' && event.target.tagName === 'INPUT' && event.target.type !== 'checkbox') {
      event.preventDefault(); form.requestSubmit();
    }
  });
  if (embedded) {
    document.body.classList.add('hpq-embedded');
    const close = () => window.parent.postMessage({ type: 'green-flux:close-quiz' }, location.origin);
    root.querySelectorAll('.hpq-close, .hpq-brand').forEach(link => link.addEventListener('click', event => { event.preventDefault(); close(); }));
    window.addEventListener('keydown', event => { if (event.key === 'Escape') { event.preventDefault(); close(); } });
  }
  setStep(0);
  root.dataset.ready = 'true';
}

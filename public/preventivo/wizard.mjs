import { quoteText } from './data.mjs';
import { readFunnel, validateFunnel, serviceId, questionsFor, adjacentFunnelStep } from './funnel-data.mjs';
import { showHandoff } from '../assets/js/handoff.mjs';
const wizard = document.querySelector('[data-quote-wizard]');
if (wizard) {
  const form = wizard.querySelector('.quote-form');
  const steps = [...form.querySelectorAll('[data-step]')];
  const progress = wizard.querySelector('[data-progress]');
  const progressTrack = wizard.querySelector('[data-progress-track]');
  const stage = wizard.querySelector('[data-quote-stage]');
  const counter = wizard.querySelector('[data-counter]');
  const error = wizard.querySelector('[data-error-message]');
  const previous = wizard.querySelector('[data-prev]');
  const next = wizard.querySelector('[data-next]');
  const submit = wizard.querySelector('[data-submit]');
  const savedAnswers = new Map();
  const selected = serviceId(new URLSearchParams(location.search).get('servizio'));
  let current = 0;
  function element(tag, attributes = {}, text) {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, value);
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function sync() {
    form.querySelectorAll('.quote-option').forEach(option => option.classList.toggle('is-selected', option.querySelector('input').checked));
    form.querySelector('[data-customer-name]').textContent = form.elements.nome.value.trim();
    next.disabled = validateFunnel(readFunnel(new FormData(form))).some(issue => issue.step === current);
  }
  function renderQuestions() {
    form.querySelectorAll('[data-conditional] input:checked').forEach(input => savedAnswers.set(input.name, input.value));
    const ids = new FormData(form).getAll('servizio');
    for (const [index, step] of [steps[2], steps[3]].entries()) {
      const questions = questionsFor(ids, index);
      const single = questions.length === 1;
      const title = step.querySelector('.quote-title');
      const description = step.querySelector('.quote-description');
      title.textContent = single ? questions[0].title : index === 0 ? 'Da quale situazione partiamo?' : 'Completiamo i dettagli degli impianti.';
      description.textContent = single ? `${questions[0].label} — ${questions[0].hint}` : 'Una risposta per ciascun impianto selezionato. Se non conosci un dato, puoi indicare che è da valutare.';
      const container = step.querySelector('[data-conditional]');
      container.replaceChildren();
      for (const question of questions) {
        const group = element('fieldset', { class: 'quote-question', 'data-question-service': question.service });
        group.append(element('legend', { class: single ? 'quote-question-legend visually-hidden' : 'quote-question-legend' }, single ? question.title : `${question.label} · ${question.title}`));
        if (!single) group.append(element('p', { class: 'quote-question-hint' }, question.hint));
        const options = element('div', { class: 'quote-options' });
        for (const value of question.options) {
          const label = element('label', { class: 'quote-option' });
          const input = element('input', { class: 'quote-option-input', name: question.name, type: 'radio', value });
          input.checked = savedAnswers.get(question.name) === value;
          label.append(input, element('span', { class: 'quote-option-text' }, value));
          options.append(label);
        }
        group.append(options);
        container.append(group);
      }
    }
    sync();
  }
  function setStep(index, focus = false) {
    current = Math.max(0, Math.min(index, steps.length - 1));
    steps.forEach((step, i) => { step.hidden = i !== current; step.setAttribute('aria-hidden', String(i !== current)); });
    const percent = Math.round(current / (steps.length - 1) * 100);
    progress.style.width = `${percent}%`;
    progressTrack.setAttribute('aria-valuenow', String(percent));
    progressTrack.setAttribute('aria-valuetext', `Passaggio ${current + 1} di ${steps.length}`);
    counter.textContent = `Passaggio ${current + 1} di ${steps.length}`;
    previous.hidden = current === 0;
    next.hidden = current === steps.length - 1;
    submit.hidden = current !== steps.length - 1;
    wizard.querySelector('[data-keyboard-hint]').hidden = current === steps.length - 1;
    error.hidden = true;
    sync();
    if (focus) {
      const title = steps[current].querySelector('.quote-title');
      title.tabIndex = -1;
      title.focus({ preventScroll: true });
      window.scrollTo({ top: 0, behavior: 'instant' });
      if (current === 0) form.elements.nome.focus({ preventScroll: true });
    }
  }
  function validate(step) {
    const issue = validateFunnel(readFunnel(new FormData(form))).find(x => x.step === step);
    if (issue) {
      error.textContent = issue.message;
      error.hidden = false;
      if (issue.name) [...form.elements].find(input => input.name === issue.name)?.focus();
      return false;
    }
    error.hidden = true;
    return true;
  }
  form.addEventListener('change', event => {
    if (event.target.name === 'servizio') renderQuestions();
    sync();
    error.hidden = true;
    wizard.querySelector('.gf-handoff')?.remove();
  });
  form.addEventListener('input', () => { sync(); error.hidden = true; });
  function advance() {
    if (validate(current)) setStep(adjacentFunnelStep(current, 1, selected), true);
  }
  next.addEventListener('click', advance);
  previous.addEventListener('click', () => setStep(adjacentFunnelStep(current, -1, selected), true));
  form.addEventListener('keydown', event => {
    if (event.key === 'Enter' && !(event.target instanceof HTMLTextAreaElement) && event.target.tagName !== 'BUTTON' && event.target.tagName !== 'A' && current < steps.length - 1) {
      event.preventDefault();
      advance();
    }
  });
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (current < steps.length - 1) { advance(); return; }
    const data = readFunnel(new FormData(form));
    const issues = validateFunnel(data);
    if (issues.length) { setStep(issues[0].step, true); validate(issues[0].step); return; }
    form.hidden = true;
    counter.textContent = 'Riepilogo';
    showHandoff(stage, quoteText(data), { onEdit: () => { form.hidden = false; setStep(steps.length - 1, true); } });
  });
  if (selected) {
    const input = [...form.querySelectorAll('[name="servizio"]')].find(x => x.value === selected);
    if (input) input.checked = true;
  }
  renderQuestions();
  sync();
  setStep(0);
  wizard.dataset.ready = 'true';
  if (matchMedia('(min-width: 768px)').matches) form.elements.nome.focus({ preventScroll: true });
}

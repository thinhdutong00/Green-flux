import { services } from './catalog.mjs';
import { serviceQuestions, answerName } from './questions.mjs';
export { annualConsumptions, installationSpaces } from './questions.mjs';
export const propertyTypes = ['Appartamento', 'Abitazione singola', 'Azienda o negozio', 'Condominio', 'Struttura agricola o produttiva', 'Altro immobile'];
export const timelines = ['Il prima possibile', 'Entro 1 mese', 'Entro 2-3 mesi', 'Sto valutando con calma'];
export const aliases = { 'fotovoltaico-residenziale': 'fotovoltaico', 'fotovoltaico-aziendale': 'fotovoltaico', 'pompe-calore': 'pompe-di-calore', climatizzazione: 'condizionatori' };
export function serviceId(value) {
  const id = Object.hasOwn(aliases, value) ? aliases[value] : value;
  return services.some(s => s.id === id) ? id : null;
}
export function adjacentFunnelStep(current, direction, preselectedService) {
  const next = Math.max(0, Math.min(5, current + direction));
  return next === 1 && serviceId(preselectedService) ? next + direction : next;
}
export function questionsFor(ids, index) {
  return services.filter(service => ids.includes(service.id)).flatMap(service => {
    const questions = serviceQuestions[service.id] || [];
    return questions.flatMap((question, i) => index === undefined || i === index ? [{ ...question, service: service.id, label: service.label, step: i + 2, name: answerName(service.id, question.id) }] : []);
  });
}
export function validateFunnel(data) {
  const errors = [];
  if (typeof data.name !== 'string' || data.name.trim().length < 2 || data.name.length > 120) errors.push({ step: 0, name: 'nome', message: 'Inserisci il tuo nome (da 2 a 120 caratteri).' });
  const ids = Array.isArray(data.services) ? data.services : [];
  if (!ids.length || new Set(ids).size !== ids.length || ids.some(id => !services.some(s => s.id === id))) errors.push({ step: 1, message: 'Seleziona almeno un impianto per continuare.' });
  for (const question of questionsFor(ids)) {
    if (!question.options.includes(data.answers?.[question.service]?.[question.id])) errors.push({ step: question.step, name: question.name, message: `${question.label}: rispondi alla domanda oppure scegli l’opzione da valutare.` });
  }
  if (!timelines.includes(data.timeline)) errors.push({ step: 4, message: 'Seleziona una tempistica indicativa.' });
  if (!propertyTypes.includes(data.propertyType)) errors.push({ step: 5, name: 'immobile', message: 'Seleziona una tipologia di immobile.' });
  if (typeof data.city !== 'string' || data.city.trim().length < 2 || data.city.length > 120) errors.push({ step: 5, message: 'Inserisci il comune dell’intervento.' });
  const email = typeof data.email === 'string' ? data.email.trim() : '';
  const phone = typeof data.phone === 'string' ? data.phone.trim() : '';
  if (!email && !phone) errors.push({ step: 5, message: 'Inserisci almeno un recapito tra email e telefono.' });
  if (email && (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) errors.push({ step: 5, message: 'Inserisci un indirizzo email valido.' });
  if (phone && (!/^\+?[\d\s().-]+$/.test(phone) || phone.replace(/\D/g, '').length < 7 || phone.replace(/\D/g, '').length > 15)) errors.push({ step: 5, message: 'Inserisci un numero di telefono valido.' });
  if (typeof data.notes !== 'string' || data.notes.length > 2000) errors.push({ step: 5, message: 'Il messaggio può contenere al massimo 2.000 caratteri.' });
  if (data.privacy !== true) errors.push({ step: 5, message: 'Leggi l’informativa privacy e autorizza il ricontatto.' });
  return errors.sort((a, b) => a.step - b.step);
}
export function readFunnel(formData) {
  const ids = formData.getAll('servizio');
  const answers = {};
  for (const question of questionsFor(ids)) {
    answers[question.service] ||= {};
    answers[question.service][question.id] = String(formData.get(question.name) || '');
  }
  return {
    funnel: 'conditional', services: ids, answers,
    propertyType: formData.get('immobile') || '', timeline: formData.get('tempistiche') || '',
    name: String(formData.get('nome') || '').trim(), email: String(formData.get('email') || '').trim(),
    phone: String(formData.get('telefono') || '').trim(), city: String(formData.get('comune') || '').trim(),
    notes: String(formData.get('messaggio') || '').trim(), privacy: formData.get('privacy') === 'on',
  };
}

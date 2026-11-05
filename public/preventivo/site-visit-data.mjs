import { services } from './catalog.mjs';
export const undecidedService = 'da-valutare';
export const visitServiceLabel = id => services.find(service => service.id === id)?.label || (id === undecidedService ? 'Da valutare insieme' : '');

export function readSiteVisit(form) {
  return { ...Object.fromEntries(['name', 'phone', 'city', 'service', 'email', 'notes', 'website'].map(key => [key, String(form.get(key) || '').trim()])), privacy: form.get('privacy') === 'on' };
}
export function validateSiteVisit(data) {
  const errors = [];
  const issue = (name, message) => errors.push({ name, message });
  if (data.name.trim().length < 2 || data.name.length > 120) issue('name', 'Inserisci nome e cognome.');
  if (!/^\+?[\d\s().-]+$/.test(data.phone) || data.phone.replace(/\D/g, '').length < 7 || data.phone.replace(/\D/g, '').length > 15) issue('phone', 'Inserisci un numero di telefono valido.');
  if (data.city.trim().length < 2 || data.city.length > 120) issue('city', 'Indica il comune dell’immobile.');
  if (!visitServiceLabel(data.service)) issue('service', 'Scegli un servizio oppure “Da valutare insieme”.');
  if (data.email && (data.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email))) issue('email', 'Controlla l’indirizzo email.');
  if (data.notes.length > 2000) issue('notes', 'Il messaggio può contenere al massimo 2.000 caratteri.');
  if (data.privacy !== true) issue('privacy', 'Leggi l’informativa privacy e autorizza il ricontatto.');
  return errors;
}
export function siteVisitText(data) {
  return ['Richiesta di sopralluogo — Green Flux', '', `Nome: ${data.name}`, `Telefono: ${data.phone}`, `Email: ${data.email || 'Non indicata'}`, `Comune dell’immobile: ${data.city}`, `Impianto: ${visitServiceLabel(data.service)}`, `Messaggio: ${data.notes || 'Non indicato'}`, '', 'Percorso: richiesta breve di sopralluogo. Appuntamento da concordare dopo il primo contatto.', 'Ho letto l’informativa privacy e autorizzo il ricontatto per questa richiesta.'].join('\n');
}

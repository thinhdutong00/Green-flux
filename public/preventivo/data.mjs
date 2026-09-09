export const services = [
  { id: 'fotovoltaico', label: 'Fotovoltaico', group: 'Impianti', energy: true, solar: true },
  { id: 'pompe-di-calore', label: 'Pompe di calore', group: 'Impianti', energy: true },
  { id: 'smart-home', label: 'Smart home e automazioni', group: 'Impianti' },
  { id: 'solare-termico', label: 'Solare termico', group: 'Impianti', energy: true, solar: true },
  { id: 'biomassa', label: 'Biomassa', group: 'Impianti', energy: true },
  { id: 'caldaie', label: 'Caldaie', group: 'Impianti', energy: true },
  { id: 'condizionatori', label: 'Condizionatori', group: 'Impianti', energy: true },
  { id: 'ventilazione', label: 'Ventilazione meccanica', group: 'Impianti' },
  { id: 'trattamento-acqua', label: 'Trattamento acqua', group: 'Impianti' },
  { id: 'impianti-completi', label: 'Impianti completi', group: 'Impianti', energy: true },
  { id: 'progettazione', label: 'Progettazione', group: 'Servizi' },
  { id: 'pratiche-e-permessi', label: 'Pratiche e permessi', group: 'Servizi' },
  { id: 'diagnosi-energetiche', label: 'Diagnosi energetiche', group: 'Servizi', energy: true },
  { id: 'detrazioni-fiscali', label: 'Detrazioni fiscali', group: 'Servizi' },
  { id: 'formule-assicurative', label: 'Formule assicurative', group: 'Servizi' },
  { id: 'consulenza', label: 'Consulenza / non so ancora', group: 'Consulenza' },
];
export const projects = [
  { id: 'nuovo', label: 'Nuova installazione' },
  { id: 'sostituzione', label: 'Sostituzione di un impianto' },
  { id: 'ristrutturazione', label: 'Ristrutturazione completa' },
  { id: 'integrazione', label: 'Miglioramento o integrazione' },
  { id: 'verifica', label: 'Verifica tecnica, pratiche o consulenza' },
  { id: 'da-definire', label: 'Non so ancora, vorrei un consiglio' },
];
export const consumption = [
  { id: 'meno-100', label: 'Meno di 100 € al mese' },
  { id: '100-200', label: 'Tra 100 € e 200 € al mese' },
  { id: '200-300', label: 'Tra 200 € e 300 € al mese' },
  { id: 'oltre-300', label: 'Oltre 300 € al mese' },
  { id: 'non-so', label: 'Non lo so / da valutare' },
];
const solarSpaces = [
  { id: 'tetto-falda', label: 'Tetto a falda (tegole)' },
  { id: 'tetto-piano', label: 'Tetto piano / lastrico' },
  { id: 'terrazzo', label: 'Terrazzo' },
  { id: 'terreno', label: 'Terreno o area libera' },
];
const otherSpaces = [
  { id: 'interni', label: 'Ambienti interni' },
  { id: 'locale-tecnico', label: 'Locale tecnico' },
  { id: 'esterni', label: 'Spazi esterni' },
  { id: 'impianto-esistente', label: 'Impianto esistente da valutare' },
];
export function spaceOptions(ids) {
  const selected = services.filter(service => ids.includes(service.id));
  const solar = selected.some(service => service.solar);
  const other = !solar || selected.some(service => !service.solar && service.group === 'Impianti');
  return [...(solar ? solarSpaces : []), ...(other ? otherSpaces : []), { id: 'da-valutare', label: 'Altro / da verificare con un sopralluogo' }];
}
export function hasEnergyService(ids) {
  return services.some(service => ids.includes(service.id) && service.energy);
}
export function multipleSpaces(ids) { return ids.length > 1; }
export function labelFor(options, id) { return options.find(option => option.id === id)?.label || ''; }
export function validateQuote(data) {
  const errors = [];
  const checkText = (field, min, max, step, message) => {
    if (typeof data[field] !== 'string' || data[field].trim().length < min || data[field].length > max) errors.push({ step, field, message });
  };
  checkText('name', 2, 120, 0, 'Inserisci il tuo nome (da 2 a 120 caratteri).');
  const ids = Array.isArray(data.services) ? data.services : [];
  if (!ids.length || ids.length > services.length || ids.some(id => !labelFor(services, id))) errors.push({ step: 1, field: 'services', message: 'Seleziona almeno un impianto, un servizio o la consulenza.' });
  if (hasEnergyService(ids)) {
    if (!labelFor(consumption, data.consumption)) errors.push({ step: 2, field: 'consumption', message: 'Indica la spesa mensile oppure scegli “Non lo so”.' });
  } else if (!labelFor(projects, data.project)) errors.push({ step: 2, field: 'project', message: 'Seleziona il tipo di intervento che hai in mente.' });
  if (!Array.isArray(data.spaces) || !data.spaces.length || data.spaces.some(id => !labelFor(spaceOptions(ids), id)) || (!multipleSpaces(ids) && data.spaces.length > 1) || (data.spaces.includes('da-valutare') && data.spaces.length > 1)) errors.push({ step: 3, field: 'spaces', message: 'Indica gli spazi disponibili oppure scegli il sopralluogo.' });
  checkText('city', 2, 120, 4, 'Inserisci il comune dell’intervento (da 2 a 120 caratteri).');
  checkText('notes', 0, 2000, 4, 'La descrizione può contenere al massimo 2.000 caratteri.');
  const email = typeof data.email === 'string' ? data.email.trim() : '';
  const phone = typeof data.phone === 'string' ? data.phone.trim() : '';
  if (!email && !phone) errors.push({ step: 4, field: 'phone', message: 'Inserisci almeno un recapito tra email e telefono.' });
  if (email && (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) errors.push({ step: 4, field: 'email', message: 'Inserisci un indirizzo email valido.' });
  if (phone && (!/^\+?[\d\s().-]+$/.test(phone) || phone.replace(/\D/g, '').length < 7 || phone.replace(/\D/g, '').length > 15)) errors.push({ step: 4, field: 'phone', message: 'Inserisci un numero di telefono valido, con 7–15 cifre.' });
  if (data.privacy !== true) errors.push({ step: 5, field: 'privacy', message: 'Leggi l’informativa privacy e autorizza il ricontatto.' });
  return errors;
}
export function reviewEntries(data) {
  const energy = hasEnergyService(data.services);
  return [
    { field: 'services', label: 'Impianti e servizi', value: data.services.map(id => labelFor(services, id)).join(', '), step: 1 },
    { field: energy ? 'consumption' : 'project', label: energy ? 'Bolletta mensile' : 'Intervento', value: energy ? labelFor(consumption, data.consumption) : labelFor(projects, data.project), step: 2 },
    { field: 'spaces', label: 'Installazione', value: data.spaces.map(id => labelFor(spaceOptions(data.services), id)).join(', '), step: 3 },
    { field: 'contacts', label: 'Contatti e località', value: [data.name, data.phone, data.email, data.city].filter(Boolean).join('\n'), step: 4 },
    ...(data.notes ? [{ field: 'notes', label: 'Dettagli del progetto', value: data.notes, step: 4 }] : []),
  ];
}
export function quoteSummary(data) { return reviewEntries(data).map(({ label, value }) => [label, value]); }
export function quoteText(data) {
  return ['Richiesta di preventivo — Green Flux', '', ...quoteSummary(data).map(([key, value]) => `${key}: ${value}`), '', 'Ho letto l’informativa privacy e autorizzo il ricontatto per questa richiesta.'].join('\n');
}

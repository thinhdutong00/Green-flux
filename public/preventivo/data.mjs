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
export const properties = [
  { id: 'abitazione', label: 'Abitazione singola o appartamento' },
  { id: 'condominio', label: 'Condominio' },
  { id: 'azienda', label: 'Azienda, ufficio o negozio' },
  { id: 'industriale', label: 'Stabilimento industriale' },
  { id: 'agricola', label: 'Struttura agricola o produttiva' },
  { id: 'altro', label: 'Altro immobile / da valutare' },
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
  { id: 'meno-3000', label: 'Meno di 3.000 kWh/anno' },
  { id: '3000-6000', label: '3.000–6.000 kWh/anno' },
  { id: '6000-12000', label: '6.000–12.000 kWh/anno' },
  { id: 'oltre-12000', label: 'Oltre 12.000 kWh/anno' },
];
export const timelines = [
  { id: 'subito', label: 'Il prima possibile' },
  { id: 'un-mese', label: 'Entro 1 mese' },
  { id: 'tre-mesi', label: 'Entro 2–3 mesi' },
  { id: 'valutazione', label: 'Sto valutando con calma' },
];
const solarSpaces = [
  { id: 'tetto-falda', label: 'Tetto a falda' },
  { id: 'tetto-piano', label: 'Tetto piano' },
  { id: 'terreno', label: 'Terreno o area libera' },
  { id: 'copertura-aziendale', label: 'Copertura aziendale' },
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
  return [...(solar ? solarSpaces : []), ...(other ? otherSpaces : []), { id: 'da-valutare', label: 'Da verificare con un sopralluogo' }];
}
export function hasEnergyService(ids) {
  return services.some(service => ids.includes(service.id) && service.energy);
}
export function labelFor(options, id) { return options.find(option => option.id === id)?.label || ''; }
export function validateQuote(data) {
  const errors = [];
  if (!Array.isArray(data.services) || !data.services.length || data.services.some(id => !labelFor(services, id))) errors.push({ step: 0, field: 'services', message: 'Seleziona almeno un impianto, un servizio o la consulenza.' });
  if (!labelFor(properties, data.property)) errors.push({ step: 1, field: 'property', message: 'Seleziona la tipologia di immobile.' });
  if (!labelFor(projects, data.project)) errors.push({ step: 2, field: 'project', message: 'Seleziona il tipo di intervento che hai in mente.' });
  if (data.consumption && !labelFor(consumption, data.consumption)) errors.push({ step: 2, field: 'consumption', message: 'Seleziona una fascia di consumi valida.' });
  if (!Array.isArray(data.spaces) || !data.spaces.length || data.spaces.some(id => !labelFor(spaceOptions(data.services || []), id))) errors.push({ step: 3, field: 'spaces', message: 'Indica almeno uno spazio, oppure scegli il sopralluogo.' });
  if (!labelFor(timelines, data.timeline)) errors.push({ step: 4, field: 'timeline', message: 'Seleziona una tempistica indicativa.' });
  const checkText = (field, min, max, message) => {
    if (typeof data[field] !== 'string' || data[field].trim().length < min || data[field].length > max) errors.push({ step: 5, field, message });
  };
  checkText('name', 2, 120, 'Inserisci il tuo nome e cognome (da 2 a 120 caratteri).');
  checkText('city', 2, 120, 'Inserisci il comune dell’intervento (da 2 a 120 caratteri).');
  checkText('notes', 0, 2000, 'La descrizione può contenere al massimo 2.000 caratteri.');
  const email = typeof data.email === 'string' ? data.email.trim() : '';
  const phone = typeof data.phone === 'string' ? data.phone.trim() : '';
  if (!email && !phone) errors.push({ step: 5, field: 'email', message: 'Inserisci almeno un recapito tra email e telefono.' });
  if (email && (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) errors.push({ step: 5, field: 'email', message: 'Inserisci un indirizzo email valido.' });
  if (phone && (!/^\+?[\d\s().-]+$/.test(phone) || phone.replace(/\D/g, '').length < 7 || phone.replace(/\D/g, '').length > 15)) errors.push({ step: 5, field: 'phone', message: 'Inserisci un numero di telefono valido, con 7–15 cifre.' });
  if (data.privacy !== true) errors.push({ step: 5, field: 'privacy', message: 'Leggi l’informativa privacy e autorizza il ricontatto.' });
  return errors;
}
export function quoteSummary(data) {
  return [
    ['Impianti e servizi', data.services.map(id => labelFor(services, id)).join(', ')],
    ['Immobile', labelFor(properties, data.property)],
    ['Intervento', labelFor(projects, data.project)],
    ...(data.consumption && hasEnergyService(data.services) ? [['Consumi elettrici indicativi', labelFor(consumption, data.consumption)]] : []),
    ['Spazi', data.spaces.map(id => labelFor(spaceOptions(data.services), id)).join(', ')],
    ['Tempistiche', labelFor(timelines, data.timeline)],
  ];
}
export function quoteText(data) {
  return ['Richiesta di preventivo — Green Flux', '', ...quoteSummary(data).map(([key, value]) => `${key}: ${value}`), '', `Nome: ${data.name}`, `Comune: ${data.city}`, `Email: ${data.email || 'Non indicata'}`, `Telefono: ${data.phone || 'Non indicato'}`, ...(data.notes ? ['', `Dettagli: ${data.notes}`] : []), '', 'Ho letto l’informativa privacy e autorizzo il ricontatto per questa richiesta.'].join('\n');
}

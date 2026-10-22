import { propertyTypes, timelines } from './funnel-data.mjs';
import { serviceQuestions } from './questions.mjs';

export const heatPumpSteps = ['Tipologia cliente', 'Il tuo immobile', 'Il tuo riscaldamento', 'Il tuo impianto', 'Le tue esigenze', 'I tuoi dati'];
export const clientOptions = [
  { value: 'Privato', label: 'Privato', description: 'Una pompa di calore per la tua casa.', icon: 'house' },
  { value: 'Azienda', label: 'Azienda', description: 'Un impianto per la tua azienda o un condominio.', icon: 'building' },
  { value: 'Ditta individuale', label: 'Ditta individuale', description: 'Una soluzione per negozi, uffici e attività con partita IVA.', icon: 'store' },
];
const propertyCopy = {
  'Abitazione singola': ['Casa indipendente', 'Una casa singola o a schiera.', 'house'],
  Appartamento: ['Appartamento', 'Un’abitazione in un edificio con più unità.', 'building'],
  Condominio: ['Condominio', 'Un intervento per un impianto condominiale.', 'building'],
  'Azienda o negozio': ['Azienda o negozio', 'Uffici, negozi e spazi per la tua attività.', 'store'],
  'Struttura agricola o produttiva': ['Struttura produttiva', 'Ambienti agricoli, artigianali o industriali.', 'building'],
  'Altro immobile': ['Altro immobile', 'Descrivici gli spazi durante il confronto.', 'house'],
};
export function propertyOptions(clientType) {
  const values = clientType === 'Privato'
    ? ['Abitazione singola', 'Appartamento', 'Condominio', 'Altro immobile']
    : clientType === 'Azienda'
      ? ['Azienda o negozio', 'Struttura agricola o produttiva', 'Condominio', 'Altro immobile']
      : clientType === 'Ditta individuale'
        ? ['Azienda o negozio', 'Abitazione singola', 'Altro immobile'] : [];
  return values.filter(value => propertyTypes.includes(value)).map(value => {
    const [label, description, icon] = propertyCopy[value];
    return { value, label, description, icon };
  });
}
export const heatingOptions = serviceQuestions['pompe-di-calore'][0].options.map(value => ({
  value, label: value, icon: 'heat',
}));
export const distributionOptions = serviceQuestions['pompe-di-calore'][1].options.map(value => ({
  value, label: value, icon: 'radiator',
}));
export const functionOptions = [
  { value: 'Riscaldamento e acqua calda', label: 'Riscaldamento e acqua calda', description: 'Comfort negli ambienti e acqua calda sanitaria.', icon: 'drop' },
  { value: 'Anche raffrescamento', label: 'Anche raffrescamento', description: 'Vorrei valutare una soluzione anche per l’estate.', icon: 'snow' },
  { value: 'Vorrei un consiglio', label: 'Vorrei un consiglio', description: 'Scegliamo le funzioni in base alla casa e all’impianto.', icon: 'advice' },
];
export const areaOptions = ['Fino a 80 m²', '81–120 m²', '121–180 m²', 'Oltre 180 m²', 'Non lo so'];
export const outdoorOptions = ['Giardino o cortile', 'Terrazzo o balcone', 'Altra area esterna', 'Da verificare'];
export { timelines };
const value = (data, name) => String(data.get(name) || '').trim();
export function readHeatPumpRequest(data) {
  return {
    clientType: value(data, 'cliente'), propertyType: value(data, 'immobile'), city: value(data, 'comune'),
    heating: value(data, 'riscaldamento'), distribution: value(data, 'distribuzione'),
    area: value(data, 'superficie'), outdoorSpace: value(data, 'spazio-esterno'),
    functions: value(data, 'funzioni'), timeline: value(data, 'tempistiche'),
    name: value(data, 'nome'), company: value(data, 'azienda'), phone: value(data, 'telefono'),
    email: value(data, 'email'), notes: value(data, 'messaggio'), privacy: data.get('privacy') === 'on',
  };
}
export function validateHeatPumpRequest(data) {
  const errors = [];
  const issue = (step, field, message) => errors.push({ step, field, message });
  if (!clientOptions.some(option => option.value === data.clientType)) issue(0, 'cliente', 'Scegli la tipologia di cliente per continuare.');
  if (typeof data.city !== 'string' || data.city.trim().length < 2 || data.city.length > 120) issue(1, 'comune', 'Inserisci il comune dell’intervento.');
  if (!propertyOptions(data.clientType).some(option => option.value === data.propertyType)) issue(1, 'immobile', 'Scegli il tipo di immobile.');
  if (!heatingOptions.some(option => option.value === data.heating)) issue(2, 'riscaldamento', 'Indica il riscaldamento attuale oppure scegli “Non lo so / da valutare”.');
  if (!distributionOptions.some(option => option.value === data.distribution)) issue(3, 'distribuzione', 'Indica come viene distribuito il calore oppure scegli l’opzione da valutare.');
  if (data.area && !areaOptions.includes(data.area)) issue(3, 'superficie', 'Scegli una superficie tra quelle proposte.');
  if (data.outdoorSpace && !outdoorOptions.includes(data.outdoorSpace)) issue(3, 'spazio-esterno', 'Scegli uno degli spazi proposti.');
  if (!functionOptions.some(option => option.value === data.functions)) issue(4, 'funzioni', 'Scegli le funzioni che vuoi valutare oppure richiedi un consiglio.');
  if (!timelines.includes(data.timeline)) issue(4, 'tempistiche', 'Indica quando vorresti intervenire.');
  if (typeof data.name !== 'string' || data.name.trim().length < 2 || data.name.length > 120) issue(5, 'nome', 'Inserisci nome e cognome (da 2 a 120 caratteri).');
  if (data.clientType !== 'Privato' && (typeof data.company !== 'string' || data.company.trim().length < 2 || data.company.length > 160)) issue(5, 'azienda', 'Inserisci il nome dell’azienda o della ditta.');
  if (typeof data.phone !== 'string' || !/^\+?[\d\s().-]+$/.test(data.phone) || data.phone.replace(/\D/g, '').length < 7 || data.phone.replace(/\D/g, '').length > 15) issue(5, 'telefono', 'Inserisci un numero di telefono valido, con eventuale prefisso internazionale.');
  if (data.email && (typeof data.email !== 'string' || data.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email))) issue(5, 'email', 'Inserisci un indirizzo email valido oppure lascia vuoto il campo.');
  if (typeof data.notes !== 'string' || data.notes.length > 2000) issue(5, 'messaggio', 'Il messaggio può contenere al massimo 2.000 caratteri.');
  if (data.privacy !== true) issue(5, 'privacy', 'Leggi l’informativa privacy e autorizza il ricontatto per questa richiesta.');
  return errors;
}
export function heatPumpSummary(data) {
  const rows = [
    { label: 'Cliente', value: data.clientType, step: 0 },
    { label: 'Immobile', value: [data.city, propertyOptions(data.clientType).find(option => option.value === data.propertyType)?.label].filter(Boolean).join(' · '), step: 1 },
    { label: 'Riscaldamento', value: data.heating, step: 2 },
    { label: 'Distribuzione', value: data.distribution, step: 3 },
    ...(data.area ? [{ label: 'Superficie', value: data.area, step: 3 }] : []),
    ...(data.outdoorSpace ? [{ label: 'Spazio esterno', value: data.outdoorSpace, step: 3 }] : []),
    { label: 'Funzioni', value: data.functions, step: 4 },
    { label: 'Tempistiche', value: data.timeline, step: 4 },
  ];
  return rows.filter(row => row.value);
}
export function heatPumpRequestText(data) {
  const rows = [
    ['Impianto', 'Pompe di calore'], ...heatPumpSummary(data).map(row => [row.label, row.value]),
    ...(data.clientType !== 'Privato' && data.company ? [['Azienda / Ditta', data.company]] : []),
    ['Nome', data.name], ['Telefono / WhatsApp', data.phone], ['Email', data.email || 'Non indicata'],
    ...(data.notes ? [['Dettagli', data.notes]] : []),
  ];
  return ['Richiesta di preventivo — Green Flux', '', ...rows.map(([label, text]) => `${label}: ${text}`), '', 'Ho letto l’informativa privacy e autorizzo il ricontatto per questa richiesta.'].join('\n');
}

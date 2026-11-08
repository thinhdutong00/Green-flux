export const shortHeatingOptions = ['Caldaia a gas o GPL', 'Caldaia a gasolio', 'Stufa o caldaia a legna / pellet', 'Riscaldamento elettrico', 'Pompa di calore', 'Altro', 'Non lo so'];

export function readShortRequest(formData) {
  const value = name => String(formData.get(name) || '').trim();
  return { name: value('nome'), phone: value('telefono'), city: value('comune'), heating: value('riscaldamento'), email: value('email'), privacy: formData.get('privacy') === 'on', website: value('website') };
}

export function validateShortRequest(data) {
  const errors = [];
  const issue = (field, message) => errors.push({ field, message });
  if (typeof data.name !== 'string' || data.name.trim().length < 2 || data.name.length > 120) issue('nome', 'Inserisci nome e cognome, da 2 a 120 caratteri.');
  if (typeof data.phone !== 'string' || !/^\+?[\d\s().-]+$/.test(data.phone) || data.phone.replace(/\D/g, '').length < 7 || data.phone.replace(/\D/g, '').length > 15) issue('telefono', 'Controlla il numero di telefono, incluso il prefisso se necessario.');
  // Comune e riscaldamento sono facoltativi: vengono chiesti al primo contatto telefonico.
  if (typeof data.city !== 'string' || data.city.length > 120 || (data.city.trim() && data.city.trim().length < 2)) issue('comune', 'Controlla il comune oppure lascia vuoto il campo: è facoltativo.');
  if (typeof data.heating !== 'string' || (data.heating && !shortHeatingOptions.includes(data.heating))) issue('riscaldamento', 'Scegli una voce dell’elenco oppure lascia il campo vuoto.');
  if (typeof data.email !== 'string' || data.email.length > 254 || (data.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim()))) issue('email', 'Controlla l’indirizzo email oppure lascia vuoto il campo: è facoltativo.');
  if (data.privacy !== true) issue('privacy', 'Leggi l’informativa e spunta la casella per autorizzarci a ricontattarti.');
  return errors;
}

export function shortRequestText(data) {
  // Keep the existing business-email labels compatible with CRM importers.
  return ['Richiesta di preventivo — Green Flux', '', 'Impianto: Pompe di calore', 'Percorso: Valutazione iniziale · modulo breve', `Nome: ${data.name}`, `Telefono / WhatsApp: ${data.phone}`, `Email: ${data.email || 'Non indicata'}`, `Immobile: ${data.city || 'Da chiedere al telefono'}`, `Riscaldamento: ${data.heating || 'Da chiedere al telefono'}`, '', 'Ho letto l’informativa privacy e autorizzo il ricontatto per questa richiesta.'].join('\n');
}

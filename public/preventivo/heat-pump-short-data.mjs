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
  if (typeof data.city !== 'string' || data.city.trim().length < 2 || data.city.length > 120) issue('comune', 'Scrivi il comune in cui si trova la casa.');
  if (!shortHeatingOptions.includes(data.heating)) issue('riscaldamento', 'Scegli il riscaldamento attuale. Se hai dubbi, seleziona “Non lo so”.');
  if (typeof data.email !== 'string' || data.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) issue('email', 'Inserisci un indirizzo email valido per ricevere la conferma della richiesta.');
  if (data.privacy !== true) issue('privacy', 'Leggi l’informativa e spunta la casella per autorizzarci a ricontattarti.');
  return errors;
}

export function shortRequestText(data) {
  // Keep the existing business-email labels compatible with CRM importers.
  return ['Richiesta di preventivo — Green Flux', '', 'Impianto: Pompe di calore', 'Percorso: Valutazione iniziale · modulo breve', `Nome: ${data.name}`, `Telefono / WhatsApp: ${data.phone}`, `Email: ${data.email || 'Non indicata'}`, `Immobile: ${data.city}`, `Riscaldamento: ${data.heating}`, '', 'Ho letto l’informativa privacy e autorizzo il ricontatto per questa richiesta.'].join('\n');
}

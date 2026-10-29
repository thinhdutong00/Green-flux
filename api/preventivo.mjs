import { validateQuote, quoteText, services } from '../public/preventivo/data.mjs';
import { validateFunnel } from '../public/preventivo/funnel-data.mjs';
import { validateHeatPumpRequest, heatPumpRequestText } from '../public/preventivo/heat-pump-data.mjs';

// Best-effort per-instance throttling. Use Vercel rate-limit rules for a global limit.
const attempts = new Map();
const sendJson = (response, code, payload) => {
  response.setHeader('Cache-Control', 'no-store');
  return response.status(code).json(payload);
};

export default async function handler(request, response) {
  if (request.method === 'GET') return sendJson(response, 200, { available: Boolean(process.env.RESEND_API_KEY && process.env.QUOTE_FROM_EMAIL) });
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'GET, POST');
    return sendJson(response, 405, { message: 'Metodo non consentito.' });
  }
  if (!request.headers['content-type']?.startsWith('application/json')) return sendJson(response, 415, { message: 'Formato della richiesta non valido.' });
  const origin = request.headers.origin;
  if (origin) {
    try {
      if (new URL(origin).host !== request.headers.host) return sendJson(response, 403, { message: 'Origine della richiesta non valida.' });
    } catch { return sendJson(response, 403, { message: 'Origine della richiesta non valida.' }); }
  }
  let data = request.body;
  try { if (typeof data === 'string') data = JSON.parse(data); }
  catch { return sendJson(response, 400, { message: 'La richiesta non è leggibile.' }); }
  if (!data || typeof data !== 'object' || Array.isArray(data) || JSON.stringify(data).length > 10000) return sendJson(response, 400, { message: 'La richiesta non è valida o è troppo lunga.' });
  const kind = data.kind || 'legacy';
  if (!['heat-pump', 'conditional', 'contact', 'legacy'].includes(kind)) return sendJson(response, 400, { message: 'Tipo di richiesta non valido.' });
  const arrayFields = kind === 'legacy' ? ['services', 'spaces'] : kind === 'conditional' ? ['services'] : [];
  const arraysValid = arrayFields.every(key => Array.isArray(data[key]) && data[key].length <= services.length && data[key].every(value => typeof value === 'string' && value.length <= 80));
  const stringFields = kind === 'heat-pump'
    ? ['clientType', 'propertyType', 'city', 'heating', 'distribution', 'area', 'outdoorSpace', 'functions', 'timeline', 'name', 'company', 'phone', 'email', 'notes']
    : kind === 'conditional' ? ['propertyType', 'timeline', 'name', 'email', 'phone', 'city', 'notes']
    : kind === 'contact' ? ['name', 'email', 'phone', 'subject', 'notes']
    : ['project', 'consumption', 'name', 'email', 'phone', 'city', 'notes'];
  const stringsValid = stringFields.every(key => typeof data[key] === 'string');
  if (!arraysValid || !stringsValid) return sendJson(response, 400, { message: 'Controlla i campi del modulo.' });
  if (data.website || !Number.isFinite(data.elapsed) || data.elapsed < 3000) return sendJson(response, 400, { message: 'Attendi qualche secondo e riprova. Se il problema continua, contattaci direttamente.' });
  if (typeof data.requestId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data.requestId)) return sendJson(response, 400, { message: 'Ricarica la pagina e riprova.' });
  if (kind === 'conditional') data.funnel = 'conditional';
  const errors = kind === 'heat-pump' ? validateHeatPumpRequest(data) : kind === 'conditional' ? validateFunnel(data) : kind === 'contact' ? validateContact(data) : validateQuote(data);
  if (errors.length) return sendJson(response, 400, { message: errors[0].message });
  const text = kind === 'heat-pump' ? heatPumpRequestText(data) : kind === 'contact' ? contactText(data) : quoteText(data);

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.QUOTE_FROM_EMAIL;
  if (!apiKey || !from) return sendJson(response, 503, { message: 'L’invio automatico non è ancora disponibile. Puoi inviare il riepilogo usando WhatsApp o email qui sotto.' });

  const now = Date.now();
  for (const [key, entry] of attempts) if (entry.expires < now) attempts.delete(key);
  const ip = String(request.headers['x-real-ip'] || request.headers['x-forwarded-for'] || request.socket?.remoteAddress || 'unknown').split(',')[0].trim();
  const entry = attempts.get(ip) || { count: 0, expires: now + 600000 };
  if (entry.count >= 5) {
    response.setHeader('Retry-After', String(Math.ceil((entry.expires - now) / 1000)));
    return sendJson(response, 429, { message: 'Hai effettuato diversi tentativi. Attendi qualche minuto oppure contattaci direttamente.' });
  }
  entry.count += 1;
  if (attempts.size >= 2000) attempts.delete(attempts.keys().next().value);
  attempts.set(ip, entry);

  try {
    const result = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'Idempotency-Key': `greenflux-${data.requestId}` },
      body: JSON.stringify({
        from,
        to: ['info@green-flux.com'],
        ...(data.email.trim() ? { reply_to: data.email.trim() } : {}),
        subject: kind === 'contact' ? 'Nuova richiesta di contatto — Green Flux' : 'Nuova richiesta di preventivo — Green Flux',
        text,
      }),
      signal: AbortSignal.timeout(10000),
    });
    const receipt = await result.json().catch(() => null);
    if (!result.ok || !receipt?.id) return sendJson(response, 502, { message: 'Non abbiamo ricevuto conferma dell’invio. I dati sono ancora nel modulo: riprova oppure usa i contatti qui sotto.' });
    return sendJson(response, 200, { accepted: true, receipt: { id: data.requestId, kind } });
  } catch {
    return sendJson(response, 502, { message: 'La conferma dell’invio non è arrivata. Puoi riprovare o inviare il riepilogo tramite i contatti qui sotto.' });
  }
}

function validateContact(data) {
  const errors = [];
  const issue = message => errors.push({ message });
  if (data.name.trim().length < 2 || data.name.length > 120) issue('Inserisci nome e cognome (da 2 a 120 caratteri).');
  if (!data.email.trim() && !data.phone.trim()) issue('Inserisci almeno un recapito tra email e telefono.');
  if (data.email && (data.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim()))) issue('Inserisci un indirizzo email valido.');
  if (data.phone && (!/^\+?[\d\s().-]+$/.test(data.phone) || data.phone.replace(/\D/g, '').length < 7 || data.phone.replace(/\D/g, '').length > 15)) issue('Inserisci un numero di telefono valido.');
  if (!['Richiesta Preventivo', 'Richiesta Informazioni', 'Consulenza sul progetto', 'Altro'].includes(data.subject)) issue('Scegli un oggetto tra quelli proposti.');
  if (!data.notes.trim() || data.notes.length > 5000) issue('Inserisci un messaggio di massimo 5.000 caratteri.');
  if (data.privacy !== true) issue('Leggi l’informativa privacy e autorizza il ricontatto.');
  return errors;
}
function contactText(data) {
  return ['Richiesta di contatto — Green Flux', '', `Nome: ${data.name}`, `Email: ${data.email || 'Non indicata'}`, `Telefono: ${data.phone || 'Non indicato'}`, `Oggetto: ${data.subject}`, `Messaggio: ${data.notes}`, '', 'Ho letto l’informativa privacy e autorizzo il ricontatto per questa richiesta.'].join('\n');
}

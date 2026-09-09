import { validateQuote, quoteText } from '../public/preventivo/data.mjs';

// Best-effort per-instance throttling. Use Vercel rate-limit rules for a global limit.
const attempts = new Map();
const sendJson = (response, code, payload) => {
  response.setHeader('Cache-Control', 'no-store');
  return response.status(code).json(payload);
};

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
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
  const arraysValid = ['services', 'spaces'].every(key => Array.isArray(data[key]) && data[key].length <= 16 && data[key].every(value => typeof value === 'string' && value.length <= 80));
  const stringsValid = ['property', 'project', 'consumption', 'timeline', 'name', 'email', 'phone', 'city', 'notes'].every(key => typeof data[key] === 'string');
  if (!arraysValid || !stringsValid) return sendJson(response, 400, { message: 'Controlla i campi del modulo.' });
  if (data.website || !Number.isFinite(data.elapsed) || data.elapsed < 3000) return sendJson(response, 400, { message: 'Attendi qualche secondo e riprova. Se il problema continua, contattaci direttamente.' });
  if (typeof data.requestId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data.requestId)) return sendJson(response, 400, { message: 'Ricarica la pagina e riprova.' });
  const errors = validateQuote(data);
  if (errors.length) return sendJson(response, 400, { message: errors[0].message });

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
        subject: 'Nuova richiesta di preventivo — Green Flux',
        text: quoteText(data),
      }),
      signal: AbortSignal.timeout(10000),
    });
    const receipt = await result.json().catch(() => null);
    if (!result.ok || !receipt?.id) return sendJson(response, 502, { message: 'Non abbiamo ricevuto conferma dell’invio. I dati sono ancora nel modulo: riprova oppure usa i contatti qui sotto.' });
    return sendJson(response, 200, { accepted: true });
  } catch {
    return sendJson(response, 502, { message: 'La conferma dell’invio non è arrivata. Puoi riprovare o inviare il riepilogo tramite i contatti qui sotto.' });
  }
}

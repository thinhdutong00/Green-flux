export const thankYouPath = '/thank-you/';

// Keep the same key when a visitor retries the same request after a timeout.
export function createRequestSender(kind, { fetchRequest = (...args) => fetch(...args), now = Date.now, createId = () => crypto.randomUUID() } = {}) {
  const started = now();
  let previousPayload, requestId;
  return async data => {
    const payload = JSON.stringify({ ...data, kind });
    if (payload !== previousPayload) { previousPayload = payload; requestId = createId(); }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetchRequest('/api/preventivo', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, cache: 'no-store',
        body: JSON.stringify({ ...data, kind, website: '', elapsed: now() - started, requestId }), signal: controller.signal,
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || result?.accepted !== true) throw new Error(result?.message || 'L’invio non è stato confermato. I dati sono ancora nel modulo: riprova oppure usa email o WhatsApp.');
      return result;
    } catch (error) {
      if (error.name === 'AbortError') throw new Error('La conferma dell’invio non è arrivata in tempo. I dati sono ancora nel modulo: puoi riprovare.');
      throw error;
    } finally { clearTimeout(timeout); }
  };
}

export async function submitAndRedirect(sender, data, browser = window) {
  const result = await sender(data);
  if (result?.accepted !== true) throw new Error('L’invio della richiesta non è stato confermato.');
  // The landing quiz lives in a same-origin iframe: navigate the whole page.
  let destination = browser;
  try { if (browser.parent !== browser && browser.parent.location.origin === browser.location.origin) destination = browser.parent; } catch { /* Cross-origin embeds keep navigation inside the frame. */ }
  destination.location.assign(thankYouPath);
}

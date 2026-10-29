import { clearConversionReceipt, saveConversionReceipt } from './conversion-receipt.mjs';

export const thankYouPath = '/thank-you/';
export const pendingRequestKey = 'green-flux:pending-request';
export const pendingRequestLifetime = 15 * 60 * 1000;

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

export function clearPendingRequest(browser) {
  try { browser.sessionStorage.removeItem(pendingRequestKey); } catch { /* Storage can be disabled. */ }
}

export function readPendingRequest(browser, now = Date.now()) {
  try {
    const draft = JSON.parse(browser.sessionStorage.getItem(pendingRequestKey));
    if (draft?.version === 1 && typeof draft.text === 'string' && draft.text.length > 0 && draft.text.length <= 30000 && Number.isFinite(draft.expiresAt) && draft.expiresAt > now && draft.expiresAt <= now + pendingRequestLifetime) return draft;
  } catch { /* Missing, expired or blocked storage uses the direct-contact links. */ }
  clearPendingRequest(browser);
  return null;
}

export async function submitAndRedirect(sender, data, { requestText = '', browser = window } = {}) {
  let accepted = false;
  let receipt;
  try { const result = await sender(data); accepted = result?.accepted === true; receipt = result?.receipt; } catch { /* Continue on the thank-you page with the prepared request. */ }
  // The landing quiz lives in a same-origin iframe: navigate the whole page.
  let destination = browser;
  try { if (browser.parent !== browser && browser.parent.location.origin === browser.location.origin) destination = browser.parent; } catch { /* Cross-origin embeds keep navigation inside the frame. */ }
  clearPendingRequest(destination);
  clearConversionReceipt(destination);
  if (accepted) saveConversionReceipt(destination, receipt);
  if (!accepted && requestText) {
    try { destination.sessionStorage.setItem(pendingRequestKey, JSON.stringify({ version: 1, text: requestText, expiresAt: Date.now() + pendingRequestLifetime })); } catch { /* Navigation still works when browser storage is disabled. */ }
  }
  destination.location.assign(thankYouPath + (accepted ? '' : '#completa-invio'));
  return { accepted };
}

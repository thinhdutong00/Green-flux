import { clearConversionReceipt, saveConversionReceipt } from './conversion-receipt.mjs';
import { saveSubmissionStatus } from './submission-status.mjs';
import { captureAttribution } from './lead-attribution.mjs';

export const thankYouPath = '/thank-you/';
export const pendingRequestKey = 'green-flux:pending-request';
export const pendingRequestLifetime = 15 * 60 * 1000;
export const deliveryKey = 'green-flux:delivery-key:v1';

async function persistentRequestId(browser, payload, createId, now) {
  if (!browser) return createId();
  try {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(payload));
    const fingerprint = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
    const stored = JSON.parse(browser.sessionStorage.getItem(deliveryKey));
    if (stored?.fingerprint === fingerprint && /^[0-9a-f-]{36}$/i.test(stored.id) && stored.expiresAt > now && stored.expiresAt <= now + pendingRequestLifetime) return stored.id;
    const id = createId();
    browser.sessionStorage.setItem(deliveryKey, JSON.stringify({ fingerprint, id, expiresAt: now + pendingRequestLifetime }));
    return id;
  } catch { return createId(); }
}

// Keep the same key when a visitor retries the same request after a timeout.
export function createRequestSender(kind, { fetchRequest = (...args) => fetch(...args), now = Date.now, createId = () => crypto.randomUUID(), browser = typeof window === 'undefined' ? null : window } = {}) {
  const started = now();
  let previousPayload, requestId;
  return async data => {
    const payload = JSON.stringify({ ...data, kind });
    if (payload !== previousPayload) { previousPayload = payload; requestId = await persistentRequestId(browser, payload, createId, now()); }
    const attribution = captureAttribution(browser, now());
    // The server derives the channel; do not duplicate derived campaign/evidence text.
    const context = { consent: attribution?.consent === true, entryPage: attribution?.entryPage, submissionPage: attribution?.submissionPage, ...(attribution?.consent === true ? { params: attribution.params, referrer: attribution.referrer, directEntry: attribution.directEntry } : {}) };
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45000);
    try {
      const response = await fetchRequest('/api/preventivo', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, cache: 'no-store',
        body: JSON.stringify({ ...data, kind, attribution: context, website: data.website || '', elapsed: now() - started, requestId }), signal: controller.signal,
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || result?.accepted !== true) {
        const error = new Error(result?.message || 'L’invio non è stato confermato. I dati sono ancora nel modulo: riprova oppure usa email o WhatsApp.');
        error.category = response.status === 429 ? 'rate_limit' : response.status === 503 ? 'unavailable' : response.status === 400 ? 'validation' : 'delivery';
        throw error;
      }
      return result;
    } catch (error) {
      if (error.name === 'AbortError') {
        const timeoutError = new Error('La conferma dell’invio non è arrivata in tempo. I dati sono ancora nel modulo: puoi riprovare.');
        timeoutError.category = 'network_or_timeout';
        throw timeoutError;
      }
      if (error instanceof TypeError) {
        const networkError = new Error('Non riusciamo a collegarci. Controlla la connessione e riprova: i dati sono ancora nel modulo. Puoi anche chiamarci al +39 375 552 1420.');
        networkError.category = 'network_or_timeout';
        throw networkError;
      }
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

export async function submitAndRedirect(sender, data, { requestText = '', browser = window, redirectOnError = true, onAccepted } = {}) {
  let accepted = false;
  let receipt;
  try { const result = await sender(data); accepted = result?.accepted === true; receipt = result?.receipt; }
  catch (error) { if (!redirectOnError) throw error; }
  if (!accepted && !redirectOnError) throw new Error('L’invio non è stato confermato. Riprova o chiamaci.');
  // The landing quiz lives in a same-origin iframe: navigate the whole page.
  let destination = browser;
  try { if (browser.parent !== browser && browser.parent.location.origin === browser.location.origin) destination = browser.parent; } catch { /* Cross-origin embeds keep navigation inside the frame. */ }
  clearPendingRequest(destination);
  clearConversionReceipt(destination);
  if (accepted) saveSubmissionStatus(destination, receipt?.kind || data.kind || 'legacy');
  // The receipt is kept for 15 minutes; the conversion is sent only if advertising consent is (or becomes) granted.
  if (accepted) saveConversionReceipt(destination, receipt);
  if (!accepted && requestText) {
    try { destination.sessionStorage.setItem(pendingRequestKey, JSON.stringify({ version: 1, text: requestText, expiresAt: Date.now() + pendingRequestLifetime })); } catch { /* Navigation still works when browser storage is disabled. */ }
  }
  if (accepted) { try { onAccepted?.(); } catch { /* Optional diagnostics must never interrupt a confirmed submission. */ } }
  destination.location.assign(thankYouPath + (accepted ? '' : '#completa-invio'));
  return { accepted };
}

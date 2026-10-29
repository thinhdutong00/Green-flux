export const conversionReceiptKey = 'green-flux:confirmed-request';
export const conversionReceiptLifetime = 15 * 60 * 1000;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function clearConversionReceipt(browser) {
  try { browser.sessionStorage.removeItem(conversionReceiptKey); } catch { /* Optional measurement never blocks a request. */ }
}

export function saveConversionReceipt(browser, receipt, now = Date.now()) {
  clearConversionReceipt(browser);
  if (receipt?.kind !== 'heat-pump' || !uuid.test(receipt.id)) return false;
  try {
    browser.sessionStorage.setItem(conversionReceiptKey, JSON.stringify({ version: 1, id: receipt.id, kind: receipt.kind, expiresAt: now + conversionReceiptLifetime, sent: false }));
    return true;
  } catch { return false; }
}

export function readConversionReceipt(browser, now = Date.now()) {
  try {
    const receipt = JSON.parse(browser.sessionStorage.getItem(conversionReceiptKey));
    if (receipt?.version === 1 && receipt.kind === 'heat-pump' && uuid.test(receipt.id) && receipt.expiresAt > now && receipt.expiresAt <= now + conversionReceiptLifetime && typeof receipt.sent === 'boolean') return receipt;
  } catch { /* Missing or blocked storage is not a conversion. */ }
  clearConversionReceipt(browser);
  return null;
}

export function recordConfirmedConversion(browser, sendEvent, now = Date.now()) {
  if (browser.location.pathname !== '/thank-you/' || browser.location.hash === '#completa-invio') return false;
  const receipt = readConversionReceipt(browser, now);
  if (!receipt || receipt.sent) return false;
  sendEvent(receipt.id);
  try { browser.sessionStorage.setItem(conversionReceiptKey, JSON.stringify({ ...receipt, sent: true })); } catch { /* Google also deduplicates the transaction id. */ }
  return true;
}

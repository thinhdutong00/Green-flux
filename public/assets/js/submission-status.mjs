const key = 'green-flux:submission-status:v1';
const lifetime = 15 * 60 * 1000;

// Essential, short-lived UI state. Contains no contact data and is independent
// of the optional advertising receipt, so refusing cookies still shows success.
export function saveSubmissionStatus(browser, kind, now = Date.now()) {
  try { browser.sessionStorage.setItem(key, JSON.stringify({ kind, expiresAt: now + lifetime })); } catch { /* Contact delivery does not require storage. */ }
}
export function readSubmissionStatus(browser, now = Date.now()) {
  try {
    const status = JSON.parse(browser.sessionStorage.getItem(key));
    if (status && ['site-visit', 'heat-pump', 'heat-pump-short', 'contact', 'conditional', 'legacy'].includes(status.kind) && status.expiresAt > now && status.expiresAt <= now + lifetime) return status;
    browser.sessionStorage.removeItem(key);
  } catch { /* No receipt is not proof of delivery. */ }
  return null;
}

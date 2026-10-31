// Clarity is separate from Google Ads: a previous Ads choice is never analytics consent.
export const CLARITY_CONSENT_KEY = 'gf-clarity-consent-v1';
export const CLARITY_CONSENT_EVENT = 'gf-clarity-preference';
const LIFETIME = 180 * 24 * 60 * 60 * 1000;
const HOSTS = new Set(["green-flux.com", "www.green-flux.com"]);
const PATHS = new Set(["/servizi/pompe-calore"]);
const initialized = new WeakSet();

export function isClarityLanding(browser = window) {
  return browser.top === browser && browser.location.protocol === 'https:'
    && HOSTS.has(browser.location.hostname)
    && PATHS.has(browser.location.pathname.replace(/\/$/, ''));
}

export function readClarityConsent(browser = window, now = Date.now()) {
  try {
    const choice = JSON.parse(browser.localStorage.getItem(CLARITY_CONSENT_KEY));
    if (choice?.version === 1 && typeof choice.analytics === 'boolean'
      && choice.expiresAt > now && choice.expiresAt <= now + LIFETIME) return choice.analytics;
  } catch { /* Storage failures must not interrupt the site or imply consent. */ }
  return null;
}

export function saveClarityConsent(analytics, browser = window, doc = document, now = Date.now()) {
  try {
    browser.localStorage.setItem(CLARITY_CONSENT_KEY, JSON.stringify({
      version: 1, analytics: analytics === true, expiresAt: now + LIFETIME,
    }));
  } catch { /* A choice still applies to this page when storage is blocked. */ }
  doc.dispatchEvent(new browser.CustomEvent(CLARITY_CONSENT_EVENT, { detail: { analytics: analytics === true } }));
}

export function initClarity(projectId, browser = window, doc = document) {
  if (!/^[a-z0-9]+$/.test(projectId || '') || !isClarityLanding(browser) || initialized.has(doc)) return;
  initialized.add(doc);
  let script, stopped = false;
  const state = status => { doc.documentElement.dataset.clarityStatus = status; };
  const consent = granted => browser.clarity?.('consentv2', {
    ad_Storage: 'denied', analytics_Storage: granted ? 'granted' : 'denied',
  });
  function clearCookies() {
    for (const name of ['_clck', '_clsk']) {
      for (const domain of ['', browser.location.hostname, '.' + browser.location.hostname.replace(/^www\./, '')]) {
        doc.cookie = name + '=; Max-Age=0; Path=/; SameSite=Lax; Secure' + (domain ? '; Domain=' + domain : '');
      }
    }
  }
  function apply(granted) {
    if (granted !== true) {
      if (script) {
        // End collection as well as cookies; do not leave cookieless recording running.
        consent(false);
        browser.clarity?.('stop');
        stopped = true;
        state('stopped');
      } else state('off');
      clearCookies();
      return;
    }
    // After a revocation, a fresh page load is required to start a new recording.
    // Never reload a page automatically: a visitor may be completing a form.
    if (stopped) return;
    if (script) { consent(true); return; }
    // Explicitly mask forms, dialogs, and their descendants before loading Clarity.
    // No form values, quiz answers, custom identifiers, or contact details are sent by this integration.
    doc.querySelectorAll('form, dialog, [data-clarity-private]').forEach(node => node.setAttribute('data-clarity-mask', 'true'));
    browser.clarity = browser.clarity || function () { (browser.clarity.q = browser.clarity.q || []).push(arguments); };
    consent(true);
    script = doc.createElement('script');
    script.async = true;
    script.src = 'https://www.clarity.ms/tag/' + projectId;
    script.dataset.clarityProject = projectId;
    script.addEventListener('load', () => {
      if (!stopped) { consent(true); state('ready'); }
    });
    script.addEventListener('error', () => {
      if (!stopped) state('blocked');
      script.remove();
      script = undefined;
    });
    state('loading');
    doc.head.append(script);
  }
  doc.addEventListener(CLARITY_CONSENT_EVENT, event => apply(event.detail?.analytics === true));
  browser.addEventListener('storage', event => {
    if (event.key === CLARITY_CONSENT_KEY || event.key === null) apply(readClarityConsent(browser));
  });
  apply(readClarityConsent(browser));
}

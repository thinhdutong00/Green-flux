import { readAdsConsent } from './ads-consent.mjs';

const key = 'green-flux:lead-attribution:v1';
const lifetime = 30 * 60 * 1000;
const campaignFields = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'gclid', 'gbraid', 'wbraid'];
const clean = value => typeof value === 'string' ? value.replace(/[\r\n\u0000-\u001f]/g, '').slice(0, 250) : '';
const page = value => { try { const url = new URL(value); return /^https?:$/.test(url.protocol) ? url.origin + url.pathname : ''; } catch { return ''; } };
const referrerOrigin = value => { try { const url = new URL(value); return /^https?:$/.test(url.protocol) ? url.origin : ''; } catch { return ''; } };

export function collectAttribution(browser = window, doc = document, now = Date.now()) {
  let top = browser;
  try { if (browser.parent && browser.parent.location.origin === browser.location.origin) top = browser.parent; } catch { /* Cross-origin embeds use their own page. */ }
  const consent = readAdsConsent(top) === true;
  let first;
  try { first = JSON.parse(top.sessionStorage.getItem(key)); } catch { /* Storage is optional. */ }
  if (!first || first.expiresAt <= now || first.expiresAt > now + lifetime) first = null;
  const current = { landingPage: page(top.location.href), referrer: referrerOrigin(top.document?.referrer || doc.referrer || '') };
  const result = { ...(first || current), formPage: page(browser.location.href), adsConsent: consent };
  delete result.expiresAt;
  const params = new URLSearchParams(top.location.search || '');
  for (const field of campaignFields) {
    if (!consent) delete result[field];
    else if (!result[field] && params.has(field)) result[field] = clean(params.get(field));
  }
  // Persist marketing attribution only after advertising consent. Page paths and
  // referrer origin sent with the request never include arbitrary query strings.
  try {
    if (consent) top.sessionStorage.setItem(key, JSON.stringify({ ...result, expiresAt: first?.expiresAt || now + lifetime }));
    else top.sessionStorage.removeItem(key);
  } catch { /* A blocked store must never block a contact request. */ }
  return result;
}

export function normalizeAttribution(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const result = { landingPage: page(value.landingPage), formPage: page(value.formPage), referrer: referrerOrigin(value.referrer), adsConsent: value.adsConsent === true };
  if (result.adsConsent) for (const field of campaignFields) if (clean(value[field])) result[field] = clean(value[field]);
  return result;
}

export function attributionText(input) {
  const data = normalizeAttribution(input);
  const googlePaid = data.gclid || data.gbraid || data.wbraid || (data.utm_source?.toLowerCase() === 'google' && /^(cpc|ppc|paidsearch)$/i.test(data.utm_medium || ''));
  const source = googlePaid ? 'Google Ads' : data.utm_source ? `UTM: ${data.utm_source} / ${data.utm_medium || 'mezzo non indicato'}` : data.referrer && !/^https:\/\/(www\.)?green-flux\.com$/.test(data.referrer) ? `Referral: ${data.referrer}` : 'Non rilevata';
  return ['Provenienza: ' + source, ...(data.landingPage ? ['Pagina di ingresso: ' + data.landingPage] : []), ...(data.formPage ? ['Pagina di invio: ' + data.formPage] : []), ...campaignFields.filter(field => data[field]).map(field => `${field === 'utm_term' ? 'utm_term (parola chiave, non query cercata)' : field}: ${data[field]}`)].join('\n');
}

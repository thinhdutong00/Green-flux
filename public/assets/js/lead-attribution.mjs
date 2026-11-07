import { readAdsConsent } from './ads-consent.mjs';

export const attributionKey = 'green-flux:lead-attribution:v1';
export const attributionLifetime = 30 * 60 * 1000;
const hosts = new Set(['green-flux.com', 'www.green-flux.com']);
const googleHost = host => /(^|\.)google\.(com|it|fr|de|es|pt|nl|be|ch|at|ie|co\.uk|co\.in|com\.au|ca|co\.jp|pl|ro|se|dk|no|fi|gr|cz)$/.test(host);
const parameterNames = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_id', 'utm_content', 'utm_term', 'campaignid', 'adgroupid', 'creative', 'gclid', 'gbraid', 'wbraid', 'gad_source', 'gad_campaignid'];
const clean = value => typeof value === 'string' && /^[\p{L}\p{N} _.:|/\-]{1,200}$/u.test(value) ? value : '';
export function pagePath(value) {
  if (typeof value !== 'string' || !value.trim()) return '';
  try {
    const url = new URL(value, 'https://green-flux.com');
    return hosts.has(url.hostname) && url.protocol === 'https:' ? url.pathname.slice(0, 200) : '';
  } catch { return ''; }
}
export function trackingParameters(value) {
  const result = {};
  for (const name of parameterNames) {
    const token = clean(value?.[name]);
    if (name.startsWith('gad_') && !/^[1-9]\d{0,19}$/.test(token)) continue;
    if (token && (!['gclid', 'gbraid', 'wbraid'].includes(name) || /^[A-Za-z0-9_-]+$/.test(token))) result[name] = token;
  }
  return result;
}
export function referrerEvidence(value) {
  try {
    const url = new URL(value);
    if (!['https:', 'http:'].includes(url.protocol) || hosts.has(url.hostname)) return '';
    // Never copy search terms, query strings, fragments, or arbitrary external paths.
    const path = googleHost(url.hostname) && /^\/(maps|search)(\/|$)/.test(url.pathname) ? url.pathname.split('/').slice(0, 2).join('/') : '';
    return `${url.origin}${path}`;
  } catch { return ''; }
}
export function normalizeAttribution(input) {
  const base = { entryPage: pagePath(input?.entryPage), submissionPage: pagePath(input?.submissionPage) };
  if (input?.consent !== true) return { ...base, consent: false, source: 'Non rilevata', campaign: '', evidence: 'Consenso alla misurazione assente: dati di acquisizione non raccolti.' };
  const params = trackingParameters(input.params);
  const referrer = referrerEvidence(input.referrer);
  const refUrl = referrer ? new URL(referrer) : null;
  const source = (params.utm_source || '').toLowerCase();
  const medium = (params.utm_medium || '').toLowerCase();
  const google = /^(google|googleads|google_ads|adwords)$/.test(source);
  const paid = /^(cpc|ppc|paidsearch|paid_search|paid)$/.test(medium);
  const maps = /^(google_maps|googlemaps|maps|gmb|gbp|google_business_profile)$/.test(source) || (google && /^(maps|gmb|gbp)$/.test(medium)) || (refUrl && googleHost(refUrl.hostname) && (refUrl.hostname.startsWith('maps.') || refUrl.pathname === '/maps'));
  const social = /^(facebook|instagram|linkedin|tiktok|youtube|pinterest|twitter|x|meta)$/.test(source) || /^(social|paid_social|social_paid|social-organic)$/.test(medium) || /https?:\/\/(?:[^/]+\.)?(facebook\.com|instagram\.com|linkedin\.com|tiktok\.com|youtube\.com|youtu\.be|pinterest\.[a-z.]+|twitter\.com|x\.com|t\.co)$/.test(referrer);
  let provenance = 'Non rilevata';
  if (params.gclid || params.gbraid || params.wbraid || params.gad_source || params.gad_campaignid || (google && paid)) provenance = 'Google Ads';
  else if (maps) provenance = 'Google Maps';
  else if (google && medium === 'organic') provenance = 'Google organico';
  else if (social) provenance = 'Social';
  else if (source || medium) provenance = 'Altre fonti';
  else if (referrer) {
    // A Google origin alone cannot distinguish an untagged ad from SEO.
    if (googleHost(refUrl.hostname) && refUrl.pathname === '/search') provenance = 'Google organico';
    else if (!googleHost(refUrl.hostname)) provenance = 'Referral';
  } else if (input.directEntry === true && input.entryPage) provenance = 'Diretto';
  const campaignIds = [...new Set([params.utm_id, params.campaignid, params.gad_campaignid].filter(Boolean))];
  const campaign = [params.utm_campaign, ...campaignIds.map(id => `Campagna ID: ${id}`), params.adgroupid && `Gruppo ID: ${params.adgroupid}`, params.creative && `Annuncio ID: ${params.creative}`, ...['gclid', 'gbraid', 'wbraid'].filter(key => params[key]).map(key => `${key.toUpperCase()}: ${params[key]}`)].filter(Boolean).join(' | ');
  const evidence = [Object.entries(params).map(([key, value]) => `${key}=${value}`).join('; '), referrer && `Referrer: ${referrer}`, input.directEntry === true && !referrer && !Object.keys(params).length && 'Ingresso senza referrer o parametri (può includere link non tracciati).', provenance === 'Non rilevata' && 'Evidenze insufficienti per distinguere il canale.'].filter(Boolean).join(' | ');
  return { ...base, consent: true, params, referrer, directEntry: input.directEntry === true, source: provenance, campaign, evidence };
}

function topBrowser(browser) {
  try { if (browser.parent !== browser && browser.parent.location.origin === browser.location.origin) return browser.parent; } catch { /* Cross-origin embeds cannot access their parent. */ }
  return browser;
}
export function captureAttribution(browser, now = Date.now()) {
  if (!browser?.location) return { consent: false };
  const root = topBrowser(browser);
  if (readAdsConsent(root, now) !== true) {
    try { root.sessionStorage.removeItem(attributionKey); } catch { /* Consent never depends on storage. */ }
    return { consent: false, submissionPage: pagePath(browser.location.href || browser.location.pathname) };
  }
  let saved;
  try { saved = JSON.parse(root.sessionStorage.getItem(attributionKey)); } catch { /* Optional storage. */ }
  const current = new URL(root.location.href || root.location.pathname, root.location.origin);
  const rawReferrer = root.document?.referrer || '';
  let taggedPage = current;
  let params = trackingParameters(Object.fromEntries(current.searchParams));
  // On a first consented visit to the form, the referring site page can
  // still carry the original ad tags. Never revive an expired stored visit.
  if (!saved && !Object.keys(params).length && pagePath(rawReferrer)) {
    const previous = new URL(rawReferrer, current);
    if (previous.origin === current.origin) {
      const previousParams = trackingParameters(Object.fromEntries(previous.searchParams));
      if (Object.keys(previousParams).length) {
        taggedPage = previous;
        params = previousParams;
      }
    }
  }
  const hasCampaign = Object.keys(params).length > 0;
  const campaignUrl = taggedPage.pathname + JSON.stringify(params);
  const forwardedTags = pagePath(rawReferrer) && JSON.stringify(saved?.params) === JSON.stringify(params);
  if (!saved || saved.version !== 1 || saved.expiresAt <= now || saved.expiresAt > now + attributionLifetime || hasCampaign && saved.campaignUrl !== campaignUrl && !forwardedTags) {
    saved = { version: 1, consent: true, params, entryPage: pagePath(taggedPage.href), referrer: referrerEvidence(rawReferrer), directEntry: !rawReferrer, expiresAt: now + attributionLifetime };
    // The comparison key contains only allowlisted tracking values, never arbitrary query data.
    saved.campaignUrl = campaignUrl;
    try { root.sessionStorage.setItem(attributionKey, JSON.stringify(saved)); } catch { /* Same-page attribution still works. */ }
  }
  return { ...normalizeAttribution(saved), submissionPage: pagePath(browser.location.href || browser.location.pathname) };
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  captureAttribution(window);
  window.addEventListener('greenflux:ads-consent', () => captureAttribution(window));
  window.addEventListener('storage', () => captureAttribution(window));
}

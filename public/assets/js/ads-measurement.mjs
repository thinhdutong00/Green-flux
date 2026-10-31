import { readAdsConsent, saveAdsConsent, consentSettings, adsConsentKey } from './ads-consent.mjs';
import { recordConfirmedConversion } from './conversion-receipt.mjs';
import { initClarity, isClarityLanding, readClarityConsent, saveClarityConsent, CLARITY_CONSENT_KEY } from './clarity.mjs';

const googleAdsId = 'AW-18501721820';
const heatPumpConversion = 'AW-18501721820/c3AoCIbZsq0dENy9p_ZE';

// The quiz is embedded in the landing: only its top-level page loads Google.
// Preview deployments and local tests never send advertising measurements.
if (window.top === window) {
  const production = ['green-flux.com', 'www.green-flux.com'].includes(location.hostname);
  let consent = readAdsConsent(window);
  let analyticsConsent = readClarityConsent(window);
  const needsChoice = () => consent === null || (isClarityLanding(window) && analyticsConsent === null);
  let tagReady = false;
  let tagLoading = false;
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
  window.gtag('consent', 'default', consentSettings(false));
  window.gtag('set', 'ads_data_redaction', true);

  function measureRequest() {
    if (!production || consent !== true || !tagReady) return;
    recordConfirmedConversion(window, id => {
      window.gtag('event', 'conversion', {
        send_to: heatPumpConversion,
        transaction_id: id,
        value: 0,
        currency: 'EUR',
      });
    });
  }

  function loadGoogleTag() {
    if (!production || tagLoading || tagReady || consent !== true) return;
    tagLoading = true;
    window.gtag('js', new Date());
    window.gtag('config', googleAdsId, { allow_ad_personalization_signals: false });
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${googleAdsId}`;
    script.dataset.gfAdsTag = 'loading';
    script.addEventListener('load', () => {
      tagLoading = false;
      tagReady = true;
      script.dataset.gfAdsTag = 'ready';
      measureRequest();
    });
    script.addEventListener('error', () => {
      tagLoading = false;
      script.remove();
    });
    document.head.append(script);
  }

  function removeAdvertisingCookies() {
    for (const item of document.cookie.split(';')) {
      const name = item.split('=')[0].trim();
      if (!name.startsWith('_gcl_')) continue;
      for (const domain of ['', location.hostname, '.green-flux.com']) {
        document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Lax; Secure${domain ? `; Domain=${domain}` : ''}`;
      }
    }
  }

  const banner = document.createElement('section');
  banner.className = 'gf-consent';
  banner.setAttribute('role', 'region');
  banner.setAttribute('aria-label', 'Preferenze cookie');
  banner.innerHTML = '<h2>Le tue preferenze cookie</h2><p>Con il tuo consenso usiamo Google Ads per misurare i risultati degli annunci e Microsoft Clarity per capire come viene usata la landing pompe di calore, con mappe di calore e registrazioni delle interazioni. I dati compilati nei moduli sono mascherati. Puoi rifiutare e usare comunque il sito e il modulo.</p><p><a href="/cookie-policy/">Informativa cookie</a> · <a href="/privacy-policy/">Privacy</a></p><div class="gf-consent-settings" data-consent-settings hidden><label><input type="checkbox" data-consent-ads> Efficacia degli annunci (Google Ads)</label><label><input type="checkbox" data-consent-analytics> Analisi della navigazione (Microsoft Clarity)</label><button type="button" data-consent-save>Salva le preferenze</button></div><div class="gf-consent-actions"><button type="button" data-consent-reject>Rifiuta</button><button type="button" data-consent-manage aria-expanded="false">Preferenze</button><button type="button" data-consent-accept>Accetta tutti</button></div>';
  const trigger = document.createElement('button');
  trigger.className = 'gf-consent-trigger';
  trigger.type = 'button';
  trigger.textContent = 'Preferenze cookie';
  trigger.setAttribute('aria-expanded', 'false');
  function closeBanner() {
    banner.hidden = true;
    trigger.hidden = false;
    trigger.setAttribute('aria-expanded', 'false');
  }
  function applyChoice(ads) {
    consent = ads;
    window.gtag('consent', 'update', consentSettings(ads === true));
    if (ads === true) { loadGoogleTag(); measureRequest(); }
    else removeAdvertisingCookies();
  }
  const settings = banner.querySelector('[data-consent-settings]');
  const adsCheckbox = banner.querySelector('[data-consent-ads]');
  const analyticsCheckbox = banner.querySelector('[data-consent-analytics]');
  function syncSettings() {
    adsCheckbox.checked = consent === true;
    analyticsCheckbox.checked = analyticsConsent === true;
  }
  function choose(ads, analytics) {
    saveAdsConsent(window, ads);
    applyChoice(ads);
    analyticsConsent = analytics;
    saveClarityConsent(analytics);
    settings.hidden = true;
    banner.querySelector('[data-consent-manage]').setAttribute('aria-expanded', 'false');
    closeBanner();
    trigger.focus({ preventScroll: true });
  }
  banner.querySelector('[data-consent-accept]').addEventListener('click', () => choose(true, true));
  banner.querySelector('[data-consent-reject]').addEventListener('click', () => choose(false, false));
  banner.querySelector('[data-consent-manage]').addEventListener('click', () => {
    syncSettings();
    settings.hidden = !settings.hidden;
    banner.querySelector('[data-consent-manage]').setAttribute('aria-expanded', String(!settings.hidden));
  });
  banner.querySelector('[data-consent-save]').addEventListener('click', () => choose(adsCheckbox.checked, analyticsCheckbox.checked));
  trigger.addEventListener('click', () => {
    syncSettings();
    banner.hidden = false;
    trigger.hidden = true;
    trigger.setAttribute('aria-expanded', 'true');
    banner.querySelector('button').focus({ preventScroll: true });
  });
  banner.hidden = !needsChoice();
  trigger.hidden = needsChoice();
  document.body.append(banner, trigger);
  applyChoice(consent);
  initClarity('z6bpz2ydko');
  syncSettings();
  window.addEventListener('storage', event => {
    if (event.key !== adsConsentKey && event.key !== CLARITY_CONSENT_KEY && event.key !== null) return;
    applyChoice(readAdsConsent(window));
    analyticsConsent = readClarityConsent(window);
    syncSettings();
    banner.hidden = !needsChoice();
    trigger.hidden = needsChoice();
  });
}

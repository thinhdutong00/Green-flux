import { readAdsConsent, saveAdsConsent, consentSettings, adsConsentKey } from './ads-consent.mjs';
import { recordConfirmedConversion } from './conversion-receipt.mjs';

const googleAdsId = 'AW-18501721820';
const heatPumpConversion = 'AW-18501721820/c3AoCIbZsq0dENy9p_ZE';

// The quiz is embedded in the landing: only its top-level page loads Google.
// Preview deployments and local tests never send advertising measurements.
if (window.top === window) {
  const production = ['green-flux.com', 'www.green-flux.com'].includes(location.hostname);
  let consent = readAdsConsent(window);
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
  banner.innerHTML = '<h2>Possiamo misurare i risultati degli annunci?</h2><p>Con il tuo consenso usiamo Google Ads per capire quali annunci portano richieste di preventivo. Puoi rifiutare e usare comunque il sito e il modulo.</p><p><a href="/cookie-policy/">Informativa cookie</a> · <a href="/privacy-policy/">Privacy</a></p><div class="gf-consent-actions"><button type="button" data-consent-reject>Rifiuta</button><button type="button" data-consent-accept>Accetta</button></div>';
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
  function choose(ads) {
    saveAdsConsent(window, ads);
    applyChoice(ads);
    closeBanner();
    trigger.focus({ preventScroll: true });
  }
  banner.querySelector('[data-consent-accept]').addEventListener('click', () => choose(true));
  banner.querySelector('[data-consent-reject]').addEventListener('click', () => choose(false));
  trigger.addEventListener('click', () => {
    banner.hidden = false;
    trigger.hidden = true;
    trigger.setAttribute('aria-expanded', 'true');
    banner.querySelector('button').focus({ preventScroll: true });
  });
  banner.hidden = consent !== null;
  trigger.hidden = consent === null;
  document.body.append(banner, trigger);
  applyChoice(consent);
  window.addEventListener('storage', event => {
    if (event.key !== adsConsentKey) return;
    applyChoice(readAdsConsent(window));
    banner.hidden = consent !== null;
    trigger.hidden = consent === null;
  });
}

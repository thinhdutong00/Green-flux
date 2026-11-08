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
  banner.id = 'gf-cookie-banner';
  banner.setAttribute('role', 'region');
  banner.setAttribute('aria-label', 'Preferenze cookie');
  banner.innerHTML = `
    <div class="gf-consent-inner">
      <div class="gf-consent-copy" data-consent-summary>
        <h2>Cookie e preferenze</h2>
        <p>Usiamo cookie e strumenti simili per il funzionamento del sito. Con il tuo consenso, Google Ads ci aiuta a misurare l’efficacia delle campagne e Microsoft Clarity ad analizzare la navigazione nella pagina sulle pompe di calore. Puoi accettare tutti i cookie facoltativi o scegliere quali attivare.</p>
        <p class="gf-consent-note"><a href="/cookie-policy/">Informativa cookie</a> · <a href="/privacy-policy/">Privacy</a></p>
      </div>
      <div class="gf-consent-actions" data-consent-actions>
        <button type="button" data-consent-accept>Accetta tutti</button>
        <button type="button" data-consent-manage aria-expanded="false" aria-controls="gf-cookie-settings">Gestisci le preferenze</button>
      </div>
      <div class="gf-consent-settings" id="gf-cookie-settings" data-consent-settings hidden>
        <h2 tabindex="-1" data-consent-settings-title>Gestisci le preferenze</h2>
        <p>Attiva solo gli strumenti che desideri. Puoi cambiare scelta in qualsiasi momento da “Preferenze cookie” in fondo alla pagina.</p>
        <div class="gf-consent-categories">
          <div class="gf-consent-category"><strong>Necessari al sito</strong><p>Consentono le funzioni essenziali del sito e memorizzano le tue preferenze.</p><span class="gf-consent-required">Sempre attivi</span></div>
          <label class="gf-consent-category"><span><strong>Misurazione degli annunci</strong><span>Google Ads misura i risultati delle campagne, senza ricevere i dati dei moduli né attivare annunci personalizzati.</span></span><span class="gf-consent-toggle"><input type="checkbox" role="switch" data-consent-ads aria-label="Consenti la misurazione degli annunci con Google Ads"><span class="gf-consent-switch-off" aria-hidden="true">OFF</span><span class="gf-consent-switch-on" aria-hidden="true">ON</span></span></label>
          <label class="gf-consent-category"><span><strong>Analisi della navigazione</strong><span>Microsoft Clarity registra le interazioni nella pagina sulle pompe di calore per analizzarne l’utilizzo. Il contenuto dei moduli è oscurato.</span></span><span class="gf-consent-toggle"><input type="checkbox" role="switch" data-consent-analytics aria-label="Consenti l’analisi della navigazione con Microsoft Clarity"><span class="gf-consent-switch-off" aria-hidden="true">OFF</span><span class="gf-consent-switch-on" aria-hidden="true">ON</span></span></label>
        </div>
        <div class="gf-consent-settings-footer"><p><a href="/cookie-policy/">Informativa cookie</a> · <a href="/privacy-policy/">Privacy</a></p><div class="gf-consent-settings-actions"><button type="button" data-consent-back>Indietro</button><button type="button" data-consent-reject>Rifiuta tutti</button><button type="button" data-consent-save>Salva le preferenze</button></div></div>
      </div>
    </div>`;
  const trigger = document.createElement('button');
  trigger.className = 'gf-consent-trigger';
  trigger.type = 'button';
  trigger.textContent = 'Preferenze cookie';
  trigger.setAttribute('aria-expanded', 'false');
  trigger.setAttribute('aria-controls', 'gf-cookie-banner');
  let returnFocus = null;
  function closeBanner() {
    banner.hidden = true;
    trigger.hidden = false;
    trigger.setAttribute('aria-expanded', 'false');
  }
  function applyChoice(ads) {
    consent = ads;
    window.dispatchEvent?.(new Event('greenflux:ads-consent'));
    window.gtag('consent', 'update', consentSettings(ads === true));
    if (ads === true) { loadGoogleTag(); measureRequest(); }
    else removeAdvertisingCookies();
  }
  const settings = banner.querySelector('[data-consent-settings]');
  const summary = banner.querySelector('[data-consent-summary]');
  const actions = banner.querySelector('[data-consent-actions]');
  const manageButton = banner.querySelector('[data-consent-manage]');
  const adsCheckbox = banner.querySelector('[data-consent-ads]');
  const analyticsCheckbox = banner.querySelector('[data-consent-analytics]');
  function showSettings(open) {
    settings.hidden = !open;
    summary.hidden = open;
    actions.hidden = open;
    manageButton.setAttribute('aria-expanded', String(open));
  }
  function syncSettings() {
    adsCheckbox.checked = consent === true;
    analyticsCheckbox.checked = analyticsConsent === true;
  }
  function choose(ads, analytics) {
    saveAdsConsent(window, ads);
    applyChoice(ads);
    analyticsConsent = analytics;
    saveClarityConsent(analytics);
    showSettings(false);
    closeBanner();
    returnFocus?.focus({ preventScroll: true });
    returnFocus = null;
  }
  banner.querySelector('[data-consent-accept]').addEventListener('click', () => choose(true, true));
  banner.querySelector('[data-consent-reject]').addEventListener('click', () => choose(false, false));
  banner.addEventListener('keydown', event => {
    if (event.key === 'Escape') { event.preventDefault(); choose(false, false); }
  });
  manageButton.addEventListener('click', () => {
    syncSettings();
    showSettings(true);
    banner.querySelector('[data-consent-settings-title]').focus({ preventScroll: true });
  });
  banner.querySelector('[data-consent-back]').addEventListener('click', () => {
    showSettings(false);
    manageButton.focus({ preventScroll: true });
  });
  banner.querySelector('[data-consent-save]').addEventListener('click', () => choose(adsCheckbox.checked, analyticsCheckbox.checked));
  trigger.addEventListener('click', () => {
    returnFocus = trigger;
    syncSettings();
    showSettings(false);
    banner.hidden = false;
    trigger.hidden = true;
    trigger.setAttribute('aria-expanded', 'true');
    banner.querySelector('[data-consent-accept]').focus({ preventScroll: true });
  });
  banner.hidden = !needsChoice();
  trigger.hidden = needsChoice();
  document.body.append(banner);
  const legalLinks = document.querySelector('footer a[href="/cookie-policy/"]')?.parentElement;
  if (legalLinks) {
    legalLinks.classList.add('gf-consent-links');
    legalLinks.append(trigger);
  }
  else {
    // Standalone questionnaires have no site footer; keep the control in normal flow.
    const footer = document.createElement('footer');
    footer.className = 'gf-consent-footer';
    footer.append(trigger);
    document.body.append(footer);
  }
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

export const adsConsentKey = 'green-flux:ads-consent:v1';
export const adsConsentLifetime = 180 * 24 * 60 * 60 * 1000;

export function readAdsConsent(browser, now = Date.now()) {
  try {
    const choice = JSON.parse(browser.localStorage.getItem(adsConsentKey));
    if (choice?.version === 1 && typeof choice.ads === 'boolean' && choice.expiresAt > now && choice.expiresAt <= now + adsConsentLifetime) return choice.ads;
    browser.localStorage.removeItem(adsConsentKey);
  } catch { /* With blocked storage, ask again instead of assuming consent. */ }
  return null;
}

export function saveAdsConsent(browser, ads, now = Date.now()) {
  try { browser.localStorage.setItem(adsConsentKey, JSON.stringify({ version: 1, ads: ads === true, expiresAt: now + adsConsentLifetime })); } catch { /* The current-page choice still applies. */ }
}

export function consentSettings(ads) {
  return { ad_storage: ads ? 'granted' : 'denied', ad_user_data: ads ? 'granted' : 'denied', ad_personalization: 'denied', analytics_storage: 'denied' };
}

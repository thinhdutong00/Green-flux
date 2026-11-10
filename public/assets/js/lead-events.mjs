import { readClarityConsent } from './clarity.mjs';

const names = new Set(['lead_cta_click', 'lead_form_view', 'lead_form_start', 'lead_form_submit', 'lead_form_error', 'lead_form_success', 'quiz_open', 'quiz_step_complete', 'lead_call_click', 'lead_whatsapp_click', 'lead_video_play']);
const errors = new Set(['validation', 'rate_limit', 'unavailable', 'delivery', 'network_or_timeout']);

export function safeLeadEvent(name, parameters = {}) {
  if (!names.has(name)) return null;
  return { event: name, service: 'heat-pump', form_position: parameters.form_position === 'quiz' ? 'quiz' : 'landing', flow_version: parameters.form_position === 'quiz' ? 'quiz-v1' : 'short-v1', ...(Number.isInteger(parameters.step) && parameters.step >= 1 && parameters.step <= 6 ? { step: parameters.step } : {}), ...(errors.has(parameters.error_category) ? { error_category: parameters.error_category } : {}) };
}

export function trackLeadEvent(name, parameters = {}, browser = window) {
  const payload = safeLeadEvent(name, parameters);
  if (!payload) return false;
  if (browser.top !== browser) {
    try { if (browser.parent.location.origin === browser.location.origin) browser.parent.postMessage({ type: 'green-flux:lead-event', payload }, browser.location.origin); } catch { /* No cross-origin analytics. */ }
    return false;
  }
  if (!['green-flux.com', 'www.green-flux.com'].includes(browser.location.hostname) || readClarityConsent(browser) !== true) return false;
  // Diagnostics only. No conversion command, identity, free text or answers.
  try {
    (browser.dataLayer ||= []).push(payload);
    browser.clarity?.('event', payload.event);
    if (payload.step) browser.clarity?.('event', `quiz_step_${payload.step}_complete`);
    if (payload.error_category) browser.clarity?.('event', `lead_form_error_${payload.error_category}`);
  } catch { return false; }
  return true;
}

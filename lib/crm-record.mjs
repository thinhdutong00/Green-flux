import { createHash, createHmac } from 'node:crypto';
import { normalizeAttribution } from '../public/assets/js/lead-attribution.mjs';
import { services } from '../public/preventivo/catalog.mjs';

export const requestIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function buildCrmRecord(data, kind, text, receivedAt = new Date().toISOString()) {
  const attribution = normalizeAttribution(data.attribution);
  const service = kind === 'heat-pump' ? 'Pompe di calore' : kind === 'contact' ? data.subject : services.filter(s => data.services.includes(s.id)).map(s => s.label).join(', ');
  const crm = { version: 1, requestId: data.requestId, receivedAt, kind, name: data.name.trim(), phone: data.phone.trim(), email: data.email.trim(), city: typeof data.city === 'string' ? data.city.trim() : '', source: attribution.source, campaign: attribution.campaign, service, notes: text, entryPage: attribution.entryPage, submissionPage: attribution.submissionPage, evidence: attribution.evidence };
  const fingerprint = createHash('sha256').update(JSON.stringify({ kind, text })).digest('hex');
  return { requestId: data.requestId, kind, fingerprint, crm, text, createdAt: receivedAt };
}
export function recoveryEmailText(record) {
  // Keep Resend's body deterministic even when durable storage was unavailable.
  // Acquisition can change after consent revocation; it belongs in the private CRM.
  return [record.text, '', '--- Riferimenti CRM Green Flux ---', `ID richiesta: ${record.requestId}`].join('\n');
}
export function signedEnvelope(payload, secret, timestamp = Date.now()) {
  const body = JSON.stringify(payload);
  return { timestamp, payload: body, signature: createHmac('sha256', secret).update(`${timestamp}\n${body}`).digest('hex') };
}
export function crmConfigured() {
  return Boolean(process.env.GREEN_FLUX_CRM_URL && process.env.GREEN_FLUX_CRM_SECRET);
}
export async function syncCrm(crm, fetchRequest = fetch) {
  if (!crmConfigured()) throw new Error('crm_not_configured');
  const url = new URL(process.env.GREEN_FLUX_CRM_URL);
  if (url.protocol !== 'https:' || url.hostname !== 'script.google.com' || !/^\/macros\/s\/[^/]+\/exec$/.test(url.pathname)) throw new Error('crm_url_invalid');
  const response = await fetchRequest(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(signedEnvelope(crm, process.env.GREEN_FLUX_CRM_SECRET)), signal: AbortSignal.timeout(6000), redirect: 'follow' });
  const result = await response.json().catch(() => null);
  if (!response.ok || result?.ok !== true || result.requestId !== crm.requestId) throw new Error('crm_not_confirmed');
  return result;
}

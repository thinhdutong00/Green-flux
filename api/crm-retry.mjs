import { timingSafeEqual } from 'node:crypto';
import { createOutbox, outboxConfigured } from '../lib/crm-outbox.mjs';
import { recoveryEmailText } from '../lib/crm-record.mjs';

export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store');
  const expected = process.env.GREEN_FLUX_CRM_SECRET;
  const actual = String(request.headers.authorization || '').replace(/^Bearer /, '');
  if (!expected || Buffer.byteLength(actual) !== Buffer.byteLength(expected) || !timingSafeEqual(Buffer.from(actual), Buffer.from(expected))) return response.status(401).json({ ok: false });
  if (request.method !== 'POST') { response.setHeader('Allow', 'POST'); return response.status(405).json({ ok: false }); }
  if (!outboxConfigured()) return response.status(503).json({ ok: false, reason: 'outbox_unavailable' });
  try {
    const result = await createOutbox().retry(async record => {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST', headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json', 'Idempotency-Key': `greenflux-${record.requestId}` },
        body: JSON.stringify({ from: process.env.QUOTE_FROM_EMAIL, to: ['info@green-flux.com'], ...(record.crm.email ? { reply_to: record.crm.email } : {}), subject: record.kind === 'contact' ? 'Nuova richiesta di contatto — Green Flux' : 'Nuova richiesta di preventivo — Green Flux', text: recoveryEmailText(record) }),
        signal: AbortSignal.timeout(10000),
      });
      const receipt = await response.json();
      if (!response.ok || !receipt.id) throw new Error('primary_unconfirmed');
      return receipt.id;
    });
    return response.status(200).json({ ok: true, ...result });
  } catch {
    console.error('crm_retry_failed');
    return response.status(503).json({ ok: false, reason: 'retry_unavailable' });
  }
}

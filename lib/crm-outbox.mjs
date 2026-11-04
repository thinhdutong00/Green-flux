import { get, put, list, del } from '@vercel/blob';
import { syncCrm } from './crm-record.mjs';

export const outboxConfigured = () => Boolean(process.env.BLOB_STORE_ID || process.env.BLOB_READ_WRITE_TOKEN);
const pathFor = (state, id) => `green-flux-crm/${state}/${id}.json`;
const log = (event, id) => console.error(event, { requestId: id });
export function blobStorage() {
  return {
    async read(path) {
      const result = await get(path, { access: 'private', useCache: false, abortSignal: AbortSignal.timeout(2500) });
      return result?.statusCode === 200 ? new Response(result.stream).json() : null;
    },
    async create(path, value) {
      try { await put(path, JSON.stringify(value), { access: 'private', addRandomSuffix: false, allowOverwrite: false, contentType: 'application/json', abortSignal: AbortSignal.timeout(2500) }); return value; }
      catch (error) {
        // An existing immutable record is the authority, including during parallel retries.
        if (error.message?.includes('already exists') || error.name === 'BlobPreconditionFailedError') { const existing = await this.read(path); if (existing) return existing; }
        throw error;
      }
    },
    async remove(paths) { if (paths.length) await del(paths, { abortSignal: AbortSignal.timeout(2500) }); },
    async pending(prefix, cursor) { return list({ prefix, cursor, limit: 50, abortSignal: AbortSignal.timeout(2500) }); },
  };
}
export function createOutbox(storage = blobStorage(), writeCrm = syncCrm) {
  return {
    async prepare(record) {
      const done = await storage.read(pathFor('done', record.requestId));
      if (done) {
        if (done.fingerprint !== record.fingerprint) { const error = new Error('request_id_conflict'); error.conflict = true; throw error; }
        return { done, record };
      }
      const existing = await storage.create(pathFor('staged', record.requestId), record);
      if (existing.fingerprint !== record.fingerprint) { const error = new Error('request_id_conflict'); error.conflict = true; throw error; }
      return { record: existing };
    },
    async accepted(record, resendId) {
      const confirmed = { ...record, resendId };
      let durable = false;
      try { await storage.create(pathFor('confirmed', record.requestId), confirmed); durable = true; } catch { log('crm_outbox_save_failed', record.requestId); }
      try {
        const result = await writeCrm({ ...record.crm, resendId });
        try {
          await storage.create(pathFor('done', record.requestId), { requestId: record.requestId, fingerprint: record.fingerprint, kind: record.kind, receivedAt: record.crm.receivedAt, syncedAt: new Date().toISOString() });
          await storage.remove([pathFor('staged', record.requestId), pathFor('confirmed', record.requestId)]);
        } catch { log('crm_outbox_cleanup_failed', record.requestId); }
        return { status: result.duplicate ? 'already_registered' : 'registered' };
      } catch {
        log(durable ? 'crm_sync_pending' : 'crm_recover_from_email', record.requestId);
        return { status: durable ? 'pending' : 'email_recovery' };
      }
    },
    async retry(sendPrimary, now = Date.now()) {
      const counts = { registered: 0, pending: 0, uncertain: 0, expired: 0 };
      const ids = new Set();
      const started = Date.now();
      // Bounded work per invocation. Successful rows disappear from this queue.
      for (const state of ['confirmed', 'staged']) {
        const page = await storage.pending(`green-flux-crm/${state}/`);
        for (const blob of page.blobs) {
          if (ids.size >= 8 || Date.now() - started > 25000) break;
          const record = await storage.read(blob.pathname);
          if (!record || ids.has(record.requestId)) continue;
          ids.add(record.requestId);
          const done = await storage.read(pathFor('done', record.requestId));
          if (done) { await storage.remove([pathFor('staged', record.requestId), pathFor('confirmed', record.requestId)]); continue; }
          if (state === 'staged' && now - Date.parse(record.createdAt) < 60000) continue;
          let resendId = record.resendId;
          if (!resendId) {
            // Never resend an ambiguous primary email after Resend's 24h idempotency window.
            if (now - Date.parse(record.createdAt) >= 23 * 60 * 60 * 1000) {
              await storage.create(pathFor('review', record.requestId), record);
              await storage.remove([pathFor('staged', record.requestId)]);
              log('crm_primary_requires_resend_review', record.requestId); counts.uncertain++; continue;
            }
            try { resendId = await sendPrimary(record); } catch { counts.pending++; continue; }
          }
          const result = await this.accepted(record, resendId);
          if (['registered', 'already_registered'].includes(result.status)) counts.registered++; else counts.pending++;
        }
      }
      // Tombstones carry no contact details and are kept only for the retry period.
      const completed = await storage.pending('green-flux-crm/done/');
      for (const blob of completed.blobs) if (now - new Date(blob.uploadedAt).getTime() > 30 * 24 * 60 * 60 * 1000) { await storage.remove([blob.pathname]); counts.expired++; }
      return counts;
    },
  };
}

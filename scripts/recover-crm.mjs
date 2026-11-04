import { syncCrm, requestIdPattern } from '../lib/crm-record.mjs';

// Private operator workflow: read a confirmed original email record from stdin.
// Credentials come exclusively from the operator's environment, never arguments.
const chunks = [];
for await (const chunk of process.stdin) chunks.push(chunk);
const record = JSON.parse(Buffer.concat(chunks).toString('utf8'));
if (!requestIdPattern.test(record.requestId || '') || !record.resendId) throw new Error('Original request ID and confirmed Resend receipt required');
const result = await syncCrm(record);
console.log(JSON.stringify({ ok: true, requestId: result.requestId, duplicate: result.duplicate }));

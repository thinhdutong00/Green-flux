// Green Flux only. This project never accepts a spreadsheet ID from a request.
const GF_SHEET_ID = '1_T3GS1bZUXE_5FQXKOeEd1gOzJmjKoBtiJksfyRGHvw';
const GF_SHEET_NAME = 'Richieste dal sito';
const GF_HEADERS = ['Data', 'Nome e cognome', 'Telefono', 'Email', 'Città', 'Provenienza', 'Annuncio / campagna', 'Servizio richiesto', 'Stato richiesta', 'Contattato', 'Data e ora contatto', 'Comunicazioni / note', 'Preventivo', 'Accettato', 'ID richiesta'];
const GF_SOURCES = ['Google Ads', 'Google organico', 'Google Maps', 'Diretto', 'Social', 'Referral', 'Altre fonti', 'Non rilevata'];

function doGet() { return gfJson_({ ok: true, service: 'green-flux-crm', version: 1 }); }

function doPost(event) {
  let lock;
  try {
    const raw = event && event.postData && event.postData.contents;
    if (!raw || raw.length > 40000) return gfJson_({ ok: false, reason: 'invalid_request' });
    const envelope = JSON.parse(raw);
    const secret = PropertiesService.getScriptProperties().getProperty('GREEN_FLUX_CRM_SECRET');
    if (!secret || typeof envelope.payload !== 'string' || typeof envelope.signature !== 'string' || !Number.isFinite(envelope.timestamp) || Math.abs(Date.now() - envelope.timestamp) > 300000) return gfJson_({ ok: false, reason: 'unauthorized' });
    const signature = Utilities.computeHmacSha256Signature(String(envelope.timestamp) + '\n' + envelope.payload, secret, Utilities.Charset.UTF_8).map(b => ('0' + ((b + 256) % 256).toString(16)).slice(-2)).join('');
    if (!gfEqual_(signature, envelope.signature)) return gfJson_({ ok: false, reason: 'unauthorized' });
    const lead = JSON.parse(envelope.payload);
    if (lead.action === 'health') return gfJson_({ ok: true, requestId: lead.requestId, spreadsheet: gfSheet_().getParent().getId() === GF_SHEET_ID });
    if (lead.version !== 1 || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(lead.requestId || '') || typeof lead.name !== 'string' || !lead.name.trim() || !lead.resendId || !GF_SOURCES.includes(lead.source) || !Number.isFinite(Date.parse(lead.receivedAt))) return gfJson_({ ok: false, reason: 'invalid_lead' });
    const date = new Date(lead.receivedAt);
    lock = LockService.getScriptLock();
    lock.waitLock(15000);
    const sheet = gfSheet_();
    const last = Math.max(sheet.getLastRow(), 1);
    if (last > 1 && sheet.getRange(2, 15, last - 1, 1).createTextFinder(lead.requestId).matchEntireCell(true).matchCase(false).findNext()) return gfJson_({ ok: true, requestId: lead.requestId, duplicate: true });
    const row = last + 1;
    if (row > sheet.getMaxRows()) {
      sheet.insertRowsAfter(sheet.getMaxRows(), 100);
      sheet.getRange(2, 1, 1, sheet.getMaxColumns()).copyTo(sheet.getRange(row, 1, 100, sheet.getMaxColumns()), SpreadsheetApp.CopyPasteType.PASTE_FORMAT, false);
      sheet.getRange(2, 1, 1, sheet.getMaxColumns()).copyTo(sheet.getRange(row, 1, 100, sheet.getMaxColumns()), SpreadsheetApp.CopyPasteType.PASTE_DATA_VALIDATION, false);
      const filter = sheet.getFilter();
      if (filter) { const criteria = []; for (let col = 1; col <= filter.getRange().getNumColumns(); col++) criteria.push(filter.getColumnFilterCriteria(col)); filter.remove(); const fresh = sheet.getRange(1, 1, sheet.getMaxRows(), Math.min(18, sheet.getMaxColumns())).createFilter(); criteria.forEach((rule, index) => { if (rule) fresh.setColumnFilterCriteria(index + 1, rule); }); }
    }
    const values = [date, lead.name, lead.phone, lead.email, lead.city, lead.source, lead.campaign, lead.service, 'Da contattare', '', '', lead.notes, '', '', lead.requestId].map(gfText_);
    const extraHeaders = sheet.getRange(1, 16, 1, 3).getValues()[0];
    if (extraHeaders.join('|') === 'Pagina di ingresso|Pagina di invio|Evidenza attribuzione') values.push(gfText_(lead.entryPage), gfText_(lead.submissionPage), gfText_(lead.evidence));
    sheet.getRange(row, 3).setNumberFormat('@');
    sheet.getRange(row, 1, 1, values.length).setValues([values]);
    sheet.getRange(row, 1).setNumberFormat('dd/mm/yyyy hh:mm');
    SpreadsheetApp.flush();
    return gfJson_({ ok: true, requestId: lead.requestId, duplicate: false });
  } catch (error) {
    // Never log contact details, incoming payloads, HMACs, or credentials.
    console.error('green_flux_crm_write_failed');
    return gfJson_({ ok: false, reason: 'write_failed' });
  } finally { if (lock && lock.hasLock()) lock.releaseLock(); }
}

function gfSheet_() {
  const book = SpreadsheetApp.openById(GF_SHEET_ID);
  const sheet = book.getSheetByName(GF_SHEET_NAME);
  if (!sheet || sheet.getRange(1, 1, 1, 15).getValues()[0].join('|') !== GF_HEADERS.join('|')) throw new Error('schema_mismatch');
  if (book.getSpreadsheetTimeZone() !== 'Europe/Rome') throw new Error('timezone_mismatch');
  return sheet;
}
function gfText_(value) {
  if (value instanceof Date) return value;
  const text = String(value == null ? '' : value).replace(/\u0000/g, '').slice(0, 15000);
  return /^[\s]*[=+@\-]/.test(text) ? "'" + text : text;
}
function gfEqual_(a, b) { let mismatch = a.length ^ b.length; for (let i = 0; i < Math.max(a.length, b.length); i++) mismatch |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0); return mismatch === 0; }
function gfJson_(value) { return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON); }

function installRecoveryTrigger() {
  gfSheet_();
  if (!PropertiesService.getScriptProperties().getProperty('GREEN_FLUX_CRM_SECRET')) throw new Error('Configure GREEN_FLUX_CRM_SECRET in project properties first.');
  ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === 'retryGreenFluxCrm').forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('retryGreenFluxCrm').timeBased().everyMinutes(10).create();
  console.log('Green Flux: controllo recupero CRM ogni 10 minuti attivato.');
}
function retryGreenFluxCrm() {
  const secret = PropertiesService.getScriptProperties().getProperty('GREEN_FLUX_CRM_SECRET');
  if (!secret) throw new Error('CRM secret missing');
  const response = UrlFetchApp.fetch('https://green-flux.com/api/crm-retry', { method: 'post', headers: { Authorization: 'Bearer ' + secret }, contentType: 'application/json', payload: '{}', muteHttpExceptions: true });
  const result = JSON.parse(response.getContentText());
  if (response.getResponseCode() !== 200 || result.ok !== true) throw new Error('Green Flux CRM recovery failed; inspect Vercel logs.');
  console.log(JSON.stringify({ registered: result.registered, pending: result.pending, uncertain: result.uncertain }));
}

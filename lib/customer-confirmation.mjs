const escapeHtml = value => String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);

export function customerConfirmation(name, requestText, { heatPump = false } = {}) {
  const greeting = `Ciao ${name.trim().replace(/\s+/g, ' ')},`;
  const message = heatPump ? 'abbiamo ricevuto la tua richiesta di valutazione per una pompa di calore. Il team Green Flux la prenderà in carico. Ti ricontattiamo per parlare della casa, del riscaldamento attuale e delle verifiche da fare.' : 'abbiamo ricevuto la tua richiesta. Ti ricontattiamo ai recapiti che hai indicato per capire il lavoro da fare e verificare la zona dell’intervento. Se occorre un sopralluogo, concordiamo insieme la data dopo questo primo contatto.';
  const nextStep = heatPump ? 'Parliamo della tua casa.' : 'Il prossimo passo è sentirci.';
  const text = [
    greeting, '', message, '', 'Ecco una copia dei dati che ci hai lasciato:', '', requestText, '',
    'Vuoi aggiungere o correggere un dettaglio? Rispondi a questa email oppure chiamaci al +39 375 552 1420.', '',
    'Grazie,', 'Il team Green Flux', 'GREEN FLUX srls · Via Trieste, 19 · 35121 Padova', 'https://green-flux.com/',
  ].join('\n');
  const html = `<!doctype html>
<html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>La tua richiesta è arrivata | Green Flux</title></head>
<body style="margin:0;padding:0;background:#f4f6f0;color:#192117;font-family:Arial,Helvetica,sans-serif">
<table role="presentation" style="width:100%;border-collapse:collapse;background:#f4f6f0"><tr><td style="padding:32px 16px">
<table role="presentation" align="center" style="width:100%;max-width:600px;border-collapse:collapse;background:#fff;border:1px solid #e1e7d9">
<tr><td style="padding:28px 28px 22px;border-bottom:1px solid #e1e7d9"><a href="https://green-flux.com/" style="color:#192117;text-decoration:none;font-size:23px;font-weight:bold;letter-spacing:-1px">GREEN <span style="color:#557c34">FLUX</span></a><div style="margin-top:6px;font-size:9px;letter-spacing:2px;color:#707b67">IMPIANTI TECNOLOGICI</div></td></tr>
<tr><td style="padding:28px"><p style="margin:0 0 16px;color:#557c34;font-size:11px;font-weight:bold;letter-spacing:1.5px">RICHIESTA RICEVUTA</p>
<h1 style="margin:0 0 24px;font-size:30px;line-height:1.2;color:#192117">La tua richiesta è arrivata.<br><span style="color:#557c34">${nextStep}</span></h1>
<p style="font-size:15px;line-height:1.8;margin:0 0 14px">${escapeHtml(greeting)}</p><p style="font-size:15px;line-height:1.8;margin:0 0 24px">${escapeHtml(message)}</p>
<h2 style="font-size:17px;line-height:1.5;margin:0 0 12px">Il riepilogo della tua richiesta</h2>
<div style="padding:20px;background:#f4f6f0;border:1px solid #e1e7d9;font-size:13px;line-height:1.8;overflow-wrap:anywhere">${escapeHtml(requestText).replace(/\r?\n/g, '<br>')}</div>
<p style="font-size:13px;line-height:1.8;margin:24px 0 0">Vuoi aggiungere o correggere un dettaglio? <strong>Rispondi a questa email</strong> oppure chiamaci al <a href="tel:+393755521420" style="color:#557c34">+39 375 552 1420</a>.</p>
<p style="font-size:14px;line-height:1.8;margin:20px 0 0">Grazie,<br><strong>Il team Green Flux</strong></p></td></tr>
<tr><td style="padding:20px 28px;border-top:1px solid #e1e7d9;font-size:11px;line-height:1.8;color:#707b67">GREEN FLUX srls · Via Trieste, 19 · 35121 Padova<br><a href="https://green-flux.com/" style="color:#557c34">green-flux.com</a> · <a href="mailto:info@green-flux.com" style="color:#557c34">info@green-flux.com</a></td></tr>
</table></td></tr></table></body></html>`;
  return { subject: 'Abbiamo ricevuto la tua richiesta — Green Flux', reply_to: 'info@green-flux.com', headers: { 'Auto-Submitted': 'auto-generated' }, text, html };
}

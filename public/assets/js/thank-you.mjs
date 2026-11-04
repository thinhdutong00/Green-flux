import { readPendingRequest, clearPendingRequest, pendingRequestLifetime } from './request-delivery.mjs';
import { textContactLinks } from './handoff.mjs';
import { readSubmissionStatus } from './submission-status.mjs';

if (location.hash !== '#completa-invio' && readSubmissionStatus(window)) {
  document.querySelector('[data-thank-you-status]').textContent = 'Richiesta inviata';
  document.querySelector('#thank-you-title').textContent = 'Grazie. Parliamo della tua casa.';
  document.querySelector('[data-thank-you-message]').textContent = 'La tua richiesta è stata accettata. Ti ricontattiamo ai recapiti che hai indicato per capire cosa ti serve e concordare le verifiche.';
  document.querySelector('.ty-reassurance').textContent = 'Non serve compilare di nuovo il modulo. Se vuoi aggiungere un dettaglio, puoi chiamarci.';
}

if (location.hash === '#completa-invio') {
  const draft = readPendingRequest(window);
  document.body.classList.add('has-handoff');
  document.querySelector('[data-thank-you-status]').textContent = 'La tua richiesta è pronta';
  document.querySelector('#thank-you-title').textContent = 'L’invio non è ancora confermato.';
  document.querySelector('[data-thank-you-message]').textContent = 'Non abbiamo conferma della ricezione. Puoi inviare il riepilogo tramite email o WhatsApp qui sotto, oppure chiamarci.';
  document.querySelector('.ty-reassurance').textContent = draft ? 'Il riepilogo è già pronto: non devi ricompilare il modulo.' : 'Puoi contattarci direttamente tramite email o WhatsApp.';
  const panel = document.querySelector('[data-request-handoff]');
  panel.hidden = false;
  const text = draft?.text || 'Buongiorno Green Flux, vorrei essere ricontattato per una richiesta dal vostro sito.';
  const links = textContactLinks(text);
  panel.querySelector('[data-request-whatsapp]').href = links.whatsapp;
  panel.querySelector('[data-request-email]').href = links.email;
  panel.querySelector('textarea').value = draft?.text || '';
  panel.querySelector('[data-request-summary]').hidden = !draft;
  if (!draft) panel.querySelector('[data-handoff-note]').textContent = 'Il riepilogo non è disponibile in questa scheda. Apri email o WhatsApp e indicaci i tuoi recapiti e il progetto.';
  if (draft) setTimeout(() => clearPendingRequest(window), Math.min(pendingRequestLifetime, draft.expiresAt - Date.now()));
}

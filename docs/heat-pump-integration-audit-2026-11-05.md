# Audit del flusso richieste pompe di calore

Data dell'audit: **5 novembre 2026**, Europe/Rome. Il risultato riguarda il codice e i test controllati. Le verifiche browser, la build e la preview sono riportate nella consegna del rilascio. Non è un'attestazione di consegna email o di scrittura nel CRM reale.

## Mappa delle integrazioni

| Funzione | Sorgente | Comportamento preservato |
| --- | --- | --- |
| Modulo breve | `scripts/render-site.mjs`, `public/assets/js/heat-pump-short-form.mjs`, `public/preventivo/heat-pump-short-data.mjs` | Nome, telefono, comune, riscaldamento, email facoltativa, privacy; honeypot; errori nel modulo; nessun reset in caso di fallimento. |
| Questionario dettagliato | `templates/heat-pump-quote.html`, `public/preventivo/heat-pump-wizard.mjs`, `public/preventivo/heat-pump-data.mjs` | Percorso esistente, riepilogo e correzione risposte; telefono richiesto, email facoltativa. |
| Invio comune | `public/assets/js/request-delivery.mjs`, `api/preventivo.mjs` | JSON same-origin a `/api/preventivo`; controlli tipo, lunghezza, consenso privacy, honeypot e tempo minimo; destinatario fisso `info@green-flux.com`. |
| Resend | `api/preventivo.mjs`, `lib/customer-confirmation.mjs` | Email aziendale idempotente, conferma cliente separata solo con email valida; errore conferma cliente non annulla l'accettazione aziendale. |
| CRM | `lib/crm-record.mjs`, `lib/crm-outbox.mjs`, `api/crm-retry.mjs`, `integrations/google-sheets/Code.gs` | HMAC server, coda privata se configurata, retry, ID richiesta stabile e scrittura atomica deduplicata in “Richieste dal sito”. |
| Provenienza | `public/assets/js/lead-attribution.mjs` | Sorgente derivata da evidenze UTM/referrer/click ID con consenso Ads. In assenza di consenso: “Non rilevata”. Nessuna equivalenza automatica tra assenza di Ads e organico. |
| Google Ads | `public/assets/js/ads-measurement.mjs`, `conversion-receipt.mjs` | Identificativi invariati; solo richiesta accettata e consenso Ads; UUID per deduplica; nessuna conversione da sola visita thank-you, refresh, invio fallito o altro servizio. |
| Microsoft Clarity | `public/assets/js/clarity.mjs`, `lead-events.mjs` | Solo landing canonica in produzione, consenso analytics separato, mascheramento form/dialog, arresto e cancellazione cookie alla revoca. |
| Esito operativo | `public/assets/js/submission-status.mjs`, `thank-you.mjs` | Stato essenziale a scadenza separato dai cookie pubblicitari; la richiesta non equivale a appuntamento fissato. |

## Correzioni applicate

- La validazione condivisa del modulo breve ora accetta l'email vuota; controlla sintassi e lunghezza solo se compilata. Il codice del provider già ometteva `reply_to` e conferma cliente per email vuota: i nuovi test attraversano tale percorso fino al record CRM.
- Nessun indirizzo fittizio viene inserito. Il campo email CRM rimane vuoto; un test esegue anche l'Apps Script reale in un ambiente simulato e verifica cella vuota e deduplica.
- Il mittente delle richieste conservava inizialmente solo `{ consent: false }` in caso di rifiuto, perdendo anche il percorso operativo del form. Ora conserva `submissionPage` senza query, UTM, referrer o cronologia d'ingresso. Alla revoca, tali dati di acquisizione vengono rimossi anche da un ritentativo con lo stesso UUID.
- Aggiunto `lead_cta_click` al sistema diagnostico esistente per i link principali a `#valutazione`. Richiede il consenso Clarity, non contiene testo del link o dati personali e non è una conversione primaria.
- Dopo un errore il pulsante torna a “Richiedi il sopralluogo gratuito”, coerente con la proposta.

## Test eseguiti

Comando eseguito con successo: **53 test, 53 superati, 0 falliti**.

```sh
node --test tests/heat-pump-short.test.mjs tests/crm-attribution.test.mjs tests/crm-delivery.test.mjs tests/customer-confirmation.test.mjs tests/request-delivery.test.mjs tests/ads-measurement.test.mjs tests/clarity.test.mjs tests/heat-pump-quiz.test.mjs tests/site-visit.test.mjs tests/preventivo.test.mjs
```

| Caso | Prova eseguita | Limite |
| --- | --- | --- |
| Email valida / vuota / invalida | Validazione condivisa e handler API, provider intercettato | Nessuna email reale inviata. |
| Email assente nel form | `FormData` senza campo email diventa stringa vuota e supera la validazione | Il payload JSON del frontend include la chiave con valore vuoto; tipi JSON non stringa continuano a essere respinti. |
| Conferma cliente | Invio solo con email valida; chiave diversa; fallimento indipendente | Accettazione Resend simulata. |
| CRM senza email | Handler → envelope firmato → valore vuoto; Apps Script in VM → cella vuota | Nessuna riga creata nel foglio reale. |
| Errori | 400, 429, 502, 503, errore rete; nessun redirect del modulo breve in caso di fallimento | Messaggi e flusso verificati con risposte simulate. |
| Retry / deduplica | Stesso UUID e chiavi provider; perdita risposta Sheets; lock e inserimento atomico; ricevuta senza PII | Il doppio clic nel browser è verificato separatamente dal collaudo UI. |
| Conversione | Solo invio accettato; thank-you diretta, refresh, scadenza, consenso rifiutato e storage bloccato non convertono | Nessun comando inviato a Google Ads reale. |
| Consenso | Ads e analytics indipendenti; revoca Clarity invoca stop; mascheramento prima del caricamento | Clarity simulato; nessuna registrazione reale acquisita. |
| Provenienza | Evidenze esplicite, query estranee scartate, iframe, consenso e revoca, percorso invio senza consenso | Non si inferisce il canale di un contatto senza evidenze. |
| Altri moduli | Quiz, contatto, richiesta sopralluogo e preventivo generale | Stesso endpoint testato in processo con provider intercettati. |

## Verifiche reali non effettuate

L'utente ha espressamente chiesto **di non inviare email**. Non sono stati effettuati POST reali per generare richieste di prova. Questi quattro livelli restano distinti:

1. **Risposta positiva dell'endpoint distribuito:** non provata con un POST reale. Il GET di disponibilità, se eseguito nel collaudo deployment, indica soltanto presenza di configurazione email.
2. **Accettazione di una nuova email da Resend:** non provata in questa attività; i test controllano il contratto con risposte simulate.
3. **Consegna a `info@green-flux.com`:** non provata. Un ID Resend non equivale all'evento `delivered` o alla presenza in casella.
4. **Nuova riga nel CRM Google Sheets:** non provata nel foglio reale. La simulazione del contratto e dello script non attesta la distribuzione e i permessi Apps Script attivi.

Non sono stati letti o stampati segreti, modificati identificativi Ads, campagne, budget, DNS o altri progetti. Il recapito, il CRM e il tracking restano quelli esistenti.

## Come osservare il risultato

Non è stato introdotto un nuovo strumento né una nuova conversione primaria.

| Passaggio | Dove osservarlo | Interpretazione |
| --- | --- | --- |
| Visite alla landing | Clarity, filtro URL `/servizi/pompe-calore/`, intervallo e dispositivo | Solo sessioni con consenso analytics; non il totale assoluto dei visitatori. I clic Ads non sono la stessa metrica. |
| Clic CTA | Evento Clarity `lead_cta_click` | Interesse per la richiesta, non contatto ricevuto. |
| Modulo visibile / iniziato | `lead_form_view`, `lead_form_start` | Diagnostica soggetta al consenso analytics. Un avvio dopo rifiuto non viene misurato. |
| Tentativi / errori | `lead_form_submit`, `lead_form_error` e categoria consentita | Un tentativo non è una richiesta accettata; analizzare validazione, rete, disponibilità, rate limit e invio. |
| Richieste accettate | `lead_form_success`, receipt Ads esistente e registri operativi | L'evento diagnostico e la conversione Ads hanno consensi diversi. Confrontare il CRM deduplicato per UUID, verificando eventuali record in coda. |
| Pertinenza geografica | Comune e note nel CRM, conferma nel primo contatto | Area: Padova e raggio di 35 km dal centro. Nei comuni di confine conta la posizione dell'immobile; il solo nome del comune non prova la distanza. |
| Qualità del contatto | Servizio, riscaldamento e note, esito del contatto nei campi commerciali esistenti | Distinguere sostituzione del riscaldamento, interventi pertinenti, recapito raggiungibile e condizioni della casa. Nessuno di questi dati va mandato a Clarity/Ads. |
| Sopralluogo concordato | Aggiornamento esplicito dello stato/note nel CRM dopo il contatto | Una richiesta nuova, “Contattato” o l'invio del modulo non confermano un appuntamento. |

Registrare data/ora effettiva di pubblicazione e commit nel verbale di rilascio: la data di questo audit non è una data di messa online. Confrontare periodi, sorgenti e dispositivi comparabili e considerare il consenso, i contatti duplicati e le richieste fuori zona. Non dedurre un miglioramento percentuale da pochi contatti.

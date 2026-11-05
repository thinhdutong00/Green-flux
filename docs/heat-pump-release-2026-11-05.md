# Landing pompe di calore — consegna del 5 novembre 2026

Versione preparata per revisione in preview Vercel, progetto `green-flux`. La produzione non è stata aggiornata in questa attività. La data di questa consegna **non è la data di rilascio pubblico**: al passaggio in produzione registrare data/ora Europe/Rome e SHA distribuito. Nessuna percentuale di miglioramento delle conversioni è dichiarata.

## Intervento

- Proposta e modulo breve affiancati su desktop; su mobile titolo, spiegazione, CTA e prova di fiducia precedono il modulo. Nessuna immagine di persone o cantieri è usata come prova del servizio.
- Percorso unico «Richiedi il sopralluogo gratuito», con sopralluogo concordato solo dopo il primo contatto. Area esplicita: Padova e raggio di 35 km dal centro. Il comune raccoglie la prima indicazione; l'indirizzo effettivo e la pertinenza dell'intervento vanno chiariti al ricontatto, senza classificazioni geografiche automatiche inventate.
- Tre dubbi iniziali, quattro attività Green Flux documentate, recensioni originali con quella di Clara Paccagnella per prima. Le altre due sono dichiarate recensioni generali dell'azienda.
- Sezione incentivi visibile: Ecobonus 50%/36% con requisiti e dieci quote annuali; Conto Termico 3.0 fino al 65% delle spese ammissibili, senza rimborso automatico né approvazione garantita. Fonti prossime ai testi, data fissa 5 novembre 2026.
- Termosifoni, spesa complessiva, componenti e lavori del preventivo; tre passaggi dopo la richiesta e sei FAQ. Il questionario dettagliato resta disponibile in un approfondimento secondario.
- Email realmente facoltativa nel modulo breve e nella validazione condivisa. Senza indirizzo: nessun indirizzo sostitutivo, nessuna conferma cliente, email vuota nel record CRM. Destinatario aziendale sempre `info@green-flux.com`.
- Preservati consenso separato, mascheramento Clarity, endpoint, CRM, ricevuta server e deduplica Ads. Aggiunto solo il diagnostico `lead_cta_click`, soggetto al consenso analytics, senza PII e senza nuova conversione primaria. Corretto il mantenimento del solo percorso operativo di invio quando i cookie sono rifiutati: nessuna attribuzione Ads/organico inventata.
- Canonical pubblico, ancore preesistenti, sitemap e thank-you noindex preservati. Nessuna nuova libreria, form provider, immagine o strumento di tracking.

## File

| Area | File sorgente / risultato |
| --- | --- |
| Testi e struttura | `templates/heat-pump-landing.html`, `content/heat-pump-campaign.json`, HTML generato `public/servizi/pompe-calore/index.html` |
| Stile | `public/assets/css/heat-pump-landing.css`, nuove regole limitate alla landing `.hp-qualified` |
| Modulo | `public/preventivo/heat-pump-short-data.mjs`, `public/assets/js/heat-pump-short-form.mjs` |
| Diagnostica e provenienza | `public/assets/js/heat-pump-landing.mjs`, `public/assets/js/lead-events.mjs`, `public/assets/js/request-delivery.mjs` |
| Regressioni | `tests/heat-pump-short.test.mjs`, `tests/crm-attribution.test.mjs`, `tests/crm-delivery.test.mjs`, contratti editoriali in `tests/site.test.mjs` e `tests/company-content.test.mjs` |
| Documentazione | `README.md`, `docs/crm-green-flux.md`, documenti della consegna collegati sotto; statistiche rigenerate `docs/performance-build.json` |

Il checkout iniziale era pulito. Conservato con fast-forward il commit remoto `5d72068` relativo al titolo della home, arrivato dopo la base locale `2856cad`. Nessuna modifica a campagne Ads, budget, strategie, DNS, configurazioni degli altri progetti o dati CRM.

## Test e limiti

`npm run render`, `npm test` e `npm run build` completati. La suite ha **67 test passati, zero fallimenti**. Verificati in processo, con provider simulati: validazione con/senza email, richiesta accettata/rifiutata, idempotenza Resend, firma CRM e Apps Script, coda e recupero, attribuzione consentita/rifiutata, ricevute e deduplica conversioni, Clarity, quiz e altri moduli.

Il [rapporto browser](heat-pump-browser-qa-2026-11-05.md) riporta scenari eseguiti, quattro viewport 360/390/768/1440, screenshot, tastiera, menu/ancore, errori, doppio clic, retry, thank-you, consenso, quiz e controllo della build ottimizzata. Gli endpoint e i tracker del collaudo sono intercettati: **nessuna conversione simulata è arrivata a Google Ads**.

Metadati Vercel controllati senza leggere i valori: `RESEND_API_KEY`, `QUOTE_FROM_EMAIL`, `GREEN_FLUX_CRM_URL`, `GREEN_FLUX_CRM_SECRET`, `BLOB_STORE_ID` risultano presenti per production. Non sono configurati per preview. Non sono stati copiati segreti o modificati gli ambienti. GET read-only `https://green-flux.com/api/preventivo` ha restituito `available: true, customerConfirmation: true`: prova la presenza della configurazione email, non la consegna.

L'utente ha chiesto esplicitamente **di non inviare email**. Pertanto restano non eseguite e non dichiarate superate queste quattro prove reali:

1. POST accettata dall'endpoint distribuito;
2. accettazione di una nuova email da parte di Resend;
3. effettiva consegna a `info@green-flux.com`;
4. effettiva presenza di una nuova riga nel foglio CRM.

La preview consente di revisionare interfaccia e contenuti. Senza configurazione Resend/CRM dell'ambiente preview, un invio reale non è disponibile. I test positivi e negativi del flusso sono controllati e riproducibili; questa limitazione non viene nascosta né aggirata collegando segreti di produzione alla preview.

## Testi, fonti e misurazione

- [Versione finale dei testi principali](heat-pump-final-copy-2026-11-05.md).
- [Fonti ufficiali e verifica del 5 novembre 2026](heat-pump-incentives-verification-2026-11-05.md), incluse limitazioni di accesso alle pagine AdE e ricerca della pagina equivalente.
- [Mappa delle integrazioni e monitoraggio](heat-pump-integration-audit-2026-11-05.md): visite, CTA, avvio, errore, richiesta accettata, pertinenza geografica e qualità del contatto. Richiesta, contatto e sopralluogo concordato sono fasi distinte. Confrontare periodi, dispositivi, sorgenti e consenso comparabili dopo il rilascio effettivo.

Google Maps non ha consentito una nuova verifica: sulla landing restano **5,0/5 e 29 recensioni, dato storico del 4 novembre 2026 fornito nell'incarico**. La data 5 novembre presente inizialmente nel JSON della campagna è stata ricondotta a tale rilevazione; non si dichiara un nuovo conteggio. I testi delle recensioni non sono modificati.

Esclusi: prezzi e risparmi inventati, assistenza illimitata, tempi di richiamata/installazione/pagamento, certificazioni/partnership non provate, gestione integrale delle pratiche non documentata, 65% automatico, cumulo sulle stesse spese, riapertura del Bando Stufe Veneto 2025, Bonus Casa non necessario al percorso e testimonianze ricostruite. Eliminata la foto illustrativa del tecnico per non suggerire un lavoro o una persona reale di Green Flux.

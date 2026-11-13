# Green Flux: CRM richieste

Destinazione esclusiva: `1_T3GS1bZUXE_5FQXKOeEd1gOzJmjKoBtiJksfyRGHvw`, scheda **Richieste dal sito**. L'integrazione non accetta un ID foglio dal client e non accede al CRM di altre attività.

La colonna R, **Sopralluogo concordato**, è compilata dal team dopo il ricontatto. Il menu ammette «Sì» e «No». Un campo vuoto indica che l’esito non è stato registrato.

## Configurazione di produzione

- `RESEND_API_KEY`, `QUOTE_FROM_EMAIL`: configurazione email esistente, destinatario fisso `info@green-flux.com`.
- `GREEN_FLUX_CRM_URL`: URL `/exec` della distribuzione Apps Script del file `integrations/google-sheets/Code.gs`.
- `GREEN_FLUX_CRM_SECRET`: segreto casuale di almeno 32 byte, variabile **Secret** di produzione Vercel; lo stesso valore nelle proprietà del progetto Apps Script. Mai in Git, nelle URL o nelle variabili pubbliche.
- `BLOB_STORE_ID`: store **privato**, collegato esclusivamente alla produzione del progetto `green-flux`. L'accesso OIDC non richiede token statici aggiuntivi.

Apps Script deve essere un progetto dedicato Green Flux, con il servizio avanzato **Google Sheets API v4** abilitato (`Sheets`). Configurare il segreto nelle proprietà, distribuire come Web app eseguita dal proprietario e raggiungibile da Vercel. L'endpoint pubblico restituisce solo uno stato di servizio; ogni scrittura richiede HMAC-SHA256 e timestamp entro 5 minuti. Il foglio rimane privato.

Eseguire `installRecoveryTrigger` nel progetto dedicato: crea un controllo ogni 10 minuti. Questo evita dipendenze dai cron frequenti non disponibili sul piano Vercel Hobby. Il trigger chiama `POST /api/crm-retry` con autenticazione server e restituisce solo conteggi.

## Flusso e affidabilità

Tutti i moduli che usano `/api/preventivo` sono coperti: `site-visit`, `contact`, `heat-pump-short`, `heat-pump`, `conditional` e `legacy`. Il modulo breve pompe di calore richiede nome, telefono, comune, riscaldamento attuale e consenso al ricontatto. L'email è facoltativa sia nel browser sia sul server e viene validata quando compilata. Dopo l'accettazione dell'email aziendale, il flusso esistente invia al cliente la conferma di ricezione solo se ha lasciato un indirizzo valido, con riepilogo e possibilità di rispondere a `info@green-flux.com`. Senza email non vengono creati indirizzi sostitutivi: il CRM riceve una stringa vuota e l'endpoint restituisce `confirmationStatus: not_requested`. La conferma usa una chiave di idempotenza distinta dall'email aziendale; un suo errore non annulla la richiesta già ricevuta. La validazione precede ogni registrazione. Il client conserva solo hash del contenuto e UUID per 15 minuti per riutilizzare l'ID in caso di ritentativo/rientro; nessun dato del modulo è messo in URL.

1. Coda privata `staged/<requestId>.json` prima dell'invio; scritture immutabili per preservare il primo tentativo e il corpo Resend.
2. Email a Green Flux con chiave idempotente `greenflux-<requestId>`.
3. Solo dopo un ID Resend confermato, salvataggio `confirmed/<requestId>.json` e scrittura autenticata su Sheets. Conferma al cliente separata: un suo errore non invalida la richiesta.
4. Apps Script acquisisce un lock, cerca l'ID esatto nella colonna O e inserisce una sola riga con un batch atomico Sheets API, compreso l'ID. Se l'ID esiste non modifica stati, note o altri campi commerciali. Rispetta i menu esistenti: servizi fuori catalogo o multipli diventano `Altro`, con i dettagli completi nelle note; `Altre fonti` usa il valore esistente `Altro`. Data nativa e fuso `Europe/Rome`; stringhe protette dall'interpretazione come formule.
5. Una scrittura confermata elimina le copie con recapiti dalla coda. Resta una ricevuta minima, senza recapiti, eliminata dal processo di recupero dopo 30 giorni.

Un errore di Sheets o della coda non blocca un'email confermata. Il trigger recupera sia le registrazioni confermate ancora in coda sia un invio email interrotto entro 23 ore, mantenendo la stessa chiave Resend. Dopo quella finestra un invio email dall'esito ignoto viene spostato in `review/`: non viene reinviato alla cieca dopo la scadenza dell'idempotenza Resend. Richiede controllo dell'originale su Resend. I log contengono solo codici diagnostici e requestId, mai recapiti o segreti.

Se sia la coda sia Sheets non sono disponibili dopo l'invio, il messaggio originale ricevuto e conservato su Resend contiene questionario completo e ID richiesta per il recupero; la data è quella del messaggio Resend. Senza ulteriori prove la fonte del recupero manuale è Non rilevata. Una mancata ricezione dell'email da parte del destinatario resta distinta dall'accettazione API: controllare gli eventi `delivered`/`bounced` nel pannello Resend.

## Recupero manuale di un originale

Verificare destinatario `info@green-flux.com`, contenuto e stato Resend; usare il `requestId` dell'header `Idempotency-Key`. Se un messaggio storico non lo contiene, usare il suo UUID Resend come ID stabile, annotando che si tratta di recupero storico. Non assegnare fonti senza prove.

Un operatore autorizzato può ripassare il record verificato a `node scripts/recover-crm.mjs` tramite stdin, con URL e segreto nell'ambiente. Il record richiede `version:1`, `requestId`, `receivedAt` ISO, `kind`, `name`, `phone`, `email`, `city`, `source`, `campaign`, `service`, `notes`, `entryPage`, `submissionPage`, `evidence` e `resendId`. La stessa deduplicazione viene applicata dal backend. Non conservare JSON di contatti nel repository. In alternativa un operatore può inserire il messaggio originale nel foglio privato dopo aver verificato la colonna O.

## Provenienza e consenso

L'acquisizione è separata dalle conversioni Google Ads e funziona anche nel preventivo incorporato sullo stesso dominio. Dati di attribuzione solo dopo consenso Ads, per una sessione massima di 30 minuti; rifiuto/revoca svuotano la memoria di acquisizione. Il CRM riceve comunque recapiti e richiesta operativa.

- Click ID `gclid`, `gbraid`, `wbraid`, parametri Google `gad_source` o `gad_campaignid` numerici, oppure `utm_source=google` con `utm_medium=cpc/ppc/paidsearch`: Google Ads.
- Nome campagna solo da `utm_campaign`; in sua assenza si registrano gli ID realmente disponibili. Nessuna risoluzione inventata dell'ID al nome.
- Google Maps: UTM espliciti Maps/GBP/GMB o referrer Maps riconoscibile.
- Google organico: UTM organic espliciti o referrer di ricerca identificabile. Il solo dominio Google senza percorso e senza UTM resta **Non rilevata**, perché può avere perso parametri pubblicitari.
- Social, referral e altre fonti: evidenze UTM/referrer disponibili. Diretto indica tecnicamente un ingresso senza referrer o parametri, e può includere link non tracciati.

Se il primo consenso arriva sul preventivo e il referrer della pagina precedente sullo stesso dominio contiene parametri di campagna, il modulo recupera solo i parametri ammessi e il percorso della pagina. Il foglio registra la pagina di ingresso in P e la pagina di invio in Q. Parametri estranei e query di ricerca del referrer non vengono conservati. Senza consenso o con evidenze insufficienti: **Non rilevata**. Nessun dato del modulo è mandato a Google Ads. L'evento di conversione esistente comprende il modulo breve e il quiz pompe di calore: richiede un invio accettato dal backend e consenso pubblicitario, con deduplica per UUID. Gli eventi diagnostici del modulo e dei passaggi del quiz richiedono il consenso Clarity e non sono conversioni primarie. La conferma operativa dell'invio non dipende dal consenso pubblicitario.

## Collaudo

`npm test` comprende test dei moduli, conversioni e CRM; `npm run build` verifica la generazione del sito. Prima di completare l'attivazione, collaudare produzione: contatto generale, preventivo generale, quiz incorporato, recapito Resend, riga e note, ritentativo stesso ID, rifiuto cookie, percorso Ads e riavvio del recupero. Le prove browser in produzione devono rifiutare il consenso Ads per non creare conversioni fittizie: l'attribuzione Ads può essere provata direttamente contro l'API con dati sintetici, senza eseguire tag pubblicitari.

Le righe TEST vengono rimosse dopo la verifica. Non rimuovere contatti reali né cambiare condivisione pubblica, budget o campagne. Non dichiarare attiva un'integrazione non ancora collaudata in produzione.

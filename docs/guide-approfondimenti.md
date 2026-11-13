# Guide di approfondimento (/guide/)

Creato il 13 novembre 2026 sul branch `guide-approfondimenti`. Quindici guide e un indice, aggiunti senza modificare le pagine esistenti. Base di partenza: `claude/ricerca-query-google-2026-11.md` nel progetto (ricerca delle query Google del 13 novembre 2026).

## Inventario prima del lavoro

- Renderer: `scripts/render-site.mjs` genera `public/` da `content/site-content.json` e `templates/`. In produzione Vercel esegue `npm run build`, che rigenera le pagine e la sitemap.
- Pagine indicizzabili (20, in sitemap): home, `/servizi/`, undici pagine servizio, `/servizi/progettazione-e-supporto/`, chi siamo, contatti, preventivo, privacy, cookie, termini.
- Pagine escluse di proposito (noindex, fuori sitemap): `/landing/pompe-calore/`, `/landing/pompe-calore-video/`, `/landing/ristrutturazione/`, `/landing/ristrutturazione-video/`, `/thank-you/`.
- 132 URL storici con reindirizzamento permanente, tra cui `/blog/…`: per questo le guide stanno sotto `/guide/`, route libera.
- `public/privacy-policy/index.html` nel repository è più vecchio del suo template: a ogni render cambia. Non dipende da questo lavoro e non è stato incluso nel commit.

## Come sono fatte

- Contenuti: `content/guides/<slug>.html`. In testa un commento con i metadati in JSON (titolo, description, FAQ, fonti, collegamenti), poi il corpo in HTML.
- Renderer: `scripts/render-guides.mjs`, chiamato da `render-site.mjs`. Usa `page()` e `write()` delle pagine interne: stesso header, footer, CTA, consenso e misurazione.
- Stile: `public/assets/css/guides.css`, solo classi `gd-`, caricato soltanto dalle guide.
- Una guida con `"status": "draft"` non viene generata, collegata né inserita nella sitemap.
- Modifiche a file esistenti: sei righe in `scripts/render-site.mjs` (import, registrazione delle route, chiamata al renderer), `public/sitemap.xml` (16 URL aggiunte), `docs/content-audit.json` (16 voci aggiunte dal renderer).

Per aggiungere una guida: creare il file in `content/guides/`, eseguire `npm run render` e `npm test`. Per aggiornare regole o prezzi: modificare testo, fonti e campo `updated`.

## Mappa degli argomenti

| Guida | Ricerca principale e varianti | Bisogno | Evidenza | Pagina esistente più vicina | Perché una pagina autonoma |
| --- | --- | --- | --- | --- | --- |
| `/guide/costo-pompa-di-calore/` | pompa di calore prezzo; quanto costa una pompa di calore; costo per 100/200 mq | Ordine di grandezza della spesa | Ads: 212 termini, 120 clic; KP Padova 140 + 50 | `/servizi/pompe-calore/` (nessuna cifra) | La landing è corta e orientata al modulo; qui fasce con fonte, voci e variabili |
| `/guide/preventivo-pompa-di-calore/` | preventivo pompa di calore; preventivo installazione | Confrontare offerte | KP Padova 10; suggerimenti Google | `/servizi/pompe-calore/` | Chi ha già un’offerta ha bisogno di una lista di controllo, non del prezzo |
| `/guide/incentivi-pompa-di-calore/` | conto termico 3.0 pompa di calore; bonus pompe di calore 2026/2027 | Quale incentivo e quanto | Ads: 31 termini; KP Italia 880, +81% | FAQ pagamento della landing | Confronto, requisiti e stato delle regole 2027 |
| `/guide/pompa-di-calore-termosifoni/` | pompa di calore per termosifoni; ghisa; 70 gradi | Compatibilità con l’impianto | Ads: 86 termini, 77 clic; KP Padova 170 | Una FAQ della landing | Il dubbio più cliccato senza risposta estesa |
| `/guide/sostituire-caldaia-con-pompa-di-calore/` | sostituire caldaia con pompa di calore; al posto della caldaia | Che lavori servono | Ads: 33 termini, 17 clic; domande Google | `/servizi/pompe-calore/`, `/servizi/caldaie/` | Verifiche, lavori e cambiamenti d’uso |
| `/guide/pompa-di-calore-appartamento-condominio/` | pompa di calore appartamento; condominio; senza unità esterna | Si può, e a quali regole | Ads: 10 termini; suggerimenti | Una FAQ della landing | Vincoli e convenienza diversi dalla casa singola |
| `/guide/potenza-pompa-di-calore/` | quanti kW per 100 mq; pompa di calore 12 kW | Scegliere la taglia | Ads: 90 termini con mq o kW | Nessuna | Risponde alle ricerche per metratura senza una pagina per superficie |
| `/guide/pompa-di-calore-conviene/` | pompa di calore conviene; svantaggi; quando non conviene | Decidere se ha senso | Domande Google su 3 ricerche su 10 | Nessuna | Criteri e limiti, anche contrari alla vendita |
| `/guide/consumi-pompa-di-calore/` | pompa di calore quanto consuma; consumi | Stimare la bolletta | KP Italia 1.000; domande Google | Nessuna | Metodo di calcolo con le proprie bollette |
| `/guide/caldaia-a-condensazione-o-pompa-di-calore/` | pompa di calore o caldaia a condensazione; caldaia ibrida | Scegliere il generatore | Primo suggerimento Google per “pompa di calore o”; KP caldaia a condensazione prezzo Padova 170 | `/servizi/caldaie/` | Confronto tra due servizi offerti |
| `/guide/pompa-di-calore-e-fotovoltaico/` | pompa di calore senza fotovoltaico; fotovoltaico con pompa di calore padova | Serve il fotovoltaico? | GSC: posizione 1,6; KP Padova 30 | FAQ nelle pagine servizio | Unisce i due candidati “con” e “senza” fotovoltaico |
| `/guide/fotovoltaico-con-accumulo/` | fotovoltaico con accumulo; conviene accumulo o senza | Batteria sì o no | KP Padova 50, Italia 2.900 | `/servizi/fotovoltaico/` (una FAQ) | Decisione distinta dopo la fine dello scambio sul posto |
| `/guide/installazione-condizionatore/` | installazione climatizzatore fai da te; detrazione; costo | Chi può installare, cosa comprende | KP Italia 1.300; suggerimenti | `/servizi/climatizzazione/` | Obblighi e documenti, non trattati nel servizio |
| `/guide/ventilazione-meccanica-controllata/` | VMC puntuale; pro e contro; muffa | Quale impianto, e la muffa | KP Padova 140, Italia 8.100 | `/servizi/ventilazione/` | Confronto e limiti rispetto alla muffa |
| `/guide/impianti-in-ristrutturazione/` | ristrutturazione casa da dove iniziare; ordine lavori | Impostare gli impianti | Suggerimenti Google; KP “quanto costa ristrutturare casa” Padova 40 | `/servizi/impianti-completi/` | Sequenza e predisposizioni; nessun prezzo |

Le evidenze Ads descrivono ciò che la campagna ha intercettato in trenta giorni, non la domanda organica; i gruppi si sovrappongono. I volumi sono stime per la provincia di Padova.

## Argomenti accorpati

- Costi per metratura (80, 100, 120, 150, 200 mq): una sezione nella guida sul costo e la guida sulla potenza. Nessuna pagina per superficie.
- Ghisa, alluminio, 70 gradi, alta temperatura: guida sui termosifoni.
- “Con” e “senza” fotovoltaico: una guida sola.
- Rumore e posizione dell’unità esterna: guide su condominio e sostituzione.
- Acqua calda e raffrescamento: guida sulla sostituzione e FAQ.
- Come funziona una pompa di calore: ricerca informativa, già coperta dal video della landing; i concetti utili sono nelle guide su consumi e potenza.
- Sistemi ibridi: trattati come alternativa nelle guide su termosifoni e caldaia, senza pagina commerciale.

## Bozze e argomenti sospesi

| Argomento | Stato | Che cosa serve |
| --- | --- | --- |
| Modelli Bosch installati | Bozza non generata: `content/guides/pompe-di-calore-bosch.html` | Elenco dei modelli proposti, criteri di scelta, garanzia ed estensione, centro assistenza, autorizzazione all’uso del marchio |
| Prezzo “a partire da” Green Flux | Non scritto | Cifra e casa di esempio approvate dall’azienda |
| Costo di un impianto fotovoltaico | Non scritto | Fonte primaria aggiornata per i prezzi oppure fasce approvate dall’azienda |
| Costo di installazione di un condizionatore | Non scritto | Come sopra |
| Sistema ibrido come servizio | Non scritto | Conferma che l’azienda lo propone e con quali prodotti |
| Scaldacqua a pompa di calore | Non scritto | Conferma che è un incarico offerto |
| Ristrutturazione del solo bagno | Non scritto | Conferma che l’azienda accetta questo incarico |
| Pagina commerciale ristrutturazioni | Non scritta | Le landing esistenti restano nascoste; mancano referente, garanzie e zona |

## Affermazioni aziendali usate e loro origine

Tutte già presenti sul sito alla data del lavoro: sopralluogo e preventivo pompe di calore gratuiti e senza impegno; cifra scritta e bloccata; richiamo entro 2 ore lavorative; pratica dell’incentivo compresa; sconto in fattura con il Conto Termico se la pratica lo consente; idraulica ed elettrica della stessa squadra; marca Bosch con assistenza del produttore; sede a Padova e verifica della zona al primo contatto. Per gli altri servizi le guide usano la formula della pagina contatti, senza “gratuito”. Non compaiono prezzi Green Flux, raggio di 35 km, garanzie estese, numero di lavori eseguiti.

## Verifiche

- `npm run render`: 36 pagine canoniche; tutti i file già presenti in `public/` identici byte per byte al render precedente; `vercel.json` e `content/redirects.json` invariati.
- `npm test`: 5 test nuovi (`tests/guides.test.mjs`) superati. Restano i 7 esiti negativi già presenti prima del lavoro: 6 file che richiedono `@vercel/blob`, non installabile in questo ambiente, e il test editoriale di `company-content.test.mjs`, che già falliva su `/landing/pompe-calore-video/`.
- Quel test editoriale vieta “Conto Termico”, “Ecobonus” e altri termini fuori da sezioni approvate: segnalerebbe anche le guide sugli incentivi. Non è stato modificato; va aggiornato se si conferma la nuova linea editoriale.
- Browser: 16 pagine a 1366 e 390 px senza scorrimento orizzontale, errori in console o ancore rotte. I collegamenti di contatto portano a `/preventivo/?servizio=…` senza inviare dati.
- `npm run build` non è stato eseguito: richiede esbuild e purgecss, non installabili qui. La sitemap in `public/` è stata rigenerata con la stessa logica di `scripts/build.mjs`.

## Limiti e passi successivi

- Le guide non sono collegate da menu, footer o pagine esistenti: per ora si raggiungono dalla sitemap e tra loro. Per farle trovare e pesare servono collegamenti dalle pagine servizio e una voce nel footer; non applicati in questa fase.
- Incentivi 2027: aggiornare `incentivi-pompa-di-calore` e le guide che la citano quando la legge di bilancio sarà approvata.
- Metriche da osservare in Search Console dopo la pubblicazione: pagine `/guide/` indicizzate; query non legate al nome con impressioni; posizione media per le ricerche della tabella; clic; richieste arrivate da sessioni che hanno visitato una guida.

# Green Flux

Sito statico multipagina Green Flux. La migrazione del 15 settembre 2026 riprende
le 137 pagine pubbliche collegate di https://venetagreen.it/, con struttura delle
sezioni, testi, stile, immagini, FAQ, guide, pagine locali e percorso preventivo.
Il riferimento è stato scaricato direttamente dal sito corrente, perché alcune
copie indicizzate mostravano contenuti precedenti.

Sono state aggiunte 12 pagine per i servizi specifici Green Flux, per un totale
di 149 pagine: smart home, solare termico, biomassa, caldaie, ventilazione,
trattamento acqua, impianti completi, progettazione, pratiche e permessi,
diagnosi energetiche, detrazioni fiscali e formule assicurative.

## Anteprima che si aggiorna automaticamente

```sh
npm ci
npm run dev
```

Aprire http://localhost:3000. Il server locale serve i sorgenti in `public/` e
ricarica le pagine quando cambiano i file, senza una build manuale. Non salva né
trasmette risposte del modulo. Il server ascolta solo sull'interfaccia locale.

## Build e controlli

```sh
npm test
npm run build
```

La build copia il sito in `dist/`, comprime i fogli CSS, raggruppa i moduli
JavaScript condivisi e genera la sitemap di tutte le pagine. Node.js 22 o
successivo è consigliato. I test verificano il catalogo, le destinazioni dei
link, le risorse, la sequenza delle sezioni aggiunte, i sei passaggi del
preventivo, la validazione, i riepiloghi e l'endpoint email con invii simulati.

## Pubblicazione

- Repository: https://github.com/thinhdutong00/Green-flux
- Produzione Vercel: https://green-flux-nine.vercel.app
- Progetto Vercel: https://vercel.com/thinhdutong00s-projects/green-flux

Il push su `main` avvia la pubblicazione Vercel. Le pagine pubblicate si aggiornano
al completamento del deploy; la ricarica automatica durante le modifiche locali
è disponibile su `localhost:3000`.

È disponibile anche una pubblicazione privata Sites dello stesso sorgente;
`.openai/hosting.json` identifica il progetto e l'output statico. La pubblicazione
Sites è una versione salvata e va aggiornata dopo le modifiche.

La manutenzione è **disattivata** in `maintenance.mjs`. Per attivarla, impostare
`maintenanceEnabled = true` e pubblicare. Il middleware mantiene il blocco HTTP
503 sulle pagine e sulle API, lasciando disponibili le risorse grafiche.

## Dove modificare

- `public/index.html`: home e sezioni del riferimento.
- `public/servizi/`: catalogo e 20 pagine di servizio.
- `public/chi-siamo/`, `public/metodo/`, `public/contatti/`, `public/progetti/`:
  pagine aziendali e percorsi collegati.
- `public/blog/`, `public/zone/`: guide e pagine territoriali importate.
- `public/preventivo/index.html`: percorso in sei passaggi del riferimento.
- `public/preventivo/wizard.mjs`: navigazione, preselezioni e riepilogo.
- `public/preventivo/funnel-data.mjs`: dati e validazione del nuovo percorso.
- `public/preventivo/data.mjs`: catalogo condiviso e compatibilità con il vecchio
  schema dell'endpoint email.
- `public/assets/js/site.js`: menu e FAQ del riferimento.
- `public/assets/js/green-flux.mjs`: contatti e compatibilità con le vecchie ancore.
- `public/assets/js/handoff.mjs`: riepilogo, copia e apertura email/WhatsApp.
- `public/assets/css/site.css`: stili del riferimento.
- `public/assets/css/green-flux.css`: adattamenti al logo e al flusso Green Flux.
- `content/green-flux-services.json`: contenuti strutturati delle 12 pagine aggiunte.

I file HTML sono i sorgenti pubblicati e sono modificabili direttamente. Gli
script Python sono strumenti della migrazione, non dipendenze della build.
`import-reference.py` richiede un archivio locale delle pagine autorizzate e
BeautifulSoup; `generate-services.py` usa il modello della pagina pompe di calore
per rigenerare le pagine aggiunte dal JSON (sovrascrivendo quelle pagine).

## Preventivo e contatti

I passaggi sono: servizio, immobile, consumi, spazi, tempistiche, contatti.
Tutti i 20 servizi sono selezionabili. I collegamenti delle pagine servizio
aprono `/preventivo/?servizio=ID` con l'opzione corretta già selezionata.
Le vecchie preselezioni restano supportate.

Il sito mantiene la consegna tramite riepilogo già prevista nel progetto:
il cliente apre email o WhatsApp e conferma l'invio nell'app scelta. Preparare
il riepilogo non viene presentato come un invio completato. Le risposte restano
in memoria nella pagina e non vengono salvate in cookie o storage persistente.
Email e WhatsApp usano esclusivamente `info@green-flux.com` e `+39 375 552 1420`.

L'endpoint Vercel opzionale `api/preventivo.mjs` conserva lo schema precedente.
Per usarlo occorrono `RESEND_API_KEY` e `QUOTE_FROM_EMAIL` sul server e un
collegamento esplicito del nuovo client: il nuovo wizard è in modalità riepilogo.
Non sono stati copiati endpoint CRM, strumenti pubblicitari, account di analisi,
identificativi fiscali o destinatari di VenetaGreen.

## Adattamenti aziendali

Logo e recapiti sono Green Flux. La storia aziendale del riferimento non è stata
attribuita a Green Flux: viene indicata l'esperienza dei tecnici dichiarata sul
sito aziendale. Le recensioni nominative VenetaGreen sono sostituite, nello stesso
componente grafico, con i servizi e punti di forza verificati Green Flux. Le
immagini illustrative mantengono la relativa indicazione e non vengono presentate
come fotografie di cantieri Green Flux. Le pagine locali richiedono conferma della
disponibilità dell'intervento. Le pagine legali rinviano alle informative Green
Flux esistenti e descrivono il funzionamento effettivo dei moduli.

Provenienza e inventario: `ASSET_SOURCES.md` e `docs/reference-import.json`.

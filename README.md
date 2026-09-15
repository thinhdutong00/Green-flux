# Green Flux

Sito statico multipagina Green Flux, con 149 pagine. Struttura visiva e percorsi
riprendono il riferimento VenetaGreen; le informazioni aziendali sono state
riallineate integralmente a https://www.green-flux.com/ il 15 settembre 2026.

La homepage mantiene il design Green Flux e le pompe di calore in evidenza.
Il catalogo propone i campi d'intervento e i servizi dichiarati dall'azienda:
17 voci nel preventivo, contando separatamente fotovoltaico casa e azienda e
aggiungendo la consulenza. Le tre vecchie voci non documentate come offerte
specifiche sono diventate percorsi di consulenza o progettazione degli impianti.

Le pagine locali chiedono conferma della disponibilità; la sezione Interventi
presenta gli ambiti impiantistici. Le guide aiutano a preparare la richiesta,
senza risultati, prezzi o incentivi copiati da altre aziende.

L'header desktop riprende quello di VenetaGreen. Il menu mobile, il design della
home, la palette petrolio/lime e i footer interni bianchi sono conservati.
Fonte, criteri e inventario della revisione: `docs/content-review.md` e
`docs/content-audit.json`.

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

- `public/index.html`: homepage Green Flux con focus sulle pompe di calore.
- `public/styles.css`, `public/script.js`: design e interazioni della sola home.
- `public/servizi/`: catalogo e 20 pagine di servizio/consulenza.
- `public/chi-siamo/`, `public/metodo/`, `public/contatti/`, `public/progetti/`:
  pagine aziendali e percorsi collegati.
- `public/blog/`, `public/zone/`: guide al progetto e richieste per località.
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
- `public/assets/css/brand.css`: palette comune, pulsanti, pannelli e footer.
- `public/assets/css/desktop-header.css`: header desktop condiviso con la home.
- `content/green-flux-profile.json`: fonte e informazioni aziendali confermate.
- `content/service-pages.json`, `content/editorial-pages.json`: testi verificati.
- `scripts/align-green-flux-content.py`: applicazione dei contenuti alle pagine.
- `content/green-flux-services.json`: sottoinsieme dei servizi aggiunti, allineato al modello corrente.

I file HTML sono i sorgenti pubblicati e sono modificabili direttamente. Gli
script Python sono strumenti della migrazione, non dipendenze della build.
`import-reference.py` richiede un archivio locale delle pagine autorizzate e
BeautifulSoup; `align-green-flux-content.py` applica i contenuti verificati alle strutture
attuali. `generate-services.py` richiama questa procedura. Non rieseguire
l’importazione storica per aggiornare le informazioni aziendali.

## Preventivo e contatti

I passaggi sono: servizio, immobile, consumi, spazi, tempistiche, contatti.
Le 17 voci verificate del catalogo sono selezionabili. I collegamenti delle pagine servizio
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

## Libreria immagini

Le foto importate da VenetaGreen sono sostituite con 13 immagini illustrative
originali, salvate in `public/assets/images/` in tre risoluzioni WebP ciascuna.
Le immagini provenienti dal sito originale Green Flux restano in `public/assets/`.
Le icone condivise sono in `public/assets/icons/`, con la relativa licenza Lucide.

`docs/image-replacements.md` documenta soggetti, file finali e prompt.
`content/image-replacements.json` conserva la mappa completa dei vecchi URL e
le dimensioni effettive dei nuovi file. La migrazione una tantum è documentata
in `scripts/replace-reference-images.py`; non va eseguita durante la build.

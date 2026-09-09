# Green Flux

Home page Green Flux, ricostruita con i contenuti e le immagini del sito originale
e pubblicata automaticamente tramite GitHub e Vercel.

Il design riprende il riferimento fornito in `Zakka-dental-landing (1).zip`:
barra di navigazione sospesa, hero a tutta larghezza, titoli in Plus Jakarta Sans,
schede fotografiche arrotondate e pannelli dei servizi. La palette rimane Green
Flux: verde petrolio `#193e40`, verde scuro `#123335` e lime `#d5ed90`.

- Repository pubblico: https://github.com/thinhdutong00/Green-flux
- Sito: https://green-flux-nine.vercel.app
- Progetto Vercel: https://vercel.com/thinhdutong00s-projects/green-flux

## Struttura

- `public/index.html`: home in italiano con azienda, dieci campi di intervento,
  cinque servizi chiavi in mano e contatti.
- `public/styles.css`: stile e layout per desktop, tablet e smartphone.
- `public/script.js`: menu mobile accessibile e aggiornamento dell’anno.
- `public/assets/`: logo e fotografie originali; font e licenza in `assets/fonts/`.
- `public/robots.txt`: esclude questa versione di anteprima dai motori di ricerca.
- `vercel.json`: pubblica la cartella `public` con il preset Vercel **Other**.
- `ASSET_SOURCES.md`: provenienza dei contenuti e delle immagini.

## Anteprima locale

Esegui dalla cartella del progetto:

```sh
python3 -m http.server 3000 --directory public
```

Visita http://localhost:3000.

## Pubblicazione

Il progetto non richiede dipendenze, compilazione o variabili d'ambiente.
Il repository è importato nel progetto Vercel `green-flux`: i push su `main`
aggiornano il sito di produzione; gli altri branch possono generare anteprime.

La home mantiene `noindex, nofollow` finché è usata come anteprima sul dominio
Vercel. Quando sostituirà il sito definitivo, rimuovi il meta tag da
`public/index.html` e aggiorna `public/robots.txt`.

I pulsanti di consulenza e le schede dei campi di intervento aprono il client
email con destinatario e oggetto precompilati. Il numero di telefono è cliccabile.
Non sono presenti form di raccolta dati, tracker o dipendenze esterne a runtime.

Non inserire credenziali nei file versionati: `.env*` e `.vercel/` sono esclusi
dal repository.

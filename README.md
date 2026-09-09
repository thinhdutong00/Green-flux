# Green Flux

Pagina iniziale statica del progetto Green Flux, collegata a GitHub e Vercel.

- Repository pubblico: https://github.com/thinhdutong00/Green-flux
- Sito: https://green-flux-nine.vercel.app
- Progetto Vercel: https://vercel.com/thinhdutong00s-projects/green-flux

## Struttura

- `public/index.html`: pagina iniziale in italiano, adattabile a desktop e mobile.
- `public/robots.txt`: esclude la pagina provvisoria dai motori di ricerca.
- `vercel.json`: pubblica la cartella `public` con il preset Vercel **Other**.

## Anteprima locale

Apri `public/index.html` nel browser oppure esegui dalla cartella del progetto:

```sh
python3 -m http.server 3000 --directory public
```

Visita http://localhost:3000.

## Pubblicazione

Il progetto non richiede dipendenze, compilazione o variabili d'ambiente.
Il repository è importato nel progetto Vercel `green-flux`: i push su `main`
aggiornano il sito di produzione; gli altri branch possono generare anteprime.

Quando il sito definitivo è pronto, rimuovi il meta tag `noindex, nofollow`
da `public/index.html` e aggiorna `public/robots.txt`.

Non inserire credenziali nei file versionati: `.env*` e `.vercel/` sono esclusi
dal repository.

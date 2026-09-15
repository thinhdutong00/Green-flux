# Performance del sito Green Flux

## Interventi del 15 settembre 2026

- Build con CSS selezionato per ciascuna delle 19 pagine e inserito nel documento: nessun foglio di stile blocca il primo rendering con una richiesta aggiuntiva.
- Tutti gli script del browser, inclusa la home, sono compilati e minificati. Gli URL includono un hash del contenuto per aggiornare correttamente la cache.
- Foto responsive AVIF, con gli stessi scatti e le stesse dimensioni delle versioni WebP di fallback. Candidato da 768 px per la foto della pompa di calore su mobile; sfondo del preventivo ridotto a 960 px su mobile.
- Logo WebP senza perdita di qualità e dimensioni intrinseche corrette.
- Contenuto principale della home subito visibile. Contatto WhatsApp disponibile subito; il messaggio di aiuto appare al passaggio del puntatore o al focus.
- Redirect permanenti dei 132 vecchi percorsi generati con e senza slash finale.

I risparmi CSS per pagina sono in `performance-build.json`, rigenerato da `npm run build`. `scripts/encode-images.py` genera gli asset con Pillow dotato di AVIF; le immagini sono già versionate, quindi la pubblicazione richiede soltanto Node.js.

## Verifica

Lighthouse 13.4.1, Chrome headless, impostazioni mobile standard (rete e CPU simulate) e preset desktop; tutte e quattro le categorie. I risultati sono misurazioni di laboratorio, non dati CrUX raccolti dagli utenti. Rete, server e versione di Lighthouse possono produrre punteggi diversi tra esecuzioni.

Prima delle ottimizzazioni, sull'URL pubblico:

| Pagina | Prestazioni mobile | Accessibilità | Buone pratiche | SEO |
| --- | ---: | ---: | ---: | ---: |
| Home | 96 | 100 | 96 | 100 |
| Smart Home | 100 | 100 | 100 | 100 |
| Preventivo | 92 | 100 | 100 | 100 |

Controllati geometria, caratteri e colori delle 19 pagine a 390 e 1440 px; menu mobili, FAQ, sei passaggi del preventivo e riepilogo senza invii esterni. `npm test`: 14 test superati.

Per replicare una misurazione pubblica:

```sh
npx lighthouse https://green-flux-nine.vercel.app/ --chrome-flags="--headless" --output=html --output-path=./lighthouse-home.html
npx lighthouse https://green-flux-nine.vercel.app/ --preset=desktop --chrome-flags="--headless" --output=html --output-path=./lighthouse-home-desktop.html
```

Per PageSpeed Insights usare `https://green-flux-nine.vercel.app/` o il percorso da verificare. L'anteprima Sites mantiene l'accesso riservato del progetto e può richiedere l'autenticazione al visitatore.

# Green Flux

Sito statico con **19 pagine**, organizzato sui 10 ambiti impiantistici e sui
5 servizi di supporto dichiarati da [Green Flux](https://www.green-flux.com/).
La home conserva il design e il focus sulle pompe di calore.

## Struttura

- Home e catalogo impianti.
- Dieci pagine: pompe di calore, fotovoltaico, condizionatori, caldaie, biomassa,
  solare termico, ventilazione, trattamento acqua, smart home e impianti completi.
- Progettazione e supporto: cinque sezioni distinte nella stessa pagina.
- Chi siamo, contatti e preventivo.
- Privacy, cookie e termini.

Le 91 pagine territoriali, le guide ripetitive e le gallerie illustrative sono
accorpate alle pagine pertinenti. **132 URL precedenti** hanno reindirizzamenti
permanenti. Sitemap e navigazione includono soltanto le pagine effettive.

## Gestire i contenuti

- `content/site-content.json`: fonte unica per testi servizio, FAQ, criteri di
  scelta, immagini, collegamenti e cinque servizi di supporto.
- `content/green-flux-profile.json`: informazioni aziendali verificate.
- `templates/`: home, header, menu mobile, form, CTA e pagine legali.
- `scripts/render-site.mjs`: genera HTML, footer, menu, catalogo e reindirizzamenti.
- `content/previous-routes.json`: inventario storico per conservare i vecchi link.
- `content/image-dimensions.json`: dimensioni reali degli asset disponibili.

Gli HTML in `public/`, il catalogo del preventivo e il modulo del menu mobile sono
**generati**: le modifiche vanno fatte nei contenuti e nei template. Gli script
Python di allineamento richiamano lo stesso renderer Node. BeautifulSoup non è
necessario per la build. L’importatore storico non va eseguito sul sito corrente.

## Sviluppo

```sh
npm ci
npm run dev
```

Anteprima su `http://localhost:3000`, con rigenerazione e ricarica automatica per
modifiche a contenuti e template. Il server ascolta soltanto in locale.

```sh
npm run render
npm test
npm run build
```

La build rigenera le pagine, copia gli asset in `dist/`, comprime CSS/JavaScript
condivisi e produce la sitemap. I test coprono catalogo, richieste, validazione,
link, asset e accorpamento degli URL.

## Design e immagini

- `public/styles.css`, `public/script.js`: home.
- `public/assets/css/editorial.css`: impaginazione dei contenuti interni.
- `public/assets/css/brand.css`: palette petrolio/lime comune.
- `public/assets/css/desktop-header.css`: header desktop.
- `public/assets/js/mobile-header.mjs`: comportamento del menu mobile.
- `public/assets/images/`: immagini illustrative originali in WebP.

Le foto importate da VenetaGreen sono rimosse. Fonti, immagini e licenze sono in
`ASSET_SOURCES.md` e `docs/image-replacements.md`.

## Richieste e pubblicazione

Il preventivo include 10 impianti, 5 servizi e l’opzione consulenza. La scelta
dell’immobile distingue abitazioni e aziende; il fotovoltaico è un solo servizio.
Il modulo prepara un riepilogo: il cliente completa l’invio in email o WhatsApp.
Destinatari: `info@green-flux.com` e `+39 375 552 1420`. Nessun salvataggio dei dati
in cookie o storage persistente. L’endpoint email opzionale resta disponibile
per una futura integrazione, con configurazione server richiesta.

- Repository: https://github.com/thinhdutong00/Green-flux
- Sito Vercel: https://green-flux-nine.vercel.app
- Sito privato Sites: https://green-flux-progetto.thinh-dutong00.chatgpt.site

Il push su `main` pubblica su Vercel. Sites richiede la pubblicazione della versione
salvata nel progetto indicato in `.openai/hosting.json`. Reindirizzamenti:
`vercel.json`, `public/_redirects` e server locale. La build pubblica direttamente
le pagine del sito, senza una schermata di manutenzione.
Criteri editoriali: `docs/content-review.md`.

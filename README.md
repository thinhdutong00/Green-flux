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
Il quiz pompe di calore, il preventivo generale e il modulo contatti inviano a
`/api/preventivo`. Tutte le compilazioni valide portano a `/thank-you/`, anche
quando il quiz si trova nella finestra della landing. Una richiesta accettata
conferma la ricezione: Green Flux ricontatta il richiedente e concorda il sopralluogo
dopo un primo confronto, senza promettere tempi. Se l’invio diretto non è disponibile,
la stessa pagina si apre con `#completa-invio` e permette di inviare il riepilogo
già compilato via email o WhatsApp, senza dichiarare che sia già stato ricevuto.
I dati non sono inseriti nell’URL: il riepilogo è trasferito in sessionStorage
nella stessa scheda per un massimo di 15 minuti, con scadenza e pulizia alla
successiva lettura o durante la permanenza nella thank-you page. La navigazione
funziona anche quando lo storage è disabilitato, mostrando i contatti diretti.
La pagina è accessibile per anteprima ma esclusa dall’indicizzazione e dalla sitemap.

L’invio diretto richiede **`RESEND_API_KEY`** e **`QUOTE_FROM_EMAIL`** nelle variabili
server di Vercel. Il mittente deve essere verificato presso Resend. Non inserire
chiavi nei sorgenti o nelle variabili pubbliche. `GET /api/preventivo` restituisce
`{ available: true/false, customerConfirmation: true/false }` per verificare la
presenza della configurazione, senza inviare messaggi. Il destinatario della
richiesta è fisso: `info@green-flux.com`. Dopo l’accettazione dell’invio, se il
cliente ha lasciato un’email valida, riceve una conferma con tutti i dati della
richiesta. Nel modulo breve pompe di calore l’email è facoltativa: senza indirizzo
non viene inviata alcuna conferma al cliente e la cella email nel CRM resta vuota. La conferma include HTML e testo
semplice e consente di rispondere a `info@green-flux.com`. Le due email hanno
chiavi di idempotenza distinte per evitare duplicati durante i tentativi ripetuti.
Un errore della sola conferma non annulla una richiesta già accettata: la risposta
mantiene `accepted: true` e la ricevuta di conversione, con `confirmationStatus`
pari a `sent`, `not_requested` o `failed`. I log degli errori non includono i dati
personali del cliente. La conferma viene gestita dall’endpoint comune dei moduli
contatti, preventivo generale e quiz pompe di calore, inclusi i quiz nelle landing.
Alternativa WhatsApp: `+39 375 552 1420`. Nessun salvataggio dei dati in cookie o
storage persistente del browser. Il sito privato Sites è statico: l’endpoint
server è eseguito dal deploy Vercel del dominio pubblico.

- Repository: https://github.com/thinhdutong00/Green-flux
- Sito Vercel: https://green-flux-nine.vercel.app
- Sito privato Sites: https://green-flux-progetto.thinh-dutong00.chatgpt.site

Il push su `main` pubblica su Vercel. Sites richiede la pubblicazione della versione
salvata nel progetto indicato in `.openai/hosting.json`. Reindirizzamenti:
`vercel.json`, `public/_redirects` e server locale. La build pubblica direttamente
le pagine del sito, senza una schermata di manutenzione.
Criteri editoriali: `docs/content-review.md`.

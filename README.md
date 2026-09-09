# Green Flux

Home page Green Flux, ricostruita con i contenuti e le immagini del sito originale
e pubblicata automaticamente tramite GitHub e Vercel.

Il design riprende il riferimento fornito in `Zakka-dental-landing (1).zip`:
barra di navigazione sospesa, hero a tutta larghezza, titoli in Plus Jakarta Sans,
schede fotografiche arrotondate e pannelli dei servizi. La palette rimane Green
Flux: verde petrolio `#193e40`, verde scuro `#123335` e lime `#d5ed90`.

L’header si allarga in cima alla pagina su desktop, scorre fuori durante la
discesa e rientra risalendo. Il menu mobile riprende il riferimento Federzoni
Granata: pannello a tutto schermo, sezioni espandibili e contatti sempre a portata
di mano. Usa un dialogo nativo per gestire focus, tastiera e sfondo inattivo;
le animazioni rispettano la preferenza di movimento ridotto.

Il pulsante WhatsApp fisso in basso a destra riprende dimensioni, animazioni,
messaggi e tempi del riferimento: compare dopo 5 secondi, mostra i messaggi
a 8 e 18 secondi e richiude il fumetto a 28 secondi. Apre la chat al numero
Green Flux `+39 375 552 1420` con un testo precompilato. Misura 64 px su desktop
e 58 px fino a 620 px di larghezza; si nasconde mentre il menu mobile è aperto.

- Repository pubblico: https://github.com/thinhdutong00/Green-flux
- Sito: https://green-flux-nine.vercel.app
- Progetto Vercel: https://vercel.com/thinhdutong00s-projects/green-flux

## Struttura

- `public/index.html`: home in italiano con azienda, dieci campi di intervento,
  cinque servizi chiavi in mano e contatti.
- `public/styles.css`: stile e layout per desktop, tablet e smartphone.
- `public/script.js`: header sensibile allo scroll, menu mobile e aggiornamento dell’anno.
- `public/preventivo/`: modulo a sei passaggi, catalogo servizi, validazione e modalità di invio.
- `api/preventivo.mjs`: invio email opzionale tramite Resend, da attivare con le variabili server.
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

La home e il modulo in modalità riepilogo non richiedono dipendenze, compilazione o variabili d'ambiente.
Il repository è importato nel progetto Vercel `green-flux`: i push su `main`
aggiornano il sito di produzione; gli altri branch possono generare anteprime.

La home mantiene `noindex, nofollow` finché è usata come anteprima sul dominio
Vercel. Quando sostituirà il sito definitivo, rimuovi il meta tag da
`public/index.html` e aggiorna `public/robots.txt`.

I pulsanti di preventivo aprono `/preventivo/`. Le dieci schede degli impianti e
i cinque servizi pre-selezionano la relativa opzione tramite `?servizio=ID`.
Email, telefono e pulsante WhatsApp rimangono disponibili come contatti diretti.
Non sono presenti tracker; le risposte del modulo non sono salvate in cookie,
localStorage o sessionStorage.

## Modulo preventivo

Il riferimento è `https://venetagreen.it/preventivo/`: sfondo fotografico scuro,
scheda chiara, opzioni selezionabili, barra di avanzamento e sei passaggi.
La palette e il font rimangono Green Flux. Il catalogo include tutti i dieci
impianti e cinque servizi della home, più la consulenza.

Il percorso raccoglie servizi, immobile, tipo di intervento, spazi, tempistiche
e contatti. I consumi sono facoltativi e compaiono per i servizi energetici;
le opzioni degli spazi cambiano in base alla selezione. Il riepilogo permette
di modificare le risposte; nome, comune, un recapito e privacy sono obbligatori.

La modalità attuale è `handoff` in `public/preventivo/delivery.mjs`: il cliente
apre il riepilogo nell’email indirizzata a `info@green-flux.com` oppure in WhatsApp
al `+39 375 552 1420`, quindi completa l’invio nell’app. Può anche copiare il testo.
Il sito indica chiaramente che preparare il riepilogo non equivale a inviarlo.

### Invio automatico opzionale

L’endpoint Vercel è predisposto per [Resend](https://resend.com/docs/api-reference/emails/send-email).
Prima di cambiare la modalità in `server`, configurare sul progetto Vercel:

- `RESEND_API_KEY`: una chiave del servizio di invio.
- `QUOTE_FROM_EMAIL`: un mittente su un dominio verificato in Resend.

Il destinatario server è fissato a `info@green-flux.com`; il client non può
modificarlo. Le credenziali non vanno inserite nei file pubblici o versionati.
L’endpoint valida di nuovo i dati, applica controlli antispam di base e usa
una chiave idempotente per evitare doppie email quando si ritenta l’invio.
Il limite di frequenza in memoria vale per istanza: un limite globale richiede
una regola Vercel dedicata. Nessuna richiesta di test è inviata a indirizzi reali.
Il browser mostra conferma solo dopo l’accettazione del servizio email e, in caso
di errore, conserva le risposte e propone i canali diretti.

Per eseguire i controlli del catalogo, della validazione e dell’endpoint senza
inviare messaggi reali: `node --test tests/preventivo.test.mjs`.

Non inserire credenziali nei file versionati: `.env*` e `.vercel/` sono esclusi
dal repository.

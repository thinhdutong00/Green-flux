# Collaudo browser landing pompe di calore — 5 novembre 2026

Verifica eseguita con Chrome headless tramite Playwright CLI 0.1.22, prima sul server di sviluppo (`127.0.0.1:3000`) e poi sulla build ottimizzata/minificata (`127.0.0.1:3001`). Nessuna richiesta reale a Resend/CRM, nessuna conversione trasmessa a Google Ads.

## Ambiente e isolamento

Per esercitare anche i controlli che si attivano soltanto sul dominio pubblico, il browser ha usato l'origine virtuale `https://green-flux.com`: **tutte** le risorse di tale origine sono state intercettate e servite dal server locale. L'endpoint `/api/preventivo` è stato sostituito da risposte controllate 200/502. Gli script Google e Clarity sono stati sostituiti da script vuoti; ogni altro collegamento esterno è stato bloccato. Le conversioni indicate sotto sono oggetti nella coda JavaScript locale, non conversioni inviate a un fornitore.

I valori digitati erano contrassegnati `TEST QA`, con email riservata `.test` e telefono usato esclusivamente nel mock. Non sono stati inviati a persone né conservati nel CRM.

## Layout e navigazione

| Larghezza | Rendering | Scroll orizzontale | Campi | Gerarchia / ancore |
| --- | --- | --- | --- | --- |
| 360 px | Verificato | Assente: scrollWidth 360 | Font 16 px, colonna singola | Un H1; nessun ID duplicato o ancora mancante |
| 390 px | Verificato | Assente: scrollWidth 390 | Font 16 px, colonna singola | Un H1; nessun ID duplicato o ancora mancante |
| 768 px | Verificato | Assente: scrollWidth 768 | Font 16 px; modulo sotto proposta | Un H1; nessun ID duplicato o ancora mancante |
| 1440 px | Verificato | Assente: scrollWidth 1440 | Modulo accanto alla proposta | Un H1; nessun ID duplicato o ancora mancante |

- CTA principale → `#valutazione` funzionante a tutte le larghezze, modulo non coperto dall'header.
- I quattro link della navigazione desktop raggiungono le sezioni corrette.
- FAQ espandibili funzionanti.
- Questionario in dialog aperto dal collegamento secondario, chiusura con Escape e ripristino del focus sul collegamento di apertura verificati.
- Sul mobile la sequenza titolo → spiegazione → CTA → recensioni → modulo è conservata, senza immagine dominante né CTA fissa sovrapposta.
- Banner cookie controllato a 360 px; la X rifiuta i cookie facoltativi e rende disponibili tutti i contenuti.
- Ispezione visiva di hero desktop/mobile e pagina intera. Rilevati e corretti durante il collaudo colori troppo chiari nel collegamento al quiz in fondo e troppo scuri in alcuni elementi del footer. Ricontrollati sulla build finale: chiusura e footer leggibili.

## Dieci scenari controllati: tutti superati anche sulla build finale

1. Invio vuoto: cinque errori comprensibili (nome, telefono, comune, riscaldamento, privacy), focus sul primo campo, nessuna POST. Email facoltativa e honeypot fuori dal percorso di tastiera/accessibilità.
2. Tab da nome a telefono, comune, riscaldamento ed email nell'ordine corretto, a viewport mobile.
3. Email compilata ma non valida respinta senza POST.
4. Cookie rifiutati + risposta 502: nessun redirect, dati digitati conservati, messaggio leggibile, pulsante di nuovo disponibile. Nessuna conversione. La richiesta conserva il percorso operativo e non invia campagne o referrer.
5. Nuovo tentativo senza email: stesso requestId del tentativo fallito, email vuota senza sostituzioni fittizie, redirect a `/thank-you/` e conferma visibile anche con cookie rifiutati; nessuna conversione.
6. Visita diretta alla thank-you e refresh con cookie accettati: nessuna conversione. Meta robots `noindex, follow` conservato.
7. Email compilata + cookie accettati + doppio clic: una sola POST, attribuzione UTM autorizzata conservata, una sola conversione nella coda locale con transaction_id uguale al requestId ricevuto dal mock.
8. Refresh della thank-you e ritorno indietro: nessuna nuova POST o conversione; il modulo segnala richiesta già inviata e disabilita il pulsante.
9. Consensi separati: nessuna casella facoltativa preselezionata; attivare solo Clarity non carica Google Ads. Form e dialog marcati per oscuramento prima del caricamento; revoca invia `consentv2` negato e `stop`. Nessun dato personale nella coda ispezionata.
10. Clic CTA e inizio modulo generano diagnostica ammessa, senza dati personali e senza conversioni primarie.

Nessun errore JavaScript `pageerror` nei dieci scenari, nel rendering o negli smoke test sottostanti.

## Compatibilità degli altri percorsi: tre smoke test superati

Ripetuti sulla build minificata, con endpoint interamente simulato:

- Questionario dettagliato pompe di calore: completati i sei passaggi con email vuota, payload `heat-pump`, redirect corretto.
- Modulo generale `/preventivo/`: validazione obbligatori, compilazione richiesta fotovoltaico senza email, payload `site-visit`, redirect corretto.
- Modulo `/contatti/`: componente corrente `site-visit`, richiesta da valutare e nota TEST, redirect corretto. Il vecchio template `contact-form.html` non è il modulo attualmente reso sulla pagina.

## Artefatti locali

La directory `output/playwright/` è ignorata da Git. Gli artefatti elencati sono stati creati per questo collaudo e sono disponibili nel workspace:

- `landing-1440-hero.png`, `landing-1440-full.png`
- `landing-768-hero.png`, `landing-768-full.png`
- `landing-390-hero.png`, `landing-390-full.png`
- `landing-360-hero.png`, `landing-360-full.png`, `landing-360-cookie-banner.png`
- `landing-final-section.png`, `landing-footer.png`
- `qa-layout-dist-result.txt`, `qa-controlled-dist-result.txt`, `qa-other-forms-dist-result.txt`
- Snippet ripetibili Playwright CLI: `qa-layout.js`, `qa-controlled.js`, `qa-other-forms.js`.

Gli screenshot principali sono della build finale sulla porta 3001, dopo le correzioni di contrasto.

## Limiti della verifica

Il collaudo verifica il comportamento del browser con risposte simulate. Non prova l'accettazione di una nuova email da Resend, la consegna nella casella destinataria, la conferma al richiedente o l'inserimento effettivo di una nuova riga Google Sheets. Non sono state eseguite operazioni reali di invio, in conformità all'istruzione dell'utente.

Le larghezze mobile sono viewport di Chrome headless: non è stato usato un telefono fisico né verificata la tastiera virtuale iOS/Android. Non sono stati eseguiti test Safari/Firefox o un audit accessibilità completo. La CTA mobile non è fissa, quindi non aggiunge un elemento sovrapposto alla tastiera o al banner. Il caricamento reale delle librerie di tracking e la loro disponibilità esterna sono intenzionalmente esclusi dal test.

# Fonti dei contenuti e delle immagini

Contenuti e immagini della home: https://www.green-flux.com/

Riferimento consultato il 9 settembre 2026. La nuova pagina conserva i dieci campi di intervento, i cinque servizi, l’esperienza dei tecnici e i contatti aziendali, con testi riorganizzati.

## Immagini

- `public/assets/logo.png`: https://images.squarespace-cdn.com/content/v1/68cd3e1afa95824bcae8e74b/4cc2602c-ef32-467a-9c6a-7dd72bbf01e0/Transparent+Logo.png
- `public/assets/hero-solar.jpg`: https://images.squarespace-cdn.com/content/v1/68cd3e1afa95824bcae8e74b/1758547593041-0FX52TOMBPM7FKEY7ND6/unsplash-image-2SfssudtyIA.jpg
- `public/assets/progettazione.jpg`: https://images.squarespace-cdn.com/content/v1/68cd3e1afa95824bcae8e74b/08e2884f-34d3-4a4f-b9e8-34742e56a042/progetto.jpg
- `public/assets/impianti.jpg`: https://images.squarespace-cdn.com/content/v1/68cd3e1afa95824bcae8e74b/ba4c13df-a420-4214-a32a-f2ca12d54241/impianti.jpg
- `public/assets/pompe-di-calore.jpg`: https://images.squarespace-cdn.com/content/v1/68cd3e1afa95824bcae8e74b/4acf7f9c-36f9-4188-8906-81ae6bbbdd64/pompadicalore.jpg
- `public/assets/fotovoltaico.jpg`: https://images.squarespace-cdn.com/content/v1/68cd3e1afa95824bcae8e74b/fa5e3dd3-1813-49d3-bb02-3cfd8d97a587/fotov.jpg
- `public/assets/smart-home.jpg`: https://images.squarespace-cdn.com/content/v1/68cd3e1afa95824bcae8e74b/513caa11-c4a6-4c8c-9bd4-6b4cdda475bc/smart.jpg
- `public/assets/solare-termico.jpg`: https://images.squarespace-cdn.com/content/v1/68cd3e1afa95824bcae8e74b/398b2c01-e1bc-45a2-bd02-048d5f6a707f/SolareTermicoOK.jpg
- `public/assets/biomassa.jpg`: https://images.squarespace-cdn.com/content/v1/68cd3e1afa95824bcae8e74b/d3481c78-7dd8-4629-a347-fc6aa6a73852/biomassa.jpg
- `public/assets/caldaie.jpg`: https://images.squarespace-cdn.com/content/v1/68cd3e1afa95824bcae8e74b/095abcbb-f901-4463-9fa6-b4d16d9856be/caldaie.jpg
- `public/assets/condizionatori.jpg`: https://images.squarespace-cdn.com/content/v1/68cd3e1afa95824bcae8e74b/c0d20715-5bdd-4970-b161-5de2e0c038bf/condizionatori.jpg
- `public/assets/ventilazione.jpg`: https://images.squarespace-cdn.com/content/v1/68cd3e1afa95824bcae8e74b/914d952e-660f-4f73-8904-9e0e084df79e/VentilazioneOK.jpg
- `public/assets/trattamento-acqua.jpg`: https://images.squarespace-cdn.com/content/v1/68cd3e1afa95824bcae8e74b/c41e7dea-1f5a-4386-b0c9-b418f8b95cfe/acqua.jpg
- `public/assets/impianti-completi.jpg`: https://images.squarespace-cdn.com/content/v1/68cd3e1afa95824bcae8e74b/16e3c4aa-c732-4671-999b-b46af70eb997/impiantiOK.jpg
- `public/assets/favicon.ico`: https://images.squarespace-cdn.com/content/v1/68cd3e1afa95824bcae8e74b/c82f84b3-7bcd-469d-bd08-44e93f9d822a/favicon.ico

## Riferimento di design e font

Design fornito nell’archivio `Zakka-dental-landing (1).zip`, cartella
`aurora-dental-landing`. Sono ripresi struttura visiva, proporzioni,
tipografia e stile dei componenti, adattati ai contenuti e ai colori Green Flux.
Non sono stati utilizzati i contenuti odontoiatrici, le recensioni demo o il form
dimostrativo del riferimento.

Plus Jakarta Sans nei pesi 400, 600 e 800, tratto dal riferimento fornito e
distribuito con licenza SIL Open Font License. Licenza inclusa in
`public/assets/fonts/OFL.txt` e reperibile nel repository Google Fonts:
https://github.com/google/fonts/tree/main/ofl/plusjakartasans

## Collegamenti di contatto

Il modulo multistep riprende struttura e interazioni di
`https://fvg.venetagreen.it/`, riferimento corretto fornito dall’utente e
consultato il 9 settembre 2026 su desktop e mobile. Il primo passaggio chiede
il nome; seguono obiettivo, consumi, installazione, contatti e riepilogo.
Catalogo, domande condizionali, logo, palette e recapiti sono quelli Green Flux.
Il modulo e la home usano i font locali Plus Jakarta Sans già presenti.
Non sono copiati gli endpoint di raccolta richieste, i tracker o i sistemi
pubblicitari del riferimento.

Menu mobile e pulsante WhatsApp riprendono i componenti del progetto locale
`studiodentisticofederzonigranata` fornito dall’utente. Icona SVG, dimensioni e
animazioni WhatsApp provengono da `src/components/WhatsAppFloatingButton.astro`;
colori del fumetto, font e contatti sono adattati a Green Flux.

Il dropdown Servizi desktop riprende il pannello Casi clinici dello stesso
progetto (`Header.astro` e stili `clinical-mega-*` in `BaseLayout.astro`),
con schede, riquadri delle icone e barra inferiore. Le cinque icone sono quelle
già presenti nelle sezioni Green Flux; colori e ancore rimangono del progetto.

Le comparse delle sezioni riprendono `https://www.magosystem.it/` e il progetto
locale `mago-system` (`src/App.jsx` e `src/styles.css`), verificati il 9 settembre
2026: dissolvenza, traslazione iniziale di -36 px, durata 600 ms con curva `ease`,
ritardo di 80 ms per il secondo blocco affiancato, osservatore con soglia 0,12
e margine inferiore -60 px. L'effetto viene eseguito una sola volta e rispetta
il movimento ridotto; i contenuti restano visibili senza JavaScript.

Il sito originale mostra `info@green-flux.com`, ma alcuni collegamenti aprono `greenflux.gestione@gmail.com`. La nuova home usa coerentemente `info@green-flux.com`, già utilizzato dal pulsante consulenza originale.

## Varianti ottimizzate

I file AVIF/WebP derivano dalle immagini JPG elencate sopra, senza modifiche
al contenuto. I font WOFF2 derivano dai TTF originali, con sottoinsieme latino
comprensivo di lettere accentate, punteggiatura e simboli disponibili.

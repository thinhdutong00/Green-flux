# Riorganizzazione editoriale — 15 settembre 2026

## Risultato

Da **149 pagine a 19**. Restano 17 URL precedenti, si aggiungono fotovoltaico e
supporto e vengono accorpati 132 URL, mantenuti come reindirizzamenti permanenti.

| Contenuto precedente | Scelta |
| --- | --- |
| 91 pagine territoriali | Servizio pertinente o contatti, senza copertura territoriale inventata. |
| 25 guide e indice blog | Informazioni utili integrate nei servizi, eliminando gli articoli ripetitivi. |
| Fotovoltaico casa e azienda | Una pagina con i diversi contesti di utilizzo. |
| Cinque servizi di supporto | Una pagina con sezioni raggiungibili per ancora. |
| Metodo | Integrato in Chi siamo. |
| Interventi e gallerie illustrative | Accorpati al catalogo e alle pagine impianti. |
| Batterie, manutenzione ed edilizia | Nessuna offerta autonoma non documentata; URL indirizzati a contenuti pertinenti. |

## Fonte e criteri

[Green Flux](https://www.green-flux.com/) è la fonte per identità, recapiti,
10 tecnologie, 5 servizi, ambiti di attività, competenze ed esperienza dei tecnici.
Non vengono introdotti marchi, certificazioni, progetti reali, recensioni, prezzi,
risparmi, tempi garantiti o coperture geografiche non documentati.

Le spiegazioni generali delle tecnologie sono distinte dalle dichiarazioni
aziendali. Fonti tecniche primarie ENEA, GSE e Caleffi sono indicate nel modello
e nelle pagine interessate. Le domande sul perimetro del lavoro aiutano a
confrontare una proposta e non aggiungono prestazioni contrattuali garantite.

## Contenuti aggiunti e rimossi

Ogni tecnologia presenta una spiegazione, tre contesti, criteri di scelta,
informazioni da preparare e domande specifiche. Rimossi i blocchi duplicati
“Approfondisci il progetto”, i blocchi di finta testimonianza e le caratteristiche
ripetute in più sezioni della stessa pagina.

La pagina pompe di calore affronta edificio, terminali, acqua calda, alimentazione,
raffrescamento e fotovoltaico. Non propone dimensionamenti o risparmi predefiniti.
Ogni servizio di supporto chiarisce funzione, momento utile, dati da preparare e
aspetti della proposta. Agevolazioni e assicurazioni non presentano aliquote,
ammissibilità o coperture garantite.

## Gestione e compatibilità

`content/site-content.json` è la fonte unica di testi e catalogo. Il renderer Node
produce pagine, menu, footer, opzioni del preventivo e audit. La home, l’header,
il menu mobile e i form conservano il design esistente. Le quattro precedenti
fonti di contenuto sovrapposte sono rimosse e recuperabili nella cronologia Git.

`content/redirects.json` mappa tutti i vecchi URL. Vercel, Cloudflare e anteprima
locale gestiscono reindirizzamenti permanenti senza catene. Menu e footer puntano
alle nuove destinazioni; la sitemap comprende solo le 19 pagine canoniche.
I precedenti parametri di preselezione del preventivo restano riconosciuti.

## Verifica

Controlli automatici su catalogo, 19 pagine, asset, link, ancore, vecchi URL,
preselezioni e validazione dei form. Invii email simulati, senza dati reali.

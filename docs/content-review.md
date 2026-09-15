# Revisione dei contenuti Green Flux

Fonte aziendale: https://www.green-flux.com/, letta direttamente il 15 settembre 2026.
La navigazione Chi siamo / Campi di intervento / Servizi / Contatti rimanda a
sezioni della stessa pagina. Una copia del testo consultato è conservata in
`sources/green-flux-2026-09-15.txt`; l'impronta del documento originale e i dati
strutturati sono in `../content/green-flux-profile.json`.

## Informazioni aziendali confermate

- GREEN FLUX srls, Via Trieste, 19, 35121 Padova (PD).
- +39 375 552 1420; info@green-flux.com.
- Tecnici con oltre 15 anni nelle energie rinnovabili: l'esperienza riguarda i
  tecnici, non l'età dell'azienda.
- Competenze idrauliche ed elettriche, professionisti qualificati e un unico
  interlocutore per il progetto.
- Impiantistica residenziale, terziaria e industriale, dalla sostituzione del
  generatore alla ristrutturazione completa.
- Dieci campi di intervento: pompe di calore, fotovoltaico, smart home e
  automazioni, solare termico, biomassa, caldaie, condizionatori, ventilazione
  meccanica, trattamento acqua, impianti completi.
- Cinque servizi: progettazione, pratiche e permessi, diagnosi energetiche,
  detrazioni fiscali, formule assicurative.
- Richiesta di consulenza come punto di contatto iniziale.

## Applicazione al progetto

Tutte le 149 pagine sono censite in `content-audit.json` con titolo, descrizione,
tipo e fonte. Il design, gli header, la palette e il footer bianco sono conservati.
Le pompe di calore restano in apertura della home e del catalogo.

Il catalogo e il preventivo propongono 17 voci: le dieci tecnologie, con due
percorsi per il fotovoltaico (casa e azienda), i cinque servizi e la consulenza.
Le 20 pagine nella cartella servizi rimangono raggiungibili: le tre voci non
documentate come servizi autonomi sono state riformulate come percorsi di
consulenza o progettazione impiantistica. Non si pubblicizzano installazione di
batterie, manutenzione programmata o opere edilizie su involucro e coperture.
I vecchi parametri del preventivo per tali voci aprono la consulenza.

Le pagine territoriali chiedono conferma della disponibilità per il comune
indicato. Sono state rimosse affermazioni su regioni servite, comuni coperti,
richieste già ricevute e squadre locali. La sola sede documentata è Padova.

La sezione Interventi descrive gli ambiti impiantistici. Non attribuisce a Green
Flux cantieri, case study o risultati non documentati. Le immagini illustrative
restano riconoscibili come tali.

Le 25 guide sono state riscritte per aiutare a preparare la richiesta. Sono
stati rimossi prezzi, incentivi nominativi, percentuali, simulazioni di resa,
scadenze, recensioni e date editoriali ereditate dal riferimento. Non vengono
presentati tempi di risposta, preventivi gratuiti o reparti aziendali inventati.

I dati strutturati contengono identità, contatti, pagina e FAQ effettive; non
contengono aree servite, valutazioni, recensioni, offerte economiche o progetti
attribuiti senza fonte. Le pagine privacy conservano i recapiti confermati e il
collegamento all'informativa ufficiale; il funzionamento del modulo è descritto
in base al codice effettivo del nuovo sito.

## Manutenzione editoriale

- `content/service-pages.json`: testi delle 20 pagine servizio/consulenza.
- `content/editorial-pages.json`: testi delle 25 guide.
- `scripts/align-green-flux-content.py`: applica il modello alle strutture visive.
- `scripts/generate-services.py`: rimanda alla stessa procedura, per non
  reintrodurre il vecchio catalogo.
- `scripts/import-reference.py`: strumento storico di importazione del layout;
  non va usato per aggiornare i contenuti aziendali correnti.

Le espansioni editoriali riguardano il contesto del progetto e le informazioni
da comunicare. Non trasformano l'assenza di informazioni nel vecchio sito in
un'affermazione commerciale.

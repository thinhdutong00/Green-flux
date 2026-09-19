# Collaudo locale — 19 settembre 2026

Indirizzo verificato: **http://localhost:5173/**. Server di sviluppo Vite, archivio IndexedDB DEMO. L'archivio di `127.0.0.1` è distinto: utilizzare `localhost` per ritrovare il collaudo.

## Esiti

- TypeScript e build Vite completati.
- 37 test Vitest superati: calcoli monetari, validazione, snapshot, persistenza e duplicazione, import/export CSV, migrazione SQL/RLS e generatore PPTX.
- 16 test preesistenti del sito pubblico superati. Nessuna modifica ai file preesistenti; l'app è contenuta in `apps/preventivi/`.
- Build di produzione senza configurazione Supabase provata nel browser: mostra l'errore di configurazione e non offre l'accesso alla demo.
- Browser: controllati desktop e mobile a 390 px, form, navigazione, ricerca, salvataggio e riapertura. Verificati avviso modifiche non salvate, validazione dello sconto oltre il 100%, focus del dialogo, ciclo Tab/Shift+Tab ed Escape. Tabelle larghe confinate al proprio scorrimento; nessun overflow della pagina in dashboard, listino, clienti, archivio, impostazioni ed editor.
- CSV: un lotto contenente uno SKU esistente mostra errore sulla riga e disabilita l'importazione. Corretto il file, importata e ritrovata la voce `DEMO Accessorio CSV` a €25,50.
- Console browser senza errori o avvisi applicativi durante i flussi verificati.

## Flusso di accettazione eseguito nel browser

Creata la voce **Pompa di calore Test**, prezzo netto €8.500,00. Creato e salvato il preventivo per **Mario Rossi**, progetto `Impianto a pompa di calore — COLLAUDO DEMO`, numero **DEMO-GF-2026-0004**.

| Voce | Quantità | Prezzo netto unitario | Sconto riga | Netto riga |
| --- | ---: | ---: | ---: | ---: |
| Pompa di calore Test | 2 | €8.500,00 | 10% | €15.300,00 |
| DEMO · Installazione e collegamenti | 1 | €1.800,00 | 0% | €1.800,00 |
| DEMO · Kit accessori idraulici | 1 | €280,00 | 0% | €280,00 |

Subtotale €17.380,00; sconto globale €100,00; maggiorazione 2% pari a €345,60; imponibile €17.625,60; IVA 22% €3.877,63; **totale €21.503,23**. Quantità, prezzi, sconti e dati cliente persistono dopo la riapertura. Download browser riuscito; stato Generato e registrazione della generazione presenti.

File consegnato: `output/Collaudo_GreenFlux_Mario_Rossi_21503-23.pptx`. Contiene **10 slide**, tabelle native, importi verificati anche nell'XML e banner DEMO in ogni slide. Condizioni commerciali vuote omesse senza frasi sostitutive. PDF e PNG di verifica: `output/collaudo-render/`.

## Presentazione estesa

`npm run demo:pptx` genera una proposta da **22 righe**, descrizioni e condizioni lunghe, aliquote miste, totale **€48.098,51** e **26 slide**. File: `output/Preventivo_GreenFlux_Mario_Rossi_2026-09-19.pptx`; snapshot: `output/demo-snapshot.json`; render: `output/render/`.

Per entrambe le presentazioni sono stati controllati ZIP/OPC/XML, riferimenti, tabelle native, contenuti e totali. Tutte le slide sono state renderizzate con LibreOffice e ispezionate visivamente: nessun taglio o sovrapposizione rilevato. I controlli automatici di integrità e geometria non hanno rilevato errori; gli avvisi conservativi del file esteso sono stati esaminati sui render.

## Verifiche ancora necessarie prima dell'uso aziendale

**Microsoft PowerPoint desktop:** l'applicazione è presente, ma il controllo automatico della finestra di apertura non ha completato l'apertura del documento. La modifica nativa in Microsoft PowerPoint non è quindi dichiarata verificata. Aprire il file consegnato, modificare un testo e una cella di tabella, salvare una copia e riaprirla. Il rendering con LibreOffice e la struttura nativa del PPTX sono stati verificati separatamente.

**Supabase reale:** mancano URL e chiave del progetto aziendale. I test PGlite eseguono la migrazione con identità e ruoli simulati; non esercitano Supabase Auth, JWT, PostgREST, rete o transazioni su più connessioni reali. Dopo la configurazione descritta nel README, provare accesso di due membri abilitati, diniego a un autenticato non abilitato e a un anonimo, revoca della membership, salvataggi simultanei con numeri distinti e conflitto di versione. Verificare anche perdita di rete mantenendo aperto l'editor.

La demo conserva i dati solo nel browser. Non sono stati eseguiti deploy, push, modifiche DNS o collegamenti a servizi aziendali. Nessun dato DEMO viene caricato automaticamente in Supabase.

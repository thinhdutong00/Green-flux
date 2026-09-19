# Green Flux · Area Preventivi

Applicazione interna indipendente per gestire listino, clienti e preventivi e scaricare proposte PowerPoint modificabili. React, TypeScript e Vite; archivio Supabase oppure demo locale persistente. PptxGenJS compone il `.pptx` nel browser: nessuna API AI e nessun servizio di generazione a pagamento.

L’applicazione vive interamente in `apps/preventivi`, con dipendenze, build e configurazione Vercel proprie. Non richiede modifiche alle pagine, al routing, agli asset o al deploy del sito pubblico Green Flux. Gli asset del brand utilizzati qui sono copie locali.

## Avvio locale

Requisito: **Node.js 24** e npm. Dalla radice del repository:

```sh
cd apps/preventivi
npm ci
npm run dev
```

Apri **http://localhost:5173/**, indirizzo verificato nel collaudo. Il server ascolta solo sul computer locale e non cambia automaticamente porta se la 5173 è occupata. Usa sempre lo stesso hostname: `localhost` e `127.0.0.1` conservano archivi browser distinti.

Senza configurazione Supabase, premi **Accedi alla demo locale**. Non occorrono email o password: è una modalità di sviluppo esplicitamente identificata come DEMO, non un sistema di autenticazione. Listino, clienti e preventivi dimostrativi si trovano in `src/data/demo-fixture.json`; i prezzi non sono un listino commerciale Green Flux. I recapiti aziendali pubblici provengono dal profilo verificato del sito, mentre i clienti e gli interventi di esempio sono fittizi.

Le modifiche vengono conservate in IndexedDB (`green-flux-preventivi-demo-v1`) in quel browser e in quella origine. La sessione demo usa `sessionStorage`. Non c’è sincronizzazione tra dispositivi e la cancellazione dei dati del sito elimina l’archivio locale. Per azzerare la demo, elimina quel database dagli strumenti sviluppatore del browser e ricarica. La demo non è destinata a contenere l’archivio reale dell’azienda.

La build di produzione **non abilita la demo**: senza Supabase mostra una richiesta di configurazione. Anche `npm run preview` usa questa protezione; per provare la demo usa `npm run dev`.

## Comandi e organizzazione

| Comando | Risultato |
| --- | --- |
| `npm run dev` | Server di sviluppo su `127.0.0.1:5173` |
| `npm run typecheck` | Controllo TypeScript |
| `npm run build` | Controllo TypeScript e bundle in `dist/` |
| `npm test` | Test Vitest su calcoli, dati, CSV, SQL e PPTX |
| `npm run demo:pptx` | Genera un vero PPTX con 22 voci DEMO e `output/demo-snapshot.json` |
| `npm run preview` | Anteprima della build su `127.0.0.1:4173`, con Supabase configurato |

Il comando `demo:pptx` usa `node --import tsx scripts/generate-demo.ts`; puoi eseguire direttamente lo stesso comando dalla cartella dell’app.

| Percorso | Responsabilità |
| --- | --- |
| `src/pages`, `src/components`, `src/styles` | Interfaccia, form, navigazione e componenti condivisi |
| `src/domain` | Tipi, validazione, calcoli monetari, formattazione e CSV |
| `src/data` | Contratto repository, persistenza locale/Supabase e dati DEMO |
| `src/pptx` | Generatore, impaginazione, elementi nativi e template PowerPoint |
| `public/brand` | Logo, font Plus Jakarta Sans e licenze |
| `supabase/migrations` | Schema, controlli SQL, RLS e funzioni RPC |
| `tests`, `scripts` | Test e generatore di collaudo |

Dipendenze principali: React/React Router, TypeScript/Vite, Supabase JS, Dexie, Zod, PptxGenJS, PapaParse e Lucide. Il login usa React Hook Form con zodResolver per validazione dei campi e gestione dell’invio. I test usano Vitest, fake-indexeddb, JSZip e PGlite. Non sono previsti servizi AI, account per generare presentazioni o pagamenti per singolo download; eventuali costi di hosting e database dipendono dai servizi scelti dall’azienda.

## Collegamento a Supabase

1. Crea un progetto Supabase dedicato al preventivatore.
2. Nel suo SQL Editor esegui **una volta**, come amministratore, il contenuto completo di `supabase/migrations/202609190001_green_flux.sql`. La migrazione è transazionale e prepara l’archivio vuoto con i soli dati aziendali iniziali: non crea utenti, clienti o prezzi DEMO.
3. Nelle impostazioni Auth disabilita la registrazione pubblica. Crea gli account del team tramite l’amministrazione Supabase, con autenticazione email/password; non esiste una pagina di registrazione nell’app.
4. Copia l’UUID dell’utente creato e abilitalo tramite SQL amministrativo:

```sql
insert into private.app_members (user_id, active)
values ('UUID_UTENTE_DA_SUPABASE_AUTH'::uuid, true)
on conflict (user_id) do update set active = true;
```

Per revocare l’accesso all’archivio:

```sql
update private.app_members
set active = false
where user_id = 'UUID_UTENTE_DA_SUPABASE_AUTH'::uuid;
```

Il segnaposto va sostituito con l’UUID effettivo. Questi comandi si eseguono nel SQL Editor amministrativo, mai nel frontend. Un account autenticato senza membership attiva non può leggere né modificare l’archivio.

5. Copia `.env.example` in `.env.local` e compila le variabili:

| Variabile | Uso |
| --- | --- |
| `VITE_SUPABASE_URL` | URL del progetto Supabase |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Chiave **publishable** del progetto |
| `VITE_DATA_MODE` | Facoltativa: `supabase` oppure `local`; vuota seleziona automaticamente la modalità |

`local` è accettato soltanto dal server di sviluppo. Per utilizzare Supabase imposta URL e chiave e lascia la modalità vuota oppure usa `supabase`. Riavvia Vite dopo aver cambiato il file.

La chiave publishable viene inclusa nel bundle ed è pubblica per definizione; la protezione dei dati è affidata ad Auth, membership, RLS e RPC. **Non inserire chiavi service-role, secret key o password nelle variabili `VITE_*`, nel repository o nel codice frontend.** `.env.local` è escluso da Git.

L’archivio è unico e condiviso dal team Green Flux. Tutti i membri attivi hanno gli stessi permessi applicativi, comprese modifiche e cancellazioni; non sono implementati ruoli differenziati o più aziende. Le tabelle pubbliche hanno RLS e accesso di lettura riservato ai membri. Le scritture passano da funzioni RPC che verificano membership, struttura, tipi, limiti e riferimenti e ricalcolano i totali. Lo schema `private` non deve essere aggiunto agli schemi esposti dall’API Supabase.

Prima dell’uso aziendale, completa **Impostazioni**: partita IVA, referente e condizioni sono volutamente vuoti quando non documentati. I valori iniziali di 30 giorni e IVA 22% sono impostazioni modificabili da confermare, non condizioni commerciali ufficiali. Inserisci o importa il listino reale. I dati locali non vengono trasferiti automaticamente a Supabase; il CSV permette di trasferire il listino dopo aver predisposto le categorie. Ulteriori dettagli SQL sono in `supabase/README.md`.

## Comportamento dei preventivi e dei calcoli

- Le voci del listino vengono copiate nel preventivo. Modificare quantità, prezzo, descrizione o sconto nella proposta non altera il listino; **Salva nel listino** è un’azione esplicita per le voci personalizzate.
- Ogni proposta conserva una copia di cliente, dati aziendali, righe e condizioni. Le successive modifiche ad anagrafiche e impostazioni non riscrivono i preventivi esistenti. La duplicazione crea una bozza con un nuovo numero.
- Il numero viene assegnato al primo salvataggio: `GF-ANNO-0001`, con prefisso configurabile; nella demo ha anche il prefisso `DEMO-`. Anno e cambio anno seguono `Europe/Rome`. Il contatore è condiviso, assegnato atomicamente, non riutilizza i numeri eliminati e non può essere arretrato sotto il prossimo progressivo disponibile.
- Le versioni impediscono di sovrascrivere silenziosamente modifiche concorrenti allo stesso preventivo. In caso di conflitto occorre riaprire la versione aggiornata. Lo storico registra generazioni e versione esportata; non è un archivio completo ripristinabile di tutte le revisioni precedenti.
- **Inviato**, **Accettato** e **Rifiutato** sono stati manuali: l’app non invia email né raccoglie firme. La generazione cambia una bozza in **Generato** senza alterare gli altri stati.

Gli importi sono centesimi interi, le quantità millesimi e le percentuali centesimi di punto percentuale. I calcoli JavaScript usano `BigInt`; SQL usa aritmetica `numeric`. I numeri formattati non vengono utilizzati come valori economici.

Ordine esatto: quantità × prezzo × sconto di riga, arrotondato al centesimo **half-up**; somma delle righe; sconto complessivo; maggiorazione applicata al netto dello sconto complessivo; IVA sull’imponibile risultante raggruppato per aliquota e arrotondata al centesimo per gruppo. Gli adeguamenti globali sono ripartiti proporzionalmente tra le righe con il metodo dei maggiori resti; gli eventuali centesimi residui seguono l’ordine delle righe a parità di resto. Un importo di maggiorazione senza base economica va inserito come riga personalizzata con la sua IVA.

Gli input accettano virgola o punto decimale, senza separatori delle migliaia: massimo due decimali per prezzi/percentuali e tre per quantità. La visualizzazione usa il formato `€ 12.450,00`. Esempio di controllo: una voce da € 8.500,00, quantità 2, sconto di riga 10%, IVA 22% e nessun adeguamento globale produce imponibile **€ 15.300,00**, IVA **€ 3.366,00**, totale **€ 18.666,00**.

## CSV e PowerPoint

L’esportazione CSV riguarda le voci attualmente filtrate. Usa UTF-8 con BOM, separatore `;`, decimali italiani e protezione dalle formule dei fogli di calcolo. Il pulsante **Modello CSV** scarica `Modello_listino_GreenFlux.csv` con le sole intestazioni da compilare. L’importazione mostra un’anteprima e inserisce soltanto nuove voci: nomi categoria esistenti, SKU non duplicati, tutti i dati validi; gli errori bloccano l’intero lotto. Limiti dell’interfaccia: 2 MB e 1.000 righe per importazione.

Il `.pptx` 16:9 ha sfondo bianco, palette petrolio/lime, logo Green Flux e font Arial compatibile con PowerPoint. Testi, forme, linee e tabelle sono elementi nativi modificabili. Il layout aggiunge pagine per righe e descrizioni lunghe senza trasformare le slide in screenshot. Le note interne del listino non entrano nella proposta.

Le immagini prodotto possono essere referenziate da URL, ma non è previsto un caricamento file nell’app. Il generatore tenta di leggere PNG/JPEG fino a 5 MB; errori, timeout o restrizioni CORS producono una sagoma settoriale. Le foto non vengono caricate su servizi di generazione esterni. Il PowerPoint viene scaricato sul computer e non conservato in Supabase Storage: il database registra soltanto i metadati della generazione. Puoi rigenerarlo dal preventivo salvato.

## Verifica e limiti del collaudo

Esegui `npm run build`, `npm test` e `npm run demo:pptx`. Il file di collaudo viene creato in `output/`, esclusa da Git. Aprilo in Microsoft PowerPoint per controllare impaginazione, testi lunghi, tabelle su più slide e modificabilità degli elementi. Nell’interfaccia prova anche creazione listino, quantità/sconti/IVA, salvataggio, ricarica, duplicazione, stato e layout su schermo stretto.

I test SQL utilizzano **PGlite** con ruoli e `auth.uid()` simulati: verificano la migrazione e i controlli sul database, ma non sostituiscono un collaudo di Supabase Auth e PostgREST. **L’autenticazione reale e l’integrazione con un progetto Supabase remoto richiedono configurazione e verifica sul progetto aziendale.** La suite non equivale a una verifica visiva di tutte le versioni di PowerPoint né prova automaticamente tutti i browser.

## Pubblicazione futura separata

Nessun deploy è richiesto per usare o collaudare il progetto in locale. Quando autorizzato, crea un **nuovo progetto Vercel**, lasciando invariato il progetto del sito pubblico:

- Root Directory: `apps/preventivi`.
- Install Command: `npm ci`; Build Command: `npm run build`; Output Directory: `dist`.
- Runtime Node.js: 24.
- Configura le variabili Supabase nell’ambiente del nuovo progetto; non abilitare la modalità locale.
- Usa un hostname dedicato, per esempio `green-flux-preventivi.vercel.app` se disponibile. L’app ha routing alla radice del proprio host.
- In seguito collega `preventivi.green-flux.com` al **solo nuovo progetto**, completando la verifica DNS richiesta da Vercel. Imposta in Supabase gli URL autorizzati e il Site URL del preventivatore per gli eventuali flussi di invito/accesso.

`vercel.json` include il fallback delle route client e intestazioni per evitare indicizzazione e incorporamento in frame. Non modifica la configurazione Vercel del sito Green Flux esistente.

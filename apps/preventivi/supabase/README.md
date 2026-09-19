# Collegamento dell’archivio aziendale

La demo locale usa IndexedDB e non invia dati a Supabase. Questa migrazione crea un archivio separato per una sola azienda: ogni collaboratore abilitato può gestire tutti i dati.

1. Crea un progetto Supabase dedicato e applica `migrations/202609190001_green_flux.sql` mediante SQL Editor oppure Supabase CLI. Non riapplicare la migrazione su un database già configurato.
2. In Authentication disabilita **Allow new users to sign up** e **Allow anonymous sign-ins**. Configura Site URL e redirect URL per `http://localhost:5173` durante lo sviluppo, successivamente per il dominio dell’app separata.
3. Crea/invita ciascun collaboratore da Authentication → Users. La gestione della password resta interamente in Supabase Auth. La creazione di utenti e l’invio degli inviti sono operazioni manuali dell’amministratore.
4. Copia l’UUID dell’utente dalla schermata Users e abilitalo nel SQL Editor, con il tuo valore al posto del segnaposto:

   ```sql
   insert into private.app_members(user_id, active)
   values ('UUID-UTENTE-AUTH', true)
   on conflict(user_id) do update set active = true;
   ```

5. Crea `.env.local` nella cartella dell’app con `VITE_DATA_MODE=supabase`, `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY`. La chiave publishable è pubblica per design: la protezione è applicata da Auth, membership, grants e RLS. Non usare secret key o service-role key.
6. Riavvia Vite, accedi con l’account abilitato e configura condizioni, referente, partita IVA e listino reale. I prezzi DEMO non vengono trasferiti al database aziendale.

Per revocare l’accesso: `update private.app_members set active = false where user_id = 'UUID-UTENTE-AUTH';`. La revoca è verificata ad ogni lettura/scrittura, anche se il token Auth non è ancora scaduto.

## Garanzie e controlli

- Tutte le scritture passano attraverso RPC che controllano membership e ogni campo. Le tabelle pubbliche concedono soltanto lettura ai membri; nessun DML diretto è concesso al browser.
- I corpi privilegiati sono nello schema `private`, non esposto alla Data API. Le funzioni pubbliche sono wrapper `SECURITY INVOKER`; i corpi privati fissano `search_path = ''`.
- Preventivi e righe vengono salvati nella stessa transazione. Totali e numeri sono calcolati nel database, senza fidarsi dei dati del browser.
- I prezzi sono IVA esclusa; gli adeguamenti vengono ripartiti per maggiori resti. IVA arrotondata per aliquota. La suite `tests/sql.test.ts` esegue realmente la migrazione in PostgreSQL embedded (PGlite) e verifica parità con TypeScript, privilegi, RLS, import atomici e conflitti.
- Le categorie del listino hanno anche un vincolo FK, coerente con il documento JSON, per impedire riferimenti orfani durante cancellazioni concorrenti. Un conflitto può annullare l’operazione e richiedere di aggiornare e riprovare; non lascia dati parziali. Gli import con ID duplicati vengono rifiutati interamente.
- Il progressivo è assegnato al primo salvataggio e riparte annualmente secondo Europe/Rome. Non viene riutilizzato dopo l’eliminazione. Le modifiche concorrenti richiedono la versione corrente.
- Il riferimento storico a cliente/prodotto può rimanere nello snapshot dopo l’eliminazione della sorgente. Non viene usato per ricostruire o aggiornare gli importi storici.

Esegui `npm test -- tests/money.test.ts tests/repository.test.ts tests/validation.test.ts tests/sql.test.ts` dalla cartella dell’app. PGlite verifica il SQL e le policies localmente senza account o servizi esterni. I test simulano `auth.uid()` e non verificano il gateway JWT Supabase; PGlite serializza le richieste alla propria connessione. L’autenticazione live e una prova concorrente con connessioni PostgreSQL distinte richiedono la configurazione dei punti precedenti.

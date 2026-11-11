# Piano RASI — allineare la piattaforma alle richieste (mail 16/10 → 11/11/2026)

## Context

Tra il 16/10 e l'11/11 RASI ha mandato 10 thread: il resoconto della call del 23/10 (punti A1–A7, B1–B2, C1–C7), contatti artisti, banca opere musica, scheda tecnica di ripartizione e 8 file Excel di ripartizioni 2024. Ho confrontato ogni richiesta con il codice (`main` @ `c0f0e13`), le PR aperte e lo schema. Obiettivo: chiudere quello che è già in bozza, poi realizzare il resto in quest'ordine: AGCOM → ruoli operatore → anagrafica → ripartizione → musica/IMDb → collecting.

Decisioni già prese con Matteo:
- **A5**: l'artista vede sempre le proprie partecipazioni. Quelle non validate hanno l'etichetta «In verifica».
- **Dati della ripartizione on demand**: visualizzazioni e ricavi arrivano dai report delle piattaforme, importati come campagne di programmazioni e copiati nelle individuazioni. Il calcolo parte dalle individuazioni.
- **Priorità**: prima si chiudono le bozze, poi AGCOM, ruoli, anagrafica, ripartizione.

## Stato verificato delle richieste

| # | Richiesta | Stato reale | Dove si chiude |
|---|---|---|---|
| A1 | IBAN + import CSV Veronica | Import contatti in prod (#55). **IBAN assente.** CSV non ancora importato (intestazioni identiche al formato atteso) | Fase 3 |
| A2 | Modifica scheda dall'artista con approvazione + alert email | Da fare. Oggi l'artista salva direttamente su `artisti`. **Falla**: `artisti_update_policy` non limita le colonne (l'artista può cambiare stato/mandato via API). Nessuna infrastruttura email | Fase 0 (falla) + Fase 3 |
| A3 | Stato Attivo/Cessato/Sospeso + Dettaglio + tutore/erede | Da fare. Enum con 5 valori; `artisti_referenti` esiste (vuota) ma mancano i campi dello screen; manca `luogo_decesso` | Fase 3 |
| A4 | Ordine diritti per categoria | PR bozza #64 (solo UI) | Fase 0 |
| A5 | Pinco Panco non vede la partecipazione | Causa: RLS `partecipazioni_select_policy` richiede opera o artista validati | Fase 0 |
| A6 | Note partecipazioni nascoste all'artista | PR bozza #65 (tabella `partecipazioni_note` + RLS) | Fase 0 |
| A7 | Estratti conto su Drive | Da RASI, non ancora arrivati | Backlog |
| B1/B2 | AGCOM: email+password, solo ARTISTI e OPERE integrali | Da fare. Il codice usa il ruolo `collecting`, il DB usa `readonly`: non coincidono. `readonly` oggi legge programmazioni, individuazioni e campagne; tutte le pagine sono accessibili; export senza traccia | Fase 1 |
| B1 | Collecting/utilizzatori: magic link a tempo, limite download, traccia | Da fare; RASI manderà il perimetro | Fase 7 |
| C1 | Filtro Validate/Non validate | **Fatto** (#56) | — |
| C2 | Repertori artisti da IMDb | Da fare. OMDb non cerca per persona | Fase 6 (spike) |
| C3 | Cast massivo da Excel | **Fatto** (#47, #51) | — |
| C4 | Episodi tramite tconst | Parziale: il tconst viene salvato, ma titolo/data/durata non vengono recuperati da IMDb | Fase 6 |
| C5 | Operatore pro / base / Tirocinante | Da fare: un solo ruolo `operatore`, nessun meccanismo di approvazione | Fase 2 |
| C6 | Oltre 1000 partecipanti per opera | PR bozza #66 (RPC paginata, `max_rows` invariato) | Fase 0 |
| C7 | Cancellare gli IPN | **Fatto** (#67). IPN musica massivi: i file non sono ancora arrivati | Fase 5 |
| 17 | Report artisti senza contatti | Da fare: nessun filtro né report su chi manca | Fase 3 |
| 18 | Import banca opere musica (CSV, 29.784 righe) | Da fare: nessun modello brani/ISRC | Fase 5 |
| 19 | Programma ripartizioni (scheda tecnica 29/4/2024) | **Calcolo assente.** Tabelle `campagne_ripartizione`/`ripartizioni` vuote; UI di sola lettura; #54 è solo UI | Fase 4 |
| 20 | IPD/SCAPR | Solo documentazione | Backlog |

---

## Intervento urgente prima della fase 1 — anteprima vuota nel mapping import (segnalazione dalla call dell'11/11)

**Context.** Durante il mapping del file `PLEX AVOD 2024.xlsx` (nuova emittente PLEX, `EMT_31`, ancora senza mapping), le colonne Episode Name, Season Number ed Episode Number hanno l'anteprima vuota. Il cliente pensa che la piattaforma non le legga e lo considera bloccante. Lo stesso era successo con Sky.

**Causa verificata nel codice.**
- `detectColumns` (`src/features/programmazioni/services/import-mapping.service.ts`) rileva tutte le colonne correttamente e conserva le prime 5 righe (`preview`).
- `MappingWizard.tsx` mostra però solo `detected.preview[0]`, cioè la prima riga del file. Nel file Plex è un FILM («Late Spring», 1949), e per un film quei tre campi sono vuoti per natura. Le righe SERIE, invece, li hanno valorizzati.
- La stessa riga alimenta anche il suggerimento delle trasformazioni di data (`suggestDateTransform`) e l'anteprima delle «Regole avanzate titoli» (`MappingRulesEditor`). Anche lì, con un file misto film/serie, il risultato è fuorviante.

**L'import non perde dati.** Si legge per nome di colonna, quindi basta mappare quelle colonne. In produzione il mapping Sky salvato include già titolo, numero episodio e stagione, e le programmazioni Sky hanno oltre 330.000 righe con quei campi valorizzati. Il blocco è solo nell'anteprima, che porta l'operatore a lasciare «ignora».

**Correzione** (piccola, solo frontend e funzioni pure, nessuna migration):
1. **Campioni per colonna.** Nuova funzione pura `buildColumnSamples(rows, columns, { scan: 500, examples: 3 })` in `import-mapping.service.ts`. Per ogni colonna restituisce il primo valore non vuoto, fino a 3 esempi distinti e il conteggio delle righe piene sul totale analizzato. Riusa `isBlankValue`, già presente e testata nello stesso file.
   - `detectColumns` restituisce anche `samples`; `preview` resta per compatibilità.
   - Per i CSV la lettura di campionamento passa da `preview: 50` a 500 righe. Per gli Excel il foglio è già letto per intero: si analizzano le prime 500 righe.
2. **Colonna «Anteprima» nel wizard** (`MappingWizard.tsx`): mostra il primo valore non vuoto e, sotto, in piccolo «32 su 500 righe piene», con gli altri esempi al passaggio del mouse. Se la colonna è vuota in tutto il campione, scritta ambra «vuota nelle prime 500 righe».
3. **Suggerimento date e regole avanzate.**
   - `suggestDateTransform` usa il primo valore non vuoto della colonna.
   - `MappingRulesEditor` riceve le righe campione e mostra il risultato della regola su un massimo di 3 righe con esito diverso. Così si vedono sia il caso film sia il caso serie.
4. **Suggerimento automatico del mapping**, solo su colonne non ancora mappate e solo senza configurazione salvata. Non sovrascrive mai una scelta. Alias di intestazione, confrontati senza maiuscole, spazi e parentesi:

   | Intestazione | Campo |
   |---|---|
   | Episode Name / Titolo episodio | `titolo_episodio` |
   | Season Number / Stagione | `numero_stagione` |
   | Episode Number / Numero episodio | `numero_episodio` |
   | Programme Title / Title / Titolo | `titolo` |
   | Duration (mins) / Durata | `durata_minuti` |
   | Number of Streams / Views | `views` |
   | Release Year / Anno | `anno` |
   | Director / Regia | `regia` |
   | TV/Film / Tipo | `tipo` |

   I campi suggeriti sono marcati «suggerito» e si cambiano dal menu come oggi.
5. **Caratteri rotti.** Nel file «Yasujirō Ozu» arriva come «YasujirÅ…». Si estende `mojibake_repair` (`src/features/programmazioni/utils/transforms.ts`) alle sequenze UTF-8 a due byte con prima lettera `Å`/`Ä` (ō, ł, ń, ś, ž, č…) e si aggiorna `MOJIBAKE_SENTINEL_RX`. La trasformazione si applica dal menu «Trasformazione» su titolo e regia. «TrÃ³caire» → «Trócaire» è già coperto.

**Test.**
- Unit su `buildColumnSamples`: file misto con la prima riga film, colonne episodio piene più sotto, colonna sempre vuota, valori 0 e `"0"` che non contano come vuoti (stesso criterio di `isBlankValue`).
- Unit su `suggestMappingFromHeaders`: header Plex e Sky, nessuna sovrascrittura del mapping esistente.
- Casi `mojibake_repair` per ō/ł/ž in `transforms.test.ts`.
- Test del componente (Testing Library) con un file misto: le tre colonne episodio mostrano un valore e il conteggio.
- `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`.

**Verifica end-to-end.** Avvio l'app in locale e con Playwright carico nel wizard un file Excel sintetico con le stesse 11 colonne del file Plex (prima riga film, poi righe serie): le colonne episodio devono mostrare valori e conteggi e risultare già suggerite. Dopo il rilascio chiedo al cliente di riaprire il mapping di PLEX con il suo file.

**Rilascio.** PR dedicata dal branch `claude/exciting-goodall-t754w5`, ripartito da `main` perché #68 è già unita. Solo codice, nessuna migration, quindi il merge basta.

**Stato dei punti 1–5:** già scritti in locale, non ancora committati. I test passano: servizio 56, wizard 3, trasformazioni 57.

### Aggiornamento 11/11 sera — cosa è emerso dall'upload PLEX in corso

Il cliente ha salvato il mapping PLEX alle 14:35 (corretto: colonne episodio mappate, `mojibake_repair` su titolo e nome episodio) e alle 14:51 ha lanciato l'upload «PLEX AVOD 2024», ancora in corso. Dalle prime 23.000 righe, lette in produzione in sola lettura, risultano tre problemi:

| Problema | Evidenza | Causa |
|---|---|---|
| Caratteri rotti salvati | 239 righe su 5.500 (es. «SalomÃ©», «MarialÃ©») | Il worker (`server/src/jobs/programmazioni-import-core.ts`, `applyTransform`) gestisce solo 9 delle 21 trasformazioni del wizard. `mojibake_repair` cade nel `default` e il valore resta invariato. Mancano anche `nbsp_to_space`, `netflix_episode_nbr`, `yyyymmdd_int_to_iso`, `year_range_*`, `seconds/milliseconds/fractional_hours_to_minutes`, `iso8601_duration_to_minutes`, `rti_apostrophe_minutes`, `decimal_minutes_to_int`. Alcune di queste finiscono nel ramo legacy «minutes» e producono valori sbagliati, non solo invariati. |
| `data_trasmissione` vuota su tutte le righe | 23.000 su 23.000 senza data | «Timestamp Month» vale `2024-12` (anno-mese) e la validazione delle date accetta solo date complete. |
| Episodi | Per ora 0 righe serie | Il file è ordinato con prima i film e poi le serie: non è un errore. Il mapping è corretto e la logica del worker è generica, quindi le colonne episodio verranno lette. Da ricontrollare a fine upload. |

**Interventi aggiuntivi, nella stessa PR:**
6. **Trasformazioni del worker allineate all'app.**
   - `src/features/programmazioni/utils/transforms.ts` diventa la fonte di riferimento. Si copia in `server/src/lib/transforms.ts` (lo stesso schema già usato per `absent-data.ts` ed `excel-time.ts`) insieme alla dipendenza `year-parse.ts`.
   - `applyTransform` del worker usa questa copia. Per i nomi sconosciuti o legacy (es. `null_if_ND`, salvato per TIM VISION TVOD) mantiene il comportamento attuale: valore invariato o ramo legacy «minutes». Niente eccezioni.
   - Test di parità nell'app: importa le due implementazioni e confronta l'output di ogni trasformazione su un insieme di valori campione. Fallisce se le due copie divergono.
7. **Date anno-mese.**
   - Nell'app (`validateDate` in `src/features/programmazioni/utils/coercion.ts`) e nel worker (`coerce` dei campi data), `YYYY-MM` e `YYYY/MM` diventano il primo giorno del mese (`2024-12` → `2024-12-01`): è il periodo del report mensile delle piattaforme. Oggi quei valori diventano vuoti, quindi nessun dato esistente peggiora.
   - Test anche con una cella Excel di tipo data formattata `yyyy-mm`.
8. **Dati PLEX già caricati.**
   - Finché le correzioni non sono in produzione (app su Vercel e worker su Railway), non si lancia l'individuazione sulla campagna «PLEX AVOD 2024».
   - Dopo il deploy: si elimina la campagna con la funzione esistente (`delete_campagna_programmazione_safe`) e il cliente ricarica lo stesso file. In alternativa, con OK esplicito, una correzione SQL mirata dei titoli; la data però non si recupera, perché il valore originale non viene salvato.
   - Verifica a fine upload: righe serie con numero episodio e stagione, zero titoli con `Ã`/`Å`, `data_trasmissione` valorizzata.

**Rilascio del worker.** Il worker gira su Railway: dopo il merge controllo che il deploy del worker parta e riporti il commit nuovo. Il connettore Railway in questa sessione non è collegato, quindi può servire una conferma dalla dashboard.

## Rilascio fase 0 — completato l'11/11 (PR #68)

**Stato del lavoro.** La fase 0 è pronta sul branch `claude/exciting-goodall-t754w5`: #64, #65, #66 e #54 integrate, A5, blocco colonne e correzione della RPC (`20261111155000`). I test sono verdi.

**Cosa ho verificato in produzione, in sola lettura** (progetto `jdflzupcfwdcajxfobfj`):
- Nessuna delle quattro migration è applicata: c'è ancora `partecipazioni.note`, mancano `partecipazioni_note`, `list_partecipazioni_opera` e il trigger.
- Le policy sono quelle di `20261020212235`.
- #53 **non** è applicata. Va aggiornata (ramo artista senza validazione) prima di applicarla, altrimenti annulla A5.
- Nessuna funzione o vista legge `partecipazioni.note`, quindi il DROP di #65 è sicuro. Ci sono 20 partecipazioni con nota da spostare.
- Pinco Panco ha un utente collegato e una partecipazione a «test»; artista e opera sono entrambi `da_validare`. La causa di A5 è confermata.
- L'opera più grande ha 1.551 partecipazioni.
- Su Vercel ogni merge su `main` va direttamente in produzione (`trae_rasi_7kb7`, team jigo). Le migration in produzione sono registrate con `apply_migration` e il nome del file.

**Sequenza** (riduce al minimo la finestra in cui codice e database non coincidono):
1. Apro la PR della fase 0 verso `main`, con il template del repo, e controllo la CI.
2. Prima del merge applico con `apply_migration` le due migration compatibili con il codice attuale:
   - `20261111143000_partecipazioni_oltre_max_rows`: aggiunge solo la RPC.
   - `20261111170000_artista_repertorio_e_blocco_colonne`: allarga la vista dell'artista e aggiunge il trigger. Il form attuale usa solo campi consentiti.
3. Verifica in sola lettura:
   - Testo della policy e presenza del trigger.
   - In una transazione con ROLLBACK, impersonando l'utente di Pinco Panco: count = 1.
   - `list_partecipazioni_opera` sull'opera da 1.551 restituisce `total_opera` = 1551.
4. Merge della PR, poi attendo che il deploy di produzione sia READY.
5. Appena il deploy è READY applico `20261111150000_partecipazioni_note_nascoste_artista` e `20261111155000_list_partecipazioni_opera_note_separate`. Per un minuto o due la scheda partecipazioni (lista e note) può dare errore: il codice nuovo usa `partecipazioni_note` prima che esista.
6. Verifica:
   - 20 righe in `partecipazioni_note` e colonna eliminata.
   - La RPC risponde e restituisce la nota.
   - L'artista non legge `partecipazioni_note`.
   - `get_advisors` (security) senza avvisi nuovi.
   - Log runtime di Vercel senza errori.
7. Chiudo #64, #65, #66 e #54 con un commento che rimanda alla PR della fase 0. Segnalo su #53 la modifica necessaria.

**Rollback:** redeploy del commit precedente con `request_rollback` su Vercel, più lo script `supabase/rollback/20261111150000_…` di #65 per le note. Per A5 e il trigger basta ricreare la policy precedente e fare `DROP TRIGGER`.

## Fase 0 — Chiudere le bozze e i difetti rapidi (circa 2 giorni)

1. **Rilasciare #64, #65, #66, #54** in quest'ordine, con rebase su `main` e verifica delle migration su DB locale (`scripts/dev/bootstrap-local-supabase.sh`) prima della produzione. Note:
   - #65 lascia leggere le note a `readonly`. Va bene se AGCOM deve vedere le opere «integrali»; da confermare in Fase 1.
   - Le migration di #65 e #66 vanno applicate in produzione nello stesso rilascio del codice.
2. **A5**: nuova migration che riscrive il ramo artista di `partecipazioni_select_policy` in `artista_id = get_user_artista_id()`, senza condizione di validazione. Il ramo `individuazioni` resta invariato: i compensi restano legati alle opere validate.
   - UI: `src/app/dashboard/profilo/page.tsx` (tab repertorio) mostra il badge «In verifica» se `opere.stato_validazione <> 'validato'`.
   - Va coordinata con #65, che tocca la stessa query in `getPartecipazioniByArtistaId` (`src/features/artisti/services/artisti.service.ts`).
3. **Falla A2**: trigger `BEFORE UPDATE ON artisti`. Se `get_user_role()='artista'`, rifiuta modifiche fuori dalla whitelist di `src/features/artisti/lib/artista-self-update.ts`: stato, mandato, diritti, IPN, `stato_validazione`, `is_rasi`, `ambito`. In Fase 3 il ramo artista della policy sparisce del tutto.
4. Test: script SQL di verifica RLS in transazione con `ROLLBACK`, sullo schema di `supabase/scripts/20261111150000_partecipazioni_note_rls_test.sql` di #65. Più i test esistenti in `src/features/artisti/lib/*.test.ts`.

## Fase 1 — Accesso AGCOM (B1/B2) (circa 3–4 giorni)

- **Ruoli allineati.** `readonly` diventa il ruolo «Istituzione (AGCOM)».
  - In `src/shared/lib/auth-permissions.ts` si aggiunge `readonly` a `UserRole`.
  - `resolveUserRole` non deve più trasformare un ruolo sconosciuto in `collecting`: restituisce `null` e l'accesso viene negato.
  - `collecting` resta nel tipo ma non è assegnabile finché non arriva la Fase 7.
  - Si aggiornano `rolesAssignableBy`/`rolesInvitableBy` e `AVAILABLE_ROLES` (`src/shared/contexts/auth-context.tsx`).
  - Le policy che usano `IS DISTINCT FROM 'artista'` (partecipazioni, individuazioni) diventano esplicite: oggi lasciano leggere anche a chi ha ruolo NULL.
  - Si valuta `enable_signup=false`: oggi chi si registra da solo resta senza ruolo.
- **Perimetro di navigazione.**
  - `src/features/public-site/middleware-policy.ts`: per `readonly` solo `/dashboard/artisti*` e `/dashboard/opere*`; `/dashboard` reindirizza ad artisti.
  - La sidebar in `src/app/dashboard/layout.tsx` viene filtrata di conseguenza.
  - Pulsanti Nuova/Modifica/Elimina/Import/Export completo nascosti tramite un helper `canEditCatalog(role)` in `auth-permissions.ts`.
- **RLS per `readonly`** (nuova migration):
  - Si apre: `artisti` per tutti gli stati (oggi solo attivo/minorenne); `partecipazioni` e `cast_esterno` per tutte le righe.
  - Si chiude: programmazioni, individuazioni, campagne_* e ripartizioni.
  - Restano chiusi: `artisti_note`, `artisti_dati_riservati` (con l'IBAN) e i dati bancari dei referenti.
- **Traccia degli export** (serve anche alla Fase 7).
  - RPC `log_export(entita, righe, filtri)` SECURITY DEFINER che scrive in `audit_log` con l'azione nuova `EXPORT` (si estende il CHECK della migration `20261012100400`).
  - La chiamano gli export client di artisti (`src/app/dashboard/artisti/page.tsx`), opere (`src/app/dashboard/opere/page.tsx`) ed export completo (`src/app/dashboard/page.tsx`).
  - Visibile in `registro-attivita` (`src/features/registro-attivita/lib/audit-log-display.ts`).
- **Creazione utenza AGCOM**: tramite `/api/users` (`src/app/api/users/route.ts`), invito con password, appena RASI comunica l'email.
- Test: `middleware-policy` e `auth-permissions` (unit), script RLS per il ruolo readonly, smoke test con Playwright loggati come readonly.

## Fase 2 — Ruoli operatore e coda di approvazione (C5) (circa 6–8 giorni)

- **Ruoli.** Si aggiungono `operatore_base` e `tirocinante` all'enum `ruolo_utente` (migration con `ALTER TYPE … ADD VALUE`). `operatore` resta e prende l'etichetta «Operatore pro». Nessuna migrazione di dati.
- **Infrastruttura condivisa** (la usa anche A2):
  - Tabella `modifiche_proposte`: id, `entita` (opera | episodio | partecipazione | cast_esterno | artista), `entita_id`, `opera_id`, `operazione` (insert/update/delete), `payload` jsonb (solo i campi cambiati più i valori precedenti), `stato` (in_attesa/approvata/respinta), `proposta_da`, `revisionata_da`, `nota_revisione`, timestamp.
  - RLS: chi propone vede le proprie; admin e operatore vedono tutto.
  - RPC SECURITY DEFINER:
    - `proponi_modifica`: controlla il ruolo e **rifiuta se l'opera è `validato`**.
    - `approva_modifica`: solo admin/operatore; applica il payload con una whitelist di colonne per entità e scrive in `audit_log`.
    - `respingi_modifica`.
- **Permessi.**
  - `operatore_base`: legge tutto come oggi un operatore, ma scrive solo tramite proposte e solo sulla sezione Opere.
  - `tirocinante`: middleware limitato a `/dashboard/opere*`; RLS di lettura su opere, episodi, partecipazioni e cast_esterno; per scegliere gli artisti nel cast usa una RPC `cerca_artisti_per_cast` che restituisce solo id, nome, cognome e nome d'arte.
  - Validare o svalidare resta possibile solo ad admin/operatore, perché base e tirocinante non scrivono direttamente. Si aggiungono `opere.validato_da` e `opere.validato_il`.
- **UI.**
  - In `src/app/dashboard/opere/[id]/page.tsx` e nei form di opera, episodi e cast, i ruoli base e tirocinante salvano tramite `proponi_modifica` e vedono il banner «In attesa di approvazione». Su opera validata i campi sono in sola lettura.
  - Gli import cast/episodi (`cast-import.server.ts`, `src/app/api/opere/[id]/episodi/import/route.ts`) producono un'unica proposta batch.
  - Nuova pagina `src/app/dashboard/approvazioni` (admin/operatore) con diff campo per campo, Approva/Respingi e contatore nella sidebar.
- **Utenze**: si assegnano i ruoli agli indirizzi del resoconto da `/dashboard/utenti`, dopo il deploy.
- Test: unit su whitelist e applicazione del payload, script RLS per ogni ruolo, test della pagina approvazioni.

## Fase 3 — Anagrafica artisti (A1, A2, A3, punto 17) (circa 6–8 giorni)

- **Import CSV Veronica** (operativo, subito dopo la Fase 0): si usa `/dashboard/artisti/contatti-import`, che ha già le 13 colonne del file. Regime e tassazione finiscono in `artisti_dati_riservati`, riservata allo staff: così l'artista non li vede, come chiesto.
- **Punto 17, artisti senza contatti.**
  - Filtro «Contatti mancanti» (email e telefono vuoti in `artisti.contatti`) in `src/features/artisti/services/artisti.service.ts` e in `src/app/dashboard/artisti/page.tsx`. L'export CSV esistente fa da report.
  - Nel riepilogo post-commit dell'import (`summarizeContattiCommit`) si aggiunge l'elenco degli artisti RASI assenti dal file.
- **A1, IBAN.**
  - Colonne `iban`, `swift_bic`, `aba` in `artisti_dati_riservati`, con validazione del checksum IBAN in un nuovo `src/features/artisti/lib/iban.ts` con test.
  - Pannello `artista-dati-riservati-panel.tsx`.
  - Colonna opzionale `iban` nell'import contatti (`src/features/artisti/lib/contatti-import.ts`).
- **A3, stato e dettaglio.**
  - Nuovo enum `dettaglio_stato` (regolare | minore | erede), colonna `artisti.stato_dettaglio`, obbligatoria quando `stato='attivo'`.
  - Migrazione dati: `minorenne` → attivo/minore; `deceduto` → attivo/erede (oppure cessato se non ci sono eredi: da confermare). Gli enum non perdono valori, ma la UI ne offre solo 3.
  - Nuova colonna `luogo_decesso`.
  - Da aggiornare: `STATO_LABELS` e il badge (`src/features/artisti/lib/artista-display.ts`, `artista-stato-badge.tsx`), la colonna «Dettaglio» tra Stato e Fine mandato nella lista, i filtri, `artista-form-multistep.tsx`, la policy readonly basata su stato e gli alert in `alert_scadenze`.
  - **Referenti**: si estende `artisti_referenti` con i campi dello screen (luogo e nazione di nascita, data di nascita, domicilio, residenza se diversa, cellulare, fax, partita IVA, grado di parentela).
  - I dati bancari del referente (IBAN, SWIFT, ABA) vanno in una tabella staff-only `artisti_referenti_riservati`.
  - La sottosezione in `artista-referenti-panel.tsx` compare quando il dettaglio è minore o erede. `quota_percentuale` regge già più eredi.
- **A2, modifica dall'artista.**
  - `profilo-dati-tab.tsx` invia una proposta (`entita='artista'`) invece di chiamare `updateArtista`. La pagina mostra «Modifica in attesa».
  - Si rimuove il ramo artista da `artisti_update_policy`.
  - L'approvazione avviene nella pagina della Fase 2.
  - **Alert email** a `serviziagliartisti@…`: route server `src/app/api/artisti/proposte/route.ts` che inserisce la proposta e invia l'email con un provider transazionale (Resend o l'SMTP di RASI). Il mittente usa il dominio RASI: si configurano SPF/DKIM con le credenziali del dominio del 16/10, coordinandosi con Fernando. Env: `RASI_ALERT_EMAIL` e la chiave del provider.

## Fase 4 — Motore di ripartizione (punto 19) (circa 12–15 giorni)

**Regole ricavate dalla scheda tecnica e verificate sulle formule degli Excel di Paolo:**
- **Lineari** (Rai, Discovery «equiparata tematica»):
  - Quota per utilizzazione = 73%·F/n + 10%·F/n_generaliste + 9%·F/n_>60' + 8%·F/n_19:00–23:30. Paolo arrotonda ogni quota a 2 decimali (3,18 / 4,71 / 3,51 / 4,81).
  - 1ª ripartizione = quota/11 × 5,51 | 2,49 | 1,8 (direzione +10%) | 1,2.
  - 2ª ripartizione = (F − Σ1ª)/n × 3,5 | 1,1 | 0,4 | 0,2.
  - Infine riduzione o aumento proporzionale fino a Σ = F (nell'esempio Rai ×96,404%).
- **On demand**:
  - Quota opera = views × F/Σviews (SVOD), oppure ricavi × F/Σricavi (TVOD, Apple 3,7043%).
  - Senza views per una riga: 10% della media. Catalogo senza views (Amazon, Rakuten): F/n.
  - 1ª ripartizione come sopra; 2ª = 1ª × 3,5 | 1,1 | 0,4 | 0,2.
  - Resto: (F − Σ1ª+2ª)/n sommato a ogni riga.
  - Minimo 1,50 € per riga, poi riduzione proporzionale fino a Σ = F.
- n = numero di utilizzazioni, cioè di righe opera×artista×ruolo; non le visualizzazioni. Al massimo 3 ruoli per artista per opera.

**Implementazione:**
- **Schema** (migration):
  - `ruoli_tipologie.categoria_ripartizione` (primario | comprimario | doppiatore_primario | direzione_doppiaggio | doppiatore_comprimario), mappata sui codici esistenti.
  - Tabella `campagne_ripartizione_sorgenti`: campagna_ripartizione_id, campagna_individuazione_id, `metodo` (lineare | od_views | od_ricavi | od_utilizzazioni), fondi assegnati, canali generalisti (per il 10%).
  - Tabella `ripartizioni_righe`, una per individuazione: categoria, quota_opera, rip1, rip2, resto, minimo, coefficiente di riduzione, importo finale.
  - Parametri versionati in `parametri_ripartizione` («Regolamento 29/04/2024»).
- **Motore puro TypeScript** in `server/src/ripartizione/engine.ts`, senza I/O e con test. Il volume è alto (RTI ha 539k righe), quindi gira nel worker.
  - Job `server/src/jobs/ripartizione-runner.ts`, sullo schema di `individuazione-runner.ts`: lock, lettura a batch, scrittura a chunk, ripresa.
  - Route `/api/ripartizione` in `server/src/index.ts`.
  - Risultato aggregato su `ripartizioni` (per artista, con `calcoli.breakdown` per sorgente e ruolo) e stato `calcolata`.
- **Controlli prima del calcolo** per ogni sorgente: righe senza views, ricavi, orario o durata, e ruoli senza categoria. Riusa `inferDataHealthPreset` (`src/features/programmazioni/services/data-health-policy.service.ts`). Tratta in modo esplicito i casi noti: RTI con views vuote, Amazon/Rakuten, emittente «RAI» ambigua.
- **UI.**
  - `src/app/dashboard/ripartizioni/[id]/page.tsx`: configurazione delle sorgenti, fondi, controlli, «Calcola / Ricalcola» (fino ad `approvata`), approvazione (admin) e passaggio a `distribuita`.
  - Export Excel nel formato di Paolo: `F <EMITTENTE> <ANNO>_INDIVIDUAZIONI.xlsx` con il foglio «Dati conteggi», riusando la libreria di `src/features/individuazioni/services/individuazioni-export.service.ts`.
  - L'area artista (tab compensi in `profilo/page.tsx`) legge già `ripartizioni`.
- **Golden test**: fixture **anonimizzate** ricavate dagli 8 Excel (nomi sostituiti da id, solo numeri), da non committare in chiaro. Il motore deve riprodurre i totali per riga e il foglio «Dati conteggi» entro 0,01 € per Rai (generaliste e tematiche), Apple TVOD, Apple SVOD, RaiPlay, Disney+, Netflix, Paramount+ e Timvision SVOD/TVOD. Per Discovery c'è solo il totale finale.
- **Fase 4b**, dopo la conferma di RASI: copia privata video (50/50, minimo 120 €, proporzionale ai compensi art. 80/84) e TV locali.

## Fase 5 — Musica (punto 18, IPN musica) (circa 4–5 giorni)

- **Modello.** Opere con `tipo='musicale'` (valore già presente) e nuove colonne `isrc`, `album`, `etichetta`, `artista_principale`, `paese_pubblicazione`; la durata usa `durata_minuti`. Nuovi codici in `ruoli_tipologie`: AIE primario, AIE comprimario, produttore.
- **Import** (admin): pagina con anteprima e report (righe nuove, duplicate, artista non trovato), commit tramite RPC a batch, idempotente su ISRC (escludendo «n.p.») oppure su titolo+album+artista. L'artista viene abbinato tramite «ID Mandante RASI» (da chiarire dove sia salvato oggi), poi codice fiscale, poi nome.
  - CF, data di nascita e diritti del CSV servono **solo** per l'abbinamento: non sovrascrivono l'anagrafica, le differenze finiscono nel report.
  - Ricalca il flusso di `contatti-import` (`src/features/artisti/lib/contatti-import.ts` e `.server.ts`).
- **IPN musica massivi**: un import a due colonne (artista, IPN) sullo stesso flusso, quando arriveranno i file di Veronica.

## Fase 6 — IMDb (C4, C2) (circa 3–4 giorni)

- **C4.** Nell'import episodi (`src/features/opere/lib/episodi-import.ts` e la route di import), una riga con il solo tconst viene completata lato server via OMDb (`i=tconst`) con titolo, data (si estende `buildTitleDetail` in `src/features/opere/services/external/omdb.ts` per leggere `Released`), durata, stagione ed episodio. In anteprima questi campi risultano «da IMDb». Cache e limite di chiamate.
  - Si aggiunge il controllo di autenticazione alle route `src/app/api/imdb/*`, oggi pubbliche.
- **C2, spike di fattibilità.** OMDb non supporta le persone. La proposta è TMDB (`/find/{nconst}` → `combined_credits`), con un prototipo «Importa repertorio» nella scheda artista che abbina le opere al catalogo e crea partecipazioni come proposte. Si scarta il dataset IMDb non commerciale per la licenza. Esito documentato in `docs/superpowers/specs`.

## Fase 7 — Collecting e utilizzatori (dopo il perimetro di RASI)

- Ruoli `collecting` e `utilizzatore`.
- Tabella `accessi_esterni`: utente, organizzazione, `scade_il`, `limite_righe_download`, perimetro jsonb.
- Login con magic link (`signInWithOtp`); il middleware controlla la scadenza.
- Download solo tramite un endpoint server che conta le righe per accesso, le blocca oltre il limite e le registra con `log_export` della Fase 1.
- Gli utilizzatori vedono solo i dati già pubblici (cinema e musica del sito).
- Si rilegge la delibera AGCOM 396/17/CONS allegata.

## Backlog e azioni di RASI

- A7: estratti conto su Drive, poi la loro esposizione nel tab compensi dell'artista (bucket Storage per artista).
- IPD/SCAPR: nessuno sviluppo finché non parte l'onboarding.
- PR non legate alle richieste (#53, #59, #61): fuori da questo piano.

## Domande aperte per RASI

1. AGCOM «integrale»: comprende CF, contatti, note interne, referenti e IBAN? Proposta: sì per anagrafica, contatti e diritti; no per note interne, dati riservati e IBAN.
2. Indirizzo email dell'utenza AGCOM.
3. Un artista deceduto senza eredi: Cessato o Attivo/Erede? Più eredi con quote: confermato?
4. L'artista può proporre la modifica del proprio IBAN?
5. C4: «tramite tconst» vuol dire scrivere solo il tconst e far compilare il resto alla piattaforma?
6. Ripartizione:
   - Le vendite RTI valgono come visualizzazioni?
   - Amazon e Rakuten si dividono per utilizzazioni?
   - Arriveranno i ricavi per le altre piattaforme?
   - L'emittente «RAI» è RaiPlay o un palinsesto?
   - Il minimo di 1,50 € vale per riga o per artista?
   - Contano solo le individuazioni validate?
7. Musica: dove si trova oggi l'«ID Mandante RASI» degli artisti?

## Verifica

- Per ogni PR: `npm test`, `npm run lint`, `npm run typecheck`, `npm run build`, `npm --prefix server run typecheck`. Più gli script RLS in transazione su DB locale (`supabase start` + `scripts/dev/bootstrap-local-supabase.sh`).
- **E2E**: con Playwright e utenti di test per ruolo (admin, operatore, operatore_base, tirocinante, readonly, artista), si controlla per ciascuno la navigazione permessa, le scritture negate e il giro proposta → approvazione.
- **Ripartizione**: i golden test sulle fixture anonimizzate devono passare. Poi un calcolo su una campagna reale in staging, da confrontare con l'Excel di Paolo per la stessa emittente.
- Le migration non vengono applicate in produzione senza OK esplicito, sempre insieme al codice che le usa.
- Dopo l'approvazione, questo piano viene salvato in `docs/superpowers/plans/2026-11-11-allineamento-richieste-rasi.md` sul branch `claude/exciting-goodall-t754w5`.

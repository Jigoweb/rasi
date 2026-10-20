# Piano repair della storia migration

Read-only rispetto allo schema. `supabase migration repair` scrive solo `supabase_migrations.schema_migrations`: non esegue i file SQL e non torna indietro sugli oggetti.

Va usato **dopo il merge di #45**, sul database scelto con `TARGET=local` o `TARGET=linked`. Questo repository non lo ha eseguito. Non lanciarlo contro produzione finché le query di pre-check non sono state lette e i gate sotto non sono veri.

Lo script `migration_repair_plan.sh` di default stampa i comandi ed esce. Li esegue solo con `CONFIRM=apply-repair`.

Dopo il merge i file locali sono 93 (82 del repo post-rename + 11 no-op di questo piano). Produzione oggi ha 139 versioni. Il repair sotto ne toglie 73 e ne marca 18 come già applicate. Restano 9 file solo-locali, volutamente pending: `supabase migration list` è allineato **tranne quelle 9 righe**.

## Conteggi

| Azione | Quante | Effetto su `schema_migrations` |
|---|---:|---|
| `repair --status reverted` | 73 | 62 baseline `db/init` + 11 split già coperti da un file locale |
| File no-op aggiunti al repo | 11 | Nessun repair: la versione remota resta `applied`, il file locale ora esiste |
| `repair --status applied` | 18 | 15 file repo già riflessi in prod + 3 timestamp repo dei file fuori ordine |
| Nessun repair (pending) | 9 | Restano solo-locali finché un push reale, non questo script |

## Pre-check

1. `supabase migration list` (con `--local` o `--linked`, lo stesso `TARGET` del repair). Annotare le righe solo-remote e solo-locali.
2. Eseguire le query in fondo, in sola lettura. Se un gate fallisce, fermarsi: non lanciare il repair.
3. Se `TARGET=linked`, leggere `supabase/.temp/project-ref` e confermare che è il progetto voluto.

## Ordine

1. Merge di #45 (contiene i rename e questi 11 no-op).
2. Pre-check.
3. I 73 `reverted`, poi i 18 `applied`, nell'ordine dello script. I no-op non vanno riparati: sono già `applied` in remoto.
4. Post-check.
5. Non includere i 9 pending in questo giro e non fare `db push` insieme al repair.

```bash
# solo stampa
./supabase/scripts/migration_repair_plan.sh

# esegue, storia locale
CONFIRM=apply-repair TARGET=local ./supabase/scripts/migration_repair_plan.sh

# esegue, storia del progetto collegato
CONFIRM=apply-repair TARGET=linked ./supabase/scripts/migration_repair_plan.sh
```

## Post-check

`supabase migration list` di nuovo.

Atteso:

- Nessuna versione remota senza file locale.
- Le 11 versioni no-op risultano applicate da entrambi i lati.
- I 18 timestamp marcati `applied` risultano applicati da entrambi i lati.
- Solo questi 9 file restano locali e non remoti: `20260608120000`, `20260623140000`, `20260623173000`, `20260623180500`, `20260623220000`, `20260626170400`, `20260630125200`, `20260811183000`, `20260911160000`.

Se una query di pre-check mostra che uno di questi 9 è già nello schema, spostare quel timestamp nell'array `APPLY_LOCAL` dello script **prima** di eseguirlo, e toglierlo dai pending. Non farlo a occhio.

## Annullamento

Il repair non ha down SQL. L'inverso, stesso script:

```bash
CONFIRM=apply-repair TARGET=local UNDO=1 ./supabase/scripts/migration_repair_plan.sh
```

`UNDO=1` rimette `applied` le 73 versioni appena marcate `reverted`, e marca `reverted` le 18 appena marcate `applied`. Non cancella i file no-op e non rilancia DDL. Per tornare anche al tree di prima del piano, togliere i 11 no-op con git: le 11 versioni tornano solo-remote, che è lo stato precedente al merge di questo piano.

## 73 versioni da marcare reverted

### 62, fino a `20260514115842`

Sono la storia applicata prima che `supabase/migrations/` diventasse la fonte incrementale. Lo schema corrispondente sta in `db/init/*.sql` (`opere`, `artisti`, matcher e chunk di base). `docs/DEVELOPMENT.md` lo dice: le migration di cartella assumono quel baseline e non vanno rilanciate su un database vuoto al posto di `db/init`.

Un no-op per ciascuna terrebbe 62 versioni che il repo ha scelto di non riprodurre. `reverted` toglie solo la riga di storia. Non droppa tabelle. Un database nuovo continua a nascere da `db/init` più le migration incrementali, come oggi.

Elenco nello script, array `REVERT_BASELINE`.

### 11 split coperti da un file locale

Il file locale è stato marcato `applied` (sotto). La versione remota con un altro nome è lo stesso cambiamento spezzato. Tenerle entrambe duplica la storia; un no-op non aggiunge schema. `reverted` sulla versione spezzata lascia una sola riga, quella del file combinato.

| Versione remota | Coperta da |
|---|---|
| `20261012164953` `artisti_documento_columns` | `20261012100100_artisti_documento_note_referenti.sql` |
| `20261012165246` `artisti_documento_indexes` | stesso file |
| `20261012165545` `artisti_select_policy_minorenni` | stesso file (policy con `minorenne`) |
| `20261012165706` `artisti_note_referenti` | stesso file (`artisti_note`, `artisti_referenti`) |
| `20261012170022` `cast_esterno_episodio_e_nome_key` | `20261012100200_cast_esterno_episodi_e_riconoscimento.sql` |
| `20261012170327` `cast_esterno_riconoscimento_lettura` | stesso file (`nome_persona_key`, cerca/converti) |
| `20261012170614` `audit_log_table` | `20261012100400_audit_log.sql` |
| `20261012170622` `audit_log_revoke_writes` | stesso file |
| `20261012170648` `audit_log_row_change_function` | stesso file |
| `20261012170815` `audit_log_triggers` | stesso file |
| `20261012170844` `audit_log_auth_users` | stesso file |

Non abbiamo lo SQL eseguito in produzione, solo i nomi e il file locale. Il gate è la query oggetti: se manca `documento_tipo`, `artisti_note`, `episodio_id`, `nome_persona_key` o `audit_log`, non fare reverted su questi 11 e non marcare applied il file combinato.

## 11 no-op (storia tenuta, SQL non rieseguito)

File commento, zero statement. La versione remota resta `applied`.

| File | Perché non reverted |
|---|---|
| `20260623172138_fix_init_campagna_individuazione_state_model.sql` | Hotfix remoto senza corpo nel repo. Le definizioni successive di `init_campagna_individuazione` sono già file applicati; il no-op non le sovrascrive. |
| `20260707160043_matcher_year_semantics_restore.sql` | Correzione subito dopo `matcher_year_semantics`. Il corpo non c'è. `matcher_derive` e `matcher_sky` ridefiniscono la funzione dopo. |
| `20260708095927_episode_alert_opera_delete_cascade.sql` | Il repo crea `opera_id` con `ON DELETE SET NULL` (`20260629175235`). Il cascade, se diverso, è solo in questa versione remota. Reverted la farebbe sparire dalla storia senza copiare il vincolo. |
| `20260709164556_dashboard_health_matching_fields.sql` | Versione remota di luglio, SQL assente. Non è il file locale di settembre. |
| `20260709165041_dashboard_health_data_fine_mandato_informational.sql` | Come sopra. |
| `20260803121351_matcher_sky_gap_a_d_body.sql` | Il piano `2026-08-03-matcher-sky-gap-rerun.md` dice che il matcher è stato applicato anche come `matcher_sky_gap_a_d_body`. Il file di repo è `20260803121140`. |
| `20260803121707_matcher_sky_gap_a_d_full.sql` | Terza versione remota della stessa linea, senza corpo nel repo. |
| `20260922135117_drop_rasi_enc_chunks_scratch.sql` | DROP già avvenuto. La relazione scratch non è nello schema versionato; il no-op non rilancia il drop. |
| `20260624125441_fix_episode_signal_warning_array_append.sql` | Vedi i tre file fuori ordine. |
| `20261012163215_artisti_stati_e_tipo_musicale.sql` | Vedi i tre file fuori ordine. |
| `20261012170455_alert_scadenze.sql` | Vedi i tre file fuori ordine. |

## Tre file fuori ordine

Lo SQL vero non si sposta: al timestamp di produzione passerebbe prima di una migration da cui dipende.

| SQL vero (resta) | No-op al timestamp prod | Repair |
|---|---|---|
| `20260624145500_fix_episode_signal_warning_array_append.sql` | `20260624125441_...sql` | `applied` su `20260624145500` |
| `20261012100000_artisti_stati_e_tipo_musicale.sql` | `20261012163215_...sql` | `applied` su `20261012100000` |
| `20261012100300_alert_scadenze.sql` | `20261012170455_...sql` | `applied` su `20261012100300` |

Motivi dell'ordine, invariati rispetto a #45:

- Il fix di `derive_programmazione_episode_signals` deve restare dopo `20260624142500_episode_normalization_matching_fallback.sql`, che definisce la stessa funzione. In produzione il corpo è già stato sostituito da `20260626135142_fortify_episode_compound_codes.sql`. Rilanciare il fix dopo il repair lo riporterebbe indietro, perché fortify è già `applied` e un push non lo riesegue.
- `ADD VALUE` di `minorenne` deve restare prima di `20261012100100`, che usa l'enum nella policy.
- `alert_prese_visione` deve esistere prima di `20261012100400_audit_log.sql`, che crea il trigger solo se `to_regclass` trova la tabella.

Il no-op soddisfa il check «remote version not in local directory». `applied` sul timestamp del repo evita che un push riesegua lo SQL già entrato in produzione con l'altro numero.

## 18 versioni da marcare applied

Effetto già in produzione. Il repair registra il timestamp del file e non riesegue il corpo. Serve perché un `db push` dei `CREATE OR REPLACE` più vecchi sovrascriverebbe funzioni già sostituite da migration con timestamp successivo già `applied` (`matcher_sky`, `split_episode`, `fortify`, `mandate_year`).

| Versione | Giudizio dal SQL, senza connessione |
|---|---|
| `20260608120100` … `20260608120600`, `20260619100000` | Catena di `match_programmazione_to_partecipazioni` / `process_programmazioni_chunk`. Il suffisso serie, `episodio_mancante` e il dedup per artista/ruolo sono nel corpo già versionato di `20260707155913`, `20260803121140`, `20260626120400`, `20260629175235`. |
| `20260623170000` | Crea `upload_jobs` e `programmazioni.import_row_uid`. `20260629132441` (già in prod) fa `ALTER TABLE upload_jobs`: la tabella c'era. |
| `20260624142500` | Definisce `derive_programmazione_episode_signals` e una versione intermedia del matcher. Il derivatore è poi `20260626135142` (in prod); il matcher è poi `20260803121140`. |
| `20260624145500` | Il fix episodio, già in prod come `20260624125441`, poi superato da fortify. |
| `20260624161000` | Crea `campagne_individuazione_processed_programmazioni`. `20261015142815` (in prod) fa `ALTER TABLE` su quella tabella. |
| `20261002160000` | `CREATE TYPE ambito_artista` non idempotente. `20261005154123` (in prod) crea tipo e colonna con `IF NOT EXISTS`. Un push di questo file fallirebbe sul tipo già presente. |
| `20261007160000` | È un no-op se `get_user_email_by_id` esiste. Il commento nel file punta alla migration storica `create_get_user_email_function`; il revoke `20261020122804` è in prod e altera la stessa funzione. |
| `20261012100000` | Enum `minorenne` / `deceduto` / `musicale`, già in prod come `20261012163215`. |
| `20261012100100`, `20261012100200`, `20261012100400` | Corpi combinati degli 11 split reverted sopra. |
| `20261012100300` | `alert_prese_visione` e `get_alert_scadenze`, già in prod come `20261012170455`. |

## 9 file pending

Non marcare `applied`: o lo schema non risulta dai file già in storia, o un push cieco è pericoloso. Le query dicono se vanno spostati in `APPLY_LOCAL`.

| File | Perché pending | Se la query dice il contrario |
|---|---|---|
| `20260608120000_match_key_series_part_suffix.sql` | Unica seconda definizione di `build_match_key_strict`, più un `UPDATE` sulle chiavi. Nessuna migration successiva in prod sostituisce quella funzione. Il matcher ha il suffisso inline, le colonne `match_key_*` no. | Se il corpo della funzione contiene già `LIMITED`, spostare in applied. |
| `20260623140000_campaign_jobs_owner_select_policy.sql` | `20260611131254` (in prod) lascia la policy `USING (true)`. Questo file la restringe a `created_by = auth.uid()` e aggiunge un indice. | Se `pg_get_expr` è già il predicato sul `created_by`, spostare in applied. |
| `20260623173000_programmazioni_health_date_index.sql` | Indice `CONCURRENTLY` citato solo qui. | Se l'indice c'è, spostare in applied. |
| `20260623180500_optimize_individuazione_matching_indexes.sql` | Stesso caso, quattro indici. | Se ci sono tutti e quattro, spostare in applied. |
| `20260623220000_dashboard_metrics_rpc.sql` | Prima definizione locale di `get_dashboard_metrics`. In prod a luglio ci sono due versioni dal nome diverso, senza corpo nel repo. | Se il corpo ha già join `cp.stato` e `codice_isan`, marcare applied anche i due file sotto. |
| `20260811183000_dashboard_metrics_active_campagne_join.sql` | Sostituito in repo dal file di settembre, che non è in storia. Un push dei tre, in ordine di timestamp, è un deploy del dashboard, non un repair. | Come sopra. |
| `20260911160000_dashboard_metrics_opera_matching_fields.sql` | È il corpo che un push lascerebbe in funzione. Non assumere che i no-op di luglio siano questo SQL. | Come sopra. |
| `20260626170400_individuazione_detail_stats.sql` | `get_individuazione_detail_stats` compare solo qui. | Se la funzione c'è, spostare in applied. |
| `20260630125200_block_film_matches_for_episode_programmazioni.sql` | Patch testuale sul matcher. `20260803121140` (in prod, successivo) non contiene `has_episode_columns`. `AGENTS.md` registra che il patch fallisce se il corpo non ha l'ancora. Non pushare questo file così com'è. | Se `has_episode_columns` è nel corpo attuale, l'effetto c'è già: spostare in applied e non pushare. |

## Query di pre-check

Sola lettura. Un gate falso blocca il repair delle righe che quel gate copre, non l'intero elenco baseline.

```sql
-- Gate applied: upload, tabella dei run, ambito, email, enum, alert, audit, documento, cast.
SELECT
  to_regclass('public.upload_jobs') IS NOT NULL AS upload_jobs,
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'programmazioni' AND column_name = 'import_row_uid'
  ) AS import_row_uid,
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'upload_jobs' AND column_name = 'quality_report'
  ) AS quality_report,
  to_regclass('public.campagne_individuazione_processed_programmazioni') IS NOT NULL AS processed_programmazioni,
  EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ambito_artista') AS ambito_tipo,
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'artisti' AND column_name = 'ambito'
  ) AS ambito_colonna,
  EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'get_user_email_by_id'
  ) AS get_user_email_by_id,
  EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'stato_iscrizione' AND e.enumlabel = 'minorenne'
  ) AS enum_minorenne,
  EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'tipo_opera' AND e.enumlabel = 'musicale'
  ) AS enum_musicale,
  to_regclass('public.alert_prese_visione') IS NOT NULL AS alert_prese_visione,
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'artisti' AND column_name = 'documento_tipo'
  ) AS documento_tipo,
  to_regclass('public.artisti_note') IS NOT NULL AS artisti_note,
  to_regclass('public.artisti_referenti') IS NOT NULL AS artisti_referenti,
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'cast_esterno' AND column_name = 'episodio_id'
  ) AS cast_episodio_id,
  EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'nome_persona_key'
  ) AS nome_persona_key,
  to_regclass('public.audit_log') IS NOT NULL AS audit_log,
  EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'derive_programmazione_episode_signals'
  ) AS derive_episode_signals;

-- Gate applied della catena matcher/chunk: il suffisso serie deve essere nel matcher gia in prod.
-- Se la firma a 6 argomenti non esiste, elencare gli overload e non marcare applied 20260608120100-120600.
SELECT position(
  'SEASON|PARTE|PART' IN pg_get_functiondef(
    'public.match_programmazione_to_partecipazioni(uuid,numeric,uuid[],integer,integer,uuid[])'::regprocedure
  )
) > 0 AS series_suffix_nel_matcher;

-- Pending 20260608120000: true => lo step e' gia nel corpo, spostare in applied.
SELECT position(
  'LIMITED' IN pg_get_functiondef('public.build_match_key_strict(text,integer)'::regprocedure)
) > 0 AS series_suffix_nella_chiave;

-- Pending block_film: true => la guardia e' gia nel matcher attuale, spostare in applied e non pushare il patch.
SELECT position(
  'has_episode_columns' IN pg_get_functiondef(
    'public.match_programmazione_to_partecipazioni(uuid,numeric,uuid[],integer,integer,uuid[])'::regprocedure
  )
) > 0 AS guardia_film_episodio;

-- Pending policy campaign_jobs. using_expr = 'true' conferma che 20260623140000 e' ancora pending.
SELECT pg_get_expr(pol.polqual, pol.polrelid) AS using_expr
FROM pg_policy pol
JOIN pg_class c ON c.oid = pol.polrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname = 'campaign_jobs'
  AND pol.polname = 'campaign_jobs_select_authenticated';

-- Pending indici. Quelli assenti restano pending.
SELECT indexname
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname IN (
    'idx_programmazioni_campagna_data_trasmissione',
    'idx_opere_trgm_lower_titolo',
    'idx_opere_trgm_lower_titolo_originale',
    'idx_partecipazioni_opera',
    'idx_partecipazioni_opera_episodio',
    'idx_campaign_jobs_owner_campaign_state_updated'
  );

-- Pending dashboard e detail stats.
-- join_campagne_attive + isan veri => i tre file dashboard sono gia nel corpo, marcarli applied.
-- get_individuazione_detail_stats presente => marcare applied 20260626170400.
SELECT p.proname,
       position('cp.stato' IN p.prosrc) > 0 AS join_campagne_attive,
       position('codice_isan' IN p.prosrc) > 0 AS isan
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN ('get_dashboard_metrics', 'get_individuazione_detail_stats');

-- Gap del no-op episode_alert: ci si aspetta di leggere l'azione ON DELETE reale.
-- Il repo, da solo, ricostruirebbe SET NULL.
SELECT conname, pg_get_constraintdef(oid) AS def
FROM pg_constraint
WHERE conrelid = 'public.campagne_individuazione_episode_alerts'::regclass
  AND contype = 'f';

-- Il drop scratch dovrebbe aver tolto la relazione. true = il drop non risulta, non reverted a mano.
SELECT to_regclass('public.rasi_enc_chunks') IS NOT NULL AS scratch_ancora_presente;
```

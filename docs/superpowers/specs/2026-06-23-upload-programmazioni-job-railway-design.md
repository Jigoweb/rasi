# Design: Upload Programmazioni come Job Server-Side (Railway) — affidabile, idempotente, parallelo

**Data:** 2026-06-23
**Stato:** Proposto (da approvare)
**Scope:** Spostare il caricamento delle `programmazioni` da loop client-side a un job server-side resumable su Railway, con scrittura idempotente e caricamenti multipli simultanei.

---

## 1. Contesto e problema

Oggi l'upload è un loop client-side (`src/app/dashboard/programmazioni/page.tsx:429`): legge il file nel browser, lo spezza in chunk da 500 righe e chiama `uploadProgrammazioni` (`src/features/programmazioni/services/programmazioni.service.ts:283`), che fa un `.insert()` **puro**.

Due difetti strutturali:

1. **Scrittura non idempotente** — nessun vincolo di unicità su `programmazioni`; ri-eseguire/riprendere un upload re-inserisce le righe già presenti.
2. **Ripresa inaffidabile** — il progresso vive solo nello stato React; se la tab/funzione muore, una ripresa non sa quante righe sono *davvero* state committate.

Effetto misurato (campagna NETFLIX 2025, `5034d45e`): 75.266 righe di cui ~70.765 uniche → **4.501 duplicati esatti** inseriti in ondate sovrapposte (13:21, 13:23, 13:24, 13:25). I duplicati propagano alle `individuazioni` (1 individuazione per riga di programmazione), producendo artisti contati più volte sullo stesso ruolo/opera.

**Lezione dal pipeline individuazioni** (`process-chunk/route.ts`): ha retry x3 con backoff (righe 80-214) e ha richiesto i commit di dedup `dfd27b7`/`ba03f2b`. Cioè: **un'architettura a chunk/retry/worker aumenta le ri-esecuzioni dello stesso lavoro**; senza idempotenza, ogni ri-esecuzione duplica. Quindi:

> **Principio fondante:** l'idempotenza della scrittura è il prerequisito del job, non un'alternativa. Il job aggiunge affidabilità, osservabilità, indipendenza dal browser e parallelismo — ma solo sopra una scrittura idempotente.

### Obiettivi
- Upload che sopravvive a interruzioni e riprende **senza creare duplicati**.
- Indipendente dal browser; robusto su file grandi.
- Più campagne caricabili **in parallelo**.
- Osservabilità (stato, progresso, errori) su tabella di job.

### Non-obiettivi
- Cambiare l'algoritmo di matching/normalizzazione (resta quello esistente).
- Toccare il pipeline individuazioni (lo si riusa come modello).

---

## 2. Idempotenza: identità deterministica di riga (cuore del design)

Ogni riga importata riceve un identificatore stabile derivato dal file:

```
import_row_uid = md5( campagna_programmazione_id || ':' || row_index_in_file || ':' || raw_line_text )
```

- `row_index_in_file`: posizione della riga nel file sorgente (post-header).
- `raw_line_text`: contenuto grezzo della riga (pre-mapping).

**Vincolo DB:**
```sql
ALTER TABLE programmazioni ADD COLUMN import_row_uid text;
CREATE UNIQUE INDEX uq_programmazioni_import_row_uid
  ON programmazioni (import_row_uid)
  WHERE import_row_uid IS NOT NULL;  -- partial: non rompe i dati storici (uid NULL)
```

**Scrittura:** `INSERT ... ON CONFLICT (import_row_uid) DO NOTHING` (upsert con ignore).

Perché funziona e non perde dati:
- **Ripresa/retry**: stesso file → stessi `row_index` + `raw_line` → stesso `uid` → conflitto → no-op. Idempotente anche con chunk sovrapposti o checkpoint disallineato.
- **Righe legittime "identiche"** (caso streaming senza mapping, es. Amazon SVOD con tutti i campi distintivi nulli): hanno `row_index` diversi → `uid` diversi → **restano entrambe**. Niente fusione errata.
- **Determinismo garantito dallo Storage**: il file grezzo è salvato una volta; ogni ri-parse legge gli stessi byte → indici stabili.

Questo è ciò che rende sicura tutta l'architettura a job/retry/parallelo che segue.

---

## 3. Architettura target

```
Browser ──upload file──▶ Supabase Storage (bucket privato "programmazioni-uploads")
   │                          │
   └──POST /upload/init──▶ crea job (upload_jobs) + lock campagna ──┐
                                                                     │
Railway worker (long-running)                                        │
   ├─ claim job  (SELECT ... FOR UPDATE SKIP LOCKED)  ◀──────────────┘
   ├─ scarica file da Storage
   ├─ conta righe → set righe_totali
   ├─ loop chunk [offset, offset+N):
   │     parse+mapping (codice condiviso) → payload + import_row_uid
   │     upsert ON CONFLICT DO NOTHING (service role)
   │     aggiorna checkpoint (last_row_index, righe_processate, current_chunk)
   └─ finalize → stato campagna = in_review, rilascia lock, statistiche
```

Rispecchia il pipeline individuazioni (`init` → `process-chunk` → `finalize` + lock RPC `acquire/release_campagna_processing_lock` già esistenti).

---

## 4. Modello dati

### 4.1 Storage
Bucket privato `programmazioni-uploads`, path `{campagna_id}/{job_id}/{filename}`. È la fonte di verità per il re-parse deterministico.

### 4.2 Tabella job
Riusare il pattern di `campaign_jobs` ma con una tabella dedicata `upload_jobs` (campi più pertinenti dell'upload; evita di sovraccaricare la semantica individuazioni):

```sql
CREATE TABLE upload_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campagna_programmazione_id uuid NOT NULL REFERENCES campagne_programmazione(id),
  storage_path text NOT NULL,
  mapping_snapshot jsonb NOT NULL,        -- decisione mapping congelata all'avvio
  stato text NOT NULL DEFAULT 'queued',   -- queued|claimed|parsing|inserting|done|error
  righe_totali int DEFAULT 0,
  righe_processate int DEFAULT 0,
  righe_inserite int DEFAULT 0,           -- escluse quelle saltate per conflitto
  righe_duplicate_saltate int DEFAULT 0,
  last_row_index int DEFAULT 0,           -- checkpoint per resume
  chunk_size int DEFAULT 500,
  claimed_by text,                        -- id worker
  claimed_at timestamptz,
  heartbeat_at timestamptz,               -- per rilevare worker morti
  error text,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### 4.3 `programmazioni`
Aggiunta `import_row_uid text` + unique index parziale (§2). I dati storici restano con `uid NULL` (non vincolati); opzionale backfill (§8).

---

## 5. Flusso dettagliato

### 5.1 `POST /api/programmazioni/upload/init`
1. Valida campagna + UUID (come `init` individuazioni).
2. Acquisisce lock per-campagna: `acquire_campagna_processing_lock` (riuso). Se `LOCKED_BY_OTHER` → 409.
3. Il file è già stato caricato su Storage dal browser (upload diretto, signed URL); `init` riceve `storage_path` + `mapping_snapshot`.
4. Crea `upload_jobs` (stato `queued`). Ritorna `job_id`.

> Nota: l'upload del file su Storage avviene client→Storage (signed URL), non passa per la API → niente limiti di body serverless.

### 5.2 Worker Railway (loop)
1. **Claim atomico** (consente N worker paralleli):
   ```sql
   UPDATE upload_jobs SET stato='claimed', claimed_by=$worker, claimed_at=now(), heartbeat_at=now()
   WHERE id = (
     SELECT id FROM upload_jobs
     WHERE stato IN ('queued')
        OR (stato IN ('claimed','parsing','inserting') AND heartbeat_at < now() - interval '2 min') -- ripresa job orfani
     ORDER BY created_at
     FOR UPDATE SKIP LOCKED
     LIMIT 1
   ) RETURNING *;
   ```
2. Scarica il file da Storage; se `righe_totali=0`, conta le righe e salva.
3. Loop dei chunk a partire da `last_row_index`:
   - parse+mapping del chunk (codice condiviso, §6) → payload con `import_row_uid`.
   - `INSERT ... ON CONFLICT (import_row_uid) DO NOTHING` (client service-role).
   - aggiorna `last_row_index`, `righe_processate`, `righe_inserite`, `heartbeat_at`.
4. A fine file → chiama finalize.

### 5.3 `POST /api/programmazioni/upload/finalize`
- Stato campagna → `in_review`; rilascia lock (`release_campagna_processing_lock`); scrive statistiche (totali, inserite, duplicate saltate).

### 5.4 Semantica di ripresa
- Crash worker → `heartbeat_at` scade → un altro worker ri-claima e riparte da `last_row_index`.
- Anche se il checkpoint è leggermente indietro, l'overlap è **innocuo** grazie a `ON CONFLICT DO NOTHING`. Doppia sicurezza (checkpoint + idempotenza).

---

## 6. Parser/normalizzazione server-side (codice condiviso)

Oggi parsing+mapping vivono in TS lato client/shared:
`import-mapping.service.ts` (`applyMapping`), `programmazioni.service.ts` (`buildLegacyPayload`, `normalizzaProgrammazione`), `utils/transforms.ts`, `utils/parser-config.ts`, `utils/title-normalize.ts`.

Il worker Railway è un repo separato → due opzioni:

- **(A — scelta) Estrarre un modulo condiviso** `import-core` (pure TS, zero dipendenze React) con: parsing CSV/XLSX in streaming, `applyMapping`, transforms, normalizzazioni, calcolo `import_row_uid`. Consumato sia da Next sia dal worker. È la via pulita e testabile.
- (B) Il worker chiama un endpoint Next che fa parsing+mapping. Scartata: il parsing dell'intero file in serverless ha limiti di memoria/tempo; meglio streaming nel worker long-running.

Vincolo: il calcolo di `import_row_uid` e le normalizzazioni devono essere **identici** ovunque (stessa libreria) per garantire determinismo.

---

## 7. Caricamenti multipli simultanei

- Più righe in `upload_jobs`; worker con concorrenza `WORKER_CONCURRENCY=N`; claim con `FOR UPDATE SKIP LOCKED` → ogni job a un solo worker, più job in parallelo.
- Lock **per-campagna** (già esistente) impedisce due job sulla stessa campagna.
- **Backpressure**: `programmazioni` ha 13 indici (3 GIN, ~400MB). Insert paralleli pesanti possono saturare il DB. Mitigazioni: tenere `chunk_size=500`, limitare `N` (es. 2-3), monitorare `statement_timeout`. Parametri configurabili nel job.

---

## 8. Pulizia duplicati esistenti (NETFLIX 2025 e altri)

Step separato, **distruttivo → solo dopo anteprima e approvazione**:
1. Anteprima in sola lettura: gruppi riga-identica (chiave completa colonne business) con `count>1`, righe da rimuovere = tutte tranne `MIN(created_at)`/`MIN(id)`.
2. Cancellazione duplicati programmazioni + individuazioni collegate ai `programmazione_id` rimossi (attenzione FK `individuazioni_programmazione_id_fkey`).
3. (Opzionale) Backfill `import_row_uid` sui dati storici per portarli sotto il vincolo.

Priorità iniziale: NETFLIX 2025 (4.501) come caso pilota verificabile.

---

## 9. Sicurezza / RLS
- Worker usa **service role** (bypassa RLS) come gli endpoint individuazioni (`supabaseServer`).
- Bucket Storage **privato**; upload via signed URL; lettura solo dal worker.
- Validazione campagna/utente in `init`.

---

## 10. Gestione errori e osservabilità
- Stati job espliciti + `error` per diagnosi; `heartbeat_at` per worker morti.
- Retry a livello di chunk sicuri grazie all'idempotenza.
- UI: indicatore di progresso che legge `upload_jobs` (come `individuazione-progress-indicator.tsx`).

---

## 11. File/componenti impattati

| Area | Intervento |
|---|---|
| `programmazioni` (DB) | colonna `import_row_uid` + unique index parziale |
| nuova tabella `upload_jobs` (DB) | checkpoint/stato job |
| Supabase Storage | bucket `programmazioni-uploads` + signed upload |
| `import-core` (nuovo modulo condiviso) | parsing streaming + mapping + `import_row_uid`, estratto da `features/programmazioni/*` |
| `POST /api/programmazioni/upload/init` | crea job + lock + ref file |
| `POST /api/programmazioni/upload/finalize` | stato + lock release + stats |
| Worker Railway (repo separato) | claim SKIP LOCKED + parse + upsert idempotente + checkpoint |
| `programmazioni.service.ts` `uploadProgrammazioni` | aggiungere `import_row_uid` + upsert `onConflict ignore` (utile anche al flusso attuale finché coesiste) |
| `dashboard/programmazioni/page.tsx` | upload file→Storage + avvio job + UI progresso da `upload_jobs` (rimuove il loop client) |

---

## 12. Piano di rollout (fasi)

1. **Fondamenta idempotenza** (sblocca i duplicati subito): colonna+indice `import_row_uid`, calcolo uid nel parser, `uploadProgrammazioni` in upsert. Funziona già nel flusso client attuale.
2. **Estrazione `import-core`** condiviso + test di determinismo uid/normalizzazioni.
3. **Storage + `upload_jobs` + endpoint init/finalize.**
4. **Worker Railway** (claim/parse/upsert/checkpoint) + concorrenza.
5. **UI** progresso da `upload_jobs`; dismissione loop client.
6. **Pulizia duplicati storici** (pilota NETFLIX 2025) con anteprima.

---

## 13. Decisioni aperte (da confermare)
1. **Tabella job**: nuova `upload_jobs` (proposta) vs estendere `campaign_jobs` con `tipo='upload_programmazioni'`.
2. **Composizione `import_row_uid`**: includere `raw_line_text` (robusto a re-parse identico) oppure solo `(campagna, row_index)` (più semplice ma fragile se il file viene ricaricato modificato).
3. **Concorrenza worker** `N` e `chunk_size`: valori iniziali (proposta N=2, chunk=500).
4. **Backfill `import_row_uid`** sui ~4.17M storici: sì/no (serve per estendere il vincolo a tutto lo storico).
5. **Repo worker**: dove vive il worker Railway e come consuma `import-core` (submodule/package npm/copia).

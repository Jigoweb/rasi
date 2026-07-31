# Design: Import bulk programmazioni

**Data:** 2026-07-30  
**Stato:** approvato / implementato MVP (piano: `docs/superpowers/plans/2026-07-31-programmazioni-import-bulk.md`)  
**Contesto:** caricamento di centinaia di file (es. SKY 2015–2022, ~329 xlsx) senza ripetere il flusso 1:1 “crea campagna → upload file”.

## 1. Obiettivo

Permettere di selezionare **N file** Excel/CSV per **una emittente** e **un anno**, rivedere nome campagna (prefill da filename), gestire in blocco i warning di formato “safe”, poi creare **una campagna per file** e avviare gli upload job esistenti.

**Non in scope MVP:** zip, multi-emittente/multi-anno nello stesso batch, individuazione automatica, CLI.

## 2. Decisioni consolidate

| Scelta | Valore |
|---|---|
| Ingresso file | Multi-select / drag-drop di `.xlsx` / `.xls` / `.csv` (niente zip) |
| Scope batch | 1 emittente + 1 anno |
| Granularità | 1 file → 1 campagna programmazione |
| Mapping | Mapping già salvato sull’emittente (obbligatorio) |
| Warning colonne | Riepilogo + **una conferma** per tutti i file con sole differenze “safe” |
| Orchestrazione | Client-side sopra API esistenti (crea campagna + storage + upload job worker) |
| Concorrenza | Max 3 upload job avviati in parallelo |
| Limite soft UI | Consigliato ≤ ~150 file per sessione (poi altro batch) |

## 3. Approccio scelto

**Orchestrazione client (MVP)** riusando:

- `createCampagnaProgrammazione`
- `detectColumns` / `decideUploadPath` (preview)
- upload storage + `POST /api/upload-programmazioni/start`
- poll job esistente

**Perché:** mapping e worker upload sono già pronti; il costo è UI + coda + policy warning. Un batch job server dedicato si valuta solo se il client risulta fragile su sessioni lunghe.

## 4. UX

### Entry point

Pagina Programmazioni: azione secondaria **“Import bulk”** accanto a “+ Nuova Programmazione”.

### Step 1 — Setup

- Select **emittente** (solo quelle con mapping `configured`, altrimenti CTA verso wizard mapping).
- Input **anno** (obbligatorio, fisso per tutto il batch).
- Dropzone multi-file (stessi accept del dialog attuale).
- Validazione immediata: estensioni ammesse; rifiuto file non supportati con messaggio per riga.

### Step 2 — Review tabella

Colonne:

| Colonna | Contenuto |
|---|---|
| File | nome + size |
| Nome campagna | editabile; prefill da filename |
| Anno | read-only (= anno batch) |
| Colonne | badge: `ok` / `warning safe` / `errore` |
| Dettaglio | colonne mappate mancanti / errore parse |

**Prefill nome campagna** (euristica):

1. Rimuovi estensione.
2. Rimuovi suffissi comuni: `File grezzo`, `_AIE`, date `YYYYMMDD_YYYYMMDD`.
3. Rimuovi token anno batch e varianti (`2015`, `_2015`, ` 2015`).
4. Trim / collassa spazi.
5. Fallback: filename senza estensione.

Esempi:

- `Sky Uno 2015 File grezzo.xlsx` → `Sky Uno`
- `SKY CINEMA ACTION_2020.xlsx` → `SKY CINEMA ACTION`
- `PRIMAFILA_2022.xlsx` → `PRIMAFILA`

**Controlli batch:**

- Blocca “Avvia” se esiste almeno un `errore` (parse fallito, mapping assente, titolo obbligatorio non mappabile).
- Se esistono solo `ok` + `warning safe` → “Avvia” apre conferma unica (step 2b) oppure inline banner.

### Step 2b — Conferma warning safe (scelta B)

Banner/modale unica:

> N file hanno colonne mappate assenti ma classificate come opzionali note (es. `Numero Episodio`, `Numero/Anno Stagione`). Procedendo quei campi resteranno vuoti; il resto del mapping verrà applicato.

Azioni: **Annulla** | **Procedi su tutti i warning safe**.

Nessun click per-file.

### Step 3 — Esecuzione

Per ogni riga inclusa:

1. `queued` → crea campagna (`emittente_id`, `anno`, `nome`)
2. `uploading` → storage + start job
3. `completed` / `error`

UI: progress globale (`k/N`) + stato per riga.  
Su errore: messaggio + **Riprova** (solo quella riga; campagna già creata → riprende solo upload se campagna esiste, altrimenti ricrea).

Chiusura tab: i job worker già avviati continuano; al rientro si possono riconciliare via `getLatestUploadJobsForCampagne` sulle campagne create nella sessione (best-effort; MVP può mostrare “job avviati, controlla elenco campagne”).

### Step 4 — Done

Riepilogo: create / completate / fallite. Link “Vai alle programmazioni” con filtro emittente+anno se già esiste.

## 5. Classificazione colonne (warning safe)

Riuso di `decideUploadPath` / `diffColumns` / `mappedRemovedColumns`.

Un file è **warning safe** se e solo se:

1. Esiste mapping emittente con `titolo` configurato.
2. `decideUploadPath` restituisce `warn_format_changed`.
3. Ogni colonna in `mappedRemoved` ha target template **non obbligatorio** per l’import (`titolo` non deve essere tra i removed).
4. Opzionale MVP: allowlist esplicita di target “tollerati assenti”  
   `numero_episodio`, `numero_stagione`  
   (estensibile). Se `mappedRemoved` contiene altri target mappati (es. `data_trasmissione`, `regia`) → **errore** (richiede review / remap, fuori auto-bulk).

Un file è **ok** se `apply_existing` o `legacy_template`.  
Un file è **errore** se: parse fallisce, 0 righe, `need_wizard`, oppure warning non-safe.

> Nota: dopo il fix `defval` / union colonne, i falsi positivi su celle vuote non devono più far scattare warning su `Regista` / `Serie Programma Originale`.

## 6. API / componenti tecnici

### Nessun nuovo endpoint obbligatorio (MVP)

Flusso per file (client):

```
detectColumns(file)
→ decideUploadPath(emittenteId, columns)
→ classify(ok | warning_safe | error)
→ [dopo conferma] createCampagnaProgrammazione({ emittente_id, anno, nome })
→ uploadProgrammazioniFileToStorage(file, campagnaId)
→ startUploadProgrammazioniJob({ mapping snapshot via getUploadMappingSnapshot })
→ poll job
```

Per `warn_format_changed` confermato: usare già `getUploadMappingSnapshot` che applica il mapping esistente ignorando colonne assenti.

### Helper nuovi (client)

- `suggestCampagnaNomeFromFilename(filename, anno): string`
- `classifyBulkColumnDiff(decision, mapping): 'ok' | 'warning_safe' | 'error'`
- `runBulkImportQueue(items, { concurrency: 3 })`

### Opzionale post-MVP

- `POST /api/programmazioni/bulk/start` — body: emittente, anno, lista `{ storagePath, nome }`; worker crea campagne + job. Utile se sessioni lunghe falliscono in browser.

## 7. Dati e vincoli

- Campagna: stessi campi di oggi (`emittente_id`, `anno`, `nome`, …).
- Unicità nome: se il DB non impone unique, accettare omonimi; in review UI evidenziare duplicati nello stesso batch.
- Mapping: se emittente senza mapping → non entrare in bulk.
- Storage path: invariato (`userId/campagnaId/filename`).
- Auth: utente loggato; stesse ACL delle campagne.

## 8. Errori e retry

| Fase | Comportamento |
|---|---|
| Preview colonne | Riga `error`; esclusa dall’avvio |
| Create campagna fail | Riga `error`; retry ricrea |
| Storage/start job fail | Campagna esiste; retry solo upload |
| Job `error` | Mostra `job.error`; retry start (idempotenza upload da verificare sul worker esistente) |

Partial success è OK: non fare rollback delle campagne già create.

## 9. Testing

- Unit: prefill nome; classificazione safe vs unsafe warning.
- Component: drop multi-file; conferma unica warning; disable Avvia con errori.
- Integration (se fattibile): coda concurrency 3 non supera il limite; mapping snapshot su warning_safe.

## 10. Rollout

1. Feature dietro flag o entry point secondario.
2. Provare su sottoinsieme SKY (es. 2015, ~20 file).
3. Poi batch per anno.

## 11. Fuori scope esplicito

- Import zip / cartelle remote
- Bulk individuazioni
- Creazione mapping inline nel bulk
- Merge multi-file in una sola campagna
- Cambio anno per-file (anno è del batch)

## 12. Aperti (post-MVP)

- Alzare soft-limit oltre 150 file
- Batch job server-side
- Allowlist warning safe configurabile per emittente
- Dedup campagne per `(emittente, anno, nome)`

# Episodi template tconst + alias + round-trip — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allineare template/import episodi ai film con `IMDb tconst` e `alias_titoli[]`, e abilitare update parziale (celle vuote = non toccare) degli episodi già presenti.

**Architecture:** Estendere il dominio puro in `src/features/opere/lib/episodi-import.ts` (header, classify con `action: insert|update`, patch parziale, summary `imported`/`updated`), poi lo store API e la UI preview/form. Matching invariato.

**Tech Stack:** TypeScript, Next.js App Router, Supabase (`episodi`), Jest, XLSX/Papa.

**Spec:** `docs/superpowers/specs/2026-11-03-episodi-template-tconst-alias-roundtrip-design.md`

## Global Constraints

- Celle vuote in update → non scrivere quel campo sul DB.
- Alias: cella valorizzata sostituisce l’intero array; cella vuota non tocca gli alias.
- Patch update vuota → nessun `UPDATE`, non incrementa `updated`.
- Retrocompatibilità: file senza `Titoli alternativi` / `IMDb tconst` restano validi; legacy `Titolo` ok.
- Nessuna modifica al matcher SQL.
- Header template (ordine fisso): `Stagione | Episodio | Titolo italiano | Titolo originale | Titoli alternativi | IMDb tconst | Durata (minuti) | Data prima messa in onda`.

## File map

| File | Ruolo |
|------|--------|
| `supabase/migrations/20261103190000_episodi_alias_titoli.sql` | Colonna `alias_titoli text[]` |
| `src/shared/lib/supabase.ts` | Tipi `episodi` Row/Insert/Update |
| `src/features/opere/lib/episodi-import.ts` | Header, template, classify, persist, tipi |
| `src/features/opere/lib/episodi-import.test.ts` | Test dominio |
| `src/app/api/opere/[id]/episodi/import/route.ts` | `insertEpisode` + `updateEpisode` |
| `src/app/dashboard/opere/[id]/components/episodi-import-actions.tsx` (+ test) | Preview colonne/copy/summary |
| `src/features/opere/services/opere.service.ts` | Select/create episodi con `alias_titoli` |
| `src/app/dashboard/opere/[id]/page.tsx` | Form add/edit + lista |

---

### Task 1: Migrazione `alias_titoli` + tipi Supabase

**Files:**
- Create: `supabase/migrations/20261103190000_episodi_alias_titoli.sql`
- Modify: `src/shared/lib/supabase.ts` (blocco `episodi` Row/Insert/Update ~L685–730; non serve toccare le view generate se non espongono la colonna)

**Interfaces:**
- Produces: `episodi.alias_titoli: string[] | null` in tipi DB client

- [ ] **Step 1: Scrivere la migrazione**

```sql
-- Alias / titoli alternativi episodio, analoghi a opere.alias_titoli.
-- Non usati dal matcher in questo intervento.
ALTER TABLE public.episodi
  ADD COLUMN IF NOT EXISTS alias_titoli text[];

COMMENT ON COLUMN public.episodi.alias_titoli IS
  'Titoli alternativi / alias dell''episodio, analoghi a opere.alias_titoli. Non usati dal matcher in questo intervento.';
```

- [ ] **Step 2: Aggiornare i tipi tabella `episodi`**

In `src/shared/lib/supabase.ts`, nel blocco `episodi` (non le view), aggiungere:

```ts
alias_titoli: string[] | null          // Row
alias_titoli?: string[] | null         // Insert
alias_titoli?: string[] | null         // Update
```

accanto a `titolo_episodio_originale`.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20261103190000_episodi_alias_titoli.sql src/shared/lib/supabase.ts
git commit -m "$(cat <<'EOF'
feat(episodi): add alias_titoli column for alternative titles

EOF
)"
```

---

### Task 2: Header template + export con tconst e alias

**Files:**
- Modify: `src/features/opere/lib/episodi-import.ts`
- Test: `src/features/opere/lib/episodi-import.test.ts`

**Interfaces:**
- Produces:
  - `EPISODI_IMPORT_HEADERS` con le 8 colonne nello ordine dello spec
  - `EpisodioTemplateSource` con `imdb_tconst?: string | null` e `alias_titoli?: string[] | null`
  - `buildEpisodiTemplateXlsx` / `Csv` che le esportano

- [ ] **Step 1: Scrivere/aggiornare i test template che falliscono**

Aggiornare `HEADER`/`matrix` helper: le righe corte nei test vanno allineate al nuovo header (8 colonne). Sostituire il test «precompila l’xlsx… e il reimport li salta» con uno che verifica header + valori export (l’azione update arriva al Task 3).

```ts
it('esporta Titoli alternativi e IMDb tconst nel template xlsx/csv', () => {
  const existing = [
    {
      numero_stagione: 1,
      numero_episodio: 1,
      titolo_episodio: 'Pilota',
      titolo_episodio_originale: 'Pilot',
      alias_titoli: ['Alias A', 'Alias B'],
      imdb_tconst: 'tt100',
      durata_minuti: 40,
      data_prima_messa_in_onda: '2020-01-01',
    },
  ]
  expect([...EPISODI_IMPORT_HEADERS]).toEqual([
    'Stagione',
    'Episodio',
    'Titolo italiano',
    'Titolo originale',
    'Titoli alternativi',
    'IMDb tconst',
    'Durata (minuti)',
    'Data prima messa in onda',
  ])
  const csv = buildEpisodiTemplateCsv(existing)
  expect(csv).toContain('Titoli alternativi')
  expect(csv).toContain('IMDb tconst')
  expect(csv).toContain('Alias A, Alias B')
  expect(csv).toContain('tt100')
  const bytes = buildEpisodiTemplateXlsx(existing)
  const parsed = parseEpisodiFile('episodi.xlsx', bytes)
  expect(parsed.ok).toBe(true)
  if (!parsed.ok) return
  expect(parsed.matrix[0]).toEqual([...EPISODI_IMPORT_HEADERS])
  expect(parsed.matrix[1]?.[4]).toBe('Alias A, Alias B')
  expect(parsed.matrix[1]?.[5]).toBe('tt100')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/features/opere/lib/episodi-import.test.ts -t "esporta Titoli alternativi"`
Expected: FAIL (header senza le nuove colonne / valori assenti).

- [ ] **Step 3: Implementazione minima header + export**

```ts
export const EPISODI_IMPORT_HEADERS = [
  'Stagione',
  'Episodio',
  'Titolo italiano',
  'Titolo originale',
  'Titoli alternativi',
  'IMDb tconst',
  'Durata (minuti)',
  'Data prima messa in onda',
] as const

const OPTIONAL_HEADERS = ['Titoli alternativi', 'IMDb tconst'] as const
const BASE_HEADERS = ['Stagione', 'Episodio', 'Durata (minuti)', 'Data prima messa in onda'] as const

export type EpisodioTemplateSource = {
  numero_stagione: number
  numero_episodio: number
  titolo_episodio: string | null
  titolo_episodio_originale?: string | null
  alias_titoli?: string[] | null
  imdb_tconst?: string | null
  durata_minuti: number | null
  data_prima_messa_in_onda: string | null
}

function formatAliasTitoli(aliases: string[] | null | undefined): string {
  if (!Array.isArray(aliases) || aliases.length === 0) return ''
  return aliases.map((a) => a.trim()).filter(Boolean).join(', ')
}
```

In `buildEpisodiTemplateXlsx` / `Csv`, dopo titolo originale inserire `formatAliasTitoli(episode.alias_titoli)` e `episode.imdb_tconst ?? ''`. Aggiornare `sheet['!cols']` a 8 larghezze. In `validateHeaders` / `headerError` / `allowed`, trattare `OPTIONAL_HEADERS` come ammessi ma non obbligatori (come già per `Titolo originale` nei legacy).

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/features/opere/lib/episodi-import.test.ts -t "esporta Titoli alternativi"`
Expected: PASS. Aggiornare eventuali assert su `EPISODI_IMPORT_HEADERS.join` / header error se falliscono.

- [ ] **Step 5: Commit**

```bash
git add src/features/opere/lib/episodi-import.ts src/features/opere/lib/episodi-import.test.ts
git commit -m "$(cat <<'EOF'
feat(episodi): export tconst and alternative titles in episode template

EOF
)"
```

---

### Task 3: Classify — parse alias/tconst e azione insert|update

**Files:**
- Modify: `src/features/opere/lib/episodi-import.ts`
- Test: `src/features/opere/lib/episodi-import.test.ts`

**Interfaces:**
- Consumes: header Task 2
- Produces:
  - `EpisodeDraft` con `titoliAlternativi: string`, `imdbTconst: string`
  - `ClassifiedEpisodeRow` con `action: 'insert' | 'update' | null`, `aliasTitoli: string[] | null`, `imdbTconst: string | null`
  - Existing keys → `status: 'valid'`, `action: 'update'` (non più skipped «nessun aggiornamento»)
  - `buildEpisodePatch(row)` (usata al Task 4; può vivere già qui se i test la esercitano)

- [ ] **Step 1: Scrivere i test che falliscono**

```ts
it('segna gli episodi già presenti come update validi, non come skipped', () => {
  const result = classifyEpisodiMatrix(
    [
      [...EPISODI_IMPORT_HEADERS],
      [1, 1, 'Nuovo titolo', '', 'Alias 1, Alias 2', 'tt999', '', ''],
    ],
    [{ numero_stagione: 1, numero_episodio: 1 }],
  )
  expect(row(result)).toMatchObject({
    status: 'valid',
    action: 'update',
    titolo: 'Nuovo titolo',
    aliasTitoli: ['Alias 1', 'Alias 2'],
    imdbTconst: 'tt999',
    draft: {
      titoliAlternativi: 'Alias 1, Alias 2',
      imdbTconst: 'tt999',
    },
  })
})

it('accetta file legacy senza Titoli alternativi e IMDb tconst', () => {
  const result = classifyEpisodiMatrix(
    [
      ['Stagione', 'Episodio', 'Titolo italiano', 'Titolo originale', 'Durata (minuti)', 'Data prima messa in onda'],
      [1, 2, 'IT', 'OR', 30, null],
    ],
    [],
  )
  expect(row(result)).toMatchObject({
    status: 'valid',
    action: 'insert',
    aliasTitoli: null,
    imdbTconst: null,
  })
})
```

Aggiornare i test esistenti che aspettano `skipped` + «nessun aggiornamento» per episodi presenti: devono aspettare `valid` + `action: 'update'`. Aggiornare summary preview (Task 4) in un secondo momento se falliscono qui solo per `action`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/features/opere/lib/episodi-import.test.ts -t "segna gli episodi già presenti"`
Expected: FAIL (`action` assente / status skipped).

- [ ] **Step 3: Implementazione classify**

Estendere tipi:

```ts
export type EpisodeDraft = {
  stagione: string
  episodio: string
  titolo: string
  titoloOriginale: string
  titoliAlternativi: string
  imdbTconst: string
  durataMinuti: string
  dataPrimaMessaInOnda: string
}

export type ClassifiedEpisodeRow = {
  rowNumber: number
  status: 'valid' | 'skipped'
  action: 'insert' | 'update' | null
  message: string | null
  stagione: number | null
  episodio: number | null
  titolo: string | null
  titoloOriginale: string | null
  aliasTitoli: string[] | null
  imdbTconst: string | null
  durataMinuti: number | null
  dataPrimaMessaInOnda: string | null
  draft: EpisodeDraft
}

const DRAFT_FIELDS = [
  'stagione', 'episodio', 'titolo', 'titoloOriginale',
  'titoliAlternativi', 'imdbTconst', 'durataMinuti', 'dataPrimaMessaInOnda',
] as const

function parseAliasTitoli(value: unknown): string[] | null {
  if (cellIsEmpty(value)) return null
  const parts = String(value).split(',').map((p) => p.trim()).filter(Boolean)
  return parts.length > 0 ? parts : null
}

function readTconst(value: unknown): string | null {
  if (cellIsEmpty(value)) return null
  const text = String(value).trim()
  return text || null
}
```

In `classifyEpisodeCells`, se `key && existingKeys.has(key)` → `status = 'valid'`, `action = 'update'` (togliere il ramo skipped «Episodio già presente…»). Se nuovo → `action = 'insert'`. Se skipped → `action = null`.

In `classifyEpisodiMatrix` / `revalidateEpisodeDrafts`, leggere colonne opzionali se presenti nell’header (`column.get('Titoli alternativi')`, `column.get('IMDb tconst')`).

- [ ] **Step 4: Run tests**

Run: `npx jest src/features/opere/lib/episodi-import.test.ts`
Expected: i nuovi test PASS; sistemare fallimenti collaterali su draft/HEADER/matrix helper (es. pad righe a 8 colonne).

- [ ] **Step 5: Commit**

```bash
git add src/features/opere/lib/episodi-import.ts src/features/opere/lib/episodi-import.test.ts
git commit -m "$(cat <<'EOF'
feat(episodi): classify existing rows as updatable with tconst and aliases

EOF
)"
```

---

### Task 4: Persistenza insert/update + summary

**Files:**
- Modify: `src/features/opere/lib/episodi-import.ts`
- Test: `src/features/opere/lib/episodi-import.test.ts`

**Interfaces:**
- Consumes: `ClassifiedEpisodeRow.action`, campi Task 3
- Produces:
  - `EpisodeInsert` con `imdb_tconst`, `alias_titoli`
  - `EpisodeUpdatePatch` (solo campi opzionali settabili)
  - `buildEpisodePatch(row: ClassifiedEpisodeRow): EpisodeUpdatePatch | null`
  - `EpisodiImportStore.updateEpisode(...)`
  - `EpisodiImportSummary.updated: number`

```ts
export type EpisodeInsert = {
  opera_id: string
  numero_stagione: number
  numero_episodio: number
  titolo_episodio: string | null
  titolo_episodio_originale: string | null
  alias_titoli: string[] | null
  imdb_tconst: string | null
  durata_minuti: number | null
  data_prima_messa_in_onda: string | null
}

export type EpisodeUpdatePatch = {
  titolo_episodio?: string | null
  titolo_episodio_originale?: string | null
  alias_titoli?: string[] | null
  imdb_tconst?: string | null
  durata_minuti?: number | null
  data_prima_messa_in_onda?: string | null
}

export type EpisodiImportStore = {
  getOpera(operaId: string): Promise<{ id: string; tipo?: string | null; has_episodes?: boolean | null } | null>
  listEpisodeKeys(operaId: string): Promise<Array<{ numero_stagione: number; numero_episodio: number }>>
  insertEpisode(row: EpisodeInsert): Promise<{ ok: true } | { ok: false; code?: string; message: string }>
  updateEpisode(input: {
    opera_id: string
    numero_stagione: number
    numero_episodio: number
    patch: EpisodeUpdatePatch
  }): Promise<{ ok: true } | { ok: false; code?: string; message: string }>
}

export type EpisodiImportSummary = {
  total: number
  valid: number
  skipped: number
  excluded: number
  imported: number
  updated: number
}
```

- [ ] **Step 1: Test patch + confirm update**

```ts
it('buildEpisodePatch omette i campi vuoti e restituisce null se patch vuota', () => {
  const base = row(classifyEpisodiMatrix(
    [[...EPISODI_IMPORT_HEADERS], [1, 1, '', '', '', '', '', '']],
    [{ numero_stagione: 1, numero_episodio: 1 }],
  ))
  expect(buildEpisodePatch(base)).toBeNull()

  const withTconst = row(classifyEpisodiMatrix(
    [[...EPISODI_IMPORT_HEADERS], [1, 1, 'Solo titolo', '', '', 'tt1', '', '']],
    [{ numero_stagione: 1, numero_episodio: 1 }],
  ))
  expect(buildEpisodePatch(withTconst)).toEqual({
    titolo_episodio: 'Solo titolo',
    imdb_tconst: 'tt1',
  })
})

it('in conferma aggiorna gli esistenti e inserisce i nuovi', async () => {
  const updated: Array<{ stagione: number; episodio: number; patch: EpisodeUpdatePatch }> = []
  const inserted: EpisodeInsert[] = []
  const store: EpisodiImportStore = {
    async getOpera() { return { id: operaId, tipo: 'serie_tv', has_episodes: true } },
    async listEpisodeKeys() { return [{ numero_stagione: 1, numero_episodio: 1 }] },
    async insertEpisode(row) { inserted.push(row); return { ok: true } },
    async updateEpisode(input) {
      updated.push({ stagione: input.numero_stagione, episodio: input.numero_episodio, patch: input.patch })
      return { ok: true }
    },
  }
  const bytes = new TextEncoder().encode(
    `${EPISODI_IMPORT_HEADERS.join(',')}\n` +
    `1,1,Aggiornato,,Alias X,tt111,45,\n` +
    `1,2,Nuovo,,,,,\n`,
  )
  const result = await runEpisodiImport({ store, operaId, filename: 'e.csv', bytes, mode: 'confirm' })
  expect(result.ok).toBe(true)
  if (!result.ok) return
  expect(result.summary).toMatchObject({ imported: 1, updated: 1 })
  expect(updated).toEqual([{
    stagione: 1,
    episodio: 1,
    patch: {
      titolo_episodio: 'Aggiornato',
      alias_titoli: ['Alias X'],
      imdb_tconst: 'tt111',
      durata_minuti: 45,
    },
  }])
  expect(inserted[0]).toMatchObject({
    numero_stagione: 1,
    numero_episodio: 2,
    titolo_episodio: 'Nuovo',
    alias_titoli: null,
    imdb_tconst: null,
  })
})
```

Esportare `buildEpisodePatch` dal modulo.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/features/opere/lib/episodi-import.test.ts -t "in conferma aggiorna"`
Expected: FAIL (store senza update / summary senza `updated`).

- [ ] **Step 3: Implementazione persist**

```ts
export function buildEpisodePatch(row: ClassifiedEpisodeRow): EpisodeUpdatePatch | null {
  const patch: EpisodeUpdatePatch = {}
  if (row.draft.titolo.trim()) patch.titolo_episodio = row.titolo
  if (row.draft.titoloOriginale.trim()) patch.titolo_episodio_originale = row.titoloOriginale
  if (row.draft.titoliAlternativi.trim()) patch.alias_titoli = row.aliasTitoli
  if (row.draft.imdbTconst.trim()) patch.imdb_tconst = row.imdbTconst
  if (row.draft.durataMinuti.trim()) patch.durata_minuti = row.durataMinuti
  if (row.draft.dataPrimaMessaInOnda.trim()) patch.data_prima_messa_in_onda = row.dataPrimaMessaInOnda
  return Object.keys(patch).length > 0 ? patch : null
}
```

Sostituire `insertReviewedRows` con `applyReviewedRows` che:
- `action === 'insert'` → `insertEpisode` (con i nuovi campi) → `imported++`
- `action === 'update'` → `patch = buildEpisodePatch(row)`; se `patch` null skip scrittura; altrimenti `updateEpisode` → `updated++`
- errori riga: stesso pattern attuale (`skipped` + messaggio; 403 interrompe)

`successResponse` include `updated`. Aggiornare tutti i mock `storeFor` nei test con `updateEpisode` no-op e `summary.updated: 0` dove serve.

- [ ] **Step 4: Run full domain tests**

Run: `npx jest src/features/opere/lib/episodi-import.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/opere/lib/episodi-import.ts src/features/opere/lib/episodi-import.test.ts
git commit -m "$(cat <<'EOF'
feat(episodi): apply partial updates on episode import confirm

EOF
)"
```

---

### Task 5: API route — `updateEpisode` nello store

**Files:**
- Modify: `src/app/api/opere/[id]/episodi/import/route.ts`

**Interfaces:**
- Consumes: `EpisodeInsert`, `EpisodeUpdatePatch`, `EpisodiImportStore` da Task 4
- Produces: store reale con insert (campi nuovi) + update by `(opera_id, stagione, episodio)`

- [ ] **Step 1: Estendere `insertEpisode` e aggiungere `updateEpisode`**

```ts
async insertEpisode(row: EpisodeInsert) {
  const { error } = await client.from('episodi').insert({
    opera_id: row.opera_id,
    numero_stagione: row.numero_stagione,
    numero_episodio: row.numero_episodio,
    titolo_episodio: row.titolo_episodio,
    titolo_episodio_originale: row.titolo_episodio_originale,
    alias_titoli: row.alias_titoli,
    imdb_tconst: row.imdb_tconst,
    durata_minuti: row.durata_minuti,
    data_prima_messa_in_onda: row.data_prima_messa_in_onda,
  })
  if (!error) return { ok: true as const }
  return { ok: false as const, code: error.code, message: error.message }
},
async updateEpisode(input) {
  const { error } = await client
    .from('episodi')
    .update(input.patch)
    .eq('opera_id', input.opera_id)
    .eq('numero_stagione', input.numero_stagione)
    .eq('numero_episodio', input.numero_episodio)
  if (!error) return { ok: true as const }
  return { ok: false as const, code: error.code, message: error.message }
},
```

Importare i tipi aggiornati. Verificare typecheck sul file.

- [ ] **Step 2: Typecheck mirato**

Run: `npx tsc --noEmit -p tsconfig.json 2>&1 | rg "episodi/import|episodi-import" || true`
Expected: nessun errore su questi path (baseline repo può avere altri errori).

- [ ] **Step 3: Commit**

```bash
git add src/app/api/opere/[id]/episodi/import/route.ts
git commit -m "$(cat <<'EOF'
feat(api): persist episode tconst, aliases, and import updates

EOF
)"
```

---

### Task 6: UI import actions — colonne, copy, summary

**Files:**
- Modify: `src/app/dashboard/opere/[id]/components/episodi-import-actions.tsx`
- Test: `src/app/dashboard/opere/[id]/components/episodi-import-actions.test.tsx`

**Interfaces:**
- Consumes: `EpisodeDraft` nuovi campi, `EpisodiImportSummary.updated`, `ReviewedEpisodeRow.action`

- [ ] **Step 1: Aggiornare `EPISODE_FIELDS` e copy**

```ts
const EPISODE_FIELDS = [
  { key: 'stagione', label: 'Stagione' },
  { key: 'episodio', label: 'Episodio' },
  { key: 'titolo', label: 'Titolo italiano' },
  { key: 'titoloOriginale', label: 'Titolo originale' },
  { key: 'titoliAlternativi', label: 'Titoli alternativi' },
  { key: 'imdbTconst', label: 'IMDb tconst' },
  { key: 'durataMinuti', label: 'Durata (minuti)' },
  { key: 'dataPrimaMessaInOnda', label: 'Data prima messa in onda' },
] as const
```

DialogDescription preview: menzionare tconst, titoli alternativi, e che le celle vuote non cancellano i valori esistenti; gli episodi già presenti possono essere aggiornati.

Summary: usare `summary.imported` e `summary.updated` (es. «1 episodio importato, 2 aggiornati, …»).

`reviewedFromPayload`: popolare `titoliAlternativi` / `imdbTconst` dal draft o dai campi riga.

- [ ] **Step 2: Test UI minimo**

Aggiungere assert che, con un payload preview mock che include le nuove label, il dialog (se già montato nei test) o almeno che il modulo esporti/compili senza regressione sul bottone «Scarica template episodi». Se i test attuali mockano fetch, aggiornare `summary` mock con `updated: 0`.

- [ ] **Step 3: Run**

Run: `npx jest src/app/dashboard/opere/[id]/components/episodi-import-actions.test.tsx src/features/opere/lib/episodi-import.test.ts`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/app/dashboard/opere/[id]/components/episodi-import-actions.tsx src/app/dashboard/opere/[id]/components/episodi-import-actions.test.tsx
git commit -m "$(cat <<'EOF'
feat(ui): show tconst and aliases in episode import preview

EOF
)"
```

---

### Task 7: Scheda opera — form, lista, select service

**Files:**
- Modify: `src/features/opere/services/opere.service.ts` (`getEpisodiByOperaId` select ~L593; insert/update se tipizzati)
- Modify: `src/app/dashboard/opere/[id]/page.tsx` (form state, save/add, lista)
- Passare `alias_titoli` / `imdb_tconst` a `EpisodiImportActions` tramite `episodi` già caricati (`EpisodioTemplateSource`)

**Interfaces:**
- Consumes: colonna DB Task 1
- Produces: CRUD UI allineato ai film per titoli alternativi

- [ ] **Step 1: Select + form state**

In `getEpisodiByOperaId` aggiungere `alias_titoli` al `.select(...)`.

In `page.tsx`:
- `addEpisodioForm` / `editEpisodioForm`: campo `alias_titoli: ''` (stringa comma-separated).
- `openEdit` / `openAdd` / `handleSave` / `handleAdd`: split/join come `opera.alias_titoli`.
- Dialog: input **Titoli alternativi** sotto titolo originale, hint «Separa con virgola».
- Lista desktop: sotto il titolo italiano (o colonna dedicata stretta) mostrare alias join `, ` se presenti; stessa info in card mobile se esiste blocco titoli.

Assicurarsi che l’array passato a `<EpisodiImportActions episodi={...} />` includa `alias_titoli` e `imdb_tconst` (già su riga episodio dopo select).

- [ ] **Step 2: Smoke test / typecheck path**

Run: `npx jest src/app/dashboard/opere/[id]/page-cast-import.test.tsx src/app/dashboard/opere/[id]/page.test.tsx` (se presenti mock episodi, aggiungere `alias_titoli: null` dove serve).
Expected: PASS o fix mock minimi.

- [ ] **Step 3: Commit**

```bash
git add src/features/opere/services/opere.service.ts src/app/dashboard/opere/[id]/page.tsx src/app/dashboard/opere/[id]/page.test.tsx src/app/dashboard/opere/[id]/page-cast-import.test.tsx
git commit -m "$(cat <<'EOF'
feat(ui): edit episode alternative titles like film aliases

EOF
)"
```

---

### Task 8: Verifica finale

- [ ] **Step 1: Suite mirata**

```bash
npx jest \
  src/features/opere/lib/episodi-import.test.ts \
  src/app/dashboard/opere/[id]/components/episodi-import-actions.test.tsx \
  src/app/dashboard/opere/[id]/page.test.tsx \
  src/app/dashboard/opere/[id]/page-cast-import.test.tsx
```

Expected: PASS.

- [ ] **Step 2: Checklist manuale vs spec**

- [ ] Template ha tconst + titoli alternativi
- [ ] Reimport aggiorna esistenti; celle vuote non cancellano
- [ ] Insert nuovi con tconst/alias
- [ ] Form add/edit con titoli alternativi
- [ ] Matcher non toccato

- [ ] **Step 3: Commit eventuale fix di coda** (solo se servono)

---

## Self-review (piano vs spec)

| Spec | Task |
|------|------|
| `alias_titoli text[]` + commento | Task 1 |
| Header 8 colonne + export | Task 2 |
| Retrocompat / legacy Titolo | Task 2–3 |
| Classify update vs insert | Task 3 |
| Patch parziale / patch vuota no UPDATE | Task 4 |
| Summary imported+updated | Task 4–6 |
| API store update | Task 5 |
| Preview UI + copy | Task 6 |
| Form/lista opera | Task 7 |
| Matching fuori scope | Nessun task matcher |
| ISAN fuori template | Non aggiunto agli header |

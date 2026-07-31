# Programmazioni Import Bulk Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Consentire l’import multi-file di programmazioni (1 emittente + 1 anno → N campagne) con review, conferma unica dei warning “safe” e coda upload concurrency 3 sopra le API esistenti.

**Architecture:** Orchestrazione client-side. Helper puri per nome campagna e classificazione colonne; hook di coda che per ogni file crea campagna, carica su storage e avvia `upload-programmazioni` job; dialog multi-step montato dalla pagina Programmazioni.

**Tech Stack:** Next.js App Router, React client components, Jest, servizi esistenti in `src/features/programmazioni`, worker Railway già usato per upload single-file.

**Spec:** `docs/superpowers/specs/2026-07-30-programmazioni-import-bulk-design.md`

## Global Constraints

- Batch = **1 emittente + 1 anno**; **1 file → 1 campagna**.
- Ingresso: multi-select / drag-drop `.csv,.xlsx,.xls` — **niente zip**.
- Mapping emittente obbligatorio e `configured` (ha `titolo`).
- Warning safe: conferma **una volta** per tutti; allowlist target tollerati assenti = `numero_episodio`, `numero_stagione`.
- Concorrenza upload = **3**.
- Soft limit UI consigliato = **150** file (avviso, non hard-block obbligatorio oltre, ma mostra warning).
- Nessun nuovo endpoint worker obbligatorio in MVP.
- Riusare: `detectColumns`, `decideUploadPath`, `createCampagnaProgrammazione`, `uploadProgrammazioniFileToStorage`, `startUploadProgrammazioniJob`, `pollUploadProgrammazioniJob`, `getUploadMappingSnapshot`.

## File map

| File | Responsabilità |
|---|---|
| `src/features/programmazioni/utils/bulk-import-naming.ts` | Prefill nome campagna da filename |
| `src/features/programmazioni/utils/bulk-import-classify.ts` | Classifica `ok` / `warning_safe` / `error` |
| `src/features/programmazioni/utils/bulk-import-queue.ts` | Coda async con concurrency limit |
| `src/app/dashboard/programmazioni/hooks/useProgrammazioniBulkImport.ts` | Stato wizard + preview + esecuzione |
| `src/app/dashboard/programmazioni/components/BulkImportProgrammazioniDialog.tsx` | UI multi-step |
| `src/app/dashboard/programmazioni/page.tsx` | Entry point “Import bulk” |
| Test `*.test.ts(x)` accanto a ogni modulo | TDD |

---

### Task 1: Prefill nome campagna da filename

**Files:**
- Create: `src/features/programmazioni/utils/bulk-import-naming.ts`
- Test: `src/features/programmazioni/utils/bulk-import-naming.test.ts`

**Interfaces:**
- Produces: `suggestCampagnaNomeFromFilename(filename: string, anno: number): string`

- [ ] **Step 1: Write the failing test**

```ts
// src/features/programmazioni/utils/bulk-import-naming.test.ts
import { suggestCampagnaNomeFromFilename } from './bulk-import-naming'

describe('suggestCampagnaNomeFromFilename', () => {
  it('strips extension, year, and common suffixes', () => {
    expect(suggestCampagnaNomeFromFilename('Sky Uno 2015 File grezzo.xlsx', 2015)).toBe('Sky Uno')
    expect(suggestCampagnaNomeFromFilename('SKY CINEMA ACTION_2020.xlsx', 2020)).toBe('SKY CINEMA ACTION')
    expect(suggestCampagnaNomeFromFilename('PRIMAFILA_2022.xlsx', 2022)).toBe('PRIMAFILA')
    expect(suggestCampagnaNomeFromFilename('Sky Atlantic_20180101_20181231.xlsx', 2018)).toBe('Sky Atlantic')
  })

  it('falls back to basename without extension when nothing left', () => {
    expect(suggestCampagnaNomeFromFilename('2015.xlsx', 2015)).toBe('2015')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --testPathPatterns=bulk-import-naming.test`

Expected: FAIL (module not found)

- [ ] **Step 3: Implement**

```ts
// src/features/programmazioni/utils/bulk-import-naming.ts
export function suggestCampagnaNomeFromFilename(filename: string, anno: number): string {
  const base = filename.replace(/\.(xlsx|xls|csv)$/i, '')
  const year = String(anno)
  let name = base
    .replace(/\bFile\s+grezzo\b/gi, '')
    .replace(/_AIE\b/gi, '')
    .replace(/\b\d{8}_\d{8}\b/g, '')
    .replace(new RegExp(`(^|[\\s_\\-])${year}(?=$|[\\s_\\-])`, 'g'), ' ')
    .replace(/[_\-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return name || base.trim() || filename
}
```

- [ ] **Step 4: Run tests — expect PASS**

Run: `npm test -- --testPathPatterns=bulk-import-naming.test`

- [ ] **Step 5: Commit**

```bash
git add src/features/programmazioni/utils/bulk-import-naming.ts \
  src/features/programmazioni/utils/bulk-import-naming.test.ts
git commit -m "$(cat <<'EOF'
feat(programmazioni): prefill nome campagna da filename per import bulk

EOF
)"
```

---

### Task 2: Classificazione warning colonne bulk

**Files:**
- Create: `src/features/programmazioni/utils/bulk-import-classify.ts`
- Test: `src/features/programmazioni/utils/bulk-import-classify.test.ts`

**Interfaces:**
- Consumes: `UploadDecision`, `ImportMappingConfig` from `import-mapping.service`
- Produces:
  - `BULK_SAFE_ABSENT_TARGETS: ReadonlySet<string>`
  - `classifyBulkColumnDiff(decision: UploadDecision, mapping?: ImportMappingConfig | null): 'ok' | 'warning_safe' | 'error'`

- [ ] **Step 1: Write the failing test**

```ts
import { classifyBulkColumnDiff, BULK_SAFE_ABSENT_TARGETS } from './bulk-import-classify'
import type { ImportMappingConfig, UploadDecision } from '../services/import-mapping.service'

const mapping: ImportMappingConfig = {
  version: 1,
  colonne_rilevate: ['Serie Programma Sistema', 'Numero Episodio', 'Numero/Anno Stagione', 'Regista'],
  ultimo_upload: null,
  mapping: {
    'Serie Programma Sistema': 'titolo',
    'Numero Episodio': 'numero_episodio',
    'Numero/Anno Stagione': 'numero_stagione',
    Regista: 'regia',
  },
}

describe('classifyBulkColumnDiff', () => {
  it('returns ok for apply_existing and legacy_template', () => {
    expect(classifyBulkColumnDiff({ kind: 'apply_existing', mapping })).toBe('ok')
    expect(classifyBulkColumnDiff({ kind: 'legacy_template', reason: 'no_config_but_template_headers' })).toBe('ok')
  })

  it('returns error for need_wizard', () => {
    expect(classifyBulkColumnDiff({ kind: 'need_wizard', reason: 'no_config' })).toBe('error')
  })

  it('returns warning_safe when only allowlisted targets are missing', () => {
    const decision: UploadDecision = {
      kind: 'warn_format_changed',
      mapping,
      diff: {
        added: [],
        removed: ['Numero Episodio', 'Numero/Anno Stagione'],
        unchanged: ['Serie Programma Sistema', 'Regista'],
      },
      mappedRemoved: ['Numero Episodio', 'Numero/Anno Stagione'],
    }
    expect(classifyBulkColumnDiff(decision, mapping)).toBe('warning_safe')
    expect(BULK_SAFE_ABSENT_TARGETS.has('numero_episodio')).toBe(true)
  })

  it('returns error when a non-allowlisted mapped column is missing', () => {
    const decision: UploadDecision = {
      kind: 'warn_format_changed',
      mapping,
      diff: {
        added: [],
        removed: ['Regista', 'Numero Episodio'],
        unchanged: ['Serie Programma Sistema'],
      },
      mappedRemoved: ['Regista', 'Numero Episodio'],
    }
    expect(classifyBulkColumnDiff(decision, mapping)).toBe('error')
  })

  it('returns error if titolo mapping column is among mappedRemoved', () => {
    const decision: UploadDecision = {
      kind: 'warn_format_changed',
      mapping,
      diff: {
        added: [],
        removed: ['Serie Programma Sistema'],
        unchanged: [],
      },
      mappedRemoved: ['Serie Programma Sistema'],
    }
    expect(classifyBulkColumnDiff(decision, mapping)).toBe('error')
  })
})
```

- [ ] **Step 2: Run test — expect FAIL**

Run: `npm test -- --testPathPatterns=bulk-import-classify.test`

- [ ] **Step 3: Implement**

```ts
// src/features/programmazioni/utils/bulk-import-classify.ts
import type { ImportMappingConfig, UploadDecision } from '../services/import-mapping.service'

export const BULK_SAFE_ABSENT_TARGETS: ReadonlySet<string> = new Set([
  'numero_episodio',
  'numero_stagione',
])

export type BulkColumnClass = 'ok' | 'warning_safe' | 'error'

export function classifyBulkColumnDiff(
  decision: UploadDecision,
  mapping?: ImportMappingConfig | null,
): BulkColumnClass {
  if (decision.kind === 'apply_existing' || decision.kind === 'legacy_template') return 'ok'
  if (decision.kind === 'need_wizard') return 'error'
  if (decision.kind !== 'warn_format_changed') return 'error'

  const config = mapping ?? decision.mapping
  const sourceToTarget = config.mapping ?? {}

  for (const sourceCol of decision.mappedRemoved) {
    const target = sourceToTarget[sourceCol]
    if (!target) continue
    if (target === 'titolo') return 'error'
    if (!BULK_SAFE_ABSENT_TARGETS.has(target)) return 'error'
  }

  return decision.mappedRemoved.length > 0 ? 'warning_safe' : 'ok'
}
```

- [ ] **Step 4: Run tests — expect PASS**

Run: `npm test -- --testPathPatterns=bulk-import-classify.test`

- [ ] **Step 5: Commit**

```bash
git add src/features/programmazioni/utils/bulk-import-classify.ts \
  src/features/programmazioni/utils/bulk-import-classify.test.ts
git commit -m "$(cat <<'EOF'
feat(programmazioni): classifica warning colonne safe per import bulk

EOF
)"
```

---

### Task 3: Coda concorrenza limitata

**Files:**
- Create: `src/features/programmazioni/utils/bulk-import-queue.ts`
- Test: `src/features/programmazioni/utils/bulk-import-queue.test.ts`

**Interfaces:**
- Produces: `runBulkImportQueue<T>(items: T[], worker: (item: T, index: number) => Promise<void>, options?: { concurrency?: number }): Promise<void>`

- [ ] **Step 1: Write the failing test**

```ts
import { runBulkImportQueue } from './bulk-import-queue'

describe('runBulkImportQueue', () => {
  it('never runs more than concurrency workers at once', async () => {
    let inflight = 0
    let maxInflight = 0
    const items = [1, 2, 3, 4, 5, 6]

    await runBulkImportQueue(items, async () => {
      inflight++
      maxInflight = Math.max(maxInflight, inflight)
      await new Promise(r => setTimeout(r, 20))
      inflight--
    }, { concurrency: 3 })

    expect(maxInflight).toBeLessThanOrEqual(3)
    expect(maxInflight).toBe(3)
  })

  it('continues after an item rejects', async () => {
    const seen: number[] = []
    await runBulkImportQueue([1, 2, 3], async (n) => {
      seen.push(n)
      if (n === 2) throw new Error('boom')
    }, { concurrency: 1 })
    expect(seen).toEqual([1, 2, 3])
  })
})
```

- [ ] **Step 2: Run test — expect FAIL**

Run: `npm test -- --testPathPatterns=bulk-import-queue.test`

- [ ] **Step 3: Implement**

```ts
// src/features/programmazioni/utils/bulk-import-queue.ts
export async function runBulkImportQueue<T>(
  items: T[],
  worker: (item: T, index: number) => Promise<void>,
  options: { concurrency?: number } = {},
): Promise<void> {
  const concurrency = Math.max(1, options.concurrency ?? 3)
  let nextIndex = 0

  async function runOne(): Promise<void> {
    while (nextIndex < items.length) {
      const index = nextIndex++
      const item = items[index]
      try {
        await worker(item, index)
      } catch {
        // caller aggiorna stato riga; la coda non si ferma
      }
    }
  }

  const runners = Array.from({ length: Math.min(concurrency, items.length) }, () => runOne())
  await Promise.all(runners)
}
```

- [ ] **Step 4: Run tests — expect PASS**

Run: `npm test -- --testPathPatterns=bulk-import-queue.test`

- [ ] **Step 5: Commit**

```bash
git add src/features/programmazioni/utils/bulk-import-queue.ts \
  src/features/programmazioni/utils/bulk-import-queue.test.ts
git commit -m "$(cat <<'EOF'
feat(programmazioni): coda import bulk con concurrency limitata

EOF
)"
```

---

### Task 4: Hook `useProgrammazioniBulkImport` (preview + execute)

**Files:**
- Create: `src/app/dashboard/programmazioni/hooks/useProgrammazioniBulkImport.ts`
- Test: `src/app/dashboard/programmazioni/hooks/useProgrammazioniBulkImport.test.tsx`

**Interfaces:**
- Consumes: helpers Task 1–3; `detectColumns`, `decideUploadPath`, `getMappingByEmittente`, `summarizeImportMapping`, `createCampagnaProgrammazione`, `updateCampagnaStatus`, `uploadProgrammazioniFileToStorage`, `startUploadProgrammazioniJob`, `pollUploadProgrammazioniJob`, `getUploadMappingSnapshot`
- Produces hook API:

```ts
export type BulkRowStatus =
  | 'pending_preview'
  | 'ok'
  | 'warning_safe'
  | 'error'
  | 'queued'
  | 'creating'
  | 'uploading'
  | 'completed'
  | 'failed'

export interface BulkImportRow {
  id: string
  file: File
  nome: string
  columnClass: BulkColumnClass | 'pending_preview'
  mappedRemoved: string[]
  detail: string | null
  campagnaId: string | null
  jobId: string | null
  runStatus: BulkRowStatus
  progressDone: number
  progressTotal: number
  error: string | null
}

// Hook returns roughly:
// { step, setEmittenteId, setAnno, addFiles, updateNome, previewAll,
//   canStart, hasSafeWarnings, confirmSafeWarnings, startImport, retryRow,
//   rows, summary, reset }
```

- [ ] **Step 1: Write failing tests for preview classification path**

Mock `detectColumns` / `decideUploadPath` / `getMappingByEmittente`. Assert that after `previewAll`, a file with only episode columns missing becomes `warning_safe`, and one with `regia` missing becomes `error`. Keep the test focused — 2–3 cases.

- [ ] **Step 2: Run test — expect FAIL**

Run: `npm test -- --testPathPatterns=useProgrammazioniBulkImport.test`

- [ ] **Step 3: Implement hook (minimal)**

Logica chiave `previewRow(file)`:

```ts
const { columns } = await detectColumns(file)
if (columns.length === 0) return error('Nessuna colonna')
const decision = await decideUploadPath(emittenteId, columns)
const columnClass = classifyBulkColumnDiff(decision, mappingConfig)
```

Logica chiave `processRow(row)`:

```ts
// 1 create campagna se !campagnaId
const { data, error } = await createCampagnaProgrammazione({
  emittente_id: emittenteId,
  anno,
  nome: row.nome.trim(),
})
// 2 updateCampagnaStatus(id, 'uploading')
// 3 uploadProgrammazioniFileToStorage(file, id)
// 4 startUploadProgrammazioniJob({ mappingSnapshot: getUploadMappingSnapshot(decision) })
// 5 pollUploadProgrammazioniJob → update progress
```

`startImport`: se ci sono `warning_safe` e non ancora confermati → non parte (UI mostra modale). Altrimenti `runBulkImportQueue(eligibleRows, processRow, { concurrency: 3 })`.

Eligible = `ok` | `warning_safe` (se confirmed) — mai `error`.

- [ ] **Step 4: Run tests — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add src/app/dashboard/programmazioni/hooks/useProgrammazioniBulkImport.ts \
  src/app/dashboard/programmazioni/hooks/useProgrammazioniBulkImport.test.tsx
git commit -m "$(cat <<'EOF'
feat(programmazioni): hook orchestrazione import bulk

EOF
)"
```

---

### Task 5: Dialog UI BulkImport

**Files:**
- Create: `src/app/dashboard/programmazioni/components/BulkImportProgrammazioniDialog.tsx`
- Test: `src/app/dashboard/programmazioni/components/BulkImportProgrammazioniDialog.test.tsx`

**Interfaces:**
- Consumes: props da page + callback hook (o hook usato dentro il dialog)
- Produces: dialog steps `setup | review | running | done`

- [ ] **Step 1: Write component tests**

```tsx
it('disables Avvia when any row is error', () => { /* ... */ })
it('shows conferma unica when starting with warning_safe rows', () => { /* ... */ })
it('renders dropzone accepting multiple files', () => {
  expect(screen.getByLabelText(/Area di caricamento/i)).toBeInTheDocument()
})
```

- [ ] **Step 2: Run — expect FAIL**

Run: `npm test -- --testPathPatterns=BulkImportProgrammazioniDialog.test`

- [ ] **Step 3: Implement dialog**

Step setup:
- Select emittente (solo `summarizeImportMapping(status)==='configured'`)
- Input anno
- Dropzone `multiple` + drag-drop (stesso pattern di `UploadProgrammazioniDialog`)
- Soft warning se `files.length > 150`

Step review:
- Table editable nome
- Badge colonne
- Button Avvia → se warning_safe present → Dialog conferma testo spec

Step running:
- Progress `completed/total`
- Per-row status + Retry

Step done:
- Counts + chiudi / resta sulla lista

Copia conferma warning (dalla spec):

> N file hanno colonne mappate assenti ma classificate come opzionali note (es. Numero Episodio, Numero/Anno Stagione). Procedendo quei campi resteranno vuoti; il resto del mapping verrà applicato.

- [ ] **Step 4: Run tests — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add src/app/dashboard/programmazioni/components/BulkImportProgrammazioniDialog.tsx \
  src/app/dashboard/programmazioni/components/BulkImportProgrammazioniDialog.test.tsx
git commit -m "$(cat <<'EOF'
feat(programmazioni): dialog UI import bulk multi-file

EOF
)"
```

---

### Task 6: Entry point nella pagina Programmazioni

**Files:**
- Modify: `src/app/dashboard/programmazioni/page.tsx`
- Optionally light test in `page.test.tsx` se già monta header actions

**Interfaces:**
- Consumes: `BulkImportProgrammazioniDialog`, lista `emittenti` già caricata
- Produces: bottone **Import bulk** + state `isBulkOpen`

- [ ] **Step 1: Add button next to “+ Nuova Programmazione”**

```tsx
<Button variant="outline" onClick={() => setIsBulkOpen(true)}>
  Import bulk
</Button>
```

Passa ad emittenti già in pagina; al close di successo chiama `requestCampagneRefresh()`.

- [ ] **Step 2: Manual smoke** (dev)

1. Apri Import bulk, scegli SKY + 2015, drop 2–3 file.
2. Verifica prefill nomi e badge `warning_safe` su assenza Numero Episodio.
3. Conferma unica → campagne create + job running.
4. Verifica lista programmazioni aggiornata.

- [ ] **Step 3: Commit**

```bash
git add src/app/dashboard/programmazioni/page.tsx
git commit -m "$(cat <<'EOF'
feat(programmazioni): entry point Import bulk in pagina

EOF
)"
```

---

### Task 7: Spec status + smoke doc note

**Files:**
- Modify: `docs/superpowers/specs/2026-07-30-programmazioni-import-bulk-design.md` — stato → `approvato / implementato MVP`
- Optionally one line in `docs/sky-excel-2015-2022-mapping-report.md` checklist pointing to Import bulk

- [ ] **Step 1: Update spec status header**
- [ ] **Step 2: Commit**

```bash
git add docs/superpowers/specs/2026-07-30-programmazioni-import-bulk-design.md
git commit -m "$(cat <<'EOF'
docs: marca spec import bulk come approvata post-piano

EOF
)"
```

---

## Spec coverage check

| Spec requirement | Task |
|---|---|
| Multi-file drop, no zip | 5, 6 |
| 1 emittente + 1 anno | 4, 5 |
| 1 file → 1 campagna | 4 |
| Prefill nome | 1, 4 |
| Warning safe + conferma unica | 2, 4, 5 |
| Allowlist episodio/stagione | 2 |
| Concurrency 3 | 3, 4 |
| Soft limit ~150 | 5 |
| Riuso upload job/storage | 4 |
| Retry per riga | 4, 5 |
| Done summary | 5 |
| No zip / no multi-anno / no individuazione | rispettato (out of scope) |

## Placeholder scan

Nessun TBD/TODO lasciato nei task; firme e path espliciti.

## Type consistency

- `BulkColumnClass` / `classifyBulkColumnDiff` usati da Task 2 → 4 → 5
- `suggestCampagnaNomeFromFilename(filename, anno)` Task 1 → 4
- `runBulkImportQueue(..., { concurrency: 3 })` Task 3 → 4
- Snapshot mapping via `getUploadMappingSnapshot(decision)` come single-file upload

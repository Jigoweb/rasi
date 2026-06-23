# Import Quality Report Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist and expose import-quality warnings for uploaded programmazioni so broadcaster data issues are measurable before matching.

**Architecture:** Keep the existing upload behavior non-blocking: quality issues are warnings, not hard rejects. Reuse the pure `import-quality` utility already introduced under `src/features/programmazioni/utils`, mirror it into the worker runtime without fragile cross-package imports, persist an aggregate JSON report on `upload_jobs`, and surface the report through existing upload polling.

**Tech Stack:** Next.js/TypeScript, Node worker, Supabase Postgres migrations, Jest for frontend utility tests, Node `node:test` for worker tests.

---

## File Structure

- Modify: `src/features/programmazioni/utils/import-quality.ts`
  - Source of truth for warning code semantics and summary shape used by frontend/UI tests.
- Modify: `src/features/programmazioni/utils/import-quality.test.ts`
  - Unit tests for additional summary shape and stable warning messages.
- Create: `server/src/jobs/import-quality.ts`
  - Worker-local implementation with the same warning code contract. This avoids importing `src/` from the separate worker package.
- Create: `server/src/jobs/import-quality.test.ts`
  - Node tests proving worker quality report matches expected warning counts.
- Modify: `server/src/jobs/upload-programmazioni-runner.ts`
  - Compute quality summary after rows are mapped to payloads and patch `upload_jobs.quality_report`.
- Modify: `server/src/jobs/upload-programmazioni-runner.test.ts`
  - Verify completed jobs patch a quality report with warning counts.
- Modify: `server/src/jobs/upload-job-store.ts`
  - Add `quality_report` to `UploadJob` type and allowed patch payload.
- Create migration: `supabase/migrations/<timestamp>_upload_jobs_quality_report.sql`
  - Add nullable `quality_report jsonb` to `public.upload_jobs`.
- Modify: `src/features/programmazioni/services/programmazioni-upload-worker.service.ts`
  - Include `quality_report` in client-side upload job type if polling returns typed data.
- Optional Modify: `src/app/dashboard/programmazioni` upload UI component/hook
  - Show a compact warning summary only if an existing component already consumes upload job fields; otherwise defer UI to a follow-up.

## Task 1: Stabilize Frontend Quality Contract

**Files:**
- Modify: `src/features/programmazioni/utils/import-quality.test.ts`
- Modify: `src/features/programmazioni/utils/import-quality.ts`

- [ ] **Step 1: Extend the failing test for report shape**

Add this test to `src/features/programmazioni/utils/import-quality.test.ts`:

```ts
it('returns stable warning details for UI and worker parity', () => {
  const assessment = assessProgrammazioneImportQuality({
    titolo: 'Anica Luglio',
    tipo: 'short-form',
    anno: 3000,
    durata_minuti: 1,
    regia: 'Jorge RÃ­os',
  })

  expect(assessment.warnings).toEqual([
    expect.objectContaining({ code: 'year_out_of_range', field: 'anno' }),
    expect.objectContaining({ code: 'duration_placeholder', field: 'durata_minuti' }),
    expect.objectContaining({ code: 'mojibake_suspected', field: 'regia' }),
    expect.objectContaining({ code: 'type_non_canonical', field: 'tipo' }),
    expect.objectContaining({ code: 'non_work_row_suspected', field: 'titolo' }),
  ])
})
```

- [ ] **Step 2: Run the focused test and verify failure if any shape is missing**

Run:

```bash
npm test -- src/features/programmazioni/utils/import-quality.test.ts
```

Expected: PASS if current implementation already satisfies the contract, otherwise FAIL on the missing detail. If it passes immediately, continue; this task is a contract lock.

- [ ] **Step 3: Add exported report version**

Update `src/features/programmazioni/utils/import-quality.ts`:

```ts
export const IMPORT_QUALITY_REPORT_VERSION = 1
```

Extend `ImportQualitySummary`:

```ts
export interface ImportQualitySummary {
  version: typeof IMPORT_QUALITY_REPORT_VERSION
  totalRows: number
  rowsWithWarnings: number
  warningCounts: Partial<Record<ImportQualityWarningCode, number>>
}
```

Return `version: IMPORT_QUALITY_REPORT_VERSION` from `summarizeImportQuality`.

- [ ] **Step 4: Update summary test expectation**

In `summarizeImportQuality` test, assert:

```ts
expect(summary.version).toBe(1)
```

- [ ] **Step 5: Verify frontend quality tests**

Run:

```bash
npm test -- src/features/programmazioni/utils/import-quality.test.ts
```

Expected: PASS.

## Task 2: Add Worker-Local Quality Utility

**Files:**
- Create: `server/src/jobs/import-quality.ts`
- Create: `server/src/jobs/import-quality.test.ts`

- [ ] **Step 1: Write the failing worker test**

Create `server/src/jobs/import-quality.test.ts`:

```ts
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  assessProgrammazioneImportQuality,
  summarizeImportQuality,
} from './import-quality.js'

describe('worker import quality report', () => {
  it('flags real audit samples', () => {
    const summary = summarizeImportQuality([
      { titolo: 'X-Men: The Last Stand', anno: 3000 },
      { titolo: 'PETER PAN', durata_minuti: 1 },
      { titolo: 'Yellowstone', durata_minuti: 2804 },
      { titolo: 'Hacks', regia: 'Trent Oâ€™Donnell' },
      { titolo: 'Anica Luglio', tipo: 'Film' },
    ])

    assert.equal(summary.version, 1)
    assert.equal(summary.totalRows, 5)
    assert.equal(summary.rowsWithWarnings, 5)
    assert.deepEqual(summary.warningCounts, {
      year_out_of_range: 1,
      duration_placeholder: 1,
      duration_out_of_scale: 1,
      mojibake_suspected: 1,
      non_work_row_suspected: 1,
    })
  })

  it('keeps clean rows warning-free', () => {
    const assessment = assessProgrammazioneImportQuality({
      titolo: 'Hacks',
      tipo: 'series',
      anno: 2022,
      durata_minuti: 34,
      regia: 'Trent O’Donnell',
    })

    assert.deepEqual(assessment.warnings, [])
  })
})
```

- [ ] **Step 2: Run test and verify RED**

Run:

```bash
npm --prefix server test -- src/jobs/import-quality.test.ts
```

Expected: FAIL because `server/src/jobs/import-quality.ts` does not exist.

- [ ] **Step 3: Implement worker utility**

Create `server/src/jobs/import-quality.ts` with the same public contract as the frontend utility:

```ts
export const IMPORT_QUALITY_REPORT_VERSION = 1

export type ImportQualityWarningCode =
  | 'year_out_of_range'
  | 'duration_placeholder'
  | 'duration_out_of_scale'
  | 'mojibake_suspected'
  | 'type_non_canonical'
  | 'non_work_row_suspected'

export interface ImportQualityWarning {
  code: ImportQualityWarningCode
  field: string
  message: string
}

export interface ImportQualityAssessment {
  warnings: ImportQualityWarning[]
}

export interface ImportQualitySummary {
  version: typeof IMPORT_QUALITY_REPORT_VERSION
  totalRows: number
  rowsWithWarnings: number
  warningCounts: Partial<Record<ImportQualityWarningCode, number>>
}
```

Implement the same rules as `src/features/programmazioni/utils/import-quality.ts`: year range 1888 to current year + 2, duration placeholders 0/1, duration out of scale above 1000, mojibake regex `/Ã|â€/`, canonical type aliases, administrative `Anica <month>` title, and production-company title heuristic.

- [ ] **Step 4: Run worker import-quality test**

Run:

```bash
npm --prefix server test -- src/jobs/import-quality.test.ts
```

Expected: PASS.

## Task 3: Add Database Column For Upload Quality Report

**Files:**
- Create: `supabase/migrations/<timestamp>_upload_jobs_quality_report.sql`
- Modify: `server/src/jobs/upload-job-store.ts`

- [ ] **Step 1: Create migration via Supabase CLI**

Run:

```bash
supabase migration new upload_jobs_quality_report
```

Expected: a new file under `supabase/migrations`.

- [ ] **Step 2: Write migration SQL**

In the generated migration file:

```sql
ALTER TABLE public.upload_jobs
  ADD COLUMN IF NOT EXISTS quality_report jsonb;

COMMENT ON COLUMN public.upload_jobs.quality_report IS
  'Aggregated non-blocking import-quality report produced by the upload worker. Contains warning counts and report version.';
```

- [ ] **Step 3: Update worker type**

Modify `server/src/jobs/upload-job-store.ts` `UploadJob`:

```ts
  quality_report: Record<string, unknown> | null
```

No change is required for `patchUploadJob` because it accepts `Partial<Omit<UploadJob, 'id' | 'created_at'>>`.

- [ ] **Step 4: Run worker typecheck**

Run:

```bash
npm --prefix server run typecheck
```

Expected: PASS.

## Task 4: Compute And Persist Quality Report In Upload Worker

**Files:**
- Modify: `server/src/jobs/upload-programmazioni-runner.ts`
- Modify: `server/src/jobs/upload-programmazioni-runner.test.ts`

- [ ] **Step 1: Write failing worker test for quality_report patch**

Add to `server/src/jobs/upload-programmazioni-runner.test.ts`:

```ts
it('patches a quality report after mapping uploaded rows', async () => {
  const patchCalls: QueryCall[] = []
  const csv = 'titolo,emittente,anno,durata_minuti\nX-Men: The Last Stand,Disney,3000,1\nHacks,Amazon,2022,34\n'

  ;(supabaseModule.supabaseService as any).rpc = async () => ({
    data: { success: true },
    error: null,
  })
  ;(supabaseModule.supabaseService as any).from = (table: string) => {
    if (table === 'upload_jobs') return createPatchQuery(patchCalls)
    if (table === 'programmazioni') return createUpsertQuery([])
    throw new Error(`Unexpected table ${table}`)
  }
  ;(supabaseModule.supabaseService as any).storage = {
    from: () => ({
      download: async () => ({
        data: {
          arrayBuffer: async () => {
            const encoded = new TextEncoder().encode(csv)
            return encoded.buffer.slice(
              encoded.byteOffset,
              encoded.byteOffset + encoded.byteLength
            )
          },
        },
        error: null,
      }),
      remove: async () => ({ error: null }),
    }),
  }

  await runner.runUploadProgrammazioniJob({
    jobId: 'job-quality',
    campagneProgrammazioneId: 'campagna-1',
    userId: 'user-1',
    emittenteId: 'emittente-1',
    storagePath: 'user-1/campagna-1/file.csv',
    fileName: 'file.csv',
    mappingSnapshot: { kind: 'legacy_template' },
    chunkSize: 500,
  })

  const qualityPatch = patchCalls.find((call) =>
    call.method === 'update' &&
    Boolean((call.args[0] as { quality_report?: unknown }).quality_report)
  )
  assert.ok(qualityPatch)
  assert.deepEqual((qualityPatch.args[0] as any).quality_report.warningCounts, {
    year_out_of_range: 1,
    duration_placeholder: 1,
  })
})
```

- [ ] **Step 2: Run test and verify RED**

Run:

```bash
npm --prefix server test -- src/jobs/upload-programmazioni-runner.test.ts
```

Expected: FAIL because no quality report is patched.

- [ ] **Step 3: Import and compute summary in runner**

Modify `server/src/jobs/upload-programmazioni-runner.ts`:

```ts
import { summarizeImportQuality } from './import-quality.js'
```

After `const rows = parseProgrammazioniFile(fileBuffer, fileName)`, initialize:

```ts
const qualityPayloads: ProgrammazioneImportPayload[] = []
```

Inside the chunk loop, after `payloads` is computed:

```ts
qualityPayloads.push(...payloads)
```

Before the final completed patch, compute:

```ts
const qualityReport = summarizeImportQuality(qualityPayloads)
```

Include `quality_report: qualityReport` in the final `patchUploadJob`.

- [ ] **Step 4: Run worker upload runner test**

Run:

```bash
npm --prefix server test -- src/jobs/upload-programmazioni-runner.test.ts
```

Expected: PASS.

- [ ] **Step 5: Run all worker tests and typecheck**

Run:

```bash
npm --prefix server test
npm --prefix server run typecheck
```

Expected: PASS.

## Task 5: Expose Quality Report To Frontend Polling Types

**Files:**
- Modify: `src/features/programmazioni/services/programmazioni-upload-worker.service.ts`

- [ ] **Step 1: Inspect current upload job type**

Open `src/features/programmazioni/services/programmazioni-upload-worker.service.ts` and locate the returned upload job type or inferred object shape.

- [ ] **Step 2: Add quality report type**

Add local types if none exist:

```ts
export interface UploadQualityReport {
  version: number
  totalRows: number
  rowsWithWarnings: number
  warningCounts: Record<string, number>
}
```

Add to upload job result shape:

```ts
quality_report?: UploadQualityReport | null
```

- [ ] **Step 3: Run frontend typecheck**

Run:

```bash
npm run typecheck
```

Expected: PASS.

## Task 6: Documentation And Verification

**Files:**
- Modify: `docs/codebase-audit/2026-06-23-matching-individuazione-implementation-roadmap.md`
- Optional Modify: `docs/FEATURE_MAP.md`

- [ ] **Step 1: Update roadmap status**

In the roadmap, mark Slice 2 implementation as started and document:

- warning codes;
- `quality_report` JSON shape;
- verification commands.

- [ ] **Step 2: Run targeted verification**

Run:

```bash
npm test -- src/features/programmazioni/utils/import-quality.test.ts
npm run typecheck
npm --prefix server test
npm --prefix server run typecheck
```

Expected: all pass.

- [ ] **Step 3: Check final git status**

Run:

```bash
git status --short
```

Expected: only intended docs, migration, utility, worker and test files changed.

## Self-Review

Spec coverage:

- Import quality warnings: Task 1 and Task 2.
- Persisted report: Task 3 and Task 4.
- Worker integration: Task 4.
- Frontend polling visibility: Task 5.
- Verification and docs: Task 6.

Placeholder scan:

- No placeholder markers are present in implementation steps.

Type consistency:

- Frontend and worker use the same warning code strings.
- Persisted DB column is `quality_report`.
- Summary shape uses `version`, `totalRows`, `rowsWithWarnings`, `warningCounts`.

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-06-23-import-quality-report.md`. Two execution options:

1. Subagent-Driven (recommended) - dispatch a fresh subagent per task, review between tasks, fast iteration.
2. Inline Execution - execute tasks in this session using executing-plans, batch execution with checkpoints.

Which approach?

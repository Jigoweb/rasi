# Individuazioni Workflow Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** make the individuazioni workflow reliable, secure and easier to evolve by formalizing the worker-first contract before removing legacy behavior.

**Architecture:** Keep the approved transition model: worker primary plus documented serverless fallback. First define shared contracts and tests, then harden auth/scoping, then add job recovery/stale handling, then document the deprecation gate for the legacy serverless path.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Supabase, Node/Express worker, Jest, existing `npm run typecheck`, `npm test`, `npm --prefix server run typecheck`.

---

## Current Findings

- `src/features/campagne-individuazione/services/campagne-individuazione.service.ts` chooses the worker when `NEXT_PUBLIC_WORKER_URL` exists, otherwise it silently uses the browser/serverless legacy path.
- The frontend currently owns worker polling and re-attach helpers in the same service file as legacy batch orchestration.
- `server/src/routes/individuazione.ts` starts a fire-and-forget job and returns a `job_id`.
- `server/src/routes/jobs.ts` returns any job by id after auth, but does not enforce job ownership.
- `server/src/jobs/store.ts` prevents concurrent jobs per campaign, but an old `queued` or `running` row can remain active after worker crash.
- `server/src/jobs/individuazione-runner.ts` persists progress, but no startup recovery runner is visible.
- `campaign_jobs` exists in migrations and worker types, but is not represented in `src/shared/lib/supabase.ts`, causing `supabase as any` usage in frontend job reads.
- Legacy API endpoints under `src/app/api/campagne-individuazione` still duplicate init/chunk/finalize behavior and must not be deleted until parity and rollback are proven.

## File Structure

Create:

- `src/features/campagne-individuazione/services/individuazione-contract.ts`: shared frontend contract types and constants for worker/fallback status.
- `src/features/campagne-individuazione/services/individuazione-worker.service.test.ts`: frontend unit tests for worker URL, scoped active job lookup and polling mapping.
- `server/src/jobs/store.test.ts`: worker unit tests for active job lookup, stale job handling and ownership filters.
- `server/src/jobs/recovery.ts`: startup recovery helpers for stale `queued/running` jobs.
- `server/src/test/harness.test.ts`: temporary smoke test proving the worker test runner works before behavior tests are added.

Modify:

- `src/features/campagne-individuazione/services/campagne-individuazione.service.ts`: consume the contract module, scope active job lookup, keep fallback explicit.
- `src/shared/contexts/individuazione-process-context.tsx`: call scoped active-job lookup with the relevant campaign/user context where available.
- `server/src/jobs/store.ts`: add scoped job queries and stale-job helpers.
- `server/src/routes/jobs.ts`: enforce `created_by` ownership for job reads.
- `server/src/routes/individuazione.ts`: use the updated store functions and return stable error codes.
- `server/src/index.ts`: invoke recovery on startup.
- `server/package.json`: add a worker test script before adding worker tests.
- `docs/ARCHITECTURE.md`: update the individuazione workflow decision with concrete transition gates.
- `docs/DEVELOPMENT.md`: document worker URL/fallback behavior and local verification.

Do not modify in this phase:

- UI namespace paths.
- `src/app/dashboard/programmazioni/page.tsx` structure.
- Database schema, unless a later implementation discovers that existing `campaign_jobs` columns are insufficient.
- Legacy serverless deletion.

## Task 0: Worker Test Harness

**Files:**

- Create: `server/src/test/harness.test.ts`
- Modify: `server/package.json`

- [ ] **Step 1: Add worker test script**

Add a Node test runner script using the already installed `tsx` package:

```json
{
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "start": "tsx src/index.ts",
    "typecheck": "tsc --noEmit",
    "test": "tsx --test \"src/**/*.test.ts\""
  }
}
```

- [ ] **Step 2: Add smoke test**

Create `server/src/test/harness.test.ts`:

```ts
import test from 'node:test'
import assert from 'node:assert/strict'

test('worker test harness runs', () => {
  assert.equal(1 + 1, 2)
})
```

- [ ] **Step 3: Verify test harness**

Run:

```bash
npm --prefix server test
npm --prefix server run typecheck
```

Expected: the smoke test passes and worker typecheck still passes.

## Task 1: Contract And Frontend Unit Tests

**Files:**

- Create: `src/features/campagne-individuazione/services/individuazione-contract.ts`
- Create: `src/features/campagne-individuazione/services/individuazione-worker.service.test.ts`
- Modify: `src/features/campagne-individuazione/services/campagne-individuazione.service.ts`

- [ ] **Step 1: Add contract module**

Create `individuazione-contract.ts` with exported status unions and constants used by the frontend service:

```ts
export const WORKER_POLL_INTERVAL_MS = 2500
export const WORKER_MAX_NETWORK_ERRORS = 10

export type CampaignJobStatus = 'queued' | 'running' | 'completed' | 'error' | 'cancelled'
export type CampaignJobPhase = 'init' | 'processing' | 'finalizing' | 'completed' | 'error'

export interface WorkerJobSnapshot {
  id: string
  stato: CampaignJobStatus
  fase: CampaignJobPhase | null
  campagne_programmazione_id: string
  campagne_individuazione_id: string | null
  programmazioni_totali: number | null
  programmazioni_processate: number | null
  individuazioni_create: number | null
  current_chunk: number | null
  total_chunks: number | null
  error: string | null
  created_by?: string | null
  updated_at?: string | null
}
```

- [ ] **Step 2: Extract worker URL and progress mapping tests**

Add tests in `individuazione-worker.service.test.ts` for:

- `getWorkerUrl()` trims trailing slashes.
- `getWorkerUrl()` returns `null` when `NEXT_PUBLIC_WORKER_URL` is missing.
- completed worker snapshot maps to `FinalizeCampagnaResponse.success === true`.
- error/cancelled worker snapshot maps to `success === false`.

- [ ] **Step 3: Move constants into the contract**

Replace the local `WORKER_POLL_INTERVAL_MS` in `campagne-individuazione.service.ts` with the imported constant. If mapping helpers need extraction to test them without long polling loops, extract only pure helpers such as `mapWorkerJobToProgress(job)` and `mapCompletedWorkerJob(job, startTime)`.

- [ ] **Step 4: Verify**

Run:

```bash
npm test -- src/features/campagne-individuazione/services/individuazione-worker.service.test.ts
npm run typecheck
```

Expected: the new test file passes and TypeScript has no new errors.

## Task 2: Scoped Active Job Lookup

**Files:**

- Modify: `src/features/campagne-individuazione/services/campagne-individuazione.service.ts`
- Modify: `src/shared/contexts/individuazione-process-context.tsx`
- Modify: `server/src/jobs/store.ts`
- Modify: `server/src/routes/jobs.ts`
- Test: `src/features/campagne-individuazione/services/individuazione-worker.service.test.ts`
- Test: `server/src/jobs/store.test.ts`

- [ ] **Step 1: Replace global frontend re-attach**

Change `findActiveWorkerJob` so it accepts a campaign id and no longer selects the most recent active job globally:

```ts
export const findActiveWorkerJob = async (
  campagneProgrammazioneId: string
): Promise<{ jobId: string; campagneProgrammazioneId: string } | null> => {
  const { data, error } = await supabase
    .from('campaign_jobs')
    .select('id, campagne_programmazione_id')
    .eq('campagne_programmazione_id', campagneProgrammazioneId)
    .in('stato', ['queued', 'running'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error || !data) return null
  return { jobId: data.id, campagneProgrammazioneId: data.campagne_programmazione_id }
}
```

- [ ] **Step 2: Update context call sites**

In `src/shared/contexts/individuazione-process-context.tsx`, only re-attach when there is a known campaign id from persisted/current process state. If the context does not know the campaign id, skip auto re-attach and let explicit resume/start discover the job.

- [ ] **Step 3: Enforce job ownership on worker read**

In `server/src/jobs/store.ts`, add:

```ts
export async function getJobForUser(id: string, userId: string): Promise<CampaignJob | null> {
  const { data, error } = await supabaseService
    .from(TABLE)
    .select('*')
    .eq('id', id)
    .eq('created_by', userId)
    .maybeSingle()

  if (error) throw new Error(`getJobForUser: ${error.message}`)
  return (data as CampaignJob) ?? null
}
```

Then make `server/src/routes/jobs.ts` use `getJobForUser(req.params.id, req.userId!)`.

- [ ] **Step 4: Verify scoped behavior**

Add tests that prove:

- active job lookup includes `.eq('campagne_programmazione_id', ...)`;
- job reads call the ownership-scoped store function;
- unknown or other-user jobs return 404, not full job payload.

Run:

```bash
npm test -- src/features/campagne-individuazione/services/individuazione-worker.service.test.ts
npm --prefix server run typecheck
npm --prefix server test
npm run typecheck
```

Expected: tests and both typechecks pass.

## Task 3: Legacy API Auth And Fallback Explicitness

**Files:**

- Modify: `src/features/campagne-individuazione/services/campagne-individuazione.service.ts`
- Modify: `src/app/api/campagne-individuazione/get-batch-ids/route.ts`
- Modify: `src/app/api/campagne-individuazione/process-chunk/route.ts`
- Modify: `src/app/api/campagne-individuazione/process/route.ts`
- Review: `src/app/api/campagne-individuazione/init/route.ts`
- Review: `src/app/api/campagne-individuazione/resume/route.ts`

- [ ] **Step 1: Audit auth helpers**

Confirm whether each legacy route already calls the repository auth helper. Any route that performs service-role work must require a valid user session before touching Supabase.

- [ ] **Step 2: Send auth headers from legacy client calls**

Update `processChunk` and `getBatchIds` client calls to use `await getAuthHeaders()` instead of `{ 'Content-Type': 'application/json' }`.

- [ ] **Step 3: Require auth in serverless legacy routes**

Apply the same auth pattern already used by `init` and `resume` to `get-batch-ids`, `process-chunk` and `process`. Preserve response shapes so the frontend does not change behavior.

- [ ] **Step 4: Make fallback visible in code**

Add a small function in the frontend service:

```ts
export const getIndividuazioneRuntimeMode = (): 'worker' | 'legacy-serverless' =>
  getWorkerUrl() ? 'worker' : 'legacy-serverless'
```

Use it in `processCampagnaIndividuazioneBatch` instead of directly checking `getWorkerUrl()`. Keep the same behavior for now.

- [ ] **Step 5: Verify**

Run:

```bash
npm run typecheck
npm test
```

Expected: no new type errors and existing tests pass. Manual check: with `NEXT_PUBLIC_WORKER_URL` unset, the UI still starts through the legacy path but all legacy calls include Authorization when a Supabase session exists.

## Task 4: Stale Job Recovery

**Files:**

- Create: `server/src/jobs/recovery.ts`
- Modify: `server/src/jobs/store.ts`
- Modify: `server/src/index.ts`
- Test: `server/src/jobs/store.test.ts`

- [ ] **Step 1: Add stale active job query**

In `server/src/jobs/store.ts`, add a helper that returns `queued/running` jobs older than a configurable cutoff:

```ts
export async function findStaleActiveJobs(cutoffIso: string): Promise<CampaignJob[]> {
  const { data, error } = await supabaseService
    .from(TABLE)
    .select('*')
    .in('stato', ['queued', 'running'])
    .lt('updated_at', cutoffIso)

  if (error) throw new Error(`findStaleActiveJobs: ${error.message}`)
  return (data as CampaignJob[]) ?? []
}
```

- [ ] **Step 2: Add recovery helper**

Create `server/src/jobs/recovery.ts`:

```ts
import { findStaleActiveJobs, patchJob } from './store.js'

const DEFAULT_STALE_MINUTES = 30

export async function markStaleActiveJobsAsError(now = new Date()): Promise<number> {
  const cutoff = new Date(now.getTime() - DEFAULT_STALE_MINUTES * 60_000).toISOString()
  const staleJobs = await findStaleActiveJobs(cutoff)

  await Promise.all(
    staleJobs.map((job) =>
      patchJob(job.id, {
        stato: 'error',
        fase: 'error',
        error: 'Job interrotto dal riavvio del worker. Usa Riprendi per continuare.',
      })
    )
  )

  return staleJobs.length
}
```

- [ ] **Step 3: Invoke recovery on startup**

In `server/src/index.ts`, call `markStaleActiveJobsAsError()` after config/bootstrap and before accepting traffic. Log success/failure without crashing the worker if recovery fails.

- [ ] **Step 4: Verify**

Run:

```bash
npm --prefix server run typecheck
npm --prefix server test
```

Expected: worker typecheck passes. Manual check in a dev database: an old `running` row older than 30 minutes becomes `error`, while a recent `running` row remains active.

## Task 5: Progress/Stuck Source Of Truth

**Files:**

- Modify: `src/features/programmazioni/services/programmazioni.service.ts`
- Modify: `src/features/individuazioni/services/individuazioni.service.ts`
- Modify: `src/features/campagne-individuazione/services/campagne-individuazione.service.ts`

- [ ] **Step 1: Audit stale definitions**

Document every current stale/interrupted condition in comments or local helper names. The target is not to redesign UI labels, but to avoid multiple hidden definitions.

- [ ] **Step 2: Prefer job `updated_at` when a job exists**

For campaigns with an active or recently errored `campaign_jobs` row, use `campaign_jobs.updated_at` as the freshness source. Only fall back to `last_activity_at` from individuazioni when there is no job state.

- [ ] **Step 3: Preserve current labels**

Keep existing user-facing labels such as `Interrotto`, `In corso`, `Riprendi` and current button behavior unless a later UI task explicitly changes copy.

- [ ] **Step 4: Verify**

Run:

```bash
npm run typecheck
```

Manual checks:

- active worker job shows progress;
- stale worker job shows interrupted/resumable state;
- campaign without job state still uses the existing last-activity behavior;
- completed campaign remains completed.

## Task 6: Documentation And Deprecation Gate

**Files:**

- Modify: `docs/ARCHITECTURE.md`
- Modify: `docs/DEVELOPMENT.md`
- Modify: `docs/codebase-audit/cleanup-candidates.md`

- [ ] **Step 1: Update architecture decision**

Replace the open-ended individuazione section with the approved transition:

- worker primary;
- serverless fallback only when `NEXT_PUBLIC_WORKER_URL` is absent;
- legacy deletion blocked until contract tests, auth parity, scoped job reads and recovery are complete.

- [ ] **Step 2: Update development docs**

Document local modes:

```bash
# Worker-primary local mode
NEXT_PUBLIC_WORKER_URL=http://localhost:8080
npm run dev
npm --prefix server run dev

# Legacy fallback mode
# leave NEXT_PUBLIC_WORKER_URL unset
npm run dev
```

- [ ] **Step 3: Update cleanup candidates**

Mark legacy serverless routes as transitional, not removable yet. The deletion gate is: worker contract tests pass, recovery is live, job reads are scoped, legacy auth is enforced, and one production/staging run has been verified.

- [ ] **Step 4: Final verification**

Run:

```bash
npm run typecheck
npm test
npm --prefix server run typecheck
npm --prefix server test
```

Optional broader confidence after implementation:

```bash
npm run build
```

Global `npm run lint` is still expected to be red until the documented lint baseline is triaged; use it only to compare new errors in touched files.

## Rollback Strategy

- Keep each task as its own commit or reviewable diff.
- If Task 1 fails, remove only the new contract/test files and restore imports in `campagne-individuazione.service.ts`.
- If Task 2 fails, revert scoped job lookup and ownership route changes together; do not touch job runner logic.
- If Task 3 fails, keep auth fixes if they are independently verified; revert only fallback/runtime-mode refactors if needed.
- If Task 4 fails, remove `server/src/jobs/recovery.ts` and the startup call; keep store helpers only if tests pass and no runtime import remains.
- If Task 5 causes UI regression, revert the freshness-source change and keep the documented stale definitions for a smaller follow-up.
- Do not use broad git resets, branch rewrites, or checkout of unrelated paths.

## Execution Order

1. Worker test harness, because worker behavior tests need a runnable command.
2. Contract/tests, because this turns implicit behavior into something verifiable.
3. Scoped active job and ownership enforcement, because it closes cross-user/cross-campaign risk.
4. Legacy auth/fallback explicitness, because the fallback path remains reachable.
5. Recovery, because it prevents stuck rows from blocking future starts.
6. Stuck/progress source of truth, because it should build on reliable job state.
7. Docs/deprecation gate, because it records what can be removed later and what cannot.

## Out Of Scope

- Removing `src/app/api/campagne-individuazione/*`.
- Replacing polling with Supabase Realtime.
- Refactoring `src/app/dashboard/programmazioni/page.tsx`.
- UI namespace consolidation.
- Supabase type regeneration for the entire schema, unless required by touched code.

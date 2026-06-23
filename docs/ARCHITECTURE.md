# Architecture

## Overview

RASI uses Next.js App Router for the web application, Supabase for database/auth and a separate Node/Express worker for long-running jobs.

## Related Docs

- `docs/DEVELOPMENT.md`: local setup, env, database, worker and verification.
- `AGENTS.md`: AI-agent operating guide for repository changes.

## Runtime Areas

| Area | Path | Responsibility |
|---|---|---|
| App Router | `src/app` | routes, layouts, route composition, API entrypoints |
| Features | `src/features` | domain services, hooks, forms and feature UI |
| Shared | `src/shared` | reusable UI, contexts, utilities, Supabase integration |
| Worker | `server` | long-running jobs and APIs outside serverless timeout limits |
| Database | `supabase/migrations`, `db/init` | schema, migrations and initialization context |

## Boundary Rules

- Keep `src/app` pages thin: compose feature components and call feature hooks/services.
- Put feature-specific logic in `src/features/<feature>`.
- Put reusable generic UI in one canonical UI namespace.
- Keep Supabase client/type changes centralized and reviewed.
- Treat worker job orchestration as backend runtime code, not page logic.

## Known Hotspots

- `src/app/dashboard/opere/[id]/page.tsx`
- `src/app/dashboard/programmazioni/page.tsx`
- `src/features/campagne-individuazione/services/campagne-individuazione.service.ts`
- `server/src/jobs/individuazione-runner.ts`
- `src/shared/lib/supabase.ts`
- `src/components/ui` and `src/shared/components/ui`

## UI Namespace Decision

Current state:

- `components.json` points shadcn aliases to `@/components` and `@/components/ui`.
- The architecture target prefers shared reusable UI under `src/shared/components/ui`.
- The observed tension is that repository imports largely use `@/shared/components/ui`, while shadcn generation still targets `@/components/ui`.

Decision required before migration:

1. Keep `src/components/ui` as shadcn canonical and import from there.
   - Impact: aligns generated shadcn files with `components.json`, but requires moving or rewriting existing shared UI imports.
   - Prerequisite: approve an import migration plan and verify no shared UI consumers are missed.
   - Risk: high churn across pages/features and possible duplicate component drift during migration.

2. Migrate shadcn canonical path to `src/shared/components/ui`.
   - Impact: aligns shadcn generation with the imports already used by much of the repo.
   - Prerequisite: update `components.json`, normalize import paths, and create a duplicate cleanup plan for any remaining `src/components/ui` files.
   - Risk: shadcn add/update commands may generate to the wrong place until config and import conventions are changed together.

3. Keep both temporarily with a documented migration rule.
   - Impact: avoids blocking immediate dashboard refactors while preserving existing imports.
   - Prerequisite: document which namespace is read-only or transitional and add a follow-up cleanup gate.
   - Risk: continued ambiguity can create new duplicates if contributors add UI in both places.

Recommended default: keep current imports stable for Task 10; decide the canonical namespace before any UI migration; do not mix UI namespace migration with the first dashboard refactor.

If `src/shared/components/ui` is approved as canonical, the migration must include `components.json`, import paths, and a duplicate cleanup plan.

## Individuazione Workflow Transition

Approved transition:

- The worker path is primary for individuazione jobs.
- The legacy serverless/API path under `src/app/api/campagne-individuazione` remains a fallback only when `NEXT_PUBLIC_WORKER_URL` is absent.
- Frontend service logic under `src/features/campagne-individuazione/services` must preserve the shared worker/serverless contract while both paths exist.

Deletion gate for the legacy serverless path:

- Worker contract tests pass.
- Legacy serverless auth parity is enforced before service-role work.
- Job reads are scoped by campaign and owner.
- The campaign job owner RLS policy is applied.
- Worker stale recovery is live.
- Fallback criteria are documented.
- A rollback path exists.
- At least one staging or production individuazione run has been verified.

This slice approves the worker-primary transition hardening, not deletion. Do not remove or archive the legacy serverless routes until every gate above is verified and the deletion is separately approved.

## Refactor Strategy

1. Add or identify tests/checklists around behavior.
2. Extract pure components first.
3. Extract hooks for page state and effects.
4. Extract feature services/adapters.
5. Verify after every slice.

## Proposed Hotspot Refactor Order

This order is proposed for user confirmation before refactor work starts.

1. `src/app/dashboard/programmazioni/page.tsx`
   - Reason: large route page and import/mapping flows; tests or behavior checklists must be confirmed before refactor.
   - First extraction: pure components and mapping/import hooks.

2. `src/app/dashboard/opere/[id]/page.tsx`
   - Reason: largest page and high blast radius.
   - First extraction: read-only display sections before mutation flows.

3. `src/features/campagne-individuazione/services` and `server/src/jobs`
   - Reason: workflow duplication and operational sensitivity.
   - First extraction: contract documentation and tests before removal.

Gates before the first refactor:

- Confirm the behavior checklist or existing test coverage for the selected page.
- Approve the first slice allowed for extraction before code changes begin.
- Keep UI namespace migration out of scope for the first page split unless separately approved.
- Keep individuazione workflow changes out of scope for the first page split unless separately approved.

## Open Decisions

- Canonical UI namespace:
  - Options: keep `src/components/ui`, migrate to `src/shared/components/ui`, or keep both temporarily with a documented migration rule.
  - Recommended default: keep current imports stable for Task 10 and choose the canonical namespace before any UI migration.
  - Gate: no UI namespace migration during the first dashboard refactor unless separately approved.
  - Approval question: which UI namespace should become canonical?

- Individuazione workflow:
  - Decision: worker primary with legacy serverless fallback only when `NEXT_PUBLIC_WORKER_URL` is absent.
  - Gate: no legacy serverless deletion until contract tests, auth parity, scoped job reads, RLS owner policy, stale recovery, fallback criteria, rollback path, and at least one staging/production run are verified.

- First hotspot/refactor direction:
  - Options: approve the proposed order, choose `src/app/dashboard/opere/[id]/page.tsx` first, or defer page refactors until more coverage is confirmed.
  - Recommended default: start with `src/app/dashboard/programmazioni/page.tsx` only after confirming tests/checklist and limiting the first slice to pure components plus mapping/import hooks.
  - Gate: UI namespace and individuazione workflow changes remain out of scope unless separately approved.
  - Approval question: which hotspot and first slice should be approved?

- Timing for making ESLint blocking in build.

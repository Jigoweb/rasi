# Agent Operating Guide

This repository is a Next.js/Supabase application with a separate Node worker. Follow this guide before changing files.

## First Reads

1. `README.md`
2. `docs/DEVELOPMENT.md`
3. `docs/ARCHITECTURE.md`
4. `docs/README.md`
5. The relevant feature folder under `src/features`

## Before Editing

Run:

```bash
git status --short
git branch --show-current
```

Do not revert, delete or overwrite user changes. Do not delete branches or files without explicit approval.

## Boundaries

- `src/app`: routing, layouts, pages and API entrypoints. Keep route files thin.
- `src/features`: domain services, hooks, feature components and feature tests.
- `src/shared`: reusable UI, contexts, utilities and Supabase clients/types.
- `server`: worker runtime and long-running jobs.

## Safe Zones

- Focused docs updates.
- Small tested utilities.
- Feature-owned components and services with nearby tests.
- New audit/planning documents under `docs/codebase-audit` or `docs/superpowers`.

## Caution Zones

- `src/shared/lib/supabase.ts`
- `supabase/migrations`
- `server/src/jobs`
- `src/app/api/campagne-individuazione`
- large dashboard pages under `src/app/dashboard`
- `.vercel/`, deployment configuration and env files

## Verification

Use the narrowest relevant check first. The full local verification command is:

```bash
npm run verify
```

Before the Task 7 baseline is resolved, `npm run verify` may still fail on known lint or build baseline issues. If that happens, consult `docs/codebase-audit/2026-06-23-baseline.md` and use targeted checks to isolate the failure:

```bash
npm test
npm run lint
npm run typecheck
npm run build
npm --prefix server run typecheck
```

## Cleanup Rules

- Classify files before deleting.
- Mark historical docs clearly before moving or removing them.
- Verify references with `rg`.
- Do not remove dependencies without usage search and a dependency check.
- Do not change branch state without explicit approval.

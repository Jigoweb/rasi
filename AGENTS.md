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

## Graphify Knowledge Graph

This project is configured for Graphify in Cursor via `.cursor/rules/graphify.mdc`.

- If `graphify-out/graph.json` exists, consult the graph before broad code exploration, architecture questions, impact analysis or cross-feature debugging.
- Prefer `graphify query "<question>"` for open-ended questions, `graphify explain "<symbol-or-concept>"` for local context and `graphify path "<A>" "<B>"` for dependency or relationship paths.
- Use `graphify-out/GRAPH_REPORT.md` for high-level orientation: graph freshness, community hubs, god nodes and surprising connections.
- After code changes that affect structure, run `graphify update .` to refresh the AST graph. This is local and does not require an API key.
- If `graphify-out/graph.json` is missing, build it with `graphify update .` when graph context would help; otherwise continue with the normal first-read and search workflow.
- Do not commit `graphify-out/`; it is a generated local artifact.

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

## Cursor Cloud specific instructions

Services (all local): the Next.js app (`npm run dev`, port 3000), the Node worker (`npm --prefix server run dev`, port 8080), and a local Supabase stack via the Supabase CLI (`supabase start`: API 54321, Postgres 54322, Studio 54323). Standard install/lint/test/build commands are in `README.md` and `docs/DEVELOPMENT.md`; the worker's are in `server/README.md`. `npm install` + `npm --prefix server install` are handled by the startup update script.

Environment files (both gitignored) point the app and worker at the local stack: `.env.local` and `server/.env` use `http://127.0.0.1:54321` with the CLI's default local anon/service-role keys. Recreate them from `.env.example` / `server/.env.example` if missing.

Non-obvious database bootstrap (the important gotcha): `supabase start` only runs `supabase/migrations/`, but those are INCREMENTAL and assume the base schema (tables like `artisti`, `opere`) which lives ONLY in `db/init/*.sql`. Running migrations against an empty DB fails with `relation "public.opere" does not exist`. Use `scripts/dev/bootstrap-local-supabase.sh` (idempotent, destructive to the local `public` schema) to apply base schema + migrations + role grants and create a confirmed admin test user. Known repo drift the script handles: `db/init/02_rls.sql` uses the old name `ripartizioni_dettaglio` (table is `ripartizioni`); `emittenti.mapping_import` is missing from the base snapshot; migration `20260630125200_block_film_matches_for_episode_programmazioni` text-patches a matching function whose base-snapshot body differs, so it raises and is skipped (only affects the individuazione matching engine, not general CRUD).

Because the schema is applied as the `postgres` superuser, the `anon`/`authenticated`/`service_role` API roles do NOT get DML grants automatically — without the grant step the app/worker fail with `permission denied for table ...`. The bootstrap script grants them; re-run it if you rebuild the schema.

Test login for the dashboard: `operatore@rasi.local` / `Password123!` (role `admin`; `get_user_role()` reads `raw_user_meta_data->>'ruolo'`). Bring-up order for a fresh VM: start `dockerd`, then `supabase start`, then `scripts/dev/bootstrap-local-supabase.sh`, then `npm run dev` and `npm --prefix server run dev`. Docker (with `fuse-overlayfs` + `iptables-legacy`) and the Supabase CLI are required host tools; the worker's `supabase-js` uses the service-role key and bypasses RLS.

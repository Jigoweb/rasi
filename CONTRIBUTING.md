# Contributing

## Working Rules

- Check `git status --short` before editing.
- Do not delete branches, migrations, docs or generated files without explicit approval.
- Keep changes scoped to one feature or cleanup phase.
- Prefer small, reviewable pull requests.
- Treat local env files and secrets as private; never commit them.

## Branches

- Use a dedicated branch for cleanup or refactor work.
- Do not work directly on `main` unless explicitly requested.
- Treat active worktrees as protected.
- Do not merge, rebase or delete branches without explicit approval.

## Architecture Boundaries

See `docs/ARCHITECTURE.md` for the canonical architecture map and boundary rules.

- `src/app`: route composition, layouts and API route entrypoints.
- `src/features`: domain logic, services, hooks and feature components.
- `src/shared`: generic reusable components, contexts, libs and utilities.
- `server`: worker runtime and long-running jobs.

Do not place business logic directly in large route pages when a feature service, hook or component can own it.

## Tests And Verification

Run the narrowest relevant test first. The full local verification command is:

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

## Database And Supabase

- Prefer migrations in `supabase/migrations`.
- Do not modify historical SQL or archived setup files as if they were current instructions.
- Regenerate or update Supabase types when database or RPC surface changes.
- Never commit service-role keys or local env files.
- See `docs/DEVELOPMENT.md` for current local setup and database guidance.

## Documentation

When changing setup, deploy, env, architecture or workflow behavior, update the corresponding canonical doc:

- `docs/DEVELOPMENT.md`
- `docs/ARCHITECTURE.md`
- `docs/README.md`
- `AGENTS.md`

For AI-specific operating rules, follow `AGENTS.md`.

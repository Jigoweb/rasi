# Root Security Cleanup

Date: 2026-06-23

## Scope

This cleanup reduces root-level clutter and removes obvious tracked demo artifacts that referenced privileged Supabase credentials. It does not rotate credentials and does not fully refactor historical scripts.

## Actions Applied

- Removed root demo scripts:
  - `supabase_query_demo.py`
  - `test_supabase_query.py`
- Removed empty root Vercel config:
  - `vercel.json`
- Removed generated local session artifacts:
  - `.superpowers/`
- Archived historical deploy notes:
  - `ISTRUZIONI_DEPLOY.md` -> `docs/archive/deploy/ISTRUZIONI_DEPLOY.md`
  - `FIX_VERCEL_ENV_VARS.md` -> `docs/archive/deploy/FIX_VERCEL_ENV_VARS.md`
- Archived historical Trae exports:
  - `.trae/` -> `docs/archive/trae/tool-documents/`
- Added archive indexes:
  - `docs/archive/README.md`
  - `docs/archive/deploy/README.md`
  - `docs/archive/trae/README.md`
- Added `.superpowers/` to `.gitignore`.

## Security Follow-Up

If any removed or remaining script contained a real Supabase service role key, rotate/revoke that key in Supabase. Removing files from the current tree does not remove secrets from git history.

Remaining files with Supabase service-role references should be env-var references only. Historical scripts should either keep reading from environment variables or be removed if obsolete.

### Legitimate Runtime/Documentation References To Keep

- `src/shared/lib/supabase-server.ts`
- `src/app/api/users/route.ts`
- `server/src/config.ts`
- `server/.env.example`
- `server/README.md`
- `docs/DEVELOPMENT.md`

### Scripts Refactored To Environment Variables

These scripts no longer contain JWT-like literals or hardcoded project `*.supabase.co` URLs. They read Supabase configuration from environment variables instead.

- `scripts/checks/analyze_opere.py`
- `scripts/checks/check_artists.py`
- `scripts/checks/check_full_integrity.py`
- `scripts/checks/check_opere_final.py`
- `scripts/checks/check_ruoli_tipologie.py`
- `scripts/checks/explore_partecipazioni.py`
- `scripts/checks/final_verification.py`
- `scripts/checks/verify_partecipazioni_final.py`
- `scripts/migrations/create_ruoli.py`
- `scripts/migrations/insert_default_ruolo.py`
- `scripts/migrations/migrate_artists.py`
- `scripts/migrations/migrate_opere.py`
- `scripts/migrations/migrate_partecipazioni.py`
- `scripts/migrations/sync_deletions.py`
- `scripts/utils/debug_mapping.py`
- `scripts/utils/fix_opere_types.py`
- `scripts/utils/quick_fix_types.py`

### Scripts Still Requiring Obsolescence Review

These scripts no longer contain hardcoded JWT-like values or project URLs, but still need product/ops review to decide whether they remain useful or should be archived/deleted:

- `scripts/add_published_flag.js`
- `scripts/build_legacy_routes.js`
- `scripts/check_columns.js`
- `scripts/check_published_flag.js`
- `scripts/import_legacy_documents.js`
- `scripts/import_wp_pdf_media.js`
- `scripts/run_migration_imdb_tconst.js`
- `scripts/seed_cms.js`
- `scripts/seed_full_sitemap.js`
- `scripts/sync_legacy_content.js`
- `scripts/sync_one_service.js`
- `scripts/test_admin_access.js`
- `scripts/test_fetch_with_supabase.js`
- `scripts/test_update_servizi.js`

## Items Intentionally Left In Root

- `.vercel/`: deployment link metadata; requires a team/deploy decision before untracking.
- `.claude/`: local tooling config; requires a team tooling decision.
- `.mcp.json`: shared MCP project reference; requires a team/agent tooling decision.
- `DEPLOYMENT.md`: still present until a canonical deploy guide is written.
- `data/legacy_routes.json`: consumed by legacy sync scripts; keep until legacy sync strategy is decided.

## Verification

Run after this cleanup:

```bash
npm test
npm run typecheck
npm --prefix server run typecheck
```

Result in `chore/root-security-cleanup`:

- `npm test`: PASS, 15 suites and 199 tests.
- `npm run typecheck`: PASS after installing worktree dependencies.
- `npm --prefix server run typecheck`: PASS after installing worker dependencies.
- Script syntax checks: PASS for tracked Python and JavaScript scripts.
- Secret literal scan in `scripts/`: PASS; no JWT-like literals or hardcoded project `*.supabase.co` URLs remain.

Do not expect `npm run lint` to pass until the documented lint triage is completed.

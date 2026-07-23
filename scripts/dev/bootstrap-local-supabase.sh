#!/usr/bin/env bash
#
# Bootstrap the local Supabase database for RASI development.
#
# WHY THIS EXISTS:
#   `supabase start` only applies files in `supabase/migrations/`. Those
#   migrations are INCREMENTAL and assume the base schema (tables like
#   `artisti`, `opere`, ...) already exists. The base schema lives ONLY in
#   `db/init/*.sql` (a March 2026 snapshot). This script applies the base
#   schema first, then the migrations, then fixes API-role grants, then
#   creates a confirmed admin test user.
#
# KNOWN REPO DRIFT (handled here, NOT a bug in this script):
#   - `db/init/02_rls.sql` references table `ripartizioni_dettaglio`, but the
#     schema creates `ripartizioni` -> we apply a name-corrected copy.
#   - `emittenti.mapping_import` is missing from the base snapshot but is
#     referenced by an early migration -> we add it before migrations run.
#   - migration `20260630125200_block_film_matches_for_episode_programmazioni`
#     text-patches a matching function whose base-snapshot body differs, so it
#     raises and is SKIPPED. It only refines the individuazione matching
#     engine and is not needed for general dev / CRUD.
#
# This script is DESTRUCTIVE to the local `public` schema and is intended for
# local development only. Requires: a running dockerd and `supabase start`
# already executed (see AGENTS.md).
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO_ROOT"

DBC="${SUPABASE_DB_CONTAINER:-supabase_db_rasi}"
API_URL="${SUPABASE_API_URL:-http://127.0.0.1:54321}"
TEST_EMAIL="${RASI_TEST_EMAIL:-operatore@rasi.local}"
TEST_PASSWORD="${RASI_TEST_PASSWORD:-Password123!}"

psql_run() { docker exec -i "$DBC" psql -U postgres -d postgres "$@"; }

echo ">> Resetting public schema"
psql_run -v ON_ERROR_STOP=1 <<'SQL'
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
SQL

echo ">> Applying base schema (db/init)"
psql_run -v ON_ERROR_STOP=1 < db/init/00_schema.sql >/dev/null
psql_run -v ON_ERROR_STOP=1 < db/init/01_indexes.sql >/dev/null
# 02_rls.sql references the pre-rename table name; fix on the fly.
sed 's/ripartizioni_dettaglio/ripartizioni/g' db/init/02_rls.sql | psql_run -v ON_ERROR_STOP=1 >/dev/null
psql_run -v ON_ERROR_STOP=1 < db/init/03_matching_functions.sql >/dev/null
psql_run -v ON_ERROR_STOP=1 < db/init/03b_process_chunk.sql >/dev/null
psql_run -v ON_ERROR_STOP=1 < db/init/10_public_pages_cms.sql >/dev/null

echo ">> Adding column expected by later migrations"
psql_run -v ON_ERROR_STOP=1 -c "ALTER TABLE public.emittenti ADD COLUMN IF NOT EXISTS mapping_import jsonb;" >/dev/null

echo ">> Applying migrations (supabase/migrations)"
SKIP="20260630125200_block_film_matches_for_episode_programmazioni.sql"
for f in $(ls supabase/migrations/*.sql | sort); do
  name="$(basename "$f")"
  if [ "$name" = "$SKIP" ]; then
    echo "   SKIP (known drift) $name"
    continue
  fi
  if psql_run -v ON_ERROR_STOP=1 < "$f" >/tmp/rasi_mig.log 2>&1; then
    echo "   ok   $name"
  else
    echo "   WARN failed, continuing: $name"
    tail -3 /tmp/rasi_mig.log | sed 's/^/        /'
  fi
done

echo ">> Granting standard Supabase privileges to API roles"
psql_run <<'SQL' >/dev/null 2>&1
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO anon, authenticated, service_role;
SQL

echo ">> Creating confirmed admin test user ($TEST_EMAIL)"
SRK="$(supabase status -o env 2>/dev/null | sed -n 's/^SERVICE_ROLE_KEY="\(.*\)"$/\1/p')"
SRK="${SRK:-eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU}"
curl -s -X POST "$API_URL/auth/v1/admin/users" \
  -H "apikey: $SRK" -H "Authorization: Bearer $SRK" -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\",\"email_confirm\":true,\"user_metadata\":{\"ruolo\":\"admin\",\"nome\":\"Operatore Demo\"}}" \
  | grep -qE '"id"|email_exists|already been registered' \
  && echo "   test user ready" || echo "   WARN: could not confirm test user creation"

echo ">> Done. Login: $TEST_EMAIL / $TEST_PASSWORD"

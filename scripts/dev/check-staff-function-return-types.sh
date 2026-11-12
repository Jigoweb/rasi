#!/usr/bin/env bash
# Applica #60 e 20261109104140 su un Postgres vuoto e chiama le 6 funzioni
# staff come admin. Prima del cast la lista campagne deve fallire con 42804;
# dopo, tutte e sei tornano senza 42804. Il check SQL non chiama le funzioni.
#
# Locale (container effimero, non tocca lo stack Supabase):
#   bash scripts/dev/check-staff-function-return-types.sh
# CI (Postgres già in ascolto):
#   DATABASE_URL=postgres://postgres:postgres@localhost:5432/rasi \
#     bash scripts/dev/check-staff-function-return-types.sh

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
FIXTURE="$ROOT/scripts/dev/fixtures/staff_function_return_types.sql"
GRANTS="$ROOT/scripts/dev/fixtures/staff_function_return_types_grants.sql"
EXPECT_42804="$ROOT/scripts/dev/fixtures/staff_function_return_types_expect_42804.sql"
EXPECT_OK="$ROOT/scripts/dev/fixtures/staff_function_return_types_expect_ok.sql"
MIGRATION_60="$ROOT/supabase/migrations/20261106220000_role_guard_staff_functions.sql"
MIGRATION_FIX="$ROOT/supabase/migrations/20261109104140_fix_campagne_programmazione_list_return_types.sql"
ROLLBACK="$ROOT/supabase/rollback/20261109104140_fix_campagne_programmazione_list_return_types.sql"
CHECK="$ROOT/supabase/scripts/20261109104140_fix_campagne_programmazione_list_return_types_check.sql"
LIVE_DEF="$ROOT/scripts/dev/fixtures/get_campagne_programmazione_with_counts.pg_get_functiondef.sql"

STARTED_CONTAINER=""

cleanup() {
  if [[ -n "$STARTED_CONTAINER" ]]; then
    sudo docker rm -f "$STARTED_CONTAINER" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT

psql_file() {
  local single="$1"
  local file="$2"
  local args=(-v ON_ERROR_STOP=1)
  if [[ "$single" == "1" ]]; then
    args+=(--single-transaction)
  fi
  if [[ -n "${DATABASE_URL:-}" ]]; then
    psql "$DATABASE_URL" "${args[@]}" -f "$file"
  else
    sudo docker exec -i "$STARTED_CONTAINER" \
      psql -U postgres -d rasi "${args[@]}" -f - < "$file"
  fi
}

psql_query() {
  local sql="$1"
  if [[ -n "${DATABASE_URL:-}" ]]; then
    psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -A -F '|' -t -c "$sql"
  else
    sudo docker exec -i "$STARTED_CONTAINER" \
      psql -U postgres -d rasi -v ON_ERROR_STOP=1 -A -F '|' -t -c "$sql"
  fi
}

psql_tuples_file() {
  local file="$1"
  if [[ -n "${DATABASE_URL:-}" ]]; then
    psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -A -F '|' -t -f "$file"
  else
    sudo docker exec -i "$STARTED_CONTAINER" \
      psql -U postgres -d rasi -v ON_ERROR_STOP=1 -A -F '|' -t -f - < "$file"
  fi
}

if [[ -z "${DATABASE_URL:-}" ]]; then
  STARTED_CONTAINER="rasi-return-types-$$"
  sudo docker rm -f "$STARTED_CONTAINER" >/dev/null 2>&1 || true
  sudo docker run -d --name "$STARTED_CONTAINER" \
    -e POSTGRES_PASSWORD=postgres \
    -e POSTGRES_DB=rasi \
    postgres:17 >/dev/null
  ready=0
  for _ in $(seq 1 60); do
    if sudo docker exec "$STARTED_CONTAINER" pg_isready -U postgres -d rasi >/dev/null 2>&1; then
      ready=1
      break
    fi
    sleep 1
  done
  if [[ "$ready" != "1" ]]; then
    echo "Postgres di test non è diventato pronto" >&2
    exit 1
  fi
fi

echo "fixture"
psql_file 1 "$FIXTURE"
echo "migration #60"
psql_file 1 "$MIGRATION_60"
echo "grant post-#58"
psql_file 1 "$GRANTS"
echo "atteso 42804 sul corpo #60"
psql_file 0 "$EXPECT_42804"
echo "check sul corpo #60: nome varchar senza cast deve essere fail"
psql_tuples_file "$CHECK" | tee /tmp/rasi-return-types-check-before.txt
if ! awk -F'|' '$1=="sorgente" && $2=="nome" && $NF=="fail" { found=1 } END { exit (found ? 0 : 1) }' /tmp/rasi-return-types-check-before.txt; then
  echo "il check non ha segnalato il varchar di nome prima del cast" >&2
  exit 1
fi
if ! awk -F'|' '$1=="RIEPILOGO" && $NF=="fail" { found=1 } END { exit (found ? 0 : 1) }' /tmp/rasi-return-types-check-before.txt; then
  echo "RIEPILOGO prima del cast non è fail" >&2
  exit 1
fi
echo "migration fix"
psql_file 1 "$MIGRATION_FIX"
echo "chiamate staff"
psql_file 0 "$EXPECT_OK"
echo "check read-only"
psql_tuples_file "$CHECK" | tee /tmp/rasi-return-types-check.txt
if awk -F'|' 'NF && $NF != "ok" { found=1 } END { exit (found ? 0 : 1) }' /tmp/rasi-return-types-check.txt; then
  echo "check read-only fallito" >&2
  exit 1
fi

assert_matches_live_def() {
  local got
  got="$(mktemp)"
  if [[ -n "${DATABASE_URL:-}" ]]; then
    psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -At \
      -c "SELECT pg_get_functiondef('public.get_campagne_programmazione_with_counts()'::regprocedure)" > "$got"
  else
    sudo docker exec -i "$STARTED_CONTAINER" \
      psql -U postgres -d rasi -v ON_ERROR_STOP=1 -At \
      -c "SELECT pg_get_functiondef('public.get_campagne_programmazione_with_counts()'::regprocedure)" > "$got"
  fi
  python3 - "$LIVE_DEF" "$got" <<'PY'
import pathlib, sys, difflib
expected = pathlib.Path(sys.argv[1]).read_bytes()
got = pathlib.Path(sys.argv[2]).read_bytes()
if got.endswith(b"\n\n") and expected.endswith(b"\n") and not expected.endswith(b"\n\n"):
    got = got[:-1]
if got != expected:
    sys.stderr.write("pg_get_functiondef differs from the live prod definition\n")
    sys.stderr.writelines(difflib.unified_diff(
        expected.decode().splitlines(True),
        got.decode().splitlines(True),
        fromfile="prod",
        tofile="after-migration",
    ))
    sys.exit(1)
print("pg_get_functiondef matches the live prod definition")
PY
  rm -f "$got"
}

echo "confronto con pg_get_functiondef di produzione"
assert_matches_live_def
echo "seconda applicazione: il corpo deve restare identico"
psql_file 1 "$MIGRATION_FIX"
assert_matches_live_def
echo "rollback al corpo #60"
psql_file 0 "$ROLLBACK"
echo "atteso di nuovo 42804"
psql_file 0 "$EXPECT_42804"
echo "riapplicazione"
psql_file 1 "$MIGRATION_FIX"
assert_matches_live_def
echo "chiamate staff dopo riapplicazione"
psql_file 0 "$EXPECT_OK"

version="$(psql_query 'SHOW server_version_num')"
echo "ok server_version_num=${version}"

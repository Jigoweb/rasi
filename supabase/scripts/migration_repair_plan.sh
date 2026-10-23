#!/usr/bin/env bash
# Piano di allineamento della storia migration.
# Legge supabase/scripts/migration_repair_plan.md prima di qualsiasi esecuzione.
# Fase 1 non applica SQL di schema. Fase 2 applica un solo file, mai db push.
#
# Default: stampa i comandi e esce, senza rete e senza database.
# Esecuzione, solo dopo il merge di #45 e dopo le query di pre-check:
#   CONFIRM=apply-repair TARGET=local  ./supabase/scripts/migration_repair_plan.sh
#   CONFIRM=apply-repair TARGET=linked ./supabase/scripts/migration_repair_plan.sh
# TARGET=linked modifica schema_migrations del progetto collegato. Non è un db push.
# Fase 1 (storia già in prod, inclusi i 3 PRESENT): CONFIRM=apply-repair
# Fase 2 (solo 20261021100000, poi applied dei 6 + quel timestamp):
#   CONFIRM=apply-missing-effects TARGET=local|linked
# Non usare supabase db push: i 6 file vecchi partirebbero prima.
# Annullamento storia (non rilancia DDL):
#   CONFIRM=apply-repair TARGET=local UNDO=1
#   CONFIRM=apply-missing-effects TARGET=local UNDO=1
# Lo schema della fase 2 si annulla con supabase/rollback/20261021100000_apply_missing_prod_effects.sql
set -euo pipefail

CONFIRM="${CONFIRM:-}"
TARGET="${TARGET:-}"
UNDO="${UNDO:-0}"

# 62 versioni remote <= 20260514115842: schema coperto da db/init, non da questi file.
REVERT_BASELINE=(
  20251126142631 20251126142936 20251126145449 20251126150227
  20251127111612 20251127112045 20251127131515 20251127131918
  20251127133006 20251127133051 20251127152741 20251127152912
  20251127154301 20251127154450 20251127154601 20251127175356
  20251127175437 20251203100606 20251203100808 20251203110354
  20251203110936 20251203111743 20251203113431 20251203135558
  20251209181737 20251216103009 20251216142809 20251223144218
  20251223144232 20251223144258 20260127103108 20260127111602
  20260127113222 20260127114902 20260211120820 20260211153221
  20260211153247 20260211181756 20260211234407 20260224123629
  20260224125015 20260311131139 20260311141016 20260311141024
  20260311141249 20260311141258 20260311152729 20260326155136
  20260326160023 20260430124727 20260504130856 20260512001049
  20260512001117 20260512002744 20260514094735 20260514103528
  20260514103539 20260514103554 20260514104652 20260514115713
  20260514115821 20260514115842
)

# 11 versioni remote il cui SQL è nel file locale combinato, che va marcato applied.
REVERT_COVERED_BY_LOCAL=(
  20261012164953 20261012165246 20261012165545 20261012165706
  20261012170022 20261012170327
  20261012170614 20261012170622 20261012170648 20261012170815
  20261012170844
)

# File locali il cui effetto è già in produzione. Non rieseguire lo SQL.
# I tre in coda sono PRESENT alla verifica read-only del 2026-10-21.
APPLY_LOCAL=(
  20260608120100 20260608120200 20260608120300 20260608120400
  20260608120500 20260608120600 20260619100000
  20260623170000 20260624142500 20260624145500 20260624161000
  20261002160000 20261007160000
  20261012100000 20261012100100 20261012100200 20261012100300
  20261012100400
  20260623173000
  20260623180500
  20260630125200
)

# MISSING o PARTIAL il 2026-10-21. Si marcano applied solo DOPO
# 20261021100000_apply_missing_prod_effects.sql. Un db push lancerebbe
# prima questi sei file vecchi.
APPLY_AFTER_EFFECTS=(
  20260608120000
  20260623140000
  20260626170400
  20260623220000
  20260811183000
  20260911160000
  20261021100000
)
EFFECTS_FILE="supabase/migrations/20261021100000_apply_missing_prod_effects.sql"

flag_for_target() {
  case "$TARGET" in
    local) printf '%s' '--local' ;;
    linked) printf '%s' '--linked' ;;
    *)
      echo "TARGET deve essere local o linked" >&2
      exit 2
      ;;
  esac
}

print_repairs() {
  local status="$1"
  shift
  local version status_out target_suffix=""
  if [[ -n "$TARGET" ]]; then
    target_suffix=" $(flag_for_target)"
  fi
  for version in "$@"; do
    if [[ "$UNDO" == "1" ]]; then
      if [[ "$status" == "reverted" ]]; then
        status_out="applied"
      else
        status_out="reverted"
      fi
    else
      status_out="$status"
    fi
    printf 'supabase migration repair --status %s %s --yes%s\n' "$status_out" "$version" "$target_suffix"
  done
}

echo "migration repair plan (dry-run se CONFIRM non è apply-repair)"
echo "UNDO=${UNDO}"
echo
echo "ATTENZIONE: non usare supabase db push per gli effetti mancanti."
echo "I sei file vecchi (20260608120000, 20260623140000, 20260626170400,"
echo "20260623220000, 20260811183000, 20260911160000) hanno timestamp"
echo "precedente a 20261021100000: un push li eseguirebbe prima e"
echo "riscriverebbe build_match_key_strict, la policy campaign_jobs e"
echo "get_dashboard_metrics con corpi superati."
echo "Ordine: repair della storia già in prod, poi SOLO ${EFFECTS_FILE},"
echo "poi repair applied di quei sei più 20261021100000."
echo
echo "# pre-check"
echo "supabase migration list"
echo "# poi le query in supabase/scripts/migration_repair_plan.md"
echo
echo "# fase 1 — reverted: baseline ${#REVERT_BASELINE[@]} + coperti da file locale ${#REVERT_COVERED_BY_LOCAL[@]}"
print_repairs reverted "${REVERT_BASELINE[@]}" "${REVERT_COVERED_BY_LOCAL[@]}"
echo
echo "# fase 1 — applied: ${#APPLY_LOCAL[@]} già in produzione (inclusi 3 PRESENT del 2026-10-21)"
print_repairs applied "${APPLY_LOCAL[@]}"
echo
query_flag=""
if [[ -n "$TARGET" ]]; then
  query_flag="$(flag_for_target)"
fi
echo "# fase 2 — applicare solo questo file, non db push:"
echo "#   supabase db query --yes ${query_flag} -f ${EFFECTS_FILE}"
echo "# fase 2 — dopo, applied dei 6 coperti + 20261021100000:"
print_repairs applied "${APPLY_AFTER_EFFECTS[@]}"
echo "# post-check: supabase migration list senza righe solo-locali"
echo "# CONFIRM=apply-repair esegue solo la fase 1."
echo "# CONFIRM=apply-missing-effects esegue la fase 2 (file singolo, poi i repair)."

if [[ "$CONFIRM" != "apply-repair" && "$CONFIRM" != "apply-missing-effects" ]]; then
  echo
  echo "Nessun comando eseguito."
  echo "Fase 1: CONFIRM=apply-repair TARGET=local|linked"
  echo "Fase 2: CONFIRM=apply-missing-effects TARGET=local|linked"
  exit 0
fi

target_flag="$(flag_for_target)"
if [[ "$target_flag" == "--linked" ]]; then
  echo "TARGET=linked: sto per modificare schema_migrations del progetto collegato." >&2
  echo "Controllo il ref locale, se presente." >&2
  if [[ -f supabase/.temp/project-ref ]]; then
    echo "project-ref=$(cat supabase/.temp/project-ref)" >&2
  fi
fi

run_one() {
  local status="$1"
  local version="$2"
  if [[ "$UNDO" == "1" ]]; then
    if [[ "$status" == "reverted" ]]; then
      status="applied"
    else
      status="reverted"
    fi
  fi
  supabase migration repair --status "$status" "$version" --yes "$target_flag"
}

if [[ "$CONFIRM" == "apply-repair" ]]; then
  for version in "${REVERT_BASELINE[@]}" "${REVERT_COVERED_BY_LOCAL[@]}"; do
    run_one reverted "$version"
  done
  for version in "${APPLY_LOCAL[@]}"; do
    run_one applied "$version"
  done
  echo "Fase 1 fatta. La fase 2 non è partita: prima il solo ${EFFECTS_FILE}, poi CONFIRM=apply-missing-effects."
  echo "supabase migration list ${target_flag}"
  exit 0
fi

if [[ "$UNDO" == "1" ]]; then
  echo "UNDO fase 2: marco reverted i sette timestamp. Non rieseguo SQL." >&2
  echo "Per lo schema usa supabase/rollback/20261021100000_apply_missing_prod_effects.sql" >&2
else
  echo "Fase 2: applico solo ${EFFECTS_FILE}, poi marco applied i sei file coperti e 20261021100000." >&2
  supabase db query --yes "$target_flag" -f "$EFFECTS_FILE"
fi
for version in "${APPLY_AFTER_EFFECTS[@]}"; do
  run_one applied "$version"
done
echo "Fase 2 fatta. Esegui: supabase migration list ${target_flag}"

#!/usr/bin/env python3
"""Deterministic offline simulator for SKY manual vs platform individuazione gap.

Scenarios (see docs/superpowers/specs/2026-08-03-sky-gap-closure-simulation-design.md):
  S0 — baseline: no miss recovered
  S1 — code fixes A+D (upper bound: opera+cast[+episodi] already present)
  S2 — S1 + selective B cast enrichment (opera exists, cast missing)
  S3 — S2 ceiling: C catalog gaps out of scope for "to close" denominator

Usage:
  python3 scripts/diagnostics/sky_gap_simulator.py \\
    --input /tmp/sky-compare/classified.json \\
    --output /tmp/sky-compare/sim_report.json
"""

from __future__ import annotations

import argparse
import json
from dataclasses import asdict, dataclass
from enum import Enum
from pathlib import Path
from typing import Any, Iterable


MANUAL_TOTAL_ROWS = 17_495


class Scenario(str, Enum):
    S0 = "S0"
    S1 = "S1"
    S2 = "S2"
    S3 = "S3"


@dataclass(frozen=True)
class MissPair:
    titolo_raw: str
    artista: str
    anno: int | None
    rows: int
    bucket: str
    reason: str
    has_artist: bool
    opera_id: str | None
    n_episodi: int
    has_cast: bool
    canale: str | None = None
    episodio: str | None = None
    tipo: str | None = None

    @staticmethod
    def from_dict(d: dict[str, Any]) -> "MissPair":
        return MissPair(
            titolo_raw=d.get("titolo_raw") or "",
            artista=d.get("artista") or "",
            anno=d.get("anno"),
            rows=int(d.get("rows") or 0),
            bucket=str(d.get("bucket") or ""),
            reason=str(d.get("reason") or ""),
            has_artist=bool(d.get("has_artist")),
            opera_id=d.get("opera_id"),
            n_episodi=int(d.get("n_episodi") or 0),
            has_cast=bool(d.get("has_cast")),
            canale=d.get("canale"),
            episodio=d.get("episodio"),
            tipo=d.get("tipo"),
        )


@dataclass(frozen=True)
class RecoveryResult:
    recovered: bool
    out_of_scope: bool
    residual_reason: str


def classify_recovery(pair: MissPair, scenario: Scenario) -> RecoveryResult:
    """Deterministic recovery predicate for one miss pair under a scenario."""
    bucket = pair.bucket

    if scenario == Scenario.S3 and bucket == "C":
        return RecoveryResult(
            recovered=False,
            out_of_scope=True,
            residual_reason="catalogo_fuori_scope",
        )

    if scenario == Scenario.S0:
        return RecoveryResult(False, False, f"baseline_{bucket}")

    # S1 / S2 / S3 share A+D code-fix upper bound
    if bucket == "A":
        ok = (
            pair.has_artist
            and pair.opera_id is not None
            and pair.has_cast
            and pair.n_episodi > 0
        )
        if ok:
            return RecoveryResult(True, False, "")
        return RecoveryResult(False, False, "a_precondizioni_mancanti")

    if bucket == "D":
        ok = pair.has_artist and pair.opera_id is not None and pair.has_cast
        if ok:
            return RecoveryResult(True, False, "")
        return RecoveryResult(False, False, "d_precondizioni_mancanti")

    if bucket == "B":
        if scenario in (Scenario.S2, Scenario.S3):
            if pair.opera_id is not None and pair.has_artist:
                return RecoveryResult(True, False, "")
            return RecoveryResult(False, False, "b_opera_assente")
        return RecoveryResult(False, False, "cast_assente")

    if bucket == "C":
        return RecoveryResult(False, False, pair.reason or "catalogo_assente")

    return RecoveryResult(False, False, f"bucket_sconosciuto_{bucket}")


def aggregate_scenario(
    pairs: Iterable[MissPair],
    scenario: Scenario,
    *,
    manual_total_rows: int = MANUAL_TOTAL_ROWS,
) -> dict[str, Any]:
    pairs_list = list(pairs)
    miss_pairs = len(pairs_list)
    miss_rows = sum(p.rows for p in pairs_list)

    recovered_pairs = 0
    recovered_rows = 0
    residual_pairs = 0
    residual_rows = 0
    out_of_scope_pairs = 0
    out_of_scope_rows = 0
    by_bucket: dict[str, dict[str, int]] = {}
    residual_reasons: dict[str, dict[str, int]] = {}
    residuals: list[dict[str, Any]] = []

    for p in pairs_list:
        r = classify_recovery(p, scenario)
        bstat = by_bucket.setdefault(
            p.bucket, {"pairs": 0, "rows": 0, "recovered_pairs": 0, "recovered_rows": 0}
        )
        bstat["pairs"] += 1
        bstat["rows"] += p.rows

        if r.out_of_scope:
            out_of_scope_pairs += 1
            out_of_scope_rows += p.rows
            continue

        if r.recovered:
            recovered_pairs += 1
            recovered_rows += p.rows
            bstat["recovered_pairs"] += 1
            bstat["recovered_rows"] += p.rows
        else:
            residual_pairs += 1
            residual_rows += p.rows
            rr = residual_reasons.setdefault(
                r.residual_reason, {"pairs": 0, "rows": 0}
            )
            rr["pairs"] += 1
            rr["rows"] += p.rows
            residuals.append(
                {
                    "titolo_raw": p.titolo_raw,
                    "artista": p.artista,
                    "anno": p.anno,
                    "rows": p.rows,
                    "bucket": p.bucket,
                    "residual_reason": r.residual_reason,
                    "canale": p.canale,
                }
            )

    in_scope_pairs = miss_pairs - out_of_scope_pairs
    in_scope_rows = miss_rows - out_of_scope_rows

    def pct(n: float, d: float) -> float:
        return round(100.0 * n / d, 2) if d else 0.0

    return {
        "scenario": scenario.value,
        "miss_pairs": miss_pairs,
        "miss_rows": miss_rows,
        "in_scope_pairs": in_scope_pairs,
        "in_scope_rows": in_scope_rows,
        "out_of_scope_pairs": out_of_scope_pairs,
        "out_of_scope_rows": out_of_scope_rows,
        "recovered_pairs": recovered_pairs,
        "recovered_rows": recovered_rows,
        "residual_pairs": residual_pairs,
        "residual_rows": residual_rows,
        "recovered_pct_of_miss_rows": pct(recovered_rows, miss_rows),
        "recovered_pct_of_in_scope_rows": pct(recovered_rows, in_scope_rows),
        "recovered_pct_of_manual_rows": pct(recovered_rows, manual_total_rows),
        # After recovery, platform coverage upper bound vs full manual:
        # existing hits are outside this miss set; caller may add baseline hits.
        "by_bucket": by_bucket,
        "residual_reasons": residual_reasons,
        "residuals_top": sorted(residuals, key=lambda x: -x["rows"])[:25],
    }


def run_scenarios(
    pairs: Iterable[MissPair],
    *,
    manual_total_rows: int = MANUAL_TOTAL_ROWS,
) -> dict[str, dict[str, Any]]:
    pairs_list = list(pairs)
    return {
        s.value: aggregate_scenario(
            pairs_list, s, manual_total_rows=manual_total_rows
        )
        for s in (Scenario.S0, Scenario.S1, Scenario.S2, Scenario.S3)
    }


def load_classified(path: Path) -> list[MissPair]:
    raw = json.loads(path.read_text())
    if not isinstance(raw, list):
        raise ValueError(f"Expected list in {path}")
    return [MissPair.from_dict(d) for d in raw]


def build_report(
    pairs: list[MissPair],
    *,
    manual_total_rows: int = MANUAL_TOTAL_ROWS,
    baseline_hit_rows: int = 2_523,
    baseline_hit_pairs: int = 127,
) -> dict[str, Any]:
    """Full report including projected coverage after each scenario."""
    scenarios = run_scenarios(pairs, manual_total_rows=manual_total_rows)
    miss_rows = sum(p.rows for p in pairs)
    miss_pairs = len(pairs)

    projections = {}
    for name, s in scenarios.items():
        covered_rows = baseline_hit_rows + s["recovered_rows"]
        covered_pairs = baseline_hit_pairs + s["recovered_pairs"]
        total_pairs_est = baseline_hit_pairs + miss_pairs
        projections[name] = {
            "covered_rows": covered_rows,
            "covered_pairs": covered_pairs,
            "row_coverage_pct_manual": round(
                100.0 * covered_rows / manual_total_rows, 2
            ),
            "pair_coverage_pct_est": round(
                100.0 * covered_pairs / total_pairs_est, 2
            ),
            "gap_rows_remaining_in_scope": s["residual_rows"],
            "gap_rows_out_of_scope": s["out_of_scope_rows"],
        }

    return {
        "meta": {
            "manual_total_rows": manual_total_rows,
            "miss_pairs": miss_pairs,
            "miss_rows": miss_rows,
            "baseline_hit_rows": baseline_hit_rows,
            "baseline_hit_pairs": baseline_hit_pairs,
            "note": (
                "S1/S2/S3 recovered counts are UPPER BOUNDS assuming matcher/data "
                "fixes succeed whenever catalog preconditions already hold."
            ),
        },
        "scenarios": scenarios,
        "projections": projections,
        "recommendation": [
            "1. Codice D (film dual-key/normalize/year) — max righe tecnico",
            "2. Codice A (episodio fallback + strip stagione)",
            "3. Dati B selettivo (partecipazioni dove diritti)",
            "4. C fuori scope salvo decisione collecting",
        ],
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--input",
        type=Path,
        default=Path("/tmp/sky-compare/classified.json"),
        help="Path to classified miss pairs JSON",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("/tmp/sky-compare/sim_report.json"),
        help="Write full JSON report here",
    )
    parser.add_argument(
        "--fixture-copy",
        type=Path,
        default=None,
        help="Optional path to copy a slim fixture of classified pairs",
    )
    args = parser.parse_args()

    pairs = load_classified(args.input)
    report = build_report(pairs)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n")

    if args.fixture_copy:
        slim = [asdict(p) for p in pairs]
        args.fixture_copy.parent.mkdir(parents=True, exist_ok=True)
        args.fixture_copy.write_text(
            json.dumps(slim, indent=2, ensure_ascii=False) + "\n"
        )

    # Human summary to stdout
    print(f"Loaded {len(pairs)} miss pairs from {args.input}")
    print(f"Wrote {args.output}")
    for name in ("S0", "S1", "S2", "S3"):
        s = report["scenarios"][name]
        p = report["projections"][name]
        print(
            f"{name}: recovered {s['recovered_rows']} rows "
            f"({s['recovered_pct_of_miss_rows']}% miss) → "
            f"coverage {p['row_coverage_pct_manual']}% manual; "
            f"residual in-scope {s['residual_rows']}; "
            f"out-of-scope {s['out_of_scope_rows']}"
        )


if __name__ == "__main__":
    main()

"""Tests for sky_gap_simulator — write first (TDD).

Run: python3 -m unittest scripts.diagnostics.test_sky_gap_simulator
or:  python3 -m unittest discover -s scripts/diagnostics -p 'test_sky_gap_simulator.py'
"""

from __future__ import annotations

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from sky_gap_simulator import (  # noqa: E402
    MANUAL_TOTAL_ROWS,
    MissPair,
    Scenario,
    aggregate_scenario,
    classify_recovery,
    run_scenarios,
)


def _pair(
    bucket: str,
    rows: int = 10,
    *,
    has_cast: bool = False,
    n_episodi: int = 0,
    has_artist: bool = True,
    opera_id: str | None = "op-1",
) -> MissPair:
    return MissPair(
        titolo_raw="T",
        artista="A",
        anno=2017,
        rows=rows,
        bucket=bucket,
        reason="test",
        has_artist=has_artist,
        opera_id=opera_id,
        n_episodi=n_episodi,
        has_cast=has_cast,
    )


class ClassifyRecoveryTests(unittest.TestCase):
    def test_s0_recovers_nothing(self):
        for bucket in ("A", "B", "C", "D"):
            p = _pair(bucket, has_cast=True, n_episodi=5)
            self.assertFalse(classify_recovery(p, Scenario.S0).recovered)

    def test_s1_recovers_a_and_d_only(self):
        a = _pair("A", has_cast=True, n_episodi=5)
        d = _pair("D", has_cast=True)
        b = _pair("B", has_cast=False, opera_id="op-1")
        c = _pair("C", opera_id=None)
        self.assertTrue(classify_recovery(a, Scenario.S1).recovered)
        self.assertTrue(classify_recovery(d, Scenario.S1).recovered)
        self.assertFalse(classify_recovery(b, Scenario.S1).recovered)
        self.assertFalse(classify_recovery(c, Scenario.S1).recovered)

    def test_s1_a_requires_episodes_and_cast(self):
        no_ep = _pair("A", has_cast=True, n_episodi=0)
        no_cast = _pair("A", has_cast=False, n_episodi=5)
        self.assertFalse(classify_recovery(no_ep, Scenario.S1).recovered)
        self.assertFalse(classify_recovery(no_cast, Scenario.S1).recovered)

    def test_s1_d_requires_opera_and_cast(self):
        no_cast = _pair("D", has_cast=False)
        no_op = _pair("D", has_cast=True, opera_id=None)
        self.assertFalse(classify_recovery(no_cast, Scenario.S1).recovered)
        self.assertFalse(classify_recovery(no_op, Scenario.S1).recovered)

    def test_s2_recovers_b_when_opera_exists(self):
        b = _pair("B", has_cast=False, opera_id="op-1")
        b_no_op = _pair("B", has_cast=False, opera_id=None)
        self.assertTrue(classify_recovery(b, Scenario.S2).recovered)
        self.assertFalse(classify_recovery(b_no_op, Scenario.S2).recovered)

    def test_s3_same_recovery_as_s2_but_marks_c_out_of_scope(self):
        c = _pair("C", rows=100, opera_id=None)
        r2 = classify_recovery(c, Scenario.S2)
        r3 = classify_recovery(c, Scenario.S3)
        self.assertFalse(r2.recovered)
        self.assertFalse(r3.recovered)
        self.assertFalse(r2.out_of_scope)
        self.assertTrue(r3.out_of_scope)


class AggregateScenarioTests(unittest.TestCase):
    def test_s1_upper_bound_counts(self):
        pairs = [
            _pair("A", 100, has_cast=True, n_episodi=10),
            _pair("D", 200, has_cast=True),
            _pair("B", 50, has_cast=False),
            _pair("C", 25, opera_id=None),
        ]
        summary = aggregate_scenario(pairs, Scenario.S1, manual_total_rows=MANUAL_TOTAL_ROWS)
        self.assertEqual(summary["recovered_pairs"], 2)
        self.assertEqual(summary["recovered_rows"], 300)
        self.assertEqual(summary["residual_pairs"], 2)
        self.assertEqual(summary["residual_rows"], 75)
        self.assertEqual(summary["in_scope_rows"], 375)
        self.assertAlmostEqual(summary["recovered_pct_of_miss_rows"], 100 * 300 / 375, places=2)

    def test_s3_excludes_c_from_in_scope_denominator(self):
        pairs = [
            _pair("A", 100, has_cast=True, n_episodi=10),
            _pair("B", 50, has_cast=False),
            _pair("C", 25, opera_id=None),
        ]
        s2 = aggregate_scenario(pairs, Scenario.S2, manual_total_rows=MANUAL_TOTAL_ROWS)
        s3 = aggregate_scenario(pairs, Scenario.S3, manual_total_rows=MANUAL_TOTAL_ROWS)
        self.assertEqual(s2["recovered_rows"], 150)
        self.assertEqual(s3["recovered_rows"], 150)
        self.assertEqual(s2["in_scope_rows"], 175)
        self.assertEqual(s3["in_scope_rows"], 150)
        self.assertEqual(s3["out_of_scope_rows"], 25)
        self.assertAlmostEqual(s3["recovered_pct_of_in_scope_rows"], 100.0, places=2)

    def test_run_scenarios_deterministic(self):
        pairs = [
            _pair("A", 10, has_cast=True, n_episodi=2),
            _pair("D", 20, has_cast=True),
            _pair("B", 5, has_cast=False),
            _pair("C", 3, opera_id=None),
        ]
        a = run_scenarios(pairs)
        b = run_scenarios(pairs)
        self.assertEqual(a, b)
        self.assertEqual(set(a.keys()), {"S0", "S1", "S2", "S3"})
        self.assertEqual(a["S0"]["recovered_rows"], 0)
        self.assertEqual(a["S1"]["recovered_rows"], 30)
        self.assertEqual(a["S2"]["recovered_rows"], 35)


if __name__ == "__main__":
    unittest.main()

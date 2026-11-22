#!/usr/bin/env python3
"""
Phase 2 results recovery -- independent recomputation script.

Reads ONLY the already-persisted pilot artifacts (does not re-run any
simulation). Recomputes, from the raw world-level arrays:
  - Track B K(T) descriptive stats (world-level mean/sd/n) per family x condition
  - Paired world-level differences (C2-C0, C2-C3) with paired t-test
  - Track A log loss / MAE (8C-Pilot) and Brier / RMSE (three-metric pilot)
    descriptive stats and paired world-level differences (det-a vs bkt-fit)
  - QTM attainment counts/denominators from the three-metric pilot's
    qtmRowsByWorld_* arrays (each row has a `censored` flag and, if
    attained, a `qtm` step count)

Does NOT fabricate anything: a value that cannot be computed from the
JSON as stored is reported as None / "NOT AVAILABLE".

Usage: python3 recompute_metrics.py
Run from the repository root with CWD = non-adaptive-tutor.
"""
import json
import math
import statistics as st
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]

PILOT = json.load(open(ROOT / "research-output/phase8/pilot/pilot-report.json"))
TMPILOT = json.load(open(ROOT / "research-output/phase8/pilot/three-metric-pilot-report.json"))


def paired_t(a, b):
    diffs = [x - y for x, y in zip(a, b)]
    n = len(diffs)
    if n < 2:
        return {"n": n, "mean_diff": None, "sd_diff": None, "t": None, "df": None, "p": None}
    mean_d = st.mean(diffs)
    sd_d = st.stdev(diffs)
    if sd_d == 0:
        return {"n": n, "mean_diff": mean_d, "sd_diff": 0.0, "t": None, "df": n - 1, "p": None}
    se = sd_d / math.sqrt(n)
    t = mean_d / se
    df = n - 1
    # two-sided p-value via incomplete beta is overkill; use a normal-tail
    # approximation ONLY for df=4 we hardcode the exact t table value used
    # elsewhere in this repo (T_CRIT_975_DF4 = 2.776) for comparability,
    # and report |t| vs that critical value rather than inventing a p-value
    # computation this script doesn't have a stats library for.
    return {"n": n, "mean_diff": mean_d, "sd_diff": sd_d, "t": t, "df": df,
            "abs_t_exceeds_crit_975_df4": (abs(t) > 2.776) if df == 4 else None}


def desc(values):
    if not values:
        return {"n": 0, "mean": None, "sd": None}
    n = len(values)
    return {"n": n, "mean": st.mean(values), "sd": st.stdev(values) if n > 1 else 0.0, "values": values}


print("=" * 80)
print("TRACK B K(T) -- 8C-Pilot (pilot-report.json), world-level, n=5 worlds/family")
print("=" * 80)
for family, data in PILOT["trackB"]["perFamilyConfig"].items():
    c0, c2, c3 = data["kT_C0"], data["kT_C2"], data["kT_C3"]
    print(f"\n-- {family} --")
    print("C0:", desc(c0))
    print("C2:", desc(c2))
    print("C3:", desc(c3))
    print("paired C2-C0:", paired_t(c2, c0))
    print("paired C2-C3:", paired_t(c2, c3))
    print("activationRateC2:", data["activationRateC2"], "failureCount:", data["failureCount"])

print()
print("=" * 80)
print("TRACK A log loss / MAE -- 8C-Pilot, det-a vs bkt-fit, world-level n=5")
print("=" * 80)
for family, data in PILOT["trackA"]["perFamily"].items():
    print(f"\n-- {family} --")
    print("detA logLoss:", desc(data["detALogLossByWorld"]))
    print("bktFit logLoss:", desc(data["bktFitLogLossByWorld"]))
    print("paired detA-bktFit (logLoss):", paired_t(data["detALogLossByWorld"], data["bktFitLogLossByWorld"]))
    print("detA MAE:", desc(data["detAMaeByWorld"]))
    print("bktFit MAE:", desc(data["bktFitMaeByWorld"]))
    print("paired detA-bktFit (MAE):", paired_t(data["detAMaeByWorld"], data["bktFitMaeByWorld"]))
print("\nNOTE: det-b (Variant B) Track A metrics are NOT present in this report's")
print("schema at all (trackA.perFamily only has detA*/bktFit* keys) -- see")
print("src/research/phase8/pipeline/pilot.ts lines ~114-118, which filters")
print("result.learnerMetrics for estimator==='det-a' only and discards any")
print("'det-b' rows runTrackA() also computed in the same call. UNRECOVERABLE")
print("from this artifact; would require replaying the same (seed, slice, world)")
print("tuples through runTrackA() again and reading result.learnerMetrics")
print("filtered on estimator==='det-b' -- a deterministic reproduction, not a")
print("new experiment, since runTrackA is a pure function of its inputs.")

print()
print("=" * 80)
print("TRACK A Brier / RMSE -- three-metric pilot, det-a vs bkt-fit, world-level n=5")
print("=" * 80)
for family, data in TMPILOT["trackA"]["perFamily"].items():
    print(f"\n-- {family} --")
    print("detA Brier:", desc(data["detABrierByWorld"]))
    print("bktFit Brier:", desc(data["bktFitBrierByWorld"]))
    print("paired detA-bktFit (Brier):", paired_t(data["detABrierByWorld"], data["bktFitBrierByWorld"]))
    print("detA RMSE:", desc(data["detARmseByWorld"]))
    print("bktFit RMSE:", desc(data["bktFitRmseByWorld"]))
    print("paired detA-bktFit (RMSE):", paired_t(data["detARmseByWorld"], data["bktFitRmseByWorld"]))

print()
print("=" * 80)
print("TRACK B QTM / censoring -- three-metric pilot, per family x condition x world")
print("=" * 80)
for family, data in TMPILOT["trackB"]["perFamilyConfig"].items():
    print(f"\n-- {family} --")
    for cond in ("C0", "C2", "C3"):
        key = f"qtmRowsByWorld_{cond}"
        rows_by_world = data[key]
        total_n = sum(len(w) for w in rows_by_world)
        attained = sum(1 for w in rows_by_world for r in w if not r.get("censored"))
        censored = total_n - attained
        attained_itc = [r["itemsToCriterion"] for w in rows_by_world for r in w if not r.get("censored") and r.get("itemsToCriterion") is not None]
        budget = rows_by_world[0][0]["budget"] if rows_by_world and rows_by_world[0] else 60
        restricted_mean = (sum((r["itemsToCriterion"] if not r.get("censored") else budget) for w in rows_by_world for r in w) / total_n) if total_n else None
        print(f"  {cond}: n_total={total_n} attained={attained} censored={censored} "
              f"attainment_rate={(attained/total_n) if total_n else None} "
              f"restricted_mean(censored->budget={budget})={restricted_mean:.4f}" if total_n else f"  {cond}: n_total=0")
        # per-world attainment breakdown (world-level unit of inference)
        per_world_attain = [sum(1 for r in w if not r.get("censored")) for w in rows_by_world]
        per_world_n = [len(w) for w in rows_by_world]
        print(f"       per-world attained counts: {per_world_attain} / n_per_world={per_world_n}")
        if attained_itc:
            print(f"       conditional mean itemsToCriterion among ATTAINED only = {st.mean(attained_itc):.4f} (n={len(attained_itc)}) -- NOT an unconditional efficiency measure")

print()
print("DONE. All numbers above are recomputed directly from the stored JSON arrays")
print("in research-output/phase8/pilot/*.json -- no simulation was re-run by this script.")

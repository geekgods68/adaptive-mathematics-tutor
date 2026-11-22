#!/usr/bin/env python3
"""Exports the recomputed tables from recompute_metrics.py's source data to CSV.
Reads only stored artifacts (research-output/phase8/pilot/*.json); writes only
into ../appendix_tables/. Run from repository root."""
import csv
import json
import statistics as st
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
OUT = Path(__file__).resolve().parents[1] / "appendix_tables"
OUT.mkdir(exist_ok=True)

PILOT = json.load(open(ROOT / "research-output/phase8/pilot/pilot-report.json"))
TMPILOT = json.load(open(ROOT / "research-output/phase8/pilot/three-metric-pilot-report.json"))


def w(name, header, rows):
    with open(OUT / name, "w", newline="") as f:
        cw = csv.writer(f)
        cw.writerow(header)
        cw.writerows(rows)
    print(f"wrote {OUT / name} ({len(rows)} rows)")


# Table E: K(T) by family x condition (8C-Pilot, world-level, n=5 worlds)
rows = []
for family, data in PILOT["trackB"]["perFamilyConfig"].items():
    for cond in ("C0", "C2", "C3"):
        vals = data[f"kT_{cond}"]
        mean = st.mean(vals)
        sd = st.stdev(vals) if len(vals) > 1 else 0.0
        for world_idx, v in enumerate(vals, start=1):
            rows.append([family, cond, world_idx, v, mean, sd, len(vals)])
w("table_E_kT_by_family_condition_world.csv",
  ["family", "condition", "world", "kT_world_mean", "kT_family_cond_mean", "kT_family_cond_sd", "n_worlds"], rows)

# Table F part 1: pairwise K(T) differences C2-C0, C2-C3 per family (world-level paired)
rows = []
for family, data in PILOT["trackB"]["perFamilyConfig"].items():
    c0, c2, c3 = data["kT_C0"], data["kT_C2"], data["kT_C3"]
    for world_idx in range(len(c0)):
        rows.append([family, world_idx + 1, c2[world_idx] - c0[world_idx], c2[world_idx] - c3[world_idx]])
w("table_F_kT_paired_world_differences.csv",
  ["family", "world", "diff_C2_minus_C0", "diff_C2_minus_C3"], rows)

# Table D: Track A estimator performance (det-a vs bkt-fit), log loss / MAE (8C-Pilot) + Brier/RMSE (three-metric pilot)
rows = []
for family, data in PILOT["trackA"]["perFamily"].items():
    for world_idx in range(len(data["detALogLossByWorld"])):
        rows.append([family, "det-a", world_idx + 1, "logLoss", data["detALogLossByWorld"][world_idx]])
        rows.append([family, "bkt-fit", world_idx + 1, "logLoss", data["bktFitLogLossByWorld"][world_idx]])
        rows.append([family, "det-a", world_idx + 1, "MAE", data["detAMaeByWorld"][world_idx]])
        rows.append([family, "bkt-fit", world_idx + 1, "MAE", data["bktFitMaeByWorld"][world_idx]])
for family, data in TMPILOT["trackA"]["perFamily"].items():
    for world_idx in range(len(data["detABrierByWorld"])):
        rows.append([family, "det-a", world_idx + 1, "Brier", data["detABrierByWorld"][world_idx]])
        rows.append([family, "bkt-fit", world_idx + 1, "Brier", data["bktFitBrierByWorld"][world_idx]])
        rows.append([family, "det-a", world_idx + 1, "RMSE", data["detARmseByWorld"][world_idx]])
        rows.append([family, "bkt-fit", world_idx + 1, "RMSE", data["bktFitRmseByWorld"][world_idx]])
w("table_D_trackA_estimator_metrics_by_world.csv",
  ["family", "estimator", "world", "metric", "value"], rows)
print("NOTE: det-b (Variant B) rows are absent from this table -- not present in either stored pilot report (see 01_RESULTS_AND_ANALYSIS.md Part 1 Step 6).")

# QTM / censoring (three-metric pilot) -- per family x condition x world counts, and pooled attainment
rows = []
for family, data in TMPILOT["trackB"]["perFamilyConfig"].items():
    for cond in ("C0", "C2", "C3"):
        rows_by_world = data[f"qtmRowsByWorld_{cond}"]
        for world_idx, world_rows in enumerate(rows_by_world, start=1):
            n = len(world_rows)
            attained = sum(1 for r in world_rows if not r.get("censored"))
            censored = n - attained
            itc_attained = [r["itemsToCriterion"] for r in world_rows if not r.get("censored") and r.get("itemsToCriterion") is not None]
            mean_itc = st.mean(itc_attained) if itc_attained else None
            budget = world_rows[0]["budget"] if world_rows else 60
            restricted_mean = sum((r["itemsToCriterion"] if not r.get("censored") else budget) for r in world_rows) / n if n else None
            rows.append([family, cond, world_idx, n, attained, censored, attained / n if n else None, mean_itc, restricted_mean, budget])
w("table_G_qtm_censoring_by_family_condition_world.csv",
  ["family", "condition", "world", "n_learners", "attained", "censored", "attainment_rate",
   "conditional_mean_itemsToCriterion_among_attained", "restricted_mean_itemsToCriterion", "budget"], rows)

print("All exports written to", OUT)

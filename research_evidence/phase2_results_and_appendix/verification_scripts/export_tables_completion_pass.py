#!/usr/bin/env python3
"""Completion-pass CSV exports: C1 retrospective K(T)/QTM tables, det-B replay table,
and the question-allocation diagnostics summary. Reads only stored/retrospective
artifacts; writes only into appendix_tables/. Run from repository root."""
import csv
import glob
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
OUT = Path(__file__).resolve().parents[1] / "appendix_tables"
RETRO = Path(__file__).resolve().parents[1] / "retrospective_artifacts"
OUT.mkdir(exist_ok=True)


def w(name, header, rows):
    with open(OUT / name, "w", newline="") as f:
        cw = csv.writer(f)
        cw.writerow(header)
        cw.writerows(rows)
    print(f"wrote {OUT / name} ({len(rows)} rows)")


c1 = json.load(open(sorted(glob.glob(str(RETRO / "c1_trackB_retrospective_*.json")))[-1]))

# Table C1-A: K(T) by family x world (C1, retrospective)
rows = []
for family, data in c1["perFamilyConfig"].items():
    for world_idx, v in enumerate(data["kT_C1"], start=1):
        rows.append([family, "C1", world_idx, v, "RETROSPECTIVE_EXPLORATORY_NOT_CONFIRMATORY"])
w("table_C1_kT_by_family_world.csv", ["family", "condition", "world", "kT_world_mean", "label"], rows)

# Table C1-B: QTM/censoring by family x world (C1, retrospective)
rows = []
for family, data in c1["perFamilyConfig"].items():
    for world_idx, world_rows in enumerate(data["qtmRowsByWorld_C1"], start=1):
        n = len(world_rows)
        attained = sum(1 for r in world_rows if not r["censored"])
        rows.append([family, "C1", world_idx, n, attained, n - attained, attained / n if n else None,
                     "RETROSPECTIVE_EXPLORATORY_NOT_CONFIRMATORY"])
w("table_C1_qtm_by_family_world.csv",
  ["family", "condition", "world", "n_learners", "attained", "censored", "attainment_rate", "label"], rows)

detb_files = sorted(glob.glob(str(RETRO / "detB_trackA_replay_*.json")))
if detb_files:
    DETB = json.load(open(detb_files[-1]))
    rows = []
    for family, data in DETB["perFamily"].items():
        for est in ("det-a", "det-b", "bkt-fit"):
            d = data[est]
            for world_idx in range(len(d["meanLogLoss"])):
                rows.append([family, est, world_idx + 1, "logLoss", d["meanLogLoss"][world_idx]])
                rows.append([family, est, world_idx + 1, "Brier", d["meanBrier"][world_idx]])
                rows.append([family, est, world_idx + 1, "MAE", d["maeLatent"][world_idx]])
    w("table_detB_trackA_metrics_by_world.csv", ["family", "estimator", "world", "metric", "value"], rows)

diag_files = sorted(glob.glob(str(RETRO / "diagnostics_replay_*.json")))
if diag_files:
    DIAG = json.load(open(diag_files[-1]))
    rows = []
    for family, conds in DIAG["summary"].items():
        for cond, s in conds.items():
            rows.append([
                family, cond, s["n"], s["meanDivertedShare"], s["meanBacktrackPrecision"],
                s["meanCoverageFraction"], s["neverFullyCoveredCount"],
                json.dumps(s["reasonTotals"]), json.dumps(s["difficultyTotals"]),
                s["meanDifficultyChangeAfterCorrect"], s["meanDifficultyChangeAfterIncorrect"],
                s["attainedCount"], s["censoredCount"],
                s["meanDivertedShare_attained"], s["meanDivertedShare_censored"],
                s["meanCoverageFraction_attained"], s["meanCoverageFraction_censored"],
                s["meanKT_attained"], s["meanKT_censored"],
            ])
    w("table_H_question_allocation_diagnostics.csv", [
        "family", "condition", "n", "mean_diverted_share", "mean_backtrack_precision",
        "mean_coverage_fraction", "never_fully_covered_count",
        "reason_totals_json", "difficulty_totals_json",
        "mean_difficulty_change_after_correct", "mean_difficulty_change_after_incorrect",
        "attained_count", "censored_count",
        "mean_diverted_share_attained", "mean_diverted_share_censored",
        "mean_coverage_attained", "mean_coverage_censored",
        "mean_kT_attained", "mean_kT_censored",
    ], rows)

print("Done.")

#!/usr/bin/env python3
"""Builds the required data/*.csv files for the Draft 5 Bucket B deliverable,
reading ONLY already-persisted artifacts (the two historical pilot reports
and this session's three retrospective-pass artifacts). Zero new simulation.
Run from repository root."""
import csv
import glob
import json
import statistics as st
from pathlib import Path

ROOT = Path(".").resolve()
OUT = ROOT / "research/evidence_recovery/draft5_bucket_b/data"
RETRO = ROOT / "research_evidence/phase2_results_and_appendix/retrospective_artifacts"
OUT.mkdir(parents=True, exist_ok=True)

PILOT = json.load(open(ROOT / "research-output/phase8/pilot/pilot-report.json"))
TMPILOT = json.load(open(ROOT / "research-output/phase8/pilot/three-metric-pilot-report.json"))
C1 = json.load(open(sorted(glob.glob(str(RETRO / "c1_trackB_retrospective_*.json")))[-1]))
DETB = json.load(open(sorted(glob.glob(str(RETRO / "detB_trackA_replay_*.json")))[-1]))
DIAG = json.load(open(sorted(glob.glob(str(RETRO / "diagnostics_replay_*.json")))[-1]))


def mean(v):
    return sum(v) / len(v) if v else None


def w(name, header, rows):
    with open(OUT / name, "w", newline="") as f:
        cw = csv.writer(f)
        cw.writerow(header)
        cw.writerows(rows)
    print(f"wrote {OUT/name} ({len(rows)} rows)")


# ---- track_a_recovered.csv ----
rows = []
for family, d in PILOT["trackA"]["perFamily"].items():
    for i in range(5):
        rows.append([family, "det-a", i + 1, "logLoss", d["detALogLossByWorld"][i], "HISTORICAL-8C-PILOT-2026-10-27"])
        rows.append([family, "bkt-fit", i + 1, "logLoss", d["bktFitLogLossByWorld"][i], "HISTORICAL-8C-PILOT-2026-10-27"])
        rows.append([family, "det-a", i + 1, "MAE", d["detAMaeByWorld"][i], "HISTORICAL-8C-PILOT-2026-10-27"])
        rows.append([family, "bkt-fit", i + 1, "MAE", d["bktFitMaeByWorld"][i], "HISTORICAL-8C-PILOT-2026-10-27"])
for family, d in TMPILOT["trackA"]["perFamily"].items():
    for i in range(5):
        rows.append([family, "det-a", i + 1, "Brier", d["detABrierByWorld"][i], "HISTORICAL-THREE-METRIC-PILOT-2026-11-04"])
        rows.append([family, "bkt-fit", i + 1, "Brier", d["bktFitBrierByWorld"][i], "HISTORICAL-THREE-METRIC-PILOT-2026-11-04"])
        rows.append([family, "det-a", i + 1, "RMSE", d["detARmseByWorld"][i], "HISTORICAL-THREE-METRIC-PILOT-2026-11-04"])
        rows.append([family, "bkt-fit", i + 1, "RMSE", d["bktFitRmseByWorld"][i], "HISTORICAL-THREE-METRIC-PILOT-2026-11-04"])
for family, d in DETB["perFamily"].items():
    for i in range(5):
        rows.append([family, "det-b", i + 1, "logLoss", d["det-b"]["meanLogLoss"][i], "RETROSPECTIVE-DETERMINISTIC-REPLAY-2026-11-08"])
        rows.append([family, "det-b", i + 1, "Brier", d["det-b"]["meanBrier"][i], "RETROSPECTIVE-DETERMINISTIC-REPLAY-2026-11-08"])
        rows.append([family, "det-b", i + 1, "MAE", d["det-b"]["maeLatent"][i], "RETROSPECTIVE-DETERMINISTIC-REPLAY-2026-11-08"])
w("track_a_recovered.csv", ["family", "estimator", "world", "metric", "value", "provenance"], rows)

# ---- track_b_recovered.csv (K(T) world-level, C0/C1/C2/C3) ----
rows = []
for family, d in PILOT["trackB"]["perFamilyConfig"].items():
    for i in range(5):
        rows.append([family, "C0", i + 1, d["kT_C0"][i], "HISTORICAL-8C-PILOT-2026-10-27"])
        rows.append([family, "C2", i + 1, d["kT_C2"][i], "HISTORICAL-8C-PILOT-2026-10-27"])
        rows.append([family, "C3", i + 1, d["kT_C3"][i], "HISTORICAL-8C-PILOT-2026-10-27"])
for family, d in C1["perFamilyConfig"].items():
    for i in range(5):
        rows.append([family, "C1", i + 1, d["kT_C1"][i], "RETROSPECTIVE-EXPLORATORY-COMPLETION-2026-11-08-NOT-CONFIRMATORY"])
w("track_b_recovered.csv", ["family", "condition", "world", "kT_world_mean", "provenance"], rows)

# ---- world_level_results.csv (QTM attainment, all conditions, all families) ----
rows = []
for family, d in TMPILOT["trackB"]["perFamilyConfig"].items():
    for cond in ("C0", "C2", "C3"):
        rows_by_world = d[f"qtmRowsByWorld_{cond}"]
        for wi, wr in enumerate(rows_by_world, start=1):
            n = len(wr)
            att = sum(1 for r in wr if not r["censored"])
            rows.append([family, cond, wi, n, att, n - att, att / n if n else None, "HISTORICAL-THREE-METRIC-PILOT-2026-11-04"])
for family, d in C1["perFamilyConfig"].items():
    rows_by_world = d["qtmRowsByWorld_C1"]
    for wi, wr in enumerate(rows_by_world, start=1):
        n = len(wr)
        att = sum(1 for r in wr if not r["censored"])
        rows.append([family, "C1", wi, n, att, n - att, att / n if n else None, "RETROSPECTIVE-EXPLORATORY-COMPLETION-2026-11-08-NOT-CONFIRMATORY"])
w("world_level_results.csv", ["family", "condition", "world", "n_learners", "attained", "censored", "attainment_rate", "provenance"], rows)

# ---- ablation_results.csv (C2 vs C3 and C1 vs C2 paired world-level K(T) diffs) ----
rows = []
for family, d in PILOT["trackB"]["perFamilyConfig"].items():
    for i in range(5):
        rows.append([family, "C2_minus_C3", i + 1, d["kT_C2"][i] - d["kT_C3"][i], "HISTORICAL-8C-PILOT-2026-10-27"])
        rows.append([family, "C2_minus_C0", i + 1, d["kT_C2"][i] - d["kT_C0"][i], "HISTORICAL-8C-PILOT-2026-10-27"])
for family in C1["perFamilyConfig"]:
    kt_c1 = C1["perFamilyConfig"][family]["kT_C1"]
    kt_c2 = PILOT["trackB"]["perFamilyConfig"][family]["kT_C2"]
    for i in range(5):
        rows.append([family, "C1_minus_C2", i + 1, kt_c1[i] - kt_c2[i], "RETROSPECTIVE-EXPLORATORY-COMPLETION-2026-11-08-NOT-CONFIRMATORY"])
w("ablation_results.csv", ["family", "contrast", "world", "signed_diff", "provenance"], rows)

# ---- evidence_registry.csv (B01-B25 status summary; filled after report text is finalized -- placeholder structure populated below with the real statuses used in the report) ----
registry = [
    ["B01", "C0 non-adaptive sequencing mechanics", "VERIFIED-SOURCE", "src/research/phase8/trackB/c0Slice.ts"],
    ["B02", "Adaptive selector full decision logic + thresholds", "VERIFIED-SOURCE", "src/tutoring/selection/adaptive/{config,targeting,candidateSelection,adaptiveSelectionPolicy}.ts"],
    ["B03", "C2-vs-C3 single-mechanism ablation claim", "VERIFIED-SOURCE", "src/tutoring/selection/adaptive/targeting.ts;candidateSelection.ts;adaptiveSelectionPolicy.ts"],
    ["B04", "Multi-concept attribution weights", "VERIFIED-SOURCE", "src/domain/learner-model/updateMastery.ts;src/domain/questions/types.ts"],
    ["B05", "S1-S4 generative equations", "VERIFIED-SOURCE", "src/research/phase8/simulator/{s1,s2,s3,s4,shared}.ts"],
    ["B06", "S4-ref/GF/N/GW precise meaning + graph Jaccard", "RECOMPUTED-EXISTING", "data/b06_graph_comparison.csv"],
    ["B07", "S1/S3 mastery threshold; S2/S4 binary truth", "VERIFIED-SOURCE", "src/research/phase8/simulator/{s1,s2,s3,s4}.ts"],
    ["B08", "Pre-response prediction integrity (Track A)", "VERIFIED-SOURCE", "src/research/phase8/trackA/runTrackA.ts;tests/research/phase8/runTrackA.test.ts"],
    ["B09", "Pairing/seed/common-random-number design", "VERIFIED-SOURCE", "src/research/phase8/simulator/shared.ts;rng/derive.ts"],
    ["B10", "Outcome-construction trace (all 6 metrics)", "VERIFIED-SOURCE", "src/research/phase8/trackB/runTrackB.ts;metrics/threeMetrics.ts"],
    ["B11", "Full K(T), 6 families x 4 conditions", "RECOMPUTED-EXISTING", "data/track_b_recovered.csv"],
    ["B12", "Full Track A endpoints incl. det-B", "RECOMPUTED-EXISTING", "data/track_a_recovered.csv"],
    ["B13", "C1-vs-C2 numerical comparisons", "RECOMPUTED-EXISTING", "data/ablation_results.csv"],
    ["B14", "C2-vs-C3 numerical comparisons", "RECOMPUTED-EXISTING", "data/ablation_results.csv"],
    ["B15", "Manuscript attainment numbers vs artifacts", "VERIFIED-ARTIFACT", "data/world_level_results.csv"],
    ["B16", "Reproduce manuscript p-values (K(T), QTM)", "RECOMPUTED-EXISTING", "verification_scripts (Phase 2 pass) + this pass"],
    ["B17", "Full run-accounting decomposition", "VERIFIED-ARTIFACT", "data/run_accounting.csv"],
    ["B18", "Question-bank counts vs audit script", "VERIFIED-ARTIFACT", "npm run audit:rise-questions live output"],
    ["B19", "Architecture leakage claims", "VERIFIED-SOURCE", "src/tutoring/adaptiveSession/publicViews.ts"],
    ["B20", "Figures 2-4 plotted values", "PARTIALLY-VERIFIED", "research-output/phase8/final/figures/*.svg + stats json"],
    ["B21", "Tables 1-4 cell audit", "PARTIALLY-VERIFIED", "docs/COMPLETE_RESEARCH_PAPER_EVIDENCE_DOSSIER.md"],
    ["B22", "Pilot provenance consolidation", "VERIFIED-ARTIFACT", "git log; sha256 of pilot JSON; package.json"],
    ["B23", "6 discussion mechanisms classification", "PARTIALLY-VERIFIED", "retrospective diagnostics_replay artifact"],
    ["B24", "S1 negative-control structural guarantee", "VERIFIED-SOURCE", "src/research/phase8/simulator/s1.ts;config"],
    ["B25", "Literature/reference audit", "UNAVAILABLE", "no local bibliography; requires external verification"],
]
w("evidence_registry.csv", ["item_id", "topic", "status", "source"], registry)

print("All CSVs written.")

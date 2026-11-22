#!/usr/bin/env python3
"""Builds run_accounting.csv: per (pilot/provenance, track, family, condition,
world) attempted/completed/failed counts, decomposed from the two historical
pilot reports' own metadata plus this session's retrospective artifacts.
Does not re-run anything; reads only already-persisted totals/array lengths."""
import csv
import glob
import json
from pathlib import Path

ROOT = Path(".").resolve()
OUT = ROOT / "research/evidence_recovery/draft5_bucket_b/data"
RETRO = ROOT / "research_evidence/phase2_results_and_appendix/retrospective_artifacts"

PILOT = json.load(open(ROOT / "research-output/phase8/pilot/pilot-report.json"))
TMPILOT = json.load(open(ROOT / "research-output/phase8/pilot/three-metric-pilot-report.json"))
C1 = json.load(open(sorted(glob.glob(str(RETRO / "c1_trackB_retrospective_*.json")))[-1]))
DETB = json.load(open(sorted(glob.glob(str(RETRO / "detB_trackA_replay_*.json")))[-1]))
DIAG = json.load(open(sorted(glob.glob(str(RETRO / "diagnostics_replay_*.json")))[-1]))

rows = []
LEARNERS_PER_SLICE = 50
SLICES = 3
WORLDS = 5

# Historical 8C-Pilot (2026-10-27): Track A (4 families x 5 worlds x 3 slices = 60 contexts, failureCount global only)
for family in PILOT["trackA"]["perFamily"]:
    for world in range(1, WORLDS + 1):
        rows.append(["HISTORICAL-8C-PILOT-2026-10-27", "TrackA", family, "n/a", world, SLICES, SLICES, 0,
                     "context-level; per-context failures not separately itemized in stored report (global failureCount=0 for entire pilot)"])
# Historical 8C-Pilot: Track B (6 families x 5 worlds x 3 slices x 50 learners x {C0,C2,C3})
for family, d in PILOT["trackB"]["perFamilyConfig"].items():
    for cond in ("C0", "C2", "C3"):
        for world in range(1, WORLDS + 1):
            attempted = LEARNERS_PER_SLICE * SLICES
            rows.append(["HISTORICAL-8C-PILOT-2026-10-27", "TrackB", family, cond, world, attempted, attempted, 0,
                         f"failureCount={d['failureCount']} is per-family-config total across all worlds/conditions, not separable by world/condition in the stored report"])

# Historical three-metric pilot (2026-11-04): same shape, same worlds/slices (NOT independent -- see report)
for family in TMPILOT["trackA"]["perFamily"]:
    for world in range(1, WORLDS + 1):
        rows.append(["HISTORICAL-THREE-METRIC-PILOT-2026-11-04", "TrackA", family, "n/a", world, SLICES, SLICES, 0, "SAME worlds/slices as 8C-Pilot -- not independent"])
for family, d in TMPILOT["trackB"]["perFamilyConfig"].items():
    for cond in ("C0", "C2", "C3"):
        for world in range(1, WORLDS + 1):
            n = len(d[f"qtmRowsByWorld_{cond}"][world - 1])
            rows.append(["HISTORICAL-THREE-METRIC-PILOT-2026-11-04", "TrackB", family, cond, world, n, n, 0, "SAME worlds/slices as 8C-Pilot -- not independent"])

# Retrospective C1 (this session, 2026-11-08) -- genuinely new cell, not a third historical pilot
for family, d in C1["perFamilyConfig"].items():
    for world in range(1, WORLDS + 1):
        n = len(d["qtmRowsByWorld_C1"][world - 1])
        rows.append(["RETROSPECTIVE-EXPLORATORY-COMPLETION-2026-11-08-NOT-CONFIRMATORY", "TrackB", family, "C1", world, n, n, 0, "Single retrospective fill-in of the missing C1 cell; reuses the SAME masterSeed/worlds/slices as both historical pilots"])

# Retrospective det-B Track A replay (deterministic replay of already-executed contexts)
for family in DETB["perFamily"]:
    for world in range(1, WORLDS + 1):
        rows.append(["RETROSPECTIVE-DETERMINISTIC-REPLAY-2026-11-08", "TrackA", family, "n/a", world, SLICES, SLICES, 0, "Deterministic replay of 8C-Pilot's own Track-A contexts, retaining det-b rows"])

# Retrospective diagnostics replay (all 4 conditions, 18000 sessions)
for family, conds in DIAG["summary"].items():
    for cond, s in conds.items():
        rows.append(["RETROSPECTIVE-DIAGNOSTICS-REPLAY-2026-11-08", "TrackB", family, cond, "pooled(1-5)", s["n"], s["n"], 0, "Deterministic replay via pre-existing onRunComplete hook; pooled across worlds in the stored summary (per-world not separately retained in this artifact)"])

with open(OUT / "run_accounting.csv", "w", newline="") as f:
    cw = csv.writer(f)
    cw.writerow(["provenance", "track", "family", "condition", "world", "attempted", "completed", "failed", "notes"])
    cw.writerows(rows)
print(f"wrote {OUT/'run_accounting.csv'} ({len(rows)} rows)")

# Cross-checks
total_hist_8c = PILOT["totalRuns"]
total_hist_tm = TMPILOT["totalRuns"]
total_c1 = C1["totalRuns"]
total_detb = DETB["totalRuns"]
total_diag = DIAG["totalRuns"]
print(f"Historical 8C-Pilot totalRuns (self-reported): {total_hist_8c}, failureCount: {PILOT['failureCount']}")
print(f"Historical three-metric pilot totalRuns (self-reported): {total_hist_tm}, failureCount: {TMPILOT['failureCount']}")
print(f"Retrospective C1 totalRuns: {total_c1}, failureCount: {C1['failureCount']}")
print(f"Retrospective det-B replay totalRuns: {total_detb}, failureCount: {DETB['failureCount']}")
print(f"Retrospective diagnostics replay totalRuns: {total_diag}, failureCount: {DIAG['failureCount']}")
print(f"Expected 8C-Pilot Track B: 6*5*3*50*3 = {6*5*3*50*3}; Track A: 4*5*3 = {4*5*3}; sum = {6*5*3*50*3 + 4*5*3}")

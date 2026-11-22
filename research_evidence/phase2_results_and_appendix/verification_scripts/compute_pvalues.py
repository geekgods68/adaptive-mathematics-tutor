#!/usr/bin/env python3
"""
Exact two-sided p-values and 95% CIs for every world-level paired
comparison in this deliverable. df is always 4 (n=5 worlds, fixed
throughout the 8C-Pilot / three-metric pilot / all retrospective
replays in this pass), so the Student-t CDF for df=4 has a closed
form (derived and verified against this repo's own T_CRIT_975_DF4 =
2.776 constant -- see the derivation in verification_scripts/README
inline comment below) and no numerical integration or scipy
dependency is needed.

F(t; df=4) = 0.5 + (u/4)(3 - u^2),  u = t / sqrt(4 + t^2)

Reads only stored artifacts; writes only a CSV under appendix_tables/
and prints a table to stdout. Zero new simulation.
"""
import csv
import glob
import json
import math
import statistics as st
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
OUT = Path(__file__).resolve().parents[1] / "appendix_tables"
RETRO = Path(__file__).resolve().parents[1] / "retrospective_artifacts"

T_CRIT_975_DF4 = 2.776  # matches src/research/phase8/pipeline/pilot.ts's own constant


def t_cdf_df4(t: float) -> float:
    u = t / math.sqrt(4 + t * t)
    return 0.5 + (u / 4.0) * (3 - u * u)


def two_sided_p_df4(t: float) -> float:
    return 2.0 * (1.0 - t_cdf_df4(abs(t)))


def paired_stats(a, b, label_a, label_b, context):
    """a, b: length-5 world-level arrays (same world order)."""
    assert len(a) == len(b) == 5, f"{context}: expected 5 worlds, got {len(a)}/{len(b)}"
    diffs = [x - y for x, y in zip(a, b)]
    n = len(diffs)
    mean_d = st.mean(diffs)
    sd_d = st.stdev(diffs) if n > 1 else 0.0
    se_d = sd_d / math.sqrt(n) if n > 1 else 0.0
    if se_d == 0:
        t_stat, p, ci_lo, ci_hi = (float("nan") if mean_d != 0 else 0.0), (0.0 if mean_d != 0 else 1.0), mean_d, mean_d
    else:
        t_stat = mean_d / se_d
        p = two_sided_p_df4(t_stat)
        ci_lo = mean_d - T_CRIT_975_DF4 * se_d
        ci_hi = mean_d + T_CRIT_975_DF4 * se_d
    return {
        "context": context, "a_label": label_a, "b_label": label_b, "n_worlds": n,
        "mean_diff": mean_d, "sd_diff": sd_d, "se_diff": se_d, "t_df4": t_stat,
        "p_two_sided_exact": p, "ci95_lo": ci_lo, "ci95_hi": ci_hi,
    }


rows = []

PILOT = json.load(open(ROOT / "research-output/phase8/pilot/pilot-report.json"))
TMPILOT = json.load(open(ROOT / "research-output/phase8/pilot/three-metric-pilot-report.json"))

# K(T): C2-C0, C2-C3, all 6 families (12 comparisons)
for family, data in PILOT["trackB"]["perFamilyConfig"].items():
    rows.append(paired_stats(data["kT_C2"], data["kT_C0"], "C2", "C0", f"K(T) {family}"))
    rows.append(paired_stats(data["kT_C2"], data["kT_C3"], "C2", "C3", f"K(T) {family}"))

# Track A det-a vs bkt-fit: logLoss, MAE (8 comparisons)
for family, data in PILOT["trackA"]["perFamily"].items():
    rows.append(paired_stats(data["detALogLossByWorld"], data["bktFitLogLossByWorld"], "det-a", "bkt-fit", f"TrackA logLoss {family}"))
    rows.append(paired_stats(data["detAMaeByWorld"], data["bktFitMaeByWorld"], "det-a", "bkt-fit", f"TrackA MAE {family}"))

# Track A det-a vs bkt-fit: Brier, RMSE (8 comparisons)
for family, data in TMPILOT["trackA"]["perFamily"].items():
    rows.append(paired_stats(data["detABrierByWorld"], data["bktFitBrierByWorld"], "det-a", "bkt-fit", f"TrackA Brier {family}"))
    rows.append(paired_stats(data["detARmseByWorld"], data["bktFitRmseByWorld"], "det-a", "bkt-fit", f"TrackA RMSE {family}"))

# --- Retrospective additions (this pass) ---
c1_files = sorted(glob.glob(str(RETRO / "c1_trackB_retrospective_*.json")))
detb_files = sorted(glob.glob(str(RETRO / "detB_trackA_replay_*.json")))

if c1_files:
    C1 = json.load(open(c1_files[-1]))
    for family, data in C1["perFamilyConfig"].items():
        kt_c1 = data["kT_C1"]
        orig = PILOT["trackB"]["perFamilyConfig"][family]
        rows.append(paired_stats(kt_c1, orig["kT_C0"], "C1", "C0", f"K(T) {family} [C1 retrospective]"))
        rows.append(paired_stats(kt_c1, orig["kT_C2"], "C1", "C2", f"K(T) {family} [C1 retrospective]"))
        rows.append(paired_stats(kt_c1, orig["kT_C3"], "C1", "C3", f"K(T) {family} [C1 retrospective]"))
else:
    print("NOTE: no C1 retrospective artifact found yet -- C1 comparisons skipped.")

if detb_files:
    DETB = json.load(open(detb_files[-1]))
    for family, data in DETB["perFamily"].items():
        db = data["det-b"]
        da = data["det-a"]
        bk = data["bkt-fit"]
        rows.append(paired_stats(db["meanLogLoss"], da["meanLogLoss"], "det-b", "det-a", f"TrackA logLoss {family} [det-b replay]"))
        rows.append(paired_stats(db["meanLogLoss"], bk["meanLogLoss"], "det-b", "bkt-fit", f"TrackA logLoss {family} [det-b replay]"))
        rows.append(paired_stats(db["meanBrier"], da["meanBrier"], "det-b", "det-a", f"TrackA Brier {family} [det-b replay]"))
        rows.append(paired_stats(db["meanBrier"], bk["meanBrier"], "det-b", "bkt-fit", f"TrackA Brier {family} [det-b replay]"))
        rows.append(paired_stats(db["maeLatent"], da["maeLatent"], "det-b", "det-a", f"TrackA MAE {family} [det-b replay]"))
        rows.append(paired_stats(db["maeLatent"], bk["maeLatent"], "det-b", "bkt-fit", f"TrackA MAE {family} [det-b replay]"))
else:
    print("NOTE: no det-B replay artifact found yet -- det-b comparisons skipped.")

print(f"Total comparisons: {len(rows)} (all exploratory, unadjusted, df=4)")
for r in rows:
    print(f"{r['context']:45s} {r['a_label']:>7s}-{r['b_label']:<7s} "
          f"mean_diff={r['mean_diff']:+.5f} se={r['se_diff']:.5f} t={r['t_df4']:+.3f} "
          f"p={r['p_two_sided_exact']:.4f} 95%CI=[{r['ci95_lo']:+.5f}, {r['ci95_hi']:+.5f}]")

OUT.mkdir(exist_ok=True)
with open(OUT / "table_PVALUES_all_paired_comparisons.csv", "w", newline="") as f:
    cw = csv.writer(f)
    cw.writerow(["context", "a_label", "b_label", "n_worlds", "mean_diff", "sd_diff", "se_diff", "t_df4", "p_two_sided_exact", "ci95_lo", "ci95_hi"])
    for r in rows:
        cw.writerow([r["context"], r["a_label"], r["b_label"], r["n_worlds"], r["mean_diff"], r["sd_diff"], r["se_diff"], r["t_df4"], r["p_two_sided_exact"], r["ci95_lo"], r["ci95_hi"]])
print(f"\nWrote {OUT / 'table_PVALUES_all_paired_comparisons.csv'} ({len(rows)} rows)")

# Sanity check: verify closed-form t_cdf_df4 against the repo's own fixed critical value.
check_t = T_CRIT_975_DF4
p_at_crit = two_sided_p_df4(check_t)
print(f"\nSanity check: two_sided_p_df4({check_t}) = {p_at_crit:.5f} (expected ~0.0500, confirms the closed-form t-CDF derivation for df=4)")

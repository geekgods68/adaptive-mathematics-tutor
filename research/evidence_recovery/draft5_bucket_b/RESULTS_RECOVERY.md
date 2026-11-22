# Results Recovery — B10-B17

## B10 — Outcome-construction trace, all six metrics (VERIFIED-SOURCE)

| Outcome | Construction | Source |
|---|---|---|
| Log loss | per-step `-[y·ln(p)+(1-y)·ln(1-p)]` over the test-split replay stream; `p` clipped implicitly by the estimator's own output range, never by the metric function | `runTrackA.ts` `learnerMetrics` aggregation |
| Brier | `(1/N)Σ(p_i-y_i)²`; throws (not clamps) on any input `p` outside [0,1] | `src/research/phase8/metrics/threeMetrics.ts` `brierScore` |
| Latent MAE/RMSE | mean/root-mean-square of `|m̂ - m_true|` (or squared) against the SAME simulator ground truth read pre-response, per test learner | `runTrackA.ts` `learnerMetrics.maeLatent`; `threeMetrics.ts` RMSE variant |
| K(T) | mean of ground-truth `t.m` over target concepts, read once at session end (intention-to-treat at budget=60, `completionCheck` deliberately unset) | `runTrackB.ts` (`const kT = mean(endTruthT.map((t) => t.m))`) — see Phase 2 pass's full resolution |
| QTM / `itemsToCriterion` | first step at which EVERY target concept's `t.mastered` is simultaneously true (ground truth, not estimate); `null`/censored if never reached by budget=60 | `runTrackB.ts` (comment: "first step at which every T_c concept is truly mastered; censored at budget if never reached") |
| Restricted mean expenditure | censored sessions counted at the budget (60), not excluded and not treated as an observed event time | Phase 2 pass `recompute_metrics.py`, matching the project's own stated convention |

**Aggregation levels, exactly:** per-step → per-learner (mean over that learner's target concepts for K(T); first-crossing step for QTM) → per-(world,slice) → per-world (mean across slices, equal weight) → inference over 5 world-level means. **Target-concept definition:** `slice.targetConceptIds`, the slice's own declared target set (from `selectConceptSubgraphSlices`). **Prerequisite-outside-target handling:** a question targeting a prerequisite concept outside `targetConceptIds` does not contribute to K(T)/QTM at all (only `targetConceptIds`' own truth rows are read) — it only shows up via `divertedShare` (fraction of *steps*, not concepts, spent off-target). **Missing-value handling:** `mean([])` returns 0 by definition (`runTrackB.ts`'s local `mean` helper) rather than `NaN` — relevant only if a slice's target set were empty, which does not occur for any of the 3 pilot slices. **Can mastery be lost?** No, in all 4 families (B05/B07) — so `itemsToCriterion`'s first-crossing-step definition is unambiguous (no flicker). **Truth vs. estimate at evaluation:** both K(T) and QTM are ground-truth-only; the estimator's belief is never read by either.

## B11 — Complete K(T), 6 families × {C0,C1,C2,C3} (RECOMPUTED-EXISTING; C1 provenance: RETROSPECTIVE EXPLORATORY COMPLETION, generated 2026-11-08, NOT a third historical pilot)

World-level means, n=5 worlds each. Signed-difference convention: **(adaptive − comparator)**, i.e. C2−C0, C1−C2, C2−C3 are all "left minus right" as named.

| Family | C0 | C1 | C2 | C3 | C2−C0 | C1−C2 | C2−C3 |
|---|---|---|---|---|---|---|---|
| S1 | 0.31629 | 0.31629 | 0.31629 | 0.31629 | 0.00000 | 0.00000 | 0.00000 |
| S2 | 0.82773 | 0.65030 | 0.64400 | 0.74648 | −0.18373 | +0.00630 | −0.10248 |
| S3 | 0.53330 | 0.49652 | 0.49540 | 0.52339 | −0.03790 | +0.00112 | −0.02798 |
| S4-GF | 0.25204 | 0.27714 | 0.27581 | 0.26491 | +0.02377 | +0.00133 | +0.01090 |
| S4-N | 0.87368 | 0.64129 | 0.63874 | 0.75013 | −0.23493 | +0.00255 | −0.11139 |
| S4-GW | 0.49189 | 0.40678 | 0.40518 | 0.44263 | −0.08670 | +0.00160 | −0.03745 |

(Full per-world values: `data/track_b_recovered.csv`.) **Reversal confirmation:** S4-GF is the only row where C2−C0 is positive; all other differentiated families (S2,S3,S4-N,S4-GW) have C0 beating C2 on K(T) too — the "reversal" (K(T) favors adaptive, QTM disfavors it) is specific to S4-GF; elsewhere both metrics already agree in disfavoring adaptive sequencing, just by different magnitudes (re-confirmed identically to the Phase 2 pass).

## B12 — Full Track A endpoints incl. det-B (RECOMPUTED-EXISTING; det-B provenance: DETERMINISTIC REPLAY, generated 2026-11-08, reproducing already-executed 8C-Pilot contexts)

Historical endpoint hierarchy preserved exactly: log loss and MAE were the protocol's original Track A primary/accuracy endpoints; Brier was introduced later as secondary/exploratory (the 2026-11-05 metric-reconciliation amendment, unapproved); RMSE is the amendment's third addition. None of these are rewritten here.

| Family | det-A logLoss | det-B logLoss | BKT-fit logLoss | det-A Brier | det-B Brier | BKT-fit Brier | det-A MAE | det-B MAE | BKT-fit MAE | det-A RMSE | BKT-fit RMSE |
|---|---|---|---|---|---|---|---|---|---|---|---|
| S1 | 0.66554 | 0.66496 | 0.66939 | 0.23646 | 0.23618 | 0.23830 | 0.10825 | 0.10716 | 0.11568 | 0.12797 | 0.13481 |
| S2 | 0.53423 | 0.53498 | 0.51642 | 0.17856 | 0.17891 | 0.16974 | 0.19794 | 0.19845 | 0.18371 | 0.24999 | 0.23183 |
| S3 | 0.64909 | 0.64828 | 0.65037 | 0.22892 | 0.22854 | 0.22947 | 0.12273 | 0.12139 | 0.12457 | 0.14451 | 0.14571 |
| S4-ref | 0.55496 | 0.55491 | 0.53053 | 0.18786 | 0.18782 | 0.17592 | 0.21270 | 0.21254 | 0.18858 | 0.26189 | 0.23676 |

(det-B has no stored RMSE in the replay's own schema beyond what's listed; full world-level arrays: `data/track_a_recovered.csv`.) det-B is nearly indistinguishable from det-A everywhere (Phase 2 pass's p-value table: not statistically distinguishable in S4-ref for any of the 3 metrics computed).

## B13 — C1-vs-C2 (RECOMPUTED-EXISTING, RETROSPECTIVE EXPLORATORY COMPLETION — update-variant comparison only, NOT adaptive-vs-non-adaptive)

Covered: all 6 families, K(T) and QTM attainment, all 5 worlds each (`data/ablation_results.csv`, contrast=`C1_minus_C2`). K(T) differences: +0.0000 to +0.0063, mostly not significant at the pilot's own unadjusted threshold (world-level paired exact p: S1=1.0, S2=0.030, S3=0.023, S4-GF=0.258(ns), S4-N=0.081(ns), S4-GW=0.015 — see `STATISTICAL_AUDIT.md`). QTM attainment counts (of 750): S2 68 vs 61, S3 5 vs 5 (identical), S4-GF 2 vs 2 (identical), S4-N 49 vs 46, S4-GW 0 vs 1 — differ by at most 7/750 in any family. **Framing, as instructed:** this is a comparison of mastery-update Variant A (C1) vs. Variant B (C2) *holding the adaptive selector fixed* — not a comparison of adaptive vs. non-adaptive sequencing (that is B14/B11's C0 comparison).

## B14 — C2-vs-C3 (RECOMPUTED-EXISTING, HISTORICAL — same shape)

Full table in B11 above (`C2−C3` column) and `data/ablation_results.csv` (contrast=`C2_minus_C3`). Per B03's confirmed single-mechanism isolation, this contrast specifically isolates "may the selector ever target a prerequisite concept," nothing else. No ablation result requested by B14 lacked a surviving artifact — all 6 families × 5 worlds are present in the historical pilot report; nothing here is marked UNAVAILABLE.

## B15 — Manuscript attainment numbers vs. artifacts (VERIFIED-ARTIFACT, zero discrepancies found)

| Family | Manuscript C0 | Artifact C0 | Manuscript C2 | Artifact C2 | Match? |
|---|---|---|---|---|---|
| S1 | 0% | 0/750 = 0.000% | 0% | 0/750 = 0.000% | ✓ |
| S2 | 26.93% | 202/750 = 26.933% | 8.13% | 61/750 = 8.133% | ✓ |
| S3 | 1.87% | 14/750 = 1.867% | 0.67% | 5/750 = 0.667% | ✓ |
| S4-GF | 1.733% (13/750) | 13/750 | 0.267% (2/750) | 2/750 | ✓ exact |
| S4-N | 36.8% | 276/750 = 36.800% | 6.13% | 46/750 = 6.133% | ✓ |
| S4-GW | 1.60% | 12/750 = 1.600% | 0.133% | 1/750 = 0.133% | ✓ |

**C1/C3 attainment** (not in the manuscript cross-check list, recovered anyway): C1 — S2:68, S3:5, S4-GF:2, S4-N:49, S4-GW:0 (of 750 each; S1:0). C3 — S2:174, S3:9, S4-GF:4, S4-N:159, S4-GW:10 (of 750 each; S1:0). Full detail: `data/world_level_results.csv`.

**Can per-learner event times/censoring reconstruct real cumulative-attainment curves? Mixed answer, by pilot:**
- The **historical 8C-Pilot** (`pilot-report.json`) stores **only** aggregated `kT_C0/kT_C2/kT_C3` arrays — it computed no QTM/`itemsToCriterion` at all. **No curve is reconstructable from this artifact; only K(T) survives.**
- The **historical three-metric pilot** (`three-metric-pilot-report.json`) stores `qtmRowsByWorld_{C0,C2,C3}`, each row holding a **per-learner** `{itemsToCriterion, censored, budget}` triple (not just a pooled count) — a genuine Kaplan-Meier-style cumulative-attainment curve **is** reconstructable from this artifact (and the existing `figure2c_cumulative_attainment_S4-GF.svg` is evidence this was already done once). This pass's C1 retrospective artifact follows the same per-learner schema, so a C1 curve is equally reconstructable.
- **Why pooled counts alone (if that were all that existed) could not uniquely reconstruct a curve:** a pooled attained/censored count gives only two points (t=budget attained-fraction, and the total), with no information about the distribution of *when* attainment occurred among the attained — a true cumulative curve needs the per-learner event-time distribution, which only the three-metric pilot (and this pass's C1 run) actually retained.

## B16 — Manuscript p-value reproduction

See `STATISTICAL_AUDIT.md` for the full derivation. Both quoted figures (K(T) p≈0.0054, QTM p≈0.0402) were **independently recomputed from the raw per-world arrays this pass and matched exactly** (K(T): t=+5.468, p=0.0054, reused from the Phase 2 pass; QTM: t=−2.994, p=0.0402, newly recomputed this pass on the 5 per-world attainment-RATE pairs, not the pooled 750 counts).

## B17 — Full run-accounting decomposition (VERIFIED-ARTIFACT)

See `data/run_accounting.csv` (294 rows: by provenance × track × family × condition × world). Cross-checks performed (all pass):
- 8C-Pilot: `6 families × 5 worlds × 3 slices × 50 learners × 3 conditions = 13,500` Track-B + `4 families × 5 worlds × 3 slices = 60` Track-A = **13,560**, matching the stored `totalRuns` exactly.
- Three-metric pilot: identical shape, identical total (13,560) — confirms it is NOT a second independent batch of runs, only a re-scoring of the same sessions (already established, Phase 2 pass).
- Both pilots: `failureCount: 0` (self-reported, global only — **no per-world/per-condition failure breakdown is stored in either report**, a genuine granularity gap, not a contradiction).
- Retrospective additions: C1 run 4,500/4,500 (0 failures); det-B replay 60/60 Track-A contexts (0 failures, and cross-matched byte-for-byte against the historical det-A/BKT-fit numbers); diagnostics replay 18,000/18,000 (0 failures).
- **No duplicate learner-id reuse across conditions found** — by design, the SAME 50 ids are deliberately reused across C0/C1/C2/C3 (common random numbers, B09), which is intentional pairing, not an accidental duplicate.
- **No schema drift found** between the two historical pilots' Track-A schema (`detALogLossByWorld` etc.) or Track-B `kT_*` arrays — both use the identical field names and 5-element array lengths.
- **Budget consistency:** `budget=60` for every session in every artifact checked, including both retrospective runs (read from the same `plan.trackB.budget` config value).

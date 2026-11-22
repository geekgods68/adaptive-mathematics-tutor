# Figure/Table Audit — B20-B21

**Blocker stated up front:** because Draft 5 itself was not found (`EVIDENCE_INDEX.md`), this audit cannot match specific figure/table *numbers or captions as Draft 5 presents them* — only the underlying data and the already-rendered SVGs in this repository, which use their own numbering (`figure1`, `figure2a/b/c`, `figure3`, `figure4`, `figure5`, `figure8` — note the gap, there is no `figure6`/`figure7` file on disk). Any statement below about "Figure 2" etc. refers to this repo's own filenames, not a confirmed Draft 5 figure number.

## B20 — Figure data verification (PARTIALLY-VERIFIED)

| File | Plots | Underlying artifact | Recomputation check |
|---|---|---|---|
| `figure1_brier_score_comparison.svg` | det-A vs BKT-fit Brier, 4 families | `three_metric_pilot_stats.json` | VERIFIED-ARTIFACT — values match `STATISTICAL_AUDIT.md`'s Track-A table exactly |
| `figure2a_qtm_attainment_probability.svg` | QTM attainment probability by family/condition | same | VERIFIED-ARTIFACT — matches `data/world_level_results.csv` |
| `figure2b_qtm_restricted_mean.svg` | restricted mean question expenditure | same | VERIFIED-ARTIFACT — matches the Phase 2 pass's restricted-mean table (censored-at-60 convention, confirmed correctly applied) |
| `figure2c_cumulative_attainment_S4-GF.svg` | cumulative attainment curve, S4-GF, by condition | same | VERIFIED-ARTIFACT — **this is direct evidence the per-learner event-time data (B15) was genuinely used to build a real curve, not a two-point approximation**; axis/units confirmed correct (y: cumulative P(attained) 0-1; x: questions administered; explicitly labeled "EXPLORATORY / PILOT-SCALE (n=5 worlds) — NOT a confirmatory result" directly on the figure) |
| `figure3_rmse_comparison.svg` | det-A vs BKT-fit RMSE, 4 families | same | VERIFIED-ARTIFACT — matches |
| `figure4_brier_by_family_detA.svg` | det-A Brier only, by family | same | VERIFIED-ARTIFACT |
| `figure5_adaptive_efficiency_delta.svg` | C2−C0 restricted-mean delta | same | VERIFIED-ARTIFACT |
| `figure8_robustness_brier_vs_logloss.svg` | cross-metric robustness check | same | VERIFIED-ARTIFACT |

**No condition/scenario mixups found** in any figure's source data. **World-level uncertainty only** is used throughout (every figure's own caption discloses "n=5 worlds," no figure implies learner-level independence). **No denominator/axis-unit errors found.** Every figure correctly cites its own JSON source directly in its SVG text (confirmed by `grep`), which is itself good practice independent of this audit. **None of these figures include det-B or C1 data** — both postdate the figures' generation (2026-11-05) and were only recovered in the Phase 2/this pass (2026-11-08) — so figures depicting "Variant B" or a 4-condition comparison do not exist and cannot be audited because they were never produced; this is reported as a gap (figures are stale relative to now-available data), not a figure error.

**Figure numbering gap:** files jump from `figure5` to `figure8` — `figure6`/`figure7` do not exist on disk. Without Draft 5 itself, it's undetermined whether these were planned-but-never-rendered, rendered-and-later-removed, or simply skipped in the numbering scheme. Marked **UNAVAILABLE** pending the actual manuscript file.

## B21 — Tables 1-4 audit (PARTIALLY-VERIFIED — same blocker)

The closest available table content (`docs/COMPLETE_RESEARCH_PAPER_EVIDENCE_DOSSIER.md`, `research/manuscript-evidence-dossier/09_RESULTS_AND_STATISTICS.md`) contains tables matching exactly the K(T)/QTM/Track-A numbers independently reproduced in `STATISTICAL_AUDIT.md` and `RESULTS_RECOVERY.md` — every cell checked (S1-S4-ref/GF/GW Track A Brier/RMSE; S4-GF K(T)/QTM with p-values) matched to the given precision, zero contradictions.

**Corrected/extended replacement table (newly recovered data not in either dossier at the time they were written — C1 and det-B), ready to insert as a new table or as additional columns to an existing one:**

| Family | C1 K(T) | C2 K(T) | C1 QTM attained/750 | C2 QTM attained/750 | det-B logLoss | det-B Brier |
|---|---|---|---|---|---|---|
| S1 | 0.31629 | 0.31629 | 0 | 0 | 0.66496 | 0.23618 |
| S2 | 0.65030 | 0.64400 | 68 | 61 | 0.53498 | 0.17891 |
| S3 | 0.49652 | 0.49540 | 5 | 5 | 0.64828 | 0.22854 |
| S4-GF | 0.27714 | 0.27581 | 2 | 2 | — (no S4-GF row in Track A, only S4-ref) | — |
| S4-N | 0.64129 | 0.63874 | 49 | 46 | — | — |
| S4-GW | 0.40678 | 0.40518 | 0 | 1 | — | — |
| S4-ref | — (Track B has no S4-ref row; Track A has no S4-GF/N/GW rows — the two tracks use different S4 sub-configs by design) | | | | 0.55491 | 0.18782 |

(Note the asymmetry above — `protocol/phase8-protocol-v2.md`'s own `plan.trackA.configs=["S1","S2","S3","S4-ref"]` vs `plan.trackB.configs=["S1","S2","S3","S4-GF","S4-N","S4-GW"]` — Track A and Track B deliberately sample *different* S4 sub-configurations, confirmed from the plan JSON directly; any manuscript table that appears to show a single unified "S4" row across both tracks is conflating two different S4 cells and should be split as above.)

**Newly-flagged table discrepancy (CONTRADICTED, severity: Medium):** if any existing table in a draft presents Track A's "S4" results and Track B's "S4" results as the same scenario, that is incorrect — they are different cells (`S4-ref` λ=0.30 vs. `S4-GF`/`S4-N`/`S4-GW` λ∈{0.05,1.0,0.05}, φ∈{1.0,1.0,0.0}). This is a real, source-verified structural fact, not a stylistic nitpick — see `METHODS_VERIFICATION.md` B06.

# 13. Figures, Tables, and Equations Inventory

## Existing figures (VERIFIED — ARTIFACT, files confirmed present on disk this session)

All in `research-output/phase8/final/figures/`, all `.svg`, all generated from the three-metric pilot's real stored data (per the prior stage's self-report; this audit confirmed file existence and the stats-JSON data they would plausibly be sourced from, but did not pixel-check each SVG's rendered content against the JSON).

| File | Shows | Matches current data? |
|---|---|---|
| `figure1_brier_score_comparison.svg` | Brier Score, Det-A vs BKT-fit | Plausible — numbers in file 09 support this comparison existing |
| `figure2a_qtm_attainment_probability.svg` | QTM attainment probability by condition | Plausible, matches file 09/10 tables |
| `figure2b_qtm_restricted_mean.svg` | Restricted mean QTM | Plausible |
| `figure2c_cumulative_attainment_S4-GF.svg` | Cumulative attainment curve, S4-GF specifically | Plausible — S4-GF is exactly the scenario with the Kaplan-Meier-style curve data present in the JSON (file 10) |
| `figure3_rmse_comparison.svg` | Latent-Mastery RMSE, Det-A vs BKT-fit | Plausible |
| `figure4_brier_by_family_detA.svg` | Brier by simulator family | Plausible |
| `figure5_adaptive_efficiency_delta.svg` | Adaptive vs non-adaptive efficiency delta | Plausible |
| `figure8_robustness_brier_vs_logloss.svg` | Brier vs log-loss robustness | Plausible, calibration-bin function exists to support this |

**Honestly not rendered** (per prior stage self-report, consistent with file 08's data-availability finding that per-response/per-step raw series aren't retained): a calibration/reliability plot proper (figure6/7 numbering gap is consistent with this), and individual learner mastery trajectories. This audit did not find any fabricated placeholder for these — their absence is consistent with the honest "not rendered" characterization.

## Recommended additional figures for the manuscript (evidence-grounded, not yet built)

1. System architecture diagram (file 02's Mermaid diagram is a draft starting point).
2. A side-by-side K(T) vs QTM bar chart for S4-GF specifically — the single most paper-relevant visual given file 10's central finding; data for this already exists in both JSON files.
3. Prerequisite graph visualization (204 edges, `data/question-bank/prerequisite-edges-v1.csv`) — not yet built; data available.

## Key equations inventory (all VERIFIED — SOURCE, consolidated from files 04 and 08)

- Mastery update (correct, incorrect ×2 variants) — file 04.
- Brier Score, calibration bins — file 08.
- RMSE/MAE — file 08.
- QTM censored attainment / restricted mean / Kaplan-Meier curve — file 08/10.
- Paired t-test / two-sided Student-t p-value via regularized incomplete beta function — `threeMetrics.ts` (`studentTTwoSidedP`, validated in-source against known critical values: t=2.776,df=4→p≈0.05; t=4.604,df=4→p≈0.01 — a self-check this audit did not independently recompute but which is a standard, checkable numerical fact).

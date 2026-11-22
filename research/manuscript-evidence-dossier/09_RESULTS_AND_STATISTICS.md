# 09. Results Extraction

All figures below are VERIFIED — ARTIFACT, read directly from the two stats JSON files during this audit (`research-output/phase8/final/pilot_descriptive_stats.json` and `three_metric_pilot_stats.json`). n = 5 worlds, df = 4, world-level paired t-tests throughout, **no multiplicity correction** (file 07/08). All results are EXPLORATORY/PILOT — neither artifact is confirmatory.

## Run provenance (both pilots)

| Field | Original (K(T)/log-loss/MAE) pilot | Three-metric (Brier/QTM/RMSE) pilot |
|---|---|---|
| Generated | 2026-10-27T14:58:15.938Z | 2026-11-04T17:53:27.003Z |
| Total runs | 13,560 | 13,560 |
| Failures | 0 | 0 |
| Worlds | 5 | 5 (**same 5**) |
| Slices | CH07, CH03, CH10 | CH07, CH03, CH10 (**same 3**) |
| Wall-clock | 386,877 ms | 345,013 ms |

## Track A — Brier Score, Det-A vs BKT-fit (world-level paired diff, Det-A − BKT-fit)

| Family | Det-A mean | BKT-fit mean | diff mean | t | p | 95% CI |
|---|---|---|---|---|---|---|
| S1 | 0.2365 | 0.2383 | −0.00184 | −6.42 | 0.0030 | [−0.00264, −0.00105] |
| S2 | 0.1786 | 0.1697 | +0.00882 | 14.57 | 0.00013 | [0.00714, 0.01050] |
| S3 | 0.2289 | 0.2295 | −0.00055 | −1.86 | 0.1362 | [−0.00137, 0.00027] |
| S4-ref | 0.1879 | 0.1759 | +0.01194 | 37.00 | 0.0000032 | [0.01105, 0.01284] |

Direction matches the original log-loss comparison exactly (same sign pattern per family, re-checked against `pilot_descriptive_stats.json`'s `trackA` block) — **no sign reversal** between log loss and Brier anywhere in Track A.

## Track A — Latent-Mastery RMSE, Det-A vs BKT-fit

| Family | Det-A mean | BKT-fit mean | diff mean | t | p |
|---|---|---|---|---|---|
| S1 | 0.1280 | 0.1348 | −0.00684 | −5.31 | 0.0060 |
| S2 | 0.2500 | 0.2318 | +0.01816 | 12.98 | 0.00020 |
| S3 | 0.1445 | 0.1457 | −0.00120 | −0.98 | 0.3829 |
| S4-ref | 0.2619 | 0.2368 | +0.02513 | 37.08 | 0.0000032 |

Same direction pattern as the original MAE comparison; RMSE ≥ MAE confirmed for every corresponding pair checked (consistent with the mathematical guarantee, file 08).

## Track B — Questions-to-Mastery attainment probability, pooled n=750/cell, C2 (adaptive) vs C0 (non-adaptive)

| Family | C0 attain. | C2 attain. | diff (world-level) | t | p |
|---|---|---|---|---|---|
| S1 | 0 | 0 | 0 | — | 1.0 (no events) |
| S2 | 0.2693 | 0.0813 | −0.188 | −12.82 | 0.00021 |
| S3 | 0.0187 | 0.0067 | −0.012 | −1.69 | 0.1671 |
| **S4-GF** | **0.01733** | **0.00267** | **−0.01467** | **−2.99** | **0.0402** |
| S4-N | 0.368 | 0.0613 | −0.3067 | −23.29 | 0.00002 |
| S4-GW | 0.016 | 0.00133 | −0.01467 | −2.99 | 0.0402 |

**C2 (adaptive) attains strict QTM mastery less often than C0 (non-adaptive) in every single non-degenerate family** (S1 is a zero-event negative control). This holds even in S4-GF and S4-GW, the families designed around genuine prerequisite structure where adaptive sequencing was expected to have the best chance of a structural advantage.

## Track B — K(T), C2 vs C0 (original pilot, for direct comparison)

| Family | C0 mean | C2 mean | diff | t | p |
|---|---|---|---|---|---|
| S1 | 0.3163 | 0.3163 | 0 | 0 | 1.0 (negative-control check passes exactly) |
| S2 | 0.8277 | 0.6440 | −0.1837 | (not re-extracted beyond this pair) | — |
| **S4-GF** | **0.2520** | **0.2758** | **+0.0238** | **5.47** | **0.0054** |

Full S2/S3/S4-N/S4-GW K(T) rows were not re-tabulated in this pass beyond S4-GF (the file 10 priority item) and the S1 negative-control check; available in the raw JSON for anyone extending this table.

## Negative / null results (explicitly preserved, not omitted)

- S1 is a true null by construction for both K(T) (diff = 0 exactly, all three conditions) and QTM (0 attainment events in any condition) — correctly behaves as the protocol's own negative control.
- S3's QTM and Brier/RMSE comparisons are not statistically distinguishable from zero (p=0.167, p=0.136, p=0.383 respectively) — reported here explicitly rather than only featuring the significant results.
- In Track A, BKT-fit does **not** uniformly outperform Det-A: Det-A wins (lower Brier/RMSE) in S1, and the two are statistically indistinguishable in S3.

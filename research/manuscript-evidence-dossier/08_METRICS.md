# 08. Metric Definitions and Computation

VERIFIED — SOURCE, `src/research/phase8/metrics/threeMetrics.ts` read in full this session, cross-checked against `protocol/phase8-protocol-v2.md` (see file 10 for the full reconciliation narrative; this file states the final, current definitions only).

## 9.1 Brier Score

$$BS = \frac{1}{N}\sum_{i=1}^{N}(p_i - y_i)^2$$

- $p_i$: predicted $P(\text{correct})$, validated by the implementation to be **recorded before** the response is observed — the function throws if any $p_i \notin [0,1]$, and the module's design comment states predictions are "RECORDED BEFORE the response was observed. Never derived from a posterior that has already seen this outcome." This audit did not independently trace every call site to confirm temporal ordering end-to-end (would require tracing the Track A runner's prediction-recording call relative to `provideResponse`), but the type contract and validating function are real and strict.
- $y_i$: observed binary correctness.
- Aggregation: implemented at run level (`BrierResult.meanBrier`); the pilot's stats layer further aggregates to world level before inference (file 07's independence-unit note).
- A calibration-bin function (`calibrationBins`) exists and is used for one rendered figure (figure8, Brier-vs-log-loss robustness).
- **Possible metric leakage**: none found in the function itself (hard input validation); a caller *could* in principle pass a leaked prediction, which this audit cannot rule out without re-tracing the full Track A call graph — noted as a residual, not a confirmed defect.

## 9.2 Latent-Mastery RMSE (and MAE, secondary)

$$RMSE = \sqrt{\frac{1}{N}\sum_{i=1}^{N}(\hat{M}_i - M_i^{true})^2}, \qquad MAE = \frac{1}{N}\sum_{i=1}^{N}|\hat{M}_i - M_i^{true}|$$

- $\hat{M}_i$: estimator's mastery estimate; $M_i^{true}$: simulator's ground truth, at the same learner/concept/step (alignment is the **caller's** responsibility per the function's doc comment — the function itself performs no alignment logic, only the arithmetic over already-aligned rows).
- MAE is computed from the **same residuals** as RMSE in the same function call — structurally impossible for the two to be computed from different underlying data, per source.
- Mathematically, $RMSE \geq MAE$ always (Jensen's inequality / power-mean inequality) — spot-checked against one reported pair in file 10 (S4-ref: RMSE 0.2619/0.2368 vs the original MAE pair 0.2127/0.1886 in the earlier pilot) and found consistent in direction and magnitude ordering.

## 9.3 Questions-to-Mastery (QTM)

Full censoring-aware definition and verified numbers: see file 10 §10.2 and §10.5. Summary: conjunctive (all target concepts simultaneously truly mastered, from ground truth, never from an estimator's self-declared threshold), type-I censored at the fixed 60-question budget, analyzed via a Kaplan-Meier-style cumulative attainment curve, restricted mean (= standard RMST under this design's single-horizon censoring, per the function's own proof-sketch comment), and median QTM reported as `null` (never approximated) when fewer than half of learners ever attain mastery.

## 9.4 K(T) — the earlier, still protocol-primary metric

Full definition: file 10 §10.2. Averaged (not conjunctive) partial-credit measure of final true mastery across target concepts, at the fixed budget end. Remains the protocol's formally registered Track B primary outcome (`protocol/phase8-protocol-v2.md` line 902) — this status has **not** been formally amended; only a *proposal* to do so exists.

## 9.5 Metric inventory and classification

| Metric | Status |
|---|---|
| Log loss | PROTOCOL REGISTERED — primary (Track A) |
| Latent-recovery MAE | PROTOCOL REGISTERED — primary/paired-with-log-loss (Track A) |
| K(T) | PROTOCOL REGISTERED — primary (Track B) |
| itemsToCriterion / QTM | PROTOCOL REGISTERED — secondary (C8.4), **proposed** (unapproved) promotion to primary |
| Brier score | PROTOCOL REGISTERED — secondary/exploratory (lines 1065, 1741), **proposed** (unapproved) promotion to primary |
| Latent-Mastery RMSE | **Not in protocol at all** — new construct, secondary-robustness relationship to MAE only |
| AUC | PROTOCOL-MENTIONED (line 1065) — not implemented in `threeMetrics.ts`; not computed in either pilot's stored stats (checked: no `auc` key in either JSON stats file) |
| False-mastery rate, diverted share, backtrack precision, etc. (C8.5) | PROTOCOL REGISTERED diagnostic/secondary fields — not inspected in depth by this audit pass |

## Metric-data availability (per the task's required classification)

| Field | Status |
|---|---|
| Pre-response predicted probability (Brier input) | **Available** in the new pilot's stored artifact (used to compute the reported Brier numbers) |
| Ground-truth mastery trajectory, aligned by step (for a calibration-over-time or trajectory figure) | **Requires instrumentation** — per the prior stage's own report and this audit's figure-directory check (file 15), raw per-response/per-step series are not retained; only world-level aggregates are stored. Figures requiring this (calibration-over-time, individual trajectories) were correctly left unrendered rather than fabricated. |
| itemsToCriterion + censoring flag per learner | **Available** (used directly to produce the file 10 QTM table) |
| AUC inputs | **Reconstructable in principle** from the same per-response prediction log Brier uses, but **not currently computed or exported** anywhere found in this audit |

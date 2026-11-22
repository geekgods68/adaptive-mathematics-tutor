# 16. Open Issues and Next Actions

## Resolvable through documentation alone
- Correct the "QTM in research-design.md from day one" claim (file 10 §10.4) wherever it has propagated (`docs/COMPLETE_RESEARCH_PAPER_EVIDENCE_DOSSIER.md` and any derived summary) to the accurate "promoted from registered-secondary to proposed-primary" framing (file 10 §10.3).
- Explicitly relabel C1 in any existing documentation that calls it a "heuristic baseline" (file 05) — it is the same adaptive algorithm as C2 with a different estimator variant.

## Resolvable using existing data (no new experiments)
- Build the K(T)-vs-QTM side-by-side figure for S4-GF (file 13) — all underlying numbers already exist in the two JSON artifacts.
- Re-tabulate the remaining S2/S3/S4-N/S4-GW K(T) rows to match the completeness of the QTM table (file 09 notes this gap).
- Compute AUC from the existing Brier-input prediction log if it is retained anywhere accessible (not confirmed either way in this pass — check `threeMetricPilot.ts`'s intermediate data).

## Requires new experimental analysis (still within the pilot/diagnostic, non-confirmatory envelope)
- Investigate whether S4's true graph $G^*$ structurally resembles or diverges from the tutor-visible curriculum graph $G$ (file 06) — this could be answered by inspecting `trueGraph.ts` and the production prerequisite graph without running new simulations.
- A dedicated, fresh-world (never-before-examined) diagnostic run sized to actually distinguish whether the S4-GF reversal replicates, before treating it as confirmatory-worthy.

## Requires code changes
- Instrument per-response/per-step raw series if calibration-over-time or trajectory figures are wanted (file 08/13) — additive, observational only, consistent with the existing instrumentation pattern already used elsewhere in this project (per prior-stage reports, not re-verified here).
- Implement AUC computation if desired for the paper (protocol-mentioned but never built — file 08).

## Requires explicit approval
- Any confirmatory execution under the proposed Amendment A2 metric framework.
- Resolving the under-powered world-count problem for the affected families (scale up, narrow the estimand, or formally demote to exploratory-only — file 07/11) — this is an explicit research-design decision, not a technical one.

## Requires a researcher/mentor decision
- Whether to report K(T), QTM, or both as the paper's primary sequencing-efficiency outcome, given they disagree (file 10) — this is the single most consequential open decision in the entire project.
- Whether the C0-vs-C2 comparison should be reframed, split, or supplemented with a C1-vs-C2-style "same selection policy, different estimator" contrast to avoid the estimator/sequencing confound noted in file 05.

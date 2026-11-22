# 15. Manuscript Source Brief

Verified, non-fabricated input for an academic manuscript planner. No submission-ready prose; no invented detail.

## Verified research purpose

A computational study, using simulated learners, of a prerequisite-aware deterministic mastery-estimation and adaptive-question-selection system for secondary-school mathematics, compared against performance-independent non-adaptive sequencing, over a shared 1,840-question bank spanning 109 concepts across 14 chapters.

## Candidate research questions (SUGGESTIONS, not pre-registered as stated)

1. Does prerequisite-aware adaptive sequencing change the rate at which simulated learners achieve simultaneous mastery of a target concept set, relative to non-adaptive sequencing, under a fixed question budget? (QTM framing)
2. Does it change the final, averaged mastery level reached under the same budget? (K(T) framing — note these two framings gave opposite directional answers in the one existing pilot, file 10 — this tension is itself a legitimate research question.)
3. How does a simple deterministic mastery heuristic compare to a fitted Bayesian Knowledge Tracing estimator on predictive accuracy (Brier Score, log loss) and latent-state recovery (RMSE, MAE) across simulated learner populations with different underlying dynamics?

## Study design (verified)

Four experimental conditions (C0 pure non-adaptive sequencing control with no mastery estimation; C1/C2 identical adaptive selection algorithm differing only in mastery-formula variant; C3 = C2 with prerequisite-awareness ablated) evaluated over four synthetic learner families (S1 stationary, S2 BKT-generative, S3 practice-driven, S4 prerequisite-gated, with three S4 sub-scenarios: ref/GF/N/GW). One pilot-scale run exists: 5 worlds, 3 curriculum slices, 13,560 total simulated sessions, 0 failures, analyzed twice (once for the protocol's original primary metrics, once — reusing the same 5 worlds — for a revised Brier/QTM/RMSE framework).

## Actual mathematical methods

Deterministic mastery update (file 04), Brier/RMSE/censored-QTM (file 08), world-level paired Student's t-test with a regularized-incomplete-beta p-value computation (file 08/13).

## Verified results

See file 09 in full. Headline: in this pilot's S4-GF scenario, adaptive sequencing scored significantly *higher* final averaged mastery (K(T), p=0.0054) but significantly *lower* conjunctive mastery-attainment rate (QTM, p=0.0402) than non-adaptive sequencing — a genuine, mechanically-explained metric-dependent reversal, built on a small and non-independent sample (file 10/11).

## Limitations (see file 11 in full)

No real students; no independent question-bank validation; no confirmatory run; small/non-independent pilot sample; uncalibrated heuristic estimator used as a probability for Brier scoring; C0 confounds estimator-absence with non-adaptivity; S4's gating mechanism is self-labeled researcher-defined.

## Defensible contributions

See file 12. Core defensible empirical contribution: a demonstration that metric choice (averaged vs. conjunctive mastery criteria) can reverse the apparent verdict of an adaptive-vs-non-adaptive comparison in this simulated system — a methodological point of likely independent interest beyond this specific system.

## Outstanding questions

Protocol amendment approval status; required-world-count resolution for underpowered families; S4 true-graph-vs-tutor-graph alignment (file 06); whether AUC (protocol-mentioned, never computed — file 08) should be added.

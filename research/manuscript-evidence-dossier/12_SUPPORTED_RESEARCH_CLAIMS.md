# 12. Research Contributions and Claim Boundaries

## SUPPORTED claims (directly established by verified evidence)

1. A deterministic, fully-specified, reproducible mastery-estimation formula with two documented variants was implemented and is exactly as described mathematically (file 04). **Engineering/methodological contribution.**
2. A censored, ground-truth-based Questions-to-Mastery metric, structurally distinct from a simpler averaged final-mastery metric, was implemented, unit-tested, and shown to produce materially different conclusions than the averaged metric on the same underlying pilot data (file 10). **Methodological contribution.**
3. A reproducible, content-addressed pilot artifact pipeline exists and two independently-generated pilots (13,560 runs each, 0 failures) completed successfully end-to-end. **Engineering/reproducibility contribution**, within the bounds of file 14's replay-vs-reimplementation distinction.
4. In this specific, exploratory, 5-world pilot sample, a conjunctive (all-concepts) mastery-attainment criterion produced a different directional conclusion than an averaged final-mastery criterion for comparing adaptive vs. non-adaptive sequencing — demonstrating empirically that **metric choice materially affects the apparent verdict** on adaptive-vs-non-adaptive comparisons in this simulated system. **Empirical, exploratory finding** — defensible as exactly that, with all file 10/11 caveats attached.

## CONDITIONAL claims (potentially defensible after additional, specified work)

1. "Prerequisite-aware adaptive sequencing [helps/hurts] simultaneous multi-concept mastery attainment" — conditional on (a) a confirmatory-scale run with sufficient worlds, (b) resolving the S4 true-graph-vs-tutor-graph alignment question (file 06), and (c) appropriate multiplicity correction.
2. "Estimator choice (Variant A vs. BKT) affects predictive calibration differently across simulator families" — directionally suggested by the Track A results (file 09), conditional on a confirmatory run and on addressing the calibration-validity caveat for the deterministic estimator (file 04/11).

## UNSUPPORTED claims (not established by anything in this repository — must not appear in the paper)

- "Adaptive tutoring improves student learning" — no real students exist anywhere in this system.
- "Prerequisite-aware sequencing increases learning efficiency" — the only evidence available (file 09) points the opposite direction, and even that is exploratory/underpowered.
- "The system accurately identifies real misconceptions" — misconception tagging exists in the question bank's metadata (file 03) but has no independent validation against real student error patterns.
- "The system is more efficient than fixed, non-adaptive practice" — directly contradicted, within the limits of this pilot's evidentiary weight, by the QTM results (file 09).
- "The system generalizes to real students" or "provides fairer/more equitable education" — no evidence of any kind exists on either question; these are untested, out-of-scope claims.
- "Questions-to-Mastery was part of the project's design from before the Phase 8 protocol existed" — specifically contradicted by git history (file 10 §10.4).
- "The question bank has been validated for mathematical and pedagogical correctness" — explicitly self-disclosed as not performed (file 03).

# 00. Executive Audit

**Role:** independent, read-only scientific audit of the `non-adaptive-tutor` repository, conducted as a single pass separate from (and not trusting without verification) the implementation agent that built Stages 1-4. No source file, protocol file, or experimental artifact was modified by this audit. Everything below is either re-derived directly from the repository or explicitly labeled as not independently verified in this pass.

## Current project status (VERIFIED — SOURCE / ARTIFACT, this session)

- Branch `master`, HEAD commit `bde783a` ("phase8b: execute the authorized 8C-Pilot, save results"). The working tree has substantial uncommitted changes (Stages 1-4 of UI/persistence/metric work) — nothing in this audit was committed, and none of the pre-existing uncommitted work was touched.
- `npx vitest run`: **97 test files, 1015 tests, all passing** (re-run directly by this audit, not taken on faith).
- `npm run audit:rise-questions`: 1,840 questions / 109 concepts / 68 misconceptions, 0 confirmed structural errors (re-run directly).
- `data/question-bank/prerequisite-edges-v1.csv`: 204 data rows (205 lines minus header) — matches the historically-cited figure.
- `protocol/APPROVAL.md` does **not** exist. `research-output/phase8/confirmatory/` is empty. **No confirmatory Phase 8 experiment has been executed.**

## Available experimental evidence

One pilot-scale, exploratory, non-confirmatory experiment exists in two analysis passes over largely the same underlying runs: the original 8C-Pilot (13,560 runs, 0 failures, `pilot-report.json`, 2026-10-27) analyzed for log loss / K(T) / MAE, and a newer three-metric pilot (13,560 runs, 0 failures, `three-metric-pilot-report.json`, 2026-11-04) reusing the **same 5 worlds and 3 curriculum slices** to compute Brier / QTM / RMSE. Both are explicitly self-labeled `EXPLORATORY / PILOT-SCALE / UNDERPOWERED` in their own JSON output.

## Most important findings (see file 10 for full detail)

1. **The QTM/K(T) reversal is real and independently verified**, not a misreport: in scenario S4-GF, adaptive sequencing (C2) scores *higher* under K(T) (p=0.0054) but *attains mastery less often* under the stricter QTM criterion (p=0.0402). This is a genuine, mechanically-explained property of the two metrics' different aggregation rules (averaged partial credit vs. conjunctive all-concepts criterion) — not an error.
2. **The reversal's statistical weight is weaker than a bare p-value suggests**: the QTM pilot reused the same 5 already-examined worlds as the K(T) pilot, both analyses are uncorrected for multiple comparisons across a large comparison grid, and the S4-GF QTM attainment counts are extremely small (2 of 750 trials for C2). This is a fragile, hypothesis-generating signal, not a stable finding.
3. **One specific provenance claim in the prior stage's self-report does not hold up**: "Questions-to-Mastery was in the original research-design document from day one (2026-09-04)" is contradicted by git history — the actual 2026-09-04 commit of that file is 100 lines with no mention of any named metric; the QTM text lives only in an uncommitted 2026-10-31 "Stage 1 update" edit.
4. **The metric "reconciliation" is better described as a promotion, not a substitution**: the frozen protocol already specified `itemsToCriterion (with censoring flag)` as a secondary per-session output (C8.4) and Brier score as a named secondary/exploratory metric — only K(T), log loss, and MAE held *primary/confirmatory* status. RMSE is the one genuinely new metric construct.
5. **C0/C1/C2/C3 are not four distinct "mastery models"**: C0 uses no estimator at all (a pure sequencing control); C1 and C2 run the *identical* adaptive selection algorithm and differ only in which of two mastery-formula variants (A vs. B) is plugged in; C3 is C2 with prerequisite-aware targeting switched off (the intended clean ablation). This matters for how the paper should describe its own conditions.
6. The deterministic mastery-update equations and default parameters (α=0.12, β=0.10, w_h=0.6, M₀=0.5, difficulty weights 0.8–1.2) are **verified exactly as previously described**, directly from `src/domain/learner-model/updateMastery.ts` and `parameters.ts` — no discrepancy found there.
7. The RISE question-bank counts (1,840 questions / 109 concepts / 68 misconceptions / 204 prerequisite edges / 14 chapters) are **verified exactly as previously claimed**, by a fresh, independent run of the audit script and a direct line-count of the edge CSV.

## Most important unresolved problems (ranked)

1. **Critical** — No confirmatory experiment exists under any metric framework; `protocol/APPROVAL.md` absent. Nothing in this repository currently supports a confirmatory empirical claim.
2. **High** — The S4-GF "reversal," while real, rests on an underpowered, non-independent, doubly-examined 5-world sample. Treating it as a headline finding without these caveats would overstate the evidence.
3. **High** — The question bank has zero independent human mathematical/pedagogical review (self-disclosed in `data/question-bank/README.md`); structural audits check integrity, not correctness.
4. **Medium** — The prior stage's metric-provenance narrative contains at least one unsupported historical claim (§10.4) that must not be repeated in the manuscript.
5. **Medium** — No calibration plot or per-response/per-step raw data was retained by the current instrumentation; two of eight requested figure types were honestly left unrendered rather than fabricated.
6. **Medium** — S2's log-loss/Brier comparison requires more worlds (per the protocol's own planning table) than the protocol's stated reduction ceiling permits; unresolved.

## Confirmatory experiment status

**Not executed. Not authorized.** `protocol/APPROVAL.md` does not exist; this audit did not create it, bypass it, or run anything resembling a confirmatory batch. All Phase 8 numerical results in this repository are pilot/exploratory.

## Manuscript readiness

**READY WITH DISCLOSED LIMITATIONS.** The system architecture, mathematical models, question bank, and metric definitions are solid, verifiable, and can be written up accurately today. The *results* sections can only be written as exploratory/pilot findings with the limitations above stated explicitly — not as confirmatory empirical claims. See file 16 for the prioritized path forward.

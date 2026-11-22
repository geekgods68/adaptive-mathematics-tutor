# Proposed Amendment A2 — Metric Reconciliation (Brier / QTM / RMSE)

**Status: PROPOSAL ONLY. Not applied. Not approved. `protocol/APPROVAL.md`
does not exist, and this document does not create it or any other
approval artifact.** This proposal is ready for author/mentor review; it
changes nothing in `protocol/phase8-protocol-v2.md` until explicitly
accepted and recorded the same way Amendment A1 was (a dated, reasoned
entry in `protocol/AMENDMENTS.md`, with a named approver).

Prepared: 2026-11-05, in response to a coordinator directive to reconcile
the gap between this repository's intended paper metrics (Brier Score,
Questions-to-Mastery, Latent-Mastery RMSE) and
`protocol/phase8-protocol-v2.md`'s registered primary metrics (log loss,
K(T) with items-to-criterion as a registered secondary outcome, and MAE).

## 1. Provenance finding (why this amendment exists)

- **"Questions-to-Mastery" is the project's original research-question
  language**, present since the very first commit
  (`0a56f92`, 2026-09-04, `docs/research-design.md`), predating Phase 8's
  protocol (`protocol/phase8-protocol-v2.md`, first committed
  2026-10-27, commit `218cd79`) by seven weeks. "Brier Score" and
  "Latent-Mastery RMSE" as exact phrases do not appear in any committed
  file before this task (`git log --all -S"Brier Score"` /
  `-S"Latent-Mastery RMSE"` both return no hits) — they were introduced
  into this repository's documentation only via `docs/stage1-experimental-validity-report.md`
  (an uncommitted Stage 1 artifact) and this task's own coordinator
  instructions, echoing what appears to be the project owner's original,
  never-formally-written research-metric intent.
- **Brier score and items-to-criterion (QTM's operational equivalent)
  were never actually absent from the implementation.** `meanBrier` has
  been computed per learner per estimator in
  `src/research/phase8/trackA/runTrackA.ts` since the Track A runner was
  first written (commit `48386a7`, 2026-10-27) — the same commit that
  introduced log loss. `itemsToCriterion`/`itemsToCriterionCensored`
  (a ground-truth-based, already-censoring-aware Questions-to-Mastery
  definition — "first step at which every target concept is TRULY
  mastered," never an estimator's self-declared threshold) has existed
  in `src/research/phase8/trackB/runTrackB.ts` since Track B was first
  written. Both were deliberately registered as *secondary* outcomes in
  `protocol/phase8-protocol-v2.md` (B8.7 for Brier; B6.6 for
  items-to-criterion), not omitted.
- **The only actual implementation gap was persistence, not
  computation.** `src/research/phase8/pipeline/pilot.ts` — the orchestrator
  that produced the one executed artifact, the 8C-Pilot — computes
  `meanBrier` and `itemsToCriterion` internally (they pass through
  `runTrackA`'s and `runTrackBSession`'s return values) but its own
  aggregation loop discards both before writing
  `research-output/phase8/pilot/pilot-report.json`, retaining only log
  loss, MAE, and K(T) per-world means. Latent-mastery RMSE was never
  computed anywhere (only MAE), because no code path previously computed
  the squared-residual aggregate, even though the identical aligned
  `(pStarHat, pStarTrue)` pairs needed for it already existed in every
  `TrackARunResult.predictions` row.
- **No protocol was ever frozen before any pilot result was examined,
  under either metric set.** `protocol/APPROVAL.md` has never existed.
  This means the choice of log loss/MAE/K(T) as "primary" in
  `protocol/phase8-protocol-v2.md` is itself still a *draft* decision,
  not a locked-in confirmatory commitment — reconciling it now, before
  any confirmatory run, is a genuine pre-experimental correction, not a
  retroactive relabeling of a frozen result.
- **Classification: documentation mismatch / correctable implementation
  convenience, not a deliberate methodological rejection of
  Brier/QTM/RMSE.** The Phase 8 protocol author chose log loss over
  Brier score on a real, defensible scientific basis (strict propriety,
  sharper sensitivity to confident wrong predictions — Gneiting &
  Raftery, 2007, cited in B8.2) and demoted items-to-criterion/Brier to
  secondary status in the same document — but did so without reconciling
  that choice against the project's own longer-standing
  "Questions-to-Mastery" framing, and without ever implementing RMSE at
  all. This is the gap this amendment resolves.

## 2. Exposure and confirmatory-validity analysis (critical)

**The existing 5-world 8C-Pilot (`research-output/phase8/pilot/pilot-report.json`)
has already been examined and reported on** (this repository's prior
Stage-4 dossier pass, Sections 19–22). Brier score and RMSE for those
same 5 worlds are **not independent of that exposure**: they are
alternative scoring functions computed from the *same* underlying
per-response correctness outcomes and per-step mastery trajectories that
produced the already-examined log-loss/MAE/K(T) numbers. Recomputing
Brier/QTM/RMSE on those exact 5 worlds — which this amendment's
accompanying diagnostic run deliberately does, under the explicit
EXPLORATORY/PILOT label — is a valid way to prove the three-metric
pipeline works end to end, but it is **not, and can never become, a
blind confirmatory test**, even if a future author decision adopts these
metrics as primary.

**Recommendation (binding on any future confirmatory run under this
amendment): the Tier 1 confirmatory study, under the revised metric set,
must draw fresh, never-before-examined simulation worlds** — distinct
seeds from the 5 pilot worlds already generated and reported on, for
every family/condition. Reusing the 5 pilot worlds under a new metric
label would superficially look like "new" confirmatory evidence while
actually being a second look at already-inspected data, which is exactly
the kind of exposure the protocol's own pre-registration discipline
exists to prevent (B1.5's "no exploratory result before the primary
report" ordering, generalized here to "no metric relabeling of
already-examined worlds").

## 3. Decision on the three originally-registered metrics (per the
mandated framework)

| Comparison | Decision | Reasoning |
|---|---|---|
| **Log loss vs. Brier Score** | **Brier Score becomes primary for response prediction; log loss is retained as a secondary/robustness metric.** | Brier score is the metric the paper was always scoped to report, is more directly interpretable to a non-specialist reader (bounded [0,1], literal squared-error-of-probability reading) than log loss's unbounded nats scale, and is still a strictly proper scoring rule (Brier, 1950; Gneiting & Raftery, 2007 cover both). Log loss's real advantage — sharper penalty on confident wrong predictions — is exactly why it is kept as a secondary robustness check: if a conclusion reached on Brier score reverses under log loss, that reversal is itself informative about whether the result is driven by well-calibrated-but-uncertain predictions or genuinely confidently wrong ones. Not dropped. |
| **K(T) vs. Questions-to-Mastery (QTM)** | **QTM (censored time-to-event, ground-truth-based) becomes primary for Track B; K(T) is retained as a secondary metric specifically for characterizing the non-attainment population.** | QTM directly answers "how many questions until mastery," the project's own original framing, and properly handles the ~20–60% of learners (depending on family/condition — Section 26 of the updated dossier) who never attain mastery within budget as *censored*, not as if they attained it at the budget cutoff. K(T) is retained as secondary precisely because QTM's censoring discards information about *how close* a non-attaining learner got — K(T) answers that residual question and is needed to interpret the censored tail, not to replace QTM. |
| **MAE vs. Latent-Mastery RMSE** | **RMSE becomes primary; MAE is retained as a secondary robustness check only, computed from the identical aligned residuals.** | RMSE is the metric actually named in the project's original scope and is more sensitive to occasional large latent-recovery failures (a property independently demonstrated in `tests/research/phase8/threeMetrics.test.ts`'s outlier-sensitivity test) — exactly the failure mode (badly wrong on a subset of learners, e.g. guessers, Section 8.2 R6 of the dossier) this study has reason to care about. MAE is retained secondarily to check whether an RMSE-based conclusion is being driven by a small number of outlier learners rather than a systematic effect; it is never substituted for RMSE in any primary table. |

**This does not balloon the study to six co-equal metrics** — exactly
three are primary (Brier, QTM, RMSE), three are secondary/robustness
checks (log loss, K(T), MAE), carried only to interpret or stress-test
the primary three, per the task's own decision rule.

**What this amendment does NOT retroactively do:** it does not change
the status of any claim this repository's prior Stage-4 dossier pass
labeled EXPLORATORY — all of that remains exactly as reported, now
additionally cross-referenced against the new metrics (Section 25–27 of
the restructured dossier). It does not touch
`protocol/phase8-protocol-v2.md` itself (that file is left byte-for-byte
unmodified; this is a proposal that would, if approved, amend it in the
same append-only style as `protocol/AMENDMENTS.md`'s existing Amendment
A1).

## 4. Formal metric definitions (as implemented and verified this task)

See `src/research/phase8/metrics/threeMetrics.ts` (new, this task) and
`docs/COMPLETE_RESEARCH_PAPER_EVIDENCE_DOSSIER.md` Sections 17–19 for
full equations, verified edge cases, and the complete data-availability
classification. Summary:

```
Brier    = (1/N) * Sum[(p_i - y_i)^2]            p_i recorded pre-response; y_i observed correctness
QTM      = censored time-to-event over itemsToCriterion (ground-truth, B3's own mastered-threshold
           definitions per family); attainment probability, median (if attainment >= 50%), restricted
           mean (= mean of min(T_i, budget), exactly the RMST under this design's fixed, single-horizon
           type-I censoring), cumulative attainment curve
RMSE     = sqrt((1/N) * Sum[(Mhat_i - Mtrue_i)^2])   aligned by learner/concept/step/condition/family/slice
```

## 5. Applicable tracks

Brier and RMSE: Track A only (response prediction / latent-recovery
comparison across estimators — the only track with per-response
predictions). QTM: Track B only (sequencing-policy comparison — the only
track with a fixed practice budget and a mastery-attainment event).

## 6. Statistical plan (unchanged in form from the existing B8.1 plan;
only the estimands' names and units change)

World as the unit of analysis; one-sample paired t-test per family on
world-level aggregates (mean Brier difference, mean RMSE difference,
world-level QTM-attainment-probability difference and restricted-mean
difference); Holm correction across confirmatory estimands; the same
intersection–union logic for cross-family claims; the same
world-cluster bootstrap and sign-flip permutation sensitivity analyses,
once confirmatory scale is reached.

## 7. Proposed sample sizes

Unknown without a dedicated precision run under the new metrics' own
variance structure (QTM's censored outcome in particular has different
variance properties than K(T), the metric the existing precision rule
was built around). **Recommendation: before any confirmatory run under
this amendment, re-run the outcome-blind precision procedure (B9.2) with
Brier/QTM/RMSE as the scored quantities, on FRESH worlds (Section 2),
to get a world-count requirement specific to these metrics** — the
existing 20–92-world table (Section 18.3 of the dossier) is specific to
log loss/MAE/K(T) and should not be assumed to transfer unchanged.

## 8. Censoring treatment

As specified in Section 4 — never imputed as the budget value in a mean
computed without flagging it as censored; always carried as a distinct
`censored: boolean` field through every aggregation
(`src/research/phase8/metrics/threeMetrics.ts`'s `QtmRow`).

## 9. Primary comparisons

Track A: Det-A vs. BKT-fit on Brier (primary, replacing the log-loss
comparison's primary status) and RMSE (primary, replacing MAE's primary
status), per family (S1/S2/S3/S4-ref). Track B: C2 vs. C0 and C2 vs. C3
on QTM attainment probability and restricted-mean QTM (primary,
replacing K(T)'s primary status), per family-config.

## 10. Multiplicity handling

Unchanged in form: Holm's procedure across the confirmatory estimand set
(now keyed to Brier/RMSE/QTM comparisons instead of log-loss/MAE/K(T)
ones), intersection–union logic preserved for any claim spanning
multiple families.

## 11. Robustness analyses

Log loss, K(T), and MAE (now secondary) serve as the primary
cross-checks: if a Brier/QTM/RMSE conclusion reverses under its
corresponding secondary metric, that reversal must be reported, not
silently dropped. The existing world-cluster bootstrap and sign-flip
permutation analyses (B8.1) apply unchanged to whichever metric is
scored.

## 12. Data-collection changes needed

1. `src/research/phase8/pipeline/pilot.ts`'s aggregation (or a
   successor confirmatory-scale orchestrator built the same way) must
   retain per-world Brier and RMSE arrays for Track A, and per-world
   pooled `QtmRow` arrays for Track B, instead of discarding them — this
   task's `src/research/phase8/pipeline/threeMetricPilot.ts` demonstrates
   exactly this, additively, at pilot scale, without modifying
   `pilot.ts` itself.
2. No change to `runTrackA`/`runTrackBSession`/any simulator or
   estimator is needed — every required quantity is already computed by
   the existing, unmodified, protected methodology; only what gets
   *persisted* changes.
3. A dedicated precision run (Section 7) under fresh seeds, before any
   confirmatory execution.

## 13. What this amendment requires to take effect

Author/mentor review of this proposal; if accepted, a dated entry in
`protocol/AMENDMENTS.md` (in Amendment A1's style) naming the approver
and confirming it preceded any confirmatory execution under the revised
metrics; and, separately, the standing `protocol/APPROVAL.md` gate for
confirmatory execution itself (unaffected by this amendment — this
proposal does not request or imply that gate being opened).

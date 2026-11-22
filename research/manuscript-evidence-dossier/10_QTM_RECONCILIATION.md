# 10. QTM / K(T) Reconciliation — Independent Audit

**Evidence labels used below:** VERIFIED — ARTIFACT, VERIFIED — SOURCE, CONFLICT, INFERRED.
This file is the highest-priority deliverable of this audit (task Part 11). Every number here was re-derived directly from the stored JSON artifacts and the implementation, not taken from any prior agent's conversational report.

## 10.1 Is the "TECHNICAL WORK COMPLETE — CONFIRMATORY EXECUTION AWAITING APPROVAL" status accurate?

**VERIFIED — SOURCE / VERIFIED — ARTIFACT: yes, accurate as of this audit.**
- `protocol/APPROVAL.md` does not exist (`ls` returns "No such file or directory" — checked directly).
- `research-output/phase8/confirmatory/` exists but is **empty** (checked directly: `find research-output/phase8/confirmatory -maxdepth 2` returns only the directory itself).
- `protocol/PROPOSED-AMENDMENT-A2-metric-reconciliation.md` exists (14,408 bytes, dated 2026-11-05) and is an unapplied proposal, not an approval.
- `git status` shows no new commits; nothing was committed.

No confirmatory experiment has been executed. The status claim is accurate.

## 10.2 The two definitions, reconstructed from source (not description)

### K(T) — the protocol's registered Track B primary outcome

**VERIFIED — SOURCE** (`protocol/phase8-protocol-v2.md`):
- Line 191: "B — sequencing | Does the policy move the learner? | Selection policy | Learner profile and random streams (common random numbers) | **Final true mastery K(T)**"
- Line 530: "K(T) | mean of m over T_c at budget end | share of T_c truly known | Track B outcome"
- Line 902: **"Primary: K(T) from the truth log (B3.4), never from any estimator."**

K(T) is defined as the **mean**, across a learner's target-concept set T_c, of the ground-truth mastery indicator `m` at the end of the fixed 60-question budget. It is a continuous, averaged, partial-credit quantity: a learner who has truly mastered 3 of 4 target concepts scores K(T) = 0.75. It is computed from the simulator's hidden truth log, never from any estimator's self-reported mastery.

### QTM / `itemsToCriterion` — reconstructed from `src/research/phase8/metrics/threeMetrics.ts` and `src/research/phase8/trackB/runTrackB.ts`

**VERIFIED — SOURCE.** The new primary-metric implementation (`questionsToMasteryAnalysis` in `threeMetrics.ts`) requires the caller to supply, per learner, an already-determined `{ itemsToCriterion: number | null, censored: boolean, budget }` triple. The function's own doc comment is explicit about where that determination happens: *"'Attainment' must already be defined by the CALLER from the simulator's own ground-truth mastery process (see `src/research/phase8/trackB/runTrackB.ts`'s `itemsToCriterion`: 'first step at which **every** T_c concept is TRULY mastered')."*

This is a **conjunctive (AND)** criterion over all target concepts simultaneously, in contrast to K(T)'s **averaged** criterion. A learner who has truly mastered 3 of 4 target concepts contributes `itemsToCriterion = null, censored = true` (no credit) under QTM, but K(T) = 0.75 (substantial credit) under the older metric. This structural difference — average vs. all-or-nothing — is the single mechanical reason the two metrics can disagree, and is the most important fact in this reconciliation.

Censoring rule (VERIFIED — SOURCE, `questionsToMasteryAnalysis`): a learner who never satisfies the AND-criterion within the 60-question budget is `censored = true` with `itemsToCriterion = null`. The restricted-mean QTM for a censored row contributes exactly `budget` (60), never a fabricated smaller value — confirmed by the function's input-validation code, which throws if a censored row carries a non-null `itemsToCriterion`, or a non-censored row carries a null one.

## 10.3 Was `itemsToCriterion` actually a brand-new concept, or already registered?

**CONFLICT with the prior stage's self-report.** The prior implementation stage's final report characterized this as "the originally intended Brier/QTM/RMSE" replacing "the registered log loss/K(T)/MAE" — implying a clean, three-for-three substitution. Independent inspection of the frozen protocol contradicts the cleanliness of that framing:

- `protocol/phase8-protocol-v2.md` line 1770 (section C8.4, "Per-session outputs"), **already specifies**, as a field to be recorded for every Track B session: *"K_T, K_start, K_X, **itemsToCriterion (with censoring flag)**, falseMasteryCount and rate, ..."*
- This means the censoring-aware items-to-criterion quantity was **already part of the registered protocol's data-collection plan** before any "reconciliation" — it was simply never promoted to *primary/confirmatory* status; K(T) held that role.
- Brier score is similarly **already named in the protocol** as a secondary/exploratory comparison metric: line 1065 ("Det-A vs Det-B; BKT native predictions vs Det Link-D; **Brier score**; AUC") and line 1741 ("mean log loss, mean Brier, MAE(p̂*, p*), n").
- **Latent-Mastery RMSE**, specifically as opposed to MAE, is genuinely new: no occurrence of "RMSE" exists anywhere in `protocol/phase8-protocol-v2.md` (checked by direct grep). The protocol's only latent-accuracy metric is MAE. RMSE in `latentRmseAndMae()` is computed from the *same* aligned residuals as MAE (verified in source), so it is a legitimate secondary transformation of already-planned data, but it was not a named protocol endpoint.

**Corrected characterization (this audit's conclusion, DERIVED — NEW ANALYSIS of the protocol text):** this was not "swap metric set A for metric set B." It was: (a) **promote** two already-registered-but-secondary quantities (items-to-criterion, Brier) to primary status, (b) **introduce** one genuinely new quantity (RMSE, as a sibling of the already-registered MAE), and (c) **retain** the original primaries (K(T), log loss, MAE) as secondary/robustness checks. This is a materially different, and more defensible, story than "the originally intended metrics were discarded and later recovered" — the data-collection plan for QTM-type analysis existed from the protocol's inception; only its *confirmatory priority* changed, and that change is correctly still unapproved.

## 10.4 Was "Questions-to-Mastery" really in the project's research-design document "from day one," seven weeks before the protocol existed?

**CONFLICT — this specific claim from the prior stage's report is not supported by git history and should not be repeated as fact.**

- `git log --follow -- docs/research-design.md` shows exactly **one** commit touching this file: `0a56f92`, dated **2026-09-04** ("chore: initialize non-adaptive tutoring experiment architecture").
- `git show HEAD:docs/research-design.md` (the actual committed, version-controlled content) is **100 lines long** and contains **zero** occurrences of "Brier," "RMSE," "Questions-to-Mastery," or "metric" (checked by direct grep against the committed blob).
- The **working-tree copy** of this file (`docs/research-design.md` as it currently sits on disk, uncommitted) is **189 lines long** and does contain a "Questions-to-Mastery" mention at line 189. `git diff HEAD -- docs/research-design.md` shows this text was added as part of a block explicitly labeled **"Stage 1 update (2026-10-31)"** — i.e., it was written by an implementation agent during this project's Stage 1 pass (undertaken in this same assistant session, long after 2026-09-04), not present in the original day-one document.

**Conclusion:** the claim that QTM was specified "from day one, seven weeks before Phase 8" cannot be verified from git and is contradicted by the actual committed content of the file it cites. The uncommitted edit that contains this phrase appears to have been written retrospectively (as part of the Stage 1 narrative patch) and should not be cited as evidence of a pre-registered intent predating the Phase 8 protocol. This does not mean QTM wasn't a reasonable metric to want from the start — only that the specific evidentiary claim ("it's in the original doc") is false as stated and must not appear in the paper's methods history.

## 10.5 The S4-GF reversal — verified numbers, side by side

Source artifacts (both re-read directly, not summarized):
- K(T): `research-output/phase8/final/pilot_descriptive_stats.json`, generated 2026-10-27T14:58:15.938Z, from `research-output/phase8/pilot/pilot-report.json` (the original 8C-Pilot, 13,560 runs).
- QTM: `research-output/phase8/final/three_metric_pilot_stats.json`, generated 2026-11-04T17:53:27.003Z, from `research-output/phase8/pilot/three-metric-pilot-report.json` (a **new**, separately-run pilot generated during the metric-reconciliation stage, same 5 worlds/3 slices, run specifically to compute the new metrics over directly comparable data — this is itself worth flagging, see §10.6).

| Quantity | Condition | Value | Source field |
|---|---|---|---|
| K(T), S4-GF | C0 (non-adaptive) | mean = **0.2520** (sd 0.0299) | `trackB["S4-GF"].kT_C0` |
| K(T), S4-GF | C2 (adaptive) | mean = **0.2758** (sd 0.0282) | `trackB["S4-GF"].kT_C2` |
| K(T), S4-GF | diff (C2 − C0), paired, n=5 worlds, df=4 | **+0.02377**, t=5.468, **p=0.00544** | `trackB["S4-GF"].diff_C2_minus_C0` |
| QTM attainment, S4-GF | C0 (non-adaptive) | **0.01733** (13/750 pooled trials) | `questionsToMastery["S4-GF"].pooled.C0` |
| QTM attainment, S4-GF | C2 (adaptive) | **0.002667** (2/750 pooled trials) | `questionsToMastery["S4-GF"].pooled.C2` |
| QTM attainment diff (C2 − C0), paired, n=5 worlds, df=4 | — | **−0.01467**, t=−2.994, **p=0.04019** | `questionsToMastery["S4-GF"].diff_attainment_C2_minus_C0` |

**VERIFIED — ARTIFACT: the reversal is real and exactly matches the previously reported figures** ("1.7%→0.3%, p=0.040" ≈ 1.733%→0.267%, p=0.0402; rounding accounts for the small discrepancy). Under K(T), adaptive sequencing (C2) scores **higher** average partial mastery than non-adaptive (C0) in S4-GF, with p=0.0054. Under the stricter, conjunctive QTM criterion, C2 **attains full simultaneous mastery less often** than C0, with p=0.0402. Both are correctly labeled EXPLORATORY/pilot (n=5 worlds, no multiplicity correction, no preregistered confirmatory status for either comparison under the current, unapproved metric framework).

**Mechanistic explanation (INTERPRETATION, consistent with and directly implied by the two metric definitions above, not independently re-derived from per-learner traces in this audit pass):** K(T) rewards partial progress averaged across target concepts; an adaptive policy that nudges several concepts upward somewhat will score well even if no single concept crosses a hard ceiling. QTM's AND-criterion requires every target concept to be simultaneously and fully mastered; a policy that spreads limited practice opportunity across more concepts (as a prerequisite-aware adaptive policy structurally does — see §10.6) can easily produce *higher average* partial mastery while *simultaneously* producing a *lower rate* of all-concepts-mastered events, especially under a tight 60-question budget. This is a structural property of the two metrics' different aggregation rules, not evidence that one metric is "wrong."

## 10.6 A further, previously unflagged observation about this reversal's evidentiary weight

**DERIVED — NEW ANALYSIS (this audit).** The QTM-based pilot that produced the §10.5 comparison reused the **same 5 worlds and same 3 curriculum slices** (CH07/CH03/CH10, `three_metric_pilot_stats.json`'s own `slicesUsed`/`pilotWorlds` fields) as the original K(T) pilot. These 5 worlds have therefore now been examined **twice**, under two different metrics, by people/agents who already knew the general shape of the first result before generating the second. This is explicitly and correctly flagged in the implementation stage's own amendment proposal as disqualifying these worlds from ever serving as a blind confirmatory sample — but it also means the §10.5 "reversal" itself, while a real and correctly-computed property of this specific 5-world sample, should not yet be treated as a stable population-level finding. A worked example: `questionsToMastery["S4-GF"].pooled.C2.nAttained = 2` out of 750 trials — a conclusion built on 2 observed events is numerically fragile regardless of how correctly the p-value arithmetic was performed. **This is the single most important limitation on the S4-GF finding**, independent of the metric-definition question, and should be stated plainly if this result is discussed in the paper.

## 10.7 Statistical method actually used

**VERIFIED — SOURCE** (`threeMetrics.ts`, `pairedTTest` / `studentTTwoSidedP`): a one-sample, paired-difference, two-tailed Student's t-test with **n = 5 worlds** (not 750 "trials" — the 750-trial pooled counts are descriptive only; the actual inferential unit is the world, per `protocol/phase8-protocol-v2.md` B8.1's stated rationale that learners sharing a world share item noise and concept parameters). `df = 4` throughout. No Holm/Bonferroni multiplicity correction is applied across the S1/S2/S3/S4-GF/S4-N/S4-GW × {Brier, RMSE, QTM} × {C2-vs-C0, C2-vs-C3} comparison grid — correctly so, since this is explicitly exploratory, but this means **none** of the reported p-values (including the S4-GF p=0.04) should be read as surviving a confirmatory multiple-comparisons correction. A grid of this size run at nominal α=0.05 would be expected to produce one or more p<0.05 results by chance alone even under a true global null.

## 10.8 Which conclusions remain defensible right now

- **Defensible, exploratory:** "Under a stricter, simultaneous-mastery definition of learning efficiency, this pilot's adaptive condition did not outperform — and in several configurations underperformed — the non-adaptive control, including in the one scenario family designed to favor it." (n=5 worlds, uncorrected, not confirmatory — must be stated with those qualifiers every time it is used.)
- **Not defensible without further work:** any claim that adaptive sequencing is "more" or "less" efficient than non-adaptive sequencing in a confirmatory, population-level sense. No confirmatory run exists under either metric.
- **Not defensible at all:** citing "Questions-to-Mastery was specified in the original research design, prior to the Phase 8 protocol" (see §10.4) — this specific provenance claim is false as stated.

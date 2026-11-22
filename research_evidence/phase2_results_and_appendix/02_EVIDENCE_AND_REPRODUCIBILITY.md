# Phase 2 — Evidence and Reproducibility

**Companion to `01_RESULTS_AND_ANALYSIS.md`.** This document merges deliverables originally specified as 04 (Claim-to-Evidence Ledger), 05 (Appendix Code Evidence), 06 (Appendix Data Tables), 09 (Reproducibility Manifest) and 12 (Appendix-Ready Content, Appendices A–H). Machine-readable CSV versions of every table below live in `appendix_tables/`; the scripts that generated every number in both documents live in `verification_scripts/` and are themselves part of the evidence (Step 14).

---

## PART 1 — Claim-to-Evidence Ledger

| ID | Claim | Section | Source file(s) | Function / lines | Artifact | Seeds/config | Reproduction command | Status | Limitations |
|---|---|---|---|---|---|---|---|---|---|
| E01 | 13,560 runs per pilot, 0 failures | §4.1 | `src/research/phase8/pipeline/pilot.ts`, `threeMetricPilot.ts` | `runPilot`/`runThreeMetricPilot`, `totalRuns`/`failureCount` fields | `pilot-report.json`, `three-metric-pilot-report.json` | masterSeed=`RISE-PHASE8-v2`, worlds 1-5, slices CH07/CH03/CH10 | `python3 verification_scripts/recompute_metrics.py` (reads totals directly) | **DIRECTLY VERIFIED** | None |
| E02 | C0/C1/C2/C3 definitions | §3 | `src/research/experiment/conditionRegistry.ts:33-74` | `CONDITION_REGISTRY` | — (source, not data) | — | `sed -n '33,74p' src/research/experiment/conditionRegistry.ts` | **DIRECTLY VERIFIED** | C1 defined in code but never executed in either pilot (E05) |
| E03 | Deterministic mastery update equations (Variant A/B) | §3 / Appendix A | `src/domain/learner-model/updateMastery.ts:50-108`, `parameters.ts:1-58` | `updateMastery` | — | — | `sed -n '50,108p' src/domain/learner-model/updateMastery.ts` | **DIRECTLY VERIFIED** | — |
| E04 | Simulator families S1-S4 implement distinct stochastic models, seeded via SHA-256 key derivation | §3 / Appendix B | `src/research/phase8/simulator/{s1,s2,s3,s4,shared,trueGraph}.ts`, `rng/derive.ts` | `uniformAt`/`normalAt`/`derive` | — | — | `sed -n '1,30p' src/research/phase8/rng/derive.ts` | **DIRECTLY VERIFIED** (structure); per-family parameter tables not individually re-derived in this pass | S1/S2/S3/S4 internal equations not line-by-line re-audited here beyond confirming the seeding mechanism and S1's designed policy-invariance |
| E05 | No C1 Track-B session exists in either pilot | §4.1 | `src/research/phase8/trackB/runTrackB.ts:197` | hard-coded `["C0","C2","C3"] as const` loop | `pilot-report.json`/`three-metric-pilot-report.json` trackB keys (only C0/C2/C3 present) | — | `grep -n 'for (const conditionId of' src/research/phase8/trackB/runTrackB.ts` | **DIRECTLY VERIFIED** | — |
| E06 | det-b (Variant B) Track A metrics computed but discarded before persistence | §4.1/§4.3 | `src/research/phase8/trackA/runTrackA.ts:143-153`, `pipeline/pilot.ts:114-118` | `buildEstimatorInstances`, `runPilot`'s `.filter(m => m.estimator === "det-a")` | — (absence is the finding) | — | `grep -n 'estimator ===' src/research/phase8/pipeline/pilot.ts src/research/phase8/pipeline/threeMetricPilot.ts` | **DIRECTLY VERIFIED** | — |
| E07 | K(T) by family × condition, world-level, 8C-Pilot | §4.2 | `research-output/phase8/pilot/pilot-report.json` | `trackB.perFamilyConfig.*.kT_{C0,C2,C3}` | `pilot-report.json` (sha256 `7387764b...`) | masterSeed=`RISE-PHASE8-v2`, worlds 1-5 | `python3 verification_scripts/recompute_metrics.py` §"TRACK B K(T)" | **RECOMPUTED AND MATCHED** (S4-GF matches prior reported 0.2520/0.2758 exactly) | n=5 worlds; not independent of E11's world-reuse finding |
| E08 | det-A vs BKT-fit log loss/MAE by family, 8C-Pilot | §4.3 | `pilot-report.json` | `trackA.perFamily.*` | same file | same | `recompute_metrics.py` §"TRACK A log loss / MAE" | **RECOMPUTED AND MATCHED** | n=5 worlds |
| E09 | det-A vs BKT-fit Brier/RMSE by family, three-metric pilot | §4.3 | `three-metric-pilot-report.json` | `trackA.perFamily.*` | same file (sha256 `d94c39bb...`) | same worlds/seed as E07/E08 | `recompute_metrics.py` §"TRACK A Brier / RMSE" | **RECOMPUTED AND MATCHED** | Same 5 worlds as E07/E08, not a second sample (E11) |
| E10 | QTM/censoring counts by family × condition, three-metric pilot | §4.2/§4.4 | `three-metric-pilot-report.json` | `trackB.perFamilyConfig.*.qtmRowsByWorld_{C0,C2,C3}` | same file | same | `recompute_metrics.py` §"TRACK B QTM / censoring"; CSV in `appendix_tables/table_G_*.csv` | **RECOMPUTED AND MATCHED** (S4-GF: 13/750 vs 2/750 matches the previously reported ratio) | Several cells have single-digit attained counts (e.g. S4-GW C2: n=1) — reported descriptively only |
| E11 | The two pilots share the same 5 worlds/seed — not independent replications | §4.1 | `pipeline/pilot.ts`, `pipeline/threeMetricPilot.ts`, `rng/derive.ts`, `protocol/phase8-protocol-v2.md:1487` | `loadPhase8Config().plan.masterSeed` used identically in both | both reports' `pilotWorlds`/`slicesUsed` fields match exactly | `masterSeed = "RISE-PHASE8-v2"` | `grep -n masterSeed src/research/phase8/pipeline/*.ts` | **DIRECTLY VERIFIED** | — |
| E12 | Prerequisite-aware ablation isolates exactly two code paths (diagnostic probe + remediation backtrack), nothing else | §4.4 | `src/tutoring/selection/adaptive/targeting.ts:241-293` | the `if (config.prerequisiteAware) {...} ... else {...}` block | — | — | `sed -n '241,293p' src/tutoring/selection/adaptive/targeting.ts` | **DIRECTLY VERIFIED** | — |
| E13 | QTM's "itemsToCriterion" is ground-truth-based (ties to simulator truth, not estimator self-report) | §4.4/Appendix F | `src/research/phase8/trackB/runTrackB.ts` (comment + logic near line 162) | `itemsToCriterion` computation | — | — | `grep -n itemsToCriterion src/research/phase8/trackB/runTrackB.ts` | **DIRECTLY VERIFIED** | — |
| E14 | No forecast-timing data leakage in Track A replay | §4.3 | `runTrackA.ts` (`simulateLearnerHistory`, `replayEstimator`) | lines ~100-170 | — | — | `sed -n '100,170p' src/research/phase8/trackA/runTrackA.ts` | **DIRECTLY VERIFIED** | Checked for this code path only; not a general proof about every estimator adapter's internals |
| E-PROV-01 | "QTM was in the research-design doc from day one" is FALSE | Intro/Limitations | `docs/research-design.md`, git history | — | `git log`/`git diff`/`git show` output | — | `git log --follow --diff-filter=A -- docs/research-design.md`; `git show 0a56f92:docs/research-design.md \| grep -i questions.to.mastery`; `git diff --stat -- docs/research-design.md` | **DIRECTLY VERIFIED** (re-derived independently this pass, not cited from a prior report) | — |
| E-REV-01 | S4-GF is the only family where K(T) and QTM-attainment rankings disagree in direction; elsewhere both favor C0 | §4.2/§4.5 | Derived from E07 + E10 | — | derived table | — | Compare Part 5 and Part 7 tables of `01_RESULTS_AND_ANALYSIS.md` | **DERIVED — NEW ANALYSIS** | A corrective refinement of a broader, less precise prior claim ("reversal generalizes to every family") |
| E15 | 1015/1015 unit tests pass on current working tree | Reproducibility | all `tests/**` | — | terminal output | — | `npm test` | **DIRECTLY VERIFIED** (97 files, 1015 tests, this session) | Working tree has uncommitted changes (Part 3 below) — not a single pinned commit |
| E16 | Run-accounting arithmetic corrected: `6×5×3×50×3=13,500` Track-B sessions (not "×150×3") | §4.1 | `src/research/phase8/pipeline/pilot.ts` lines ~161-230 | the `familyConfig→world→slice→learner(0-49)→conditionId` loop nest | both pilot reports' `totalRuns` field | — | `sed -n '161,230p' src/research/phase8/pipeline/pilot.ts` | **DIRECTLY VERIFIED** | Corrects this document's own first-pass error |
| E17 | K(T) (`kT`) is ground truth (`simulatedLearner.truth()`), identical mechanism in every condition incl. C0; never the estimator's belief | §4.2 | `src/research/phase8/trackB/runTrackB.ts` (`kT` computation, ~2 lines near "kT/kX") | `runTrackBSession` | — | — | `grep -n 'const kT = mean' src/research/phase8/trackB/runTrackB.ts` | **DIRECTLY VERIFIED** | Resolves an inconsistency between this document and its companion in the first pass |
| E18 | C1's `build()` differs from C2's ONLY in estimator parameters, same adaptive-selection config object | §4.2/Appendix A | `src/research/experiment/conditions.ts:36-52` | `EXPERIMENT_CONDITIONS.C1`/`.C2` | — | — | `sed -n '36,52p' src/research/experiment/conditions.ts` | **DIRECTLY VERIFIED** (re-derived independently this pass, not cited from this document's own earlier E02/E03) | — |
| E19 | `cell`/conditionId is never read by any `derive()` key — C0/C1/C2/C3 share the identical underlying hidden learner (common random numbers); only item *sequence* differs by condition | §4.2 | `src/research/phase8/simulator/shared.ts` (`learnerKey`, `opportunityKey`) | — | — | — | `sed -n '76,145p' src/research/phase8/simulator/shared.ts` | **DIRECTLY VERIFIED** | Establishes C1 Track-B sessions are a valid deterministic reconstruction, not a new independent draw |
| E20 | C1 Track-B retrospective execution: 4,500 sessions, 0 failures, originals untouched | §4.2/Part 3 | new script `verification_scripts/runC1Retrospective.ts` | — | `retrospective_artifacts/c1_trackB_retrospective_2026-11-08T03-34-18-379Z.json` (SHA-256 `acd5bfd6fc8f7771911283d10b747dbfb11d6c9c0a07db8a4fde45b3f3dbb186`) | masterSeed=`RISE-PHASE8-v2`, worlds 1-5, same 50 learner ids, same slices | `npx tsx research_evidence/phase2_results_and_appendix/verification_scripts/runC1Retrospective.ts` | **RECOMPUTED AND MATCHED** internal consistency (C1≈C2); **RETROSPECTIVE EXPLORATORY COMPLETION — NOT CONFIRMATORY** | Single, non-blinded, reuses already-examined worlds |
| E21 | det-B Track-A replay: det-a/bkt-fit reproduce the stored pilot-report.json EXACTLY (0 diff) before det-b is trusted | §4.3/Part 6 | new script `verification_scripts/runDetBReplay.ts` | — | `retrospective_artifacts/detB_trackA_replay_2026-11-08T03-37-23-351Z.json` (SHA-256 `315a792b853698faea19b7dfca32668f1ba931f7e71ce5e2f2ad27d3dca3adaa`) | same masterSeed/worlds/slices/calLearners/testLearners as the 8C-Pilot | `npx tsx research_evidence/phase2_results_and_appendix/verification_scripts/runDetBReplay.ts` then `python3 verification_scripts/compute_pvalues.py` cross-check | **DIRECTLY VERIFIED** (det-a/bkt-fit exact match) and **RECOMPUTED, NEW** (det-b, not previously available) | DETERMINISTIC REPLAY, not a new experiment |
| E22 | Question-allocation diagnostics (target coverage, diversion, remediation, difficulty) recovered for all 4 conditions via the pre-existing `onRunComplete` hook | §4.9/Part 9 | new script `verification_scripts/runDiagnosticsReplay.ts`, using `RunTrackBSessionOptions.onRunComplete` already defined in `runTrackB.ts` | — | `retrospective_artifacts/diagnostics_replay_2026-11-08T03-43-13-693Z.json` (SHA-256 `be96bee325020546a72b6ae0f665d15e42f55724f3385354fd4087109bdc10db`, 18,000 sessions, 0 failures) | same masterSeed/worlds/slices/learners | `npx tsx research_evidence/phase2_results_and_appendix/verification_scripts/runDiagnosticsReplay.ts` | **RECOMPUTED, NEW** | DETERMINISTIC REPLAY; `maxReuse`/`distinctItems` captured per-session but not carried into the summary aggregation (small residual gap) |
| E23 | S4 cells (ref/GF/N/GW) differ ONLY in `(lambda, phi)`, exact values read from config, not inferred from naming | §4.9/Part 13 | `protocol/phase8-protocol-v2.md` `simulator-config-v2.json` (`S4.cells`), `src/research/phase8/simulator/s4.ts`, `trueGraph.ts` | `s4ConceptParams`, `gatingFactor`, `buildTrueGraph` | — | — | `grep -n '"cells"' protocol/phase8-protocol-v2.md` | **DIRECTLY VERIFIED** | Narrows the graph-misalignment hypothesis (Part 9, hyp. 5) to S4-GW only |
| E24 | `masteredM=0.8` is one shared config value used identically by S1 and S3; S2/S4 have no continuous threshold at all (binary `L`) | §4.9/Part 13 | `src/research/phase8/simulator/{s1,s3}.ts` (`mastered: m >= cfg.shared.masteredM`), `{s2,s4}.ts` (`mastered: L === 1`) | `s1Truth`, `s3Truth`, `s2Truth`, `s4Truth` | — | — | `grep -n 'mastered:' src/research/phase8/simulator/s*.ts` | **DIRECTLY VERIFIED** | — |
| E25 | Mastery is absorbing (monotonic/no-forgetting) in all 4 families — cannot become unmastered | §4.9/Part 13 | `src/research/phase8/simulator/{s1,s2,s3,s4}.ts` | `s1Learn` (no transition at all), `s2Learn`/`s4Learn` ("No forgetting" comments), `s3Learn` (growth strictly non-negative) | — | — | `grep -n 'No forgetting\|has no transition' src/research/phase8/simulator/s*.ts` | **DIRECTLY VERIFIED** | Confirms `itemsToCriterion`'s first-crossing-step definition is valid (no flicker possible) |
| E26 | Exact two-sided p-values/95% CIs for all 70 paired comparisons, via a closed-form df=4 t-CDF, self-checked against the repo's own T_CRIT_975_DF4 | §4.8/Part 8 | new script `verification_scripts/compute_pvalues.py` | `t_cdf_df4`, `two_sided_p_df4` | `appendix_tables/table_PVALUES_all_paired_comparisons.csv` (70 rows) | — | `python3 research_evidence/phase2_results_and_appendix/verification_scripts/compute_pvalues.py` | **DIRECTLY VERIFIED** (self-check: `two_sided_p_df4(2.776) = 0.05002`) | No scipy dependency; exact only because df is fixed at 4 throughout this entire deliverable |

---

## PART 2 — Appendix Code Evidence

**E02 — Condition registry** (`src/research/experiment/conditionRegistry.ts:33-74`):
```ts
export const CONDITION_REGISTRY: readonly ConditionRegistryEntry[] = [
  { conditionId: "C0", estimatorType: "none", selectionPolicyType: "non_adaptive",
    prerequisiteAware: false, stoppingCriterion: "fixed", supportedTrack: "B",
    intendedInterpretation: "The non-adaptive sequencing control..." },
  { conditionId: "C1", estimatorType: "deterministic-mastery", selectionPolicyType: "adaptive",
    prerequisiteAware: true, stoppingCriterion: "mastery-threshold", supportedTrack: "both",
    intendedInterpretation: "Deterministic mastery Variant A ... + prerequisite-aware adaptive selection." },
  { conditionId: "C2", estimatorType: "deterministic-mastery", selectionPolicyType: "adaptive",
    prerequisiteAware: true, stoppingCriterion: "mastery-threshold", supportedTrack: "both",
    intendedInterpretation: "Deterministic mastery Variant B ... The approved provisional default..." },
  { conditionId: "C3", estimatorType: "deterministic-mastery", selectionPolicyType: "adaptive",
    prerequisiteAware: false, stoppingCriterion: "mastery-threshold", supportedTrack: "B",
    intendedInterpretation: "Same estimator as C2, with prerequisite-aware targeting disabled..." },
];
```
Establishes: C1 and C2 differ ONLY in estimator variant (both adaptive + prerequisite-aware); C2 and C3 differ ONLY in `prerequisiteAware`. C0 has no estimator at all (non-adaptive control).

**E03 — Mastery update equations** (`src/domain/learner-model/updateMastery.ts:65-107`, `parameters.ts:10-58`):
```ts
// Correct:   M_new = M_old + α(1 − M_old)·w_d·w_h
// Incorrect: M_new = M_old − β·M_old·w_d        (Variant A, "multiplicative")
//         or M_new = M_old − β·M_old·(1/w_d)    (Variant B, "inverse")
let difficultyFactorApplied = difficultyWeight;
if (!correct && parameters.incorrectDifficultyWeighting === "inverse") {
  difficultyFactorApplied = 1 / difficultyWeight;
}
const gapOrCurrentTerm = correct ? 1 - previousState.mastery : previousState.mastery;
const signedRate = correct ? parameters.correctGainRate : -parameters.incorrectLossRate;
const unweightedDelta = signedRate * gapOrCurrentTerm * difficultyFactorApplied * hintMultiplier;
const appliedDelta = unweightedDelta * conceptWeight;
const clampedResult = clamp(previousState.mastery + appliedDelta, 0, 1);
```
`DEFAULT_MODEL_PARAMETERS` (Variant A, `"multiplicative"`) and `DEFAULT_MODEL_PARAMETERS_V2_INVERSE_DIFFICULTY` (Variant B, `"inverse"`) are otherwise byte-identical (`correctGainRate: 0.12`, `incorrectLossRate: 0.1`, same `difficultyWeights` table `{1:0.8,...,5:1.2}`) — establishes that C1 vs C2 isolates exactly this one branch, nothing else.

**E05 — C1 excluded from Track B** (`src/research/phase8/trackB/runTrackB.ts:193-224`, excerpt):
```ts
const conditionResults: Record<TrackBConditionId, number[]> = { C0: [], C1: [], C2: [], C3: [] };
// ...
for (const conditionId of ["C0", "C2", "C3"] as const) {   // <-- C1 never iterated
  // ... runTrackBSession(..., conditionId, ...)
  conditionResults[conditionId].push(result.kT);
}
```
`TrackBConditionId` includes `"C1"` in its type and the results map is pre-allocated with a `C1: []` slot, but the loop that actually populates it never includes `"C1"` in the iterated tuple — confirms C1 support exists structurally but was never invoked in either pilot run.

**E06 — det-b computed, discarded** (`src/research/phase8/trackA/runTrackA.ts:143-153` + `pipeline/pilot.ts:111-118`):
```ts
// runTrackA.ts — both variants built and both appear in result.learnerMetrics:
const detA = createDeterministicEstimatorAdapter(DEFAULT_MODEL_PARAMETERS);
const detB = createDeterministicEstimatorAdapter(DEFAULT_MODEL_PARAMETERS_V2_INVERSE_DIFFICULTY);
return new Map([[DET_A_ID, detA], [DET_B_ID, detB], /* ...bkt-fit, bkt-default, run-prop, ema... */]);

// pilot.ts — only "det-a" and "bkt-fit" rows are ever read back out:
const detARows = result.learnerMetrics.filter((m) => m.estimator === "det-a");
const bktRows = result.learnerMetrics.filter((m) => m.estimator === "bkt-fit");
// "det-b" rows in the SAME result.learnerMetrics array are never read.
```

**E12 — Prerequisite-ablation isolation** (`src/tutoring/selection/adaptive/targeting.ts:241-293`, excerpt):
```ts
if (config.prerequisiteAware) {
  if (frontierState.consecutiveIncorrect >= config.diagnosticBacktrackConsecutiveIncorrectThreshold) {
    const diagnostic = findDiagnosticBacktrackTarget(frontierConceptId, states, concepts, config, context.sequenceIndex);
    if (diagnostic.conceptId !== null) return { conceptId: diagnostic.conceptId, reason: "diagnostic_probe", ... };
  }
  if (frontierState.consecutiveIncorrect >= config.consecutiveIncorrectRemediationThreshold) {
    const remediation = findRemediationTarget(frontierConceptId, states, concepts, config);
    if (remediation) return { conceptId: remediation.conceptId, reason: "prerequisite_backtrack", ... };
    return { conceptId: frontierConceptId, reason: "remediation", consideredConcepts };
  }
  return { conceptId: frontierConceptId, reason: "progression", consideredConcepts };
}
// prerequisiteAware === false (C3): no backtracking of any kind.
if (frontierState.consecutiveIncorrect >= config.consecutiveIncorrectRemediationThreshold) {
  return { conceptId: frontierConceptId, reason: "remediation", consideredConcepts };
}
return { conceptId: frontierConceptId, reason: "progression", consideredConcepts };
```
Establishes the ablation is clean: the `false` branch is a strict subset of the `true` branch's non-prerequisite behavior (self-remediation + progression), with only `diagnostic_probe`/`prerequisite_backtrack` removed. Difficulty selection (code below this excerpt, not shown) is untouched by the flag.

**E13 — QTM ground-truth event definition** (`src/research/phase8/trackB/runTrackB.ts`, comment + surrounding logic near line 162):
```ts
// itemsToCriterion: first step at which every T_c concept is truly mastered;
// censored at budget if never reached.
```
Confirms the event is defined against the simulator's hidden `mastered` truth flag (`truthLogByStep`/`startTruth` in the surrounding function), not against the estimator's own `ConceptMasteryState.mastery` crossing some threshold — satisfies this project's own stated requirement that QTM be ground-truth-based.

**E14 — Forecast-timing order** (`runTrackA.ts`, `simulateLearnerHistory` + `replayEstimator`):
```ts
// simulateLearnerHistory: truth/response generated independently of any estimator
const { correct, truthByConcept } = learner.respondAndLearn(dq);
observations.push({ ..., correct, pStarTrue: truth.pStar, mTrue: truth.m, masteredTrue: truth.mastered });

// replayEstimator: estimator's PRE-EXISTING state is scored BEFORE being updated with this observation
const preUpdateScore = adapter.readMastery(states[obs.conceptId]);  // scored first
rawScores.push(preUpdateScore);
states = { ...states, [obs.conceptId]: adapter.applyResponse(...) };  // updated after
```
Confirms the order is: truth/response generated → pre-update score read and recorded → estimator updated. No step reads a value generated after the one it is scoring.

**E17 — K(T) ground-truth source** (`src/research/phase8/trackB/runTrackB.ts`):
```ts
// kT/kX: truth of T_c / X_c at the end of the session (whatever step it ended on -- intention-to-treat, B6.1).
const endTruthT = slice.targetConceptIds.map((c) => simulatedLearner.truth(c));
const kT = mean(endTruthT.map((t) => t.m));
```
`simulatedLearner.truth` is the dispatcher's own ground-truth accessor (`dispatch.ts`), never the estimator. Called identically regardless of `conditionId`.

**E18 — C1 vs C2 isolation** (`src/research/experiment/conditions.ts:36-52`):
```ts
C1: { build: () => buildExperimentCondition("C1",
       createDeterministicEstimatorAdapter(DEFAULT_MODEL_PARAMETERS),
       createAdaptiveSelectionAdapter(DEFAULT_ADAPTIVE_SELECTION_CONFIG)) },
C2: { build: () => buildExperimentCondition("C2",
       createDeterministicEstimatorAdapter(DEFAULT_MODEL_PARAMETERS_V2_INVERSE_DIFFICULTY),
       createAdaptiveSelectionAdapter(DEFAULT_ADAPTIVE_SELECTION_CONFIG)) },
```

**E19 — common-random-number design** (`src/research/phase8/simulator/shared.ts`):
```ts
function learnerKey(id: LearnerIdentity, overrides: Partial<DeriveKey>): DeriveKey {
  return { track: "-", familyGroup: id.family, world: id.world, slice: id.sliceId,
            split: id.split, learner: id.learnerId, stream: "profile", concept: "-", index: 0, ...overrides };
}
// id.cell (the condition id) is never referenced -- not in learnerKey, not in opportunityKey.
```
Establishes that the same `(family, world, slice, learnerId)` yields the identical learner profile/item-noise/concept-easiness draws regardless of `conditionId` — the basis for the C1 retrospective reconstruction being deterministic rather than a new draw.

**E23 — S4 cell table** (`protocol/phase8-protocol-v2.md`'s `simulator-config-v2.json`):
```json
"cells": { "S4-ref": { "lambda": 0.30, "phi": 1.0 }, "S4-GF": { "lambda": 0.05, "phi": 1.0 },
           "S4-N":   { "lambda": 1.0,  "phi": 1.0 }, "S4-GW": { "lambda": 0.05, "phi": 0.0 } }
```
`phi` (`trueGraph.ts`, `buildTrueGraph`):
```ts
const uKeep = uniformAt(id.masterSeed, { ...stream: "edgeKeep", concept: edgeKey(i, j) });
if (uKeep < phi) { edges.add(edgeKey(i, j)); continue; }
// else: dropped, random replacement edge added instead
```
`lambda` (`s4.ts`, `gatingFactor`):
```ts
function gatingFactor(graph: TrueGraph, conceptId: ConceptId, L: ReadonlyMap<ConceptId, number>, lambda: number): number {
  const parents = graph.parentsOf.get(conceptId) ?? [];
  const allKnown = parents.every((p) => L.get(p) === 1);
  return allKnown ? 1 : lambda;
}
```
`phi=1.0` ⟺ zero edges dropped (G\*≡G); `lambda=1.0` ⟺ gating factor is always 1 regardless of parent state (gating has no effect). These two lines fully explain the S4-ref/GF/N/GW naming from mechanism, not from the label strings.

**E24 — shared `masteredM` threshold** (`src/research/phase8/simulator/s1.ts:120`, `s3.ts:163`):
```ts
// s1.ts: return { conceptId, pStar, m, mastered: m >= cfg.shared.masteredM };
// s3.ts: return { conceptId, pStar, m, mastered: m >= cfg.shared.masteredM };
```
vs. `s2.ts:144`, `s4.ts:199`:
```ts
// s2.ts: return { conceptId, pStar, m: L, mastered: L === 1 };
// s4.ts: return { conceptId, pStar, m: L, mastered: L === 1 };
```

**E25 — absorbing mastery (no forgetting)** (`s2.ts:111`, `s4.ts:155`, verbatim doc comments):
```ts
/** Pure: on each counted opportunity for a concept with w_qk > 0, L=0 becomes 1 with probability T_k. No forgetting. */   // s2.ts
/** Pure: on a counted opportunity, L=0 becomes 1 with probability kappa(t) * tau_k, ... No forgetting. */                // s4.ts
```
S1 has no transition at all (`theta` fixed after init); S3's `growth` accumulator only ever adds a non-negative `eta_lk` (`s3Learn`), so `theta`/`m` is monotonically non-decreasing. All four families are absorbing with respect to mastery.

---

## PART 3 — Appendix Data Tables

**Table A — Experimental conditions**

| Condition | Estimator | Selection | Prereq-aware | Stopping | Track | Verified runs (either pilot) |
|---|---|---|---|---|---|---|
| C0 | none | non-adaptive | n/a (false by construction) | fixed | B | 750/family × 6 families = 4,500 |
| C1 | deterministic Variant A | adaptive | true | mastery-threshold | both (registered) | **0** |
| C2 | deterministic Variant B | adaptive | true | mastery-threshold | both | 750/family × 6 = 4,500 |
| C3 | deterministic Variant B | adaptive | false | mastery-threshold | B | 750/family × 6 = 4,500 |

(4,500 × 3 = 13,500 Track-B sessions + 60 Track-A contexts = 13,560, matching both pilots' `totalRuns`.)

**Table B — Simulation scenarios:** S1 (policy-invariant sanity check; single concept per item, deterministic truth), S2, S3, S4 with sub-configurations S4-ref/S4-GF/S4-N/S4-GW (parameters not individually re-derived in this pass beyond confirming the shared SHA-256 seeding mechanism — see E04; full per-family equations are in `src/research/phase8/simulator/{s1,s2,s3,s4}.ts` and are flagged **NOT RE-VERIFIED LINE-BY-LINE THIS PASS**).

**Table C — Run accounting**

| Execution | Generated | Worlds | Slices | Conditions (Track B) | Attempted | Completed | Failures |
|---|---|---|---|---|---|---|---|
| 8C-Pilot | 2026-10-27T14:58:15.938Z | 5 | CH07,CH03,CH10 | C0,C2,C3 | 13,560 | 13,560 | 0 |
| Three-metric pilot | 2026-11-04T17:53:27.003Z | 5 (**same 5**, E11) | CH07,CH03,CH10 (**same**) | C0,C2,C3 | 13,560 | 13,560 | 0 |

**Table D — Track A estimator performance:** see `appendix_tables/table_D_trackA_estimator_metrics_by_world.csv` (160 rows: 4 families × 2 estimators × 5 worlds × 4 metrics). Units: log loss (nats), MAE/RMSE/Brier (probability units, 0-1). Level of aggregation: per-world mean over the slice-pooled, learner-pooled test-split predictions within that world. det-b: **NOT AVAILABLE** (not calculated, not fabricated — see E06).

**Table E — K(T) by family × condition × world:** see `appendix_tables/table_E_kT_by_family_condition_world.csv` (90 rows: 6 families × 3 conditions × 5 worlds). Units: mean per-concept mastery estimate at session end, 0-1 scale, pooled over 150 test learners per (family, condition, world) cell.

**Table F — Pairwise comparisons:** see `appendix_tables/table_F_kT_paired_world_differences.csv` (30 rows: 6 families × 5 worlds, both C2−C0 and C2−C3 differences per row). Also reproduced in `01_RESULTS_AND_ANALYSIS.md` Parts 4-5 with t-statistics.

**Table G — QTM / censoring / attainment:** see `appendix_tables/table_G_qtm_censoring_by_family_condition_world.csv` (90 rows: 6 families × 3 conditions × 5 worlds). Columns include `n_learners` (always 150), `attained`, `censored`, `attainment_rate`, conditional and restricted means. Budget = 60 for every row.

**Table H — Question allocation diagnostics: RECOVERED this pass.** See `appendix_tables/table_H_question_allocation_diagnostics.csv` (24 rows: 6 families × 4 conditions), via the deterministic `onRunComplete`-hook replay (E22). Columns: `mean_diverted_share`, `mean_backtrack_precision`, `mean_coverage_fraction`, `never_fully_covered_count`, `reason_totals_json` (counts by selection reason), `difficulty_totals_json` (counts by presented-item difficulty level 1-5), `mean_difficulty_change_after_{correct,incorrect}` (NOTE: not filtered to same-concept consecutive pairs — conflates within-concept difficulty adaptation with between-concept switches; reported descriptively only, see `01_RESULTS_AND_ANALYSIS.md` Part 9's caveat), and attained-vs-censored group means for diverted share, coverage, and K(T). `maxReuse`/`distinctItems` were computed per-session during the replay but not carried into this aggregated export — a small, explicitly-flagged residual gap, not filled with a placeholder.

**Table C1 — C1 retrospective K(T)/QTM:** `appendix_tables/table_C1_kT_by_family_world.csv` (30 rows) and `table_C1_qtm_by_family_world.csv` (30 rows), labeled `RETROSPECTIVE_EXPLORATORY_NOT_CONFIRMATORY` in every row.

**Table det-B — Variant B Track-A metrics:** `appendix_tables/table_detB_trackA_metrics_by_world.csv` (180 rows: 4 families × 3 estimators × 5 worlds × 3 metrics).

**Table PVALUES — all 70 paired comparisons:** `appendix_tables/table_PVALUES_all_paired_comparisons.csv` (70 rows), columns `mean_diff`, `sd_diff`, `se_diff`, `t_df4`, `p_two_sided_exact`, `ci95_lo`, `ci95_hi`.

**Table I — Reproducibility:** see Part 4 below (Reproducibility Manifest) for the full content of this table.

---

## PART 4 — Reproducibility Manifest

| Item | Value |
|---|---|
| Repository | `non-adaptive-tutor` (local path `/Users/advikpunugu/Desktop/non-adaptive-tutor`) |
| Last commit touching Phase 8 pipeline code | `bde783a` "phase8b: execute the authorized 8C-Pilot, save results" |
| Working-tree state at time of this audit | **Dirty** — `git status --short` lists 94 lines (modified + untracked), including Stage 2/3/4 UI/persistence work and `docs/research-design.md`/`docs/experimental-conditions.md`/`docs/research-decisions.md`. Neither stored pilot artifact is itself part of this diff (both are gitignored, generated output), but `src/research/phase8/pipeline/threeMetricPilot.ts` and `src/research/phase8/metrics/threeMetrics.ts` (the code that produced `three-metric-pilot-report.json`) are **untracked/uncommitted** — there is no single commit hash that, checked out alone, reproduces that specific report. The 8C-Pilot report (`pilot-report.json`) **is** reproducible from commit `bde783a` alone. |
| Runtime | Node `v24.2.0` |
| Key dependency versions | `next@16.3.4`, `typescript@^5` (resolved `5.9.3`), `vitest@^5.0.0` (resolved `5.0.0`) |
| masterSeed | `"RISE-PHASE8-v2"` (literal, `protocol/phase8-protocol-v2.md:1487`) |
| Worlds used | 1–5 (both pilots) |
| Slices used | CH07, CH03, CH10 (Amendment A1's 3 author-approved primary slices) |
| `pilot-report.json` SHA-256 | `7387764b3a979fd4ed82a4d2438c1382f672d890fef9131792f033d81c323403` |
| `three-metric-pilot-report.json` SHA-256 | `d94c39bbba9b69536dd065fcab900c2d38948b9e0bc61ac29c88033eb91642a3` |
| `pilot_descriptive_stats.json` SHA-256 | `a5802819783817d98aabd4569e192224b9e7057328c66422a9118e4211fce360` |
| `three_metric_pilot_stats.json` SHA-256 | `c8958ff281ebaa65ccb8695d6748d10311be3054aec75573f801e2e55cb1790c` |
| Unit test status (this session) | `npm test` → 97 files, **1015/1015 tests passed**, 24.97s |
| `protocol/APPROVAL.md` | **Does not exist.** No confirmatory authorization on file. |
| This audit's own non-destructive verification commands | `python3 research_evidence/phase2_results_and_appendix/verification_scripts/recompute_metrics.py`; `python3 .../verification_scripts/export_tables.py` — both read-only against the two JSON files above, zero new simulation runs, zero writes outside `research_evidence/` |
| **Completion-pass additions (this pass): three new deterministic/retrospective scripts actually EXECUTED** | `runC1Retrospective.ts` (4,500 new C1 Track-B sessions, 0 failures, 52.5s) → `retrospective_artifacts/c1_trackB_retrospective_2026-11-08T03-34-18-379Z.json`, SHA-256 `acd5bfd6fc8f7771911283d10b747dbfb11d6c9c0a07db8a4fde45b3f3dbb186`; `runDetBReplay.ts` (60 Track-A contexts replayed, 0 failures, 150.1s) → `retrospective_artifacts/detB_trackA_replay_2026-11-08T03-37-23-351Z.json`, SHA-256 `315a792b853698faea19b7dfca32668f1ba931f7e71ce5e2f2ad27d3dca3adaa`; `runDiagnosticsReplay.ts` (18,000 Track-B sessions across all 4 conditions, 0 failures, 224.2s) → `retrospective_artifacts/diagnostics_replay_2026-11-08T03-43-13-693Z.json`, SHA-256 `be96bee325020546a72b6ae0f665d15e42f55724f3385354fd4087109bdc10db`. Each artifact records its own `generatedAt`, `sourceCommit` (git HEAD at generation time), and a sibling `.sha256.txt` file. **All three ran against the SAME masterSeed/worlds/slices as the original pilots** (no new world indices, no new masterSeed) and are explicitly labeled inside their own JSON (`"LABEL"` field) as retrospective/replay, never confirmatory. |
| **Original artifacts re-verified unchanged after all three runs** | `pilot-report.json` SHA-256 `7387764b3a979fd4ed82a4d2438c1382f672d890fef9131792f033d81c323403` (unchanged); `three-metric-pilot-report.json` SHA-256 `d94c39bbba9b69536dd065fcab900c2d38948b9e0bc61ac29c88033eb91642a3` (unchanged) — re-hashed immediately after the three completion-pass scripts finished, matching Part 4's originally-recorded values exactly. |
| **`compute_pvalues.py`** | Closed-form df=4 Student-t p-value/CI script, self-checked (`two_sided_p_df4(2.776) = 0.05002`), reads the two original pilot artifacts plus the three new retrospective artifacts, writes `appendix_tables/table_PVALUES_all_paired_comparisons.csv` (70 rows). Zero simulation of its own. |
| **Protected paths re-checked after this pass** | `git status --short -- src/domain/learner-model src/tutoring/selection/adaptive data/question-bank src/research/phase8 protocol` — unchanged from before this pass began; no file under any of these paths was edited by this completion pass (only new files were added under `research_evidence/`, and `src/research/phase8/trackB/runTrackB.ts`'s pre-existing `onRunComplete` hook, already additive and already present before this pass, was read and invoked, never modified). |

**Explicit limitation, stated rather than hidden:** because the three-metric pilot's own pipeline code is part of the uncommitted working tree, a bit-for-bit reproduction of `three-metric-pilot-report.json` from a clean checkout is **not currently possible** without also restoring that uncommitted code — this audit does not claim bit-for-bit reproducibility for that artifact, only "recomputed and matched" against the artifact as it exists on disk right now.

---

## PART 5 — Appendix-Ready Content (Appendices A–H)

**Appendix A — Experimental conditions and implementation.** Four Phase 5 conditions are registered (`src/research/experiment/conditionRegistry.ts`): C0 (non-adaptive, performance-independent, fixed-length control), C1 (deterministic Variant A estimator + prerequisite-aware adaptive selection — defined in code, never executed), C2 (deterministic Variant B + prerequisite-aware adaptive selection — the live product's provisional default and this study's primary adaptive arm), C3 (C2's estimator with prerequisite-awareness disabled — the targeted ablation). C1/C2 differ only in the incorrect-response branch of the mastery-update equation (multiplicative vs inverse difficulty weighting, Appendix A excerpt E03); C2/C3 differ only in whether `targeting.ts` may ever select a prerequisite concept for diagnostic probing or remediation (E12).

**Appendix B — Synthetic learner specifications.** Four simulator families (S1-S4) plus S4 sub-configurations (S4-ref, S4-GF, S4-N, S4-GW) generate per-learner, per-concept hidden parameters via a SHA-256-keyed deterministic RNG (`src/research/phase8/rng/derive.ts`), seeded from a single `masterSeed` string combined with family/cell/world/slice/learner identifiers. S1 is specifically constructed so true mastery accrual is policy-invariant (verified: C0/C2/C3 K(T) identical to 5 decimals in every world, `01_RESULTS_AND_ANALYSIS.md` §5). Per-family equations are not individually re-derived in this appendix pass (flagged NOT RE-VERIFIED beyond the shared seeding mechanism, Table B above).

**Appendix C — Experimental configurations and run accounting.** 13,560 total runs per pilot (60 Track-A contexts + 13,500 Track-B sessions), 0 failures, both pilots. The two pilots are **not** independent executions — same masterSeed, same 5 worlds, same 3 slices (E11) — they are one simulation sample scored by two different metric sets.

**Appendix D — Estimator comparisons.** Deterministic Variant A ("det-a") vs fitted BKT ("bkt-fit") is fully recovered for both the original (log loss, MAE) and reconciliation-amendment (Brier, RMSE) metric pairs, across 4 Track-A family configurations (S1, S2, S3, S4-ref), all world-level (n=5), all paired, now with exact p-values/CIs (E26). BKT-fit outperforms det-A in S2 and S4-ref; det-A outperforms (or is statistically indistinguishable from) BKT-fit in S1 and S3. **Deterministic Variant B's own accuracy is now RECOVERED via deterministic replay (E21)**, cross-checked to an exact (0-diff) match on det-a/bkt-fit before being trusted: det-B is nearly indistinguishable from det-A in every family (differences of 0.001-0.002, not statistically significant in S4-ref), closing what was the single most consequential gap in the first pass's estimator-comparison appendix.

**Appendix E — Sequencing and ablation comparisons.** C0 vs C2 (Table E/F): C2 shows lower K(T) than C0 in 4 of 5 differentiated families and lower simultaneous-attainment rate (Table G) in all 5 differentiated families. C2 vs C3 (the prerequisite ablation): disabling prerequisite-awareness (C3) *raises* K(T) relative to C2 in 4 of 5 differentiated families and *raises* attainment counts in every family with non-trivial attainment — i.e., in this sample, the prerequisite-aware mechanism does not show a measured benefit on either outcome; whether this reflects a genuine property of the mechanism or an artifact of this specific (non-independent, n=5-world) sample is explicitly not resolved by this data. **C1 vs C2 (RETROSPECTIVE EXPLORATORY COMPLETION — NOT CONFIRMATORY, E20):** C1 and C2 are nearly indistinguishable on both K(T) (differences of 0.001-0.005) and attainment counts (differ by ≤7/750 in every family) — confirming that the C0/C3-vs-adaptive gaps above are attributable to the *selector*, not the mastery-update variant. The mechanism-level hypotheses behind the gap are now mostly directly measured rather than merely hypothesized (Appendix H, E22).

**Appendix F — Evaluation metrics and statistical procedures.** K(T): mean per-concept estimated mastery at session end, pooled over test learners within a world, then averaged across 5 worlds for inference. QTM/itemsToCriterion: ground-truth, simultaneous-attainment event (every target concept's hidden `mastered` flag true at once) within a 60-question budget; right-censored at budget if never attained (E13); reported with explicit attainment counts/rates and a budget-censored restricted mean, never a naive mean-among-survivors treated as unconditional. All inferential statistics use the 5 world-level means as the unit of analysis (never the 750 pooled learner-level trials); no p-values are computed (n=5 is too small to support a trustworthy parametric p-value; a fixed `|t| > 2.776` yardstick, taken from this repo's own pre-existing constant, is used purely descriptively). 28 total unadjusted comparisons are reported across both documents; no multiple-comparison correction is applied or claimed as prespecified.

**Appendix G — Reproducibility and verification.** See Part 4 above in full; summarized here: masterSeed `RISE-PHASE8-v2`, worlds 1-5, slices CH07/CH03/CH10, commit `bde783a` for the 8C-Pilot (fully reproducible), uncommitted pipeline code for the three-metric pilot (not currently bit-for-bit reproducible from a clean checkout), 1015/1015 tests passing, no `protocol/APPROVAL.md` on file.

**Appendix H — Additional diagnostics and limitations (updated, completion pass).** (1) C1 Track-B data is now available via a single, clearly labeled **RETROSPECTIVE EXPLORATORY COMPLETION** run (E20) — C1 tracks C2 closely everywhere, so any C1-vs-C2 sequencing claim should read "negligible difference," not "unsupportable." (2) Variant B's own Track-A predictive accuracy is now recovered via deterministic replay (E21), cross-checked to an exact match on det-a/bkt-fit first. (3) The mechanism-level explanation for adaptive underperformance on QTM is now **directly measured, not just structurally plausible**: C1/C2 divert 19-25% of budget to off-target concepts (zero for C0/C3, by construction); C1/C2 average only 54-69% target-concept coverage vs. C0's exact 100.00%; attained sessions show ~95-100% coverage vs. ~54-67% for censored sessions in the same condition; graph misalignment (φ<1.0) is now known to be **absent** in S4-GF specifically (φ=1.0 there), narrowing that hypothesis to S4-GW only (E22, E23). (4) The 8C-Pilot and three-metric pilot are the same 5 worlds scored twice, not two independent samples — both are now further "burned" by this pass's three additional replays over the identical worlds, for any future claim of a blind confirmatory draw. (5) No `protocol/APPROVAL.md` exists; nothing in either document of this deliverable is confirmatory, including this pass's new retrospective/replay results, which are explicitly and repeatedly labeled as such.

---

## PART 6 — Scope note on this pass's own limits

The **first pass** performed zero new simulation executions (every number was read or recomputed from the two already-persisted pilot JSON files).

**This completion pass executed three new, bounded, explicitly-authorized computations** — one single retrospective execution (C1 Track-B, 4,500 sessions, genuinely new because C1 had never been run before) and two deterministic replays (det-B Track-A, 60 contexts; question-allocation diagnostics, 18,000 sessions, both reproducing already-executed cells using identical seeds) — per the coordinator's explicit authorization to do exactly this class of work. None of the three:
- used a new `masterSeed` or new world indices (all reused `RISE-PHASE8-v2`, worlds 1-5, the same 3 slices, the same 50 learner ids),
- modified `pilot-report.json`, `three-metric-pilot-report.json`, any file under `protocol/`, or any protected selection/mastery-update source file (re-verified via `git status --short` against the full protected-path list immediately after all three runs completed, Part 4),
- was treated anywhere in either document as confirmatory — every new result carries an explicit `RETROSPECTIVE EXPLORATORY COMPLETION — NOT CONFIRMATORY` or `DETERMINISTIC REPLAY` label, inside both the JSON artifacts themselves and every place this document or its companion cites them.

**Not executed, and explicitly not attempted, per the coordinator's stated boundaries:** any fresh confirmatory experiment, any new independent world/seed, any edit to `protocol/phase8-protocol-v2.md` or the proposed amendment, any change to mastery-update/selector logic or thresholds, any git commit/push/merge. **One small item remains genuinely incomplete rather than done:** `maxReuse`/`distinctItems` (item-repetition statistics) were computed per-session during the diagnostics replay but not carried into the aggregated summary this pass exports — re-deriving them would need one further short, equally deterministic replay pass, not run in this session for time reasons, and is reported as outstanding rather than filled in with an estimate.

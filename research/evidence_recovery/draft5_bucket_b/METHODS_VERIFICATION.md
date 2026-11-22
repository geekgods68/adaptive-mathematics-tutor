# Methods Verification — B01-B09

## B01 — C0 non-adaptive sequencing (VERIFIED-SOURCE)

Source: `src/research/phase8/trackB/c0Slice.ts`, function `buildC0SliceSequence`.

**Pseudocode:**
```
given targetConceptIds (already in curriculum order), Q_slice, budget, identity:
  perConcept = floor(budget / |targetConceptIds|)
  remainder  = budget - perConcept * |targetConceptIds|
  for i, conceptId in enumerate(targetConceptIds):
      blockLength = perConcept + (1 if i < remainder else 0)
      for j in 0..blockLength-1:
          level = (j mod 5) + 1                      # cycles L1->L5 within each concept's block
          candidates = unused items at (conceptId, level)
          if none: candidates = unused items at (conceptId, ANY level)   # fallback
          if none: throw                                                 # pool exhaustion -> hard error, not silent skip
          pick = items[floor(U(seed, conceptId, drawIndex) * |candidates|)]   # seeded uniform, no replacement
          append pick to sequence; remove from candidates
  return sequence
```
- **Fixed/sorted/seeded-random/cyclic?** All four, layered: concept order is fixed (curriculum order); level order is cyclic (L1→L5 repeating); item choice *within* a (concept, level) cell is seeded-pseudorandom (`uniformAt(masterSeed, ...)`), without replacement.
- **Does difficulty or coverage affect order?** Difficulty determines the *level* visited at each step (deterministic cycling), not selected adaptively. Coverage is guaranteed by construction (every target concept gets a block).
- **Are responses ever consulted?** **No.** The function takes no response/truth/mastery argument at all — confirmed by its full signature (`targetConceptIdsInCurriculumOrder`, `qSlice`, `budget`, `identity`) and body (no read of any `ConceptMasteryState` or truth value anywhere).
- **Recurrence/pool exhaustion:** items are drawn without replacement from a per-(concept,level) pool; if a level's pool is exhausted, falls back to any level for that concept; if the concept's entire pool is exhausted, throws (`"C0-slice: concept ... has no remaining items ..."`) — a hard failure, not silent reuse.
- **Tie-breaking:** candidate lists are `.sort()`-ed (lexicographic by question id) before the seeded draw, so the RNG always indexes into a canonically-ordered list — fully deterministic given the seed.
- **Determinism:** the RNG key is `(masterSeed, world, sliceId, learnerId, conceptId, drawIndex)` — same learner, same slice, same world ⇒ byte-identical sequence every time.
- **Is "non-adaptive" structurally true?** Yes — no code path in this function reads any evidence about the learner's performance; sequencing is a pure function of curriculum structure + a fixed seed.
- **Is exactly-100% target coverage a structural guarantee or an empirical finding?** **Structural guarantee**, not a hypothesis later confirmed by data — the loop visits every `targetConceptIds[i]` exactly once and always allocates it `blockLength ≥ 1` items (for any slice with `budget ≥ |targetConceptIds|`, true for all 3 pilot slices at budget=60). The diagnostics-replay measurement of "C0 = 100.00% coverage, 0/750 shortfalls, every family" (Phase 2 pass) is therefore a *confirmation* of a structural property, not an independent empirical discovery.

## B02 — Full adaptive selector (C1/C2/C3) (VERIFIED-SOURCE)

Sources: `src/tutoring/selection/adaptive/{config.ts,targeting.ts,candidateSelection.ts,adaptiveSelectionPolicy.ts}`.

**Every threshold, verified against `config.ts:92-113` (`DEFAULT_ADAPTIVE_SELECTION_CONFIG`) directly — none taken on faith:**

| Constant | Value | Role |
|---|---|---|
| `masteryProgressionThreshold` | **0.75** | mastery ≥ this (AND evidence ≥ minEvidenceCount) ⇒ concept "done" |
| `masteryRemediationThreshold` | **0.35** | prerequisite mastery ≤ this ⇒ "needs attention" during backtracking |
| `minEvidenceCount` | 3 | below this, concept is "insufficient evidence" regardless of mastery value |
| `consecutiveIncorrectRemediationThreshold` | 2 | triggers ordinary same/prerequisite-concept remediation |
| `diagnosticBacktrackConsecutiveIncorrectThreshold` | 4 | triggers the stronger diagnostic-probe mechanism (checked first, can select an already-mastered prerequisite) |
| `diagnosticStalenessThreshold` | 8 | sequence-steps since last observation before a prerequisite is eligible for diagnostic re-probing |
| `maxPrerequisiteBacktrackDepth` | 5 | hop bound on both backtracking searches |
| `difficultyByMastery` | [≤0.3→L1, ≤0.45→L2, ≤0.65→L3, ≤0.85→L4, ≤1→L5] | mastery→difficulty band table |
| `diagnosticDifficultyForLowEvidence` | L2 | difficulty used while evidence < minEvidenceCount |
| `maxConsecutiveSameDifficulty` | 3 | same difficulty 3× running ⇒ nudge away by 1 level |
| `questionFamilyRepetitionLimit` | 1 | soft cap on same-family reuse |
| `misconceptionEvidenceMinCount` | 2 | tally threshold before a misconception counts toward candidate scoring |

**(The previously-circulated figures "mastery 0.75" / "remediation 0.35" are CONFIRMED CORRECT, not contradicted — this is a case where the pre-existing claim survives independent verification.)**

**Decision-order table (`chooseTargetConcept`, `targeting.ts:213-298`):**

| Step | Condition | Outcome |
|---|---|---|
| 1 | Every curriculum-order concept mastered | `reason: "no_eligible_concept"`, `conceptId: null` |
| 2 | Frontier concept has `< minEvidenceCount` observations | `reason: "insufficient_evidence"`, target = frontier itself |
| 3 (prerequisiteAware only) | `consecutiveIncorrect ≥ diagnosticBacktrackConsecutiveIncorrectThreshold (4)` AND a stale/never-observed prerequisite exists | `reason: "diagnostic_probe"`, target = that prerequisite (temporary) |
| 4 (prerequisiteAware only) | `consecutiveIncorrect ≥ consecutiveIncorrectRemediationThreshold (2)` AND a weak/unobserved prerequisite exists within 5 hops | `reason: "prerequisite_backtrack"`, target = that prerequisite |
| 5 | `consecutiveIncorrect ≥ consecutiveIncorrectRemediationThreshold (2)`, no backtrack target found (or `prerequisiteAware=false`) | `reason: "remediation"`, target = frontier itself |
| 6 | none of the above | `reason: "progression"`, target = frontier itself |

**Difficulty assignment (`chooseTargetDifficulty`, `targeting.ts:324-354`):** evidence < 3 ⇒ fixed diagnostic difficulty (L2); else difficulty = band lookup on current mastery; then: if the last `maxConsecutiveSameDifficulty` (3) presented items were all the same difficulty, nudge by ±1 (toward L5 if <5, else toward L1).

**Candidate filtering/scoring (`candidateSelection.ts:49-111`), filter order:** concept membership → not-already-presented → question-family soft cap (relaxed back to the unfiltered pool if it would empty candidates) → exact target difficulty (widened outward by `|level−target|` if none at the exact level). **Scoring:** `score = 10×misconceptionOverlap + (5 if exact difficulty else −|Δdifficulty|)`, highest score wins, ties broken by ascending question id (fully deterministic).

**Termination/fallback (`adaptiveSelectionPolicy.ts:67-120`, `selectAdaptiveQuestion`):** tries the concept `chooseTargetConcept` names first; if its pool is exhausted, falls through to the next not-yet-mastered concept in curriculum order (visits each concept at most once); returns `selected: null`/`fallbackUsed: "exhausted"` only if literally no concept has any eligible candidate left.

**Manuscript-ready methods paragraph (new text, not altering the manuscript itself):**
> "The adaptive policy selects a target concept via a fixed decision hierarchy: diagnostic re-probing of a stale prerequisite (triggered after 4 consecutive incorrect responses on the current concept), ordinary prerequisite remediation (triggered after 2), self-remediation, or curriculum progression, in that priority order; a concept counts as mastered only once its estimated mastery reaches 0.75 *and* it has accumulated at least 3 observations. Difficulty is chosen from a fixed mastery-to-difficulty band table (five bands spanning mastery 0-1) and nudged away from three consecutive repeats of the same level. The resulting target concept and difficulty jointly filter the question pool (concept membership, prior non-exposure, a soft per-question-family repetition cap, and difficulty, widened outward if the exact level is unavailable); the remaining candidates are ranked by misconception-evidence overlap and difficulty proximity, with question id as a final deterministic tie-break."

## B03 — C2-vs-C3 downstream check (VERIFIED-SOURCE; single-mechanism ablation IS defensible)

Beyond the already-established isolation at `targeting.ts:242-293` (the `if (config.prerequisiteAware)` branch controlling only `diagnostic_probe`/`prerequisite_backtrack`), this pass read the full downstream pipeline the flag could theoretically also influence:
- `chooseTargetDifficulty` (`targeting.ts:324`) — takes no `prerequisiteAware`-dependent input; identical code path for C2 and C3.
- `selectCandidateQuestion` (`candidateSelection.ts`) — no reference to `prerequisiteAware` anywhere in the file; filtering/scoring/tie-breaking are identical.
- `selectAdaptiveQuestion`'s fallback loop (`adaptiveSelectionPolicy.ts:87-100`) — operates on `context.curriculumOrder`, not on the flag.

**Conclusion: "single-mechanism ablation" is a defensible, source-verified description.** The only code difference between C2 and C3 is which two `TargetConceptDecision` branches (`diagnostic_probe`, `prerequisite_backtrack`) are reachable; everything downstream of "which concept was chosen" is byte-identical code.

## B04 — Multi-concept attribution weights (VERIFIED-SOURCE)

Sources: `src/domain/learner-model/updateMastery.ts` (`applyResponseEvidence`, lines ~166-199), `src/domain/questions/types.ts:97` (`conceptWeights?: Record<string, number>`).

- **Definition:** a question's `conceptWeights` (optional field; absent ⇒ `{ [primaryConceptId]: 1 }`, a single-concept default — confirmed at `src/research/phase8/slices/selectSlices.ts:33`'s `effectiveConceptWeights`, and the live-domain path reads `evidence.conceptWeights` directly off the `ResponseEvidence`).
- **Do weights sum to 1? NOT REQUIRED, and NOT NORMALIZED at update time.** `applyResponseEvidence` iterates `Object.keys(evidence.conceptWeights)` and calls `updateMastery(existing, evidence, weight, parameters)` with the **raw** weight value for each concept — there is no division by the sum of weights anywhere in this file. (Contrast: the Phase 8 *simulator's* `normalizedWeights()` helper, `shared.ts:26`, DOES normalize to sum 1 — but that is a separate system serving simulated-learner response generation, not the live domain's mastery update. Conflating the two would be an error; they are verified here as genuinely distinct.)
- **Does weight depend on number of tags?** No automatic scaling — if authored weights happen to sum to more or less than 1 across a question's concepts, the raw values are used as-is. The question-bank audit script (`scripts/audit-rise-questions.ts:59-67`) only checks each weight is positive, finite, and references a concept also in the question's own `conceptIds` — it does **not** check the weights sum to 1 for any question.
- **Same weight per concept, same rule correct/incorrect?** Yes — the SAME `weight` value for a given concept is used as `conceptWeight` regardless of `correct`; it multiplies the final `appliedDelta` identically on both branches (`appliedDelta = unweightedDelta * conceptWeight`, `updateMastery.ts:146`).
- **Update order:** each concept's update reads its prior state from the *original* `currentStates` snapshot (not from partially-updated sibling concepts), so the per-concept updates are independent of iteration order — `Object.keys()` order is irrelevant to the result.
- **Clamping:** `clamp(previousState.mastery + appliedDelta, 0, 1)` applied per-concept, identical to the single-concept case.
- **Missing/invalid weight handling:** an empty `conceptWeights` map throws explicitly (`"applyResponseEvidence: evidence for question ... has an empty conceptWeights map"`); a zero or negative weight is not re-validated at update time (would silently produce a zero or sign-reversed delta) — this is prevented for authored bank content by the Stage-1 audit gate, but is not a runtime guard inside `updateMastery` itself.
- **Not conflated with prerequisite propagation:** confirmed — the same doc comment states explicitly that a question's `prerequisiteConceptIds` are "never updated here, by design."

## B05/B07 — S1-S4 generative equations (VERIFIED-SOURCE)

Reused verbatim from the Phase 2 completion pass (`research_evidence/phase2_results_and_appendix/01_RESULTS_AND_ANALYSIS.md` Part 13), independently re-confirmed by this pass's own reading of the same four files. Summary table:

| Family | Init | Transition | Response P(correct) | Truth/mastery | Can un-master? |
|---|---|---|---|---|---|
| S1 | θ(0)=μ+u+c+offset | **none** (stationary) | clip(g+(1−g−s)·σ(θ−b)) | m=σ(θ); mastered: m≥0.8 | No (fixed forever) |
| S2 | L(0)~Bernoulli(pL0) | counted-opportunity: L:0→1 w.p. T | L(1−S)+(1−L)G | m=L; mastered: L=1 | No ("no forgetting") |
| S3 | θ0=μ+u+c+offset | growth += η·exp(ν) per counted opportunity (non-negative, correctness/difficulty-independent) | clip(g+(1−g−s)·σ(θ(t)−b)) | m=σ(θ(t)); mastered: m≥0.8 | No (θ monotone non-decreasing) |
| S4 | L(0)~Bernoulli(κ(0)·π) | counted-opportunity: L:0→1 w.p. κ(t)·τ, κ from G\*-parent state | L(1−slip(level))+(1−L)guess(level) | m=L; mastered: L=1 | No ("no forgetting") |

`masteredM=0.8` is the single shared config value used identically by S1 and S3 (`cfg.shared.masteredM`, one field, no per-family override — confirmed by grep, zero other definitions of this threshold exist). S2/S4 have no separate threshold at all; mastery IS the binary latent state. Comparison operator is `>=` (inclusive) in both S1 and S3. Timing: `truth(conceptId)` always reflects state as of the call; `runTrackB.ts` reads it once before any response (`kStart`) and once after the final response (`kT`), and the per-step map after each `respondAndLearn` call (used for `itemsToCriterion`'s first-crossing search).

**Manuscript Section 3.7 placeholder — exact replacement text:**
> "Continuous-latent families (S1, S3) define a concept as mastered once its logistic-transformed ability estimate m=σ(θ) meets or exceeds 0.80, the single shared threshold used identically for both families and for both the K(T) outcome (the raw continuous m) and the QTM outcome (the thresholded boolean). Binary-latent families (S2, S4) have no separate threshold: the latent mastery state L∈{0,1} IS the ground-truth mastery indicator. In all four families, mastery is absorbing — no family's transition rule permits L or θ to decrease, so once a concept is mastered (by either definition) it remains mastered for the rest of the session."

**Ground-truth leakage check, extended beyond Track A's forecast-timing (already confirmed no leakage, B08):** `shared.ts`'s own top-of-file comment states the design intent directly: "None of this imports from `src/domain/learner-model/` or `src/tutoring/selection/` ... the simulator provides ground truth that the estimators and policies under test must never see." Confirmed by import inspection: `simulator/*.ts` import only from `rng/derive.ts` and `simulator/shared.ts`/`trueGraph.ts` — no import of any tutoring/estimator module in any of the four family files or `dispatch.ts`.

## B06 — S4-ref/GF/N/GW precise meaning + graph comparison (RECOMPUTED-EXISTING)

λ/φ table reused from the Phase 2 pass; **Jaccard/precision/recall now computed directly this pass** (`scripts/computeB06Jaccard.ts`, output: `data/b06_graph_comparison.csv`, 60 rows = 4 cells × 3 slices × 5 worlds). This runs the real, unmodified `buildTrueGraph` function against the real curriculum concepts for the actual 3 pilot slices and all 5 pilot worlds — a static, deterministic graph construction, not a learner simulation.

| Cell | λ | φ | Jaccard(G, G\*) within slice | Interpretation |
|---|---|---|---|---|
| S4-ref | 0.30 | 1.0 | **1.0000, every slice, every world** | G≡G\* exactly |
| S4-GF | 0.05 | 1.0 | **1.0000, every slice, every world** | G≡G\* exactly — **no graph misalignment exists in this cell** |
| S4-N | 1.00 | 1.0 | **1.0000, every slice, every world** | G≡G\* exactly (moot anyway — gating has zero effect since λ=1) |
| S4-GW | 0.05 | 0.0 | **0.0000-0.1429 across worlds/slices** (never above 0.14) | G\* is almost entirely scrambled relative to G within the slice |

**New, previously-unstated finding:** for S4-GW, most (world, slice) cells retain **zero or one** within-slice prerequisite edges in G\* out of 4-7 in G (`E_G*` column of the CSV) — the random-replacement mechanism (`trueGraph.ts`'s φ=0 branch draws a replacement edge from the *entire* curriculum's topological order, not constrained to stay within one slice) means most replacement edges land *outside* the slice entirely. So S4-GW's G\* isn't merely "a different, comparably-structured graph" within the slice — it is "almost no graph at all" within the slice. This refines (not just confirms) the existing finding that S4-GF has zero misalignment while S4-GW has severe misalignment: the severity in S4-GW is sharper than "scrambled," closer to "absent."

## B08 — Pre-response prediction integrity (VERIFIED PRE-RESPONSE)

**Verdict: VERIFIED PRE-RESPONSE.** Execution trace (`src/research/phase8/trackA/runTrackA.ts`): `simulateLearnerHistory` calls `learner.respondAndLearn(dq)` → `{correct, truthByConcept}` generated independently of any estimator → `replayEstimator` reads `adapter.readMastery(states[obs.conceptId])` (the estimator's state as of *before* this observation) and records it as `preUpdateScore` → estimator is updated with the just-observed response only afterward. No step reads a value generated after the one it scores.

**Test(s) exercising this path:** `tests/research/phase8/runTrackA.test.ts` (unit tests over `runTrackA`/`simulateLearnerHistory`/`replayEstimator`) and `tests/research/phase8/pilot.test.ts` (end-to-end over the full pilot pipeline that calls this code 60 times with real config). Neither test is itself named/labeled as a "leakage" test specifically, so this is traced via direct code-path reading plus confirmation that the exercising tests pass (`npm test`, 1015/1015), not via a dedicated, explicitly-labeled leakage assertion — reported honestly as VERIFIED PRE-RESPONSE by source-and-execution tracing, not as "a named leakage test exists and passes."

## B09 — Pairing/seed design: precisely what is and isn't matched (VERIFIED-SOURCE)

- **World-seed generation:** a single literal `masterSeed = "RISE-PHASE8-v2"` (`protocol/phase8-protocol-v2.md:1487`); "worlds" are an integer index (1-5 in both pilots) folded into every `derive()` key, not separate seed strings.
- **Learner IDs:** `"pilot-000"`..`"pilot-049"` (50 per world×slice), literal strings, part of the RNG key.
- **RNG streams:** separate named streams within one key space — `"profile"` (learner-level mu/gamma/s/nu/concept-offset draws), `"conceptParams"` (world-level concept easiness/BKT/S4 params), `"itemNoise"`, `"opp"`/`"learn"`/`"response"`/`"mixture"` (opportunity-indexed) — confirmed in `shared.ts`.
- **Common-random-numbers design, exactly what IS matched:** `learnerKey`/`opportunityKey` (the functions that key every learner-profile, item-noise, and concept-easiness draw) take `{family, world, sliceId, split, learnerId}` — **`cell` (the condition id) is never part of any key** (grep-confirmed, zero occurrences of `id.cell` inside `learnerKey`/`opportunityKey`/`conceptParamKey`/`paramKey`). So the same `(family, world, slice, learnerId)` always yields the identical hidden learner profile, item noise, and concept-easiness values regardless of which condition (C0/C1/C2/C3) is sequencing it.
- **Exactly what is NOT matched:** the *opportunity index* passed into `opportunityKey` for the "learn"/"response"/"mixture" streams is **the count of how many times that specific concept has actually been presented to that learner so far under that specific condition's sequence** — not a fixed step number. Because C0/C1/C2/C3 choose different items in different orders for the same hidden learner, each condition reaches a given concept's *n*-th opportunity at a different sequence step, and after the first point of divergence, the SAME opportunity-index draws are consumed in a different order (or not consumed at all, if a concept is visited fewer times under one condition). **This means response *trajectories* are NOT guaranteed identical across conditions once their selected items diverge — only the underlying hidden-learner PARAMETERS are matched, never the realized sequence of (item, response) pairs.** The repo's own top-of-file comment in `runTrackB.ts` ("the same identity across all four conditions reuses the identical underlying draws") is true at the level of parameter draws but could be misread as a claim about matched trajectories; this report states the distinction explicitly because the coordinator asked not to claim trajectory matching without code enforcement, and no code anywhere enforces trajectory-level matching.
- **Slice stratification:** each of the 3 slices (CH07/CH03/CH10) uses its own `sliceId` in every key, so a learner's draws in one slice are independent of the same learner-id's draws in another slice.

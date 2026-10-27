# Phase 8 Technical Briefing

Prepared 2026-10-24, for a scientific reviewer designing the Phase 8
experimental protocol who does not have repository access. Every claim
below is cited to a specific file and exported function/type/constant,
and derived from reading the actual current source — not from the
development log's own narrative summaries. Where the log and the code
could conceivably drift, the code is authoritative and is what is
described here.

**Scope note:** this document only describes what exists. It makes no
recommendation about simulator design, mastery thresholds, benchmark
sizes, hypotheses, or evaluation metrics — those are Phase 8A protocol
decisions explicitly reserved for separate review.

---

## 1. Phase 3 mastery equations, parameters, and variants

**Source:** `src/domain/learner-model/types.ts`, `parameters.ts`,
`updateMastery.ts`.

### 1.1 The core update

For one concept, given its current mastery estimate `M_old ∈ [0,1]` and
one observed response:

```
Correct:   M_new = clamp( M_old + α·(1 − M_old)·w_d·w_h , 0, 1 )
Incorrect: M_new = clamp( M_old − β·M_old·w_d'          , 0, 1 )
```

where:

- `α` = `correctGainRate`, `β` = `incorrectLossRate` — shared by both
  branches, shared by both variants (defined in `ModelParameters`,
  `src/domain/learner-model/types.ts:15-30`).
- `w_d` (correct branch) is always the raw table lookup
  `difficultyWeights[difficulty]`.
- `w_d'` (incorrect branch) depends on the **variant** — see §1.3.
- `w_h` = `hintGainMultiplier` if `correct && usedHint`, else `1` — a
  hint multiplier is **never** applied to an incorrect response,
  regardless of `usedHint` (`updateMastery.ts:79`, enforced by the
  `correct &&` guard, not by convention).
- `clamp(x, 0, 1) = min(1, max(0, x))` (`updateMastery.ts:12-14`).

Implementation: `updateMastery(previousState, evidence, conceptWeight,
parameters)` in `src/domain/learner-model/updateMastery.ts:63-147`. The
function computes every term explicitly as a named local variable
(`gapOrCurrentTerm`, `difficultyWeight`, `difficultyFactorApplied`,
`hintMultiplier`, `unweightedDelta`, `appliedDelta`, `clampedResult`)
before assembling the trace — none of these are re-derived after the
fact for display.

### 1.2 Default parameters (`DEFAULT_MODEL_PARAMETERS`, `parameters.ts:10-25`)

| Parameter | Value |
|---|---|
| `initialMastery` (M₀, cold start) | 0.5 |
| `correctGainRate` (α) | 0.12 |
| `incorrectLossRate` (β) | 0.10 |
| `hintGainMultiplier` (w_h when hinted+correct) | 0.6 |
| `difficultyWeights` (w_d table) | L1: 0.8, L2: 0.9, L3: 1.0, L4: 1.1, L5: 1.2 |
| `recentEvidenceLimit` | 10 (cap on `ConceptMasteryState.recentEvidence` array length) |

### 1.3 Two variants, differing ONLY in the incorrect branch's difficulty factor

`ModelParameters.incorrectDifficultyWeighting: "multiplicative" |
"inverse"` (`types.ts:26-30`) selects `w_d'`:

- **Variant A** (`DEFAULT_MODEL_PARAMETERS`, version
  `"deterministic-mastery-v1"`, `incorrectDifficultyWeighting:
  "multiplicative"`): `w_d' = w_d` (the same raw table value as the
  correct branch — a harder question produces a **larger** penalty,
  symmetric with the correct branch's reward direction).
- **Variant B** (`DEFAULT_MODEL_PARAMETERS_V2_INVERSE_DIFFICULTY`,
  `parameters.ts:35-51`, version
  `"deterministic-mastery-v2-inverse-difficulty"`,
  `incorrectDifficultyWeighting: "inverse"`): `w_d' = 1 / w_d` (a harder
  question produces a **smaller** penalty — failing an easy question is
  treated as stronger evidence of a gap than failing a hard one).

Both variants share every other parameter value exactly
(`updateMastery.ts:69-85` computes `difficultyFactorApplied` via a
single `if (!correct && parameters.incorrectDifficultyWeighting ===
"inverse")` branch; nothing else in the function depends on the
variant). A stability guard throws if `incorrectDifficultyWeighting ===
"inverse"` and the looked-up `difficultyWeight` is exactly `0`
(`updateMastery.ts:72-76`), since `1/0` is undefined — this cannot occur
under either default parameter set.

**This is a researcher-defined heuristic, not an empirically calibrated
instrument, in either variant** — see `docs/research-decisions.md`
RD-0003/RD-0004 for the full derivation and the explicit critical
examination performed before implementation (monotonicity, boundedness,
path-dependence, and the symmetric-vs-inverse difficulty-direction
analysis).

### 1.4 Decision trace

Every call to `updateMastery` returns `{ state, trace }` where `trace:
MasteryUpdateTrace` (`types.ts:104-137`) contains: `modelVersion`,
the full `parameters` object used, `previousMastery`, every intermediate
term under `termsComputed` (`gapOrCurrentTerm`, `difficultyWeight`,
`difficultyFactorApplied`, `hintMultiplier`, `rateConstant`,
`unweightedDelta`, `appliedDelta`, `clampedResult`), `newMastery`, and
`explanation` — a human-readable string built **from** `termsComputed`
by `buildExplanation()` (`updateMastery.ts:23-46`), never authored
independently of the computed values. A trace is sufficient to
reconstruct the exact arithmetic without re-running the code.

---

## 2. Concept-level state, multi-concept attribution, and state transitions

**Source:** `src/domain/learner-model/types.ts`, `initialize.ts`,
`updateMastery.ts`.

### 2.1 State shape (`ConceptMasteryState`, `types.ts:52-72`)

One instance per `(learnerId, conceptId)` pair:
`learnerId`, `conceptId`, `mastery` (current estimate), `initialMastery`
(the M₀ this state cold-started from — retained even as `mastery`
changes), `numObservations`, `correctCount`, `incorrectCount`,
`consecutiveCorrect`, `consecutiveIncorrect`, `recentEvidence`
(`ResponseEvidenceRecord[]`, oldest-first, capped at
`recentEvidenceLimit`), `modelVersion`, `lastSequenceIndex`,
`createdAt`, `lastUpdatedAt`.

`mastery` is explicitly documented as an **estimate**, never a
ground-truth value — ground truth exists only in a future
simulated-learner phase's own controlled state, never here
(`types.ts:46-51`).

Cold start: `createInitialConceptState(learnerId, conceptId, timestamp,
parameters)` (`initialize.ts:13-35`) sets `mastery = initialMastery =
parameters.initialMastery`, all counts to `0`, `recentEvidence = []`,
`lastSequenceIndex = -1`. Cold start is **independent per concept** —
there is no cross-concept prior-sharing.

### 2.2 Multi-concept attribution

A question's evidence is attributed across concepts via
`conceptWeights: Record<conceptId, number>` on `ResponseEvidence`
(`types.ts:83-95`). `applyResponseEvidence(currentStates, evidence,
learnerId, parameters)` (`updateMastery.ts:163-186`) fans ONE response
out across every key in `conceptWeights`:

```
for each conceptId in evidence.conceptWeights:
  weight = conceptWeights[conceptId]
  state  = currentStates[conceptId] ?? createInitialConceptState(...)   // cold-start if unseen
  { state, trace } = updateMastery(state, evidence, weight, parameters)
```

The weight scales the **delta**, not `M_old` itself:
`appliedDelta = unweightedDelta * conceptWeight`
(`updateMastery.ts:87`). At `conceptWeight = 1` this reduces exactly,
byte-for-byte, to the single-concept formula in §1.1 — verified
directly in `tests/domain/learnerModel/multiConceptAndState.test.ts`.

`applyResponseEvidence` throws if `conceptWeights` is empty
(`updateMastery.ts:173-175`) and **never touches any concept outside
`conceptWeights`** — in particular, a question's prerequisite concepts
are never auto-credited or auto-penalized merely because a dependent
question was answered (verified by a dedicated test asserting the
prerequisite's state object is referentially untouched).

### 2.3 Misconception evidence (pass-through only, no diagnosis)

`accumulateMisconceptionEvidence(tally, record)`
(`src/domain/learner-model/misconceptionEvidence.ts:38-47`) is a pure
per-concept tally (`MisconceptionEvidenceTally = Record<misconceptionId,
number>`). It is a **count**, never a classification: it returns the
input tally unchanged (`===`-identical) when the record carries no
`misconceptionId`, and never asserts a learner "has" a misconception —
see `docs/misconception-taxonomy.md`'s "evidence vs. persistent
misconception" distinction, which this function implements literally.

---

## 3. Phase 4 adaptive selection algorithm

**Source:** `src/tutoring/selection/adaptive/{targeting,
candidateSelection, adaptiveSelectionPolicy}.ts`.

The algorithm runs in two stages per selection call:
`chooseTargetConcept` + `chooseTargetDifficulty` (targeting.ts) decide
**what** to ask about and at **what difficulty**; `selectCandidateQuestion`
(candidateSelection.ts) decides **which exact question**.
`selectAdaptiveQuestion` (adaptiveSelectionPolicy.ts) orchestrates both
and builds the trace.

### 3.1 Target-concept decision (`chooseTargetConcept`, `targeting.ts:213-289`)

Pure function of `(AdaptiveSelectionContext, AdaptiveSelectionConfig)`.
Decision tree, evaluated in this exact order:

1. `findProgressionFrontier(curriculumOrder, states, config)`
   (`targeting.ts:17-24`) — the first concept in `curriculumOrder` NOT
   satisfying `isConceptMastered` (`targeting.ts:11-13`: `mastery >=
   masteryProgressionThreshold AND numObservations >= minEvidenceCount`
   — **both** conditions required, not mastery alone). Returns the
   **last** concept (never `null`) once every concept is mastered —
   there is always more practice available. Returns `null` only for an
   empty `curriculumOrder`, which yields reason `"no_eligible_concept"`.
2. If the frontier concept has no state, or
   `numObservations < minEvidenceCount` → reason
   `"insufficient_evidence"`, target = frontier concept.
3. **If `config.prerequisiteAware` is true** (default — see §3.4 for the
   `false` case):
   a. If `frontierState.consecutiveIncorrect >=
      diagnosticBacktrackConsecutiveIncorrectThreshold` (default 4):
      call `findDiagnosticBacktrackTarget` (§3.3). If it finds a
      candidate → reason `"diagnostic_probe"`, target = that
      prerequisite, with `diagnosticDetails` (originalConceptId,
      trigger count, `prerequisitesConsidered`, a `returnCondition`
      string). If not → fall through.
   b. If `frontierState.consecutiveIncorrect >=
      consecutiveIncorrectRemediationThreshold` (default 2): call
      `findRemediationTarget` (§3.2). If it finds a candidate → reason
      `"prerequisite_backtrack"`, target = that prerequisite. If not →
      reason `"remediation"`, target = frontier concept itself.
   c. Otherwise → reason `"progression"`, target = frontier concept.
4. **If `config.prerequisiteAware` is false:** step 3's backtracking
   sub-steps are skipped entirely; a struggling concept always gets
   reason `"remediation"` on itself (`targeting.ts:271-287`).

Every branch also returns `consideredConcepts: ConsideredConceptTrace[]`
— one row per `curriculumOrder` entry with its mastery, observation
count, and `eligible` flag, for full trace reconstruction.

### 3.2 Ordinary prerequisite backtracking (`findRemediationTarget`, `targeting.ts:107-155`)

Breadth-first search outward from the struggling concept through DIRECT
`Concept.prerequisiteIds` edges only, closest-first, bounded by BOTH a
`visited` set (cycle defence, independent of the curriculum model's own
acyclicity validation) and `maxPrerequisiteBacktrackDepth` (default 5).
A prerequisite "needs attention" if `numObservations < minEvidenceCount
OR mastery < masteryRemediationThreshold` (0.35 default). Returns the
first such prerequisite found at the shallowest qualifying depth, plus
the exact hop chain from the start concept to it.

**Structural limitation, documented and tested
(`docs/research-decisions.md` RD-0005):** because
`masteryRemediationThreshold` (0.35) is strictly below
`masteryProgressionThreshold` (0.75), a concept the frontier has already
advanced past (necessarily `mastery >= 0.75`) can **never** be
re-flagged by this function — 0.75 is never `< 0.35`. This function can
therefore only surface prerequisites that are NOT part of the specific
`curriculumOrder` the caller is walking (e.g., an assumed-background
concept). This is why §3.3 exists.

### 3.3 Diagnostic backtracking into previously-mastered prerequisites (`findDiagnosticBacktrackTarget`, `targeting.ts:140-212`)

Same bounded, closest-first, visited-guarded BFS structure as §3.2, but
with a DIFFERENT eligibility test that can select a prerequisite
regardless of its historical mastery: eligible if
`numObservations === 0 OR (currentSequenceIndex − lastSequenceIndex) >=
diagnosticStalenessThreshold` (default 8). This is the only mechanism
that can target an already-"mastered" concept. Among eligible candidates
at the first qualifying BFS depth, ranked: never-observed first, then
ascending mastery, then descending staleness gap, then `conceptId`
ascending (deterministic tie-break). Triggered only once
`consecutiveIncorrect >= diagnosticBacktrackConsecutiveIncorrectThreshold`
(4, strictly higher than the ordinary remediation trigger of 2 — crossing
it implies ordinary remediation already ran and failed).

**Self-correcting return mechanism:** once a prerequisite is actually
probed, its `lastSequenceIndex` advances, making it immediately
ineligible again (gap resets near 0). The search then either finds
another eligible prerequisite or returns `null`, at which point control
falls through to §3.2/ordinary remediation on the original concept —
bounded by the number of distinct prerequisites in the subgraph, never
open-ended. `findDiagnosticBacktrackTarget` never writes to `states` —
selecting a concept to probe is not evidence that it is unmastered; only
a real subsequent response updates its mastery.

### 3.4 The prerequisite-unaware ablation (condition C3)

`AdaptiveSelectionConfig.prerequisiteAware: boolean`
(`config.ts:69-83`, default `true`). When `false`, step 3 of §3.1 is
skipped entirely (`targeting.ts:242` / the `if (config.prerequisiteAware)`
branch) — every struggle is remediated on the same concept, never
backtracked. **Does not affect difficulty adaptation** (§3.5 is
unconditional on this flag). `PREREQUISITE_UNAWARE_ADAPTIVE_SELECTION_CONFIG`
(`config.ts:121-125`) is `DEFAULT_ADAPTIVE_SELECTION_CONFIG` with only
`prerequisiteAware: false` and a distinct `version` changed.

### 3.5 Target-difficulty decision (`chooseTargetDifficulty`, `targeting.ts:324-354`)

If evidence is insufficient (`numObservations < minEvidenceCount`):
`diagnosticDifficultyForLowEvidence` (default L2). Otherwise:
`resolveDifficultyBand(mastery, difficultyByMastery)`
(`targeting.ts:301-307`) — first band (ascending `maxMastery`) with
`mastery <= band.maxMastery`. Default bands: `≤0.3→L1, ≤0.45→L2,
≤0.65→L3, ≤0.85→L4, ≤1→L5`. If the same difficulty has appeared in the
last `maxConsecutiveSameDifficulty` (default 3) presented questions, the
difficulty is nudged by ±1 (toward 5 if below, toward 1 if at 5) to
avoid repetition. This function never reads or modifies the Phase 3
mastery formula — only `ConceptMasteryState.mastery`/`numObservations`.

### 3.6 Candidate question selection and ranking (`selectCandidateQuestion`, `candidateSelection.ts:49-104`)

Deterministic filter pipeline, each stage's candidate count recorded for
the trace:

1. **Concept filter:** `question.conceptIds.includes(targetConceptId)`
   (a multi-concept question is a valid candidate for ANY of its
   concepts, including non-primary ones).
2. **Exposure filter:** exclude anything in `presentedQuestionIds`.
3. **Family filter (soft):** exclude a question whose `questionFamily`
   has already appeared `>= questionFamilyRepetitionLimit` (default 1)
   times in history — **relaxed back to the unfiltered pool** if it
   would otherwise empty the candidates.
4. **Difficulty filter:** exact match to `targetDifficulty`; if none
   exist, widen outward by `|difficulty − target|` ascending (tie-break:
   `questionId` ascending), recorded as `fallbackUsed:
   "widened_difficulty"`.

Scoring, for final ranking:
`score = misconceptionOverlap * 10 + (difficulty === target ? 5 :
-|difficulty − target|)`, where `misconceptionOverlap` counts the
candidate's non-correct options whose `misconceptionId` has a tally
`>= misconceptionEvidenceMinCount` (default 2) in
`misconceptionTallies[targetConceptId]`. Final deterministic tie-break:
`questionId` ascending. **Never random sampling.**

### 3.7 Orchestration and exhaustion handling (`selectAdaptiveQuestion`, `adaptiveSelectionPolicy.ts:67-113`)

Tries the concept `chooseTargetConcept` identified first; if THAT
concept's candidate pool is fully exhausted (`selectCandidateQuestion`
returns `selected: null`), falls through to the next not-yet-mastered
concept in `curriculumOrder`, each concept tried **at most once**
(bounded, no infinite loop). Returns a fully populated
`AdaptiveSelectionTrace` (`selection/adaptive/types.ts:84-117`)
including `policyVersion`, `configVersion`, the full `config` object,
`targetConcept`, `targetDifficulty`, `misconceptionEvidenceConsidered`,
`candidateFilter` counts, `topCandidates` (bounded to 10), the fallback
mode actually used, and an `explanation` generated from those same
already-computed fields (`buildExplanation`,
`adaptiveSelectionPolicy.ts:24-45`).

---

## 4. All configurable thresholds and defaults

From `src/tutoring/selection/adaptive/config.ts:92-125` and
`src/domain/learner-model/parameters.ts`:

| Threshold | Default | Meaning |
|---|---|---|
| `masteryProgressionThreshold` | 0.75 | Mastery bar to consider a concept "done" |
| `masteryRemediationThreshold` | 0.35 | Mastery bar below which ordinary backtracking flags a prerequisite |
| `minEvidenceCount` | 3 | Observations needed before a mastery estimate drives decisions |
| `consecutiveIncorrectRemediationThreshold` | 2 | Triggers ordinary prerequisite backtracking |
| `diagnosticBacktrackConsecutiveIncorrectThreshold` | 4 | Triggers diagnostic (previously-mastered-prerequisite) probing |
| `diagnosticStalenessThreshold` | 8 (sequence steps) | How stale a prerequisite's evidence must be to be diagnostically re-probed |
| `maxPrerequisiteBacktrackDepth` | 5 (hops) | Cap on both backtracking searches |
| `difficultyByMastery` | see §3.5 | Mastery→difficulty band table |
| `diagnosticDifficultyForLowEvidence` | L2 | Difficulty used under cold-start/low-evidence |
| `maxConsecutiveSameDifficulty` | 3 | Repetition-avoidance window |
| `questionFamilyRepetitionLimit` | 1 | Soft family-diversity preference |
| `misconceptionEvidenceMinCount` | 2 | Tally needed before a misconception affects selection |
| `prerequisiteAware` | `true` (C1/C2), `false` (C3) | The ablation flag |
| `initialMastery` (M₀) | 0.5 | Cold-start mastery |
| `correctGainRate` (α) | 0.12 | |
| `incorrectLossRate` (β) | 0.10 | |
| `hintGainMultiplier` | 0.6 | |
| `recentEvidenceLimit` | 10 | Trailing evidence window kept per concept |

**All of these are researcher-defined heuristic starting points,
explicitly not tuned against any evaluation dataset** — stated in both
`config.ts:14-20` and `parameters.ts`'s own doc comments.

---

## 5. The 1,840-question bank

**Source:** `data/question-bank/MANIFEST.json`, `src/domain/rise/`.

- **1,840 questions**, loaded from
  `data/question-bank/canonical-question-bank-v1.csv` at module-init
  time via a hand-rolled RFC 4180 parser
  (`src/domain/rise/csvParser.ts`), not transcribed into TypeScript
  (`src/domain/rise/loadQuestions.ts`). Per-chapter counts: CH01: 150,
  CH02: 140, CH03: 100, CH04: 100, CH05: 150, CH06: 140, CH07: 150,
  CH08: 150, CH09: 120, CH10: 140, CH11: 140, CH12: 130, CH13: 100,
  CH14: 130.
- **109 concepts** (`RISE_CONCEPTS`, `src/domain/rise/index.ts`),
  across 14 chapters, each with `chapterId`, `curriculumLevel`,
  `prerequisiteIds`, `strand` (one of the `ch01_algebra`..
  `ch14_complex_numbers` `ConceptStrand` values,
  `src/domain/concepts/types.ts:26-39`).
- **204 prerequisite edges**, verified acyclic, 0 self-dependencies, 0
  duplicate edges (`MANIFEST.json`'s `compatibility_verified` block).
- **68 misconceptions** (`RISE_MISCONCEPTIONS`).
- **Validation status** (`MANIFEST.json`'s
  `validation_summary_from_source`): schema/reference-integrity/
  concept-weight/option-structure/KaTeX-render checks all 1840/1840
  pass; mathematical check 1839/1840 pass with 1 question
  (`MATH-CH11-0002`) marked `author_reviewed_math_not_automatically_verified`
  (independently reviewed during integration, not executably verified —
  see `docs/development-log.md`'s RISE integration entry). **Zero
  independent human review and zero empirical validation have been
  performed on any of the 1,840 questions** — this is stated explicitly
  in the manifest and is a live limitation for any Phase 8 use of this
  bank.
- Kept as a **separate, parallel export** from the original 161-question
  hand-curated bank (`QUESTIONS`, `CONCEPTS`, `MISCONCEPTIONS`) rather
  than merged — see `docs/research-decisions.md` RD-0001. `ALL_QUESTIONS`
  (`src/domain/rise/index.ts`) is a convenience union of both; nothing in
  the live `/tutor` non-adaptive session uses it.
- `Question.conceptWeights?: Record<string, number>` — present on RISE
  questions, used for multi-concept attribution (§2.2); absent on the
  original bank (which falls back to `{[primaryConceptId]: 1}` wherever
  a weight map is needed, e.g.
  `src/tutoring/adaptiveSession/service.ts`'s `resolveConceptWeights`
  equivalent logic).

---

## 6. Phase 5 experimental conditions

**Source:** `src/research/experiment/conditions.ts`,
`estimatorAdapter.ts`, `selectionAdapter.ts`.

| Condition | Estimator | Selection | Implemented? |
|---|---|---|---|
| **C0** | `createNullEstimatorAdapter()` — true no-op, `readMastery` always `undefined` | `createNonAdaptiveSelectionAdapter()` — wraps `NonAdaptiveSelectionPolicy` | **Fully implemented**, tested |
| **C1** | `createDeterministicEstimatorAdapter(DEFAULT_MODEL_PARAMETERS)` — Variant A | `createAdaptiveSelectionAdapter(DEFAULT_ADAPTIVE_SELECTION_CONFIG)` — prerequisite-aware | **Fully implemented**, tested |
| **C2** | `createDeterministicEstimatorAdapter(DEFAULT_MODEL_PARAMETERS_V2_INVERSE_DIFFICULTY)` — Variant B | Prerequisite-aware (same as C1) | **Fully implemented**, tested; this is the condition `/adaptive-tutor` (Phase 7) actually runs |
| **C3** | Same estimator as C2 (Variant B) | `createAdaptiveSelectionAdapter(PREREQUISITE_UNAWARE_ADAPTIVE_SELECTION_CONFIG)` | **Fully implemented**, tested (the controlled ablation) |
| **C4** | Any caller-supplied `EstimatorAdapter` (e.g. a future BKT) | `createAdaptiveSelectionAdapter(config)` | **Extension point only** — `buildC4PluggableEstimatorCondition(estimator, config)` (`conditions.ts:74-76`) type-checks the shape; **no concrete estimator beyond the null/deterministic ones exists**. No BKT, IRT, or other probabilistic estimator is implemented anywhere in this repository. |

`buildExperimentCondition(conditionId, estimator, selection)`
(`conditions.ts:20-22`) is the generic factory underlying all of the
above and the mechanism for defining any further condition without
touching the session engine.

**`EstimatorAdapter` interface** (`src/research/experiment/types.ts:21-50`):
`estimatorType`, `version`, `parameters`, `initConcept`, `applyResponse`
(multi-concept fan-out, pure), `readMastery` (optional-result —
`undefined` is a valid, meaningful answer for an estimator with no
mastery notion), `predictCorrectness?` (optional, distinct from
`readMastery`), `serializeStates`/`restoreStates`. Wraps, does not
replace, the narrower single-concept `MasteryEstimator<TState>` from
`src/domain/learner-model/estimatorInterface.ts:30-42`.

**`SelectionAdapter` interface** (`types.ts:74-95`): `policyType`
(`"non_adaptive" | "adaptive"`), `version`, `parameters`, `selectNext`.
Wraps `QuestionSelectionPolicy<TContext>`
(`src/tutoring/selection/types.ts:16-19`).

---

## 7. Track A vs. Track B

**Source:** `docs/research-decisions.md` RD-0006; demonstrated in
`tests/research/experiment/sessionEngine.test.ts` and
`tests/research/artifact/endToEnd.test.ts`.

- **Track A (estimator comparison):** pair DIFFERENT `EstimatorAdapter`s
  with the SAME `SelectionAdapter` — in practice the non-adaptive one,
  since a fixed question sequence cannot be confounded by selection
  differences:
  `buildExperimentCondition(id, someEstimator,
  createNonAdaptiveSelectionAdapter())`. Comparing C1 vs. C2 under an
  IDENTICAL externally-supplied response-correctness sequence (same
  adaptive selection policy for both, so the only variable is the
  estimator) is the pattern demonstrated in
  `tests/research/experiment/sessionEngine.test.ts` ("C1 and C2 can
  diverge in their mastery trajectory given the identical response
  sequence").
- **Track B (sequencing comparison):** pair the SAME estimator with
  DIFFERENT `SelectionAdapter`s — C2 vs. C3 (identical Variant B
  estimator, prerequisite-aware vs. unaware selection) is the
  implemented example, demonstrated to produce different question
  sequences from an identical starting scenario.
- Nothing in the codebase computes or claims a "policy improved
  learning" verdict from a higher internal mastery estimate — the engine
  only ever reports what was estimated and what was selected (see
  `src/research/artifact/export/datasets.ts`'s `buildRunSummaryRow` doc
  comment: "does NOT compute or display a 'learning gain' figure").
- `ExperimentRunArtifact.track?: "A" | "B"` (`src/research/artifact/types.ts:41`)
  is a caller-supplied label for bookkeeping; the engine itself has no
  notion of "track."

---

## 8. Phase 6 artifact schema, reproducibility, exports, replay

**Source:** `src/research/artifact/`.

### 8.1 Artifact schema (`types.ts`, schema version `experiment-run-artifact-v1`)

`ExperimentRunArtifact` = an envelope around the reused, unmodified
Phase 5 `ExperimentProvenance` (`src/research/experiment/provenance.ts`)
plus: `schemaVersion`, `experimentId?`, `conditionId`, `scenarioId?`,
`track?`, `createdAt`, `sessionStartTimestamp`, `softwareVersion`
(package version + best-effort git commit), `initialEstimatorStates`,
`finalEstimatorStates`, `finalMisconceptionTallies`,
`configurationErrors?`/`errorMessage?` (for a retained failed run), and
`contentDigest` (SHA-256 over every other field, canonicalized —
§8.2). `ExperimentProvenance` itself (`provenance.ts:9-30`) carries
`questionBankVersion` (count + SHA-256 content hash over
`id:version:correctOptionId` tuples), `curriculumVersion` (SHA-256 over
concept ids + prerequisite lists + curriculum order), `estimator`/
`selectionPolicy` identity+version+parameters, `sessionLimits`,
`questionSelectionSequence`, `responseSequence`, `estimatorTraces`,
`selectionTraces`, `finalStatus`, `terminationReason`.

### 8.2 Canonical hashing (`canonicalize.ts`)

Deterministic: object keys sorted recursively, array order preserved,
`undefined` dropped, numbers serialized via native `JSON.stringify`
(full IEEE-754 precision, never rounded). `computeContentDigest(value) =
SHA-256(canonicalize(value))`. The digest is always computed over the
artifact MINUS its own `contentDigest` field.

### 8.3 Persistence (`persistence.ts`)

Filesystem-only (guarded against client-bundle import), atomic
temp-file-then-rename writes, under `research-output/runs/`
(gitignored). Refuses to overwrite an existing `runId` unless
`overwrite: true` explicit. A lightweight `.meta.json` sidecar is
written alongside every full artifact so `listRunMetadata` never parses
full traces. Run ids are validated against a safe charset
(`assertSafeArtifactId`) before touching the filesystem.

### 8.4 Integrity (`integrity.ts`)

`verifyArtifactIntegrity` reports FOUR independent, never-merged
checks, each `true | false | "not_checked"`: `schemaVersionSupported`,
`contentDigestValid`, `questionBankMatchesCurrent` (recomputes the same
hash against a live bank the caller supplies), `curriculumMatchesCurrent`
(same, for the curriculum), `softwareVersionMatches`.

### 8.5 Exports (`export/datasets.ts`, `export/csv.ts`)

Five CSV/JSONL datasets, each a pure function of an
`ExperimentRunArtifact` (+ a live question-bank lookup for B, since bank
content is never duplicated into the artifact): (A) `buildRunSummaryRow`
— one row per run, no fabricated learning-gain figure; (B)
`buildQuestionResponseRows` — one row per administered question; (C)
`buildMasteryTrajectoryRows` — one row per concept-level mastery update
(correct multi-concept attribution via `conceptWeight`), duck-typed to
the deterministic-mastery trace shape, skipping unrecognized trace
shapes rather than crashing; (D) `buildSelectionDecisionRows` — one row
per adaptive decision (none for non-adaptive runs, by design); (E)
`buildMisconceptionEvidenceRows` — `isConfirmedDiagnosis` hardcoded
`false` on every row.

### 8.6 Manifests (`manifest.ts`)

`buildManifestFromArtifacts(batchId, protocolVersion, artifacts,
verifyFn)` — separately schema-versioned
(`experiment-batch-manifest-v1`), rejects a batch mixing question-bank
or curriculum hashes, marks a run `verified` only if `verifyFn` actually
ran against it and passed. No generation timestamp (so regeneration from
the same artifacts is trivially, byte-for-byte deterministic).

### 8.7 Replay (`replay.ts`, `replayArtifact.ts`)

Phase 5's `replayExperimentSession` (`src/research/experiment/replay.ts`)
re-runs `startExperimentSession`/`recordExperimentResponse`/
`advanceExperimentSession` from scratch against the SAME config/scenario/
response sequence and deep-diffs the result, reporting the first
divergence. Phase 6's `replayFromArtifact` (`replayArtifact.ts`) wraps
this for a PERSISTED artifact: always integrity-checks first, and
returns `{ kind: "integrity_only", reason }` (schema unsupported,
content invalid, run non-terminated, or condition unresolvable) or `{
kind: "computational_replay", integrity, replay }` — **never claims
replay success merely because a JSON file parsed.**

---

## 9. Current estimator and selection-policy interfaces (summary)

Already detailed in §3.6/§6; the key seams for Phase 8 extension:

- **New estimator (e.g. BKT):** implement `EstimatorAdapter`
  (`src/research/experiment/types.ts:21-50`) and pass it to
  `buildExperimentCondition`/`buildC4PluggableEstimatorCondition`. No
  change to the session engine required.
- **New selection policy:** implement `QuestionSelectionPolicy<TContext>`
  (`src/tutoring/selection/types.ts`) and wrap it in a `SelectionAdapter`
  (`types.ts:74-95`), following `selectionAdapter.ts`'s existing pattern.
- **New condition:** `buildExperimentCondition(id, estimator, selection)` —
  no registry changes required to USE a new combination; the
  `EXPERIMENT_CONDITIONS` object is just a convenience map for the four
  already-named ones.
- **Response source:** `ExperimentResponseProvider = (state, question)
  => ExternalResponse | null` (`src/research/experiment/sessionEngine.ts`)
  — the seam a future simulated learner plugs into. The engine itself
  never generates a response.

---

## 10. Known limitations and unresolved research decisions

1. **Difficulty-direction choice (RD-0003/RD-0004):** both symmetric
   (Variant A) and inverse (Variant B) difficulty weighting on the
   incorrect branch are implemented and preserved side by side; which
   (if either) is more defensible is explicitly NOT resolved by this
   codebase — it is a modeling assumption to be evaluated, not a
   settled fact.
2. **Backtracking's structural blind spot (RD-0005):** ordinary
   remediation can never re-flag an already-progressed concept (§3.2);
   diagnostic backtracking (§3.3) only reaches it via a staleness signal,
   not a reassessment of the stored mastery value itself.
3. **No empirical calibration anywhere:** every threshold in §4 is a
   researcher-defined starting point. None have been tuned against any
   evaluation dataset, simulated or real.
4. **Zero independent human review or empirical validation on the
   1,840-question bank** (§5) — one question's mathematical correctness
   was independently reviewed but not executably verified.
5. **No validated response-generation mechanism exists yet** — Phase 7's
   own demonstration and this repository's tests use either a fixed
   correctness pattern or an arbitrary caller-supplied function, never a
   validated model of learner behavior. Any result produced this way is
   illustrative of mechanism only, not evidence about learning
   (explicitly stated in `tests/research/artifact/endToEnd.test.ts`).
6. **Misconception attribution narrowing:** when a RISE distractor lists
   more than one candidate misconception, only the first is kept as
   `AnswerOption.misconceptionId` (`src/domain/rise/loadQuestions.ts`) —
   a real, intentional narrowing documented at integration time.
7. **`usedHint` has no live data source:** the Phase 7 UI always passes
   `usedHint: false` (no hint feature exists in the student-facing
   product); the parameter exists in the formula for future
   simulated-learner use.
8. **In-memory session persistence only** (both `/tutor` and
   `/adaptive-tutor`) — process-lifetime, not durable; irrelevant to
   Phase 8's headless batch execution, which does not go through either
   live session service.

---

## 11. Ready for Phase 8 vs. still to be built

### Ready now (exercised by existing tests against the real 1,840-question bank)

- Deterministic mastery estimation, both variants (§1).
- The full adaptive selection engine including diagnostic backtracking
  (§3), runnable via any of C0–C3 (§6).
- A headless, pure experiment session engine
  (`startExperimentSession`/`recordExperimentResponse`/
  `advanceExperimentSession`, `runExperimentToCompletion`) accepting
  externally-supplied responses, with deterministic replay.
- Full provenance, persistence, integrity verification, CSV/JSONL
  export, and batch manifests for any run produced this way.
- The `EstimatorAdapter`/`SelectionAdapter` extension seams for a future
  BKT or alternative selection policy, with zero required changes to the
  engine.

### Still to be built (explicitly out of scope for Phases 1–7)

- Any simulated learner (response-probability model, knowledge-transition
  dynamics, or prerequisite-dependency simulation) — the response
  PROVIDER seam exists; no simulator implementation exists.
- BKT, IRT, or any other probabilistic knowledge-tracing baseline — the
  C4/`EstimatorAdapter` seam exists; no such estimator is implemented.
- Any batch-orchestration, matched-scenario-pairing, seeded-RNG, or
  metric-computation infrastructure beyond what Task B of this phase
  adds (see the Phase 8 completion report in `docs/development-log.md`
  for exactly what that is) — none of it existed before this phase.
- Any scientific protocol decision: hypotheses, metrics, sample sizes,
  simulated-learner parameter distributions, or statistical tests. None
  of these are present anywhere in the codebase, by design.

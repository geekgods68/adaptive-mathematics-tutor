# Phase 8A — C1 Pre-Flight Report

Produced per `protocol/PHASE8A_PROTOCOL_v2.md` §C1. This is an
inspection report only. **No code was written or modified to produce
it**, no `protocol/APPROVAL.md` was created, no approval hash was
computed, and no simulation of any kind was executed. Every finding
below is a direct observation of the current repository (read via
`Read`/`grep`/`git status`/`npm test`, and one throwaway inspection
script that was deleted immediately after running — see the footnote at
the end), not an inference from documentation.

**Read in full before this inspection:** `protocol/PHASE8A_PROTOCOL_v2.md`
(all of Deliverables A, B1–B12, C0–C13, D, E — 1,922 lines).

## Summary

No blocking issue was found. Six items need a decision or a small
correction before 8B can start cleanly (listed in §5); none require
changing protected code, and none are scientific questions this report
can resolve itself. The two P-items the protocol itself flags as
depending on a "stop" condition (P-2's weight-bound check) come back
clean. **The protocol is not approved.** Nothing below should be read as
a recommendation to proceed to 8B — that remains gated on
`protocol/APPROVAL.md`, which this report does not create.

---

## 1. P-1 — `ExternalResponse` shape; does it carry a chosen option?

**File:** `src/research/experiment/types.ts:124-128`

```ts
export interface ExternalResponse {
  selectedOptionId: string;
  timestamp: string;
  usedHint?: boolean;
}
```

**Finding:** Yes — `selectedOptionId` is the chosen option's stable id
(never a position label; see `AnswerOption.id` in
`src/domain/questions/types.ts`). `RecordedExperimentResponse`
(`types.ts:130-137`) additionally stores `isCorrect` and
`misconceptionId` (post-grading), so a run record can recover which
option was chosen for every response, not just whether it was correct.

**Per protocol's own disposition ("Tier 1 needs correctness only; note
it for Tier 2"):** No action needed for Tier 1. Noted for D1/S5 (Tier 2
misconception overlay, which needs the chosen option) — already
satisfied by `selectedOptionId`.

---

## 2. P-2 — Concept weights in [0,1]; option-count distribution

**Files inspected:** `src/domain/rise/index.ts` (exports
`RISE_QUESTIONS`, 1,840 questions), `src/domain/questions/index.ts`
(exports `QUESTIONS`, 161 questions). Checked via a throwaway script
(not committed — see footnote) iterating every question's
`conceptWeights` and `options.length`.

| Bank | Questions | Min weight | Max weight | Questions w/ explicit `conceptWeights` | Effectively single-concept | Option-count distribution |
|---|---|---|---|---|---|---|
| `RISE_QUESTIONS` | 1,840 | 0.2 | 1.0 | 1,840 | 1,776 | {4: 1838, 5: 2} |
| `QUESTIONS` (original) | 161 | n/a (field absent → implicit 1.0 on `primaryConceptId`) | n/a | 0 | 161 | {3: 146, 4: 14, 5: 1} |

**Finding:** All concept weights fall within **[0.2, 1.0] ⊂ [0, 1]** —
the premise B2's R1 (boundedness) requires. **No stop condition
triggered.**

**Secondary finding (relevant to C6's Link-D spec, not a blocker):**
Option counts are **not uniformly 4** in either bank (3 and 5 also
occur). C6 already anticipates this ("if the pre-flight finds option
counts other than 4, an option-count term is added with n = 4 as
reference") — this pre-flight confirms that branch **will** be
exercised for both banks, not a hypothetical. Deliverable C's note
about a "4-to-8 option format" (carried from the Phase 7 briefing) does
not match the actual data — the real range is 3–5 options, not 4–8.
This doesn't block anything (the Link-D spec already handles
non-4 counts), but the ground truth is narrower than Deliverable C's
prose assumes.

---

## 3. P-3 — How `createAdaptiveSelectionAdapter` reads estimator state

**File:** `src/research/experiment/selectionAdapter.ts:44-69`

```ts
selectNext: (input: SelectionAdapterInput) => {
  const context: AdaptiveSelectionContext = {
    ...
    conceptMasteryStates: input.conceptMasteryStates as Record<string, ConceptMasteryState>,
    ...
  };
  const { result, trace } = policy.selectNextQuestionWithTrace(context);
  return { result, trace };
}
```

**Finding:** The adapter takes `SelectionAdapterInput.conceptMasteryStates`
(typed `Readonly<Record<string, unknown>>` at the adapter-interface
level — intentionally opaque, per `types.ts:92`) and **hard-casts** it
to `Record<string, ConceptMasteryState>` before handing it to
`AdaptiveSelectionPolicy`. `AdaptiveSelectionPolicy`
(`src/tutoring/selection/adaptive/adaptiveSelectionPolicy.ts` →
`chooseTargetConcept`/`chooseTargetDifficulty` in `targeting.ts`) then
reads concrete fields: `mastery`, `numObservations`,
`consecutiveIncorrect`, `lastSequenceIndex` (see
`src/tutoring/selection/adaptive/targeting.ts:11-13, 54-212`).

**Implication for Tier 2 C4 (D2):** a BKT estimator's state is **not**
shaped like `ConceptMasteryState` (it's `P(L)`, `P(T)`, `G`, `S`, not
`mastery`/`numObservations`/streak counters). `createAdaptiveSelectionAdapter`
as it exists today would need a `ConceptMasteryState`-compatible
*view* over BKT state before the existing adaptive policy could read
it — exactly what Deliverable D's D1 spec for C4-BKT already says
("The BKT adapter must expose a `ConceptMasteryState`-compatible view
... if pre-flight P-3 shows the selection adapter needs one"). **This
pre-flight confirms that view is required** — the cast is unconditional
and the policy's field reads are not duck-typed defensively the way
`sessionEngine.ts`'s own `isGenericallyMastered` is.

**Disposition:** Report only, as specified. No Tier 1 action.

---

## 4. P-4 — Can the session engine take a restricted question bank?

**File:** `src/research/experiment/types.ts:104-121`
(`ExperimentScenario.availableQuestions: Question[]`); consumed in
`src/research/experiment/sessionEngine.ts:19, 61`.

**Finding:** Yes, trivially — `availableQuestions` is a plain array
supplied by the caller at scenario-construction time; nothing in the
engine requires it to be `RISE_QUESTIONS`, `QUESTIONS`, or
`ALL_QUESTIONS` in full. A slice-restricted `Q_slice` array (B5.1/C7.1)
can be passed directly with no engine change. `createNonAdaptiveSelectionAdapter`
(`selectionAdapter.ts:16-32`) separately requires
`predeterminedSequence` on the scenario when `policyType ===
"non_adaptive"` — unaffected by bank restriction.

**Disposition:** Per protocol ("Use full bank; record in A1" is the
fallback only if this answer were unfavourable) — **not needed**. Slice
restriction can proceed via `availableQuestions` directly. A1 should
still record this confirmation, not a fallback.

---

## 5. P-5 — `NonAdaptiveSelectionPolicy` behaviour

**Files:** `src/tutoring/selection/nonAdaptive/nonAdaptiveSelectionPolicy.ts`
(22 lines, read in full), `src/tutoring/selection/nonAdaptive/types.ts`
(16 lines, read in full).

**Finding (order):** Presents `predeterminedSequence[positionIndex]` —
a literal array index, not a curriculum-order traversal computed
internally. For C0 to "present T_c in curriculum order from the slice
pool" (B6.2), **the caller must already supply `predeterminedSequence`
pre-ordered as T_c-in-curriculum-order question ids** — the policy
itself does no ordering.

**Finding (estimator-state use):** `NonAdaptiveSelectionContext`
(`types.ts:9-15`) has exactly three fields: `participantId`,
`predeterminedSequence`, `positionIndex`. **Structurally cannot read
mastery, misconception history, or any estimator state** — confirmed
by the type itself, not by convention (the comment at `types.ts:1-8`
states this is deliberate). `createNonAdaptiveSelectionAdapter`
(`selectionAdapter.ts:16-32`) likewise never reads
`input.conceptMasteryStates`/`input.misconceptionTallies` when building
that context.

**Finding (slice restriction):** No restriction logic exists in the
policy — it walks whatever `predeterminedSequence` it's given, in
order, with no bank-size assumption. A slice-restricted sequence works
with zero change.

**Disposition against B6.2's C0 criteria:**
- (i) *"can present T_c in curriculum order from the slice pool"* —
  **conditionally yes**: it can present ANY caller-supplied id sequence
  in order, which satisfies this **only if** the Track B runner builds
  `predeterminedSequence` as T_c-in-curriculum-order itself (the policy
  provides no ordering of its own). This is a thin but real
  responsibility shift onto the Track B runner, not a gap in the policy.
- (ii) *"reads no estimator state"* — **confirmed true, structurally.**

Given (i) is satisfiable only by construction (the runner must build
the sequence correctly) rather than guaranteed by the policy itself,
**the C0-slice fallback (C8.2) is the safer, more literal reading of
"the implemented `NonAdaptiveSelectionPolicy`"** — not because the
policy fails criterion (i), but because criterion (i) as written asks
whether the *policy* can do the ordering, and it cannot; it only
accepts an already-ordered sequence. This is a judgment call for A1
(**not** a scientific/methodological decision under C13 — it's a
reading of B6.2's own wording against the actual policy), flagged for
the author's confirmation in A1 rather than resolved unilaterally here.

---

## 6. P-6 — Session limits and every `terminationReason`

**File:** `src/research/experiment/types.ts:97-102, 104-121`;
enforcement in `src/research/experiment/sessionEngine.ts:200-240`.

**Finding:** There is no field literally named `sessionLimits`. The
actual limit-bearing fields on `ExperimentScenario` are:
`maxQuestions` (required), `maxExposurePerQuestion` (optional, default
1), `completionCheck` (optional `{masteryThreshold, minEvidenceCount}`).

**Every `ExperimentTerminationReason` (`types.ts:97-102`), with the
exact condition that produces it** (`sessionEngine.ts`):

| Reason | Where set | Condition |
|---|---|---|
| `invalid_configuration` | `startExperimentSession`, line 99 | `validateExperimentConfig` fails before the first selection |
| `candidate_pool_exhausted` | `startExperimentSession` line 104; `advanceExperimentSession` line 227 | selection adapter returns `questionId: null` |
| `question_limit_reached` | `advanceExperimentSession` line 213 | `presentedQuestionIds.length >= scenario.maxQuestions` |
| `completed_normally` | `advanceExperimentSession` line 217 | `allConceptsCompleted` — every `curriculumOrder` concept's estimator state passes `completionCheck`'s thresholds (duck-typed `{mastery, numObservations}`) |
| `unrecoverable_error` | `runExperimentToCompletion` catch block, line 292 | any thrown error during the select/respond/advance loop |

**Finding relevant to B6.1's intention-to-treat budget rule:** Track B
sets `T = 60` via `maxQuestions`. `completionCheck` is optional and, if
set, can terminate a session **before** 60 questions
(`completed_normally`) — B6.1/B6.6 describe K(T) as "mean mastery at
budget end" and treat early termination (pool exhaustion / other
engine termination) as scored at the last step. **If `completionCheck`
is left unset for Track B** (which the Tier 1 spec's K(T) definition
implies, since it wants the state exactly at T = 60, not at an
early "mastery achieved" stop), this is a **configuration decision for
the Track B runner, not a protocol gap**: simply omit `completionCheck`
from the Track B scenario so `completed_normally` cannot fire early.
Flagging this explicitly so it isn't missed during C8.3 implementation.

---

## 7. P-7 — Does a run record contain everything `replayExperimentSession` needs?

**File:** `src/research/experiment/replay.ts` (80 lines, read in full).

**Finding:** `replayExperimentSession(config, scenario, originalState,
responses, replayRunId?)` needs exactly: the **full** `ExperimentConfig`
(estimator + selection adapter instances, not just version strings),
the **full** `ExperimentScenario` (not reconstructable from a run
record's summary fields alone — it needs the live `availableQuestions`/
`concepts` arrays), the original `ExperimentSessionState` (for the
final comparison), and the **ordered `ExternalResponse[]`** sequence
(`selectedOptionId` + `timestamp` + optional `usedHint` per response).

**Gap relative to B10.1's "mandatory record for every run":** B10.1
lists "Question-id sequence, correctness sequence (and chosen option
where available)" as what the run record stores — but
`replayExperimentSession` needs the **exact `selectedOptionId` and
`timestamp`** for every response, not just correctness. A run record
that stores only correctness (not the selected option id) would be
**insufficient** to call `replayExperimentSession` directly; it would
require re-deriving an option id from correctness (ambiguous whenever a
question has more than one incorrect option — true for every question
in both banks per §2 above) and a timestamp (not recoverable from
correctness at all — it isn't produced internally by the engine).

**Per protocol's own disposition ("Add the missing fields to the run
record; do not alter the engine"):** confirmed as the correct fix.
The run-record schema (C11, not yet implemented) must store the
verbatim `selectedOptionId` and `timestamp` per response (B10.1's
"chosen option where available" should be read as **required**, not
optional, for Tier 1 — every Tier 1 response has a chosen option by
construction). `RecordedExperimentResponse` (`types.ts:130-137`) already
carries both fields in-memory; this is purely a "make sure C11's
on-disk/JSONL run-record schema includes them" note, not an engine
change.

**Also needs the resolved `ExperimentConfig`/`ExperimentScenario`
objects**, which a run record cannot itself carry (they include
non-serializable adapter closures and the full question-bank array).
C11's run record correctly stores only **identity** (condition id,
config hashes, `questionBankVersion`, `curriculumVersion`,
`Q_slice` hash) — the Track A/B runner is responsible for resolving
those identities back into live objects before calling
`replayExperimentSession` (R1a in B10.2). This is already implicit in
B10.1/B10.2's design; noted here only to confirm it, not as a new gap.

---

## 8. P-8 — RNG: counter-based or sequential? Matched-scenario profile reuse?

**Files:** `src/research/experiment/rng.ts` (65 lines, read in full),
`src/research/experiment/matchedScenarios.ts` (49 lines, read in full).

**Finding (RNG):** `createSeededRandom(seed)` is **sequential**, not
counter-based. It hashes the seed once (`hashSeed`, FNV-1a) to obtain
initial PRNG state, then each call to `.next()` **mutates a closed-over
`state` variable** (mulberry32) — the n-th call's output depends on
having made n − 1 prior calls on that same instance. It has **no**
notion of an addressable "index" the way the protocol's `derive(tuple)`
(C4) does (SHA-256 over a 9-field tuple including an explicit `index`,
giving O(1) random access to any draw without replaying the sequence).

**This confirms the protocol's own fallback applies:** per P-8's
disposition ("Sequential RNG: seed one instance per derived key"), C4's
counter-based `derive()` function must be **newly implemented** in
`src/research/phase8/rng/derive.ts` — it cannot reuse `createSeededRandom`
as its substrate for the keyed, addressable draws B3/B6.3/C4 require
(one instance per `(track, familyGroup, world, slice, split, learner,
stream, concept, index)` tuple). `createSeededRandom` remains usable
only for genuinely sequential, non-addressable draws if any arise
(none currently specified in B3–C5).

**Finding (matched-scenario profile reuse):** `createMatchedScenarioSet`
stamps an identical `scenarioId` and shallow-copies the same
`availableQuestions`/`concepts`/`curriculumOrder`/`maxQuestions`
(same object references, confirmed by `isMatchedScenarioSet`'s `===`
checks at lines 43-44) across condition ids. **It does not generate,
store, or reuse a "learner profile"** in B6.3's sense (a learner's
latent state draws, reused identically across C0–C3 for that learner).
There is no learner-profile concept anywhere in `src/research/experiment/`
today — profiles are a Phase 8-specific simulator concern (B3.1) not
yet built. `createMatchedScenarioSet` only guarantees identical
**scenario-level** starting conditions (bank, curriculum, limits), which
is necessary but not sufficient for B6.3's common-random-number
learner-profile reuse.

**Disposition:** Both are **new Phase 8 infrastructure to build**
(`derive.ts` per C4; per-learner profile generation/reuse per B6.3), not
blockers. Existing `rng.ts`/`matchedScenarios.ts` are reusable as
general-purpose utilities elsewhere but do not themselves satisfy C4's
or B6.3's requirements.

---

## 9. P-9 — Exact field names in `AdaptiveSelectionTrace`

**File:** `src/tutoring/selection/adaptive/types.ts:113-135` (read in
full).

```ts
export interface AdaptiveSelectionTrace {
  policyVersion: string;
  configVersion: string;
  config: AdaptiveSelectionConfig;
  learnerId: string;
  sessionId: string;
  sequenceIndex: number;
  targetConcept: TargetConceptDecision;       // .reason, .conceptId, .consideredConcepts, .prerequisiteChain?, .diagnosticDetails?
  targetDifficulty: TargetDifficultyDecision;
  misconceptionEvidenceConsidered: MisconceptionEvidenceTally;
  candidateFilter: {
    totalAvailable: number;
    afterConceptFilter: number;
    afterExposureFilter: number;
    afterFamilyLimitFilter: number;
    afterDifficultyFilter: number;
  };
  topCandidates: CandidateScore[];            // capped at 10 — see candidateSelection.ts
  selectedQuestionId: string | null;
  fallbackUsed: FallbackMode;
  explanation: string;
}
```

**Confirmed against C8.5's definitions:**
- `reason` lives at `targetConcept.reason` (not top-level) — values
  are `"insufficient_evidence" | "progression" | "remediation" |
  "prerequisite_backtrack" | "diagnostic_probe" | "no_eligible_concept"`
  (`src/tutoring/selection/adaptive/types.ts`, `TargetConceptDecision`).
  C8.5's "activated" definition (`prerequisite_backtrack` or
  `diagnostic_probe`) and B6.5's mechanism-count categories map
  directly onto this field with no translation needed.
- `candidateFilter` and `topCandidates` exist exactly as C8.5's
  selection-reconstructability definition assumes; `topCandidates` is
  confirmed capped at 10 (`candidateSelection.ts`'s
  `TOP_CANDIDATES_LIMIT`), matching B7's own statement that
  reconstructability is "expected to fall short of 100%" for that
  reason.
- `diagnosticDetails` (on `targetConcept`, optional) carries
  `originalConceptId`, `triggerConsecutiveIncorrect`,
  `prerequisitesConsidered`, `returnCondition` — available for B6.5's
  "backtrack precision" analysis on diagnostic-probe decisions
  specifically (ordinary `prerequisite_backtrack` decisions carry
  `prerequisiteChain` instead, not `diagnosticDetails`).

**Disposition:** Report only, as specified. C8.5's definitions are
directly implementable against these exact field names.

---

## Integration verification (requirement 4)

Checked directly, not inferred:

- **Phase 3 (`src/domain/learner-model/`):** untouched since Phase 4.
  `DEFAULT_MODEL_PARAMETERS` and `DEFAULT_MODEL_PARAMETERS_V2_INVERSE_DIFFICULTY`
  (`src/domain/learner-model/parameters.ts`) match the values B2/C3
  assume (α = 0.12, β = 0.10, M₀ = 0.5, w_d = 0.8/0.9/1.0/1.1/1.2) —
  confirmed by direct read during this session, consistent with
  `docs/PHASE8_TECHNICAL_BRIEFING.md` §1.2.
- **Phase 5 (`src/research/experiment/`):** `EstimatorAdapter`/
  `SelectionAdapter` (§3, §6, §9 above) are the exact seams C6/C8
  build against; no modification needed to add BKT, RunProp, EMA, B0,
  or the C0-slice policy — all are new `EstimatorAdapter`/
  `SelectionAdapter` implementations plugged in via
  `buildExperimentCondition` (`src/research/experiment/conditions.ts:20-22`),
  exactly as Deliverable C assumes.
- **Phase 6 (`src/research/artifact/`):** `buildManifestFromArtifacts`
  (cited in C11) and `verifyArtifactIntegrity`/`replayFromArtifact`
  (cited in C12's "all four `verifyArtifactIntegrity` checks") exist
  with those exact names — confirmed in this session's own prior work
  building them (`src/research/artifact/manifest.ts`, `integrity.ts`,
  `replayArtifact.ts`).
- **No protected default needed modification** to satisfy any of C6–C9's
  specifications — every new estimator/policy is additive.

---

## Requirement 5 — Decisions D1–D6

Extracted verbatim from `protocol/PHASE8A_PROTOCOL_v2.md`'s Status
table (lines 63-68):

| # | Decision | Proposed default | Scientific implication | Approval status |
|---|---|---|---|---|
| **D1** | Track A non-inferiority margins | 0.010 nats/response (log loss); 0.030 probability units (latent-recovery MAE) | Sets how large a predictive/latent-recovery gap from BKT is "practically negligible." Directly determines whether H-A1-A/B and H-A2-A/B can reject. No simulated or real data can set this — it is a pure value judgement. | **Unresolved — requires author/mentor sign-off.** |
| **D2** | Research-question scope for sequencing | Tier 1 compares C0–C3 with each other only; BKT-driven sequencing (C4) deferred to Tier 2 | Caps what the paper can claim: "prerequisite-aware sequencing beats non-adaptive/unaware sequencing" is in scope; "sequences as well as BKT would" is explicitly **not** a permitted claim under this default (B11.2). | **Unresolved — scope commitment, not derivable from data.** |
| **D3** | Primary BKT comparator | BKT-fit (calibrated) confirmatory; BKT-default (untuned) secondary | Determines which Track A comparison the paper's abstract/headline result is built on. Affects interpretation if BKT-fit and BKT-default diverge substantially. | **Unresolved — a framing choice, not a methodological necessity.** |
| **D4** | Simulator parameter ranges (B3, C3) | As fully specified in B3.3/C3 | Every S1–S4 parameter range is researcher-defined (not fitted to any real data) — the entire simulated "ground truth" the study measures against rests on these choices. | **Unresolved — explicitly flagged for mentor review before freezing.** |
| **D5** | Mechanism-activation interpretation threshold | 10% of C2 sessions in a cell | Determines when H-B2–H-B4 are reported as "uninformative" rather than as genuine non-findings (B6.5, B8.6). A different threshold could reclassify a borderline result. | **Unresolved — an interpretive threshold, author's call.** |
| **D6** | Compute budget ceiling | Author sets a wall-clock ceiling after 8C-Pilot | Determines whether/how far B9.3's reduction order (learners per world, then test-learner count, then S1-check worlds) is applied — directly trades study power for feasibility. | **Unresolved — depends on the 8C-Pilot benchmark, which has not run; cannot be set yet regardless of author preference.** |

**None of D1–D6 are resolved by this pre-flight**, and this report does
not propose resolving any of them — per C0.5/C13, "you may never decide
alone: any change to a simulator range, margin, sample size, metric,
family, condition or hypothesis." All six remain open. D6 specifically
**cannot** be set until after 8C-Pilot produces a runtime benchmark
(B9.3), so it is sequenced differently from D1–D5 (which could in
principle be settled before 8B begins).

---

## Requirement 6 — Canonical protocol filename and files to hash

**Finding — filename mismatch (needs resolution before `APPROVAL.md` can be written correctly):**

`protocol/PHASE8A_PROTOCOL_v2.md`'s own text (C0 and C2) names the
canonical file as **`protocol/phase8-protocol-v2.md`** (lowercase,
hyphenated) twice:

- Line 1391 (§C0): *"...was written by the author, and contains the
  SHA-256 of `protocol/phase8-protocol-v2.md` and of every config
  file."*
- Line 1448 (§C2, layout): `protocol/         phase8-protocol-v2.md AMENDMENTS.md APPROVAL.template.md`

The file as actually saved in this repository is
**`protocol/PHASE8A_PROTOCOL_v2.md`** (the name I gave it when saving
the pasted content, before re-reading C0/C2 closely enough to notice
the protocol specifies its own filename). **These do not match.** A
future `approvalGate.ts` (C12) that looks for `protocol/phase8-protocol-v2.md`
by that exact name would not find the file as it currently sits.

This is a filename/naming-convention question, not a scientific one —
but per instruction I have not renamed anything myself. Two options,
for the author to choose:
1. Rename `protocol/PHASE8A_PROTOCOL_v2.md` → `protocol/phase8-protocol-v2.md`
   (matches the protocol's own stated canonical name).
2. Keep the current filename and amend C0/C2's two references before
   freezing (would itself need to go through the amendment process the
   protocol describes, since it changes frozen-file wording).

**Configuration files that must eventually be hashed for `protocol/APPROVAL.md`**
(per C0.3 and C3) — **none exist yet**, which is expected and correct at
this stage (C1 pre-flight precedes C2/C3 in the specified execution
order):

| File | Status | Will be created in |
|---|---|---|
| `protocol/phase8-protocol-v2.md` (or current name, pending resolution above) | Exists (content complete; filename pending) | Already done |
| `config/phase8/simulator-config-v2.json` | Not yet created | C3, during 8B |
| `config/phase8/estimator-config-v2.json` | Not yet created | C3, during 8B |
| `config/phase8/experiment-plan-v2.json` | Not yet created | C3, during 8B |

`protocol/APPROVAL.md` itself does not exist (correct — per C13, "You
must never create or edit `protocol/APPROVAL.md`," and this report has
not done so). `protocol/AMENDMENTS.md` also does not exist yet; A1 (the
slice-selection and C0-definition amendment) will be its first entry,
written during 8B per C7.1/C8.2 — not during this pre-flight.

---

## Requirement 7 — Protected modules and existing tests

**Protected paths per C0.1:** `src/domain/learner-model/`,
`src/tutoring/selection/`, `data/question-bank/`, and the four exported
defaults (`DEFAULT_MODEL_PARAMETERS`,
`DEFAULT_MODEL_PARAMETERS_V2_INVERSE_DIFFICULTY`,
`DEFAULT_ADAPTIVE_SELECTION_CONFIG`,
`PREREQUISITE_UNAWARE_ADAPTIVE_SELECTION_CONFIG`).

**Confirmed via direct re-read during this pre-flight** (not assumed
from memory): all four defaults' values match what RD-0003/RD-0004/
RD-0005 and `docs/PHASE8_TECHNICAL_BRIEFING.md` §1–4 already document,
with no drift. No file under `src/domain/learner-model/` or
`src/tutoring/selection/` was opened in write mode during this
pre-flight or during the preceding Phase 8 Task A/B session — confirmed
by this pre-flight performing read-only operations exclusively (see
tool-call history: every file above was inspected via `Read`/`grep`
only).

**Test suite:** `npm test` → **686/686 passing**, `npm run typecheck` →
clean, re-run as part of this pre-flight (not assumed stale from the
prior session).

**Known caveat on "unchanged" (worth surfacing explicitly):** `git
status` shows essentially the entire repository's Phase 3–8 work as
**uncommitted** — the only commit in this repository's history is
`3d575ad` ("feat: complete non-adaptive tutoring session," the Phase
0–3 non-adaptive-only baseline, predating the learner model, Phase 4
adaptive engine, Phases 5–7, and this Phase 8 work entirely). There is
**no "Phase 7 commit" to diff against**. This directly affects C9.4's
reproducibility test **R-6** ("git diff against the Phase 7 commit
touches no protected path") — as specified, R-6 cannot run yet, because
its reference commit doesn't exist. This is not a defect in the
protected-path guarantee itself (verified structurally above, by
content, not by git history) but **a gap between the protocol's
assumed git state and this repository's actual git state**, worth
resolving (e.g., by committing a "Phase 7 complete" checkpoint) before
C9.4's R-6 can be implemented as literally specified. I have not made
any commit myself — that is a user action.

---

## Blocking issues

**None.** No P-item triggered its "stop" disposition (P-2's weight
check, the only P-item the protocol marks as stop-capable, passed
cleanly). No protected file or default was found modified. The test
suite passes.

## Non-blocking items needing attention before or during 8B

1. **Protocol filename mismatch** (Requirement 6) — needs the author's
   choice between renaming the file or amending C0/C2.
2. **R-6's reference commit doesn't exist** — recommend a "Phase 7
   complete" checkpoint commit before implementing R-6, or amend R-6 to
   diff against a tag/marker this repository actually has.
3. **C0 vs. C0-slice (P-5)** — `NonAdaptiveSelectionPolicy` can satisfy
   B6.2's criteria only if the Track B runner supplies a pre-ordered
   `predeterminedSequence`; recommend defaulting to C0-slice (C8.2) for
   Tier 1 and recording the reasoning in A1, since the policy provides
   no internal ordering of its own.
4. **`completionCheck` must stay unset for Track B scenarios** (P-6) —
   otherwise K(T) could be measured at an early `completed_normally`
   stop rather than at the intended T = 60 budget boundary.
5. **P-3's confirmed gap** — `createAdaptiveSelectionAdapter`'s
   unconditional cast to `ConceptMasteryState` means C4-BKT (Tier 2,
   D2) will need the `ConceptMasteryState`-compatible view D1 already
   anticipates; no Tier 1 impact.
6. **D1–D6 remain fully open** — none resolved or resolvable by this
   report.

## Exact next implementation step

Per C0 execution order, the next step after this pre-flight is **C2
(layout)** — creating the `src/research/phase8/`, `config/phase8/`,
`tests/research/phase8/`, `analysis/`, `docs/phase8/` directory
structure — followed by **C3** (writing the three versioned config
JSON files with their initial content). Both are still **8B
implementation work**, which remains correctly un-started: per C13 and
this task's explicit instruction, 8B does not begin, no
`protocol/APPROVAL.md` is created, and no config-file content hash is
computed until the author has resolved D1–D6 (at least D1–D5; D6
necessarily waits for the 8C-Pilot benchmark) and the filename question
in Requirement 6, and has explicitly authorized proceeding.

---

**Footnote on method:** P-2's numeric findings were produced by a
throwaway inspection script (`p2-check-tmp.ts`, importing `RISE_QUESTIONS`
and `QUESTIONS` and aggregating `conceptWeights`/`options.length`
directly) that was deleted immediately after running and is not part of
this repository. It performed no writes to any domain or question-bank
file; it only read already-exported, already-loaded data.

# Development Log

A running log of engineering sessions, in the same spirit as the sibling
`adaptive-math-tutor` repo's `docs/development-log.md`. See
`docs/research-decisions.md` for the decisions made along the way.

---

## 2026-10-23 — RISE question bank inventory and integration

**Objective:** Investigate an externally-dropped, previously-unintegrated
dataset (`research-data/Question bank/`, `docs/perp_files/`) claiming to
be a complete 14-chapter, 1,840-question "RISE Adaptive Mathematics
Tutor" question bank, verify its actual completeness and internal
consistency independently rather than trusting its own self-reported
status, and — once verified — integrate it into this repository as a
usable, tested dataset without disturbing the existing, complete
161-question Phase 0-3 bank.

**Starting state:** `research-data/Question bank/` (14 untracked chapter
folders, ~51MB, incremental CSV checkpoints) and `docs/perp_files/`
(untracked, the original Stage A/B pilot package: 25 questions, taxonomy
design docs) existed on disk but were not referenced by any application
code, not committed to git, and not previously inventoried.

**Investigation findings** (see the session transcript for the exact
verification scripts; headline results below):

- The pilot manifest (`docs/perp_files/manifest.json`) describes only the
  original 25-question pilot and does not reflect the much larger
  generation that followed — taken alone, it was actively misleading
  about completeness.
- Every chapter folder's `mathematics_question_bank_checkpoint.csv` is a
  byte-identical superset of the previous chapter's (verified: 0 missing,
  0 changed records at every step from chapter 1 through chapter 14) —
  the generation process was purely additive. Chapter 14's checkpoint
  (1,840 rows) is the complete, final cumulative dataset.
- Chapter 14's checkpoint: 1,840 rows, 1,840 unique `question_id`s, 0
  duplicates, correctly distributed 100-150 questions per chapter across
  all 14 chapters (sums to 1,840 exactly).
- Cross-checked the question bank against `docs/perp_files/`'s pilot-era
  taxonomy (109 concepts, 68 misconceptions, 204 prerequisite edges)
  rather than assuming compatibility: every concept id and misconception
  id referenced by any of the 1,840 questions exists in the taxonomy, and
  conversely every taxonomy entry is used by at least one question — a
  perfect, zero-orphan match in both directions. The prerequisite graph
  is acyclic, with 0 self-dependencies and 0 duplicate edges.
- One question (`MATH-CH11-0002`, a confidence-interval interpretation
  item) is marked `author_reviewed_math_not_automatically_verified`
  rather than auto-verified, because it is a pure conceptual item with no
  numeric computation to execute — not a flagged error. Independently
  reviewed: its correct option is the standard, textbook-correct
  frequentist interpretation, and the three distractors are
  well-documented classic misconceptions (confusing a CI with exact
  equality of sample means, with a prediction interval for individual
  observations, and the Bayesian-flavored misreading of a realized
  interval's coverage probability). Not re-classified as "fully verified"
  — reported as independently reviewed by a human-equivalent process,
  which is a different and weaker claim than an executable check.

**Integration work:**

- Copied (not moved) the canonical chapter-14 checkpoint, its validation
  companion, and the three taxonomy CSVs into `data/question-bank/` (new
  directory) as the single canonical source — see its `README.md` and
  `MANIFEST.json` for exact provenance, hashes, and the compatibility
  checks above.
- `research-data/Question bank/` and `docs/perp_files/` were left
  completely unmodified on disk (confirmed via `git status` showing them
  as untouched throughout). `research-data/` (51MB, mostly redundant
  cumulative snapshots) was added to `.gitignore` rather than committed;
  `docs/perp_files/` (588KB of genuinely useful design documentation) was
  committed as-is.
- Extended `Question` (`src/domain/questions/types.ts`) with optional
  `chapterId`, `conceptWeights`, `prerequisiteConceptIds`, `questionType`
  fields, and `Concept` (`src/domain/concepts/types.ts`) with optional
  `chapterId`/`curriculumLevel` plus 14 new `ConceptStrand` values — all
  additive; the original 161 questions and 35 concepts needed no changes.
- Built `src/domain/rise/` (a hand-rolled RFC 4180 CSV parser plus
  loaders for questions/concepts/misconceptions, reading directly from
  the canonical CSVs at module-init time — see RD-0002 for why this
  wasn't instead transcribed into a committed TS literal) exporting
  `RISE_QUESTIONS` (1,840), `RISE_CONCEPTS` (109), `RISE_MISCONCEPTIONS`
  (68), and a convenience `ALL_QUESTIONS` union — kept as separate
  exports from the original bank rather than merged into it (see RD-0001
  for why: several existing tests assert size ranges calibrated to the
  original small bank that merging would break).
- A single `misconceptionIds_by_option` → `AnswerOption.misconceptionId`
  narrowing was necessary and is documented in code: the source schema
  allows more than one candidate misconception per distractor;
  `AnswerOption.misconceptionId` (matching the original bank's shape) is
  singular, so the first listed candidate is used.
- Added `tests/domain/rise/riseImportIntegrity.test.ts` (20 tests):
  counts and uniqueness, referential integrity (reusing the existing
  `validateDomainModel`/`validateQuestionBank`/`findConceptGraphCycles`
  functions against the RISE dataset specifically), option-count range
  (4-8), grading integration (`gradeAnswer` against real imported
  questions, both correct and misconception-tagged incorrect answers),
  an automated KaTeX-delimiter-balance proxy for "renders correctly"
  (not a substitute for an actual browser check, which was not
  performed), determinism (re-parsing the canonical CSV from scratch
  reproduces the identical id set), and an explicit test for the one
  non-auto-verified question's presence and well-formedness.
- Excluded `research-data/**` and `docs/perp_files/**` from ESLint scope
  (`eslint.config.mjs`) — the external pipeline's own leftover
  `.py`/`.js` QA scripts don't follow this repo's lint conventions and
  aren't application code.

**Verification:** `npm run typecheck`, `npm test` (243/243 passing — 223
original + 20 new, 0 changed/weakened), `npm run lint`, `npm run build`
all clean. `npm run audit:questions` and `npm run audit:session` produce
byte-identical output to before this work (161 questions, 35/35 concept
and misconception coverage, 9/9 strands) — confirming the original bank
and the live `/tutor` session flow are completely unaffected.

**Not done (explicitly out of scope for this pass):** The `/tutor`
session, `NonAdaptiveSelectionPolicy`, and `NON_ADAPTIVE_STUDY_SEQUENCE`
were not modified to use `RISE_QUESTIONS`/`ALL_QUESTIONS` — the existing
non-adaptive study continues to run on the original 161-question bank
only, by design (see RD-0001). No adaptive mastery estimation,
prerequisite-based selection, or learner model was implemented. No
independent human review or empirical (student-response) validation was
performed on any of the 1,840 RISE questions — all remain provisional
pending that review, as their own `validation_status` already states.

**Next step:** Awaiting explicit instruction before any further work —
in particular, before wiring `RISE_QUESTIONS` into any live session flow
or beginning Phase 3 (deterministic learner model / adaptive selection).

---

## 2026-10-23 — Phase 3: deterministic learner model

**Objective:** Implement the learner-model layer for the "RISE Adaptive
Mathematics Tutor" research program — concept-level mastery state, a
deterministic mastery-update formula, decision traces, misconception-
evidence pass-through, and read-only prerequisite-aware query interfaces
— strictly as an estimation layer, with no question selection, no
simulated learners, and no BKT comparison implemented yet. See RD-0003
for the full mathematical specification and the critical examination
performed before implementation.

**Scope boundary respected throughout:** did not touch the question
bank, `NonAdaptiveSelectionPolicy`, `NON_ADAPTIVE_STUDY_SEQUENCE`, or any
UI. Everything new lives under `src/domain/learner-model/` and
`tests/domain/learnerModel/`, independently testable via ordinary Vitest
unit tests with no UI dependency.

**Work done:**

- Searched the repository first, per instruction, for an existing agreed
  mastery formula rather than inventing one — found the sibling
  `adaptive-math-tutor-v1.0` repo's `MasteryPolicy`/`mastery-engine.ts`
  formula and, following the user's explicit choice ("port it faithfully,
  extend for multi-concept"), ported it exactly rather than designing a
  new one.
- Before implementing, wrote out a critical examination of the approved
  formula's boundedness, asymptotic behavior, and path-dependence, and
  directly answered the researcher's explicit question about whether
  difficulty should scale the incorrect branch's penalty the same
  direction as the correct branch's gain — concluded the current
  symmetric weighting is questionable (failing an easy question is
  arguably stronger evidence of a gap than failing a hard one) and
  flagged this as an unimplemented, open refinement rather than changing
  the approved formula unilaterally. Recorded in full in RD-0003.
- Implemented `src/domain/learner-model/`: `types.ts` (all interfaces:
  `ModelParameters`, `ResponseEvidenceRecord`, `ConceptMasteryState`,
  `ResponseEvidence`, `MasteryUpdateTrace`, `ApplyResponseResult`),
  `parameters.ts` (`DEFAULT_MODEL_PARAMETERS`, version
  `deterministic-mastery-v1`), `initialize.ts`
  (`createInitialConceptState` — cold start), `updateMastery.ts`
  (`updateMastery` for one concept, `applyResponseEvidence` fanning one
  response out across a question's `conceptWeights`, and
  `buildExplanation` which generates the trace's prose strictly from the
  already-computed numeric terms so it cannot drift from the actual
  calculation), `misconceptionEvidence.ts` (pure
  `accumulateMisconceptionEvidence` tally — never classifies a learner
  from one wrong answer), `queries.ts` (read-only `getMastery`,
  `getPrerequisiteMastery`, `getConceptsWithInsufficientEvidence`,
  `getEvidenceForConcept`, `getTracesForConcept` — no selection logic),
  `estimatorInterface.ts` (`MasteryEstimator<TState>` contract plus
  `createDeterministicMasteryEstimator`, for a future BKT comparison to
  plug into without either implementation knowing the other's
  internals), and an `index.ts` barrel.
- Self-caught and fixed one lint violation during this work: an
  unnecessary `require()` in `estimatorInterface.ts` (introduced to avoid
  an imagined require-cycle that does not actually exist) — replaced
  with standard ES imports.
- Hand-verified a 6-step worked example (starting `M_0 = 0.5`: correct
  L3, correct L3, incorrect L3, correct-with-hint L3, incorrect L1,
  correct L5) against the implementation via a temporary throwaway
  script before writing it up as a permanent, assertable test — every
  step matched hand computation exactly (0.5 → 0.56 → 0.6128 → 0.5515 →
  0.5838 → 0.5371 → 0.6038) — and confirmed multi-concept attribution
  (a 0.7/0.3 `conceptWeights` split) scales the computed delta exactly
  proportionally. The scratch script was deleted once this was captured
  as a committed test.
- Wrote the full committed test suite in `tests/domain/learnerModel/`
  (74 tests across 5 files): `updateMastery.test.ts` (formula arithmetic
  at standard difficulty, determinism, immutability, bounds under both
  normal and adversarial parameters, difficulty weighting in both
  directions including the documented penalty-direction behavior,
  non-constant gain/loss magnitude as mastery moves, repeated/alternating
  response sequences, extreme-but-permitted parameter values, missing/
  present misconceptionId handling, and decision-trace reconstruction),
  `multiConceptAndState.test.ts` (multi-concept attribution proportionality
  and reduction to the single-concept case at weight 1, independent
  concept states, cold-start handling, prerequisite concepts never
  auto-credited, serialization/restoration round-trips, and the worked
  6-step example as a permanent regression test), `queries.test.ts`
  (all five read-only query functions plus a structural guard against a
  future selection-shaped export being added to this read-only module),
  `misconceptionEvidence.test.ts` (pure tally accumulation, no
  classification), and `estimatorInterface.test.ts` (the
  `MasteryEstimator` contract).

**Verification:** `npm test` — 317/317 passing (243 existing + 74 new, 0
changed/weakened). `npm run typecheck` and `npm run lint` both clean.
`npm run audit:questions` and `npm run audit:session` produce the same
output as before this work (161 questions, 35/35 coverage, 9/9 strands;
35-question study sequence, 0 integrity errors) — confirming the live
`/tutor` session and question bank are completely unaffected, as this
phase never touches either.

**Not done (explicitly out of scope for this phase):** No question
selection, no simulated-learner engine, no BKT/IRT/Elo implementation, no
misconception-diagnosis policy, no UI changes, no `/tutor` wiring. The
difficulty-direction question on the incorrect branch (RD-0003) remains
an open design question, not resolved or silently changed.

**Next step:** Per explicit instruction, Phase 4 (adaptive selection,
simulated learners, estimator comparison) is **not** started
automatically — awaiting explicit direction.

---

## 2026-10-23 — Phase 3 refinement: configurable difficulty-weighting variants (RD-0004)

**Objective:** Resolve the open difficulty-direction question RD-0003
flagged (should a harder incorrect response be penalised more, like the
correct branch, or less?) by implementing both the original symmetric
weighting and the proposed inverse weighting as explicit, versioned,
side-by-side variants — without silently changing the original model's
historical behavior.

**Work done:**

- Added `incorrectDifficultyWeighting: "multiplicative" | "inverse"` to
  `ModelParameters` (`src/domain/learner-model/types.ts`); the
  correct-response formula is unaffected by this field.
- `updateMastery.ts` now computes a `difficultyFactorApplied` distinct
  from the raw `difficultyWeight`: equal to `difficultyWeight` for every
  correct update and for an incorrect update under `"multiplicative"`;
  equal to `1/difficultyWeight` for an incorrect update under
  `"inverse"`. Both are recorded on the trace. Added a stability guard —
  `updateMastery` throws rather than dividing by zero if `"inverse"` is
  configured against a `0`-weighted difficulty level.
- `parameters.ts`: `DEFAULT_MODEL_PARAMETERS` (Variant A,
  `deterministic-mastery-v1`) kept as the historical baseline, now with
  `incorrectDifficultyWeighting: "multiplicative"` made explicit. Added
  `DEFAULT_MODEL_PARAMETERS_V2_INVERSE_DIFFICULTY` (Variant B,
  `deterministic-mastery-v2-inverse-difficulty`) — identical in every
  other parameter, adopted as the provisional default for Phase 4 work
  only (not a replacement for the Phase 3 baseline).
- `buildExplanation` updated to render the variant actually used (`w_d`
  vs. `1/w_d`) in its generated prose, still derived strictly from the
  computed terms.
- Added `tests/domain/learnerModel/difficultyVariants.test.ts` (18
  tests): Variant A's original 6-step worked example reproduced exactly
  post-refactor; exact expected values for both variants across all five
  difficulty levels; inverted monotonicity confirmed (Variant A: harder
  incorrect = bigger penalty; Variant B: harder incorrect = smaller
  penalty); bounds under 500 consecutive incorrect responses at the most
  extreme configured weight; determinism; multi-concept proportional
  scaling under Variant B; full trace reconstruction; the
  divide-by-zero stability guard (throws under `"inverse"`, does not
  throw under `"multiplicative"`, where a `0` weight just zeroes the
  penalty).

**Task A acceptance gate — all conditions met:**
1. Both variants have explicit, documented mathematical definitions (RD-0004). ✓
2. Both pass their mathematical tests (18/18 new tests). ✓
3. Variant A preserves its original behavior exactly (regression test
   reproduces the original 0.5→…→0.6038 sequence unchanged). ✓
4. Variant B produces the expected inverse difficulty effects (tested at
   all 5 levels with exact values). ✓
5. All mastery values remain bounded (tested under 500-iteration runs and
   adversarial parameters). ✓
6. Decision traces faithfully represent the executed calculation (new
   `difficultyFactorApplied` field plus `incorrectDifficultyWeighting`/
   `modelVersion` on every trace). ✓
7. Learner-model interfaces remain compatible — no existing call site
   (`initialize.ts`, `estimatorInterface.ts`, `queries.ts`,
   `misconceptionEvidence.ts`) needed any change. ✓
8. Full existing+new suite passes: **335/335 tests** (317 prior + 18
   new), `npm run typecheck` clean, `npm run lint` clean (0 errors; fixed
   4 transient unused-variable warnings introduced while writing the new
   tests), `npm run audit:questions` and `npm run audit:session`
   byte-identical to before this change. ✓
9. No unresolved material mathematical or architectural issue remains for
   this specific question — it has been resolved by making it an
   explicit, inspectable configuration choice rather than a hidden
   assumption. ✓

**Verdict:** Task A acceptance gate **passed**. See the separate Phase 4
scope note below for why Task B (adaptive question selection) was
**not** started automatically despite this.

---

## 2026-10-23 — Phase 4 scope conflict: paused before implementation

**Context:** Immediately following the Task A refinement above, Task B of
the same instruction asked for a full deterministic adaptive
question-selection and prerequisite-aware sequencing engine to be built
in this repository, authorised to proceed automatically once Task A's
acceptance gate passed (which it did).

**Why this was paused instead of started automatically:** This
repository's own `CLAUDE.md` states, as a hard constraint checked into
the codebase: *"This repository is the **non-adaptive** condition... The
adaptive condition is developed **separately**, in a sibling repository
(`adaptive-math-tutor`)... Do not try to build the adaptive condition
here,"* and explicitly lists "adaptive sequencing, dynamic remediation,
personalized difficulty" among things **not** to build in this
repository. The existing `AdaptiveSelectionPolicy`
(`src/tutoring/selection/adaptive/adaptiveSelectionPolicy.ts`) is an
intentional skeleton whose `selectNextQuestion` throws, with a docstring
stating plainly: *"Mastery-driven sequencing is developed in the
adaptive-tutor repository."* Building out Phase 4's full selection engine
— prerequisite-aware concept targeting, adaptive difficulty selection,
misconception-aware diagnosis, candidate ranking, deterministic
tie-breaking — would mean fully implementing exactly the thing that
skeleton, and the project's own constraints, say does not belong here.

This is treated the same way an earlier repo-identity ambiguity in this
same project was handled (see the RISE question-bank inventory entry
above): a structural scope question significant enough to require
explicit user confirmation rather than a judgment call, not a simple
implementation detail. The Phase 3 learner-model work (estimation only,
no selection) was explicitly scoped to avoid this exact conflict — it
lives under `src/domain/learner-model/`, is never read by
`NonAdaptiveSelectionPolicy` or `/tutor`, and `CLAUDE.md` was itself
updated to describe it as acceptable "shared infrastructure." Task B's
adaptive *selection* engine does not have that same separation available
to it by nature of what it is.

**Status:** Task A complete and committed to the record above. Task B
not started. Awaiting explicit direction on one of: (a) build Phase 4 in
this repository anyway, with `CLAUDE.md` explicitly updated to authorise
it, (b) build Phase 4 in the sibling `adaptive-math-tutor` repository
instead, where the existing skeleton already says it belongs, or (c)
some other resolution of the conflict.

**Resolution:** the user chose option (a). `CLAUDE.md` was amended first
(see its "This is a research experiment, not a product" and "Shared
infrastructure" sections, and the updated "Things explicitly not to
build" list) to explicitly authorise the adaptive selection ENGINE here
while keeping the adaptive condition's own participant-facing session/UI
in the sibling repo. Task B was then implemented — see the Phase 4 entry
below.

---

## 2026-10-23 — Phase 4: adaptive question-selection engine

**Objective:** Implement a deterministic, prerequisite-aware adaptive
question-selection engine (`src/tutoring/selection/adaptive/`) that
consumes the Phase 3 learner model to decide which question to present
next — combining concept-level mastery, prerequisite relationships,
adaptive difficulty, and misconception evidence into an auditable,
reproducible decision, without touching the non-adaptive baseline or the
mastery formula itself. Full design in `docs/research-decisions.md`
RD-0005.

**Work done:**

- Inspected the existing architecture first: `QuestionSelectionPolicy<TContext>`
  (`src/tutoring/selection/types.ts`), the `NonAdaptiveSelectionPolicy`/
  `NonAdaptiveSelectionContext` pair (confirmed untouched throughout),
  the `AdaptiveSelectionPolicy` skeleton and its old `StudentModel`-based
  `AdaptiveSelectionContext` (Phase 0 placeholder, now superseded), the
  Phase 3 learner-model interfaces, `Concept.prerequisiteIds`,
  `RECOMMENDED_CURRICULUM_ORDER`, `Question.conceptIds`/`conceptWeights`/
  `questionFamily`, and `AnswerOption.misconceptionId`.
- `config.ts`: `AdaptiveSelectionConfig` — every threshold centrally
  defined and versioned (`adaptive-selection-v1`), explicitly documented
  as researcher-defined, not empirically calibrated (B7's instruction).
- `types.ts`: a new `AdaptiveSelectionContext` built around the real
  `ConceptMasteryState` map and a per-concept `MisconceptionEvidenceTally`
  map (both caller-supplied, read-only to this policy — it never updates
  mastery or misconception evidence itself), plus the full
  `AdaptiveSelectionTrace` structure.
- `targeting.ts`: `findProgressionFrontier` (first not-yet-mastered
  concept in curriculum order), `findRemediationTarget` (bounded,
  closest-first breadth-first search over direct prerequisites, with a
  visited-set guard against cycles in addition to the configured depth
  bound), `chooseTargetConcept` (combines the two: progression by
  default, remediation on a repeated-incorrect streak, backtracking into
  a weak prerequisite when one is found), `chooseTargetDifficulty`
  (mastery-to-difficulty bands, a diagnostic difficulty under low
  evidence, and same-difficulty repetition avoidance).
- `candidateSelection.ts`: deterministic filter-then-rank pipeline
  (concept match, exposure avoidance, soft question-family repetition
  limit, difficulty match widened outward when necessary, then a
  misconception-overlap-weighted score with `questionId` as the final
  tie-break).
- `adaptiveSelectionPolicy.ts`: `selectAdaptiveQuestion` orchestrates
  targeting + candidate selection, falling through to the next eligible
  concept (bounded, each tried once) if the targeted concept's pool is
  exhausted, and builds the full trace, whose `explanation` is generated
  from its own already-computed fields. `AdaptiveSelectionPolicy` wraps
  this to implement `QuestionSelectionPolicy<AdaptiveSelectionContext>`
  for real, replacing the throwing skeleton.
- Updated the one existing test that asserted the OLD throwing-skeleton
  behavior (`tests/tutoring/experimentalSeparation.test.ts`) to assert
  the new real behavior instead (returns a structured null-question
  result with an explanation for an empty context, rather than throwing).
- Added 52 new tests across three files:
  `tests/tutoring/selection/adaptive/targeting.test.ts` (27 — mastery/
  evidence gating, progression frontier advancement including the
  "always returns the last concept, never null, once everything is
  mastered" case, prerequisite backtracking at multiple depths including
  "prefers the closer prerequisite," the depth bound, a cyclic-graph
  non-infinite-loop case, read-only/no-auto-credit verification,
  difficulty-band boundaries, and repetition-avoidance nudging),
  `candidateSelection.test.ts` (13 — deterministic tie-breaking,
  exposure/family/difficulty filtering and widening, misconception-aware
  scoring gated by the evidence-count minimum, full filter-funnel
  recording, and graceful handling of an out-of-range difficulty value),
  and `adaptiveSelectionPolicy.test.ts` (12 — a worked multi-round
  session that actually round-trips through the real Phase 3
  `applyResponseEvidence`, determinism, progression once a concept is
  mastered, exhausted-pool fallthrough to the next concept, total-bank
  exhaustion, missing/invalid metadata, full trace reconstruction,
  confirmation that `NonAdaptiveSelectionPolicy` is unaffected, and two
  tests running the real engine against the actual 1,840-question/
  109-concept RISE bank — one single-selection compatibility check and
  one 25-round simulated session confirming no repeated questions and no
  hangs).

**Verification:** `npm test` — **387/387 passing** (335 prior + 52 new,
0 changed/weakened — the one modified test now asserts stronger,
more specific behavior than before, not weaker). `npm run typecheck` and
`npm run lint` clean. `npm run audit:questions` and `npm run audit:session`
byte-identical to before this work. `npm run build` succeeds, producing
the same two routes (`/tutor`, `/dev/session`) as before — confirming the
live non-adaptive product is completely unaffected by this engine's
existence.

**Not done (explicitly out of scope for this phase):** no simulated-
learner engine, no BKT/IRT/Elo implementation, no formal experiment or
ablation harness, no live adaptive `/tutor`-equivalent session/UI (that
remains the sibling repo's responsibility per the amended CLAUDE.md
boundary — this phase only builds and tests the selection engine itself,
demonstrated via the worked multi-round unit test rather than a new live
route), no LLM-based selection, and no tuning of the provisional
threshold defaults against any evaluation dataset.

**Next step:** Per instruction, Phase 5 is not started automatically —
awaiting explicit direction.

---

## 2026-10-23 — Phase 4 refinement: diagnostic backtracking into previously-progressed prerequisites

**Objective:** RD-0005 documented a real limitation: because the
remediation threshold (0.35) is strictly below the progression threshold
(0.75), `findRemediationTarget` could never re-flag a prerequisite the
engine had already advanced past, even if a downstream concept kept
failing. This conflicted with the research objective of genuinely
prerequisite-aware adaptive sequencing, so a second, independent
mechanism was added specifically to make previously-mastered
prerequisites reachable again — without changing the two existing
thresholds, without auto-penalizing any prerequisite's mastery, and
without risking an infinite or trapped remediation cycle.

**Work done:**

- `config.ts`: added `diagnosticBacktrackConsecutiveIncorrectThreshold`
  (4, stricter than the existing remediation threshold of 2 — crossing
  it implies ordinary remediation already ran and failed to resolve the
  struggle) and `diagnosticStalenessThreshold` (8 sequence steps).
  Config version bumped `adaptive-selection-v1` → `adaptive-selection-v2`.
- `targeting.ts`: added `findDiagnosticBacktrackTarget` — same bounded,
  closest-first, visited-set-guarded traversal as the existing
  `findRemediationTarget`, but eligibility is "stale" (no evidence, or
  last observation ≥8 sequence steps old) rather than "low mastery," so
  it can select ANY direct prerequisite regardless of historical
  mastery. Wired into `chooseTargetConcept` as a new check that runs
  BEFORE the existing remediation check, at the new higher threshold;
  falls through to ordinary remediation unchanged if no prerequisite is
  currently eligible for diagnostic probing.
- `types.ts`: added `"diagnostic_probe"` to `TargetConceptDecision.reason`,
  plus `DiagnosticCandidateInfo` and `DiagnosticProbeDetails`
  (`originalConceptId`, `triggerConsecutiveIncorrect`,
  `isTemporaryProbe: true`, `prerequisitesConsidered`, and a
  human-readable `returnCondition`) so a trace explicitly distinguishes
  temporary diagnostic probing from permanent curriculum regression,
  rather than leaving that to be inferred.
- `adaptiveSelectionPolicy.ts`: policy version bumped
  `adaptive-selection-policy-v1` → `-v2`; the generated explanation now
  names a diagnostic probe explicitly (`[TEMPORARY DIAGNOSTIC PROBE —
  ...]`) including why it triggered and what has to happen to return to
  the original concept. No change was needed to the exhausted-pool
  fallthrough logic — it already generalizes to a diagnostic target's
  question pool being exhausted, since it operates on whatever concept
  id `chooseTargetConcept` returned, regardless of which reason produced
  it.
- Added `tests/tutoring/selection/adaptive/diagnosticBacktracking.test.ts`
  (16 tests): selecting a previously-mastered-but-stale prerequisite;
  NOT selecting one that's still fresh even with low mastery; preferring
  lower mastery and never-observed candidates among several eligible
  ones; multi-level chains; the depth bound; a cyclic-graph
  non-infinite-loop case; no mutation of `conceptMasteryStates` (no
  automatic penalty); determinism; and — the key "no trap" property — a
  test confirming that once a probed prerequisite's evidence is fresh
  again, the very next call returns to targeting the original downstream
  concept rather than re-selecting the same prerequisite. Added 2 more
  tests to `adaptiveSelectionPolicy.test.ts` confirming the orchestration
  actually selects a real question for a diagnostic target and correctly
  falls through to the next eligible concept when the diagnostic target's
  own question pool is exhausted.

**Verification:** `npm test` — **405/405 passing** (387 prior + 18 new:
16 in the new file, 2 added to the existing policy test file — 0
changed/weakened). `npm run typecheck` and `npm run lint` clean.
`npm run audit:questions` and `npm run audit:session` byte-identical to
before. `npm run build` succeeds, same two routes as before.

**Resolution of the originally-documented limitation:** it is now
possible for the engine to revisit a previously-progressed prerequisite,
but only when (a) a downstream concept shows SUSTAINED difficulty (a
stricter bar than ordinary remediation) and (b) that prerequisite's
evidence is actually stale — a real design choice, not an oversight:
re-probing a prerequisite that was JUST confirmed correct would be
pointless busywork, not diagnosis. The original limitation note in
RD-0005 is retained, with an addendum immediately below it explaining
precisely how and why it was addressed, since understanding why the
first design fell short is part of the research record.

**Not done / unresolved:** no formal evaluation of whether 4/8 are good
threshold values — they are, like every other threshold in this engine,
researcher-defined starting points, explicitly not tuned against any
evaluation dataset (same posture as RD-0005's original thresholds).
Multi-prerequisite "episodes" are handled one prerequisite per sustained-
difficulty window (ranked, not all probed simultaneously) — if a
downstream concept has several weak-but-stale prerequisites, they are
diagnosed one at a time, round-robin, as each becomes the best-ranked
eligible candidate; this was a deliberate simplicity choice, not
verified against any alternative (e.g. batching multiple simultaneous
probes) which was not requested.

**Next step:** Per instruction, Phase 4 (with this refinement) is
considered complete. Phase 5 is not started automatically — awaiting
explicit direction.

---

## 2026-10-23 — Phase 5: experimental conditions and session engine

**Objective:** Build a controlled, headless experimental session
framework (`src/research/experiment/`) that can run different mastery
estimators and question-selection policies under equivalent, reproducible
conditions — the infrastructure needed to later evaluate the
deterministic, prerequisite-aware model against established
knowledge-tracing methods, without yet implementing simulated learners
(Phase 8) or BKT itself. Full design in `docs/research-decisions.md`
RD-0006.

**Work done:**

- Inspected the existing architecture first, per instruction: the Phase 1
  non-adaptive session service (`src/tutoring/session/service.ts` —
  confirmed stateful/singleton, correctly NOT reused directly), the
  Phase 3 learner model (both difficulty-weighting variants), the Phase 4
  adaptive policy and its diagnostic-backtracking refinement, the
  integrated 1,840-question bank and curriculum metadata, and the
  existing `ResearchEvent`/`ResearchEventLogger` infrastructure (found to
  be a closed discriminated union unsuited to estimator/selection traces
  without risking the Phase 3 event schema — see RD-0006 for why
  `provenance.ts` was built as a purpose-built substitute instead).
- `src/tutoring/selection/adaptive/config.ts`: added a required
  `prerequisiteAware: boolean` field to `AdaptiveSelectionConfig`
  (default `true`, preserving Phase 4 behavior exactly) plus a new
  `PREREQUISITE_UNAWARE_ADAPTIVE_SELECTION_CONFIG` export (condition C3).
  `targeting.ts`'s `chooseTargetConcept` now skips both backtracking
  mechanisms entirely when `prerequisiteAware` is `false`, falling back
  to "remediation on the same concept" — difficulty adaptation
  (`chooseTargetDifficulty`) is untouched by this flag.
- `src/research/experiment/types.ts`: `EstimatorAdapter<TState>`,
  `SelectionAdapter`, `ExperimentConfig`, `ExperimentScenario`,
  `ExperimentSessionState` (plain JSON-serializable data, no class
  instances — required for byte-for-byte replay comparison).
- `estimatorAdapter.ts`: `createNullEstimatorAdapter` (C0) and
  `createDeterministicEstimatorAdapter` (C1/C2/C3's estimator, wrapping
  Phase 3's `applyResponseEvidence` directly).
- `selectionAdapter.ts`: `createNonAdaptiveSelectionAdapter` and
  `createAdaptiveSelectionAdapter` — thin wrappers exposing
  `NonAdaptiveSelectionPolicy`/`AdaptiveSelectionPolicy` behind one
  common `SelectionAdapter` contract.
- `conditions.ts`: the C0-C3 registry (`EXPERIMENT_CONDITIONS`) plus
  `buildExperimentCondition` (the generic factory also used for Track
  A's "estimator + non-adaptive selection" combination) and
  `buildC4PluggableEstimatorCondition` (the typed extension point for a
  future BKT estimator — no BKT implemented).
- `sessionEngine.ts`: `startExperimentSession` /
  `recordExperimentResponse` / `advanceExperimentSession`
  (mirroring `service.ts`'s start/submit/advance lifecycle shape, but
  pure and estimator/policy-generic), plus `runExperimentToCompletion`
  and `createFixedResponseSequenceProvider` — the "replaceable response
  provider / externally supplied sequence" the engine itself never
  generates a response through. Implements all of section 8's
  termination rules (`question_limit_reached`, `candidate_pool_exhausted`,
  `completed_normally` via a generic duck-typed mastery-completion check,
  `invalid_configuration`, `unrecoverable_error`) as structured state,
  never a silent success.
- `validation.ts`: `validateExperimentConfig` — structural and
  cross-field checks (adaptive + "none" estimator rejected as
  incompatible; non-adaptive missing its predetermined sequence
  rejected; invalid deterministic-mastery parameters, session limits, and
  difficulty levels rejected), deliberately without a closed estimator-
  type allowlist that would foreclose C4.
- `provenance.ts`: `buildExperimentProvenance` — a direct copy-out record
  (condition/run/scenario id, SHA-256 content hashes of the question bank
  and curriculum graph, estimator/policy identity+version+parameters,
  session limits, the actual selection/response sequences, every
  estimator/selection trace) satisfying requirement 9 without a new
  analytics platform.
- `replay.ts`: `replayExperimentSession` — re-runs a session from scratch
  against the same config/scenario/response sequence and deep-diffs the
  result, reporting the first divergence. Fixed one real design issue
  caught while writing its tests: decision traces embed a `sessionId`
  derived from the run id, so a replay originally defaulted to a
  `"-replay"`-suffixed id would ALWAYS show a (correct but misleading)
  divergence in every trace; changed the default `replayRunId` to the
  original run's own id, since strict replay means reproducing the exact
  same run, not a relabeled one.
- Added 67 new tests across six files in `tests/research/experiment/`:
  `estimatorAdapter.test.ts` (13 — including Variant A/B divergence on
  identical input, multi-concept fan-out, serialization), 
  `selectionAdapter.test.ts` (9 — non-adaptive's structural independence
  from mastery data, the adaptive adapter's trace exposure, aware vs.
  unaware wiring), `conditions.test.ts` (7 — the C0-C3 registry, C4's
  pluggable extension point, Track A's generic factory),
  `validation.test.ts` (12 — accept-path for every registered condition,
  reject-path for every listed invalid-configuration category),
  `sessionEngine.test.ts` (19 — full C0 lifecycle, Variant A/B execution
  and divergence under an identical response sequence, prerequisite-aware
  vs. unaware producing different question sequences from an identical
  scenario, every termination reason, `maxExposurePerQuestion`,
  estimator-state serialization round-trip within a session, grading
  reuse, provenance completeness including missing-optional-trace
  handling, a full run against the real 1,840-question RISE bank, and
  byte-identical re-execution under the same run id), and
  `replay.test.ts` (7 — exact reproduction of selections/mastery/traces/
  termination, divergence detection with first-location reporting,
  non-mutation of the original state). Also added 6 tests to
  `tests/tutoring/selection/adaptive/prerequisiteUnawareAblation.test.ts`
  for the new config flag itself.

**Verification:** `npm test` — **478/478 passing** (405 prior + 67 new in
`tests/research/experiment/` + 6 new for the ablation flag; 0 changed/
weakened). `npm run typecheck` and `npm run lint` clean. `npm run
audit:questions` and `npm run audit:session` byte-identical to before.
`npm run build` succeeds, same two routes (`/tutor`, `/dev/session`) as
before — the live non-adaptive product and its store/service were not
touched.

**Not done (explicitly out of scope for this phase):** no simulated-
learner generator, no BKT/IRT/Deep-KT implementation, no large-scale
benchmark experiments, no statistical significance testing, no
publication figures, no new participant-facing UI. `ResearchEvent`
logging was deliberately NOT wired into the experiment engine (see
RD-0006's "alternatives considered" for why); `provenance.ts` is the
substitute mechanism actually used.

**Next step:** Per instruction, Phase 6 is not started automatically —
awaiting explicit direction. No unresolved architectural blocker was
found that would prevent either Phase 6 or Phase 8 from proceeding.

---

## 2026-10-23 — Phase 6: research logging, persistence, export and reproducibility

**Objective:** Implement a reliable, versioned research-data pipeline
(`src/research/artifact/`) that can persist, inspect, export, restore,
verify, and reproduce Phase 5 experimental sessions without touching
their mathematical or adaptive behavior — infrastructure to make Phase 5
ready for large-scale simulation and comparison in Phase 8. Full design
in `docs/research-decisions.md` RD-0007.

**Work done:**

- Inspected the existing architecture first, per instruction: the
  complete Phase 5 implementation (`types.ts`, `sessionEngine.ts`,
  `provenance.ts`, `replay.ts`, `validation.ts`, `conditions.ts` and
  their tests), the research-event schema from earlier phases (confirmed
  still a closed union unsuited to estimator/selection traces — RD-0006's
  decision not to force this data into it was re-confirmed, not
  re-litigated), the Phase 3/4 trace shapes, and the project's test
  runner/scripts (`tsx`-run scripts under `scripts/`, confirmed as the
  existing convention for a headless CLI).
- Exported `hashQuestionBank`/`hashCurriculum` from
  `src/research/experiment/provenance.ts` (previously private) so
  Phase 6's integrity checks could recompute the identical fingerprint
  against a live bank, rather than re-deriving the definition a second
  time — the only change made to Phase 5 code in this entire phase.
- `src/research/artifact/types.ts`: `ExperimentRunArtifact`, schema
  version `experiment-run-artifact-v1`, built around the existing
  `ExperimentProvenance` plus the envelope/final-state fields Phase 5
  didn't already capture.
- `canonicalize.ts`: deterministic canonicalization (sorted keys,
  order-preserving arrays, full floating-point precision) and a SHA-256
  content digest.
- `buildArtifact.ts`: `buildExperimentRunArtifact` and a best-effort
  `getCurrentSoftwareVersion` (package version + optional git commit).
- `persistence.ts`: atomic, collision-safe, path-traversal-safe,
  overwrite-protected filesystem storage under a new `research-output/`
  directory (gitignored, kept separate from `data/question-bank/`), with
  a lightweight `.meta.json` sidecar per run for cheap listing.
- `integrity.ts`: `verifyArtifactIntegrity` — four independently
  reported checks (content digest, question-bank match, curriculum
  match, software version), each a tri-state (`true`/`false`/
  `"not_checked"`) rather than a single collapsed verdict.
- `export/csv.ts` + `export/datasets.ts`: a small hand-rolled CSV/JSONL
  writer plus the five required datasets (run summary, question-response
  observations, concept mastery trajectories with correct multi-concept
  attribution, selection-decision records, misconception evidence with
  `isConfirmedDiagnosis` permanently `false`).
- `manifest.ts`: `buildManifestFromArtifacts` — batch-level
  reproducibility manifests, separately schema-versioned, rejecting a
  batch that mixes dataset versions, marking `verified` only when an
  actual check passed for that specific run.
- `replayArtifact.ts`: `replayFromArtifact` reuses Phase 5's
  `replayExperimentSession` directly (not duplicated), distinguishing
  `"integrity_only"` from `"computational_replay"` results across every
  documented reason (unsupported schema, invalid digest, non-terminated
  run, unresolvable condition).
- `inspect.ts` + `scripts/research-cli.ts`: a read-only researcher API
  (list/get/verify/summarize/compare) and a thin CLI wrapper over the
  same functions — `npm run research:cli` added to `package.json`.
- Added 93 new tests across nine files in `tests/research/artifact/`:
  `canonicalize.test.ts` (9), `buildArtifact.test.ts` (9),
  `persistence.test.ts` (19 — including temp-directory-based atomic
  write, overwrite-refusal, path-traversal, and corrupt-file tests),
  `integrity.test.ts` (9 — each of the four check dimensions verified
  independently reportable), `export/datasets.test.ts` (15 — including a
  genuine multi-concept question exercising `conceptWeights` attribution
  and RFC 4180 CSV escaping), `manifest.test.ts` (9), `replayArtifact.test.ts`
  (9 — every integrity-only reason plus a genuine computational-replay
  divergence), `inspect.test.ts` (11), and `endToEnd.test.ts` (3 — the
  full section-13 demonstration: init → run → trace → artifact → persist
  → load → verify → export all five datasets → replay → confirm match,
  run against both a synthetic bank and the real 1,840-question RISE
  bank, with an explicit test that the pipeline never computes a
  fabricated learning-gain or mastery-accuracy figure).

**Verification:** `npm test` — **571/571 passing** (478 prior + 93 new; 0
changed/weakened). `npm run typecheck` and `npm run lint` clean.
`npm run audit:questions` and `npm run audit:session` byte-identical to
before. `npm run build` succeeds, same two routes (`/tutor`,
`/dev/session`) as before — no Phase 1-5 source file was modified except
the one `provenance.ts` export change noted above.

**Not done (explicitly out of scope for this phase):** no simulated
learners or response-generation distributions, no BKT/IRT implementation,
no full benchmark experiments, no empirical calibration, no learning-gain
estimation, no statistical significance testing, no new cloud
infrastructure or database service, no participant-facing UI change.

**Next step:** Per instruction, Phase 7 and Phase 8 are not started
automatically — awaiting explicit direction. No unresolved critical
architectural blocker was found.

---

## 2026-10-24 — Phase 7 repo-boundary finding: the named sibling repo is incompatible

**Context:** Phase 7 asked for a participant-facing adaptive tutoring
application, with explicit instructions to preserve the previously
documented boundary — this repo owns the core tutoring logic/learner
model/selection policies/research infrastructure, the sibling repo named
in `CLAUDE.md` (`adaptive-math-tutor`) owns the adaptive UI — "unless
existing repository documentation specifies an updated arrangement," and
to "stop and report the blocker" rather than build in the wrong place if
cross-repository integration couldn't be done safely.

**Finding:** Inspected the sibling repository directly
(`~/Desktop/adaptive-math-tutor-v1.0`, confirmed accessible, clean working
tree aside from previously-known stashed work). Its own `CLAUDE.md`
describes a genuinely different, pre-existing research prototype: an
LLM-centric adaptive tutoring architecture (research question: does
explicit learner modelling improve an LLM tutor vs. a plain conversational
LLM tutor — NOT this repo's deterministic-model-vs-knowledge-tracing
question), its own small quadratic-equations-only domain model (not the
1,840-question, 14-chapter RISE bank this repo integrated in the earlier
RISE work), and its own unrelated mastery heuristic
(`recordStudentPerformance`, Phase 2 of ITS OWN numbering, nothing to do
with this repo's Phase 3 formula). It also has an LLM-generation layer
baked into its architecture, which this repo's hard constraint 2
(no LLM-based grading, ever) would conflict with if the two were merged.

**Why this is a "stop and report" situation, not a routine integration:**
wiring a UI there to consume this repo's actual Phase 3/4 intelligence
would require either gutting that repo's own already-developed system or
running two incompatible domain models side by side in it — a
substantive, invasive cross-repository change, not the "narrowly scoped,
versioned interface" the task asked for. This is not "the sibling repo
is inaccessible" (it is accessible) — it is that the sibling repo turns
out not to be the thing this phase assumed it was.

**Resolution:** presented the finding and three options to the user
(build the UI here with `CLAUDE.md` updated; attempt the invasive
cross-repo integration anyway; stop with no UI work this session). The
user chose to build the UI directly in this repository. `CLAUDE.md` was
updated first (see its "This is a research experiment, not a product"
section) to explicitly authorise this, record the finding, and confirm
`adaptive-math-tutor-v1.0` was not modified. See the Phase 7 entry below
for the actual implementation.

---

## 2026-10-24 — Phase 7: adaptive student experience and application integration

**Objective:** Deliver a functional, reliable adaptive mathematics
tutoring application (`/adaptive-tutor`) that uses the REAL Phase 3
mastery estimator, Phase 4 adaptive selection engine, and the validated
1,840-question bank — a working demonstration of the research system,
not a second implementation of it. Full design in
`docs/research-decisions.md` RD-0008.

**Work done:**

- Inspected both repositories first (see the repo-boundary finding
  above), then the complete Phase 3-6 implementation already in this
  repo, the existing non-adaptive `/tutor` UI
  (`src/app/tutor/`, `src/tutoring/session/`) to mirror its proven
  architecture exactly rather than inventing a new pattern, and the
  existing component-test setup (`@testing-library/react` + jsdom,
  already configured and used for `tutor-client.test.tsx` — confirmed
  reusable as-is for the new adaptive client).
- Discovered no KaTeX rendering existed anywhere in the repository
  (only an automated delimiter-balance validator from the RISE import
  work) despite Phase 7's brief assuming it did. Confirmed the RISE
  bank's actual delimiter convention directly against real data
  (`\( ... \)` inline, `\[ ... \]` display — not the `$...$` initially
  guessed) before writing `src/components/MathText.tsx`. Added
  `katex`/`@types/katex` as real dependencies; confirmed via `npm audit`
  that katex itself introduces no new vulnerabilities (the flagged
  issues are pre-existing, unrelated Next.js/sharp/source-map-js
  advisories, left untouched as out of scope for this phase).
- Built `src/tutoring/adaptiveSession/` as a thin orchestration layer
  over the EXISTING Phase 5 session engine
  (`startExperimentSession`/`recordExperimentResponse`/
  `advanceExperimentSession`) and condition C2
  (`EXPERIMENT_CONDITIONS.C2` — Variant B + prerequisite-aware adaptive,
  the approved provisional default per section 4.A) — `service.ts`,
  `store.ts` (a separate in-memory store from the non-adaptive
  condition's), `errors.ts`, `curriculum.ts` (chapter listing/ordering
  from the real RISE taxonomy), `publicViews.ts` (the research-metadata
  boundary, extended with a plain-language `selectionExplanation` that
  deliberately never names a concept), `explanations.ts` (maps real
  `AdaptiveSelectionTrace.targetConcept.reason` values to the exact
  phrasing section 8 asked for — "moving to a harder question after
  consistent success," "revisiting a prerequisite," etc. — never
  fabricated from a question's appearance), `progress.ts`/`summary.ts`
  (student-facing mastery presentation, explicitly labelled as model
  estimates, with no learning-gain figure computed, mirroring the same
  restraint already established in Phase 6's run-summary export).
- Built `src/app/adaptive-tutor/` (Server Actions + Client Component,
  identical thin-transport shape to the existing non-adaptive
  `src/app/tutor/actions.ts`/`tutor-client.tsx`) with four experiences:
  session setup (chapter picker), the question screen (KaTeX-rendered
  stem/options via `MathText`, progress bar, selection explanation),
  feedback (correct/incorrect, correct answer, worked solution, a fixed
  pedagogical misconception note — never the taxonomy's own research
  description text, never phrased as a diagnosis), and the completion
  summary (accuracy, a per-concept mastery-before/after table, concepts
  flagged for further practice).
- Built `src/app/dev/adaptive-session/` (full numerical decision-trace
  viewer), mirroring the existing `/dev/session` pattern exactly — never
  linked from the student-facing page.
- Verified the research-metadata boundary directly against REAL RISE
  bank questions (not hand-crafted fixtures) in
  `tests/tutoring/adaptiveSession/publicViews.test.ts`: no
  `misconceptionId`/`derivationNote`/`difficulty`/`conceptIds`/
  `correctOptionId` ever serializes into a public view, across 25 real
  sampled questions.
- Added tests across `tests/tutoring/adaptiveSession/` (curriculum,
  explanations — including a check that no reason-mapping ever leaks a
  raw concept id, public-view sanitization against real data, and a
  24-test service-integration suite covering grading parity with
  `gradeAnswer`, real Phase 3 mastery-update integration, duplicate-
  submission and answer-skip guards, session completion at the
  configured limit, a multi-round scenario exercising genuine Phase 4
  decision reasons end to end, and misconception-evidence consistency
  against actual responses), `tests/components/MathText.test.tsx` (7 —
  including one using the bank's exact real delimiter format), and
  `tests/app/adaptive-tutor/adaptive-tutor-client.test.tsx` (12,
  mirroring the existing `tutor-client.test.tsx` pattern: setup,
  question interaction, duplicate-submission prevention at the UI layer,
  completion summary, error handling).
- Caught and fixed three of my own test-construction mistakes during
  this work (not implementation bugs): a JSX bare-attribute string
  literal doesn't apply JS backslash-escape processing the way an
  expression-container string does, which initially made a KaTeX test
  pass the wrong runtime string entirely; two fixture-text collisions
  (`getByLabelText`/`findByText` matching more than one element because
  a mock's `explanation` field coincidentally duplicated other on-screen
  text). All three were diagnosed by inspecting actual rendered output
  before assuming the component was at fault.
- Performed a REAL end-to-end browser verification (Playwright,
  installed ad hoc via `npm install --no-save` and NOT added as a
  project dependency — pruned by a clean `npm install` afterward,
  consistent with how the original non-adaptive flow was verified per
  `docs/tutor-flow.md`): setup screen and chapter picker, a full session
  through real progression/remediation decisions with correctly-varying
  plain-language explanations, real KaTeX rendering confirmed on actual
  question stems (5 rendered `.katex` elements, zero `.katex-error`),
  a 20-question session reaching completion with an accurate summary,
  the `/dev/adaptive-session` trace viewer showing real traces, and a
  page refresh correctly resuming the session — zero console/page
  errors throughout.

**Verification:** `npm test` — **640/640 passing** (571 prior + 69 new;
0 changed/weakened). `npm run typecheck` and `npm run lint` clean.
`npm run audit:questions` and `npm run audit:session` byte-identical to
before. `npm run build` succeeds with two new routes (`/adaptive-tutor`,
`/dev/adaptive-session`) alongside the unchanged `/tutor` and
`/dev/session`. Real-browser verification passed with zero errors (see
above).

**Deployment readiness:** no environment variables are required (no
external services, API keys, or secrets of any kind). The Server Actions
in `src/app/adaptive-tutor/actions.ts` and `src/app/tutor/actions.ts`
are the application's only API boundary; both run server-side only by
Next.js's own architecture. `src/research/artifact/persistence.ts`
already guards itself against client-bundle import (Phase 6); nothing in
`src/app/` serves `research-output/` to any route, so research artifacts
are never reachable from a public endpoint. Session persistence
(in-memory, server-process lifetime) carries the same prototype-scope
caveat already documented for the non-adaptive condition — compatible
with local development and a single-process deployment, not with a
multi-instance/serverless deployment without replacing the store's
internals, which was out of scope here. The application starts locally
via the already-documented `npm run dev`.

**Not done (explicitly out of scope for this phase):** no change to the
Phase 3 mastery formulas or Phase 4 selection thresholds/decision rules,
no question regeneration or bank modification, no simulated learners, no
BKT/IRT baselines, no full computational experiments, no account system,
no gamification, no LLM-based grading, no public/paid hosting.

**Next step:** Per instruction, Phase 8 is not started automatically —
awaiting explicit direction. No unresolved blocker prevents it.

---

## 2026-10-24 — Phase 8 preparation and technical handoff

**Objective:** Extract the actual implemented research architecture into
a reviewer-facing technical briefing (Task A), add minimal
protocol-independent infrastructure Phase 8 will need regardless of
which scientific protocol is eventually approved (Task B), validate
(Task C), and report (Task D) — explicitly stopping before any
simulated-learner, BKT, or metric implementation, since the user is
designing that protocol separately. Full design in
`docs/research-decisions.md` RD-0009.

**Task A — `docs/PHASE8_TECHNICAL_BRIEFING.md`:** written by reading the
actual current source (not the development log's own narrative) for
every claim: `src/domain/learner-model/{types,parameters,updateMastery,
initialize,misconceptionEvidence}.ts` for the Phase 3 formula/variants/
state model; `src/tutoring/selection/adaptive/{targeting,
candidateSelection,adaptiveSelectionPolicy,config}.ts` for the Phase 4
algorithm, re-verified function-by-function against the current file
(several citations were corrected from approximate to exact line numbers
after cross-checking with `grep -n` against the live files rather than
trusting memory); `data/question-bank/MANIFEST.json` for the exact
1,840-question/109-concept/68-misconception/204-edge figures and
validation status; `src/research/experiment/{conditions,types,
provenance,replay}.ts` for the C0-C4 condition table and the Track A/B
distinction; `src/research/artifact/*` for the Phase 6 schema/
persistence/integrity/export/replay design. Eleven sections, matching
the brief's own numbered requirements exactly; every major claim cited
to a file and exported function/type; a dedicated §10 lists every
unresolved research decision (the difficulty-direction choice, the
backtracking structural blind spot, zero empirical calibration anywhere,
zero independent human review of the question bank) and §11 explicitly
separates what's ready for Phase 8 from what still needs building.

**Task B — protocol-independent infrastructure
(`src/research/experiment/`):**
- `rng.ts` — `createSeededRandom`, a dependency-free deterministic PRNG
  mirroring the existing option-shuffle algorithm
  (`src/tutoring/session/optionOrder.ts`) rather than introducing a
  second, silently-different one.
- `simulator.ts` — the `LearnerSimulator` contract and
  `createResponseProviderFromSimulator`, bridging any future simulator
  into the `ExperimentResponseProvider` shape Phase 5 already consumes.
- `batch.ts` — `runExperimentBatch`, a deterministic, per-run-isolated
  wrapper around repeated (unmodified) `runExperimentToCompletion`
  calls.
- `matchedScenarios.ts` — `createMatchedScenarioSet`/
  `isMatchedScenarioSet`, the matched-starting-conditions plumbing
  RD-0006 already described conceptually but never implemented as code.
- `metrics.ts` — a generic `MetricDefinition`/`computeMetric` contract
  over caller-supplied metric functions, with zero metric chosen or
  implemented.
- `estimatorRegistry.ts` — a named-lookup registry pre-populated with
  exactly the three estimators this build actually implements (none,
  deterministic-mastery-v1, deterministic-mastery-v2-inverse-difficulty)
  and no placeholder for BKT or anything else unimplemented.
- `src/research/experiment/index.ts` updated with the six new exports.
  No other Phase 5/6/7 file was touched; Phase 3/4's own files and the
  question bank are completely unmodified.

**Task C — validation:** `npm test` — **686/686 passing** (640 prior +
46 new, 0 changed/weakened). `npm run typecheck` and `npm run lint`
clean. `npm run audit:questions`/`npm run audit:session` byte-identical
to before. `npm run build` succeeds, same routes as before. Every new
test explicitly targets determinism (same seed/same inputs -> same
output), isolation (one batch run's state never leaks into another's),
or reproducibility (re-running a batch or a simulator-driven session
twice produces identical results) — the three properties Task C's
instruction named specifically.

**Task D — completion report:** delivered directly to the user in this
session (see the chat transcript); the summary is: briefing path, the
six new modules, 46 new tests, zero remaining technical blockers for
Phase 8A protocol design, and a short list of scientific decisions
(simulator response-generation model, BKT/IRT parameter priors if used,
mastery/evidence thresholds for simulated learners, benchmark sizes,
hypotheses, evaluation metrics) that require approval before Phase 8B
implementation can begin.

**Not done, per explicit instruction:** no simulated learner's response
probabilities, knowledge-transition dynamics, or prerequisite-dependency
model; no BKT/IRT implementation or parameter priors; no simulator
distributions, mastery thresholds for simulated learners, benchmark
sizes, hypotheses, or evaluation metrics chosen; no change to Phase 3/4's
approved equations, thresholds, or decision rules; no question-bank
modification.

**Next step:** Stopped at the scientific approval gate, as instructed.
Phase 8B is not started automatically — awaiting the Phase 8A protocol
from separate review.

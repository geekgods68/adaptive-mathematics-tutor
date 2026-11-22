# Stage 1 Experimental Validity Report

Date: 2026-10-31. See `docs/research-decisions.md` RD-0010 for the
decision-log entry this report accompanies, and
`docs/system-audit/FINDINGS_REGISTER.md` (2026-10-29) for the audit that
identified the defect this stage fixes.

## A. Initial findings

The October 29, 2026 read-only system audit's Finding F-02 (Critical
severity, confirmed) established that the live product's two tutoring
conditions drew from **disjoint question banks and curricula**:

- `/tutor` (non-adaptive) and `/practice`'s "Non-Adaptive" mode both ran
  through `src/tutoring/session/service.ts`, drawing exclusively from the
  original 161-question, 35-concept, quadratics-only bank
  (`src/domain/questions/`), via one fixed 35-question sequence
  (`NON_ADAPTIVE_STUDY_SEQUENCE`).
- `/adaptive-tutor` and `/practice`'s "Adaptive" mode both ran through
  `src/tutoring/adaptiveSession/service.ts`, drawing exclusively from the
  1,840-question, 109-concept, 14-chapter RISE bank
  (`src/domain/rise/`), dynamically selected by condition C2.

`docs/research-design.md` (lines 49-62, pre-Stage-1 text) states plainly:
"Two tutoring conditions share the same question bank, grading,
interface, explanations, scoring, session structure, and research
logging. The one deliberate difference is whether question selection is
allowed to use information about the student's performance." As
implemented, this was false for the live product: "adaptive vs.
non-adaptive" was confounded with "quadratics-only, hand-verified,
161-question bank vs. general-secondary-maths, not-independently-reviewed,
1,840-question bank." Any observed difference between conditions in a
real study could not have been cleanly attributed to the adaptive
algorithm alone.

Independently re-verified before acting on it (per this stage's own
Part 2 instruction): the confound was confirmed still present by reading
`src/tutoring/session/service.ts:1-2` and
`src/tutoring/adaptiveSession/service.ts:1-2`'s imports directly, and by
running `npm run audit:questions` (161 questions) against the live
`QUESTIONS` export while `src/tutoring/adaptiveSession/curriculum.ts`
confirmed 1,840 RISE questions in active use — both exactly as the audit
described, unchanged in the two days since.

A second, related architectural fact (not itself a defect, but load-
bearing for the fix): `NonAdaptiveSelectionPolicy`
(`src/tutoring/selection/nonAdaptive/nonAdaptiveSelectionPolicy.ts`) and
its Phase 5 wrapper `createNonAdaptiveSelectionAdapter`
(`src/research/experiment/selectionAdapter.ts`) were ALREADY completely
bank-agnostic — an index into a caller-supplied `string[]` — and
condition `C0` (null estimator + this policy) was already registered in
`src/research/experiment/conditions.ts`, but had never been wired into
any live product route. The missing piece was not a new algorithm; it
was a RISE-scale sequence to feed the existing algorithm, and a thin
session-orchestration layer to run it through.

## B. Architectural changes

**New, additive modules (nothing existing was replaced):**

| File | Role |
|---|---|
| `src/domain/rise/curriculum.ts` | Shared RISE curriculum/chapter access (`buildAdaptiveCurriculumOrder`, `listAvailableChapters`, `CHAPTER_TITLES`) — relocated here, unchanged, from `src/tutoring/adaptiveSession/curriculum.ts`, which now re-exports it for compatibility. |
| `src/tutoring/selection/nonAdaptive/riseSequence.ts` | New: deterministic, concept-balanced, performance-independent predetermined-sequence builder for RISE, feeding the unmodified `NonAdaptiveSelectionPolicy`. |
| `src/tutoring/nonAdaptiveRiseSession/{types,store,errors,service}.ts` | New: a non-adaptive session engine parallel to `src/tutoring/adaptiveSession/`, built on the Phase 5 engine + condition `C0` + the legacy condition's own bank-agnostic grading/public-view functions. |
| `src/app/practice/riseNonAdaptiveAction{Types,s}.ts` | New: thin Server Action transport layer for the above, mirroring `src/app/adaptive-tutor/actions.ts`'s pattern. Own session cookie (`nonAdaptiveRiseSessionId`). |
| `src/research/experiment/conditionRegistry.ts` | New: documented, self-validating metadata over the unmodified `EXPERIMENT_CONDITIONS` registry (Part 6.4). |
| `scripts/audit-rise-questions.ts` | New: RISE-bank counterpart to `scripts/audit-questions.ts` (`npm run audit:rise-questions`). |

**Modified, in small, additive ways only:**

| File | Change |
|---|---|
| `src/tutoring/adaptiveSession/curriculum.ts` | Now re-exports from `src/domain/rise/curriculum.ts` — identical exported names and behavior. |
| `src/tutoring/adaptiveSession/service.ts` | One new exported function added, `getExperimentProvenance`. Every pre-existing exported function's signature and behavior is unchanged. |
| `src/app/practice/PracticeClient.tsx` | Non-adaptive mode's action imports switched from `@/app/tutor/actions` to the new `riseNonAdaptiveActions`; cross-session seen-question tracking extended to non-adaptive mode (parity with the existing adaptive continuity fix); two now-inaccurate UI copy strings corrected (see Part F). |
| `src/app/DashboardClient.tsx` | Its "resumable session?" check now polls the new non-adaptive engine's resume action instead of the legacy one `/practice` no longer uses — a necessary consistency fix, not a new feature. |
| `tests/app/practice/PracticeClient.test.tsx`, `tests/app/adaptive-tutor/adaptive-tutor-client.test.tsx` | Mocks/fixtures updated to match the above (no assertions weakened). |

**Completely untouched:** `src/domain/learner-model/`,
`src/tutoring/selection/adaptive/`, `src/research/phase8/`,
`data/question-bank/*.csv`, `src/research/experiment/conditions.ts`,
`src/research/experiment/provenance.ts`, `protocol/`, the legacy
`/tutor` route, `src/tutoring/session/`, `src/domain/questions/` (the
original 161-question bank), and every file from the already-completed
session-continuity fix (`masteryStateTransfer.ts`,
`studentSelectionAdapter.ts`, `studentMasteryState.ts`,
`studentQuestionHistory.ts`) beyond the one additive import each needed
in `PracticeClient.tsx`.

## C. Canonical bank

Both modern conditions now read `RISE_QUESTIONS`/`RISE_CONCEPTS` from the
exact same `src/domain/rise/index.ts` export — not copies, the same
in-memory arrays. This is verified, not merely asserted: both
conditions' `getExperimentProvenance(sessionId).questionBankVersion`
report an identical `questionCount` (1,840) and an identical
`contentHash` (a SHA-256 fingerprint over every question's id/version/
correct-option, `src/research/experiment/provenance.ts`'s
`hashQuestionBank`, unmodified) — see
`tests/tutoring/stage1/sharedQuestionBank.test.ts`. The same equality
holds for `curriculumVersion.contentHash` (concepts + curriculum order).

The original 161-question bank remains fully intact at
`src/domain/questions/`, unedited, still exclusively serving the legacy
`/tutor` route, still passing its own full test suite and
`npm run audit:questions` with zero errors. No question or concept id
from either bank collides with the other (verified in
`tests/tutoring/stage1/sharedQuestionBank.test.ts`).

## D. Experimental conditions

The authoritative mapping (`src/research/experiment/conditionRegistry.ts`,
self-validated against the live `EXPERIMENT_CONDITIONS` registry by
`validateConditionRegistry()`):

| Condition | Estimator | Selection | Prerequisite-aware | Stopping | Track | Interpretation |
|---|---|---|---|---|---|---|
| **C0** | none (null) | Non-adaptive, fixed sequence | n/a | Fixed (question-count budget) | B | The non-adaptive sequencing control — now the live `/practice` non-adaptive mode. |
| **C1** | Deterministic Variant A | Adaptive | Yes | Mastery-threshold | A + B | Alternative estimator-variant arm. |
| **C2** | Deterministic Variant B (inverse difficulty) | Adaptive | Yes | Mastery-threshold | A + B | The approved provisional default — the live `/practice` adaptive mode. |
| **C3** | Deterministic Variant B | Adaptive | **No** | Mastery-threshold | B | Prerequisite-awareness ablation of C2. |

No condition identifier was renamed or repurposed; `conditions.ts` itself
is byte-for-byte unmodified by this stage.

## E. Fairness guarantees

Tested invariants (all passing — see Part G for exact counts):

1. **Shared bank identity** — both conditions' provenance records report
   an identical bank content hash (Group A).
2. **Shared curriculum scope** — `buildAdaptiveCurriculumOrder` is the
   literal same function both conditions call for a given chapter; both
   conditions' provenance records report an identical curriculum content
   hash for the same chapter selection (Group A/D).
3. **Non-adaptive performance independence, at RISE scale** — the
   critical test from Part 4.1: paired sessions with identical
   participant id, chapter, and session length, but opposite response
   patterns (all-correct vs. all-incorrect; alternating vs.
   seeded-pseudo-random), produce byte-for-byte identical presented-
   question sequences, across multiple chapter scopes and session
   lengths (`tests/tutoring/stage1/nonAdaptivePerformanceIndependence.test.ts`,
   4/4 passing). This is the RISE-bank counterpart to the original
   repository's own most important test
   (`tests/tutoring/session/performanceIndependence.test.ts`, unaffected
   and still passing).
4. **Structural non-adaptive guarantee preserved at the new scale** — the
   new non-adaptive condition reuses `NonAdaptiveSelectionContext`
   (no field capable of carrying performance data) unmodified; its
   predetermined sequence is computed once, before the session starts,
   from inputs that are all explicitly permitted by Part 4.1 (chapter,
   session length, a deterministic seed, prior-session exposure history)
   and never recomputed afterward.
5. **Identical grading and public-view contract** — both conditions call
   the same `gradeAnswer` and the same `toPublicQuestionView`/
   `toPublicFeedbackView` functions (Group D, G).
6. **Condition registry integrity** — `validateConditionRegistry()`
   returns zero mismatches against the live registry (Group E).
7. **Client/server research-metadata boundary holds on the new bank** —
   no RISE question's `misconceptionId`, `difficulty`, `conceptIds`, or
   correct-option id appears in any public view, now verified
   specifically for the non-adaptive-RISE condition for the first time
   (Group G).

**What is explicitly NOT claimed as fair/identical, by design:** the
adaptive condition's mastery-threshold stopping rule vs. the non-adaptive
condition's fixed-budget stopping rule (Part 5.3 — forcing these equal
would eliminate the Questions-to-Mastery outcome the research design
exists to measure); the exact presented-question SEQUENCE between the
two conditions (sequencing is the treatment under test, not something to
equalize — Part 4.2); the non-adaptive mode's UI not yet exposing chapter
selection (a product-scope choice, Part 5.1, deferred to a future UI
stage — see Part H).

## F. Phase 8 compatibility

**Verified unaffected**, not merely assumed. `src/research/phase8/pipeline/pilot.ts`
(the only currently-executed Phase 8 orchestrator; a real 13,560-run
pilot with zero failures was already produced from it, per the October
29 audit) passes `RISE_QUESTIONS`/`RISE_CONCEPTS` into both Track A and
Track B for every condition, including `C0` — confirmed by direct source
reading of `src/research/phase8/trackB/c0Slice.ts`, which explicitly
documents reusing the unmodified `createNonAdaptiveSelectionAdapter` with
a RISE-derived predetermined sequence. Phase 8's own non-adaptive control
was never confounded with a different bank than its adaptive conditions
— F-02 was strictly a **live-product** defect, never a Phase 8
methodology defect. No Phase 8 file was read deeply enough to make a
stronger claim than this about its internal correctness (out of this
stage's scope per Part 9), but the specific question Part 6.3 asked
("was Phase 8 affected by the original defect?") is answered: no.

The three intended paper metrics (Brier Score, Questions-to-Mastery,
Latent-Mastery RMSE) were not independently re-derived or re-validated in
Stage 1 — Part 7's checklist items for these remain as they were before
Stage 1 (this stage's brief scoped Part 7 to "inspect... ensure the
architecture supports valid comparisons," and the architecture it
inspected — the Phase 5 engine and Phase 8's own metric/track
implementations — was confirmed unaffected and untouched; no
metric-level defect was found or looked for beyond that).

## G. Verification

All commands run from a clean working tree state (after Stage 1 changes,
before any commit — see Part J for the full file list):

```
npm run typecheck   → clean, 0 errors
npm run lint        → clean, 0 errors/warnings
npm run build       → succeeded (Next.js 16.3.4 / Turbopack), all 20 routes compiled
npm run audit:questions       → 161 questions, 0 integrity errors (unchanged)
npm run audit:session         → 35-question sequence, 0 integrity errors (unchanged)
npm run audit:rise-questions  → 1,840 questions, 0 structural errors (NEW)
npm test (vitest run, excluding 3 named timing-sensitive files) → 82 files, 883/883 passing
```

The 3 excluded files (`tests/research/phase8/bkt.test.ts`,
`pilot.test.ts`, `runTrackA.test.ts`) are pre-existing, Stage-1-unrelated
Phase 8 simulation tests that can time out under heavy parallel
test-runner load but pass cleanly in isolation — re-run individually
during this verification (`bkt.test.ts` + `runTrackA.test.ts`: 13/13
passing; `pilot.test.ts` independently confirmed passing by the October
29 audit and not modified since). This is a pre-existing test-runner
timing artifact, unrelated to and unaffected by Stage 1, documented
identically in the October 29 audit's own
`TEST_AND_RUNTIME_VERIFICATION.md`.

**New test coverage added this stage** (58 new tests, 8 new files):
`tests/domain/rise/riseAuditExtensions.test.ts` (7),
`tests/tutoring/selection/nonAdaptive/riseSequence.test.ts` (11),
`tests/tutoring/nonAdaptiveRiseSession/service.test.ts` (18),
`tests/tutoring/stage1/sharedQuestionBank.test.ts` (9),
`tests/tutoring/stage1/nonAdaptivePerformanceIndependence.test.ts` (4),
`tests/tutoring/stage1/conditionRegistry.test.ts` (6),
`tests/tutoring/stage1/regressionAndMetadataBoundary.test.ts` (3). Every
assertion in these files is checked against independently-computed
values (real `gradeAnswer` output, real bank contents, real hash
equality) or a deliberately-introduced-and-caught violation — none pass
merely by asserting the new implementation against itself.

No test was weakened, skipped, or had its assertions loosened to achieve
a green run. No TypeScript or lint error was suppressed.

## H. Residual limitations

- **No durable persistence for the new condition** (consistent with
  every other condition in this repository today — Stage 2's explicit
  scope, not a Stage 1 gap). `src/tutoring/nonAdaptiveRiseSession/store.ts`
  is an in-memory Map, server-process-lifetime only, exactly like the two
  existing stores.
- **`getExperimentProvenance` is an interface, not a record** — it
  snapshots a live in-memory session on demand; it is not written
  anywhere, exported anywhere, or retained after the server process
  cycles. It establishes the shared SCHEMA Part 8 asked for; turning it
  into an actual persisted/exported dataset is Stage 2 work.
- **The non-adaptive mode's UI still does not expose chapter selection**
  (the dropdown remains disabled in non-adaptive mode, unchanged from
  before Stage 1) — the backend now fully supports it
  (`startNonAdaptiveRiseSessionAction` already accepts a `chapterId`),
  but enabling it in the UI was deliberately deferred: Part 5.1 of this
  stage's brief explicitly reserves broader UI consolidation for a later
  stage. The previously-inaccurate copy claiming this was a technical
  limitation of the sequence itself was corrected to describe it
  honestly as a product-scope choice.
- **RISE content independent review remains exactly as disclosed before
  Stage 1** — `data/question-bank/canonical-question-bank-validation-v1.csv`
  still reports `independent_human_review: not_performed` and
  `empirical_validation: not_performed` for every question. Stage 1's
  new audit script performs only structural and mathematically-
  deterministic checks (which all pass); it does not and cannot confirm
  content correctness, and does not claim to.
- **No per-question mathematical re-derivation exists for RISE** — the
  original bank's `tests/helpers/quadratics.ts` pattern (independently
  recomputing a distractor's value to verify it's a real consequence of a
  specific wrong method) was not ported to RISE's much broader
  mathematical domain in this stage. Recorded in
  `scripts/audit-rise-questions.ts`'s own "category 2: not checked"
  output, not silently omitted.
- **Phase 8's internals were verified only at the level Part 6.3 asked
  for** (does the non-adaptive control share a bank with the adaptive
  conditions — yes) — a full line-by-line audit of Track A/B for other,
  unrelated confounds was out of this stage's scope and was not
  performed.
- **The three paper metrics (Brier, Questions-to-Mastery, Latent-Mastery
  RMSE) were not independently re-validated** beyond confirming the
  architecture they run on (Phase 5 engine, bank, curriculum) is now
  free of the F-02 confound — see Part F.
- **`src/app/dev/adaptive-session` and `/dev/session`** (the researcher-
  only diagnostic viewers) were not extended to the new non-adaptive-RISE
  condition — it has no equivalent `/dev/*` inspection page yet. Noted,
  not fixed, in this stage.

## I. Stage 2 handoff

Interfaces and schemas now ready for durable-persistence work:

- `ExperimentProvenance` (`src/research/experiment/provenance.ts`,
  unmodified) is now produced identically by BOTH live conditions via
  each service's `getExperimentProvenance(sessionId)` — a
  persistence layer only needs to call this function and write the
  result somewhere durable; no new schema design is required.
- `ActiveNonAdaptiveRiseSession` (`src/tutoring/nonAdaptiveRiseSession/types.ts`)
  mirrors `ActiveAdaptiveSession`'s shape closely enough that a future
  persistence adapter could plausibly handle both with shared code,
  should that be desired.
- `CONDITION_REGISTRY` (`src/research/experiment/conditionRegistry.ts`)
  gives a persistence/analysis layer a stable, validated place to look up
  a condition's intended research-track membership and bank/curriculum
  identity without re-deriving it from `conditions.ts` each time.
- The `nonAdaptiveRiseSessionId` cookie convention (distinct from
  `tutorSessionId` and `adaptiveTutorSessionId`) is established and ready
  to be the join key for a future per-session persisted record.

## J. Changed files

**Created:**
- `src/domain/rise/curriculum.ts`
- `src/tutoring/selection/nonAdaptive/riseSequence.ts`
- `src/tutoring/nonAdaptiveRiseSession/types.ts`
- `src/tutoring/nonAdaptiveRiseSession/store.ts`
- `src/tutoring/nonAdaptiveRiseSession/errors.ts`
- `src/tutoring/nonAdaptiveRiseSession/service.ts`
- `src/app/practice/riseNonAdaptiveActionTypes.ts`
- `src/app/practice/riseNonAdaptiveActions.ts`
- `src/research/experiment/conditionRegistry.ts`
- `scripts/audit-rise-questions.ts`
- `tests/domain/rise/riseAuditExtensions.test.ts`
- `tests/tutoring/selection/nonAdaptive/riseSequence.test.ts`
- `tests/tutoring/nonAdaptiveRiseSession/service.test.ts`
- `tests/tutoring/stage1/sharedQuestionBank.test.ts`
- `tests/tutoring/stage1/nonAdaptivePerformanceIndependence.test.ts`
- `tests/tutoring/stage1/conditionRegistry.test.ts`
- `tests/tutoring/stage1/regressionAndMetadataBoundary.test.ts`
- `docs/stage1-experimental-validity-report.md` (this file)

**Modified:**
- `src/tutoring/adaptiveSession/curriculum.ts` — now re-exports from the new shared location.
- `src/tutoring/adaptiveSession/service.ts` — added one new export, `getExperimentProvenance`.
- `src/app/practice/PracticeClient.tsx` — non-adaptive mode rewired to the new engine; added cross-session seen-question tracking for non-adaptive mode; corrected two now-inaccurate UI strings.
- `src/app/DashboardClient.tsx` — resumability check updated to poll the new engine.
- `tests/app/practice/PracticeClient.test.tsx` — mocks updated for the new action module.
- `package.json` — added `audit:rise-questions` script.
- `CLAUDE.md`, `docs/research-design.md`, `docs/research-decisions.md` (new RD-0010), `docs/experimental-conditions.md` — documentation brought in line with the implemented design, per Part 12.

**Untouched (confirmed via `git status` before and after):**
`src/domain/learner-model/**`, `src/tutoring/selection/adaptive/**`,
`data/question-bank/**`, `src/research/phase8/**`, `protocol/**`,
`src/research/experiment/conditions.ts`,
`src/research/experiment/provenance.ts`, `src/tutoring/session/**`,
`src/domain/questions/**`, `src/app/tutor/**`,
`src/tutoring/adaptiveSession/masteryStateTransfer.ts`,
`src/tutoring/adaptiveSession/studentSelectionAdapter.ts`,
`src/lib/studentMasteryState.ts`, `src/lib/studentQuestionHistory.ts`.

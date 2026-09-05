# CLAUDE.md

Guidance for AI coding agents (and humans) working in this repository.
Read this before making changes, especially to anything under
`src/domain/`, `src/tutoring/`, `src/app/tutor/`, or `src/research/`.

## The non-adaptive tutor is complete

`/tutor` is a fully usable, locally runnable, end-to-end non-adaptive
tutoring session: start → question → submit → deterministic grading →
feedback → worked solution → Continue → repeat through a fixed
35-question sequence → completion summary, with every step logged as a
`ResearchEvent`. This was built and verified in a real browser (Playwright),
not just via unit tests — see `docs/tutor-flow.md`. Treat it as working
software, not a stub: don't rebuild pieces of it "to be safe," and don't
add features to it without checking `docs/tutor-flow.md` and
`docs/non-adaptive-sequence.md` first.

## This is a research experiment, not a product

This repository is the **non-adaptive** condition of a study comparing
adaptive and non-adaptive mathematics tutoring for Grade 9–10 students,
in the domain of quadratic equations and functions. The adaptive
condition is developed **separately**, in a sibling repository
(`adaptive-math-tutor`), sharing as much of this domain-model shape as
possible. Do not try to build the adaptive condition here.

Full context: [`docs/research-design.md`](docs/research-design.md),
[`docs/experimental-conditions.md`](docs/experimental-conditions.md),
[`docs/architecture.md`](docs/architecture.md),
[`docs/data-model.md`](docs/data-model.md),
[`docs/curriculum.md`](docs/curriculum.md),
[`docs/difficulty-framework.md`](docs/difficulty-framework.md),
[`docs/misconception-taxonomy.md`](docs/misconception-taxonomy.md),
[`docs/question-authoring-guide.md`](docs/question-authoring-guide.md),
[`docs/question-bank.md`](docs/question-bank.md),
[`docs/question-bank-coverage.md`](docs/question-bank-coverage.md),
[`docs/question-bank-validation.md`](docs/question-bank-validation.md),
[`docs/tutor-flow.md`](docs/tutor-flow.md),
[`docs/non-adaptive-sequence.md`](docs/non-adaptive-sequence.md),
[`docs/research-logging.md`](docs/research-logging.md),
[`docs/session-data-schema.md`](docs/session-data-schema.md).

## Hard constraints — do not violate these

1. **MCQ only.** Do not build free-text mathematical answer grading or an
   algebra-expression parser. Every assessed problem has a finite,
   enumerated set of `AnswerOption`s. See `docs/research-design.md` for why.

2. **No LLM-based correctness grading, ever.** `gradeAnswer`
   (`src/tutoring/grading/grade.ts`) is a direct id comparison —
   `selectedOptionId === question.correctOptionId`. Do not introduce
   semantic similarity, fuzzy matching, or an LLM call anywhere in that
   path. An LLM may eventually be used for constrained tutoring
   explanations, never for deciding correctness.

3. **Wrong answers are diagnostic, not arbitrary.** Every distractor's
   `misconceptionId`/`derivationNote` must describe a real, checkable
   incorrect line of reasoning that actually produces that distractor's
   value — not a plausible-looking wrong number picked at random. When
   adding a question, verify the arithmetic by computation before writing
   it down (see `tests/helpers/quadratics.ts` and
   `tests/domain/questionBank/mathVerification.test.ts` for the pattern,
   or the simpler `tests/domain/questionMath.test.ts` from Phase 0/1) —
   don't eyeball it.

4. **The non-adaptive condition must never select questions using
   student-performance data** — not mastery, not misconception history,
   not recent correctness, not response time, not per-difficulty
   performance, not concept weakness. This is enforced structurally:
   `NonAdaptiveSelectionContext`
   (`src/tutoring/selection/nonAdaptive/types.ts`) has no field capable of
   carrying any of that. Do not widen that type to "just pass through"
   performance data, even for logging convenience — log it via
   `ResearchEvent`s instead, which is exactly what they're for.

5. **Immutable, stable ids.** `Question.id`, `AnswerOption.id`,
   `Concept.id`, `Misconception.id` are joined on by research analysis.
   Never derive an `AnswerOption.id` from display position (no
   `"A"`/`"B"`/`"C"`/`"D"` semantics) — option order may be randomized per
   presentation without changing which option is correct. If a question
   needs to change materially, bump `Question.version` rather than
   repurposing an existing id.

6. **Determinism and reproducibility.** Given the same session and the
   same (non-adaptive) predetermined sequence, behavior must be
   reproducible. Avoid introducing hidden randomness into grading or
   sequencing.

7. **A `misconceptionId` is evidence, not a diagnosis.** Never write or
   generate text implying a selected distractor *proves* a student has a
   given misconception — it means "this response is consistent with
   misconception X." See "Evidence vs. persistent misconception" in
   [`docs/misconception-taxonomy.md`](docs/misconception-taxonomy.md).

8. **Concept graph stays acyclic and referentially sound.** New concepts
   go through `validateDomainModel` (referential integrity, self-
   dependency, duplicate prerequisites, cycle detection via
   `findConceptGraphCycles`). If you add a concept, also add it to
   `RECOMMENDED_CURRICULUM_ORDER`
   (`src/domain/curriculum/curriculumOrder.ts`) in a position after all its
   prerequisites — `validateCurriculumOrder` checks this and tests enforce
   it.

9. **A production question bank now exists (161 questions,
   `src/domain/questions/bank/`) — do not edit it casually.** Every
   question and option id in it is a stable identifier a real study could
   join research data on. Do not renumber or repurpose an existing
   `Question.id` or `AnswerOption.id`; if a question needs substantive
   revision, bump its `version` (see constraint 5). Do not delete a
   question just because it seems redundant without checking
   `docs/question-bank-coverage.md` first — it may be the sole
   representative of a concept or misconception. After any edit to
   `src/domain/questions/bank/`, `src/domain/concepts/data.ts`, or
   `src/domain/misconceptions/data.ts`, run `npm test` and
   `npm run audit:questions` — both must stay green (see
   `docs/question-bank-validation.md` for what's checked and why).
   `Misconception.id`s are equally stable — never rename one; retire it by
   ceasing new use, don't rewrite its meaning in place.

10. **Diagnostic distractors are research data, not just wrong answers.**
    Every `derivationNote`/`errorPattern` you add must be independently
    verified — computed, not eyeballed — before being written (see
    "Authoring methodology" in `docs/question-bank.md`). This applies to
    every future question, not only the existing 161.

11. **The client never receives research metadata — not even unrendered.**
    `misconceptionId`, `derivationNote`, `difficulty`, `conceptIds`, and
    which option is correct (before submission) must never appear in
    anything sent to the browser, because anything sent is inspectable
    regardless of what the UI chooses to render. This boundary is enforced
    in `src/tutoring/session/publicViews.ts`
    (`toPublicQuestionView`/`toPublicFeedbackView`) — route all
    student-facing question/feedback data through those functions rather
    than passing a `Question` or `GradingResult` to a Client Component
    directly. Verified end-to-end in Phase 3 by scanning the live page
    HTML for every misconception id across a full session — see
    `docs/tutor-flow.md`.

12. **All tests must pass after modifications.** Before considering any
    change to this repository done, run `npm test`, `npm run typecheck`,
    `npm run lint`, `npm run audit:questions`, and `npm run audit:session`
    — all five must stay green. The 223+ tests span domain schemas, the
    question bank, the curriculum model, and the full session
    lifecycle (including the performance-independence test in
    `tests/tutoring/session/performanceIndependence.test.ts`, the single
    most important test in this repository) — don't weaken any of them to
    make a change pass.

## Shared infrastructure

Adaptive and non-adaptive conditions are meant to share as much as
possible: question bank, grading, feedback, session/research-event data
model, and UI shell. The *only* thing that should differ between
conditions is which `QuestionSelectionPolicy` implementation a session
uses (see `src/tutoring/selection/types.ts`), and, for the adaptive
condition, whether a `StudentModel` is read. Keep that boundary narrow —
resist the urge to special-case UI or grading behavior on `condition`.

## Development workflow (phase-wise)

- **Phase 0 (complete):** architecture, data schemas, deterministic
  grading, `QuestionSelectionPolicy` abstraction with a working
  `NonAdaptiveSelectionPolicy` and a skeletal `AdaptiveSelectionPolicy`,
  a small (5-question) seed dataset, research-event schema, tests, docs.
- **Phase 1 (complete):** the curriculum model those Phase 0 schemas
  support — a 35-concept quadratics taxonomy across 9 strands with a
  validated, acyclic prerequisite graph and a recommended teaching order
  (`src/domain/curriculum/`), a formal 5-level difficulty framework with
  per-concept difficulty guidance, and a 35-entry misconception taxonomy
  mapped to concepts. The Phase 0 seed questions were updated to this
  taxonomy; the production question bank was NOT built yet (that was
  Phase 2).
- **Phase 2 (complete):** the production question bank — 161 questions
  across `src/domain/questions/bank/` (one file per strand), combined via
  `src/domain/questions/index.ts`. Every misconception and concept has
  real coverage (see `docs/question-bank-coverage.md`); quality gates
  (`src/domain/questions/validateQuestionBank.ts`), bank statistics and
  duplicate detection (`src/domain/questions/bankStatistics.ts`), and a
  live audit report (`npm run audit:questions`) all exist. Produced a
  `CANDIDATE_NON_ADAPTIVE_SEQUENCE`
  (`src/tutoring/selection/nonAdaptive/candidateSequence.ts`) as a
  provisional Phase 3 input — since superseded by `NON_ADAPTIVE_STUDY_SEQUENCE`
  (below) as what the running tutor actually uses; both it and the
  original Phase 0 `NON_ADAPTIVE_CURRICULUM_SEQUENCE` still exist,
  unmodified, for their own purposes.
- **Phase 3 (this state, complete):** the full non-adaptive tutoring
  session. `NON_ADAPTIVE_STUDY_SEQUENCE`
  (`src/tutoring/selection/nonAdaptive/studySequence.ts`, 35 questions,
  all 9 strands, L1-L5) is the sequence the running tutor uses. The
  session service (`src/tutoring/session/`) implements the full
  lifecycle — start/present/submit/grade/feedback/advance/complete —
  entirely through `NonAdaptiveSelectionPolicy` and the existing
  deterministic `gradeAnswer`/`buildFeedback`. `/tutor`
  (`src/app/tutor/`) is the student UI; `/dev/session`
  (`src/app/dev/session/`) is a separate development-only diagnostic
  view (session state, event log, JSON export, reset) never linked from
  `/tutor`. A real, exploitable bug was found and fixed during Phase 3
  end-to-end testing: every bank question had its correct option listed
  first, making "always pick the first radio button" 100% accurate —
  `src/tutoring/session/optionOrder.ts` now applies a deterministic,
  question-id-seeded shuffle to the option *display* order only (grading
  stays id-based, unaffected). Still NOT built: persistent research-event
  storage, session administration, anything adaptive.

Things explicitly **not** to build in this repository: adaptive mastery
updates, adaptive sequencing, dynamic remediation, personalized
difficulty, AI-generated questions, LLM feedback, participant
recruitment or consent flows, teacher/participant dashboards, a
production database, authentication, polished visual design, analytics
dashboards, pre/post testing, production cloud deployment, or a
statistical analysis pipeline. These are deliberately out of scope until
a later, explicitly-requested phase.

## Commands

```bash
npm install
npm run dev              # http://localhost:3000/tutor (student), /dev/session (diagnostics)
npm test                 # vitest run
npm run test:watch
npm run lint
npm run typecheck        # tsc --noEmit
npm run build
npm run audit:questions  # live question-bank quality report
npm run audit:session    # live study-sequence quality report
```

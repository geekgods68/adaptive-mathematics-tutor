# CLAUDE.md

Guidance for AI coding agents (and humans) working in this repository.
Read this before making changes, especially to anything under
`src/domain/`, `src/tutoring/`, or `src/research/`.

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
[`docs/question-authoring-guide.md`](docs/question-authoring-guide.md).

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
   adding a question, verify the arithmetic (see
   `tests/domain/questionMath.test.ts` for the pattern: substitute and
   check by computation, don't eyeball it).

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
- **Phase 1 (this state):** the curriculum model those Phase 0 schemas
  support — a 35-concept quadratics taxonomy across 9 strands with a
  validated, acyclic prerequisite graph and a recommended teaching order
  (`src/domain/curriculum/`), a formal 5-level difficulty framework with
  per-concept difficulty guidance, and a 35-entry misconception taxonomy
  mapped to concepts. The Phase 0 seed questions were updated to this
  taxonomy; the production question bank was NOT built (that's Phase 2).
- **Later phases (not started):** the production quadratics question
  bank (authored per `docs/question-authoring-guide.md`), a working
  `/tutor` UI loop for the non-adaptive condition, persistent
  research-event storage, session administration. None of this exists
  yet — don't assume it does.

Things explicitly **not** to build in this repository: hundreds of
questions, adaptive mastery updates, adaptive sequencing, participant
recruitment or consent flows, teacher/participant dashboards, a
production database, LLM integration, authentication, polished visual
design, analytics dashboards, pre/post testing, or full experiment
administration. These are deliberately out of scope until a later,
explicitly-requested phase.

## Commands

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # vitest run
npm run test:watch
npm run lint
npm run typecheck  # tsc --noEmit
npm run build
```

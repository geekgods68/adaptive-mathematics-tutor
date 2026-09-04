# Non-Adaptive Mathematics Tutor

RISE research prototype — the **non-adaptive condition** of a study
comparing adaptive and non-adaptive mathematics tutoring for Grade 9–10
students, in the domain of quadratic equations and functions. The
adaptive condition is developed separately, in a sibling
`adaptive-math-tutor` repository, sharing this repository's domain-model
shape.

See [`docs/research-design.md`](docs/research-design.md) for the study
design, [`docs/experimental-conditions.md`](docs/experimental-conditions.md)
for the precise, testable boundary between conditions, and
[`docs/architecture.md`](docs/architecture.md) for the system architecture.
[`CLAUDE.md`](CLAUDE.md) has binding guidance for AI coding agents working
in this repository — read it before making changes.

## Current phase

**Phase 2 — production question bank.** Phase 0 established the domain
model, deterministic MCQ grading, and the `QuestionSelectionPolicy`
abstraction; Phase 1 built the curriculum model (35 concepts, a 5-level
difficulty framework, 35 misconceptions — see
[`docs/curriculum.md`](docs/curriculum.md),
[`docs/difficulty-framework.md`](docs/difficulty-framework.md),
[`docs/misconception-taxonomy.md`](docs/misconception-taxonomy.md)).
Phase 2 authors the production question bank those Phase 1 schemas
support: **161 questions** across all 9 strands, every one of the 35
concepts and 35 misconceptions represented, every answer and diagnostic
distractor computationally verified — see
[`docs/question-bank.md`](docs/question-bank.md),
[`docs/question-bank-coverage.md`](docs/question-bank-coverage.md), and
[`docs/question-bank-validation.md`](docs/question-bank-validation.md).
A provisional 35-question `CANDIDATE_NON_ADAPTIVE_SEQUENCE` is included
as a Phase 3 starting point (not a finished study design). This still
does not include a working tutoring UI loop or persistent research-data
storage — see "Not yet built" below.

## Installation

Requires Node.js 20+.

```bash
npm install
```

## Development

```bash
npm run dev
```

Then open <http://localhost:3000> for the research-project status page.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Next.js dev server |
| `npm run build` | Production build |
| `npm start` | Run the production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Run the test suite once (Vitest) |
| `npm run test:watch` | Run tests in watch mode |
| `npm run audit:questions` | Live question-bank quality report (counts, coverage, integrity errors) |

## Project structure

```text
src/
  app/                Minimal research-status landing page
  domain/
    questions/
      types.ts          Question, AnswerOption (+ questionFamily)
      index.ts           Combined production QUESTIONS export (161 questions)
      bank/               One file per curriculum strand (algebraFoundations.ts,
                          factorisation.ts, solving.ts, discriminant.ts,
                          rootsCoefficients.ts, graphs.ts, transformations.ts,
                          intersections.ts, reasoning.ts)
      validateQuestionBank.ts   Phase 2 production quality gates
      bankStatistics.ts   Coverage stats + duplicate detection
    concepts/           Concept (+ strand) + 35-concept data.ts
    misconceptions/      Misconception (+ errorPattern) + 35-entry data.ts
    curriculum/          Difficulty framework, per-concept difficulty guidance,
                        recommended curriculum order, graph/curriculum queries
                        and validators (cycle detection, etc.)
    student/            StudentModel, ConceptMastery (architecture only)
    sessions/            ExperimentalCondition, TutorSession
    validateDomainModel.ts   Cross-entity referential-integrity checks
  tutoring/
    grading/            Deterministic MCQ grading (gradeAnswer)
    selection/           QuestionSelectionPolicy abstraction
      nonAdaptive/        NonAdaptiveSelectionPolicy (implemented) + fixed
                          5-question demo sequence + provisional 35-question
                          CANDIDATE_NON_ADAPTIVE_SEQUENCE
      adaptive/            AdaptiveSelectionPolicy (skeleton only)
    feedback/            Feedback/explanation formatting
  research/
    events/              ResearchEvent discriminated union
    logging/             ResearchEventLogger (in-memory implementation)
  lib/                 Small shared helpers (id generation)

scripts/
  audit-questions.ts    Human-readable question-bank quality report (npm run audit:questions)

tests/
  helpers/quadratics.ts Shared numeric verification helpers (substitution checks)
  domain/questionBank/  Bank integrity, coverage, duplicate-detection, math-verification tests
  ...                  (mirrors src/ structure elsewhere)

docs/                  Research design, architecture, curriculum, difficulty,
                       misconception taxonomy, question-authoring, and
                       question-bank docs
```

## Not yet built

Deliberately out of scope for Phase 2 (see [`CLAUDE.md`](CLAUDE.md) for the
full list and why):

- A working `/tutor` UI loop (question presentation, answer submission,
  feedback, session progression)
- Persistent research-event storage (a real database)
- Adaptive mastery updates or adaptive sequencing (developed in the
  sibling `adaptive-math-tutor` repository)
- Authentication, participant recruitment/consent flows, dashboards,
  pre/post testing

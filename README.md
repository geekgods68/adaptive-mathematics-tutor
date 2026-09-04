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

**Phase 1 — curriculum model.** Phase 0 established the domain model
(questions, concepts, misconceptions), deterministic MCQ grading, the
`QuestionSelectionPolicy` abstraction (with a working
`NonAdaptiveSelectionPolicy` and a skeletal `AdaptiveSelectionPolicy`),
and the research-event schema. Phase 1 builds the curriculum model those
schemas support: a 35-concept quadratics taxonomy across 9 strands with a
validated (acyclic) prerequisite graph and a recommended teaching order, a
formal 5-level difficulty framework with per-concept difficulty guidance,
and a 35-entry misconception taxonomy mapped to concepts — see
[`docs/curriculum.md`](docs/curriculum.md),
[`docs/difficulty-framework.md`](docs/difficulty-framework.md), and
[`docs/misconception-taxonomy.md`](docs/misconception-taxonomy.md). The
5-question seed dataset from Phase 0 has been updated to use this
taxonomy; the production question bank itself is Phase 2 (see
[`docs/question-authoring-guide.md`](docs/question-authoring-guide.md)
for the rules it will follow). This still does not include a working
tutoring UI loop or persistent research-data storage — see "Not yet
built" below.

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

## Project structure

```text
src/
  app/                Minimal research-status landing page
  domain/
    questions/         Question, AnswerOption + seed data.ts
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
      nonAdaptive/        NonAdaptiveSelectionPolicy (implemented) + fixed sequence
      adaptive/            AdaptiveSelectionPolicy (skeleton only)
    feedback/            Feedback/explanation formatting
  research/
    events/              ResearchEvent discriminated union
    logging/             ResearchEventLogger (in-memory implementation)
  lib/                 Small shared helpers (id generation)

tests/                 Vitest test suite (mirrors src/ structure)
docs/                  Research design, architecture, curriculum, difficulty,
                       misconception taxonomy, and question-authoring docs
```

## Not yet built

Deliberately out of scope for Phase 1 (see [`CLAUDE.md`](CLAUDE.md) for the
full list and why):

- A working `/tutor` UI loop (question presentation, answer submission,
  feedback, session progression)
- The production quadratics question bank (Phase 2 — the curriculum
  framework it will be authored against is now in place)
- Persistent research-event storage (a real database)
- Adaptive mastery updates or adaptive sequencing (developed in the
  sibling `adaptive-math-tutor` repository)
- Authentication, participant recruitment/consent flows, dashboards,
  pre/post testing

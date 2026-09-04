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

**Phase 0 — architecture and foundation.** This establishes the domain
model (questions, concepts, misconceptions), deterministic MCQ grading,
the `QuestionSelectionPolicy` abstraction (with a working
`NonAdaptiveSelectionPolicy` and a skeletal `AdaptiveSelectionPolicy`), the
research-event schema, a small seed dataset (5 concepts, 5 misconceptions,
5 questions), tests, and documentation. It does not yet include a working
tutoring UI loop, the production question bank, or persistent research-data
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

## Project structure

```text
src/
  app/                Minimal research-status landing page
  domain/
    questions/         Question, AnswerOption + seed data.ts
    concepts/           Concept + seed data.ts
    misconceptions/      Misconception + seed data.ts
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
docs/                  Research design, architecture, and data-model docs
```

## Not yet built

Deliberately out of scope for Phase 0 (see [`CLAUDE.md`](CLAUDE.md) for the
full list and why):

- A working `/tutor` UI loop (question presentation, answer submission,
  feedback, session progression)
- The production quadratics question bank and full concept graph
- The full misconception taxonomy
- Persistent research-event storage (a real database)
- Adaptive mastery updates or adaptive sequencing (developed in the
  sibling `adaptive-math-tutor` repository)
- Authentication, participant recruitment/consent flows, dashboards,
  pre/post testing

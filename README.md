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

**Phase 3 — complete, usable non-adaptive tutor.** Phase 0 established the
domain model and deterministic grading; Phase 1 built the curriculum
model (35 concepts, 5-level difficulty framework, 35 misconceptions);
Phase 2 authored the 161-question production bank. Phase 3 wires all of
it into an actual student-facing tutoring session at
[`/tutor`](http://localhost:3000/tutor): start → question → submit →
deterministic grading → feedback → worked solution → Continue → repeat
through a fixed 35-question sequence
([`docs/non-adaptive-sequence.md`](docs/non-adaptive-sequence.md)) →
completion summary. Every step is logged as a `ResearchEvent`
([`docs/research-logging.md`](docs/research-logging.md)), sessions
survive page refresh, and a full JSON export is available from the
development-only [`/dev/session`](http://localhost:3000/dev/session)
view ([`docs/session-data-schema.md`](docs/session-data-schema.md)). See
[`docs/tutor-flow.md`](docs/tutor-flow.md) for exactly how the pieces fit
together, start to finish.

**The core experimental guarantee — the sequence of questions a student
sees never depends on their performance — is enforced structurally (not
just by convention) and demonstrated by an end-to-end test comparing an
always-correct student against an always-incorrect student.** See
[`docs/non-adaptive-sequence.md`](docs/non-adaptive-sequence.md#performance-independence--the-guarantee-precisely).

## Try it

```bash
npm install
npm run dev
```

Open <http://localhost:3000/tutor> and complete a session (or stop partway
— refresh to confirm it resumes where you left off). Open
<http://localhost:3000/dev/session> in the same browser to see the raw
session state, response log, event log, and a JSON export/reset — this is
a development-only diagnostic view, not part of the student experience.

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
| `npm run audit:session` | Live study-sequence quality report (length, difficulty/strand composition, integrity errors) |

## Project structure

```text
src/
  app/
    page.tsx              Research-status landing page (dev-facing counts, not the tutor)
    tutor/                 The student-facing tutor
      page.tsx              Thin Server Component
      tutor-client.tsx       Client Component: all UI state (start/question/feedback/completion)
      actions.ts             Server Actions (thin transport layer only)
    dev/session/            Development-only diagnostic view (session state, event log, export, reset)
  domain/
    questions/
      types.ts              Question, AnswerOption (+ questionFamily)
      index.ts               Combined production QUESTIONS export (161 questions)
      bank/                   One file per curriculum strand
      validateQuestionBank.ts Phase 2 production quality gates
      bankStatistics.ts      Coverage stats + duplicate detection
    concepts/               Concept (+ strand) + 35-concept data.ts
    misconceptions/          Misconception (+ errorPattern) + 35-entry data.ts
    curriculum/              Difficulty framework, curriculum order, graph
                            queries and validators
    student/                StudentModel, ConceptMastery (architecture only)
    sessions/                ExperimentalCondition, TutorSession
    validateDomainModel.ts       Cross-entity referential-integrity checks
  tutoring/
    grading/                Deterministic MCQ grading (gradeAnswer)
    selection/
      nonAdaptive/            NonAdaptiveSelectionPolicy (implemented);
                              NON_ADAPTIVE_STUDY_SEQUENCE (the 35-question
                              sequence the running tutor uses);
                              CANDIDATE_NON_ADAPTIVE_SEQUENCE (Phase 2
                              coverage check, superseded); the original
                              5-question Phase 0 demo sequence
      adaptive/                AdaptiveSelectionPolicy (skeleton only)
    feedback/                Feedback/explanation formatting
    session/                 THE SESSION SERVICE — all business rules live here
      types.ts                 ActiveTutorSession, TutorResponse
      service.ts                startSession/getCurrentQuestion/submitAnswer/
                                advanceSession/getStudentFacingSummary/
                                getResearchSummary/exportSession/resetSession
      store.ts                  In-memory session store + shared research-event logger
      publicViews.ts            Strips research metadata before anything reaches the client
      optionOrder.ts            Deterministic seeded option shuffle (see docs/tutor-flow.md)
      summary.ts                Pure summary computation (student-facing + research)
      errors.ts                 Typed errors for every invalid transition
  research/
    events/                  ResearchEvent discriminated union
    logging/                 ResearchEventLogger (in-memory implementation)
  lib/                     Small shared helpers (id generation)

scripts/
  audit-questions.ts        npm run audit:questions
  audit-session.ts          npm run audit:session

tests/
  helpers/quadratics.ts     Shared numeric verification helpers
  domain/questionBank/      Bank integrity, coverage, duplicate-detection, math-verification
  tutoring/session/          Session lifecycle, performance-independence, logging,
                            summary, study-sequence, option-order tests
  app/tutor/                 Component tests for the tutor UI (mocked Server Actions)

docs/                      Research design, architecture, curriculum, difficulty,
                           misconception taxonomy, question-bank, tutor-flow,
                           non-adaptive-sequence, research-logging, and
                           session-data-schema docs
```

## Not yet built

Deliberately out of scope for this repository (see [`CLAUDE.md`](CLAUDE.md)
for the full list and why):

- Persistent research-event storage (a real database — see
  [`docs/research-logging.md`](docs/research-logging.md), "Persistence")
- Adaptive mastery updates or adaptive sequencing (developed in the
  sibling `adaptive-math-tutor` repository)
- Authentication, participant recruitment/consent flows, teacher
  dashboards, pre/post testing, production deployment, a statistical
  analysis pipeline

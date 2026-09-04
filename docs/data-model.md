# Data Model

Source of truth is the TypeScript in `src/`; this document explains the
*why* behind each shape. See each file for the full type.

## `Question` — [`src/domain/questions/types.ts`](../src/domain/questions/types.ts)

```ts
type Question = {
  id: string;
  stem: string;
  conceptIds: string[];
  primaryConceptId: string;
  difficulty: DifficultyLevel; // 1 | 2 | 3 | 4 | 5
  options: AnswerOption[];
  correctOptionId: string;
  workedSolution: string;
  explanation?: string;
  tags?: string[];
  source?: string;
  version: number;
};
```

- `id` is immutable and stable across research sessions — analysis joins
  on it. If an item needs to change materially, bump `version` rather than
  mutating an existing id's meaning.
- `options` has no fixed length. Nothing in the codebase assumes 4 options
  — see [`architecture.md`](architecture.md) for how the UI is expected to
  render an arbitrary-length list.
- `correctOptionId` references an option `id`, never a position (`"A"`,
  `"B"`, ...). Option order can be shuffled per presentation without any
  change to how correctness is determined.
- `conceptIds` may name several concepts a question exercises;
  `primaryConceptId` must be one of them.

## `AnswerOption` — [`src/domain/questions/types.ts`](../src/domain/questions/types.ts)

```ts
type AnswerOption = {
  id: string;
  display: string;
  isCorrect: boolean;
  misconceptionId?: string;
  derivationNote?: string;
};
```

- `misconceptionId` is set only on distractors that correspond to a
  specific, plausible incorrect line of reasoning (a lookup reference into
  [`Misconception`](#misconception--srcdomainmisconceptionstypests), not
  free-text).
- `derivationNote` is developer/research metadata describing the incorrect
  working that produces this option. It is never rendered to a student —
  see `src/app/page.tsx` and any future `/tutor` UI for the boundary.

## `Concept` — [`src/domain/concepts/types.ts`](../src/domain/concepts/types.ts)

```ts
type ConceptStrand =
  | "algebra_foundations" | "factorisation" | "solving" | "discriminant"
  | "roots_coefficients" | "graphs" | "transformations" | "intersections" | "reasoning";

type Concept = {
  id: string;
  name: string;
  description: string;
  prerequisiteIds: string[];
  strand: ConceptStrand;
  learningObjective?: string;
};
```

A node in the quadratics concept graph (35 populated in Phase 1 — see
[`docs/curriculum.md`](curriculum.md)). `prerequisiteIds` drives curriculum
ordering; `strand` groups concepts for organisation and coverage
reporting only, it does not gate anything. Validated for referential
integrity, self-dependency, duplicate prerequisites, and cycles by
[`validateDomainModel`](../src/domain/validateDomainModel.ts) (which calls
[`findConceptGraphCycles`](../src/domain/curriculum/validateCurriculum.ts)).
Per-concept supported difficulty ranges live separately, in
[`CONCEPT_DIFFICULTY_GUIDANCE`](../src/domain/curriculum/conceptDifficultyGuidance.ts)
— not on `Concept` itself, since it's Phase 2 authoring guidance, not a
property of the concept.

## `Misconception` — [`src/domain/misconceptions/types.ts`](../src/domain/misconceptions/types.ts)

```ts
type Misconception = {
  id: string;
  label: string;
  description: string;
  conceptIds: string[];
  errorPattern?: string;
  exampleIncorrectReasoning?: string;
};
```

Stable-id taxonomy entries (35 populated in Phase 1 — see
[`docs/misconception-taxonomy.md`](misconception-taxonomy.md)).
`AnswerOption.misconceptionId` values must resolve to a `Misconception.id`
here — enforced by
[`validateDomainModel`](../src/domain/validateDomainModel.ts) and covered
by tests. `errorPattern` and `exampleIncorrectReasoning` are
developer/research metadata describing the flawed procedure and a worked
instance of it — never student-facing. A `misconceptionId` on a selected
option is *evidence consistent with* that misconception, not proof of a
persistent one — see "Evidence vs. persistent misconception" in
[`docs/misconception-taxonomy.md`](misconception-taxonomy.md).

## `ExperimentalCondition` / `TutorSession` — [`src/domain/sessions/types.ts`](../src/domain/sessions/types.ts)

```ts
type ExperimentalCondition = "adaptive" | "non_adaptive";

type TutorSession = {
  id: string;
  participantId: string;
  condition: ExperimentalCondition;
  startedAt: string; // ISO 8601
  completedAt?: string;
  presentedQuestionIds: string[];
};
```

`condition` is decided once, at session creation, and lives on the session
object — never re-derived from a URL or scattered UI state.

## `StudentModel` / `ConceptMastery` — [`src/domain/student/types.ts`](../src/domain/student/types.ts)

```ts
type ConceptMastery = {
  conceptId: string;
  mastery: number; // 0..1
  attempts: number;
  correctAttempts: number;
  misconceptionEvidence: Record<string, number>;
};

type StudentModel = {
  participantId: string;
  conceptMastery: Record<string, ConceptMastery>;
};
```

**Architecture only.** Nothing in this repository computes or updates a
`StudentModel`. It exists so `AdaptiveSelectionContext` has a well-typed
place to hold mastery evidence once the adaptive policy is implemented
(in the sibling adaptive-tutor repository).

## `ResearchEvent` — [`src/research/events/types.ts`](../src/research/events/types.ts)

A discriminated union keyed on `eventType`, covering: `SESSION_STARTED`,
`QUESTION_PRESENTED`, `ANSWER_SUBMITTED`, `ANSWER_CORRECT`,
`ANSWER_INCORRECT`, `MISCONCEPTION_FLAGGED`, `FEEDBACK_PRESENTED`,
`QUESTION_ADVANCED`, `SESSION_COMPLETED`. Every variant carries
`eventId`, `timestamp`, `participantId`, `sessionId`, and `condition`;
each variant then only allows the fields relevant to that event (e.g. a
`SESSION_STARTED` event has no `selectedOptionId` field — it is not
merely optional-and-empty, it does not type-check if present). See the
file for the full union.

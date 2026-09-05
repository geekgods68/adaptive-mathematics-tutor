# Session Data Schema

The structured output a completed (or in-progress) session produces for
later analysis — what `exportSession(sessionId)`
([`src/tutoring/session/service.ts`](../src/tutoring/session/service.ts))
returns, and what each field means.

```ts
type SessionExport = {
  session: {
    id: string;
    participantId: string;
    condition: "non_adaptive";
    startedAt: string;        // ISO 8601
    completedAt?: string;     // ISO 8601, present once status is "completed"
    status: "active" | "completed";
    sequence: string[];       // the fixed 35 question ids, in presentation order
    currentPosition: number;  // index into `sequence`
  };
  responses: TutorResponse[];
  events: ResearchEvent[];
  summary: ResearchSessionSummary;
};
```

## `responses: TutorResponse[]`

One entry per answered question, in the order answered (which — in this
condition — is always the same as `sequence` order):

```ts
type TutorResponse = {
  questionId: string;
  selectedOptionId: string;
  correctOptionId: string;
  isCorrect: boolean;
  misconceptionId?: string;   // see docs/research-logging.md, "Misconception evidence"
  presentedAt: string;        // ISO 8601
  submittedAt: string;        // ISO 8601
  responseTimeMs: number;     // submittedAt - presentedAt; see docs/research-logging.md, "Timing definition"
};
```

To recover concept/difficulty information for a response, join
`questionId` against the production bank
(`QUESTIONS.find(q => q.id === questionId)` in
[`src/domain/questions/index.ts`](../src/domain/questions/index.ts)) — it
is deliberately not duplicated onto every response, since the bank is the
single source of truth for question metadata and could change version
independently of already-recorded responses.

## `events: ResearchEvent[]`

Every event this session generated (already filtered to this
`sessionId`), in the shape defined by
[`src/research/events/types.ts`](../src/research/events/types.ts) — see
[`docs/research-logging.md`](research-logging.md) for which event types
fire when, and [`docs/data-model.md`](data-model.md) for the full
per-event-type field list.

## `summary: ResearchSessionSummary`

Computed purely from `responses` (never influences sequencing — see
[`src/tutoring/session/summary.ts`](../src/tutoring/session/summary.ts)):

```ts
type ResearchSessionSummary = {
  totalQuestions: number;
  correctAnswers: number;
  incorrectAnswers: number;
  accuracy: number; // 0..1
  averageResponseTimeMs: number;
  performanceByConcept: Record<string, { attempts: number; correct: number }>;      // keyed by conceptId
  performanceByDifficulty: Record<DifficultyLevel, { attempts: number; correct: number }>; // keyed by 1-5
  misconceptionEvidenceCounts: Record<string, number>;                              // keyed by misconceptionId
};
```

This is the **research/development** summary — richer than what the
student ever sees. The student-facing completion screen uses a much
smaller type, `StudentFacingSummary` (same file):

```ts
type StudentFacingSummary = { totalQuestions: number; correctAnswers: number; accuracy: number };
```

`computeStudentFacingSummary` and `computeResearchSessionSummary` are
independent pure functions over the same `ActiveTutorSession.responses` —
neither is computed from the other, and neither reads or writes any
session state itself.

## Example (abbreviated)

```json
{
  "session": {
    "id": "session_1a2b3c4d",
    "participantId": "participant_9f8e7d6c",
    "condition": "non_adaptive",
    "startedAt": "2026-01-15T14:02:03.000Z",
    "completedAt": "2026-01-15T14:19:47.000Z",
    "status": "completed",
    "sequence": ["q-recognise-quadratic-001", "q-standard-form-002", "..."],
    "currentPosition": 34
  },
  "responses": [
    {
      "questionId": "q-recognise-quadratic-001",
      "selectedOptionId": "q-recognise-quadratic-001-o1",
      "correctOptionId": "q-recognise-quadratic-001-o1",
      "isCorrect": true,
      "presentedAt": "2026-01-15T14:02:03.500Z",
      "submittedAt": "2026-01-15T14:02:11.200Z",
      "responseTimeMs": 7700
    }
  ],
  "events": [
    { "eventId": "event_...", "timestamp": "2026-01-15T14:02:03.000Z", "participantId": "participant_9f8e7d6c", "sessionId": "session_1a2b3c4d", "condition": "non_adaptive", "eventType": "SESSION_STARTED" }
  ],
  "summary": {
    "totalQuestions": 35,
    "correctAnswers": 24,
    "incorrectAnswers": 11,
    "accuracy": 0.6857,
    "averageResponseTimeMs": 18342,
    "performanceByConcept": { "concept-factorising-monic-quadratics": { "attempts": 3, "correct": 2 } },
    "performanceByDifficulty": { "1": { "attempts": 5, "correct": 5 }, "2": { "attempts": 9, "correct": 6 } },
    "misconceptionEvidenceCounts": { "FACTOR_SIGN_ERROR": 2, "B2_PLUS_4AC": 1 }
  }
}
```

## What this schema deliberately omits

- No mastery estimate, predicted next difficulty, or recommendation of
  any kind — this repository does not compute those (see `CLAUDE.md`
  constraint against adaptive mastery).
- No cross-session aggregation — each export is scoped to one session.
  Aggregating across participants/sessions for statistical analysis is
  explicitly out of scope for this repository (Phase 3 brief, "Do not
  build: a statistical analysis pipeline").

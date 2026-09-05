# Research Logging

What gets recorded during a session, in what shape, and what its
current limitations are.

## Event types

The Phase 0 `ResearchEvent` discriminated union
([`src/research/events/types.ts`](../src/research/events/types.ts)) is
unchanged in Phase 3 — every event type it already defined is now
actually emitted by `src/tutoring/session/service.ts`:

| Event | Emitted when |
| --- | --- |
| `SESSION_STARTED` | `startSession()` is called |
| `QUESTION_PRESENTED` | A question is first shown — at session start, and once per `advanceSession()` call. **Not** re-emitted by re-reading the current question (e.g. on page refresh) — see `getCurrentQuestion()`, which is read-only. |
| `ANSWER_SUBMITTED` | Every call to `submitAnswer()` that passes validation |
| `ANSWER_CORRECT` / `ANSWER_INCORRECT` | Immediately after, based on `gradeAnswer`'s result |
| `MISCONCEPTION_FLAGGED` | Only when the selected (incorrect) option carries a `misconceptionId` |
| `FEEDBACK_PRESENTED` | Immediately after grading, once per submission |
| `QUESTION_ADVANCED` | `advanceSession()`, only when there is a next question (not logged on the final question — see below) |
| `SESSION_COMPLETED` | `advanceSession()` when the sequence is exhausted — logged exactly once per session |

Every event carries `eventId`, `timestamp`, `participantId`, `sessionId`,
and `condition` (always `"non_adaptive"` in this repository) in addition
to its event-specific fields — see `baseEventFields()` in
`src/tutoring/session/service.ts`.

## Response records

Each `TutorResponse`
([`src/tutoring/session/types.ts`](../src/tutoring/session/types.ts))
captures, for one answered question:

```ts
{
  questionId, selectedOptionId, correctOptionId, isCorrect,
  misconceptionId?,       // present only if the selected option carries one
  presentedAt, submittedAt, responseTimeMs,
}
```

Combined with the session's own `participantId`, `sessionId`, and the
question's `conceptIds` / `primaryConceptId` / `difficulty` (looked up
from the production bank by `questionId` at analysis time), this is
enough to recover everything listed in the Phase 3 brief without relying
on aggregates: participant, session, question, position (its index in
`session.sequence`/`presentedQuestionIds`), concepts, difficulty,
selected and correct option, correctness, misconception evidence, timing,
and timestamp.

## Timing definition

```text
responseTimeMs = submittedAt - presentedAt
```

`presentedAt` is set the moment a question is first shown
(`presentQuestion()` sets `currentQuestionPresentedAt`, which becomes
`presentedAt` on the eventual response). `submittedAt` is set inside
`submitAnswer()`, at the moment grading happens. This interval covers
only the time spent reading and answering the question — **not** any time
spent afterward reading the feedback/worked solution, since that happens
strictly after `submittedAt` and only ends when the student clicks
Continue (which starts the *next* question's timer via a fresh
`presentQuestion()` call).

## Misconception evidence — interpretation

A `misconceptionId` recorded on a response or a `MISCONCEPTION_FLAGGED`
event means **the selected response is consistent with misconception X**
— it is not a claim that the student definitely holds that
misconception. A single selection could be a momentary slip unrelated to
the student's actual understanding. See "Evidence vs. persistent
misconception" in
[`docs/misconception-taxonomy.md`](misconception-taxonomy.md) for the
full methodological argument; this repository only ever logs evidence,
never acts on it (see `docs/experimental-conditions.md`).

## Export schema

`exportSession(sessionId)`
([`src/tutoring/session/service.ts`](../src/tutoring/session/service.ts))
returns everything needed for later analysis — see
[`docs/session-data-schema.md`](session-data-schema.md) for the full
shape. Accessible two ways:

- **Developer download**: the "Download session JSON" button on
  `/dev/session` (`src/app/dev/session/dev-session-client.tsx`) triggers
  a client-side download of the export as
  `tutor-session-<sessionId>.json`.
- **Programmatically**: call `exportSession(sessionId)` directly from
  server-side code (it's a plain exported function, not a Server Action —
  no HTTP layer required to use it from other server code).

## Persistence — current limitation

Both the session store (`sessionStore`) and the shared research-event
logger (`sessionResearchLogger`) in
[`src/tutoring/session/store.ts`](../src/tutoring/session/store.ts) are
**in-memory, for the lifetime of the running server process**. This is a
deliberate Phase 3 prototype choice, not an oversight:

- Survives: page refreshes, closing and reopening the tab, normal
  navigation — anything that doesn't restart the Next.js process.
- Does **not** survive: `next dev`/`next start` being restarted. A stale
  `tutorSessionId` cookie pointing at a now-gone session is detected
  (`resumeSessionAction` catches `SessionNotFoundError`, clears the
  cookie, and reports "no session" rather than erroring) and the student
  simply starts a fresh session — no crash, but the prior session's data
  is gone unless it was already exported.
- A real study deployment would replace `SessionStore`'s and the
  logger's internals with a real database — every function in
  `service.ts` that touches them (`sessionStore.get/save/delete`,
  `sessionResearchLogger.log/getEvents`) would need no interface change
  to do so, since callers only depend on those methods, not on the
  in-memory implementation.

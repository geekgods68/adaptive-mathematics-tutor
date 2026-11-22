# Session State, Persistence, and Data Integrity

See [`AUDIT_INDEX.md`](AUDIT_INDEX.md) for the evidence-level legend.

## 1. Where state lives — complete inventory

### Server, in-memory only (both conditions)

| Store | File | Scope | Survives refresh? | Survives server restart? |
|---|---|---|---|---|
| `sessionStore` | `src/tutoring/session/store.ts:12-26` | Non-adaptive `ActiveTutorSession`s, keyed by session id | Yes (cookie-tracked id, server process alive) | **No** — plain `Map`, explicitly documented "server-process-lifetime" |
| `sessionResearchLogger` | `src/tutoring/session/store.ts:36` | Every `ResearchEvent` ever logged for non-adaptive sessions, this process | Yes | **No** |
| `adaptiveSessionStore` | `src/tutoring/adaptiveSession/store.ts:13-27` | Adaptive `ActiveAdaptiveSession`s (shared by `/practice` and `/adaptive-tutor`) | Yes | **No** |

**SOURCE VERIFIED.** Both stores' own doc comments state this is a deliberate prototype choice, not an oversight (`store.ts:4-11` and `adaptiveSessionStore`'s equivalent). CLAUDE.md's Phase 3 entry independently confirms: "Still NOT built: persistent research-event storage." There is **no equivalent `ResearchEvent` stream for the adaptive condition at all** — adaptive sessions' decision history lives only inside each session's own `ExperimentSessionState.selectionTraces`/`estimatorTraces`/`responses`, which die with the process exactly like everything else here. There is no `exportSession`-equivalent function for a *real* (non-Phase-8) adaptive session — `getAdaptiveSessionSummary` returns only the rounded, student-facing summary, not a raw exportable record. **Consequence: if a real student completes an adaptive session and the server process later restarts, the only trace that session ever happened is whatever made it into the browser's `localStorage` (a rounded summary) — the full decision trace is gone forever, for both conditions equally, but the adaptive condition has no `ResearchEvent`-equivalent to begin with.** See Finding F-03.

### Client, `localStorage` (student-facing only, never Phase 8 data)

| Key | Module | Written by | Read by | Cleared by |
|---|---|---|---|---|
| `rise-student-history-v1` | `src/lib/studentHistory.ts` | `recordSession()` on every completed session (both conditions, via `PracticeClient.tsx` only) | Dashboard, Progress, History, Settings | `clearHistory()` — History and Settings pages |
| `rise-student-settings-v1` | `src/lib/studentSettings.ts` | `writeSettings()` on every `handleStart` | Practice setup screen, Settings | Never explicitly cleared anywhere |
| `rise-student-mastery-state-v1` | `src/lib/studentMasteryState.ts` **(new)** | `writeMasteryState()`, on adaptive completion, `PracticeClient.tsx` only | `readMasteryState()`, before starting a new adaptive session, `PracticeClient.tsx` only | **Nothing in the UI clears this key** |
| `rise-student-question-history-v1` | `src/lib/studentQuestionHistory.ts` **(new)** | `recordSeenQuestionIds()`, incrementally per question presented, `PracticeClient.tsx` only | `readSeenQuestionIds()`, before starting a new adaptive session | **Nothing in the UI clears this key** |

**SOURCE VERIFIED**, all four, by direct reading of each module and every call site (`grep` confirmed `writeMasteryState`/`recordSeenQuestionIds`/`clearMasteryState`/`clearSeenQuestionIds` call sites across `src/app`; the clear functions exist as exports but are never imported/called anywhere in the UI).

### Server, on disk (research data, never student data)

- `research-output/` (gitignored) — Phase 6 artifacts and the Phase 8 pilot's own output copy. Never read by any student-facing code path.
- `docs/phase8/` — committed snapshots (pilot reports, slice-feasibility analyses) used by `src/research/ui/readOnlyData.ts` to populate the Researcher Workspace.
- `config/phase8/*.json` — versioned, hash-checked experiment configuration, read-only at runtime from the Researcher Workspace.

The separation between this and the `localStorage` student data is structurally real: the Researcher Workspace's data-access module (`src/research/ui/readOnlyData.ts`) never imports anything from `src/lib/student*.ts`, and vice versa. **SOURCE VERIFIED.**

## 2. The client/server research-metadata boundary (CLAUDE.md constraint 11)

**SOURCE VERIFIED**, re-checked specifically because the new continuity feature adds a second, independent server→client data transfer that did not exist before this audit's starting point.

- `toPublicQuestionView`/`toPublicAdaptiveQuestionView`: no `misconceptionId`, `derivationNote`, `difficulty`, `conceptIds`, or pre-submission `correctOptionId`. Confirmed by direct reading of `src/tutoring/session/publicViews.ts` and `src/tutoring/adaptiveSession/publicViews.ts`, and by an existing test (`getCurrentPublicQuestion never includes the correct option id or difficulty`, in `tests/tutoring/adaptiveSession/service.test.ts`, re-run and passing in this audit).
- **The new transfer** — `sanitizeMasteryStatesForClient` (`src/tutoring/adaptiveSession/masteryStateTransfer.ts:38-56`) — was designed, per its own doc comment, specifically to respect this boundary: it strips `recentEvidence` (which carries `misconceptionId`/`difficulty` per entry) before anything crosses to the client, and the reconstruction side (`reconstructMasteryStatesForSession`) never needs or accepts that field back. This audit independently confirmed, by reading the full `ConceptMasteryState` type and the sanitizer function side by side, that every field sent to the client (`mastery`, `initialMastery`, `numObservations`, `correctCount`, `incorrectCount`, `consecutiveCorrect`, `consecutiveIncorrect`, `modelVersion`, two timestamps) is genuinely free of misconception/difficulty/concept-identity information. A dedicated test (`masteryStateTransfer.test.ts`, written alongside the fix and included in this audit's test run) asserts this via a negative string match on the serialized output.
- **Verdict: the boundary is correctly maintained** by the new code, not just assumed. This is a case where a feature add was reviewed against the hard constraint and passed.

## 3. Does stored state get treated as "validated true mastery"? (CLAUDE.md / task requirement)

**SOURCE VERIFIED, no.** Every display of a mastery value in the UI is captioned as a model estimate: "These are model estimates produced by a deterministic formula, not empirically calibrated measurements of what you actually know" (identical wording in both `PracticeClient.tsx:570-572` and `adaptive-tutor-client.tsx:307-309`). The persisted `PersistableConceptMasteryState` itself carries `modelVersion`, and reconstruction rejects any entry whose `modelVersion` doesn't match the server's current estimator (`masteryStateTransfer.ts:81`) — a version-drift safeguard, not a trust assumption.

## 4. Data-integrity properties of the new continuity feature

- **No duplicate mastery updates on duplicate submission:** the pre-existing guard (`session.experimentState.responses.length > session.experimentState.sequenceIndex` → throw `AdaptiveAnswerAlreadySubmittedError`, `service.ts:214-216`) is unchanged by the fix and was re-confirmed by a new test in this audit's suite asserting `estimatorStates` is byte-identical after a rejected duplicate submission.
- **Per-concept rejection, not whole-session failure, on bad client input:** `reconstructMasteryStatesForSession` validates every field's type/range and the `modelVersion` per concept, independently; a corrupted or tampered entry for one concept is dropped (and reported in `rejectedConceptIds`) while valid concepts still seed normally (`masteryStateTransfer.ts:110-146`; TEST VERIFIED, 9 dedicated test cases including a conceptId/key-mismatch tamper check).
- **Cold-start sentinel correctly reset across session boundaries:** `lastSequenceIndex` is reset to `-1` on reconstruction rather than carried forward as an absolute value, specifically to avoid a negative staleness gap silently disabling the diagnostic-backtracking mechanism in the new session (`masteryStateTransfer.ts:98-105`, reasoning documented inline and independently verified correct by this audit: `currentSequenceIndex - lastSequenceIndex` with `lastSequenceIndex` carried forward *would* go negative, since the new session's own `sequenceIndex` restarts at 0).
- **No atomic multi-key write.** `writeMasteryState()` and `recordSession()` (and, for the history side, the separate `recordSeenQuestionIds()` calls made per-question) are three independent `localStorage.setItem` calls, each in its own `try/catch`, with no transaction or rollback across them (`PracticeClient.tsx:142-152`). If the browser's storage quota is hit between the first and second call, the two "mastery" stores (history-derived and the new authoritative one) can diverge silently — no code detects or surfaces this. **This is a real, if narrow, data-integrity gap introduced by the new feature.** See Finding F-04.
- **"Clear" is incomplete.** Neither `clearMasteryState()` nor `clearSeenQuestionIds()` is called from anywhere in the UI (confirmed by `grep` across `src/app`) — the only clear control that exists (`clearHistory()`, on History and Settings) leaves both new keys untouched. A student cannot currently reset their adaptive mastery/question-exposure state through the UI at all. See Finding F-04.

## 5. Session isolation (per-student, per-condition, per-browser)

- **Across browsers/devices:** no isolation exists because no account system exists — `localStorage` is inherently per-browser. A student switching devices starts cold on the new device, correctly (since there is nothing to carry over) and without any error. **SOURCE VERIFIED, DOCUMENTED INTENT** (Settings page explicitly discloses this: "no account system or server-side storage for student data").
- **Across the two routes sharing one cookie (`/practice` vs. `/adaptive-tutor`):** genuinely **not** isolated — both read/write the same server-side session via the same cookie name and the same `adaptiveSessionStore`. A session started on one page can be resumed on the other. Only one of the two pages, however, participates in the client-side continuity/history system. See Finding F-01.
- **Across adaptive vs. non-adaptive on `/practice`:** fully isolated — separate cookies (`adaptiveTutorSessionId` vs. the non-adaptive session's own cookie, confirmed by reading both `actions.ts` files), separate in-memory stores, separate `localStorage` record types (`type: "adaptive" | "non-adaptive"` on each `SessionHistoryRecord`).
- **Across Phase 8 synthetic data and real student data:** structurally separate at every layer checked (different stores, different file locations, different UI code paths, confirmed in §1 above) — this audit found no code path that could cause the two to be conflated.

## 6. Handling of missing/invalid/stale state

- A stale session cookie pointing at a since-restarted server's now-empty `Map` is handled gracefully: `resumeAdaptiveSessionAction`/`resumeSessionAction` catch the resulting "not found" error, delete the cookie, and report `"no_session"` rather than surfacing an error to the student (`src/app/adaptive-tutor/actions.ts:55-65`, mirrored for non-adaptive). **SOURCE VERIFIED.**
- Corrupted `localStorage` JSON is handled gracefully in every one of the four modules — each read function wraps `JSON.parse` in `try/catch` and falls back to an empty/null result rather than throwing (`studentHistory.ts:54-68`, `studentMasteryState.ts:60-77`, `studentQuestionHistory.ts:20-32`, `studentSettings.ts:28-40`). None of these silently "reset progress" in the sense of actively clearing anything — they simply treat unreadable data as absent for that read.

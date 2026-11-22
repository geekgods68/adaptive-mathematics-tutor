# Stage 3 — Student Interface Consolidation, Mastery-State Consistency, Session Recovery, Adaptive UX, Browser Verification

Status date: 2026-11-03 (completion pass; supersedes the 2026-11-02 PARTIALLY
COMPLETE draft of this same report). Builds on
`docs/stage1-experimental-validity-report.md`,
`docs/stage2-research-persistence-report.md`, and the 2026-10-29 read-only
audit (`docs/system-audit/`).

**Overall status: COMPLETE**, with a small set of explicitly named,
non-mandatory residual limitations (section 13) — not glossed over.
Every item on the coordinator's six-priority completion-pass list (Part
16 UI-vs-SQLite agreement; mastery-state single authority; the full
session-recovery scenario list including a real server-process restart
and two-tab/network-failure handling; a functional UI/math-rendering
review; real accessibility and responsive verification; full regression)
has been implemented and verified, not merely attempted.

Evidence labels: **SOURCE VERIFIED** (read the actual current code),
**TEST VERIFIED** (an automated test run in this session confirmed it),
**BROWSER VERIFIED** (a real Playwright run against a live `next dev`
server, in this session, confirmed it), **NOT VERIFIED** (not exercised),
**NOT ATTEMPTED** (out of scope).

---

## 1. Executive summary

This report covers two passes: an initial pass (2026-11-02, correctly
self-reported as PARTIALLY COMPLETE) and this completion pass
(2026-11-03), which closed every gap that first pass left open. In total:

**Fixed, with tests, across both passes:**
1. **F-04** (Settings reset split-brain) — three distinct, separately
   confirmed reset operations replace one incomplete "clear history"
   control.
2. **Adaptive explanation inaccuracy** ("harder question" absolute-state
   bug) — now a genuine before/after comparison of two real recorded
   difficulty values.
3. **Non-adaptive chapter selection** — backend-supported since Stage 1,
   previously UI-blocked with an inaccurate note; unlocked.
4. **F-01** (continuity gap between `/practice` and `/adaptive-tutor`) —
   `/adaptive-tutor` now uses the same participant-id/authoritative-
   mastery mechanism as `/practice`, via the same shared library modules
   (not a second implementation).
5. **Mastery-state duplication** (Priority 2, this pass) — collapsed to
   ONE authoritative source: the server's durable record of a stable,
   pseudonymous per-browser participant id's most recently completed
   adaptive session. A local snapshot is consulted only when no durable
   record exists yet for that id, and can never override one that does.
6. **Three real accessibility defects** (Priority 5, this pass) —
   insufficient color-contrast on three sidebar text elements, missing
   accessible names on answer radios and the question-progress bar — all
   found by a real axe-core scan and fixed, not suppressed.
7. **A real, substantive bug found by this pass's own network-failure
   test**: every Server Action call site in `PracticeClient.tsx` left
   the UI permanently disabled ("Submitting…" forever) if the underlying
   `fetch` itself failed (not a structured server-side error) — the
   async `startTransition` callback threw, uncaught. Fixed by wrapping
   every call site, and the error screen itself — previously a dead end
   with no way back — now offers "Try Again" (re-resume) and "Return to
   Dashboard."
8. **A real, reproducible Playwright-suite bug this pass found and fixed
   in its OWN test infrastructure**, not the product: a scratch-database
   wipe written as a top-level `playwright.config.ts` statement was
   re-evaluated inside every worker process, deleting data an earlier
   spec file's test had already written out from under the still-running
   shared dev server. Moved to a proper `globalSetup` module, which runs
   exactly once.

**Browser-verified this pass, not merely implemented:** the Part 16
UI-vs-durable-SQLite-record agreement test (both C0 and C2, full
20-question sessions); the complete session-recovery scenario list
including a **real kill-and-restart of the `next dev` process**, two-tab
concurrent session interaction, and simulated network failure; real
axe-core accessibility scans across four pages with every genuine finding
fixed; responsive-layout checks at mobile/tablet/desktop; keyboard-only
operation of the question screen; and mathematical rendering across all
14 real RISE chapters using actual bank content, not hand-picked fixtures.

## 2. Initial problems: which audit findings were addressed, by which pass

- **F-01** (continuity gap, `/practice` vs `/adaptive-tutor`): **fixed
  this pass** — section 5.
- **F-02** (disjoint question banks): fixed in Stage 1.
- **F-03** (no durable persistence): fixed in Stage 2.
- **F-04** (Settings reset split-brain): fixed in the first Stage 3 pass
  — section 7.
- **F-05** (Phase 8 infrastructure gaps): Stage 2's concern, unaffected.
- **"Harder question" absolute-state bug**: fixed in the first Stage 3
  pass — section 8.
- **Mastery-state duplication** (documented-but-not-fixed risk from the
  first pass): **fixed this pass** — section 6.

## 3. UI architecture

Unchanged from the first pass's findings, reconfirmed: `/practice` is
the canonical route (SOURCE VERIFIED, `PracticeClient.tsx`/`AppShell.tsx`/
`navConfig.ts`); `/tutor` and `/adaptive-tutor` are explicitly labeled
compatibility pages (amber banners added in the first pass, unmodified
since) rather than redirected or removed, preserving their own documented
contracts and tests. `/dev/session` and `/dev/adaptive-session` remain
outside `STUDENT_NAV`, untouched.

**This pass's one architectural addition:** `/adaptive-tutor`'s own
`handleStart` (in `adaptive-tutor-client.tsx`) now calls the same
`getOrCreateParticipantId()`/`resolveAuthoritativeMastery()` helpers
`PracticeClient.tsx` uses, and records seen-question ids the same way —
closing F-01 with a minimal, shared-code fix rather than duplicating the
continuity mechanism a second time.

## 4. Mastery and state consistency — the single-authority fix (Priority 2)

**Problem (identified in the first pass, fixed in this one):** "current
mastery" (Dashboard/Progress) and the cross-session seeding value
(`PracticeClient`'s next-session seed) were two independently-written
localStorage keys. They never actually diverged in practice, but nothing
*structurally* prevented it.

**Fix — one authoritative source, server-side:**

1. **`src/lib/studentIdentity.ts`** (new): a stable, pseudonymous,
   per-browser `participantId`, generated once and persisted in
   localStorage (`rise-student-participant-id-v1`). This is explicitly
   NOT an authentication system — no login, no server-side account, no
   way to look up another browser's id. It exists solely so the server
   can recognize "the same student, later" at all, which no prior
   mechanism did (every session previously got a fresh random
   participant id server-side unless the caller supplied one, and no
   caller ever did).
2. **`adaptiveSession/service.ts`'s new `getAuthoritativeMasteryForParticipant(participantId)`**:
   queries `adaptiveSessionStore.listCompleted({ participantId })`
   (Stage 2's existing, exact-match-filtered durable store — this cannot
   be used to enumerate or read another participant's data) and returns
   the most recently completed session's sanitized mastery snapshot, or
   `undefined` if none exists yet. TEST VERIFIED:
   `tests/tutoring/stage3/authoritativeMastery.test.ts` — no
   cross-participant leakage, picks the most recent of several completed
   sessions, returns `undefined` for an unknown participant.
3. **New Server Action `getCurrentMasteryStateAction`** (`adaptive-tutor/actions.ts`)
   exposes this to the client.
4. **`src/lib/masteryAuthority.ts`'s `resolveAuthoritativeMastery()`**
   (new): the ONE function every surface now calls. Resolution rule,
   deliberately structural rather than timestamp-based: if the server has
   ANY durable record for this participant id, it wins, unconditionally
   — the local snapshot is consulted ONLY when the server has nothing
   yet (a genuine migration case: a browser with mastery data from before
   this mechanism existed). TEST VERIFIED, explicitly proving the
   required property: `tests/lib/masteryAuthority.test.ts`, "a stale
   local snapshot CANNOT override newer authoritative (durable) mastery,
   even when the local value looks more recently written" — a local
   snapshot claiming a higher, newer-looking value is still correctly
   ignored once a durable record exists.
5. **`buildProgressView`** (`adaptiveSession/progress.ts`) had its
   parameter type relaxed from the server-only `ConceptMasteryState` to a
   minimal structural `MasteryStateForProgressView`/`ConceptForProgressView`
   shape — satisfied by both the real server type AND the client-safe
   `PersistableConceptMasteryState`, so Dashboard, Progress, and the
   durable-record path all build their "current mastery" display rows
   through the exact same function, not three independent
   reimplementations.
6. **Dashboard/Progress** (`DashboardClient.tsx`, `ProgressClient.tsx`):
   `currentMasteryByConcept()` (the old, history-snapshot-derived
   approach) was deleted outright, not left as dead code. Both now call
   `resolveAuthoritativeMastery()` + `buildProgressView()`. Progress
   additionally shows an explicit provenance line ("Current estimates are
   from your session completed `<date>`" linked to History, or an amber
   "showing locally saved data from before server records existed" note
   for the migration-fallback case) — a transparency improvement over the
   old per-row "from session" column, which could previously point to a
   DIFFERENT historical session per concept even though every row's
   current value always came from one single most-recent evaluation.
7. **`studentHistory.ts`'s `buildHistorySummary`** signature changed to
   accept the resolved current-mastery rows as a parameter instead of
   deriving them internally — `conceptsPractised`/
   `conceptsMeetingMasteryCriteria` now come from the single authority;
   `totalSessions`/`accuracy`/`lastSession` remain legitimately sourced
   from session history (historical counts, not current-state claims).
8. **Reset controls updated to match:** "Reset adaptive progress"/"Reset
   all" now also call `clearParticipantId()`. This was a REAL correctness
   gap this pass caught in its own earlier work: once mastery is
   authoritatively server-side, clearing only the local snapshot would
   have had NO visible effect for a participant who already had a durable
   record — the old participant id would still resolve the old durable
   mastery on the very next session. Retiring the id instead gives the
   next session a genuinely fresh identity with no durable history to be
   found under, without deleting the old durable record (which remains
   valid, intact research data under its now-abandoned id). TEST
   VERIFIED: `tests/app/settings/SettingsClient.test.tsx`'s new test
   confirms the participant id actually changes after this reset.

**Dashboard new-student detection fix (found while wiring this in):**
`isNewStudent` previously depended only on local session-history count.
Since "Clear session history" and "Reset adaptive progress" are now
genuinely independent operations (by design, from the first pass's F-04
fix), a student could have durable mastery with zero local history
entries — `isNewStudent` now also checks for observed mastery rows, so
the Diagnostics/Concept-mastery sections don't wrongly disappear.

## 5. Session continuity and recovery (Priority 3) — full scenario list, BROWSER VERIFIED

All of the following are real Playwright runs against a live `next dev`
server (`tests-e2e/sessionRecovery.spec.ts` unless noted), not unit-level
approximations:

- **Refresh before submitting:** the same question re-appears; nothing
  is recorded as answered; session identity (cookie) is unchanged.
- **Refresh after submitting, before continuing:** feedback is preserved
  across the refresh; continuing afterward advances exactly one question,
  never re-submits or skips.
- **Navigate away (Dashboard) and back:** resumes the SAME session at the
  SAME position, confirmed via an unchanged session cookie — never a
  silent new session.
- **Rapid double-click on Submit:** records exactly one response;
  advancing afterward moves to exactly the next question, never skipping
  one.
- **Invalid/stale session cookie:** handled gracefully — falls back to
  the normal setup screen, no crash, no error overlay.
- **Settings reset → new session:** a genuine cold start, confirmed to
  land on the setup screen rather than auto-resuming.
- **Two tabs sharing one session cookie** (new this pass): submitting
  from tab A and reloading tab B shows the advanced state; answering from
  tab B and reloading tab A shows ITS advance — one shared durable
  session, never two diverged copies, confirmed in both directions.
- **Simulated network/server failure** (new this pass, and the pass that
  found the real bug described in section 1, item 7): aborting the
  Server Action's own request (not just any request — narrowed via the
  Next.js `next-action` request header) previously hung the UI forever;
  now surfaces "Try Again," which correctly resumes the same durable
  session afterward with no duplicated or lost state.
- **Real server-process restart** (`tests-e2e/serverRestart.spec.ts`, run
  via its own `npm run test:e2e:restart` / `playwright.restart.config.ts`
  — see that file's doc comment: Next.js 16 refuses to run a second
  `next dev` instance for the same project directory while another is
  already running, even on a different port, so this cannot share a
  Playwright run with the rest of the suite): a real child `next dev`
  process is started, driven through two answered questions plus a
  pre-restart refresh (to rule out in-memory React state doing the work),
  then genuinely killed (`SIGTERM`) and a fresh process started on the
  same port against the same scratch database. The browser recovers the
  exact same question position and feedback, then continues normally.
  BROWSER VERIFIED, passing.
- **Cross-session mastery continuity across two real completed sessions**
  is TEST VERIFIED at the service layer (`tests/tutoring/stage3/authoritativeMastery.test.ts`,
  `tests/lib/masteryAuthority.test.ts`) rather than via a second full
  browser session in this pass — the Part 16 agreement test (section 8)
  already drives one full real session per condition through the browser
  and confirms server/browser agreement; chaining a SECOND real browser
  session specifically to observe continuity end-to-end was judged
  redundant with the already-passing service-layer proof plus the fact
  that `resolveAuthoritativeMastery`'s own call path is exercised live by
  every `handleStart` in the passing browser tests above.

**Duplicate actions / idempotency:** backed by Stage 2's transactional
store (unique sequence constraints) plus the double-click test above —
both the server-side guarantee and the client-visible behavior are now
verified, not just the former.

## 6. Research-data agreement (Part 16) — BROWSER VERIFIED, both conditions

`tests-e2e/researchDataAgreement.spec.ts` drives a REAL, complete session
through the browser for both modern conditions, then reads back Stage 2's
durable SQLite record, research-event log, and Phase 6 artifact — via a
separate `tsx` child process (`tests-e2e/readDurableSession.ts`), not a
dynamic `import()` from inside the Playwright test file, because
Playwright's own module loader does not resolve this repo's `@/*` path
aliases for a deep dynamic-import chain the way `tsx`/the Next.js build
do; shelling out to `tsx` reuses the real service/store/artifact code
completely unchanged rather than reimplementing any of it.

**C0 (non-adaptive, 20 real questions, Geometry chapter):** PASSING.
Verified: completion summary (total/correct) matches the durable
`responses` array exactly, per-question correctness sequence matches
exactly (not just totals), every recorded response's question id is a
real entry in the durable `presentedQuestionIds` list, the research-event
log has no duplicate or missing sequence numbers (contiguous 1..N),
exactly one `answer_submitted` event per question and one
`session_completed` event, and the Phase 6 artifact loads and passes
integrity verification (schema version, content digest, question-bank
hash) with zero issues.

**C2 (adaptive, real session to completion):** PASSING. Same checks as
C0, plus: the completion screen's scraped per-concept "After" mastery
percentages match the durable `estimatorStates` exactly, which in turn
match the Phase 6 artifact's `finalEstimatorStates` exactly; at least one
`estimator_updated` event exists (unlike C0's null estimator, which
correctly never emits one).

**Honest boundary, stated precisely:** the browser never displays raw
question ids to the student (by CLAUDE.md hard constraint 11), so
"browser and durable record agree on question IDs" is verified as "every
durably recorded response corresponds to a durably recorded presented
question," not as a literal DOM-to-database string comparison — the
protected client/server boundary makes the latter impossible without
leaking research metadata to the browser, and this is the correct,
intentional limit of what can be checked at this layer.

**A real bug this test caught and the fix applied (both in this pass):**
the test's own driving logic initially raced the last-question-to-
completion UI transition (the "Question N of" heading updates the SAME
DOM node in place between questions, so it stays "visible" throughout a
transition and is not a reliable "next question has loaded" signal) and
separately misused `Locator.isVisible()` as if it waited for an element
to appear (it does not — it checks current state only). Both were fixed
in the test harness itself; no product code change was needed for either.

## 7. Reset semantics

Unchanged from the first pass (section 7 there) except for the
participant-id addition described in section 4, item 8, above.

| Control | Clears | Preserves |
|---|---|---|
| Clear session history | `rise-student-history-v1` only | Mastery state, seen-question history, participant id |
| Reset adaptive progress | `rise-student-mastery-state-v1`, `rise-student-question-history-v1`, participant id | Session history list |
| Reset all student practice data | All of the above | Stage 2's durable research-event log and exported artifacts — immutable research records, never touched by any reset here |

## 8. Adaptive feedback accuracy

Unchanged from the first pass — see that work's description (now
section numbering shifted; substance identical): `explainSelection` now
compares two real recorded difficulty values rather than an absolute
threshold. Reconfirmed passing in this pass's full regression run.

## 9. Question rendering (Part 9 / Priority 4) — now BROWSER- and DATA-VERIFIED

**New this pass**, replacing the prior liveness-only smoke check:
`tests/components/MathText.riseBank.test.tsx` renders REAL stems and
answer options from every one of the bank's 14 chapters (chapter read
directly off each question's own id, `MATH-CH##-####`, not inferred),
specifically including each chapter's single LONGEST stem (a proxy for
"the most complex expression actually in the bank" for that chapter) plus
its options, and a deterministic fixed-stride sample of 20+ questions
across the full 1,840-question bank — 30 tests total, all asserting no
`.katex-error` class appears and real text content renders. This is
genuine evidence across algebra, functions, exponents, logarithms,
differentiation, integration, geometry, trigonometry, vectors,
probability, statistics, proofs/logic, permutations/combinations, and
complex numbers — not a hand-picked subset.

**Also BROWSER VERIFIED:** `tests-e2e/practice.spec.ts`'s Scenario F
confirms no Next.js error overlay and non-empty rendered stem text across
3 consecutive real questions in an actual browser session (unchanged from
the first pass).

**Honest limit:** this confirms KaTeX renders every real expression in
the bank without throwing a rendering error — it does not independently
verify that every rendered expression is mathematically CORRECT (that is
`audit:rise-questions`'/question-authoring's domain, explicitly out of
Stage 3's scope and unchanged by it).

## 10. Dashboard, Progress, History, Assessments — functional review (Priority 4)

Reviewed via source inspection; only the mastery-authority change
(section 4) and the Dashboard new-student-detection fix (section 4) were
found to need a code change. Specifically checked and found accurate,
with no fix needed:

- **`AssessmentsClient.tsx`** already states plainly that it "uses the
  identical adaptive practice engine as Practice... the difference is
  purely how you get here" — no misleading claim of a separate validated
  diagnostic instrument.
- **`HistoryDetailClient.tsx`** already states explicitly that it shows
  "a summary saved in your browser... not a question-by-question
  transcript" — no research-only field leakage found (`misconceptionId`,
  `derivationNote`, raw difficulty/concept ids all absent from its
  render path, confirmed by reading every field it accesses).
- **Chapter filters and recommended-practice links** (`DashboardClient.tsx`'s
  `RecommendationsRow`) route to real, valid `/practice?mode=adaptive&chapter=...`
  URLs using live curriculum data from `listCurriculumAction()` — not a
  stale or hardcoded list.
- **Session-completion summaries** (`PracticeClient.tsx`'s two completion
  screens) distinguish adaptive (per-concept mastery table, explicitly
  labeled "model estimates... not empirically calibrated measurements")
  from non-adaptive (explicitly states it "does not estimate per-concept
  mastery... deliberately never uses performance data") — no conflation
  of the two conditions' stopping rules or outputs.

## 11. Responsive design and accessibility (Priority 5) — real browser verification

`@axe-core/playwright` was added and run against four real pages in a
real browser (`tests-e2e/accessibilityAndResponsive.spec.ts`). **Three
real, genuine findings were discovered and fixed, not suppressed:**

1. **Insufficient color contrast**, three instances, all in
   `AppShell.tsx`'s sidebar: the "Student Workspace"/"Researcher
   Workspace" section label (2.51:1, needed 4.5:1), the inactive
   workspace-switcher tab text (4.12:1), and the "No authentication
   exists..." disclaimer (3.06:1). All three darkened to pass WCAG AA's
   4.5:1 threshold for normal text.
2. **Missing accessible names on answer radios** (`PracticeClient.tsx`):
   KaTeX's rendered output marks its visual HTML half `aria-hidden`,
   which left the implicit `<label>` wrapping each radio without a
   reliably computable accessible name for options containing math.
   Fixed with an explicit `aria-label={option.display}` on each radio.
3. **Missing accessible name on the question-progress bar**
   (`role="progressbar"` had no name at all) — fixed with
   `aria-label="Question progress"`.

**One finding, examined and deliberately NOT changed, documented
precisely in the test file itself:** axe-core's `label-content-name-mismatch`
rule flags the Adaptive/Non-Adaptive mode-selector buttons, whose
accessible name ("Adaptive mode"/"Non-Adaptive mode" — short, clear, and
relied on by many existing test selectors) is shorter than their full
visible text (title plus a longer supplementary description also inside
the clickable area). Per the W3C's own "Understanding SC 2.5.3" guidance,
only text that functions as the control's LABEL must appear in its
accessible name — genuinely descriptive supplementary text is explicitly
exempt — but axe's automated heuristic cannot distinguish "label" from
"description" in this composite-button pattern and flags it regardless.
This ONE rule is disabled for ONE page (`disableRules(["label-content-name-mismatch"])`,
`accessibilityAndResponsive.spec.ts`), with the rationale recorded in
both the test file and in `ModeCard`'s own doc comment in
`PracticeClient.tsx` — not a blanket suppression, and the only rule
disabled anywhere in the accessibility spec.

**Also BROWSER VERIFIED:**
- **Keyboard-only operation**: selecting an answer option and submitting
  using only `Tab`/`Space`/`Enter`, no mouse.
- **Visible focus indicator** on sidebar navigation links when tabbed to.
- **Responsive layout, mobile (375×812) / tablet (768×1024) / desktop
  (1440×900)**: zero horizontal overflow on Dashboard, Practice setup,
  and an active question screen at every size; the Submit button remains
  fully within the viewport (never clipped) at every size.
- **Mobile sidebar**: collapsed by default below the desktop breakpoint,
  opens via the menu button.

**Explicit non-claim:** this is real automated-scan plus manual-check
evidence for four specific pages/states and the viewport/keyboard checks
listed above — it is not a claim of full WCAG AA conformance across the
entire application, and axe-core itself only catches a subset of real
accessibility issues (documented in the spec file's own header comment).

## 12. Tests

**Full vitest suite, this session:** `npm test` → **975 passed / 975, 95
files** (up from the first pass's 936/92 — 39 new: mastery-authority
service/client tests, the RISE-bank math-rendering suite, additional
SettingsClient/PracticeClient/adaptive-tutor-client test updates).

**Previously-flagged timing-sensitive Phase 8 files**: unaffected by any
change in this pass (no Phase 8 file touched); last independently
reconfirmed passing in the first Stage 3 pass and Stage 2.

**Quality gates, all run in this session, all green:** `npm run
typecheck` (clean), `npm run lint` (clean, zero warnings), `npm run
build` (succeeded, 20 routes, same route count as Stage 1/2), `npm run
audit:questions` (161 questions, 0 integrity errors), `npm run
audit:rise-questions` (1,840 questions, 0 integrity errors), `npm run
audit:session` (0 integrity errors).

**Browser tests, this session, all green:**
- `npm run test:e2e` → **23 passed / 23** (accessibility ×10, practice
  smoke ×3, Part 16 research-data agreement ×2, session recovery ×8),
  real Chromium, real `next dev` server, run together in one suite.
- `npm run test:e2e:restart` → **1 passed / 1** — the real
  server-kill-and-restart scenario, run separately per its own
  documented constraint (section 5).

**Nothing was excluded from any of the figures above.** The
previously-flaky Part 16 C0/C2 tests were root-caused (a test-harness
race condition reading a mid-transition DOM, plus a global-setup
re-evaluation bug — both described in sections 5/6 — never a product
defect) and now pass reliably across multiple repeated runs, both in
isolation and as part of the full 23-test suite.

**A real, environment-dependent finding surfaced and cleaned up, not
silently ignored:** Stage 2's report claimed `npm run build` never
touches the real `research-output/` tree. In this environment, a bare
`npm run build` (no `RESEARCH_DB_PATH` override) was observed to create
`research-output/db/research.sqlite3{,-shm,-wal}` during static page
generation — contradicting that prior claim. The resulting disposable,
empty, gitignored files were removed after each occurrence; the
pre-existing frozen Phase 8 pilot data (`research-output/phase8/pilot/`,
`.../confirmatory/`) was confirmed untouched before and after every build
in this session. The specific build-time code path responsible was not
root-caused within this pass's remaining budget — flagged as a genuine
open item for whoever next touches the research-storage module's
default-path resolution, not swept under the rug.

## 13. Remaining limitations — the honest list

- **The `npm run build`-time `research-output/db/` write** (section 12)
  — real, reproducible, not root-caused to a specific route in this
  pass. Does not affect any test (all tests redirect `RESEARCH_DB_PATH`
  explicitly) and does not touch any frozen research data, but should be
  tracked down before this repository is ever built in an environment
  where an accidental real-looking `research-output/db/` artifact could
  be confused for genuine data.
- **Part 5.4's exhaustive reconciliation-policy enumeration** (every
  individually named failure mode: older schema versions, interrupted
  writes, etc.) is covered by the existing defensive per-entry validation
  in `studentMasteryState.ts`/`studentQuestionHistory.ts`/
  `masteryStateTransfer.ts` (all pre-dating this pass, TEST VERIFIED in
  earlier phases) plus this pass's own stale-snapshot test — not every
  individual named failure mode in that list has its own dedicated new
  test.
- **Part 5.5's authorization model** remains the existing, explicitly
  labeled single-user local prototype (`AppShell`'s "No authentication
  exists in this prototype" notice, unchanged). The new participant-id
  mechanism (section 4) is pseudonymous-convenience only, not real
  identity, and was designed specifically to avoid needing to build
  actual authentication — confirmed by design review, not just asserted.
- **A second, chained real-browser session** to observe cross-session
  mastery continuity end-to-end (as opposed to the service-layer proof
  already in place) was judged redundant with existing coverage — see
  section 5's explicit note — and was not built.
- **Full WCAG AA conformance** is not claimed — see section 11's explicit
  non-claim.

None of the above blocks Stage 4.

## 14. Stage 4 readiness

Unaffected and unblocked: Stage 2's persistence/export infrastructure
(which Stage 4 actually needs) was not modified in either Stage 3 pass.
The durable session history is now also reachable through a clean,
single-authority path (`getAuthoritativeMasteryForParticipant`,
`listCompleted`) that a future Stage 4 analysis tool could reuse directly
rather than re-deriving anything from client-side storage.

## 15. Files changed

**New, this completion pass:**
- `src/lib/studentIdentity.ts`, `src/lib/masteryAuthority.ts` (Priority 2)
- `tests/lib/masteryAuthority.test.ts`,
  `tests/tutoring/stage3/authoritativeMastery.test.ts`
- `tests/components/MathText.riseBank.test.tsx` (Priority 4)
- `tests-e2e/accessibilityAndResponsive.spec.ts` (Priority 5)
- `tests-e2e/researchDataAgreement.spec.ts`, `tests-e2e/readDurableSession.ts` (Part 16 / Priority 1)
- `tests-e2e/serverRestart.spec.ts`, `playwright.restart.config.ts`,
  `tests-e2e/globalSetup.ts`, `tests-e2e/globalSetupRestart.ts` (Priority 3)
- `tests-e2e/e2eScratch.ts` (shared scratch-path constants, first pass;
  extended this pass with the restart-test's separate scratch root)

**Modified, this completion pass:**
- `src/app/adaptive-tutor/actions.ts`, `actionTypes.ts` — new
  `getCurrentMasteryStateAction`; `startAdaptiveSessionAction` gained a
  `participantId` parameter.
- `src/app/adaptive-tutor/adaptive-tutor-client.tsx` — F-01 fix (section 3).
- `src/tutoring/adaptiveSession/service.ts` — new
  `getAuthoritativeMasteryForParticipant`.
- `src/tutoring/adaptiveSession/progress.ts` — `buildProgressView`'s
  parameter type relaxed to a shared structural interface.
- `src/app/DashboardClient.tsx`, `src/app/progress/ProgressClient.tsx` —
  single-authority mastery wiring (section 4).
- `src/lib/studentHistory.ts` — `currentMasteryByConcept` removed;
  `buildHistorySummary` signature changed.
- `src/app/settings/SettingsClient.tsx` — participant-id retirement added
  to the two destructive reset operations.
- `src/app/practice/PracticeClient.tsx` — every Server Action call site
  now catches network-level failures; the error screen gained "Try
  Again"/"Return to Dashboard"; `ModeCard`'s accessible-name handling;
  the answer-radio `aria-label` fix; the progressbar `aria-label` fix.
- `src/components/shell/AppShell.tsx` — three color-contrast fixes.
- `playwright.config.ts` — `globalSetup` instead of a top-level wipe
  statement (the real bug described in section 1, item 8);
  `testIgnore` for the restart spec.
- `package.json` — `@axe-core/playwright` devDependency,
  `test:e2e:restart` script.
- `tests/app/practice/PracticeClient.test.tsx`,
  `tests-e2e/practice.spec.ts`, `tests-e2e/sessionRecovery.spec.ts` —
  selector updates for `ModeCard`'s accessible-name changes.

**Unmodified from the first Stage 3 pass** (still in effect, reconfirmed
passing): the F-04 reset-semantics rework, the adaptive-explanation
before/after comparison, the non-adaptive chapter-selector unlock, the
`/tutor`/`/adaptive-tutor` compatibility banners — see the first pass's
original section numbers, now folded into sections 2/7/8/3 above.

**Confirmed untouched, both passes** (via `git status` before and after
every change in this session, and by direct inspection):
`src/domain/learner-model/`, `src/tutoring/selection/adaptive/`,
`data/question-bank/`, `protocol/`, `src/research/experiment/conditions.ts`,
`src/research/experiment/provenance.ts`, `src/research/phase8/`'s
estimator/simulator/Track A/pilot files, the legacy 161-question bank,
`src/tutoring/session/`, `tutor-client.tsx`, `adaptive-tutor-client.tsx`'s
own session-lifecycle logic (only its `handleStart`/`applyQuestionState`
continuity wiring changed), and the real `research-output/` tree's
pre-existing frozen Phase 8 pilot data.

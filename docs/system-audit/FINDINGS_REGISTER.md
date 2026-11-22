# Functional Completeness Matrix and Findings Register

See [`AUDIT_INDEX.md`](AUDIT_INDEX.md) for the evidence-level legend.

## Part 1 - Functional Completeness Matrix

| Subsystem | Intended functionality | Current implementation | Evidence | Verification status | Known limitations | User impact | Research impact |
|---|---|---|---|---|---|---|---|
| Non-adaptive session engine | Fixed, performance-independent 35-question sequence, full ResearchEvent log | src/tutoring/session/service.ts, in-memory store + logger | performanceIndependence.test.ts | VERIFIED WORKING | In-memory only; lost on restart | None while server runs | High-quality control-condition data, while the server stays up |
| Adaptive session engine (Phase 3/4) | Deterministic, prerequisite-aware, misconception-aware adaptive selection | src/tutoring/selection/adaptive/, src/domain/learner-model/ | tests/tutoring/selection/, tests/domain/learnerModel/ | VERIFIED WORKING | Thresholds are researcher-defined, not empirically calibrated (self-disclosed) | Mastery displayed is honestly captioned as a model estimate | Core engine under test in Phase 8, separately from the live product |
| Session continuity fix (new) | Cross-session mastery + exposure continuity, no protected-algorithm changes | masteryStateTransfer.ts, studentSelectionAdapter.ts, two new localStorage modules | New tests, disposable script (this audit) | VERIFIED WORKING for /practice; NOT APPLIED to /adaptive-tutor | F-01; no client-integration test (F-11); no reconciliation with the older history-derived mastery view (F-04) | A student using /practice gets correct continuity; one using /adaptive-tutor does not | None (student-facing feature only) |
| Original question bank (161) | Quadratics-only, computationally verified, fully covered | src/domain/questions/ | npm run audit:questions (this audit) | VERIFIED WORKING | None found | Serves /tutor only | Serves the non-adaptive condition only |
| RISE question bank (1,840) | General secondary-maths bank for the adaptive condition | src/domain/rise/ | Import-integrity test passing; validation CSV self-reports no independent/empirical review | IMPLEMENTED, NOT INDEPENDENTLY REVIEWED (self-disclosed) | No audit:questions-equivalent exists (F-10); not disclosed in-product (F-12) | Serves the entire live adaptive product | Serves the adaptive condition only - see F-02 |
| Two-condition research design | Shared bank/curriculum/session-structure, selection-only difference | As built: disjoint banks, disjoint curricula, disjoint session-logging schemas | docs/research-design.md vs. source | VERIFIED DEFECT (relative to the stated design) | - | Minimal (each condition works fine on its own terms) | High - see F-02, the most consequential finding in this audit |
| Server-side session persistence | - | Plain in-memory Maps for both conditions, explicitly documented as process-lifetime | store.ts doc comments (both conditions) | DOCUMENTED INTENT, SOURCE VERIFIED | No restart-survival for either condition; no ResearchEvent-equivalent for the adaptive condition at all | Total session loss on server restart | No durable raw data from real sessions for later analysis |
| Client-side student persistence | Dashboard/Progress/History backing store, cross-session continuity seed | Four localStorage keys, src/lib/student*.ts | Dedicated unit tests, all passing | PARTIALLY IMPLEMENTED (two keys have no clear-control) | F-04 | A student cannot fully reset their data via the UI | N/A (student data, not research data) |
| Student Workspace UI | Dashboard, Practice, Assessments, Progress, History, Settings | All present, AppShell-wrapped | Direct source inspection (no browser available) | IMPLEMENTED, NOT RUNTIME-VERIFIED (no browser tool) | - | - | - |
| Legacy /tutor, /adaptive-tutor, /dev/* | Original, pre-redesign entry points | Still fully functional, NavHeader-wrapped | Direct source inspection | IMPLEMENTED, NOT RUNTIME-VERIFIED | Orphaned from new nav (/adaptive-tutor); diverges from /practice's feature set (F-01, F-09) | A student who bookmarks/finds /adaptive-tutor gets a degraded, unrecorded experience | - |
| Researcher Workspace UI | Read-only status/config/results views over real on-disk state | 6 pages, all reading src/research/ui/readOnlyData.ts | Direct source inspection; cross-checked against actual filesystem state in this audit | VERIFIED WORKING (every "not yet implemented" claim it makes was independently confirmed true) | Cannot trigger execution (by design, documented) | N/A | Gives an accurate, not overstated, picture of pipeline maturity |
| Phase 5 experiment engine | Condition-agnostic session engine over pluggable estimator/selection adapters | src/research/experiment/sessionEngine.ts, conditions.ts | Full test suite passing | VERIFIED WORKING | C4 (pluggable estimator) is a type-checked extension point only, no registered instance | N/A | Powers both the live adaptive product (via C2) and Phase 8 |
| Phase 6 artifact/export pipeline | Content-addressed, integrity-checked, exportable run artifacts | src/research/artifact/ | Its own test suite passing | IMPLEMENTED, NOT RUNTIME-VERIFIED against Phase 8 output | Not wired to Phase 8 Track A/B runs | N/A | Cannot yet turn a Phase 8 run into a verified, exportable dataset automatically |
| Phase 8 simulator/estimators/Track A+B | Simulated-learner comparison of estimators and policies | src/research/phase8/ (~3,000 lines) | Dedicated test files, all passing; a real 13,560-run pilot already executed, 0 failures | VERIFIED WORKING at pilot scale | Confirmatory scale blocked (see next row) | N/A (research-only) | Can produce pilot-scale precision/feasibility data today |
| Phase 8 confirmatory execution | The actual hypothesis-tested comparison | Blocked: no protocol/APPROVAL.md | Direct filesystem check (this audit) + live Research Overview page | NOT IMPLEMENTED (the run); UNABLE TO DETERMINE (whether the block is code-enforced beyond the missing input) | Independent verifier, analysis/stats.py, full per-run persistence also absent | N/A | The study's actual research question cannot yet be answered |
| Test suite / CI diagnostics | Comprehensive, green on every change | 843 tests / 78 files, clean typecheck/lint/build, 0 integrity errors in both bank audits | This audit's own run (full output in TEST_AND_RUNTIME_VERIFICATION.md) | VERIFIED WORKING | Three Phase 8 test files have timeout headroom only under light load (timing artifact, not logic defect); no test for the continuity feature's client wiring (F-11); no RISE-bank quality audit script (F-10) | - | High confidence in the tested surface; a specific, named gap in the untested surface |
| Accessibility | - | Semantic radio groups, aria-current, role="progressbar" present in markup | Direct markup inspection | IMPLEMENTED, NOT RUNTIME-VERIFIED | No automated contrast/screen-reader testing exists | UNKNOWN whether contrast/AT compatibility actually holds | - |

## Part 2 - Numbered Findings Register

Ordered by severity (most consequential first).

---

### F-02 - The adaptive and non-adaptive conditions run on disjoint question banks and curricula, contradicting the project's own research design

**Subsystem:** Research design / question bank architecture
**Category:** Experimental validity
**Confidence:** CONFIRMED (SOURCE VERIFIED on both sides of the contradiction)
**Severity:** Critical

**Observed implementation:** `/tutor` (non-adaptive) draws exclusively from `QUESTIONS` - 161 hand-authored, computationally-verified, quadratics-only questions across 35 concepts (`src/domain/questions/index.ts`, confirmed via `npm run audit:questions`). `/adaptive-tutor` and `/practice` (adaptive mode) draw exclusively from `RISE_QUESTIONS` - 1,840 externally-generated questions across 109 concepts and 14 chapters spanning arithmetic through complex numbers, calculus, and combinatorics (`src/domain/rise/index.ts`). The two banks share no questions, no concept taxonomy, and no misconception taxonomy. The non-adaptive condition also uses one fixed, pre-computed 35-question sequence; the adaptive condition dynamically selects from the full 1,840-question pool. The two conditions also log research data through entirely different, non-interoperable schemas (`ResearchEvent` for non-adaptive; `ExperimentSessionState`'s own in-memory traces for adaptive - see F-03).

**Expected/documented behavior:** `docs/research-design.md` lines 36-39: "Two tutoring conditions share the same question bank, grading, interface, explanations, scoring, session structure, and research logging. The one deliberate difference is whether question selection is allowed to use information about the student's performance." The document also scopes the entire study's mathematics domain to "Quadratic Equations and Quadratic Functions" (line 14).

**Evidence:** `docs/research-design.md` lines 12-39 (DOCUMENTED INTENT); `src/tutoring/session/service.ts:2,9` vs. `src/tutoring/adaptiveSession/service.ts:2,77` (SOURCE VERIFIED, the two different bank imports); `docs/research-decisions.md` RD-0001/RD-0002/RD-0008 (SOURCE VERIFIED - these decisions explain why this diverged, each for a locally-reasonable engineering reason, but none of them revisits or amends `docs/research-design.md`'s own stated comparison design).

**Reproduction:** Read `docs/research-design.md` lines 34-39 alongside `src/tutoring/adaptiveSession/service.ts`'s imports; the contradiction is immediate and requires no runtime reproduction.

**Impact on users:** Low/none directly - each condition works correctly on its own terms.

**Impact on research validity:** High. As implemented, "adaptive vs. non-adaptive" is confounded with "quadratics-only, 161-question, hand-verified bank vs. general-secondary-maths, 1,840-question, not-independently-reviewed bank." Any observed difference between conditions in a real study could not be cleanly attributed to the adaptive algorithm alone. This is the single structural fact most likely to undermine the comparison this repository exists to support.

**Root cause (evidence-supported):** A sequence of individually well-reasoned, explicitly documented engineering decisions (RD-0001, RD-0002, RD-0008), each made to avoid a specific, immediate problem (test-range conflicts, a second incompatible repository, a missing KaTeX renderer) - none of which were, at the time, checked against the original research-design document's own comparability requirement, and that document was never updated.

**Unanswered questions:** Was the original quadratics-only research design deliberately superseded by a broader scope decision that simply wasn't written back into `docs/research-design.md`? Or is this a genuine, unaddressed gap? See `OPEN_QUESTIONS.md`.

---

### F-01 - The session-continuity fix is applied to /practice only; /adaptive-tutor shares the same session identity but still reproduces the original bug

**Subsystem:** Adaptive session orchestration / client integration
**Category:** Correctness (functional), Data integrity
**Confidence:** CONFIRMED
**Severity:** High

**Observed implementation:** `src/app/practice/PracticeClient.tsx` reads `readMasteryState()`/`readSeenQuestionIds()` before calling `startAdaptiveSessionAction`, and writes `writeMasteryState()`/`recordSeenQuestionIds()` around a session's lifetime (lines 102, 142-152, 186-188). `src/app/adaptive-tutor/adaptive-tutor-client.tsx:57` calls `startAdaptiveSessionAction(selectedChapterId)` with no third/fourth argument, and the file contains no reference to either new localStorage module (confirmed by grep). Both pages route through the identical `src/app/adaptive-tutor/actions.ts` Server Actions and the identical cookie name (`adaptiveTutorSessionId`), so they can resume each other's sessions, but only one of them participates in continuity or history recording.

**Expected behavior:** The fix was meant to resolve "every new adaptive session opens on the same first question" as experienced by a student; `/adaptive-tutor` is a live, still-reachable, fully functional page presenting the identical user-facing symptom today.

**Evidence:** `src/app/adaptive-tutor/adaptive-tutor-client.tsx:1-17,55-64` (SOURCE VERIFIED); `src/app/practice/PracticeClient.tsx:7-22,93-105,117-153,180-193` (SOURCE VERIFIED); confirmed via direct grep for `startAdaptiveSessionAction`, `studentMasteryState`, `studentQuestionHistory` across both files.

**Reproduction:** Navigate directly to `/adaptive-tutor` (not through `/practice`), complete a session, start a new one - the new session will cold-start exactly as before the fix.

**Impact on users:** A student who reaches the adaptive experience via `/adaptive-tutor` gets a silently worse, unfixed experience than one who reaches it via `/practice`, with no indication in the UI that two different adaptive entry points even exist.

**Impact on research validity:** Low directly, but compounds F-03/F-04: sessions run through `/adaptive-tutor` also never appear in `rise-student-history-v1`.

**Root cause:** The fix correctly targeted the shared `src/tutoring/adaptiveSession/service.ts`/`src/app/adaptive-tutor/actions.ts` layer (benefiting both routes equally at the engine level), but the client-side localStorage wiring was added only to the newer `PracticeClient.tsx`, not retrofitted onto the older, still-live `adaptive-tutor-client.tsx`.

---

### F-03 - No server-side persistence exists for either condition, and the adaptive condition has no ResearchEvent-equivalent at all

**Subsystem:** Session storage / research logging
**Category:** Data integrity, Experimental validity
**Confidence:** CONFIRMED
**Severity:** High

**Observed implementation:** `sessionStore` and `adaptiveSessionStore` are both plain in-process Maps (`src/tutoring/session/store.ts:12-26`, `src/tutoring/adaptiveSession/store.ts:13-27`), each with a doc comment explicitly stating this is deliberate and process-lifetime-only. The non-adaptive condition additionally logs every lifecycle step to `sessionResearchLogger`, an `InMemoryResearchEventLogger` (`store.ts:36`) - equally non-durable. The adaptive condition has no equivalent event-logging object at all; its only record of what happened in a session is the session's own `ExperimentSessionState.selectionTraces`/`estimatorTraces`/`responses`, which exist only as long as the Map entry does, and there is no `exportSession`-equivalent function anywhere in `src/tutoring/adaptiveSession/` to pull that data out before it's lost.

**Expected/documented behavior:** CLAUDE.md's own Phase 3 entry states "Still NOT built: persistent research-event storage" - so the non-adaptive gap is explicitly disclosed. The adaptive condition's complete absence of any comparable logging mechanism is not separately disclosed anywhere this audit found.

**Evidence:** `src/tutoring/session/store.ts:4-11,36`; `src/tutoring/adaptiveSession/store.ts:3-12`; absence confirmed by grep finding no ResearchEvent/logger import anywhere under `src/tutoring/adaptiveSession/`.

**Impact on users:** None directly while the server is running.

**Impact on research validity:** High for any real-student deployment: a server restart (deploy, crash, routine maintenance) silently and permanently discards every session not already reflected in a student's own browser localStorage - and that browser copy is a rounded, student-facing summary, not raw decision-trace data. There is currently no way to recover a real adaptive student's full session trace after the fact, once the serving process has cycled.

---

### F-04 - Two independent, non-atomic client-side "current mastery" stores now coexist, and the one UI clear-control only clears one of them

**Subsystem:** Client-side persistence
**Category:** Data integrity, UX
**Confidence:** CONFIRMED
**Severity:** Medium-High

**Observed implementation:** `rise-student-history-v1` (`src/lib/studentHistory.ts`) stores a ConceptMasterySnapshot[] per completed session; `currentMasteryByConcept()` derives the Dashboard/Progress "current mastery" display from the most recent session touching each concept. `rise-student-mastery-state-v1` (`src/lib/studentMasteryState.ts`, new) stores the authoritative, full-precision mastery snapshot that actually seeds the next adaptive session. Both are written from the same call site (`PracticeClient.tsx`'s `recordCompletedAdaptive`, lines 142 and 149-152) but as two separate `localStorage.setItem` calls, each independently wrapped in its own try/catch, with no shared transaction. Separately, `clearHistory()` (called by both the History and Settings pages) removes only `rise-student-history-v1` - `clearMasteryState()` and `clearSeenQuestionIds()` exist as exported functions but are never called from anywhere in the UI (confirmed by grep).

**Expected behavior:** A single, consistent "what does this student's mastery look like right now" answer, and a "clear my data" control that actually clears all of a student's locally-stored adaptive state.

**Evidence:** `src/lib/studentHistory.ts:130-140`; `src/lib/studentMasteryState.ts:79-88`; `src/app/practice/PracticeClient.tsx:142-152`; `src/app/history/HistoryClient.tsx:14-17`; `src/app/settings/SettingsClient.tsx:32-35`.

**Reproduction:** Complete an adaptive session, go to Settings, click "Clear all local session history," start a new adaptive session - the new session will still be seeded from the supposedly-cleared mastery state and will still avoid previously-seen questions.

**Impact on users:** A student who uses "clear history" expecting a true fresh start will not get one, with no error or indication that anything was left behind.

**Impact on research validity:** None (entirely student-facing local data).

---

### F-05 - The Phase 8 confirmatory experiment is structurally blocked, and several of its own stated downstream components do not exist yet

**Subsystem:** Research pipeline
**Category:** Experimental validity, Maintainability
**Confidence:** CONFIRMED
**Severity:** Medium (expected/by-design in large part, but worth registering precisely)

**Observed implementation:** `protocol/` contains only `AMENDMENTS.md` and `phase8-protocol-v2.md` - no `APPROVAL.md`, confirmed by direct directory listing in this audit. The live Research Overview and Experiment Designer pages (computed from real disk state, independently re-confirmed) both report the confirmatory mode as blocked for this reason, and separately report the C9.3 independent verifier, `analysis/stats.py`, and full per-run (C11) persistence as not implemented.

**Evidence:** `ls protocol/` (this audit); `src/app/research/page.tsx:39-40`; `src/app/research/experiments/page.tsx:61-70`; `src/app/research/reproducibility/page.tsx:33-36`.

**Impact on users:** None (research-only infrastructure).

**Impact on research validity:** The pipeline can produce pilot-scale feasibility/precision data (demonstrated: a real 13,560-run pilot with 0 failures) but cannot yet produce or statistically analyze the actual confirmatory comparison. This is explicitly, honestly disclosed by the product's own Researcher Workspace - this finding records that the gap is real, not that it is hidden.

**Unanswered question:** Is the enforcement of the confirmatory block a hard code-level gate inside `src/research/phase8/pipeline/`, or does the pipeline simply have no valid approved configuration to run against? This audit did not trace that specific code path. See `OPEN_QUESTIONS.md`.

---

### F-10 - No question-bank-quality audit exists for the RISE bank, unlike the original bank's npm run audit:questions

**Subsystem:** Question bank tooling
**Category:** Test coverage, Data integrity
**Confidence:** CONFIRMED
**Severity:** Medium

**Observed implementation:** `scripts/audit-questions.ts` runs exclusively against `QUESTIONS`/`CONCEPTS`/`MISCONCEPTIONS` (the original 161-question bank). There is no equivalent script for `RISE_QUESTIONS`/`RISE_CONCEPTS`/`RISE_MISCONCEPTIONS` - the bank that actually serves every real adaptive-mode student today. A RISE import-integrity test exists (`tests/domain/rise/riseImportIntegrity.test.ts`, confirmed passing) but it validates the CSV-to-TypeScript loading pipeline, not bank-quality metrics such as duplicate-stem detection or distractor-mechanism verification.

**Evidence:** `package.json`'s `audit:questions` script target; `scripts/audit-questions.ts`'s imports (no `@/domain/rise` import).

**Impact on users:** None directly observable, but means the bank actually in front of students has a strictly weaker automated quality-assurance net than the audit tooling's own existence implies the project considers necessary.

**Impact on research validity:** Compounds F-02 - the bank with the least independent scrutiny (by its own self-reported metadata) is also the one with the least repository-native tooling checking it.

---

### F-09 - Two functionally-overlapping adaptive entry points with diverging feature sets create a confusing, hard-to-reason-about surface

**Subsystem:** Routing / UI architecture
**Category:** Maintainability, UX
**Confidence:** CONFIRMED
**Severity:** Medium

**Observed implementation:** `/practice` (adaptive mode) and `/adaptive-tutor` both present "adaptive mathematics practice" over the identical engine, share a session cookie/store, but diverge in: history recording, continuity (F-01), and presence in primary navigation.

**Evidence:** Side-by-side comparison of `PracticeClient.tsx` and `adaptive-tutor-client.tsx` (this audit); grep confirming `/adaptive-tutor` is unlinked from the new Workspace nav.

**Impact on users:** Confusing if discovered; invisible if not (most students will only ever see /practice).

**Impact on research validity:** Low, same root cause as F-01.

---

### F-08 - Two independently-maintained navigation shells coexist (AppShell vs. NavHeader)

**Subsystem:** UI architecture
**Category:** Maintainability, UX
**Confidence:** CONFIRMED
**Severity:** Low-Medium

**Observed implementation:** The redesigned Student/Researcher Workspace uses `AppShell.tsx` (sidebar, workspace switcher, breadcrumbs, theme toggle); `/tutor`, `/adaptive-tutor`, `/dev/session`, `/dev/adaptive-session` use the older, simpler `NavHeader.tsx`. `AppShell.tsx`'s own doc comment confirms this was a deliberate choice to avoid touching working legacy pages.

**Evidence:** `src/components/shell/AppShell.tsx:21-30`; `src/components/NavHeader.tsx:1-18`.

**Impact on users:** A student navigating from `/practice` to `/adaptive-tutor` experiences a visually and structurally different app shell mid-session-family.

**Impact on research validity:** None.

---

### F-06 - "Moving to a harder question after consistent success" does not actually mean the difficulty increased

**Subsystem:** Adaptive explanation layer
**Category:** UX, Adaptive behavior accuracy
**Confidence:** CONFIRMED
**Severity:** Low-Medium

**Observed implementation:** The message fires whenever the newly-selected question's target concept has `reason === "progression"` and that concept's current `evidenceCount >= 3` and `difficulty >= 4` - an absolute-state check, not a comparison against the difficulty of the question the student was just shown (`src/tutoring/adaptiveSession/explanations.ts:26-28`). A student whose mastery has plateaued in the L4/L5 band will see this exact sentence on consecutive questions at the same difficulty.

**Evidence:** `explanations.ts:26-28`, cross-checked against `chooseTargetDifficulty`'s own difficulty-banding logic (`targeting.ts:324-354`), which has no notion of "previous difficulty" either.

**Impact on users:** A minor but real honesty gap in an otherwise carefully-honest explanation system.

**Impact on research validity:** None (student-facing copy only).

---

### F-11 - No automated test exercises the continuity fix's actual client-side (PracticeClient.tsx) wiring

**Subsystem:** Test coverage
**Category:** Test coverage
**Confidence:** CONFIRMED
**Severity:** Low-Medium

**Observed implementation:** `tests/app/practice/PracticeClient.test.tsx` contains zero references to `readMasteryState`, `readSeenQuestionIds`, `writeMasteryState`, `recordSeenQuestionIds`, or `persistableMasteryStates` (confirmed by grep). Its existing tests run with `localStorage.clear()` in `beforeEach`, so the arguments already asserted on are cold-start defaults, not evidence that a populated store is correctly read and forwarded.

**Evidence:** `tests/app/practice/PracticeClient.test.tsx` (full-file grep, this audit); contrast with the strong coverage that does exist at the engine layer and the pure-module layer.

**Impact on users:** None directly (a disposable script run in this audit independently confirms the engine-layer mechanism works); the specific risk is a future refactor of `PracticeClient.tsx` silently breaking the read/write wiring without any test failing.

**Impact on research validity:** None.

---

### F-12 - The RISE bank's self-disclosed lack of independent review is not surfaced anywhere in the student-facing product

**Subsystem:** Transparency / data provenance
**Category:** UX, Data integrity
**Confidence:** CONFIRMED
**Severity:** Low

**Observed implementation:** `data/question-bank/canonical-question-bank-validation-v1.csv` marks every question `independent_human_review: not_performed`, `empirical_validation: not_performed`; this is disclosed in `data/question-bank/README.md` and CLAUDE.md, both developer-facing documents. No page a student actually sees mentions this about the question content itself.

**Evidence:** `data/question-bank/canonical-question-bank-validation-v1.csv` (this audit); absence confirmed by reading every string literal in `PracticeClient.tsx`, `adaptive-tutor-client.tsx`, `AssessmentsClient.tsx`.

**Impact on users:** A student has no way to know, from within the product, that the specific questions they are answering have not been independently reviewed.

**Impact on research validity:** Low directly; contextually relevant to F-02.

---

### F-07 - "Starting with a question to see where you're at on this topic" slightly overstates its own scope

**Subsystem:** Adaptive explanation layer
**Category:** UX
**Confidence:** CONFIRMED
**Severity:** Low

**Observed implementation:** Fires on `reason === "insufficient_evidence"`, i.e., a single concept has fewer than 3 observations - not necessarily a new "topic." In an "Across All Topics" session this can recur many times per session as the frontier legitimately advances concept-by-concept.

**Evidence:** `explanations.ts:23-24`; `targeting.ts:19-29`.

**Impact on users:** Could read as the system "resetting" repeatedly when it is in fact correctly progressing; underlying mastery is never actually reset.

**Impact on research validity:** None.

---

### F-13 - Minor repository-hygiene and verification-coverage items

**Subsystem:** Repository hygiene / accessibility
**Category:** Maintainability, Test coverage
**Confidence:** CONFIRMED (existence) / UNKNOWN (accessibility impact)
**Severity:** Low

- An untracked editor swap file, `src/app/adaptive-tutor/.page.tsx.swp`, is present in the working tree (confirmed via git status). Harmless, but not part of any intended deliverable.
- No automated accessibility (contrast, screen-reader) testing exists anywhere in the suite; markup inspection shows correct semantic structure but this audit cannot confirm rendered contrast ratios or assistive-technology compatibility without a browser tool.

**Impact on users:** Unknown for the accessibility half; none for the stray file.
**Impact on research validity:** None.

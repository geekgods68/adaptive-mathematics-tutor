# Test and Runtime Verification

See [`AUDIT_INDEX.md`](AUDIT_INDEX.md) for the evidence-level legend and this audit's scope limitations (no browser automation was available).

Every command below was evaluated for mutation risk before being run. All six are the project's own documented, non-mutating diagnostic commands (`CLAUDE.md`'s "Commands" section); none writes to a tracked file, a lockfile, `data/question-bank/`, `protocol/`, or `research-output/`/`docs/phase8/` (the build writes only to the gitignored `.next/` directory).

## 1. `npm test` (vitest run)

**Exact output (full, unedited):**

```
> non-adaptive-tutor@0.1.0 test
> vitest run

 RUN  v5.0.0 /Users/advikpunugu/Desktop/non-adaptive-tutor

 Test Files  78 passed (78)
      Tests  843 passed (843)
   Start at  19:10:24
   Duration  22.22s (tests 61%, setup 19%, import 8%, environment 7%, transform 5%, worker 1%)
```

**What this proves:** every one of the 78 test files in the repository, including `tests/tutoring/session/performanceIndependence.test.ts` (the non-adaptive condition's structural performance-independence guarantee), the full Phase 8 estimator/simulator/pipeline suite, and the new session-continuity tests (`masteryStateTransfer.test.ts`, `studentSelectionAdapter.test.ts`, the new `service.test.ts` describe block, `studentMasteryState.test.ts`, `studentQuestionHistory.test.ts`), passed in one clean, non-parallel-load-contended run during this audit.

**What this does not prove:** it does not prove the tests themselves assert the right things (test-quality is assessed qualitatively in this audit's other documents, e.g. Finding F-11's note that no test exercises `PracticeClient.tsx`'s actual localStorage wiring for the continuity feature). It does not prove anything about runtime behavior in a real browser (no browser was used).

**Context carried over from the development work that immediately preceded this audit, not independently re-confirmed by a dedicated re-run in this audit beyond the one clean pass above:** three Phase 8 test files (`tests/research/phase8/bkt.test.ts`, `pilot.test.ts`, `runTrackA.test.ts`) contain large-sample/multi-run simulations with fixed timeouts (a 20s test timeout and a 60s `beforeAll` hook timeout respectively) that have been observed, in this repository's own recent history, to intermittently exceed those timeouts specifically when Vitest's per-file worker parallelism puts heavy concurrent CPU load on the machine — and to pass reliably when run in isolation. In this audit's own run, all three passed as part of the full suite with no timeout. This is flagged here as a known timing/infrastructure characteristic of the test suite, not a correctness defect in the code those tests exercise.

## 2. `npm run typecheck` (tsc --noEmit)

**Exact output:**
```
> non-adaptive-tutor@0.1.0 typecheck
> tsc --noEmit
```
(no output = no errors; `tsc` with `--noEmit` prints nothing on success). **Clean.**

## 3. `npm run lint` (eslint)

**Exact output:**
```
> non-adaptive-tutor@0.1.0 lint
> eslint
```
(no output = no violations). **Clean.**

## 4. `npm run audit:questions`

**Exact output (full):**
```
Total questions: 161
By strand:
  algebra_foundations: 14
  discriminant: 20
  factorisation: 27
  graphs: 21
  intersections: 10
  reasoning: 10
  roots_coefficients: 14
  solving: 33
  transformations: 12
By difficulty:
  L1: 23 (14.3%)  L2: 47 (29.2%)  L3: 49 (30.4%)  L4: 30 (18.6%)  L5: 12 (7.5%)
Diagnostic distractors: 219
Questions with >=1 diagnostic distractor: 139/161
Questions with multiple concepts: 32/161
Average options per question: 3.10
Option count histogram: 3 options: 146, 4 options: 14, 5 options: 1
Concepts covered: 35/35
Misconceptions represented: 35/35
Duplicate stems: 0
Questions sharing an option-display set with another question: 2 group(s) (informational)
  q-discriminant-nature-002, q-discriminant-nature-003, q-discriminant-nature-004, q-discriminant-nature-006
  q-graph-nature-roots-001, q-graph-nature-roots-002
Integrity errors: 0
```

**What this proves:** the 161-question, quadratics-only bank (used by the non-adaptive condition) is internally consistent, has full concept/misconception coverage, and has zero structural integrity errors, as of this exact moment in the repository's state. It says nothing about the RISE bank (the adaptive condition's bank), which this script does not check — no equivalent audit script exists for `RISE_QUESTIONS`. See `OPEN_QUESTIONS.md`.

## 5. `npm run audit:session`

**Exact output (full):**
```
Study sequence length: 35
Difficulty composition: L1: 5  L2: 9  L3: 10  L4: 7  L5: 4
Strand coverage: algebra_foundations: 3, discriminant: 5, factorisation: 6, graphs: 4,
  intersections: 2, reasoning: 2, roots_coefficients: 3, solving: 8, transformations: 2
  (9/9 strands represented)
L5 count: 4
Duplicate IDs: 0
Invalid IDs: 0
Integrity errors: 0
```

**What this proves:** the fixed 35-question non-adaptive study sequence is well-formed, covers every strand, and references only valid, non-duplicated question ids. Says nothing about the adaptive condition's sequencing (which is dynamic, not a fixed sequence, so this script's model doesn't apply to it).

## 6. `npm run build` (next build, Turbopack)

**Exact output (route table portion):**
```
✓ Compiled successfully in 1129ms
  Running TypeScript ... Finished TypeScript in 955ms
  Generating static pages using 7 workers (20/20) in 453ms

Route (app)
┌ ○ /
├ ○ /_not-found
├ ○ /adaptive-tutor
├ ƒ /api/research/pilot-report
├ ○ /assessments
├ ƒ /dev/adaptive-session
├ ƒ /dev/session
├ ○ /history
├ ƒ /history/[id]
├ ○ /practice
├ ○ /progress
├ ○ /research
├ ○ /research/experiments
├ ○ /research/models
├ ○ /research/reproducibility
├ ○ /research/results
├ ○ /research/runs
├ ○ /settings
└ ○ /tutor

○  (Static)   ƒ  (Dynamic)
```

**What this proves:** every one of the 20 routes compiles and prerenders (or is correctly marked dynamic) without error, including the uncommitted continuity-fix changes — i.e., the fix does not break the production build. **What this does not prove:** that any route behaves correctly at runtime in a browser, or that the static-vs-dynamic rendering choice for any given page is itself correct product behavior (this audit did not evaluate that).

## 7. Disposable, non-mutating verification of the continuity fix at the engine layer

To confirm the continuity fix actually changes behavior (not just that it typechecks and has passing unit tests), this audit ran a short, throwaway script directly against the real, unmodified `src/tutoring/adaptiveSession/service.ts` exports — the same functions the Server Actions call. The script was placed temporarily at `scripts/tmp-e2e-continuity-demo.ts` (so `tsx` could resolve the project's `@/` path aliases), executed once via `npx tsx`, and then deleted; it made no changes to any tracked file and the deletion was confirmed via `git status`.

**What the script did:** started a cold adaptive session ("Across All Topics"), answered 8 questions, captured the resulting persisted mastery snapshot and the list of seen question ids, started a *second* session passing that snapshot and id list back in (exactly as `PracticeClient.tsx` does), and separately started a *third*, un-seeded cold session for contrast.

**Exact output:**
```
--- SESSION 1: brand-new student, 'Across All Topics' ---
First question id: MATH-CH01-0004
Session 1 ended after 8 questions. Seen ids: [MATH-CH01-0004, MATH-CH01-0005, MATH-CH01-0006,
  MATH-CH01-0008, MATH-CH01-0010, MATH-CH01-0009, MATH-CH01-0011, MATH-CH01-0001]
Persisted mastery concepts: [ 'ALG01' ]

--- SESSION 2: same student returns ---
Second session's first question id: MATH-CH01-0007
Was this question already seen in session 1? false
Seeded mastery states match persisted snapshot:
  ALG01: persisted=0.6010 seeded=0.6010

--- Compare to a COLD-START session (no prior state) for contrast ---
Cold-start first question id: MATH-CH01-0004
Cold-start first question === session 1's first question? true
```

**What this proves:** (a) the originally-reported bug mechanism is real and still reproducible for a true cold start (`MATH-CH01-0004` every time, confirmed by the final line); (b) the fix genuinely changes behavior for a continuing session — a new question, not previously seen, and mastery seeded to the exact prior value, not a rounded or re-derived approximation. **What this does not prove:** that `PracticeClient.tsx` itself correctly wires this up end to end in a real browser (that remains SOURCE VERIFIED by reading the component, not RUNTIME VERIFIED by exercising it) — see Finding F-11.

## Test coverage gaps identified (qualitative, not a tool output)

- No automated test drives `PracticeClient.tsx` through a scenario where `localStorage` already contains prior mastery/seen-question data before `startAdaptiveSessionAction` is called — confirmed by `grep` finding zero references to `readMasteryState`, `readSeenQuestionIds`, `writeMasteryState`, or `persistableMasteryStates` anywhere in `tests/app/practice/PracticeClient.test.tsx`. Existing tests in that file run with `localStorage.clear()` in `beforeEach`, so they only exercise the cold-start path.
- No automated test exists for the RISE question bank's own integrity in the way `audit:questions` covers the original bank (there is a RISE *import*-integrity test, `tests/domain/rise/riseImportIntegrity.test.ts`, confirmed present and passing in this audit's run, but it checks the CSV→TypeScript loading process, not bank-quality metrics like duplicate detection or distractor-mechanism verification).
- No accessibility (contrast, screen-reader) automated test exists anywhere in the suite.

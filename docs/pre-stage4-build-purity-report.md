# Pre-Stage 4 — Build-Time Research-Database Write Investigation and Hardening

Status date: 2026-11-03. Addresses the "remaining limitation" flagged in
`docs/stage3-ui-integration-report.md` section 12/13: an observation,
during the Stage 3 completion pass, that `npm run build` appeared to
create `research-output/db/research.sqlite3{,-shm,-wal}` in the real
project tree.

**Verdict: COMPLETE for the engineering objective (the required
invariant — `npm run build` must not create or mutate a research
database — is now architecturally enforced and proven by regression
tests), with one honest, explicitly-stated exception: a pre-existing
code-level defect was NOT positively identified, because rigorous,
instrumented reproduction attempts never found one.** Section 1 explains
why that is the correct, evidence-based conclusion here rather than an
incomplete investigation, and what was built regardless.

---

## 1. Root cause

**No reproducible eager code path was found that calls `getResearchDb()`
(the only function in this codebase that can create a SQLite file —
confirmed by grepping the entire `src/`/`scripts/` tree for `node:sqlite`/
`DatabaseSync`: it appears in exactly two files, `db.ts`, which
constructs it, and `durableSessionStore.ts`, which only imports the
TYPE) during `next build`, `next dev` startup, or rendering of any page
in this application.**

Four independent, instrumented reproduction attempts, each specifically
designed to catch an eager call if one existed, all came back negative:

1. **Stack-trace instrumentation inside `getResearchDb()` itself**
   (temporarily added, logging to a fixed file on every call), run across
   a clean `rm -rf research-output/db .next && npm run build`: zero
   calls logged, zero files created.
2. **The same instrumentation, `next dev` started on a fresh port with no
   page ever visited**: zero calls, zero files.
3. **The same instrumentation, `next dev` started and literally every
   route in the app curled** (`/`, `/practice`, `/history`, `/progress`,
   `/settings`, `/assessments`, `/research` and all five of its
   sub-pages, `/tutor`, `/adaptive-tutor`) — all returned HTTP 200: zero
   calls, zero files. This specifically rules out "visiting a Researcher
   Workspace page touches the database," the most plausible-sounding
   hypothesis going in.
4. **A `next dev` server left deliberately running, with `npm run build`
   executed concurrently against the same project** (testing whether
   Next.js 16's own "another dev server is already running" detection
   mechanism has a side effect): build succeeded normally, zero calls,
   zero files.

All instrumentation was removed after use; `git diff` on `db.ts`
confirmed a clean revert before the architectural change described in
section 3 was made.

**Most likely actual explanation for the originally observed file**
(stated as the best available explanation, not provable after the fact):
during the Stage 3 completion pass, a one-off manual diagnostic command —
`npx tsx tests-e2e/readDurableSession.ts c0 <id>`, run directly from the
shell to debug the Playwright research-data-agreement test — was
executed WITHOUT the `RESEARCH_DB_PATH` environment override every
Playwright-driven invocation of that script otherwise receives. That
script calls `nonAdaptiveRiseSessionStore.get(sessionId)`, which calls
`getResearchDb()` with no explicit path, which correctly (per the
existing, intended design) falls back to
`DEFAULT_RESEARCH_DB_PATH = research-output/db/research.sqlite3` and
opens/creates it. This is NOT a bug — `resolveDbPath`'s fallback to a
real default path when no override is given is exactly the documented,
intended behavior for genuine runtime/CLI use — but running that specific
diagnostic command by hand, outside the test harness's env redirection,
would have created exactly the file later observed, around the same time
a build happened to also be run, making the two easy to conflate after
the fact. This is a plausible, specific, falsifiable account — not a
shrug — but it is a reconstruction, not a replayed observation, and is
reported as such rather than overstated as certain.

## 2. Reproduction

Reproducibility of the ORIGINAL observation: **not achieved**, despite
the four attempts in section 1. What IS reproducible, and verified
repeatedly in this session: a clean `npm run build`, run any number of
times, in this repository's current state, against both the real
`research-output/` directory and an isolated scratch directory, creates
no database file (section 4).

## 3. Fix implemented

Because no violating code path could be found to correct, "fix the
cause" took the form the coordinator's own candidate list anticipated for
exactly this situation — **explicit runtime-only storage initialization,
enforced architecturally rather than assumed from the absence of a
currently-known bug**:

**`src/research/storage/db.ts`'s `getResearchDb()`** now calls a new
`assertNotBuildPhase()` guard as its first statement. It checks
`process.env.NEXT_PHASE === PHASE_PRODUCTION_BUILD`, where
`PHASE_PRODUCTION_BUILD` is imported from Next.js's own public
`next/constants` module (`"phase-production-build"`) — **not** a
hardcoded string, not process-name sniffing, and not an
undocumented/invented environment variable: `NEXT_PHASE` is Next.js's own
official, documented mechanism for a module to know which phase it is
running under, already relied on internally by Next.js itself and by
common community tooling for exactly this kind of guard. If it matches,
`getResearchDb()` throws a descriptive error immediately, before any
filesystem access, naming this report and explaining what to do instead.

This converts "some future code path accidentally calls `getResearchDb()`
during a build" from a silent filesystem side effect into an immediate,
loud build failure — a strictly stronger guarantee than "we didn't find a
bug today."

**Why this scope, not broader:** `NEXT_PHASE` is `phase-production-build`
*only* for the duration of `next build`. It is `phase-development-server`
for `next dev` and `phase-production-server` for a started production
server (`next start`) — both explicitly verified to still work normally
(section 4's third and fourth guard tests). Real runtime session
handling, in dev or in a deployed production server, is completely
unaffected; only the build compilation step is hardened.

**Why not something broader/more invasive:** lazy construction
(`createDurableSessionStore` already only stores a `dbFactory` reference,
never calling it until a store method is actually invoked — confirmed by
re-reading `durableSessionStore.ts`) was already the existing, correct
architecture; there was no "eager module-scope side effect" to remove,
because there wasn't one to find. Separating read/write construction
further, or making initialization conditionally async, would have been
unjustified extra complexity for a problem the evidence doesn't show
exists in the current code.

## 4. Build purity — evidence

**Unit-level (vitest), new this task, `tests/research/storage/db.test.ts`:**
- `getResearchDb()` throws (message matches `/next build/i`) and creates
  no file when `NEXT_PHASE=phase-production-build`.
- `getResearchDb()` opens normally when `NEXT_PHASE` is unset.
- `getResearchDb()` opens normally when `NEXT_PHASE=phase-development-server`.
- `getResearchDb()` opens normally when `NEXT_PHASE=phase-production-server`
  (confirms a deployed production server is unaffected).

**Import-safety (vitest), new this task,
`tests/research/storage/importSafety.test.ts`** (Group B): with
`RESEARCH_DB_PATH` pointed at a path that does not exist, dynamically
importing each module a static page or Server Action transitively
depends on — `nonAdaptiveRiseSession/store.ts`, `nonAdaptiveRiseSession/service.ts`,
`adaptiveSession/store.ts`, `adaptiveSession/service.ts`,
`completedSessionArtifacts.ts`, and `db.ts` itself — creates no file.
6/6 passing.

**Integration-level (real `next build`), new this task,
`scripts/verify-build-purity.ts`** (`npm run verify:build-purity`, Group
A — deliberately a separate script, not part of `npm test`, because it
runs an actual multi-second production build): snapshots an isolated,
initially-empty scratch directory AND the real `research-output/` tree
before, runs a genuine `npx next build` with
`RESEARCH_DB_PATH`/`RESEARCH_SESSION_ARTIFACTS_ROOT`/`PHASE8_RUNS_ROOT`
pointed at the scratch directory, then asserts both locations are
byte-for-byte unchanged (recursive file listing diff) afterward.
**Executed twice in this session: PASSED both times.**

**Direct manual confirmation**, run repeatedly in this session:
`rm -rf research-output/db .next && npm run build` → `find research-output`
shows only the pre-existing `phase8/pilot/`, `phase8/confirmatory/`
directories; `research-output/db/` is never recreated.

## 5. Runtime persistence — evidence that legitimate behavior is unaffected

- **C0/C2 session creation, persistence, and real server-restart
  recovery**: `tests-e2e/serverRestart.spec.ts` (`npm run
  test:e2e:restart`) — a genuinely killed-and-restarted `next dev` child
  process — passing, 3/3 consecutive runs in this session after an
  unrelated timing-robustness improvement to the test's own
  server-readiness check (replaced a fixed sleep with HTTP polling; this
  was a test-harness reliability fix, not a product or guard change).
- **Full Part-16 UI-vs-durable-record agreement** (both C0 and C2, real
  complete sessions, Stage 2 SQLite + Phase 6 artifact cross-checked):
  `tests-e2e/researchDataAgreement.spec.ts` — 2/2 passing.
- **Durable store unit/integration suite**
  (`tests/research/storage/durableSessionStore.test.ts`,
  `tests/research/storage/completedSessionArtifacts.test.ts`,
  `tests/tutoring/stage2/*`, `tests/tutoring/stage3/*`): all passing,
  unaffected by the guard (none of them run with `NEXT_PHASE` set).
- **Phase 8 Track A/B per-run persistence**
  (`tests/research/phase8/persistence.test.ts`): passing.
- **Research-integrity verification** (`verifyArtifactIntegrity`,
  exercised inside `researchDataAgreement.spec.ts`): passing, confirming
  schema version, content digest, and question-bank hash checks all still
  function normally.

## 6. Regression test results

| Group | What it proves | Result |
|---|---|---|
| A — build purity | `npm run build` against an isolated, empty research-data directory creates/modifies nothing | PASS (`npm run verify:build-purity`, 2/2 runs) |
| B — import safety | Importing store/service/artifact modules opens no database | PASS (6/6, `importSafety.test.ts`) |
| C — runtime initialization | A real session operation correctly initializes storage on demand | PASS (`db.test.ts`'s "fresh initialization" test, unaffected by the new guard outside build phase; also exercised live by every passing e2e test) |
| D — persistence across restart | C0/C2 sessions survive an actual server restart | PASS (`serverRestart.spec.ts`, 3/3 consecutive) |
| E — existing-data safety | Reopening an existing database never erases/reinitializes records | PASS (`db.test.ts`'s pre-existing "reopening... destroys no existing records" test, reconfirmed) |
| F — research compatibility | Session exports, provenance, Phase 8 storage remain operational | PASS (`completedSessionArtifacts.test.ts`, `persistence.test.ts`, `researchDataAgreement.spec.ts`) |

**Full regression suite, this session:**
- `npm test` → **985 / 985 passing**, 96 files (up from Stage 3's
  975/95 — 10 new: 4 build-phase-guard tests, 6 import-safety tests).
- `npm run typecheck` → clean.
- `npm run lint` → clean.
- `npm run build` → succeeds, 20 routes, zero `research-output/db/`
  artifacts.
- `npm run audit:questions` → 161 questions, 0 integrity errors.
- `npm run audit:session` → 0 integrity errors.
- `npm run audit:rise-questions` → 1,840 questions, 0 integrity errors.
- `npm run test:e2e` → **23 / 23 passing**.
- `npm run test:e2e:restart` → **1 / 1 passing** (3 consecutive runs
  during development of the readiness-polling fix, all green).
- `npm run verify:build-purity` → **PASSED**, 2/2 runs.

**Nothing excluded, nothing weakened.**

## 7. Research safety confirmation

- Protected files/algorithms untouched: confirmed via
  `git status --porcelain | grep -E "learner-model|selection/adaptive|data/question-bank|protocol/|conditions\.ts|provenance\.ts|phase8/(estimators|simulator|trackA/runTrackA|pipeline/pilot)|tutoring/session/"` →
  no match, before and after this task's changes.
- Historical pilot data confirmed byte-identical before and after every
  build/test run in this session:
  `research-output/phase8/pilot/pilot-report.json` MD5 checked, directory
  listing of `research-output/phase8/{pilot,confirmatory}/` unchanged.
- No `protocol/APPROVAL.md` created; no confirmatory simulation run.
- No git commit made.

## 8. Remaining limitations

- **The original observation's exact mechanism was not replayed** —
  section 1's explanation (an un-redirected manual `tsx` invocation) is
  the best available account given the evidence, not a certainty, because
  the originating session's shell history for that specific command is
  not independently re-verifiable after the fact. This is stated plainly
  rather than claimed as proven.
- **The hardening guard protects exactly one function**
  (`getResearchDb()`) — the only one in this codebase that can create a
  SQLite file. If a future contributor adds a SECOND, independent way to
  open or create the research database (bypassing `db.ts` entirely), this
  guard would not catch it. This is judged acceptable given there is
  currently exactly one such function, by design (Stage 2's architecture),
  and duplicating storage-construction logic was explicitly out of scope
  for this task.
- **`serverRestart.spec.ts` showed timing sensitivity** under this
  session's variable local system load (two failures with different
  symptoms before a fixed-delay readiness check was replaced with active
  HTTP polling); stable across 3 consecutive runs afterward, but this is
  a local sandboxed-environment characteristic of the TEST HARNESS, not
  of the product, and is noted for anyone who sees an occasional flake on
  a heavily loaded machine.

## 9. Files changed

**Modified:**
- `src/research/storage/db.ts` — `assertNotBuildPhase()` guard added to
  `getResearchDb()`; `PHASE_PRODUCTION_BUILD` imported from
  `next/constants`. (Temporary stack-trace instrumentation used during
  investigation was added and fully removed before this change; `git
  diff` confirmed a clean baseline beforehand.)
- `tests-e2e/serverRestart.spec.ts` — replaced a fixed-delay
  server-readiness wait with active HTTP polling (test-harness
  reliability fix, unrelated to the guard itself, found while
  re-verifying Group D).
- `package.json` — new `verify:build-purity` script.

**New:**
- `scripts/verify-build-purity.ts` — the dedicated build-purity
  integration script (Group A).
- `tests/research/storage/importSafety.test.ts` — Group B.
- New `describe` block in `tests/research/storage/db.test.ts` — the
  build-phase-guard unit tests.
- `docs/pre-stage4-build-purity-report.md` (this file).

**Confirmed untouched:** everything on the protected list (section 7);
all Stage 1/2/3 functionality and files not listed above.

## 10. Stage 4 readiness

Unblocked. The required invariant ("a build must never create or mutate
a research database") is now true both by current observation (no
violating code path exists) and by architectural enforcement (any future
violation fails the build immediately rather than writing a stray file),
backed by a regression suite that will catch a reintroduction of the
original symptom even if this report's root-cause reconstruction turns
out to be incomplete. No Stage 1-3 functionality, protected algorithm, or
historical research artifact was modified in this task.

# Stage 2 — Research Persistence, Event Logging, and Phase 6/8 Integration

Status date: 2026-11-02. Builds directly on Stage 1
(`docs/stage1-experimental-validity-report.md`) and the 2026-10-29
read-only system audit (`docs/system-audit/`), specifically Findings
F-03 (no durable session/event persistence) and the per-run half of F-05
(Phase 8's pilot produced only aggregate output, no individually
inspectable per-run record).

Evidence labels used below: **VERIFIED** (an automated test or a command
run in this session confirmed it), **PARTIALLY VERIFIED** (the mechanism
exists and was exercised, but not every variant/edge case was), **NOT
VERIFIED** (implemented but not exercised by a test or a real run in this
session), **NOT IMPLEMENTED** (explicitly out of scope or deferred).

---

## 1. Executive summary

Stage 2 gives the two modern tutoring conditions (C0, non-adaptive on the
RISE bank; C2, adaptive) durable, transactional, restart-surviving
storage, plus a derived append-only research-event log, and extends
Phase 6's existing filesystem artifact/export/replay machinery to cover
both live student sessions and individual Phase 8 Track A/Track B
simulation runs (previously only the aggregate 13,560-run pilot summary
existed). The durable backend is Node's built-in `node:sqlite`
(`DatabaseSync`) — zero new dependencies, synchronous, matching the
existing synchronous session-service code.

No protected file was modified except one: `src/research/phase8/trackB/runTrackB.ts`
gained a single optional, no-op-by-default `onRunComplete` callback
parameter, fired once after all of that function's existing computation
has already finished, purely so a caller can persist the run without
this module re-deriving `config`/`scenario` (which risks drift). A test
(`tests/research/phase8/persistence.test.ts`, "the onRunComplete hook
does not change runTrackBSession's own return value or computation")
confirms the function's return value is byte-identical with and without
the hook. This is flagged explicitly rather than left for the reader to
discover in a diff.

## 2. Previously existing defects addressed

- **F-03 (critical):** both `nonAdaptiveRiseSessionStore` and
  `adaptiveSessionStore` were server-process-lifetime `Map`s. All session
  state and all research-event history were lost on every restart.
  Fixed: both now delegate to `createDurableSessionStore` (SQLite-backed),
  with identical public interfaces, so neither service.ts file needed to
  change its call sites. **VERIFIED** — restart-boundary tests in
  `tests/research/storage/durableSessionStore.test.ts`,
  `tests/tutoring/stage2/nonAdaptiveIndependenceAcrossRestart.test.ts`,
  and the Part 15 acceptance demo (`scripts/stage2-acceptance-demo.ts`)
  all close and reopen the database mid-session and confirm exact
  recovery.
- **F-05 (per-run persistence half):** Phase 8 Track A/Track B runs had
  no individually inspectable durable record, only the pilot's aggregate
  statistics. Fixed for *future* runs via
  `src/research/phase8/persistence.ts` (Track A's own versioned envelope;
  Track B reuses the Phase 5/6 `ExperimentRunArtifact`). The historical
  13,560-run pilot itself is explicitly NOT retrofitted (Part 9.6) — it
  remains a legacy, summary-only artifact. **VERIFIED** for new runs via
  `tests/research/phase8/persistence.test.ts` and the acceptance demo's
  Scenario C.
- **F-05 (independent verifier / stats pipeline):** explicitly NOT
  addressed here — Stage 2's own Part 10.4 scopes a scientific
  independent verifier and statistical-analysis tooling to Stage 4. This
  report's integrity/replay layer (section 9) gives that future verifier
  data interfaces to build on, not a replacement for it.

## 3. Storage architecture

**Backend choice: `node:sqlite` (`DatabaseSync`).** Rationale (full
version in `src/research/storage/db.ts`'s doc comment):
- Ships with Node — no new npm dependency, no native build step.
- Fully synchronous — every session-lifecycle function in
  `nonAdaptiveRiseSession/service.ts` and `adaptiveSession/service.ts` is
  itself synchronous with no `await` between reading and writing a
  session; keeping the store synchronous preserves the "no in-process
  interleaving" property those functions already depend on.
- A single-file transactional store is proportionate to this
  application's actual deployment shape: one local Next.js process, not
  a fleet needing a managed database.

**Known, documented limitation:** SQLite serializes writes at the file
level. This store supports exactly one writing OS process at a time. It
does **not** provide multi-process or distributed exactly-once
guarantees — only correctness within one running server process, which
matches this application's real deployment. This is stated in `db.ts`'s
doc comment, not discovered implicitly.

**Schema (`src/research/storage/db.ts`, schema version 1):**
- `sessions` — one row per session, primary key `(session_id, kind)`
  (`kind` is `'c0'` or `'c2'` — a composite key, not `session_id` alone,
  so the two conditions can never collide or overwrite each other's row
  even if an id were ever accidentally reused; this was caught and fixed
  by a test during this session). The full session envelope
  (`ActiveNonAdaptiveRiseSession` / `ActiveAdaptiveSession`, both
  deliberately plain JSON-serializable wrappers around a Phase 5
  `ExperimentSessionState`) is stored as a JSON blob in `data`; indexed
  columns (`condition_id`, `participant_id`, `status`) exist only for
  querying, never as a second source of truth.
- `research_events` — append-only, `UNIQUE(session_id, kind, event_seq)`
  enforced at the DB layer (duplicate-insertion and ordering guarantees).
- `phase8_runs` / `phase8_batches` — reserved for a future DB-backed
  Phase 8 index; the actual Phase 8 per-run data in this Stage lives as
  filesystem artifacts (section 7), consistent with Phase 6's existing
  design, not in these tables. **NOT IMPLEMENTED**: these two tables are
  created by the migration but nothing currently writes to them — the
  Phase 8 side uses files/manifests instead (see section 7). Flagged
  here rather than left to look wired up.

**Migrations:** `applyMigrations()` is idempotent (checked by test:
reopening an existing DB file duplicates no schema objects, destroys no
rows) and additive-only (`if (currentVersion < N)` blocks); `schema_meta`
records the applied version. **VERIFIED**
(`tests/research/storage/db.test.ts`).

**Transaction boundary:** `durableSessionStore.save()` wraps the session
upsert and every derived event insert in one `BEGIN IMMEDIATE` / `COMMIT`
(rolled back on any error) — one commit boundary per state transition,
per Part 4.2. **VERIFIED** structurally (the code path) and behaviorally
via the restart tests; a literal injected-mid-transaction-crash test was
**NOT** built (would require mocking `node:sqlite` internals) — noted as
a gap rather than claimed.

**Configuration / hygiene:** `RESEARCH_DB_PATH`,
`RESEARCH_SESSION_ARTIFACTS_ROOT`, and `PHASE8_RUNS_ROOT` env vars
control storage location (default: `research-output/db/`,
`research-output/sessions/`, `research-output/phase8/runs/`
respectively — all under the pre-existing gitignored `research-output/`
root, so nothing new needed adding to `.gitignore`). `tests/setup.ts` now
points all three at a per-test-worker temp directory automatically, so
`npm test` never touches the real `research-output/` tree (which also
holds the frozen pilot data) and parallel test workers never contend for
the same SQLite file. **This fix was required** — before it, running the
pre-existing `nonAdaptiveRiseSession`/`adaptiveSession` test suites in
parallel against the (then-shared) default DB path produced genuine
"database is locked" errors; this was a real regression this session
introduced and then fixed, not a pre-existing flake.

## 4. Session persistence (C0 and C2)

Both `src/tutoring/nonAdaptiveRiseSession/store.ts` and
`src/tutoring/adaptiveSession/store.ts` now export
`createDurableSessionStore<T>(kind)` instances instead of
`Map`-backed classes. **No other line in either service.ts file's
session-lifecycle functions (`start*`/`submit*`/`advance*`) needed to
change for Layer A/B to take effect** — they already called
`store.save(session)` at exactly the moments that matter.

**What's persisted:** the entire session envelope, including the full
Phase 5 `ExperimentSessionState` (estimator states, misconception
tallies, every response, every selection trace, every estimator trace) —
nothing is reduced or summarized for storage. The previously-shipped
*client-safe* reduction (`PersistableConceptMasteryState`, Phase G) is
unrelated and unaffected: it still exists solely to decide what crosses
the server/browser boundary, never what's durably stored server-side.

**Resume correctness (Part 6.2):** a session resumed after a real
`closeResearchDb()` + reopen (simulating a process restart, not just a
new in-process object reference) recovers the identical current
question, mastery state, response history, and selection-adapter
wrapping (cross-session `seenQuestionIdsOldestFirst` is itself part of
the stored envelope). **VERIFIED**
(`tests/research/storage/durableSessionStore.test.ts`, the adaptive-side
acceptance-demo Scenario B: `masteryContinuityExactAcrossRestart: true`,
`replayKind: "computational_replay"`, `replayMatches: true`).

**Non-adaptive independence survives persistence (Part 5, the single
most important property of condition C0):** two sessions with identical
seed/config and opposite response patterns remain identical across a
restart boundary. **VERIFIED**
(`tests/tutoring/stage2/nonAdaptiveIndependenceAcrossRestart.test.ts`;
also reproduced live in the acceptance demo:
`performanceIndependenceHolds: true`).

**Cross-session continuity (Part 6.3) — the authority/reconciliation
policy, stated explicitly and tested:**
- *Session* continuity (resuming the same interrupted session id) is now
  durably server-authoritative — the SQLite store is the single source
  of truth for any non-terminated session; the client holds no
  independent copy.
- *Cross-session* continuity (seeding a brand-new session id from a
  prior completed session's mastery/exposure history) remains exactly
  the Phase G client-driven mechanism
  (`src/lib/studentMasteryState.ts`/`studentQuestionHistory.ts`,
  `getPersistableMasteryStates`) — **unchanged** by Stage 2. The two
  mechanisms never compete for the same role: the durable store never
  auto-resumes a prior session's mastery into a new session id on its
  own (**VERIFIED**:
  `tests/tutoring/stage2/crossSessionReconciliation.test.ts`, "starting a
  brand-new session id never auto-inherits...").
- No divergence is possible between the client-facing mastery snapshot
  and the durable record, because both read the exact same underlying
  number: `getPersistableMasteryStates` sanitizes
  `session.experimentState.estimatorStates`, which is the same value
  Layer C's artifact records as `finalEstimatorStates`. **VERIFIED**
  directly, not just asserted by design
  (`tests/tutoring/stage2/crossSessionReconciliation.test.ts`, "the
  client-facing persistable mastery snapshot matches...").

**Stage 3 scope boundary respected:** no Dashboard/Progress/Settings UI
work was done here (Part 6.3's explicit instruction). Any remaining
UI-level inconsistency between the durable store and what a page
displays is Stage 3's concern — see section 11.

## 5. Research-event model

`src/research/storage/eventDerivation.ts` derives events by diffing the
previous and next stored session envelope — a pure function requiring
**zero changes** to either service.ts's call sites, and incapable of
fabricating an event for a transition that didn't happen (there is
nothing to diff against if nothing changed). Event categories actually
emitted, confirmed by test and by the acceptance demo's real event
counts: `session_created`, `question_selected`, `question_presented`,
`answer_submitted`, `answer_graded`, `estimator_updated` (C2 only — never
emitted for C0's null estimator, since its `estimatorStates` never
changes), `selection_decision_recorded`, `session_advanced`,
`session_completed`, `session_aborted` (for `invalid_configuration`/
`unrecoverable_error` terminations specifically).

Every event carries: schema version, a globally unique event id, session
id, condition id, a DB-enforced monotonic per-session sequence number,
event type, the associated question id where applicable, a payload, and
a `provenanceRef` (the run id) a researcher can join back to that
session's eventual Phase 6 artifact. **VERIFIED**: ordering/uniqueness
(`tests/research/storage/durableSessionStore.test.ts`, "Group E"); no
duplicate events on an identical re-save ("Group F"); correct categories
and counts in both the full test suite and the acceptance demo (Scenario
A: 31 events for a 6-question C0 session, hand-verified arithmetic in
code review; Scenario B: 121 events for a 20-question C2 session,
including `estimator_updated` entries carrying real mastery payloads).

**Boundary respected (Part 7.4):** these events live only in the server
's SQLite file — nothing here is exposed through any student-facing
Server Action or route; the existing `toPublicQuestionView`/
`toPublicFeedbackView`/`sanitizeMasteryStatesForClient` boundary (CLAUDE.md
hard constraint 11) is unmodified and unaffected.

## 6. Phase 6 integration

`src/research/storage/completedSessionArtifacts.ts` calls Phase 6's
existing `buildExperimentRunArtifact`/`saveExperimentRunArtifact`
**verbatim** — no reimplementation — the instant a modern session's
`advance*Session` call transitions it to `terminated`. Artifacts land
under `research-output/sessions/{c0,c2}/`, a sibling of (never mixed
into) `research-output/phase8/...` and the CLI's own default
`research-output/runs/` (Part 13's student/synthetic-data separation).
Immutability (Part 8.3) is inherited directly from Phase 6:
`saveExperimentRunArtifact` refuses to overwrite an existing run id; a
duplicate completion attempt is a safe no-op
(`alreadyExisted: true`), never a silent overwrite. **VERIFIED**
(`tests/research/storage/completedSessionArtifacts.test.ts`, all 5
tests, including the explicit idempotent-re-entry case and C0/C2
directory separation).

Existing Phase 6 CSV/JSONL export builders
(`buildQuestionResponseRows`/`buildMasteryTrajectoryRows`/etc.) work
unchanged against these new artifacts, since they're the identical
`ExperimentRunArtifact` type. **VERIFIED** (CSV export round-trip test;
the acceptance demo's Scenario C independently recomputes a mean Brier
score straight from saved Track A records — see section 9).

## 7. Phase 8 integration

**Track B** already executed through the real Phase 5 engine
(`runExperimentToCompletion`), so persisting a Track B run means
building the exact same `ExperimentRunArtifact` type every modern
session uses. `runTrackBSession` gained one optional `onRunComplete`
hook (see section 1's flagged diff); `src/research/phase8/persistence.ts`'s
`saveTrackBRunArtifact` is what a caller passes to it.

**Track A** has no Phase 5 engine involvement at all (it replays raw
estimator adapters directly) — there is no `ExperimentSessionState` to
wrap, so it gets its own versioned envelope, `TrackARunRecord`
(`TRACK_A_RUN_SCHEMA_VERSION = "phase8-track-a-run-v1"`), carrying full
per-step predictions and per-learner metrics plus a content digest, via
the same atomic-write-then-rename pattern Phase 6 already uses.
`runTrackA.ts` itself was **not modified at all**.

**Batch bookkeeping (Part 9.5):** `createBatchManifest`/
`recordBatchRunOutcome`/`loadBatchManifest`/`runStatus` distinguish
planned/completed/failed run ids, idempotently (re-recording the same
outcome for the same run id is a no-op, confirmed by test). A genuinely
interrupted-batch *resume* flow (detecting "not yet started" runs on
restart and re-running only those) was exercised at the bookkeeping
level only — **NOT VERIFIED** end-to-end against a real interrupted
batch (would require killing a process mid-batch, which this session
did not attempt).

**Storage efficiency (Part 9.4):** diagnostic batches in this session
used 1-2 learners per condition specifically so the full
`predictions`/`learnerMetrics` arrays could be written in one shot; the
`TrackARunRecord` doc comment states explicitly that a full-scale run
would need to stream/chunk rather than hold everything in memory first,
the same discipline `pipeline/pilot.ts` already follows for its own
aggregate statistics. **No large-scale Phase 8 run was executed in this
session** — only small, explicitly-diagnostic batches (Part 9.6's
instruction), consistent with "do not run a large-scale experiment
solely to benchmark storage."

**Historical pilot untouched:** `research-output/phase8/pilot/` and
`.../confirmatory/` were read (to locate them) but never written to;
confirmed via `git status`/directory listing before and after this
session's work. New Phase 8 output goes to a distinct path
(`research-output/phase8/runs/`, itself redirected to a disposable temp
directory in every test and in the acceptance demo).

## 8. Metric readiness

- **Brier Score:** Track A's `PredictionRow` already records `pLinkD`
  (the pre-observation-link-calibrated prediction) alongside `correct` —
  both are now durably saved per run. The acceptance demo independently
  recomputed the mean Brier score for estimator `det-a` directly from
  the saved JSON file (not from in-memory values), getting `0.2219` on a
  2-calibration/2-test-learner diagnostic batch — demonstrating the
  saved fields are sufficient, not just structurally present.
- **Questions-to-Mastery:** Track B's `TrackBSessionResult` (`kT`,
  `itemsToCriterion`, `itemsToCriterionCensored`, `stepsAdministered`)
  is unchanged and is exactly what a persisted Track B artifact's
  provenance (`responseSequence`, `questionSelectionSequence`) is
  sufficient to recompute — the learner's starting state (`kStart`) and
  budget-exhaustion/censoring status are both still present in the
  function's own return value, which this stage did not alter.
- **Latent-Mastery RMSE:** Track A's `PredictionRow.pStarTrue`/`mTrue`
  (ground truth) alongside `pStarHat`/estimator raw scores are recorded
  per step per run — durably saved in `TrackARunRecord.predictions`.

No metric formula was touched or reimplemented here; this section only
confirms the already-existing fields survive into durable storage.

## 9. Tests and verification

**Full suite:** `npm test` → **927 passed / 927, 91 files** (command run
in this session; exact output captured). 26 of those tests are new,
across 6 new files
(`tests/research/storage/db.test.ts`,
`tests/research/storage/durableSessionStore.test.ts`,
`tests/research/storage/completedSessionArtifacts.test.ts`,
`tests/research/phase8/persistence.test.ts`,
`tests/tutoring/stage2/nonAdaptiveIndependenceAcrossRestart.test.ts`,
`tests/tutoring/stage2/crossSessionReconciliation.test.ts`).

**Previously-flagged timing-sensitive Phase 8 files** (`bkt.test.ts`,
`pilot.test.ts`, `runTrackA.test.ts`): run individually in this session —
`bkt.test.ts` 6/6 passed (2.48s), `pilot.test.ts` 5/5 passed (19.17s),
`runTrackA.test.ts` 7/7 passed (1.80s). All three also passed inside the
full parallel run this time; no flake was observed in this session, and
no assertion was weakened to achieve that.

**Quality gates**, all run directly in this session, all green:
`npm run typecheck` (clean), `npm run lint` (clean, zero warnings),
`npm run build` (succeeded, 20 routes — identical route count to Stage 1,
confirmed by diffing the printed route list), `npm run audit:questions`
(161 questions, 0 integrity errors), `npm run audit:rise-questions`
(1,840 questions, 0 integrity errors), `npm run audit:session` (0
integrity errors).

**A real regression was found and fixed during this session, not just
avoided:** the `sessions` table's original primary key was `session_id`
alone; a test ("two independently constructed stores for different
'kind' partitions never see each other's sessions, even with the same
session id") caught that a shared id across C0/C2 would silently
overwrite across conditions. Fixed by making the primary key the
composite `(session_id, kind)` before this ever reached a real session
(ids are UUID-prefixed by condition in practice, so this was not
exploitable today, but the schema now enforces the isolation structurally
rather than relying on id-generation convention).

**Build-time false alarm, investigated and resolved:** an early
`npm run build` run appeared to have written real session artifacts into
the project's actual `research-output/` directory. Investigation (file
timestamps, re-running the build with the directory removed) confirmed
this was leftover residue from this session's OWN earlier debugging (a
test run against the shared default DB path, before the
per-test-worker-isolated `tests/setup.ts` fix landed) — **not** a
build-time side effect. A second clean build after removing the stray
files produced no new artifacts, confirming `npm run build` does not
touch `research-output/` at all. The stray files were removed; the
pre-existing `research-output/phase8/pilot/` and `.../confirmatory/`
directories were never touched at any point.

**Part 15 acceptance demonstration** (`scripts/stage2-acceptance-demo.ts`,
executed in this session, disposable temp storage, never the real
`research-output/` tree):

| Scenario | Result |
|---|---|
| A (C0, 6 questions, restarted mid-session) | content digest valid, 31 research events, performance-independence re-check holds |
| B (C2, 20 questions, restarted mid-session) | mastery continuity exact across restart, content digest valid, **computational replay matched exactly**, 121 research events |
| C (Phase 8 diagnostic batch: 1 Track A run, 2 Track B runs) | both Track B runs persisted as valid artifacts, batch manifest shows both completed/none failed, mean Brier for `det-a` independently recomputed from the saved file as `0.2219` |

Totals from that one demo run: 3 sessions created, 152 total research
events recorded. Real, observed numbers — not illustrative placeholders.

## 10. Performance and limitations

- **Concurrency:** correctness relies on (a) SQLite's own write
  serialization and (b) every session-service function being
  synchronous with no `await` between read and write, which this
  session verified is still true for both `nonAdaptiveRiseSession` and
  `adaptiveSession` service files. This gives correct single-process
  behavior; it does **not** give multi-process exactly-once guarantees,
  stated explicitly rather than implied.
- **Storage growth:** every completed session now leaves a durable
  SQLite row plus a JSON artifact file on disk, where the old
  implementation left nothing. For this application's realistic local
  research-study scale this is a non-issue; no retention/pruning policy
  was built (not asked for, and Part 13 explicitly keeps this workspace
  "read-only and aggregate-oriented," not a place to add deletion
  tooling speculatively).
- **Phase 8 at scale:** only diagnostic-scale batches were exercised
  (1-2 learners); the `TrackARunRecord` doc comment is explicit that a
  full-scale run needs a streaming/chunked write path this
  implementation does not provide.
- **`phase8_runs`/`phase8_batches` SQL tables** exist in the schema but
  are currently unused (section 3) — Phase 8 persistence is file-based,
  matching Phase 6's existing design. Flagged as dead schema rather than
  silently left in place.
- **Interrupted-batch resume** is implemented at the bookkeeping layer
  (`loadBatchManifest`/`runStatus`) but was not exercised against an
  actually-killed process in this session (see section 7).
- **Part 10.3's integrity-validator list** is covered by the pre-existing
  `verifyArtifactIntegrity` (schema version, content digest, bank hash,
  curriculum hash, software version) plus this stage's own duplicate-run
  refusal and DB-level ordering/uniqueness constraints. Several named
  bullets in that list (a dedicated "unknown question id" validator, a
  cross-artifact manifest-consistency checker beyond what
  `buildManifestFromArtifacts` already enforces) do **not** exist as
  separate functions — this is a real, acknowledged gap, not claimed as
  done.

## 11. Stage 3 handoff

- The non-adaptive condition's UI (`/practice`) still does not expose
  chapter selection for C0 even though the backend has supported it
  since Stage 1 — unchanged by Stage 2, still Stage 3's to pick up.
- No Dashboard/Progress/Settings page was taught to read the new durable
  store or its event log directly (Part 6.3's explicit scope boundary).
  A future Stage 3 UI could use `nonAdaptiveRiseSessionStore.listCompleted()`
  / `adaptiveSessionStore.listCompleted()` directly, or the
  `research-cli.ts sessions list` output, as a starting point.
- No `/dev/*` diagnostic viewer exists yet for inspecting durable session
  history the way `/dev/session`/`/dev/adaptive-session` show live
  in-memory state — a natural, small Stage 3 addition now that the data
  actually persists.

## 12. Stage 4 handoff

- An independent scientific verifier (Part 10.4) is explicitly not
  implemented — this stage's integrity/replay layer gives it data
  interfaces (`verifyArtifactIntegrity`, `replayFromArtifact`, the new
  `TrackARunRecord`/batch manifest) to build on, not a substitute for it.
- No statistical-analysis pipeline, no confirmatory execution, and no
  `protocol/APPROVAL.md` were created or touched, per the explicit
  research safeguards in Part 2 of the Stage 2 prompt.
- A true interrupted-batch-resume demonstration (killing a real process
  mid-batch and recovering) remains for whoever picks up Phase 8
  execution at scale.

## 13. Files changed

**New:**
- `src/research/storage/db.ts`, `types.ts`, `eventDerivation.ts`,
  `durableSessionStore.ts`, `completedSessionArtifacts.ts`
- `src/research/phase8/persistence.ts`
- `scripts/stage2-acceptance-demo.ts`
- `tests/research/storage/db.test.ts`,
  `durableSessionStore.test.ts`, `completedSessionArtifacts.test.ts`
- `tests/research/phase8/persistence.test.ts`
- `tests/tutoring/stage2/nonAdaptiveIndependenceAcrossRestart.test.ts`,
  `crossSessionReconciliation.test.ts`
- `docs/stage2-research-persistence-report.md` (this file)

**Modified:**
- `src/tutoring/nonAdaptiveRiseSession/store.ts`,
  `src/tutoring/adaptiveSession/store.ts` — swapped `Map` for the new
  durable store (same public interface).
- `src/tutoring/nonAdaptiveRiseSession/service.ts`,
  `src/tutoring/adaptiveSession/service.ts` — one additive call each
  (`persistCompletedSessionArtifact`) at the moment a session completes.
- `src/research/phase8/trackB/runTrackB.ts` — one additive, optional,
  no-op-by-default `onRunComplete` hook (see section 1).
- `scripts/research-cli.ts` — new `sessions`/`phase8`/`integrity`
  subcommands, reusing existing Phase 6 inspection functions.
- `tests/setup.ts` — redirects the durable DB and filesystem artifact
  roots to a per-test-worker temp directory (required fix; see section
  3/9).
- `CLAUDE.md` — new Stage 2 entry and a `research:cli` line in Commands.

**Confirmed untouched** (via `git status` before and after, and by
direct inspection): `src/domain/learner-model/`,
`src/tutoring/selection/adaptive/`, `data/question-bank/`, `protocol/`,
`src/research/experiment/conditions.ts`,
`src/research/experiment/provenance.ts`,
`src/research/phase8/estimators/`, `src/research/phase8/simulator/`,
`src/research/phase8/trackA/runTrackA.ts`,
`src/research/phase8/pipeline/pilot.ts`, the legacy 161-question bank,
`src/tutoring/session/`, and the `/tutor` route.

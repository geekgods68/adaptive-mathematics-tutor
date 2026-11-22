# System Status Report

See [`AUDIT_INDEX.md`](AUDIT_INDEX.md) for the evidence-level legend and audit scope/limitations.

## Executive summary

This repository hosts two distinct, overlapping bodies of work under one `CLAUDE.md`-documented phase history:

1. **A participant-facing product**: two working, locally-runnable tutoring experiences — `/tutor` (non-adaptive, fixed 35-question sequence over a 161-question, quadratics-only bank) and an adaptive experience reachable through **two separate routes**, `/adaptive-tutor` and `/practice` (adaptive mode), both over a much larger 1,840-question, 14-chapter general-secondary-mathematics bank ("RISE"). A new Student Workspace (Dashboard, Practice, Assessments, My Progress, Session History, Settings) and a read-only Researcher Workspace (Research Overview, Experiment Designer, Model Comparisons, Results & Analytics, Simulation Runs, Reproducibility) wrap these with a shared shell, client-side (localStorage) persistence, and a light/dark theme. **SOURCE VERIFIED.**
2. **A computational research pipeline (Phase 5-8)**: a headless experiment engine that can run deterministic-estimator and (per its own pilot run) Bayesian-Knowledge-Tracing baselines against simulated learners, with a pilot run already executed (13,560 runs, 0 failures) and a confirmatory run structurally blocked pending an author-written `protocol/APPROVAL.md` that does not exist. **SOURCE VERIFIED + RUNTIME VERIFIED** (via the live Research Overview/Reproducibility pages' own on-disk checks, confirmed independently in this audit).

At the moment of this audit, the working tree also contains an uncommitted fix for a real, previously-diagnosed bug: every new adaptive session used to cold-start with zero prior mastery and zero exposure history, so a student completing one session and starting another always saw the identical first question. The fix is real, tested, and effective — but it is applied to only one of the two routes that can start an adaptive session (see Finding F-01), and it introduces a new, unresolved client-side data-consistency gap (Finding F-04).

**Overall assessment:** both halves of this repository are substantially more complete and more carefully engineered than a typical early-stage research prototype — extensive decision-trace logging, a hard, structurally-enforced boundary between the two tutoring conditions (CLAUDE.md constraint 4), a hard, structurally-enforced client/server research-metadata boundary (constraint 11), and an unusually thorough test suite (843 tests, all passing in a clean run during this audit) back that up. The most serious issue found is not a bug in any one function; it is that **the product's two tutoring conditions no longer share a question bank, curriculum, or session-logging schema**, which the project's own research design document says they must, for the comparison the whole repository exists to support.

## What is genuinely working (TEST VERIFIED / SOURCE VERIFIED, this audit)

- The non-adaptive `/tutor` flow: start → present → submit → deterministic grade → feedback → advance → complete, logging a `ResearchEvent` at every step, with the question sequence structurally incapable of reading performance data (`NonAdaptiveSelectionContext` has no field that could carry it — `src/tutoring/selection/nonAdaptive/types.ts:9-15`). Backed directly by `tests/tutoring/session/performanceIndependence.test.ts`, which this audit re-ran and confirmed passing.
- The adaptive engine itself (Phase 3 mastery formula + Phase 4 selection policy): a fully deterministic, well-traced, prerequisite-aware, misconception-aware question-selection pipeline. Every decision it makes is reconstructable from its own trace object, by design (`AdaptiveSelectionTrace`, `MasteryUpdateTrace`).
- The client/server research-metadata boundary (constraint 11): verified by direct source reading of `toPublicQuestionView`/`toPublicAdaptiveQuestionView`/the new `sanitizeMasteryStatesForClient` — none of them include `misconceptionId`, `derivationNote`, `difficulty`, `conceptIds`, or a pre-submission correct answer.
- The question-bank and study-sequence quality gates: `npm run audit:questions` and `npm run audit:session` both report zero integrity errors against the live 161-question bank and the 35-question study sequence, re-run during this audit.
- The full automated test suite: 843 tests across 78 files, all passing in one clean run during this audit (`npm test`), alongside a clean `typecheck`, `lint`, and `build`.
- The new session-continuity fix, at the engine layer: directly confirmed, during this audit, by invoking `startAdaptiveSession`/`getPersistableMasteryStates` from a disposable script — a second session seeded with a first session's persisted state opens on a genuinely unseen question and starts from the exact persisted mastery value, while an un-seeded cold start still reproduces the original bug (proving the fix is additive, not a hidden behavior change for new students).

## What is incomplete, unverified, or inconsistent

- **The continuity fix does not cover `/adaptive-tutor`** — a separate, still-reachable page that shares the same session cookie and store as `/practice`. See F-01.
- **The adaptive and non-adaptive conditions use disjoint question banks and curricula**, contradicting `docs/research-design.md`'s own "share the same question bank... session structure" statement. See F-02.
- **No persistent storage exists on the server for either condition.** A server restart loses every session and every non-adaptive `ResearchEvent` that was not already exported. See F-03.
- **The new client-side mastery-continuity store is not reconciled with the pre-existing session-history store**, and the Settings page's "clear history" control only clears one of the two (plus a third, newer seen-question-history key is cleared by neither). See F-04.
- **The Phase 8 confirmatory experiment cannot run** (no approval file), and several of its own stated downstream pieces (independent verifier, statistical-analysis script, per-run persistence) are not implemented. See F-05 and `RESEARCH_PIPELINE_STATUS.md`.
- **No automated test exercises the continuity fix's actual client-side wiring** (`PracticeClient.tsx` reading/writing `localStorage` around a session) — only the pure storage modules and the server-side engine are covered. See F-11.
- **Two parallel, independently-maintained navigation shells coexist**: the new `AppShell` (Student/Researcher workspace, sidebar, theme toggle) wraps the new Workspace pages, while the older `NavHeader` wraps `/tutor`, `/adaptive-tutor`, `/dev/session`, `/dev/adaptive-session`. See F-08.
- **Two student-facing routes present the same "adaptive practice" capability with diverging feature sets** (`/practice` records history and now benefits from continuity; `/adaptive-tutor` does neither). See F-01, F-09.

## The five most consequential findings

See `AUDIT_INDEX.md`'s summary table and `FINDINGS_REGISTER.md` for full detail, evidence, and severity. In order: F-02 (disjoint question banks undermines the core research comparison), F-01 (continuity fix incomplete across routes), F-03 (no server persistence for either condition), F-04 (new client mastery store not reconciled with the old one, inconsistent clearing), F-05 (confirmatory research pipeline blocked, with real downstream gaps beyond just the missing approval file).

## Does the UI accurately represent the adaptive engine?

Mostly yes, with one caveat. The plain-language selection explanations (`src/tutoring/adaptiveSession/explanations.ts`) are generated directly from the real `AdaptiveSelectionTrace.reason` enum the engine actually computed — never a separate, hand-authored guess — which is a strong, verifiable honesty property. The one caveat (detailed in `ADAPTIVE_ENGINE_DIAGNOSTICS.md` §A): the "Moving to a harder question after consistent success" message is a function of the *currently targeted concept's* absolute evidence/difficulty state, not a comparison against the difficulty of the question the student was just shown — so it can display on consecutive questions at the *same* difficulty, which a student would not recognize as "moving to a harder question."

## Is the research pipeline executable end to end?

**Partially.** A pilot-scale run of Track A (predictive accuracy) and Track B (sequencing value) across the deterministic estimator and a fitted BKT baseline executes successfully today (13,560 runs, 0 failures, confirmed via the committed pilot report and the live Research Overview page's own disk checks). A **confirmatory** run — the actual hypothesis-tested comparison the protocol is designed to produce — cannot execute: `protocol/APPROVAL.md` does not exist (confirmed: `ls protocol/` shows only `AMENDMENTS.md` and `phase8-protocol-v2.md`), and the pipeline's own execution layer reportedly enforces this as a hard block, not merely a disabled UI button (per the Experiment Designer page's own description of `src/research/phase8/pipeline/`; this audit did not independently trace that specific enforcement code path — see `OPEN_QUESTIONS.md`). Beyond the approval gate, the Research Overview page itself (computed live from disk, not a hardcoded claim) reports the independent verifier, `analysis/stats.py`, and full per-run persistence as not implemented.

## Remaining diagnostics this audit could not complete

- Any claim requiring a live browser (visual rendering, console errors, actual click-through) — no browser-automation tool was available to this audit.
- Independent confirmation that the Phase 8 pipeline's confirmatory-execution block is enforced in code rather than only by the absence of input data — this audit read the describing UI copy and confirmed the missing file, but did not trace every code path in `src/research/phase8/pipeline/`.
- Exact reproduction of the specific 20-question demonstration session referenced in the task brief — no log or fixture of that session was available to replay.

See `TEST_AND_RUNTIME_VERIFICATION.md` for the complete diagnostic record and `OPEN_QUESTIONS.md` for the full list of unresolved questions.

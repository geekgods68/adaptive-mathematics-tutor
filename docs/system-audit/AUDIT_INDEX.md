# System Audit — Index

**Audit date:** 2026-10-29
**Audit type:** Read-only, evidence-based technical and functional audit. No application or research source code was modified to produce this audit.
**Repository:** `/Users/advikpunugu/Desktop/non-adaptive-tutor` (git branch `master`, working tree includes an uncommitted, in-progress session-continuity fix — see below)

## How to read this audit

Every non-trivial claim in these documents is tagged with one of six evidence levels, per the audit's own evidence standard:

- **SOURCE VERIFIED** — directly supported by inspected code, with file/line citation.
- **TEST VERIFIED** — supported by an automated test that was actually executed during this audit.
- **RUNTIME VERIFIED** — observed by actually running something (a script, a diagnostic command) during this audit.
- **DOCUMENTED INTENT** — stated in project documentation (CLAUDE.md, `docs/`), not independently re-verified against current source for this specific claim.
- **HYPOTHESIS** — a plausible explanation that would require further evidence (session logs, a controlled replay) to confirm.
- **UNKNOWN** — insufficient evidence was available to this audit to determine.

**Important scope note on "RUNTIME VERIFIED" in this audit:** this audit did not have access to a browser-automation tool. No claim in these documents is based on actually loading a page in a browser during this audit. Every claim about UI behavior is SOURCE VERIFIED (read from the component/action/service code) or, where noted, verified by directly invoking the underlying service functions from a disposable script (documented explicitly where that happened). Claims that would require a real browser session to confirm (e.g., "the completion screen renders without a console error") are marked UNKNOWN or DOCUMENTED INTENT (carried over from a prior phase's own browser verification, cited by phase name) rather than asserted as directly observed in this audit.

## A critical piece of context for every document below

At the moment this audit was performed, the working tree contains a real, substantial, **uncommitted** change: a session-continuity fix for a genuine bug (every new adaptive session cold-starting with identical first questions). It touches `src/tutoring/adaptiveSession/service.ts`, `types.ts`, two new files (`masteryStateTransfer.ts`, `studentSelectionAdapter.ts`), two new client-storage modules (`src/lib/studentMasteryState.ts`, `src/lib/studentQuestionHistory.ts`), `src/app/adaptive-tutor/actions.ts`/`actionTypes.ts`, and `src/app/practice/PracticeClient.tsx`, plus new tests. This audit evaluates the repository **as it currently sits on disk**, fix included — it does not evaluate a hypothetical "before the fix" or "after a future commit" state. Where the fix is incomplete or inconsistently applied (and it is, in a specific, well-evidenced way — see Finding F-01), this audit says so plainly.

## The ten audit documents

1. [`SYSTEM_STATUS_REPORT.md`](SYSTEM_STATUS_REPORT.md) — Executive summary: overall health, what works, what doesn't, principal findings.
2. [`ARCHITECTURE_AND_DATA_FLOW.md`](ARCHITECTURE_AND_DATA_FLOW.md) — Full architecture, Mermaid diagrams, module map, session lifecycle, determinism inventory.
3. [`UI_UX_FUNCTIONAL_INVENTORY.md`](UI_UX_FUNCTIONAL_INVENTORY.md) — Page-by-page and component-by-component inventory, design-system audit.
4. [`ADAPTIVE_ENGINE_DIAGNOSTICS.md`](ADAPTIVE_ENGINE_DIAGNOSTICS.md) — Exact mastery formula, selection algorithm, the two observed-message investigations (A/B), the question-sequence investigation (C), answer-quality investigation (D).
5. [`SESSION_STATE_AND_PERSISTENCE.md`](SESSION_STATE_AND_PERSISTENCE.md) — What state lives where, what survives what, the client/server research-metadata boundary, and the continuity fix's own data-integrity gaps.
6. [`RESEARCH_PIPELINE_STATUS.md`](RESEARCH_PIPELINE_STATUS.md) — Phase-by-phase computational research-pipeline status, what can and cannot execute end to end today.
7. [`TEST_AND_RUNTIME_VERIFICATION.md`](TEST_AND_RUNTIME_VERIFICATION.md) — Every diagnostic command run for this audit, its exact output, and what it does/doesn't prove.
8. [`FINDINGS_REGISTER.md`](FINDINGS_REGISTER.md) — Numbered findings (F-01 .. F-20), classified and ranked.
9. [`OPEN_QUESTIONS.md`](OPEN_QUESTIONS.md) — Questions this audit could not resolve from available evidence.
10. [`AUDIT_INDEX.md`](AUDIT_INDEX.md) — This file.

## The five most consequential findings (full detail in `FINDINGS_REGISTER.md`)

| ID | One-line summary | Evidence |
|---|---|---|
| F-02 | The adaptive and non-adaptive conditions run on two entirely different question banks/curricula (161-Q quadratics-only vs. 1,840-Q/14-chapter general secondary maths), contradicting the project's own stated research design ("two conditions share the same question bank... session structure"). | SOURCE VERIFIED |
| F-01 | The session-continuity fix just implemented is applied to `/practice` only; the separate, still-live `/adaptive-tutor` page shares the same session cookie/store but was not updated, so it still reproduces the original cold-start/repeated-question bug. | SOURCE VERIFIED |
| F-03 | Neither session store, nor the non-adaptive condition's entire `ResearchEvent` log, is persisted beyond the running server process — a server restart silently discards every in-progress and completed-but-unexported session for both conditions. | SOURCE VERIFIED |
| F-04 | Two independent, non-atomic client-side "current mastery" stores now exist (`rise-student-history-v1`'s per-session snapshots, which feed the Dashboard/Progress UI, and `rise-student-mastery-state-v1`, which actually seeds the next live session) — and Settings' "Clear all local session history" clears only the first, leaving the second (and the seen-question history) silently in place. | SOURCE VERIFIED |
| F-05 | The 8C confirmatory experiment is structurally blocked (no `protocol/APPROVAL.md`), and several pieces the protocol's own analysis depends on (independent verifier, `analysis/stats.py`, per-run persistence) are not implemented — the research pipeline can run a pilot end to end but cannot yet run or analyze a confirmatory study. | SOURCE VERIFIED + RUNTIME VERIFIED |

## Diagnostics this audit ran (all read-only; full output in `TEST_AND_RUNTIME_VERIFICATION.md`)

`npm test` (843/843 passed, one clean run), `npm run typecheck` (clean), `npm run lint` (clean), `npm run audit:questions` (0 integrity errors), `npm run audit:session` (0 integrity errors), `npm run build` (clean, 20 routes). A disposable, non-committed script directly exercising `src/tutoring/adaptiveSession/service.ts`'s real exported functions was also run to confirm the continuity fix's effect at the engine layer (see `TEST_AND_RUNTIME_VERIFICATION.md` for the exact script and output); it was deleted immediately after and nothing was written to the repository by it beyond what is already recorded there.

## What this audit did not do (and why)

- **No browser automation.** This session has no browser tool available. Nothing was clicked, typed, or visually inspected in a live browser. Prior phases' own browser verification (Playwright, per CLAUDE.md/`docs/tutor-flow.md`/`docs/research-decisions.md` RD-0008) is cited as DOCUMENTED INTENT where relevant, never re-asserted as freshly observed.
- **No Phase 8 confirmatory or large-scale pilot re-run.** Re-running the pilot pipeline would write into `research-output/phase8/` and `docs/phase8/`, both outside this audit's authorized write scope, and a confirmatory run is explicitly blocked and out of scope regardless. The existing, already-committed pilot report (`docs/phase8/pilot-report-2026-10-27.json`, mirrored at `research-output/phase8/pilot/pilot-report.json`) was read, not regenerated.
- **No exact reproduction of the reported 20-question demonstration session.** No session log, fixture, or replay of that specific session was available. Section 5C of `ADAPTIVE_ENGINE_DIAGNOSTICS.md` explains the mechanism that plausibly produced the reported question order, explicitly labeled HYPOTHESIS, not a confirmed reproduction.

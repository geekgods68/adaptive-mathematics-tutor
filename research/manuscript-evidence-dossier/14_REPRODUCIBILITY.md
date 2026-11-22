# 14. Reproducibility Audit

## Three distinct, non-equivalent guarantees — which ones actually hold here

1. **Deterministic replay of stored artifacts** (re-running analysis over already-stored raw data to confirm the same summary numbers come out): **plausible, not independently executed in this pass.** The pipeline (`src/research/phase8/pipeline/threeMetricPilot.ts` → stats JSON) exists and is unit-tested per the prior stage's report, but this audit did not re-run the full stats-generation script from the raw pilot JSON to confirm byte-identical output — only read the already-generated stats files.
2. **Reproduction from an archived environment** (re-running the simulation from seeds/config to regenerate the same pilot from scratch): **not attempted in this audit** (explicitly out of scope — this is a read-only audit, and re-running the 13,560-run pilot would not be a "safe read-only inspection command" in spirit even though technically it wouldn't mutate protected files — this audit chose not to run it, consistent with the task's instruction not to run new experimental batches). Seeds and configuration are present in the artifacts (`sourceArtifact`, world/slice fields) but full regeneration was not verified end-to-end here.
3. **Independent reimplementation** of the mastery formula, metrics, or simulators from the paper's eventual mathematical description alone (without this repository): **not attempted and not possible to claim** — this would require a second, independent codebase, which does not exist.

**These are not equivalent, and the manuscript should not conflate them.** The strongest claim currently supportable is (1) at the "plausible, consistent with unit tests" level — not "verified by this audit's own re-execution."

## Runtime requirements (VERIFIED — SOURCE, `package.json`/repo conventions, not fully re-derived)

Node.js with `node:sqlite` (experimental feature flag warning observed directly when running `npx vitest run` this session — VERIFIED — RUNTIME), npm scripts (`audit:rise-questions`, `test`, etc.) confirmed to exist and run successfully this session.

## What this audit itself re-ran (full command list, all read-only, all successful)

- `npx vitest run` → 97 files / 1015 tests, all passing.
- `npm run audit:rise-questions` → 1840/109/68, 0 structural errors.
- `git log`, `git show`, `git diff`, `git status` — multiple targeted invocations, no writes.
- `find`, `grep`, direct JSON reads via `python3 -c` — all read-only.

## Known missing requirements for full reproducibility

- No evidence inspected of a pinned lockfile/environment snapshot specifically tied to the 2026-10-27 or 2026-11-04 pilot runs beyond the general repository `package-lock.json` (which itself shows as modified in `git status`, meaning the exact dependency set at pilot-run time is not unambiguously pinned by a frozen commit).
- The repository's working tree is **not clean** (`git status` shows dozens of modified/untracked files) — per the task's own instruction, this is recorded as a limitation rather than glossed over: a reviewer could not check out a single commit hash and get byte-identical results today; they would need the exact uncommitted working-tree state, which is not itself versioned.

## Reproducibility checklist for a future confirmatory run

- [ ] `protocol/APPROVAL.md` created with genuine authorization (not by this audit).
- [ ] Working tree committed to a tagged, reproducible state before the confirmatory run.
- [ ] World count increased per the protocol's own 20-92 table, or the affected comparisons explicitly narrowed/demoted (file 07/10).
- [ ] Amendment A2 (or an equivalent) formally approved before any QTM/Brier/RMSE result is reported as confirmatory.

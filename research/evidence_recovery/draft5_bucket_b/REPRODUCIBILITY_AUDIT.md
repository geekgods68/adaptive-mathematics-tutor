# Reproducibility Audit — B22

## Provenance consolidation (VERIFIED-ARTIFACT)

| Item | Value |
|---|---|
| Last commit touching Phase 8 pipeline code | `bde783a` "phase8b: execute the authorized 8C-Pilot, save results" |
| Current HEAD (this pass) | `bde783ae9069f4a2457acae63414105067034456` (unchanged across all three audit passes this session) |
| Working tree | Dirty (uncommitted Stage 2/3/4 work); the three-metric pilot's own pipeline code (`threeMetricPilot.ts`, `metrics/`) is itself uncommitted — no single commit reproduces that artifact from a clean checkout |
| `pilot-report.json` SHA-256 | `7387764b3a979fd4ed82a4d2438c1382f672d890fef9131792f033d81c323403` (unchanged since first checked; re-verified again this pass) |
| `three-metric-pilot-report.json` SHA-256 | `d94c39bbba9b69536dd065fcab900c2d38948b9e0bc61ac29c88033eb91642a3` (unchanged, re-verified) |
| `package-lock.json` SHA-256 | `fbef10aa44955bd8e53611971ec1924307664ec15b4bf3b497caa4e24a435898` |
| Node runtime | v24.2.0 |
| `protocol/APPROVAL.md` | Does not exist (re-confirmed this pass; not created) |
| masterSeed | literal `"RISE-PHASE8-v2"` (unchanged across both historical pilots and all three retrospective artifacts) |

## "97 test files, 1015 tests" — the caveat the coordinator specifically asked to be stated explicitly

Running `npm test` **today, on the current dirty working tree**, passes 97 files / 1015 tests. **This does NOT prove what passed during the actual Oct 27 / Nov 4 pilot executions**, because:
1. The working tree has changed substantially since `bde783a` (94+ modified/untracked paths at last `git status`), including files the pilot pipeline itself depends on indirectly.
2. Neither historical pilot run recorded its own test-suite pass/fail status as part of its artifact — `pilot-report.json`/`three-metric-pilot-report.json` contain no test-result field at all.
3. The only thing actually tying "tests pass" to "the pilot's own numbers are trustworthy" is this session's own **deterministic replay** (Phase 2 pass): re-running the exact 60 Track-A contexts and getting a 0-diff match against the stored det-A/BKT-fit numbers. That is evidence the *current* code reproduces the *stored* numbers — not evidence about what the test suite reported on Oct 27 itself (no historical CI log or test-run artifact survives from that date).

**Stated plainly, as instructed: today's 1015/1015 is evidence the CURRENT code is internally consistent and (via replay) reproduces the historical numbers — it is NOT a claim about the test suite's state on 2026-10-27 or 2026-11-04, which cannot be reconstructed because no test-run record from those dates was persisted.**

## Reproducibility matrix (does not overclaim re-execution/reimplementation where only replay/verification exists)

| Claim | Source verification | Artifact replay | Re-execution (new run, same code) | Independent reimplementation |
|---|---|---|---|---|
| 8C-Pilot aggregate K(T)/log loss/MAE numbers | ✓ (code read) | ✓ (det-A/BKT-fit replayed to 0-diff, Phase 2 pass) | — not performed | — not performed |
| Three-metric pilot Brier/RMSE/QTM numbers | ✓ | ✓ (recomputed from stored arrays, Phase 2 pass) | — | — |
| S4-GF K(T)/QTM p-values | ✓ (test used identified) | ✓ (recomputed from raw per-world arrays, this pass) | — | — |
| C1 Track-B cell | ✓ | n/a (never existed to replay) | **✓** (genuinely new execution, retrospective, labeled, Phase 2 pass) | — |
| det-B Track-A metrics | ✓ | **✓** (deterministic replay of already-executed contexts, Phase 2 pass) | — | — |
| Question-bank structural counts (1,840/109/68/204/64/difficulty histogram) | ✓ | ✓ (live script re-run this pass, `npm run audit:rise-questions`) | — | — |
| B06 graph Jaccard | ✓ (code read) | n/a (never computed before) | **✓** (genuinely new, static, deterministic computation, this pass) | — |
| Adaptive selector thresholds (0.75/0.35/etc.) | ✓ | n/a | — | — |

**No cell in this matrix claims "independent reimplementation"** (a from-scratch rebuild by a party with no access to the original code) — none was performed or claimed, consistent with the instruction not to claim re-execution or reimplementation where only source verification/replay exists.

## Schema/manifest/lockfile checks

No `environment.json`, `runs.jsonl.gz`, or per-run manifest exists for either historical pilot (same finding as the separate Phase 8 dashboard audit conducted earlier this session — `src/research/phase8/persistence.ts`'s real, tested run-record machinery was never invoked for either historical pilot run). This is a genuine C11-style gap, already documented in that audit, re-confirmed here rather than re-investigated from scratch.

# 01. Evidence Index

Navigable map from claim → source. Evidence hierarchy used (highest to lowest): (1) artifacts/execution logs, (2) source code, (3) config/manifests, (4) protocol documents, (5) internal reports, (6) project notes, (7) prior conversational descriptions (lowest, never authoritative alone).

| Claim area | Primary evidence | Path | Label |
|---|---|---|---|
| Question bank scale (1840/109/68/204) | Fresh audit run + CSV line count | `scripts/audit-rise-questions.ts` output; `data/question-bank/prerequisite-edges-v1.csv` | VERIFIED — ARTIFACT |
| Mastery update equations | Source | `src/domain/learner-model/updateMastery.ts` | VERIFIED — SOURCE |
| Mastery parameters (α=0.12, β=0.10, w_h=0.6, M₀=0.5) | Source | `src/domain/learner-model/parameters.ts` | VERIFIED — SOURCE |
| Four conditions C0-C3 definitions | Source | `src/research/experiment/conditions.ts` | VERIFIED — SOURCE |
| K(T) primary-endpoint status | Protocol | `protocol/phase8-protocol-v2.md` lines 191, 530, 902 | PROTOCOL REGISTERED |
| itemsToCriterion already protocol-registered (secondary) | Protocol | `protocol/phase8-protocol-v2.md` line 1770 | PROTOCOL REGISTERED |
| Brier score already protocol-named (secondary) | Protocol | `protocol/phase8-protocol-v2.md` lines 1065, 1741 | PROTOCOL REGISTERED |
| RMSE not in protocol | Absence check | `grep -i RMSE protocol/phase8-protocol-v2.md` → no hits | VERIFIED — SOURCE (absence) |
| S4-GF K(T) numbers | Artifact | `research-output/phase8/final/pilot_descriptive_stats.json` → `trackB["S4-GF"]` | VERIFIED — ARTIFACT |
| S4-GF QTM numbers | Artifact | `research-output/phase8/final/three_metric_pilot_stats.json` → `questionsToMastery["S4-GF"]` | VERIFIED — ARTIFACT |
| "QTM in research-design.md from day one" — FALSE as stated | Git history | `git show HEAD:docs/research-design.md` (100 lines, no metric text) vs. working copy (189 lines, "Stage 1 update 2026-10-31" block) | CONFLICT (resolved: claim not supported) |
| `protocol/APPROVAL.md` does not exist | Filesystem | `ls protocol/APPROVAL.md` → ENOENT | VERIFIED — ARTIFACT |
| No confirmatory run exists | Filesystem | `research-output/phase8/confirmatory/` empty | VERIFIED — ARTIFACT |
| Three-metric pilot reuses same 5 worlds as original pilot | Artifact | both JSON files' `slicesUsed`/world structure identical (CH07/CH03/CH10, 5 worlds) | VERIFIED — ARTIFACT |
| Statistical method (paired t-test, world-level, n=5, df=4, uncorrected) | Source | `src/research/phase8/metrics/threeMetrics.ts` (`pairedTTest`, `studentTTwoSidedP`) | VERIFIED — SOURCE |
| Full test suite passes (1015/1015) | Execution | `npx vitest run`, re-run by this audit | VERIFIED — REPLAY |
| Simulator families S1-S4 and cited precedents | Source comments | `src/research/phase8/simulator/{s1,s2,s3,s4}.ts` headers | VERIFIED — SOURCE (citations not externally re-verified — see file 14) |
| No protected file modified by this audit | Git | `git status`/`git diff` before and after, this session | VERIFIED — ARTIFACT |

## Scope limitation of this audit (stated honestly, per task's own evidence-discipline requirement)

This was a single, time-boxed, read-only pass. The items above received direct, independent verification. Several Part 3/6/7/9 sub-requirements of the originating task (full layer-by-layer architecture trace, every parameter of every selection-policy branch, full simulator transition-equation derivation, exhaustive negative/null-result inventory) are documented in the files below at a level supported by targeted source reads rather than an exhaustive line-by-line re-implementation check. Where this audit's confidence is lower than "fully independently re-derived," the relevant file says so explicitly rather than implying completeness it doesn't have.

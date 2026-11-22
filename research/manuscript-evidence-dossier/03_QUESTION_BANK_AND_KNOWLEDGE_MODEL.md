# 03. Question Bank and Knowledge Model

All counts below were produced by a **fresh execution** of `npm run audit:rise-questions` during this audit (not copied from a prior report). VERIFIED — ARTIFACT throughout this section unless noted.

## Scale

| Quantity | Value |
|---|---|
| Total questions | 1,840 |
| Concepts | 109 (109/109 covered by at least one question) |
| Misconceptions | 68 (68/68 represented) |
| Prerequisite edges | 204 (`data/question-bank/prerequisite-edges-v1.csv`, 205 lines − 1 header) |
| Chapters | 14 |
| Average options per question | 4.00 |
| Questions with multiple concepts (`conceptWeights`) | 64 / 1840 |

## Per-chapter counts

| Chapter | Questions |
|---|---|
| ch01_algebra | 150 |
| ch02_functions | 140 |
| ch03_exponents | 100 |
| ch04_logarithms | 100 |
| ch05_differentiation | 150 |
| ch06_integration | 140 |
| ch07_geometry | 150 |
| ch08_trigonometry | 150 |
| ch09_vectors | 120 |
| ch10_probability | 140 |
| ch11_statistics | 140 |
| ch12_proofs_and_logic | 130 |
| ch13_permutations_and_combinations | 100 |
| ch14_complex_numbers | 130 |

## Difficulty distribution

| Level | Count | % |
|---|---|---|
| L1 | 283 | 15.4% |
| L2 | 448 | 24.3% |
| L3 | 548 | 29.8% |
| L4 | 373 | 20.3% |
| L5 | 188 | 10.2% |

## Validation status (VERIFIED — ARTIFACT, this run)

- Confirmed structural errors (duplicate stems, category 1): **0**
- Confirmed mathematical errors: **NOT CHECKED** — the audit script's own output states: *"no deterministic per-family arithmetic verifier exists for RISE."* This is a self-disclosed limitation of the tooling, not a pass/fail result.
- Content correctness / independent human or pedagogical review: **self-reported as NOT performed**, per `data/question-bank/README.md` (cited by the audit script's own provenance banner: *"externally generated; independent human review and empirical validation both self-reported as NOT performed"*).
- Duplicate option-display-set groups (informational only): 14 groups — explicitly flagged by the tool as "may be legitimate reuse of category labels," not a confirmed defect.

## Distinguishing quantity from quality (INTERPRETATION, directly grounded in the above)

The bank is structurally large, complete in concept/misconception coverage, and free of detectable duplication defects. It is **not** independently validated for mathematical correctness or pedagogical soundness at scale — this is an explicit, self-disclosed gap in the data's own provenance documentation, not a finding newly discovered by this audit. Any manuscript claim about question quality beyond "structurally validated, 0 duplicate-stem errors" would exceed the evidence.

## Why both conditions share this bank

Per `docs/research-design.md`'s 2026-10-31 "Stage 1 update" block (an uncommitted working-tree edit — see file 10 §10.4 for the caveat about trusting dated claims in this specific file) and `docs/stage1-experimental-validity-report.md`: prior to Stage 1 the adaptive condition used this RISE bank while the non-adaptive condition used a separate, smaller 161-question legacy bank, confounding "adaptive vs. non-adaptive" with "which question pool." Stage 1's stated fix was to build a new non-adaptive condition (`src/tutoring/nonAdaptiveRiseSession/`) over the same RISE bank. This audit did not re-verify the Stage 1 before/after mechanism beyond confirming (file 02) that both condition implementations import from `src/domain/rise/`.

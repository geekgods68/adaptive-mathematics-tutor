# 8C-Pilot Report — 2026-10-27

Pilot-seeded only (no confirmatory run executed). Produced by
`src/research/phase8/pipeline/pilot.ts` with default (official) pilot
options: 5 pilot worlds, Track A 100 calibration + 100 test learners
per context, Track B 50 learners per cell, over the three Amendment A1
primary slices (CH07, CH03, CH10). Full machine-readable output:
`research-output/phase8/pilot/pilot-report.json` (gitignored, like all
`research-output/`; this document is the retained narrative summary).

**No contrast between estimators or policies is reported here**, per
C12's pilot acceptance criteria — only per-condition/per-family series,
variances, and the derived required-W.

## Headline results

- **13,560 total runs, 0 failures.**
- **S1 implementation check: PASS** — every policy produces an
  identical K(T) for the same learner (0 difference in all 450
  per-learner comparisons), confirming S1's "no transition" property
  holds through the full Track B pipeline.
- **BKT fit quality** (760 fits total, across all Track A families/
  worlds/slices/concepts): 129 (17%) landed within 1e-3 of a parameter
  bound, 27 (3.5%) hit the 300-iteration cap, **0 flagged multimodal**.
  No B-4/B-5 formal validation test was run this session (see
  "Not yet built" below) — these are raw fit-diagnostic counts, not a
  pass/fail verdict.
- **Runtime** (this machine, single-threaded Node, no parallelism):
  - Track A per (family, world, slice) context, 100+100 learners:
    median 2.94s, p95 6.17s, max 6.38s (n=60).
  - Track B per session: median 4ms, mean 14.5ms, p95 64ms, max 806ms
    (n=13,500).
  - **Tier 1 full-scale projection (B9.3, median × 1.25): Track A ≈
    14.7 minutes (240 contexts), Track B ≈ 5.3 minutes (63,000
    sessions) — roughly 20 minutes total**, excluding storage/byte
    measurement (not implemented this session) and without any
    parallelization (trivially parallelizable across worlds/slices on
    more cores, so this is a conservative upper bound, not a floor).

## The one finding requiring author attention (D6-relevant)

**Required W for the S2 family's Track A log-loss comparison (Det-A vs
BKT-fit) is 92 — above the 60-world cap** in
`experiment-plan-v2.json`'s `worldsCap`. Every other required-W value
is comfortably at or near the floor of 20:

| Context | Required W |
|---|---|
| Track A S1 logLoss / MAE | 20 / 20 |
| **Track A S2 logLoss** | **92** |
| Track A S2 MAE | 20 |
| Track A S3 logLoss | 54 |
| Track A S3 MAE | 20 |
| Track A S4-ref logLoss / MAE | 20 / 20 |
| Track B S1 (both contrasts) | 21 / 21 |
| Track B S2 | 31 / 45 |
| Track B S3 | 50 / 47 |
| Track B S4-GF | 33 / 38 |
| Track B S4-N | 38 / 49 |
| Track B S4-GW | 46 / 61 |

Per B9.2's own disposition ("If required W exceeds 60, the pilot
reports this to the author (D6) instead of proceeding"), this is
reported here rather than silently accepted or worked around. Two
honest caveats on this specific number: it is estimated from only 5
pilot worlds (an inherently noisy variance estimate — the other
Track A S2 estimand, MAE, needs only 20, so the two margins behave very
differently for this family), and a real confirmatory run would use 20
worlds minimum regardless, which may itself reduce estimation noise
enough to change this number materially. Still, it is the correct,
literal output of the pilot's own specified procedure, and is the kind
of result B9.2 exists specifically to surface before committing to a
world count.

**Track B's S4-GW contrast (61) is also marginally above 60** — the
same caveat applies.

This does not block anything by itself (8B/8C-Pilot's own acceptance
criteria do not require every required-W to clear 60 — B9.3's
reduction order only engages if the *runtime* projection exceeds the
ceiling, not if a precision requirement does). It is relevant input to
D6 and to whether S2's Track A comparison and/or S4-GW's Track B
contrast need a dedicated amendment (more pilot worlds, a wider margin,
or an accepted underpowered secondary result) before the confirmatory
study runs. **Not a decision this analysis makes.**

## Activation rates (Track B, C2, informational)

All six families show C2 (prerequisite-aware) activating the
prerequisite/diagnostic mechanism in 97–100% of sessions:

S1 99.3%, S2 98.0%, S3 97.3%, S4-GF 99.7%, S4-N 98.7%, S4-GW 99.7%.

This is comfortably above D5's 10% "mechanism rarely active" threshold
in every cell — H-B2–H-B4 would not be labelled "uninformative" on
activation grounds in these slices, were a confirmatory run to use
them.

## What this pilot does NOT cover (honest scope statement)

This was a genuine, working execution of Track A and Track B at the
protocol's own pilot scale — not a toy smoke test — but several pieces
of C9–C11 that a fully compliant 8B/8C-Pilot would also include were
**not built this session**:

- **C9.3's independent verifier**, built in isolation by a separate
  agent reading only protocol sections B2/B3/B4.2/B4.5/C5–C6, was not
  spawned. No verifier-side reconstruction of Det/BKT updates or
  selection decisions has been run.
- **The full C9.4 test battery** (G-1–G-13, M-1–M-9, B-1–B-6, R-1–R-6,
  L-1, S-1) is only partially covered. Implemented and passing this
  session: analogs of G-2, G-4, G-6, G-8, G-11 (simulator tests); B-1,
  B-2, and a reduced-scale B-3 (2,000 learners, not the official
  20,000); an L-1-style link-recovery test. **Not implemented:** G-1,
  G-3, G-5, G-7, G-9, G-10, G-12, G-13; the full M-1–M-9 suite; the
  official-scale B-3; B-4 and B-5 (the pilot-scale BKT validation tests
  this report's own BKT fit-quality numbers above are a partial,
  informal substitute for); R-1 through R-6; S-1.
- **C10's `analysis/stats.py`** (the confirmatory statistical
  procedures — t-tests, Holm correction, intersection-union tests,
  sign-flip permutation, bootstrap) was not built. This pilot's
  required-W computation was done directly in TypeScript as a
  self-contained calculation, not through that eventual shared
  analysis code path.
- **C11's full retained-output set** (run records in `runs.jsonl.gz`,
  Phase 6 artifact sampling, change-only truth logs, `fits/`/`links/`
  JSON files, manifests, `environment.json`) was not written to disk in
  the committed-infrastructure sense — Track A/B both produce the right
  in-memory data, but persistence/export (reusing Phase 6, per C0.4)
  was not wired up this session.
- **Storage/byte-per-session projection** (part of B9.3) was not
  measured.

None of this invalidates the runtime/precision numbers above, which
come directly from running the real simulator, estimators, and
selection policies at pilot scale — but it means 8B's own acceptance
criterion ("every C9.4 test passes... the verifier was built in
isolation") is not yet met, and this pilot should not be read as
satisfying that bar.

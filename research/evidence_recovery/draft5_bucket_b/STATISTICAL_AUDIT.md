# Statistical Audit — B16 (and general statistical hygiene)

## Method

Every contrast below uses exactly 5 world-level paired values (n=5 worlds, df=4), the unit of inference this project has consistently used since the Phase 2 pass — **never the pooled 750 per-cell trial count**. The exact two-sided p-value uses the closed-form Student-t CDF for df=4 (derived and self-checked in the Phase 2 pass: `F(t;4) = 0.5 + (u/4)(3−u²)`, `u = t/√(4+t²)`; self-check `two_sided_p_df4(2.776) = 0.05002`, recovering this repo's own 0.05-level critical value exactly). 95% CI = mean ± 2.776×SE. All results below are labeled **RETROSPECTIVE** (recomputed this pass or the immediately-preceding Phase 2 pass) and **EXPLORATORY/UNADJUSTED** — never treated as power-correcting, never using n=750.

## K(T), S4-GF, C2 vs C0 (reused from Phase 2 pass, re-verified here)

C0 world means: [0.26, 0.256, 0.27143, 0.27257, 0.20019]; C2: [0.28781, 0.27238, 0.30533, 0.28343, 0.23010].
Diffs (C2−C0): [0.02781, 0.01638, 0.03390, 0.01086, 0.02990]. Mean = **+0.02377**, SD = 0.00972, SE = 0.00435, **t = +5.468**, df=4, **exact p = 0.0054**, 95% CI = [+0.0117, +0.0358].

**Manuscript quotes "diff ≈+0.0238, p≈0.0054." Both match exactly to the given precision. No discrepancy.**

## QTM, S4-GF, C2 vs C0 — reproduced this pass on PER-WORLD ATTAINMENT RATES (not pooled 750)

C0 per-world attainment rate (attained/150 learners-per-world): [0.02000, 0.00667, 0.01333, 0.03333, 0.01333], mean = 0.017333 (=13/750 exactly, confirming the per-world rates aggregate consistently to the pooled count). C2: [0.00667, 0, 0, 0, 0.00667], mean = 0.002667 (=2/750).

Diffs (C2−C0): [−0.01333, −0.00667, −0.01333, −0.03333, −0.00667]. Mean = **−0.014667**, SD = 0.010954, SE = 0.004899, **t = −2.994**, df=4, **exact p = 0.0402**, 95% CI = [−0.0283, −0.0011].

**Manuscript quotes "diff −0.0147, t=−2.99, p≈0.0402, CI [−0.0283,−0.0011]." Reproduced independently this pass to 4 decimal places on every figure. No discrepancy found; no rounding/pooling/weighting/implementation difference needed to be investigated because none exists.**

**On the test actually used:** this is a paired t-test on 5 world-level *attainment rates* (a world's rate = attained learners ÷ 150 learners-in-that-world, pooling that world's 3 slices × 50 learners), not a proportion test (Fisher/chi-square) on the pooled 13-vs-2 counts and not a per-learner test treating 750 as independent n. This is the correct unit of inference per this project's own repeated design choice (world-level paired inference) and is confirmed by reverse-engineering the manuscript's own quoted numbers, which only reproduce exactly under this specific construction.

## Design parameters cross-checked against both pilot artifacts (VERIFIED-ARTIFACT, all match)

| Parameter | Manuscript claim | Artifact value | Match? |
|---|---|---|---|
| Budget | 60 | `plan.trackB.budget = 60` (`protocol/phase8-protocol-v2.md:1491`); every session's `result.budget`/`stepsAdministered`-ceiling confirms 60 | ✓ |
| Worlds | 5 | `pilotWorlds: 5` in both reports | ✓ |
| Slices | CH07/CH03/CH10 | `slicesUsed: ["CH07","CH03","CH10"]` in both reports | ✓ |
| Runs/pilot | 13,560 | `totalRuns: 13560` in both reports (independently re-derived via B17's arithmetic) | ✓ |
| Number of pilots | 2 | confirmed; **also confirmed NOT independent** — same masterSeed/worlds/slices in both (established Phase 2 pass, re-verified this pass by re-reading both pipeline files) | ✓ (with the non-independence caveat preserved) |
| Trials/cell | 750 | `50 learners × 3 slices × 5 worlds = 750`, confirmed arithmetic | ✓ |
| Inference unit | world-level | confirmed — the manuscript's own quoted p-values only reproduce under world-level pairing, never under a 750-pooled test | ✓ |
| df | 4 | `n_worlds − 1 = 4`, confirmed | ✓ |
| Multiplicity correction | none | confirmed — no Holm/Bonferroni/other correction exists anywhere in `analysis/stats.ts`, `threeMetricStats.ts`, or either pilot pipeline | ✓ |

**No discrepancy found in any of the coordinator's cross-check numbers** (Track A Brier/RMSE by family, Track B S4-GF K(T)/QTM, all design parameters) — every one matches the stored artifacts and/or this pass's independent recomputation to the precision quoted. This audit's overall statistical conclusion: **the manuscript's specific headline quantitative claims, as given, are accurate and reproducible** — the issues this and the Phase 2 pass surfaced are about *scope/completeness/framing* (missing C1 data at the time, missing det-B, run-accounting arithmetic, the non-independence of the two pilots, no multiplicity correction), not about the arithmetic correctness of the numbers already quoted.

## General statistical hygiene notes (apply throughout this deliverable)

- Never use 750 as n for any inferential statistic in this deliverable — confirmed not done anywhere in `RESULTS_RECOVERY.md`/`DRAFT5_BUCKET_B_REPORT.md`.
- Every new CI reported is unadjusted and does not claim to compensate for the small n=5/low power — stated explicitly wherever a CI appears.
- 94 total world-level paired comparisons now exist across the Phase 2 pass (70) and this pass's QTM reproduction (+1 formally derived here, already counted among the 70) and B13/B14's C1 contrasts (18, already in the 70) — no new comparison count inflation from this pass beyond what's already itemized in the Phase 2 pass's own multiplicity note.

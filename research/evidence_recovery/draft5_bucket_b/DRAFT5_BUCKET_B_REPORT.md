# Draft 5 — Bucket B Evidence Recovery Report

**Self-contained.** This file can be read, copied, or pasted into another tool entirely on its own; all critical numbers, equations, and corrections are inline, not referenced out. Companion files (`EVIDENCE_INDEX.md`, `METHODS_VERIFICATION.md`, `RESULTS_RECOVERY.md`, `STATISTICAL_AUDIT.md`, `FIGURE_TABLE_AUDIT.md`, `REPRODUCIBILITY_AUDIT.md`, `UNRESOLVED_ITEMS.md`, `data/*.csv`) hold the full supporting detail.

**"Draft 5" was not found as a distinct file anywhere in this repository.** Exhaustive search for its exact title, "Draft 5," and distinguishing structural markers (Section 3.4/3.7, Figures 1-4, Tables 1-4) found zero matches, and no `.docx`/`.pdf` exists in the tree. This report therefore audits the specific numerical/methodological claims the coordinator supplied (which were independently located, verbatim or near-verbatim, inside `docs/COMPLETE_RESEARCH_PAPER_EVIDENCE_DOSSIER.md` and `research/manuscript-evidence-dossier/OJSS_COMPLETE_RESEARCH_DOSSIER.md`) against the actual code and artifacts — not against Draft 5's own prose, which this pass never had access to. Every "manuscript location" cited below is a location in one of those two dossiers, clearly marked as such, never presented as a Draft-5 page/section number.

**Historical/retrospective boundary, honored throughout:** the two HISTORICAL pilots are the 8C-Pilot (2026-10-27, 13,560 runs) and the three-metric pilot (2026-11-04, 13,560 runs) — the same 5 worlds/3 slices, confirmed NOT independent. This pass's own C1 run, det-B replay, and diagnostics replay (all generated 2026-11-08, this session) are labeled **RETROSPECTIVE EXPLORATORY COMPLETION** / **DETERMINISTIC REPLAY** everywhere they appear below, and are never counted as a third historical pilot.

---

## Part I — Executive Findings

**Counts (B01-B25):** 20 resolved (VERIFIED-SOURCE / VERIFIED-ARTIFACT / RECOMPUTED-EXISTING with a clean match), 4 partially resolved (PARTIALLY-VERIFIED — B06's cell-vs-slice nuance already resolved but G6/G7 figure gap remains; B20, B21, B23 — blocked in part on the missing Draft 5 or on data that was never generated), 0 contradicted against the manuscript's own quoted numbers (every cross-checked figure matched), 1 genuinely unavailable without external tooling (B25). See `UNRESOLVED_ITEMS.md` for the full breakdown and `data/evidence_registry.csv` for the per-item machine-readable status.

**Most consequential discoveries:**
1. **Every one of the coordinator's specific cross-check numbers reproduces exactly** — Track A Brier/RMSE by family, S4-GF K(T) (diff +0.0238, p=0.0054) and QTM (13/750 vs 2/750, p=0.0402, reproduced independently this pass on the 5 per-world attainment rates, not the pooled count), and every design parameter (budget 60, 5 worlds, 3 slices, 13,560 runs × 2, 750/cell, world-level inference, df=4, no multiplicity correction). **This is a strengthening finding, not a weakening one: the manuscript's headline quantitative claims are accurate and independently reproducible.**
2. **C1's full data now exists** (retrospective, labeled) and shows C1≈C2 everywhere — strengthens the manuscript's implicit claim that the K(T)/QTM reversal is a *selector* property, not an estimator-variant artifact, by actually supplying the comparison that was previously missing.
3. **S4-GF has zero graph misalignment** (Jaccard(G,G\*)=1.0000, computed this pass, every slice/world) — this *removes* graph-misalignment as a candidate explanation for the S4-GF-specific reversal, strengthening the "objective mismatch" (averaged-vs-conjunctive-criterion) explanation the manuscript's own source brief already treats as the headline finding.
4. **Previously-circulated adaptive-selector thresholds (mastery 0.75, remediation 0.35) are CONFIRMED CORRECT**, not contradicted, against `src/tutoring/selection/adaptive/config.ts`.
5. **A real run-accounting arithmetic error was found and fixed in the prior pass's own report** ("×150×3" double-counted a factor); the corrected equation (`6×5×3×50×3=13,500`) is carried into this pass's `run_accounting.csv` and cross-validated against both pilots' self-reported `totalRuns`.
6. **Det-B (Variant B's own Track-A accuracy) and the full question-allocation diagnostics (19-25% diversion, 54-69% coverage for C1/C2 vs. C0's exact 100%) are now recovered**, closing two gaps the manuscript's own source brief flags as outstanding.

**Did the primary findings change?** No central claim reverses. The S4-GF K(T)/QTM reversal survives every check in this pass (corrected run-accounting, resolved K(T) definition, reproduced p-values, C1 data, graph-Jaccard computation). What changed is *completeness and precision*: several previously-"missing" pieces of evidence (C1, det-B, allocation mechanism, graph Jaccard) now exist and uniformly corroborate the existing narrative rather than contradicting it.

---

## Part II — Manuscript-to-Evidence Matrix (B01-B25)

| ID | Manuscript location (dossier, since Draft 5 absent) | Missing evidence | Status | Finding | Source | Recommended action |
|---|---|---|---|---|---|---|
| B01 | source brief / design section | C0 sequencing mechanics never spelled out | VERIFIED-SOURCE | Fixed curriculum order + cyclic L1-5 blocks + seeded no-replacement draw; responses never read; 100% coverage is structural, not empirical | `src/research/phase8/trackB/c0Slice.ts` | Insert pseudocode (Methods Verification B01) into Methods |
| B02 | Methods (adaptive algorithm) | Exact thresholds unverified | VERIFIED-SOURCE | 0.75/0.35/etc. all CONFIRMED correct; full decision-order table recovered | `src/tutoring/selection/adaptive/{config,targeting}.ts` | Insert decision table + methods paragraph (Methods Verification B02) |
| B03 | Methods (C3 ablation) | Downstream-effects unchecked | VERIFIED-SOURCE | Confirmed single-mechanism ablation across the FULL pipeline (candidate filtering, scoring, difficulty, fallback all identical) | `targeting.ts`, `candidateSelection.ts`, `adaptiveSelectionPolicy.ts` | State "single-mechanism ablation" with confidence |
| B04 | Methods (multi-concept items) | Weight semantics unverified | VERIFIED-SOURCE | Weights need NOT sum to 1; not normalized at update time; same weight both branches; prerequisites never auto-updated | `src/domain/learner-model/updateMastery.ts` | Add explicit weight-semantics paragraph |
| B05/B07 | Methods (simulator) | Full equations, mastery threshold | VERIFIED-SOURCE | Complete equation table recovered; masteredM=0.8 shared S1/S3; S2/S4 binary; mastery absorbing in all 4 families | `simulator/{s1,s2,s3,s4,shared}.ts` | Use `METHODS_VERIFICATION.md`'s equation table + Section 3.7 replacement text verbatim |
| B06 | Methods (S4 cells) | Precise G-vs-G\* relationship | RECOMPUTED-EXISTING | λ/φ table + computed Jaccard: S4-ref/GF/N=1.0000 (G≡G\*); S4-GW≈0-0.14 (nearly all within-slice structure destroyed) | `data/b06_graph_comparison.csv` | Insert Jaccard table; note S4-GW is more severe than "scrambled" |
| B08 | Results (Track A integrity) | No explicit leakage verdict | VERIFIED-SOURCE → **VERIFIED PRE-RESPONSE** | Execution trace confirmed no leakage; tests cited | `runTrackA.ts`; `tests/research/phase8/runTrackA.test.ts` | State verdict explicitly in Methods |
| B09 | Methods (pairing design) | What's matched vs. not | VERIFIED-SOURCE | Hidden-learner PARAMETERS matched (common random numbers); response TRAJECTORIES diverge once policies pick different items — no code enforces trajectory matching | `simulator/shared.ts` | Correct any claim implying matched trajectories |
| B10 | Methods (outcome construction) | Full trace, all 6 metrics | VERIFIED-SOURCE | Complete trace recovered (clipping, denominators, censoring, absorbing mastery) | `runTrackB.ts`, `metrics/threeMetrics.ts` | Insert as Methods appendix |
| B11 | Results (K(T)) | Only S4-GF shown; no C1 | RECOMPUTED-EXISTING | Full 6×4 table recovered incl. C1 (retrospective) | `data/track_b_recovered.csv` | Insert full table; reversal confirmed S4-GF-only |
| B12 | Results (Track A) | No det-B | RECOMPUTED-EXISTING | Full det-A/det-B/BKT-fit table; det-B≈det-A everywhere | `data/track_a_recovered.csv` | Insert det-B columns |
| B13 | (not previously reportable) | C1-vs-C2 comparison | RECOMPUTED-EXISTING | C1≈C2 everywhere; estimator variant is not the driver | `data/ablation_results.csv` | New subsection, framed as update-variant only |
| B14 | Results (C2 vs C3) | Full table | RECOMPUTED-EXISTING | All 6 families present, none UNAVAILABLE | `data/ablation_results.csv` | Insert full table |
| B15 | Results (attainment %) | Verification | VERIFIED-ARTIFACT | **All 6 manuscript figures match exactly** | `data/world_level_results.csv` | None — already correct |
| B16 | Results (p-values) | Independent reproduction | RECOMPUTED-EXISTING | **Both p-values (0.0054, 0.0402) reproduced exactly**, incl. the specific test (world-level attainment-rate paired t-test) | `STATISTICAL_AUDIT.md` | None — already correct; optionally state the exact test name |
| B17 | Methods (run accounting) | Full decomposition | VERIFIED-ARTIFACT | 13,560=13,500 TrackB+60 TrackA confirmed both pilots; 0 failures; no per-world failure breakdown stored | `data/run_accounting.csv` | Fix any "150×3" style arithmetic text |
| B18 | Methods (question bank) | Verification of counts | VERIFIED-ARTIFACT | **All counts match exactly** (283/448/548/373/188; 64 multi-concept; mean 4.00 options); math-correctness explicitly NOT checked by any script | live `npm run audit:rise-questions` | Qualify "independent structural audit" — structural only, not content-correctness; audit is automated, not third-party-authored |
| B19 | Methods/architecture figure | Leakage claims | VERIFIED-SOURCE | Confirmed from code: misconceptionId/derivationNote/correctOptionId/difficulty/conceptIds excluded from client views | `src/tutoring/adaptiveSession/publicViews.ts` | None — architecture claim holds |
| B20 | Figures 2-4 | Recompute/verify | PARTIALLY-VERIFIED | All plotted data verified correct; figure-to-Draft-5-number mapping impossible without Draft 5; figure6/7 missing from disk, cause unknown | `FIGURE_TABLE_AUDIT.md` | Supply Draft 5 for exact caption mapping |
| B21 | Tables 1-4 | Cell audit | PARTIALLY-VERIFIED | Dossier-table cells match; new Track-A-vs-Track-B S4-cell asymmetry found | `FIGURE_TABLE_AUDIT.md` | Insert corrected table distinguishing Track A's S4-ref from Track B's S4-GF/N/GW |
| B22 | Methods (provenance) | Consolidation | VERIFIED-ARTIFACT | Full consolidation + reproducibility matrix; "1015 tests pass today" ≠ "passed on 10/27" explicitly flagged | `REPRODUCIBILITY_AUDIT.md` | Add the explicit historical-test caveat |
| B23 | Discussion (6 mechanisms) | Evidence classification | PARTIALLY-VERIFIED | 4 of 6 now SUPPORTED-BY-EVIDENCE (quantified), 1 CONTRADICTED-AS-STATED (graph misalignment, for S4-GF), 1 remains CONSISTENT-BUT-NOT-ESTABLISHED | Part VI below | Revise discussion per Part VI table |
| B24 | Methods/Discussion (S1) | Negative-control wording | VERIFIED-SOURCE | 0% attainment is a structural near-certainty given config (not merely an empirical result) | `simulator/s1.ts` + config draw ranges | Use precise wording below |
| B25 | References | Citation accuracy | **UNAVAILABLE** | No local bibliography; no external verification tool used | — | Mark "requires external verification" in any citation list |

---

## Part III — Full Methods Specifications

**See `METHODS_VERIFICATION.md` for complete pseudocode/equations/thresholds/RNG design (B01-B09).** Highlights reproduced here for self-containment:

**C0 sequencing:** curriculum-order concept blocks (size `floor(60/|T_c|)` + remainder to earliest concepts), cyclic L1→L5 within each block, seeded uniform draw without replacement; responses never consulted; 100% target coverage by construction.

**Adaptive decision hierarchy (C1/C2/C3), verified thresholds:** mastery≥0.75 & evidence≥3 ⇒ done; consecutiveIncorrect≥4 ⇒ try diagnostic probe of a stale (≥8-step-old or unobserved) prerequisite (even an already-mastered one); else consecutiveIncorrect≥2 ⇒ try ordinary prerequisite remediation (mastery≤0.35 or evidence<3), else self-remediate; else progress. Difficulty: 5-band table on mastery (≤0.3→L1 … ≤1→L5), nudged after 3 consecutive repeats. C3 = C1/C2 with ONLY the two prerequisite-search branches removed; everything else (including all of candidate filtering/scoring/fallback) is byte-identical code.

**Multi-concept mastery update:** `M_new = M_old ± rate·(gap or M_old)·difficultyFactor·hintMultiplier·conceptWeight`, clamped [0,1]. `conceptWeight` is the question's own raw (unnormalized) weight for that concept — weights need not sum to 1, and are not renormalized; the same weight is used whether the response was correct or incorrect; a question's prerequisite concepts are never auto-updated.

**S1-S4 generative equations:** see table in `METHODS_VERIFICATION.md` B05/B07. One line each: S1 — fixed θ, no transition, logistic-IRT response, m=σ(θ), mastered iff m≥0.8. S2 — binary BKT ground truth, L:0→1 w.p. T on a counted opportunity, no forgetting, m=L. S3 — same response form as S1 but θ grows by +η·exp(ν) per counted opportunity, m=σ(θ(t)), mastered iff m≥0.8. S4 — binary, gated by the true graph G\*: L:0→1 w.p. κ(t)·τ where κ=1 if all G\*-parents are mastered else λ; m=L. All four families are **absorbing** (mastery, once attained, is never lost).

**S4 cells, exact meaning (computed this pass):**

| Cell | λ | φ | Jaccard(G,G\*) in-slice |
|---|---|---|---|
| S4-ref | 0.30 | 1.0 | 1.0000 |
| S4-GF | 0.05 | 1.0 | **1.0000 — no graph misalignment** |
| S4-N | 1.00 | 1.0 | 1.0000 (moot — gating has zero effect) |
| S4-GW | 0.05 | 0.0 | **0.0000–0.1429 — within-slice structure nearly destroyed, not merely "scrambled"** |

**Pairing design:** same masterSeed/world/slice/learner-id give an identical hidden learner across all 4 conditions (parameters matched); but once conditions select different items, their *response trajectories* diverge — no code enforces trajectory-level matching, only parameter-level matching.

---

## Part IV — Complete Recovered Results

**(Full tables with every world in `RESULTS_RECOVERY.md` and `data/*.csv`.)**

**K(T), 6 families × {C0,C1,C2,C3}, world-level means (signed diff = adaptive − comparator):**

| Family | C0 | C1 | C2 | C3 | C2−C0 | C1−C2 | C2−C3 |
|---|---|---|---|---|---|---|---|
| S1 | 0.31629 | 0.31629 | 0.31629 | 0.31629 | 0.00000 | 0.00000 | 0.00000 |
| S2 | 0.82773 | 0.65030 | 0.64400 | 0.74648 | −0.18373 | +0.00630 | −0.10248 |
| S3 | 0.53330 | 0.49652 | 0.49540 | 0.52339 | −0.03790 | +0.00112 | −0.02798 |
| S4-GF | 0.25204 | 0.27714 | 0.27581 | 0.26491 | **+0.02377** | +0.00133 | +0.01090 |
| S4-N | 0.87368 | 0.64129 | 0.63874 | 0.75013 | −0.23493 | +0.00255 | −0.11139 |
| S4-GW | 0.49189 | 0.40678 | 0.40518 | 0.44263 | −0.08670 | +0.00160 | −0.03745 |

**QTM attainment (of 750), same grid:**

| Family | C0 | C1 | C2 | C3 |
|---|---|---|---|---|
| S1 | 0 | 0 | 0 | 0 |
| S2 | 202 | 68 | 61 | 174 |
| S3 | 14 | 5 | 5 | 9 |
| S4-GF | **13** | 2 | **2** | 4 |
| S4-N | 276 | 49 | 46 | 159 |
| S4-GW | 12 | 0 | 1 | 10 |

**Track A, det-A/det-B/BKT-fit (world-level means):**

| Family | det-A logLoss | det-B logLoss | BKT-fit logLoss | det-A Brier | det-B Brier | BKT-fit Brier | det-A RMSE | BKT-fit RMSE |
|---|---|---|---|---|---|---|---|---|
| S1 | 0.66554 | 0.66496 | 0.66939 | 0.23646 | 0.23618 | 0.23830 | 0.12797 | 0.13481 |
| S2 | 0.53423 | 0.53498 | 0.51642 | 0.17856 | 0.17891 | 0.16974 | 0.24999 | 0.23183 |
| S3 | 0.64909 | 0.64828 | 0.65037 | 0.22892 | 0.22854 | 0.22947 | 0.14451 | 0.14571 |
| S4-ref | 0.55496 | 0.55491 | 0.53053 | 0.18786 | 0.18782 | 0.17592 | 0.26189 | 0.23676 |

**World-level inference, S4-GF (the reversal, fully reproduced):** K(T) C2−C0 = +0.0238 (t=+5.47, df=4, p=0.0054, 95%CI[+0.0117,+0.0358]); QTM attainment-rate C2−C0 = −0.0147 (t=−2.99, df=4, p=0.0402, 95%CI[−0.0283,−0.0011]). Both **reproduced independently this pass**; no discrepancy with the manuscript's quoted figures.

**Run accounting (both historical pilots):** `6×5×3×50×3 = 13,500` Track-B sessions + `4×5×3 = 60` Track-A contexts = **13,560** per pilot, exactly matching each report's self-reported `totalRuns`; 0 failures reported in both (globally — no per-world/condition breakdown is stored, a genuine granularity gap, not a contradiction).

---

## Part V — Tables/Figures Audit

See `FIGURE_TABLE_AUDIT.md` in full. Summary: all 8 existing figures' underlying data verified correct against source artifacts (zero denominator/axis/condition errors found); figure-to-Draft-5-caption mapping is impossible without Draft 5 itself; `figure6`/`figure7` are absent from disk for an undetermined reason; a real Track-A-vs-Track-B S4-cell conflation risk was identified (Track A only ever uses S4-ref; Track B only ever uses S4-GF/N/GW — any table presenting these as one "S4" row is wrong).

---

## Part VI — Discussion Mechanisms (B23)

| Mechanism | Classification | Evidence |
|---|---|---|
| Budget spent upstream (off-target diversion) | **SUPPORTED-BY-EVIDENCE** | C1/C2 divert 19.4-24.8% of budget off-target, every family; C0/C3 exactly 0% (structural) |
| Incomplete target coverage | **SUPPORTED-BY-EVIDENCE** | C1/C2 average 54.1-68.8% target-concept coverage vs. C0's exact 100.00%, every family |
| Repeated remediation on one concept | **SUPPORTED-BY-EVIDENCE** | C3's `remediation`-reason step count far exceeds C1/C2's in every family (e.g. S4-GF: 20,059 vs. ~10,000-10,400) — this is HOW C3 falls short of C0 despite zero diversion |
| Estimator inaccuracy | **CONTRADICTED, as a Variant-B-SPECIFIC explanation** | det-B's Track-A accuracy ≈ det-A's everywhere (not statistically distinguishable in S4-ref); C1 (Variant A) shows the SAME K(T)/QTM shortfall as C2 (Variant B) — if Variant-B-specific inaccuracy were the cause, C1 should not replicate the gap, but it does |
| Graph misalignment (G vs. G\*) | **CONTRADICTED, for S4-GF specifically** | Computed Jaccard(G,G\*) = 1.0000 in S4-GF (B06) — there is no misalignment in the one family the reversal centers on; only S4-GW has any misalignment, and S4-GW shows the SAME directional pattern (C0>C2 on QTM) as every other family, so misalignment cannot explain the S4-GF-specific reversal |
| Objective mismatch (per-concept estimated-mastery optimization vs. joint simultaneous-attainment event) | **SUPPORTED-BY-EVIDENCE** (design-level, now also quantitatively corroborated) | No code path in `targeting.ts` optimizes for "all target concepts simultaneously"; within C1/C2, attained sessions show ~95-100% coverage vs. ~54-67% for censored sessions in the SAME condition/family — the clearest, most directly supported explanation of the six |

---

## Part VII — Reproducibility/Integrity

See `REPRODUCIBILITY_AUDIT.md`. Headline: commit `bde783a`, both historical pilot JSONs SHA-256-unchanged throughout this and the prior pass, masterSeed `RISE-PHASE8-v2` constant throughout, `protocol/APPROVAL.md` absent (not created). **"97 test files / 1015 tests passing" is today's state and does NOT prove what passed on 2026-10-27/11-04** — no historical test-run record survives from either date; the only link between "tests pass today" and "the pilot numbers are trustworthy" is this session's own deterministic replay (0-diff match on det-A/BKT-fit). The reproducibility matrix (`REPRODUCIBILITY_AUDIT.md`) distinguishes source-verification / artifact-replay / re-execution / independent-reimplementation per claim and never over-claims the latter two where only the former two were actually done.

---

## Part VIII — Corrections Required

| # | Location | Problem | Verified replacement | Source |
|---|---|---|---|---|
| 1 | Any run-accounting sentence using "×150×3" | Double-counts the slice factor | "6 families × 5 worlds × 3 slices × 50 learners × 3 conditions = 13,500 Track-B sessions, + 60 Track-A contexts = 13,560" | `data/run_accounting.csv` |
| 2 | Any sentence implying K(T) and QTM measure the same underlying state differently | Both read the SAME ground-truth stream; the distinction is continuous-mean vs. binary-joint-event, not truth-vs-estimate | "K(T) and QTM are both ground-truth-based; K(T) is the mean of the continuous mastery value across target concepts, QTM is the first step at which all target concepts' binary mastered-flags are simultaneously true" | `METHODS_VERIFICATION.md` B10 |
| 3 | Section 3.7 (placeholder) | No stated threshold mechanics | Verbatim replacement text given in Part III above / `METHODS_VERIFICATION.md` B07 | `simulator/{s1,s3}.ts` |
| 4 | Any table conflating Track A's "S4" with Track B's "S4" | They are different cells (S4-ref vs. S4-GF/N/GW) | Split into separate rows per `FIGURE_TABLE_AUDIT.md`'s corrected table | `protocol/phase8-protocol-v2.md` plan JSON |
| 5 | Any sentence claiming response trajectories are matched across conditions | Only hidden-learner PARAMETERS are matched (common random numbers); trajectories diverge once item selection diverges | "...identical underlying learner parameters across conditions; realized response sequences diverge once conditions select different items" | `METHODS_VERIFICATION.md` B09 |
| 6 | Any sentence calling the question-bank audit "independent" without qualification | The audit is automated/structural, not a third-party or content-correctness review | "a structural, automated audit (duplicate detection, concept/misconception coverage, weight validity) — not an independent human content review, and explicitly does not check mathematical correctness" | live audit output, this pass |
| 7 | Discussion's graph-misalignment mechanism, if currently stated as live/plausible for S4-GF | Computed Jaccard=1.0000 rules it out for S4-GF | "Graph misalignment cannot explain the S4-GF reversal (G≡G\* exactly in that cell); it remains a candidate only for S4-GW, which shows no distinct reversal pattern from the other families" | `data/b06_graph_comparison.csv` |
| 8 | Any "1015 tests passing" claim used to support historical-pilot trustworthiness | Conflates current-code health with historical-run health | State the two separately; cite the deterministic replay (not the test count) as the link to historical trustworthiness | `REPRODUCIBILITY_AUDIT.md` |

---

## Part IX — Unresolved Items

See `UNRESOLVED_ITEMS.md` in full. In brief: Draft 5 itself, exact figure/table numbering against it, `figure6`/`figure7`'s absence, per-world failure granularity, and literature/citation accuracy (B25 — no local bibliography, correctly marked "requires external verification" rather than guessed) are the genuine, stated-as-such gaps. Nothing was filled in with an invented number.

---

## Part X — CHATGPT HANDOFF — DRAFT 5 BUCKET B

*(Fully self-contained; written to stand alone if copied out by itself.)*

**Context:** This is the Bucket B evidence-recovery audit for a manuscript titled "Mastery Estimation, Question Sequencing, and the Definition of Mastery: An Exploratory Simulation Study of a Transparent Adaptive Mathematics Tutor," referred to as "Draft 5." **Draft 5 itself does not exist as a file in the audited repository** — this audit worked from the specific numerical claims supplied by the requester, which were independently located in two dossier files and verified against the actual simulation code and stored run artifacts.

**Study design (verified):** 4 conditions — C0 (non-adaptive, performance-independent, structurally guarantees 100% target-concept coverage, no estimator); C1/C2 (identical adaptive selector, differing ONLY in the mastery-update's incorrect-response weighting direction — Variant A vs. B); C3 (= C2 with ONLY the prerequisite-backtracking branches of the selector removed — confirmed a true single-mechanism ablation, nothing downstream changes). 4 simulated-learner families (S1 stationary logistic, S2 BKT-generative, S3 practice-driven continuous, S4 prerequisite-gated binary with 4 sub-cells ref/GF/N/GW differing ONLY in gating strength λ and true-graph fidelity φ). Two historical pilot runs exist, both 5 worlds × 3 curriculum slices (CH07/CH03/CH10) × 13,560 total simulated sessions, 0 failures — **NOT independent of each other** (same masterSeed, same worlds, same slices; the second is a re-scoring of the first's sessions under a different metric set).

**Headline finding, reproduced exactly in this audit:** in scenario S4-GF, adaptive sequencing (C2) scores significantly *higher* final averaged mastery K(T) (+0.0238, t=5.47, df=4, p=0.0054) but significantly *lower* conjunctive simultaneous-mastery-attainment QTM (13/750→2/750, rate diff −0.0147, t=−2.99, df=4, p=0.0402) than non-adaptive sequencing (C0). **Both p-values were independently recomputed from the raw per-world data in this audit and match exactly.** This reversal is specific to S4-GF — in every other differentiated family (S2, S3, S4-N, S4-GW), BOTH metrics already favor C0 over C2, just by different magnitudes; S4-GF is the only family where the two metrics *disagree in direction*.

**What this audit newly recovered (not previously available):**
- A full C1 vs. C2 comparison (retrospective, explicitly non-confirmatory): C1 and C2 are nearly identical on every outcome in every family — proving the mastery-update variant is NOT the source of the K(T)/QTM gaps; the gaps track the selector (adaptive vs. non-adaptive; prerequisite-aware vs. ablated), not the estimator.
- Variant B's own Track-A predictive accuracy (det-B), via a deterministic replay cross-validated to an exact match against the historical det-A/BKT-fit numbers before being trusted: det-B ≈ det-A everywhere, not distinguishably worse.
- A computed graph-similarity check: S4-GF's true graph G\* is IDENTICAL to the tutor-visible curriculum graph G (Jaccard = 1.0000) — graph misalignment is **not** a viable explanation for the S4-GF reversal (only S4-GW has any misalignment, and it doesn't show a distinct reversal pattern).
- Quantified mechanism evidence for why adaptive underperforms on QTM: C1/C2 divert 19-25% of their question budget to off-target prerequisite concepts and achieve only 54-69% full target-concept coverage, versus C0's exact, structurally-guaranteed 100%; sessions that DO attain simultaneous mastery show ~95-100% coverage versus ~54-67% for sessions that don't, within the same condition.
- A corrected run-accounting equation (the prior internal report's own arithmetic had a double-counted factor; now `6×5×3×50×3=13,500` + 60 Track-A contexts = 13,560, exactly matching both pilots' self-reported totals).
- Confirmation (not contradiction) that the previously-circulated adaptive-selector thresholds (mastery-progression 0.75, remediation 0.35) are exactly correct per source code.

**Corrected methods text ready to paste:**
> "The non-adaptive control (C0) presents each target concept's question block in fixed curriculum order, cycling difficulty levels 1 through 5 within each block, drawing items without replacement via a seeded pseudorandom index; it never consults learner responses and therefore guarantees exactly 100% target-concept coverage by construction. The adaptive policy (C1/C2) selects a target concept via a fixed priority order — diagnostic re-probing of a stale prerequisite after 4 consecutive incorrect responses, ordinary prerequisite remediation after 2, self-remediation, or progression — and considers a concept mastered once its estimated mastery reaches 0.75 with at least 3 supporting observations; difficulty is drawn from a fixed five-band mastery-to-difficulty table. Condition C3 disables only the two prerequisite-search branches of this hierarchy; every other mechanism (difficulty selection, candidate filtering and scoring, fallback behavior) is identical code to C2, making C2-vs-C3 a clean single-mechanism ablation of prerequisite-awareness. Conditions C1 and C2 use an identical selector and differ only in the sign of the incorrect-response difficulty weighting in the mastery-update formula."

**Contradictions found between any prior claim and the actual code/artifacts:** none of the coordinator's specific cross-check numbers were contradicted. The only corrections required are the eight items in Part VIII above (arithmetic phrasing, terminology precision, a Section 3.7 placeholder fill-in, a Track-A/Track-B S4-cell conflation risk, and ruling out graph-misalignment for S4-GF specifically) — all additive precision/completeness fixes, not reversals of any reported result.

**Genuine gaps, stated as such, not fabricated:** Draft 5 itself was never located (this entire audit worked from independently-verified claims, not from reading the manuscript's own prose); figure/table numbering cannot be matched to Draft 5's actual captions without that file; two figure files (`figure6`/`figure7`) are missing from disk for an unknown reason; per-world/per-condition failure counts were never itemized in either historical pilot's stored report; literature citations have no local bibliography and were not checked against any external source (correctly marked "requires external verification," never guessed).

**Source locations for everything above:** `src/research/phase8/trackB/c0Slice.ts` (C0); `src/tutoring/selection/adaptive/{config,targeting,candidateSelection,adaptiveSelectionPolicy}.ts` (adaptive selector); `src/domain/learner-model/updateMastery.ts` (mastery update, multi-concept weights); `src/research/phase8/simulator/{s1,s2,s3,s4,shared}.ts` + `trueGraph.ts` (simulator families, G\*); `src/research/phase8/trackB/runTrackB.ts` + `src/research/phase8/metrics/threeMetrics.ts` (all 6 outcome constructions); `research-output/phase8/pilot/{pilot-report.json,...}` and `research_evidence/phase2_results_and_appendix/retrospective_artifacts/*` (all raw numbers); `research/evidence_recovery/draft5_bucket_b/data/*.csv` (this audit's own recomputed tables).

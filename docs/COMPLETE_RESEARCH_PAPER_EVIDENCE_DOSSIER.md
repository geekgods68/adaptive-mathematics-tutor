# RISE Phase 8 — Complete Research Paper Evidence Dossier

Prepared: 2026-11-04. **Restructured and extended: 2026-11-05**, to
reconcile a real gap found in the first pass: the registered Phase 8
protocol's primary metrics (log loss, final mastery K(T), latent-recovery
MAE) did not literally match the three metrics the paper was always
intended to report (Brier Score, Questions-to-Mastery, Latent-Mastery
RMSE). This revision investigates that gap's provenance, resolves it
through a proposed, author-reviewable protocol amendment (not a silent
substitution), implements and verifies all three originally-intended
metrics for real, and runs a new, explicitly-labeled diagnostic pilot to
prove the full three-metric pipeline end to end. See Section 4 for the
complete reconciliation record.

This document is the single, self-contained evidence base for writing
the Phase 8A research paper. It reproduces every paper-critical number,
equation, parameter and finding directly — it does not require opening
any other file to be understood. Supporting raw data lives under
`research-output/phase8/final/` and `research-output/phase8/pilot/` and
is referenced by exact path throughout.

**This dossier is built from a repository in which `protocol/APPROVAL.md`
does not exist.** No confirmatory study has been run under either metric
set, and none was run to produce this dossier. Everything reported below
at a "result" level is either (a) a deterministic, code-verified property
of the implemented system, or (b) descriptive/exploratory statistics
computed from real, newly-generated or pre-existing pilot-scale data —
never a substitute for a confirmatory run. This distinction is maintained
throughout via the evidence labels in Section 1.

---

## 1. Document Status and Evidence Classification

### 1.1 Evidence labels (used on every material claim below)

| Label | Meaning |
|---|---|
| **SOURCE VERIFIED** | Read directly from the actual current source code in this repository during this task |
| **TEST VERIFIED** | An automated test, run during this task, confirms the claim |
| **RUNTIME VERIFIED** | A real execution (script, CLI, pilot run) during this task produced the value |
| **ARTIFACT VERIFIED** | Computed from a stored, content-addressed research artifact |
| **PROTOCOL REGISTERED** | Stated in `protocol/phase8-protocol-v2.md`, a drafted-but-not-yet-approved document (Section 23) — a design commitment, not yet an executed result |
| **PROPOSED (A2)** | Part of `protocol/PROPOSED-AMENDMENT-A2-metric-reconciliation.md` (new, this revision) — a reviewable proposal, not yet accepted or applied |
| **EXPLORATORY** | Computed from real data, but underpowered relative to any adequate confirmatory precision requirement, or outside a pre-registered analysis plan |
| **INTERPRETATION** | A reasoned inference by the author of this dossier, not a direct measurement |
| **UNKNOWN** | Not yet determined; named explicitly as a gap |

### 1.2 Protocol approval status — checked directly, both passes

`protocol/APPROVAL.md` **does not exist** in this repository (confirmed
again by direct filesystem check for this revision, 2026-11-05).
`protocol/phase8-protocol-v2.md` states its own status explicitly: *"This
document supersedes the v1 draft... in full. It is a draft for author and
mentor approval; it is not frozen or approved. Freezing happens only
when the author records the SHA-256 of the exported protocol file in
`protocol/APPROVAL.md`."* **SOURCE VERIFIED.** This revision additionally
checked `protocol/PROPOSED-AMENDMENT-A2-metric-reconciliation.md` was
**not** used to fabricate or imply any approval — it is explicitly marked
PROPOSAL ONLY, and this dossier was written without assuming its
acceptance.

Consequence, enforced throughout this dossier: no confirmatory hypothesis
test, under the original metric set OR the revised Brier/QTM/RMSE set,
has been executed, and none was executed to produce this document. Two
real experimental artifacts exist: the original **8C-Pilot**
(`research-output/phase8/pilot/pilot-report.json`, 2026-10-27,
**ARTIFACT VERIFIED**) and the new **three-metric diagnostic pilot**
(`research-output/phase8/pilot/three-metric-pilot-report.json`,
2026-11-05, **RUNTIME VERIFIED**, this revision). Both are pilot-scale
only; see Section 24.

### 1.3 What this dossier is and is not

- It **is** a complete, traceable inventory of: the registered scientific
  design; the metric-provenance investigation and reconciliation decision
  (new, this revision); the actually-implemented system, verified against
  the real code; the real pilot-scale evidence that exists under both
  metric sets; and an honest gap list for what a confirmatory run still
  requires.
- It **is not** the paper itself, a claim that the study is finished, a
  claim that `protocol/PROPOSED-AMENDMENT-A2-metric-reconciliation.md`
  has been approved, or a claim that any simulated-learner result
  generalizes to real students.

---

## 2. Executive Research Summary

RISE Phase 8 is a simulation-based computational study comparing (Track
A) a deterministic, transparent mastery-estimation heuristic against
Bayesian Knowledge Tracing (BKT) and simpler baselines on response
prediction and latent-state recovery, and (Track B) prerequisite-aware
adaptive question sequencing against non-adaptive and prerequisite-
unaware sequencing on simulated knowledge acquisition under a fixed
practice budget. A third track (C) checks whether the system's decisions
can be exactly, computationally reconstructed from their own recorded
traces. **PROTOCOL REGISTERED** (B1.1).

**This revision's central finding:** the registered protocol's primary
metrics (log loss, K(T), MAE) do not literally match the three metrics
the paper was always scoped to report (Brier Score, Questions-to-Mastery,
Latent-Mastery RMSE). Investigation (Section 4) found this was a
documented implementation choice made during Phase 8's build, not a
deliberate rejection — and, critically, found that the underlying
*computation* for all three originally-intended metrics already existed
in the codebase (Brier score and ground-truth-based, already
censoring-aware "items to criterion" have been computed since Track
A/B were first written; only persistence into the pilot report was
missing, and RMSE required one new, small, independently-verified
function). This revision implements, tests, and runs all three for real
and proposes a formal amendment (`protocol/PROPOSED-AMENDMENT-A2-metric-reconciliation.md`)
reconciling the two metric sets without retroactively changing anything
already reported as exploratory.

As of this dossier: the full Tier 1 experimental infrastructure is
implemented and unit-tested (114 original Phase 8 tests + 30 new
three-metric tests, all passing, Section 22); two pilot-scale diagnostic
runs exist (the original 13,560-run 8C-Pilot under log loss/MAE/K(T),
and a new, matched-design three-metric pilot under Brier/QTM/RMSE); and
no confirmatory run has been authorized or executed under either metric
set. This dossier therefore documents a **methodologically complete but
scientifically pre-confirmatory** state, now for both the original and
the reconciled metric framework.

---

## 3. Research Questions and Hypotheses

**Original research question (PROTOCOL REGISTERED, B1.1, verbatim):**

> "Under explicitly specified simulated-learner families, how does a
> transparent linear-operator mastery heuristic compare with Bayesian
> Knowledge Tracing and simpler baselines in response prediction and
> latent-state recovery; how does prerequisite-aware sequencing driven by
> that heuristic compare with non-adaptive and prerequisite-unaware
> sequencing in simulated knowledge acquisition under a fixed practice
> budget; and to what extent can its decisions be computationally
> reconstructed?"

**Project's original framing (SOURCE VERIFIED, `docs/research-design.md`,
first committed 2026-09-04, predating the Phase 8 protocol by seven
weeks):** the adaptive-vs-non-adaptive comparison was always framed
partly in terms of **Questions-to-Mastery** — see
`docs/research-design.md`'s explicit statement: *"do not force identical
stopping rules when the research question concerns Questions-to-Mastery"*
— a deliberate design choice (both conditions share one practice-length
default today, but the underlying research question has never been about
equal-length sessions; it's about how many questions each approach needs).

**Motivation (B1.2, PROTOCOL REGISTERED):** the implemented mastery
update is a two-operator linear learning model of the Bush and Mosteller
(1955) type. Prerequisite-aware sequencing draws on Knowledge Space
Theory (Doignon & Falmagne, 1985) and skill-topology Bayesian networks
(Käser et al., 2014). The claimed contribution is explicitly **not** a
new learner model — it is (1) exact analytical properties of the
implemented rule, (2) a pre-registered, non-circular comparison against
BKT and simpler baselines, and (3) a precise account of what explicit
decision traces do and do not establish.

### 3.1 Registered hypotheses — ORIGINAL metric set (PROTOCOL REGISTERED, B8.3/B8.5)

| ID | Estimand | H₀ | H₁ | Status |
|---|---|---|---|---|
| H-A1-A/B | Δ^LL = E[LL(Det-A/B) − LL(BKT-fit)] per family | ≥0.010 for some family | <0.010 for every family | Not run confirmatorily |
| H-A2-A/B | Δ^MAE = E[MAE(Det-A/B) − MAE(BKT-fit)] per family | ≥0.030 for some family | <0.030 for every family | Not run confirmatorily |
| H-B1 | Δ = E[K(C2) − K(C0)], f∈{S2,S3,S4-GF} | ≤0 for some f | >0 for every f | Not run confirmatorily |
| H-B2 | Δ_GF = E[K(C2) − K(C3)] in S4-GF | ≤0 | >0 | Not run confirmatorily |
| H-B3/H-B4 | Gating / graph-fidelity moderation | ≤0 | >0 | Not run confirmatorily |
| H-C1/H-C2 | Replay fidelity / trace reconstruction | — | — | Infrastructure built; not run at Tier-1 scale |

### 3.2 Proposed hypotheses — REVISED metric set (PROPOSED, A2, this
revision — not yet approved, not yet confirmatorily tested)

| ID | Estimand | H₀ | H₁ |
|---|---|---|---|
| H-A1-Brier-A/B | Δ^Brier = E[Brier(Det-A/B) − Brier(BKT-fit)] per family | ≥ margin (TBD by a dedicated precision run) for some family | < margin for every family |
| H-A2-RMSE-A/B | Δ^RMSE = E[RMSE(Det-A/B) − RMSE(BKT-fit)] per family | ≥ margin (TBD) for some family | < margin for every family |
| H-B1-QTM | Δ^attain = E[attainProb(C2) − attainProb(C0)], f∈{S2,S3,S4-GF} | ≤0 for some f | >0 for every f |
| H-B2-QTM | Δ^attain_GF = E[attainProb(C2) − attainProb(C3)] in S4-GF | ≤0 | >0 |
| H-B3/4-QTM | Gating / graph-fidelity moderation on restricted-mean QTM | ≤0 | >0 |

These mirror the original hypotheses' structure exactly, substituting
Brier for log loss, RMSE for MAE, and QTM attainment/restricted-mean for
K(T). They are **PROPOSED, not registered** — formal registration
requires the author/mentor review in Section 23, and their margins need
a dedicated precision run (Section 18.3, Section 4.7) before they can be
confirmatorily tested.

---

## 4. Metric Decision History and Protocol Reconciliation

This section is the required output of the coordinator's "metric
provenance audit." Every claim below is traced to a specific commit, file,
or document.

### 4.1 Timeline (SOURCE VERIFIED via `git log`)

| Date | Event |
|---|---|
| 2026-09-04 (commit `0a56f92`) | `docs/research-design.md` first committed — frames the research question partly around **"Questions-to-Mastery"** (exact phrase). No mention of "Brier," "RMSE," "log loss," or "K(T)." |
| 2026-10-23 to 2026-10-27 | Phase 8 (RISE adaptive-tutor research program) built: simulators, estimators, Track A/B runners. |
| 2026-10-27 (commit `48386a7`) | `src/research/phase8/trackA/runTrackA.ts` first committed — computes **log loss, `meanBrier`, and MAE (`maeLatent`)** per learner per estimator, all three, in the same commit. |
| 2026-10-27 (commit `218cd79`) | `protocol/phase8-protocol-v2.md` first committed — registers **log loss and MAE as primary** Track A metrics (B8.2) and **Brier score as a secondary diagnostic** (B8.7). Track B's primary outcome is **K(T)**; **`itemsToCriterion`/`itemsToCriterionCensored`** (ground-truth, already censoring-aware) is registered as a *secondary* outcome (B6.6). |
| 2026-10-27 | 8C-Pilot executed (13,560 runs). `src/research/phase8/pipeline/pilot.ts`'s aggregation retains only log-loss/MAE/K(T) per-world means — `meanBrier` and `itemsToCriterion` are computed internally (they pass through `TrackARunResult`/`TrackBSessionResult`) but **discarded before being written to `pilot-report.json`**. |
| (undated, this repository's own Stage-1-era material) | `docs/stage1-experimental-validity-report.md` (uncommitted) names **"the three intended paper metrics (Brier Score, Questions-to-Mastery, Latent-Mastery RMSE)"** explicitly, treating them as the paper's real target — but does not re-derive or validate them. |
| 2026-11-04 | This dossier's first pass flags the literal mismatch between the task brief's named metrics and the protocol's registered ones (documentation mismatch, not yet resolved). |
| 2026-11-05 (this revision) | Full provenance audit; `protocol/PROPOSED-AMENDMENT-A2-metric-reconciliation.md` drafted; `src/research/phase8/metrics/threeMetrics.ts` implemented and tested (30 new tests); `src/research/phase8/pipeline/threeMetricPilot.ts` built and run (new pilot-scale diagnostic, matched design to the 8C-Pilot); statistics and figures generated from the real output. |

### 4.2 Key provenance finding: the gap was persistence, not computation

`git log --all -S"Brier Score" / -S"Latent-Mastery RMSE"` returns **zero
commits** — those exact phrases, as metric names, were never committed to
any protocol or design document before this revision. "Questions-to-
Mastery" **was** committed, on day one, as part of the project's original
research-question framing (Section 3), seven weeks before the Phase 8
protocol existed.

But the *actual implementation* tells a different story than "these
metrics were never built": **`meanBrier` has been computed in
`src/research/phase8/trackA/runTrackA.ts` since the very commit that
introduced log loss** (`48386a7`), and **`itemsToCriterion`/
`itemsToCriterionCensored` — already a ground-truth-based, already-
censoring-aware Questions-to-Mastery definition, never an estimator's
self-declared threshold — has existed in
`src/research/phase8/trackB/runTrackB.ts`** since Track B was first
written. **RMSE was the one genuinely missing piece** — no code path
anywhere computed a squared-residual latent-recovery aggregate, although
the exact aligned `(pStarHat, pStarTrue)` pairs RMSE needs were already
present in every `TrackARunResult.predictions` row.

**Classification: documentation mismatch / correctable implementation
convenience — not a deliberate methodological rejection.** The Phase 8
protocol author chose log loss over Brier on a real, citable scientific
basis (B8.2 cites Gneiting & Raftery, 2007 for log loss's strict
propriety and sharper sensitivity to confident wrong predictions) and
registered Brier/items-to-criterion as secondary, but never reconciled
that choice against the project's own prior "Questions-to-Mastery"
framing, and the pilot orchestrator's aggregation step silently dropped
both already-computed secondary quantities rather than persisting them
alongside the primary ones. No approval, freeze, or author sign-off
exists for either metric set (Section 1.2) — this is a pre-experimental
correction, not a retroactive relabeling of a frozen result.

### 4.3 Was the original substitution ever "approved"? No — and neither
is this reconciliation

`protocol/APPROVAL.md` has never existed. The log-loss/MAE/K(T) choice in
`protocol/phase8-protocol-v2.md` is itself still a **draft**, not an
approved confirmatory commitment. This matters for how this reconciliation
is framed: it is not undoing an approved decision — it is completing a
decision that was always still open, before any confirmatory run exists
under any metric set. The reconciliation itself (`protocol/PROPOSED-AMENDMENT-A2-metric-reconciliation.md`)
is, symmetrically, **also not approved** — it is a proposal, exactly like
the protocol it would amend.

### 4.4 Exposure analysis — why this matters for future confirmatory
validity (the sharpest point in this section)

The original 5-world 8C-Pilot has already been examined and reported on
(Sections 19–22 of this dossier's prior-pass content, now Sections 25–29).
**Brier score and RMSE computed on those same 5 worlds are not
independent evidence of anything new** — they are alternative scoring
functions over the *identical* underlying per-response correctness
outcomes and per-step mastery trajectories that already produced the
examined log-loss/MAE/K(T) numbers. This revision's own new diagnostic
pilot (Section 24) deliberately reruns the same 5 worlds/3 slices (for
direct comparability and to prove the pipeline works), which is
**appropriate for an instrumentation-verification pilot but would NOT be
appropriate as a confirmatory run** — see the binding recommendation in
`protocol/PROPOSED-AMENDMENT-A2-metric-reconciliation.md` Section 2: any
future confirmatory run under the revised metrics must draw **fresh,
never-before-examined simulation worlds**, not relabel the already-
inspected five.

### 4.5 Which pilot results have already been examined (exposure ledger)

| Artifact | Worlds | Metrics computed | Examined in | Status |
|---|---|---|---|---|
| `pilot-report.json` (2026-10-27) | 5 (seeds 1-5, masterSeed `RISE-PHASE8-v2`) | log loss, MAE, K(T) | This dossier's first pass (2026-11-04) | EXAMINED |
| `three-metric-pilot-report.json` (2026-11-05, this revision) | **Same 5 worlds, same masterSeed, same slices** | Brier, RMSE, QTM (attainment/restricted-mean/curve) | This dossier's second pass (2026-11-05) | EXAMINED (by construction — same underlying data, new scoring) |

**No world has ever been generated and left unexamined under any metric.**
A genuine confirmatory run, under whichever metric set is eventually
approved, requires NEW seeds. This is named as the single most important
unresolved item in Section 39.

### 4.6 Decision on the three originally-registered metrics (per the
mandated keep/demote framework) — PROPOSED, A2

| Comparison | Decision | Reasoning |
|---|---|---|
| Log loss vs. Brier Score | **Brier becomes primary; log loss retained as secondary/robustness** | Brier is the metric the paper was scoped to report, is more interpretable (bounded [0,1]) to a non-specialist, and is still a strictly proper scoring rule. Log loss's real strength (sharper penalty on confident wrong predictions) makes it the right robustness check: a reversal between the two is itself informative. |
| K(T) vs. Questions-to-Mastery | **QTM (censored time-to-event) becomes primary; K(T) retained as secondary** | QTM directly answers the project's own original research question and properly treats non-attainment as censored rather than as if mastery occurred at the budget cutoff. K(T) is needed specifically to characterize *how close* censored (non-attaining) learners got — information QTM's binary attainment event discards. |
| MAE vs. Latent-Mastery RMSE | **RMSE becomes primary; MAE retained as secondary/robustness, computed from the identical aligned residuals** | RMSE is the originally-named metric and is more sensitive to occasional large latent-recovery failures (verified property, Section 22). MAE checks whether an RMSE-driven conclusion is an artifact of a few outlier learners. |

This keeps exactly three primary and three secondary metrics — it does
not balloon the study to six co-equal ones, per the task's own decision
rule. Full formal definitions: Sections 17–19. Full proposal text,
statistical plan, and sample-size recommendation:
`protocol/PROPOSED-AMENDMENT-A2-metric-reconciliation.md`.

### 4.7 What this reconciliation explicitly does NOT do

- Does not modify `protocol/phase8-protocol-v2.md` (left byte-for-byte
  unmodified — confirmed by checksum comparison before/after this
  revision's work).
- Does not retroactively change the EXPLORATORY status of anything
  reported in this dossier's first pass under the original metric set —
  all of that stands exactly as reported (now cross-referenced against
  the new metrics, Sections 25–29).
- Does not create or imply `protocol/APPROVAL.md`.
- Does not run or claim a confirmatory result under either metric set.
- Does not determine required confirmatory sample sizes for the new
  metrics (Section 4.4/18.3 — QTM in particular has different variance
  properties than K(T) and needs its own precision run before any
  confirmatory world count can be set).

---

## 5. Experimental Design Overview

**PROTOCOL REGISTERED** (B1.3, B1.4), unchanged by this revision.

| Track | Question | What varies | What is held fixed | Original primary outcome | Proposed (A2) primary outcome |
|---|---|---|---|---|---|
| A — estimation | Does the estimator know where the learner is? | Estimator | Response history (identical for every estimator) | Log loss; MAE | **Brier score; RMSE** |
| B — sequencing | Does the policy move the learner? | Selection policy | Learner profile and random streams (common random numbers) | Final true mastery K(T) | **Questions-to-Mastery (censored)** |
| C — traceability | Can decisions be reproduced and reconstructed? | — | — | Replay fidelity; trace reconstruction | Unchanged |

**Estimand population (B1.4, unchanged):**

```
Delta_f = E_{w~W_f}[ (1/3) * Sum_{s=1}^{3} E_{l~L_f(w,s)}[ d_{w,s,l} ] ]
```

Worlds, not learners, are the independent unit of inference (Section
22.1 / B8.1) under both metric sets, because learners within one world
share item noise, concept parameters, and (for S4) the true graph.

**Phases (B1.5):** 8A protocol → 8B implementation/validation → 8C-Pilot
(executed) → **metric reconciliation (this revision, new)** → 8C
confirmatory (not executed — gated on both `protocol/APPROVAL.md` and,
for the revised metrics, Amendment A2's acceptance) → 8D
analysis/writeup.

---

## 6. Complete System Architecture

**SOURCE VERIFIED**, unchanged from the first pass except for one new
module. The repository implements, as one codebase, both the student-
facing tutoring application (Stages 1–3) and the Phase 8 computational
research pipeline. They share the canonical RISE question bank and
curriculum (Section 7) but are architecturally separate.

**Phase 8 module map** (`src/research/phase8/`, SOURCE VERIFIED):

| Module | Role |
|---|---|
| `config/load.ts` | Loads/validates versioned simulator/estimator/experiment-plan configs |
| `rng/derive.ts` | Counter-based seed derivation |
| `slices/selectSlices.ts` | Curriculum-slice selection (original + Amendment A1's concept-subgraph rule) |
| `simulator/{s1,s2,s3,s4}.ts`, `shared.ts`, `trueGraph.ts` | The four Tier 1 learner families |
| `simulator/dispatch.ts` | Family dispatcher, the only channel through which a policy/estimator observes a simulated learner |
| `estimators/{baseRate,bkt,bktEm,ema,link,runProp}.ts` | The seven Tier 1 estimators |
| `trackA/{runTrackA,schedule}.ts` | Track A procedure |
| `trackB/{runTrackB,c0Slice}.ts` | Track B procedure |
| `pipeline/pilot.ts` | The ORIGINAL 8C-Pilot orchestrator (untouched by this revision) |
| **`pipeline/threeMetricPilot.ts`** | **NEW, this revision** — an additive diagnostic orchestrator that calls the SAME unmodified `runTrackA`/`runTrackBSession`, retaining Brier/RMSE/QTM data the original orchestrator discards |
| **`metrics/threeMetrics.ts`** | **NEW, this revision** — pure, independently-tested Brier/RMSE/QTM functions |
| `persistence.ts` | Per-run durable storage (Stage 2 integration) |

**Research infrastructure it builds on (unmodified, SOURCE VERIFIED):**
the Phase 5 experiment engine, Phase 6 artifact/manifest/replay/export
infrastructure, and Stage 2's durable SQLite session store.

---

## 7. Question Bank and Curriculum

**SOURCE VERIFIED** (`data/question-bank/MANIFEST.json`), unchanged:

| Property | Value |
|---|---|
| Dataset version | `rise-question-bank-v1` |
| Question count | 1,840 |
| Concept count | 109 |
| Misconception count | 68 |
| Prerequisite edge count | 204 |
| Chapters | 14 (CH01–CH14) |

**Slices actually used in Phase 8 (Amendment A1, Section 38, SOURCE
VERIFIED):** CH07, CH03, CH10 (primary); CH12 (reserve, unused). Both
pilots in this dossier (original and three-metric) use these identical
three slices.

---

## 8. Deterministic Mastery Model

**SOURCE VERIFIED** against `src/domain/learner-model/parameters.ts`,
unchanged by this revision.

### 8.1 Parameters

| Parameter | Symbol | Value |
|---|---|---|
| Correct gain rate | alpha | 0.12 |
| Incorrect loss rate | beta | 0.10 |
| Initial mastery | M0 | 0.5 |
| Difficulty weights | w(L1..L5) | 0.8, 0.9, 1.0, 1.1, 1.2 |
| Variant A | w_d' = w_d | "multiplicative" |
| Variant B | w_d' = 1/w_d | "inverse" |

```
a = c * alpha * w_d           (correct branch)
b = c * beta * w_d'           (incorrect branch)
M' = M + a(1-M)                on correct
M' = (1-b)M                    on incorrect
```

### 8.2 Nine analytical properties (PROTOCOL REGISTERED, B2 — unchanged,
all exact unless noted)

- **R1 Boundedness (exact).** M' in [0,1] whenever M in [0,1].
- **R2 Convergence of the mean.** `M-infinity_A(p) = p*alpha / (p*alpha + (1-p)*beta)`; `M-infinity_B(p,w) = p*alpha*w^2 / (p*alpha*w^2 + (1-p)*beta)`.
- **R3 Mixed difficulty levels.** Variant A's long-run mean under mixed
  item difficulty is a difficulty-weighted accuracy, not difficulty-blind.
- **R4 Stationary spread (L3 example).** p=0.50 -> mean 0.545, SD 0.120.
- **R5 Mean-equivalent accuracies.** Remediation threshold 0.35 <-> p~=0.310 (Variant A, single level).
- **R6 Guessing floor.** A pure guesser (p=0.25) has long-run mean 0.286,
  SD 0.111 — below the remediation threshold on average but often above
  it in realization. **Mastery is not a calibrated probability of
  knowing** — this is the direct justification for forbidding that claim
  (Section 32.3).
- **R7 Speed of progression.** Minimum 6 consecutive correct answers from
  a cold start on the real default selection path (L2x3, L3, L4, L4).
- **R8 Memory of the mean.** Half-life ~6 responses at L3.
- **R9 Revocability.** One incorrect answer at M=0.75 drops to ~0.668-0.682.

---

## 9. BKT and Other Estimators

**SOURCE VERIFIED**, unchanged.

| ID | Definition | Role |
|---|---|---|
| Det-A / Det-B | Implemented mastery model Variants A/B, frozen | Confirmatory focal estimators |
| BKT-fit | 4-parameter BKT, fitted per concept via bounded multi-start EM (6 starts: top-5 of a 225-point coarse grid + BKT-default) | Confirmatory comparator |
| BKT-default | Same model, untuned (P(L0)=0.5, P(T)=0.1, G=0.25, S=0.1) | Matched untuned comparator |
| RunProp | Laplace-smoothed proportion correct | Simple baseline |
| EMA | lambda=0.11 exponential moving average | Isolates value of asymmetric rates + difficulty weighting |
| B0 | Per-(concept,level) calibration correct rate | Static reference |

**8C-Pilot BKT fit diagnostics (ARTIFACT VERIFIED):** 760 total fits, 129
near a parameter bound, 0 multimodal, 27 hit the iteration cap, 0
failures.

**Calibration link (B4.5):** every raw score passes through the same
post-hoc logistic recalibration (Link-D/Link-1) before being scored as a
probability, so scale differences between M, P(L), and a raw proportion
cannot bias any comparison — this applies identically whether the scored
quantity is log loss or Brier (both operate on the same `pLinkD`/
`pStarHat` value).

---

## 10. Adaptive Selection Policy

**SOURCE VERIFIED**, protected, unmodified. Decision order per call:
target-concept selection (`insufficient_evidence` / `progression` /
`remediation` / `prerequisite_backtrack` / `diagnostic_probe` /
`no_eligible_concept`) -> target-difficulty selection -> candidate
filtering (concept -> exposure -> family-limit -> difficulty) ->
candidate scoring/tie-break -> fallback widening. Every call produces a
full, auditable `AdaptiveSelectionTrace`.

---

## 11. Non-Adaptive Control Policy

**SOURCE VERIFIED**, protected, unmodified. Two distinct non-adaptive
policies exist: the student-facing `NonAdaptiveSelectionPolicy` (Stage
0/1, structurally incapable of reading performance data) and **C0-slice**
(`src/research/phase8/trackB/c0Slice.ts`), the Phase 8 Track B comparator
— same `Q_slice` pool, same budget, same curriculum order as the adaptive
conditions, differing in every adaptive mechanism simultaneously (B6.2).

---

## 12. Synthetic Learner Simulator

**PROTOCOL REGISTERED** (B3), unchanged. Four families: S1 (stationary
logistic, an implementation check — mastery never changes), S2 (BKT-
generative), S3 (practice-driven continuous, AFM-like), S4 (prerequisite-
gated binary, 4 cells: S4-ref, S4-GF gated+faithful, S4-N no-gating,
S4-GW gated+wrong-graph). No family uses the tutor's own mastery equation
or thresholds — the design property that makes Track A/B non-circular.
Ground truth (p*, m, mastered) is never exposed to any estimator or
policy (G-13's runtime truth-isolation check).

**Mastered-threshold definitions, used identically by Questions-to-
Mastery (Section 18):** theta >= ln(4) for S1; L=1 for S2/S4; sigma(theta)
>= 0.8 for S3.

---

## 13. Original Phase 8B/8C/8D Roadmap

**SOURCE VERIFIED**, from `CLAUDE.md` and `protocol/phase8-protocol-v2.md`
B1.5, reproduced here for traceability since the new metric work sits
inside this roadmap, not alongside it.

| Phase | Content | Status |
|---|---|---|
| 8A | Protocol design (`protocol/phase8-protocol-v2.md`) | Drafted, not frozen |
| 8B | Implementation: simulators, estimators, Track A/B runners, config/seed infrastructure | Complete (SOURCE VERIFIED, 10 `phase8b:` commits) |
| 8C-Pilot | Outcome-blind precision and feasibility pilot (B9.2/B9.3) | Executed once, 13,560 runs, 2026-10-27 |
| **Metric reconciliation (this revision, unnumbered, inserted between 8C and 8C-confirmatory)** | Resolve the Brier/QTM/RMSE vs. log-loss/MAE/K(T) mismatch; implement, test, and pilot the three originally-intended metrics | Done — this dossier and `protocol/PROPOSED-AMENDMENT-A2-metric-reconciliation.md` |
| 8C confirmatory | Full-scale confirmatory execution | **Not executed — gated on `protocol/APPROVAL.md` and, additionally, Amendment A2's acceptance if the revised metrics are to be primary** |
| 8D | Analysis and writeup | Not started (depends on 8C confirmatory) |

This insertion point is deliberate: reconciling the metric definitions
*before* any confirmatory run (rather than after) is what makes this a
genuine pre-experimental correction rather than a result-driven metric
swap (Section 4.3).

---

## 14. Track A Methodology

**PROTOCOL REGISTERED** (B5), unchanged by this revision. Slices: CH07,
CH03, CH10. Schedule: "blocked-with-review" (6 items/external-prereq
concept, then 12 items/target concept with a review item every 4th).
Procedure per (family configuration, world, slice): 100 calibration + 100
test learners; every estimator fit on calibration only; every test
learner replayed through every estimator with frozen fits; **every
per-response prediction row (`PredictionRow`) already carries everything
needed for Brier AND RMSE** (`pLinkD`/`pStarHat`, `correct`, `pStarTrue`)
— this revision added no new simulation or estimation step, only new
scoring functions applied to data the runner already produced.

---

## 15. Track B Methodology

**PROTOCOL REGISTERED** (B6), unchanged by this revision. T_c in
topological curriculum order; X_c deliberately outside that order;
budget T=60; **`itemsToCriterion`/`itemsToCriterionCensored`, the
ground-truth basis for this revision's Questions-to-Mastery metric, was
already computed by `runTrackBSession` as "first step at which every T_c
concept is TRULY mastered," per the Section 12 mastered-threshold
definitions — never an estimator's own threshold, and already matched
across C0/C1/C2/C3 (same slice, same budget, same learner identity/seed).**
This revision added no new session logic, only a new aggregation
(`questionsToMasteryAnalysis`) over an already-existing field.

---

## 16. Experimental Configurations and Sample Sizes

**PROTOCOL REGISTERED / RUNTIME VERIFIED.**

| Config axis | Track A | Track B |
|---|---|---|
| Simulator configurations | S1, S2, S3, S4-ref | S1 (check), S2, S3, S4-GF, S4-N, S4-GW |
| Worlds (Tier 1 confirmatory target, original metrics) | 20 | 20 (S1: 5) |
| Worlds (executed, both pilots) | **5** | **5** |
| Slices | 3 (CH07, CH03, CH10) | 3 (same) |
| Learners per world-slice | 100 cal + 100 test | 50, each under every policy |

**Both pilots executed in this repository (ARTIFACT VERIFIED):**

| Pilot | Metrics | Total runs | Failures | Wall-clock |
|---|---|---|---|---|
| 8C-Pilot (2026-10-27) | log loss, MAE, K(T) | 13,560 | 0 | 386,877 ms |
| Three-metric pilot (2026-11-05, this revision) | Brier, RMSE, QTM | see Section 24 | see Section 24 | see Section 24 |

**Confirmatory sample size under the revised metrics: UNKNOWN** — a
dedicated precision run (B9.2-style, but scored on Brier/RMSE/QTM
variance, on fresh worlds) has not been done. The original 20-92-world
table (Section 18.3 below) is specific to log loss/MAE/K(T) and should
not be assumed to transfer.

---

## 17. Primary Metric 1 — Brier Score

**Definition (implemented and tested this revision,
`src/research/phase8/metrics/threeMetrics.ts`):**

```
Brier = (1/N) * Sum[(p_i - y_i)^2]
```

`p_i` = predicted P(correct), **recorded before the response was
observed** — in this codebase, the same `pLinkD`/`pStarHat` value Track A
already produces per response in `PredictionRow`, which is itself
produced from the estimator's state at the moment BEFORE that response
was scored (the estimator update happens strictly after the prediction is
recorded — confirmed by direct read of `runTrackA.ts`'s per-step loop
order). `y_i` = observed binary correctness (`PredictionRow.correct`).

**Aggregation levels supported:** per-response (raw), per-learner (mean
over a learner's full response sequence — `LearnerMetricRow.meanBrier`,
already computed by the protected, unmodified Track A runner), per-world
(mean over learners within a world/slice, this revision's addition), per-
simulator-family (Section 25), per-slice (implicit in the per-world
pooling across the 3 slices). **Matched comparisons:** Det-A/Det-B vs.
BKT-fit on the SAME frozen, identical response sequence per test learner
(B4.4's fairness audit — every estimator scores the exact same stream).
**Independence handling:** inference is at the WORLD level (Section
22.1), never treating individual responses from the same simulated
learner as independent replicates — exactly the dependence structure the
task flagged as a risk, already avoided by construction.

**Verification (TEST VERIFIED, `tests/research/phase8/threeMetrics.test.ts`,
30/30 passing):** perfect predictions score exactly 0; maximally-
confident-wrong predictions score exactly 1; an independently hand-
computed 4-row mixed case matches to 10 decimal places; a predicted
probability outside [0,1] is rejected, never clamped; empty input is
rejected, never silently returning 0 or NaN.

**Calibration:** `calibrationBins()` (new, this revision) produces
reliability-diagram bins, but **no figure was rendered from it** — the
pilot orchestrator (`threeMetricPilot.ts`) retains only per-learner/per-
world aggregate Brier means, not the raw per-response `(p, y)` pairs a
calibration plot needs. This is a named, explicit **"requires further
instrumentation"** gap (Section 21), not a fabricated figure. Predictions
are never adjusted to improve their own calibration score (task
requirement, honored by construction — no recalibration step exists
anywhere between prediction and scoring).

---

## 18. Primary Metric 2 — Questions-to-Mastery

**Definition (implemented and tested this revision):** a censored
time-to-event analysis over `itemsToCriterion`/`itemsToCriterionCensored`
— quantities **already computed by the protected, unmodified**
`src/research/phase8/trackB/runTrackB.ts` as "the first step at which
every target concept (`T_c`) is TRULY mastered" (per the simulator's own
ground-truth `mastered` boolean — Section 12's per-family thresholds),
**never an estimator's self-declared threshold**. A learner who exhausts
the fixed 60-question budget without reaching this criterion is
**censored**, never recorded as if mastery occurred at the budget cutoff.

```
attainmentProbability = nAttained / n
medianQtm             = first step at which cumulative (Kaplan-Meier) attainment >= 0.5, else null (never approximated)
restrictedMeanQtm     = mean(min(itemsToCriterion_i, budget))   -- exactly equals the standard RMST under this
                        design's fixed, single-horizon (type-I) censoring (no censoring ever occurs before
                        the budget) -- proven algebraically and cross-checked by an independent brute-force
                        test (tests/research/phase8/threeMetrics.test.ts)
```

**Matched conditions (already true by construction, verified this
revision by direct code read, not assumed):** C0/C1/C2/C3 run on the same
`Q_slice` pool, the same curriculum scope, the same simulated learner's
initial state (same seed/identity), the same simulator-family parameters,
the same mastery criterion, and the same 60-question budget
(`src/research/phase8/trackB/runTrackB.ts`, `RunTrackBSessionOptions`).

**Cumulative attainment curve:** a Kaplan-Meier-style step function,
monotonically non-decreasing, bounded in [0,1], verified by a dedicated
invariant test on a 10-row synthetic set with both attained and censored
rows.

**Verification (TEST VERIFIED, 30/30 in `threeMetrics.test.ts`):**
immediate mastery for every learner gives median=1, attainment=1,
RMST=1; all-censored gives attainment=0, median=**null** (never silently
reported as the budget value), RMST=budget; sub-50%-attainment correctly
leaves median null; exactly-at-50% correctly resolves to the first
qualifying step; mismatched budgets across rows are rejected (a matched-
condition requirement); internally inconsistent censored/non-censored
rows are rejected; an `itemsToCriterion` outside `[1, budget]` is
rejected.

---

## 19. Primary Metric 3 — Latent-Mastery RMSE

**Definition (implemented and tested this revision, the one genuinely
NEW computation — no prior code path computed this):**

```
RMSE = sqrt((1/N) * Sum[(Mhat_i - Mtrue_i)^2])
```

`Mhat_i` = the estimator's predicted mastery for the hypothetical
reference item (`PredictionRow.pStarHat`, already computed by the
protected Track A runner). `Mtrue_i` = the simulator's ground truth
(`PredictionRow.pStarTrue`), from the SAME row — alignment by learner,
concept, step, condition, simulator family, and curriculum slice is
automatic because both values originate from the identical
`PredictionRow`, never a separate join. **MAE is computed from the exact
same aligned residuals**, never a separately-sourced value, and is never
substituted for RMSE in a primary table (task requirement, honored by
construction — `latentRmseAndMae()` returns both from one pass over one
input array).

**Aggregation:** per-learner (one RMSE per learner, computed by this
revision's pilot script from that learner's full prediction sequence) ->
per-slice mean -> per-world mean, matching the exact aggregation grain the
original pilot used for MAE (mean-of-per-learner-means, not a single
pooled mean over all responses — this avoids giving disproportionate
weight to learners with longer response sequences, addressing the task's
explicit "avoid unequal weighting from different session lengths"
requirement; Track A's schedule length is fixed per family configuration,
so this is largely moot here, but the aggregation choice is still
documented for transparency).

**Outlier sensitivity (TEST VERIFIED, the stated property, independently
demonstrated):** on a reference set of three errors of 0.1 and one error
of 0.9, MAE = 0.300 but RMSE = sqrt(0.21) = 0.4583 — RMSE is
mechanically more sensitive to the single large error, exactly the
property motivating RMSE's selection as primary (Section 4.6): this
study has independent reason (R6, the guessing-floor property, Section
8.2) to expect occasional large latent-recovery failures from guessing
learners, which RMSE will not average away the way MAE does.

---

## 20. Secondary Metrics and Their Justification

| Metric | Role | Why retained (not dropped) |
|---|---|---|
| Log loss | Secondary robustness check for Brier | Strictly proper, sharper penalty on confident-wrong predictions (Gneiting & Raftery, 2007); if a Brier-based conclusion reverses under log loss, that reversal is itself scientifically informative (Section 25.3). |
| K(T) (final true mastery, continuous) | Secondary characterization metric for QTM's censored/non-attaining population | QTM's binary attainment event discards *how close* a non-attaining learner got; K(T) answers exactly that residual question. Section 26 shows a case (S4-GF) where K(T) and QTM give genuinely different qualitative pictures — both are needed to understand why. |
| MAE (latent recovery) | Secondary robustness check for RMSE | Confirms whether an RMSE-driven conclusion is dominated by a small number of outlier learners (Section 19) rather than a systematic pattern. |

None of the three secondary metrics is dropped; none is promoted to
primary; none is used to justify a conclusion the corresponding primary
metric does not itself support.

---

## 21. Metric Data Availability and Instrumentation

Classification per the task's five-way scheme: **Available** (stored,
valid) / **Reconstructable** (recoverable without inventing anything) /
**Requires instrumentation** (exists during simulation but not preserved)
/ **Requires methodological change** / **Unavailable**.

| Field needed | Brier | QTM | RMSE |
|---|---|---|---|
| Per-response predicted probability (pre-outcome) | **Requires instrumentation** — computed in `runTrackA.ts` every step, but neither the original `pilot.ts` nor this revision's `threeMetricPilot.ts` persists raw per-response rows (only per-world aggregate means); extending `threeMetricPilot.ts` to retain them is straightforward but was not done this round (artifact-size tradeoff) | n/a | **Requires instrumentation** (same row, same gap) |
| Per-response observed correctness | Same as above | n/a | n/a |
| Per-learner/per-world aggregate (meanBrier / RMSE) | **Available**, this revision (`three-metric-pilot-report.json`) | n/a | **Available**, this revision |
| Ground-truth `itemsToCriterion`/censoring flag | n/a | **Available**, this revision (pooled per-world rows retained) | n/a |
| Ground-truth per-response `mTrue`/`pStarTrue` | n/a | n/a (QTM uses the session-level criterion, not per-response truth) | **Available** (used to compute the per-learner RMSE already in the stored stats) |
| Reliability/calibration bins (raw p,y pairs) | **Requires instrumentation** (not retained this round) | n/a | n/a |
| Representative individual mastery trajectories (per-step, per-learner) | n/a | **Requires instrumentation** (session-level outcome retained; step-by-step trajectory is not) | n/a |
| Confirmatory-scale world count | **Requires methodological change** (new precision run on fresh worlds, Section 18.3/A2 Section 7) | Same | Same |

**Nothing in this table is "Unavailable."** Every gap is "requires
instrumentation" — a straightforward, bounded extension of code this
revision already built and verified, not a redesign of the simulator,
estimator, or selection policy. No historical trajectory or prediction
was fabricated to fill any gap.

---

## 22. Scientific Verification Results

**TEST VERIFIED, this revision.** Original Phase 8 suite, re-confirmed
unchanged:

```
npx vitest run tests/research/phase8/          -> 14 files, 114 tests passing (unchanged)
```

**New, this revision:**

```
npx vitest run tests/research/phase8/threeMetrics.test.ts  -> 1 file, 30 tests passing
```

Covering (Section 2's required edge cases, all present): all-correct,
all-incorrect, perfect predictions, confident-wrong predictions, no
mastery ever attained (fully censored), immediate mastery attained,
mismatched/inconsistent censoring flags, out-of-range `itemsToCriterion`,
outlier sensitivity (RMSE vs. MAE), zero-variance paired differences (no
divide-by-zero), and the Student-t implementation independently
re-verified against the same known critical values as the original
`analysis/stats.ts` (t=2.776,df=4 -> p~=0.0500; t=4.604,df=4 -> p~=0.0100).

**Full-repository regression (TEST VERIFIED, this revision):** see
Section 36 for the complete, exact command-by-command results run at the
end of this task.

**What was NOT independently re-verified this revision:** a byte-level
replay/reconstruction check (H-C1/H-C2) specifically for the new
three-metric pilot run (the existing Stage 2 replay infrastructure
applies unchanged to any `TrackBSessionResult`-based run, but was not
re-exercised against this specific new artifact) — named as a gap in
Section 39.

---

## 23. Protocol Approval and Amendment Status

- `protocol/APPROVAL.md`: **does not exist** (checked directly, this
  revision). No confirmatory run, under any metric set, is authorized.
- `protocol/phase8-protocol-v2.md`: unmodified by this revision (verified
  byte-for-byte unchanged).
- `protocol/AMENDMENTS.md`: unmodified by this revision — Amendment A1
  (slice selection, Section 38) remains its only entry.
- `protocol/PROPOSED-AMENDMENT-A2-metric-reconciliation.md`: **new, this
  revision**. Status: PROPOSAL ONLY, not reviewed, not accepted, not
  applied. Does not modify the protocol document itself. Full content:
  Section 4 summarizes it; the file itself is the complete, ready-to-
  review text.
- No approval file of any kind was created by this task, consistent with
  the explicit instruction not to bypass this gate.

---

## 24. Experiments Actually Executed

**Original 8C-Pilot (ARTIFACT VERIFIED, unchanged, untouched by this
revision):** 13,560 runs, 0 failures, 5 worlds, slices CH07/CH03/CH10,
generated 2026-10-27T14:58:15.938Z, wall-clock 386,877 ms. Metrics: log
loss, MAE, K(T).

**New three-metric diagnostic pilot (RUNTIME VERIFIED, this revision):**
`research-output/phase8/pilot/three-metric-pilot-report.json`, generated
by `src/research/phase8/pipeline/threeMetricPilot.ts`
(`npx tsx scripts/run-three-metric-pilot.ts`).

| Property | Value |
|---|---|
| Total runs | 13,560 |
| Failures | 0 |
| Pilot worlds | 5 (same seeds/masterSeed as the original 8C-Pilot — deliberate, for direct comparability; see Section 4.4's exposure caveat) |
| Slices | CH07, CH03, CH10 (identical to the original pilot) |
| Wall-clock | 345,013 ms (~5.75 min) |
| Metrics captured | Brier, RMSE (Track A, per-world, per-family); QTM rows — `itemsToCriterion`/censoring (Track B, pooled per-world, per-config) |

**Operational note (full honesty, not a methodological issue):** the
first execution attempt was launched with a shell-backgrounding mistake
(a manual `&` combined with the harness's own background-run mechanism)
that orphaned the process; a second, correctly-backgrounded attempt then
correctly refused to overwrite the artifact the orphaned first run had
already completed writing (`scripts/run-three-metric-pilot.ts`'s explicit
no-overwrite guard fired as designed). Exactly one real, complete,
0-failure pilot execution exists and is the sole source for Sections
25–29 — verified by checking `totalRuns`/`failureCount` directly against
the stored file before any analysis was run on it.

This pilot is **EXPLORATORY / PILOT-SCALE**, same authorization tier as
the original 8C-Pilot (no `protocol/APPROVAL.md` exists) — never
confirmatory, and, per Section 4.4, **reusing the same 5 already-examined
worlds**, so it additionally can never retroactively become a blind
confirmatory test even if Amendment A2 is later accepted.

---

## 25. Brier Score Results

**EXPLORATORY / PILOT-SCALE (n=5 worlds). ARTIFACT VERIFIED computation,
EXPLORATORY interpretation.** Source:
`research-output/phase8/final/three_metric_pilot_stats.json`, computed by
`analysis/threeMetricStats.ts` from the real pilot in Section 24.

| Family | Det-A mean Brier | BKT-fit mean Brier | Diff (Det-A − BKT-fit) | t(4) | p | 95% CI |
|---|---|---|---|---|---|---|
| S1 | 0.2365 | 0.2383 | −0.0018 | −6.42 | 0.0030 | [−0.00264, −0.00105] |
| S2 | 0.1786 | 0.1697 | +0.0088 | 14.57 | 0.0001 | [0.00714, 0.01050] |
| S3 | 0.2289 | 0.2295 | −0.00055 | −1.86 | 0.1362 | [−0.00137, 0.00027] |
| S4-ref | 0.1879 | 0.1759 | +0.0119 | 37.00 | 0.0000032 | [0.01105, 0.01284] |

### 25.1 Reading this table

Every p-value is a 5-world, df=4 exploratory estimate — **not** a
confirmatory decision (Section 18.3's required-W table, computed for log
loss, is 20–92 worlds; no equivalent table yet exists for Brier). The
qualitative pattern — BKT-fit ahead in S2/S4-ref, no detectable
difference in S3, Det-A ahead in S1 (the no-learning implementation
check) — is **directionally identical to the original log-loss pattern**
(Section 21 of the prior dossier pass), a real, independently-computed
robustness confirmation under a different, primary scoring rule.

### 25.2 Cross-metric robustness check (Figure 8, Section 31)

Comparing the Det-A-minus-BKT-fit sign and rough magnitude under Brier
(primary) vs. log loss (secondary, from the original pilot) for all four
families: **no sign reversal in any family.** This is a real, positive
robustness finding — the choice between Brier and log loss as the
primary Track A metric does not change which estimator looks better in
any family at this pilot scale.

---

## 26. Questions-to-Mastery Results

**EXPLORATORY / PILOT-SCALE (n=5 worlds, 750 pooled learner-slice
observations per condition per config for the "pooled" figures below).**
Source: same artifact as Section 25.

### 26.1 Attainment probability within budget (T=60), pooled across worlds

| Config | C0 (non-adaptive) | C2 (adaptive) | C3 (prereq-unaware) |
|---|---|---|---|
| S1 | 0% | 0% | 0% |
| S2 | 26.9% | 8.1% | 23.2% |
| S3 | 1.9% | 0.7% | 1.2% |
| S4-GF | 1.7% | 0.3% | 0.5% |
| S4-N | 36.8% | 6.1% | 21.2% |
| S4-GW | 1.6% | 0.1% | 1.3% |

**S1: zero attainment under every policy** — consistent with S1's role as
an implementation check (no learner's fixed, randomly-drawn initial
theta happened to exceed the mastery threshold on *every* target concept
simultaneously in this pilot's specific draws; S1 mastery never changes
regardless of policy, Section 12).

### 26.2 Restricted-mean Questions-to-Mastery (censored at 60; lower = better), pooled

| Config | C0 | C2 | C3 |
|---|---|---|---|
| S2 | 57.02 | 58.81 | 56.51 |
| S3 | 59.76 | 59.84 | 59.81 |
| S4-GF | 59.89 | 59.94 | 59.93 |
| S4-N | 57.08 | 59.29 | 57.41 |
| S4-GW | 59.85 | 59.99 | 59.88 |

### 26.3 Paired world-level contrasts (attainment probability, C2 − C0)

| Config | Mean diff | t(4) | p | 95% CI |
|---|---|---|---|---|
| S2 | −0.188 | −12.82 | 0.0002 | [−0.229, −0.147] |
| S3 | −0.012 | −1.69 | 0.167 | [−0.032, 0.008] |
| S4-GF | −0.0147 | −2.99 | **0.040** | [−0.0283, −0.0011] |
| S4-N | −0.307 | −23.29 | 0.00002 | [−0.343, −0.270] |
| S4-GW | −0.0147 | −2.99 | **0.040** | [−0.0283, −0.0011] |

### 26.4 The central, honest finding of this section — a genuine
metric-dependent divergence (must not be smoothed over)

**Under K(T) (the original pilot, Section 20 of this dossier's history),
S4-GF was the ONE configuration where adaptive sequencing (C2) beat
non-adaptive (C0)** (+0.0238 mean K(T) difference, Section 22.3 of the
prior pass). **Under Questions-to-Mastery, C2 is WORSE than C0 in EVERY
SINGLE configuration tested, including S4-GF** (attainment-probability
diff −0.0147, p=0.040; restricted-mean diff essentially flat, both near
the 60-question ceiling). This is not a contradiction or an error in
either computation — it is a real property of the two metrics measuring
genuinely different things:

- **K(T)** is a continuous average of per-concept mastery at the end of
  the session — a learner can raise several concepts' mastery partway
  without ever getting any single one, let alone all of them, to the
  binary "truly mastered" threshold.
- **Questions-to-Mastery's attainment event requires EVERY target
  concept to cross the mastered threshold SIMULTANEOUSLY** — a much
  stricter, all-or-nothing criterion. Spreading practice across more
  concepts (exactly what adaptive sequencing's prerequisite-aware
  mechanism is designed to do) can raise average K(T) while *lowering*
  the chance that any one session ever gets every concept fully over the
  line within a fixed, 60-question budget.

**This divergence is itself a legitimate, reportable finding** — it
demonstrates concretely why the metric-reconciliation work in Section 4
matters scientifically, not just administratively: the paper's
conclusion about whether prerequisite-aware sequencing "helps" in the one
theoretically-favored cell (S4-GF) depends materially on which of the two
originally-conflated metric sets is used to answer it. Neither reading is
wrong; they answer different questions, and both must be reported,
explicitly flagged as pilot-scale and exploratory, in any future paper
draft (Section 32.1).

---

## 27. Latent-Mastery RMSE Results

**EXPLORATORY / PILOT-SCALE (n=5 worlds).** Source: same artifact as
Section 25.

| Family | Det-A mean RMSE | BKT-fit mean RMSE | Diff (Det-A − BKT-fit) | t(4) | p | 95% CI |
|---|---|---|---|---|---|---|
| S1 | 0.1280 | 0.1348 | −0.0068 | −5.31 | 0.0060 | [−0.01041, −0.00326] |
| S2 | 0.2500 | 0.2318 | +0.0182 | 12.98 | 0.0002 | [0.01428, 0.02204] |
| S3 | 0.1445 | 0.1457 | −0.0012 | −0.98 | 0.3829 | [−0.00461, 0.00220] |
| S4-ref | 0.2619 | 0.2368 | +0.0251 | 37.08 | 0.0000032 | [0.02325, 0.02701] |

**Cross-check against MAE (secondary, Section 20):** the original
pilot's MAE table showed the identical qualitative pattern (BKT-fit ahead
in S2/S4-ref, no detectable difference in S3, Det-A ahead in S1), and
every RMSE value here is, as expected, numerically larger than its
corresponding MAE value for the same family/estimator (RMSE >= MAE
always, by Jensen's inequality) — **no reversal between RMSE (primary)
and MAE (secondary) in any family**, a second independent robustness
confirmation alongside Section 25.2's Brier/log-loss check.

---

## 28. Statistical Comparisons

**Framework (PROTOCOL REGISTERED, B8.1, unchanged; applied identically
to the new metrics this revision):** world as the unit of analysis;
one-sample paired t-test on world-level aggregates; Holm correction
across confirmatory estimands (not applicable yet — no estimand here is
confirmatory); intersection–union logic for cross-family claims (not yet
applicable for the same reason).

**What this revision adds:** `src/research/phase8/metrics/threeMetrics.ts`'s
`pairedTTest` is the exact same arithmetic as `analysis/stats.ts`'s
original implementation (both independently validated against the same
textbook critical values), applied here to Brier/RMSE/QTM differences
instead of log-loss/MAE/K(T) differences — ensuring the ORIGINAL and
REVISED metric analyses are statistically comparable in method, differing
only in which quantity is scored.

**No p-value in Sections 25–27 is a confirmatory decision.** Every one is
a 5-world (df=4) exploratory estimate, reported for direction and
magnitude only, exactly as the original pilot's log-loss/MAE/K(T)
analysis was reported (Section 22.4 of this dossier's prior-pass
content, preserved below in Section 29 for continuity).

**Multiplicity:** not applied — Holm correction presupposes a defined
confirmatory estimand set, which does not yet exist for the revised
metrics (Section 18.3/4.6).

---

## 29. Robustness and Sensitivity

**Cross-metric robustness (new, real, this revision — the task's own
requested "robustness plots," Section 31 Figure 8):**

- Brier vs. log loss (Track A, Det-A vs. BKT-fit): **no sign reversal in
  any of the 4 families** (Section 25.2).
- RMSE vs. MAE (Track A, same comparison): **no sign reversal in any
  family**, and RMSE >= MAE everywhere as mathematically required
  (Section 27).
- K(T) vs. Questions-to-Mastery (Track B, C2 vs. C0): **one material
  reversal, in S4-GF** (Section 26.4) — the single most important
  robustness finding in this revision, because it is a genuine
  qualitative disagreement between two defensible primary metrics, not
  noise.

**Formal sensitivity analyses (permutation, cluster bootstrap, B8.1):**
not run, for the same reason as the original pilot — a 5-world pilot has
at most 2^5=32 distinct sign patterns, far short of what a meaningful
permutation test needs. Unchanged limitation from the prior pass.

**Tier 2 one-at-a-time sensitivity sweep (B9.4):** out of scope,
unchanged.

---

## 30. Publication-Ready Tables

**Table 1 — Mastery-model parameters and analytical properties.**
Section 8. Unchanged from the prior pass.

**Table 2 — Brier Score, Det-A vs. BKT-fit, per family.** Section 25's
table. Caption: *"Exploratory, pilot-scale (5 worlds) Brier-score
comparison, primary Track A metric under the reconciled metric framework
(protocol/PROPOSED-AMENDMENT-A2-metric-reconciliation.md). Source:
research-output/phase8/final/three_metric_pilot_stats.json."*

**Table 3 — Latent-Mastery RMSE, Det-A vs. BKT-fit, per family.**
Section 27's table, same caption pattern.

**Table 4 — Questions-to-Mastery: attainment probability and restricted
mean, by policy and configuration.** Sections 26.1/26.2's tables combined.
Caption: *"Exploratory, pilot-scale (5 worlds, 750 pooled learner-slice
observations per cell) Questions-to-Mastery analysis, primary Track B
metric under the reconciled framework. Censored observations (budget
exhausted without attaining mastery) contribute `budget`=60 to the
restricted mean, never imputed as attained."*

**Table 5 — Required confirmatory world count, original metrics (from
the 8C-Pilot's own precision rule).** Unchanged from the prior pass
(Section 18.3's content, see Section 18.3 note below retained for
appendix reference).

**Table 6 (new) — Cross-metric robustness summary.** Columns: Comparison,
Primary-metric direction, Secondary-metric direction, Agreement? Rows:
Brier vs. log loss (agree, all 4 families), RMSE vs. MAE (agree, all 4
families), QTM-attainment vs. K(T) for C2-vs-C0 (agree in 5 of 6 configs
— C2 worse under both; **disagree in S4-GF**, Section 26.4). Caption:
*"Whether the revised primary metric and its retained secondary metric
agree on the direction of each comparison, computed from the same two
real pilot artifacts. The one disagreement (S4-GF) is the dossier's
central exploratory finding, not an error — see Section 26.4."*

---

## 31. Publication-Ready Figures and Captions

**Rendered this revision as real SVG files (RUNTIME VERIFIED — every
value plotted is read directly from `research-output/phase8/final/three_metric_pilot_stats.json`
and, for Figure 8, also `pilot_descriptive_stats.json`; generated by
`analysis/renderFigures.ts`):**

| File | Content |
|---|---|
| `research-output/phase8/final/figures/figure1_brier_score_comparison.svg` | Grouped bar: Det-A vs. BKT-fit mean Brier score, per family (Section 25) |
| `research-output/phase8/final/figures/figure2a_qtm_attainment_probability.svg` | Grouped bar: C0/C2/C3 attainment probability, per config (Section 26.1) |
| `research-output/phase8/final/figures/figure2b_qtm_restricted_mean.svg` | Grouped bar: C0/C2/C3 restricted-mean QTM, per config (Section 26.2) |
| `research-output/phase8/final/figures/figure2c_cumulative_attainment_S4-GF.svg` | Line chart: Kaplan-Meier-style cumulative attainment curve, C0/C2/C3, config S4-GF (Section 26.4's representative case) |
| `research-output/phase8/final/figures/figure3_rmse_comparison.svg` | Grouped bar: Det-A vs. BKT-fit mean RMSE, per family (Section 27) |
| `research-output/phase8/final/figures/figure4_brier_by_family_detA.svg` | Bar: Det-A Brier score across all 4 simulator families (performance-by-family) |
| `research-output/phase8/final/figures/figure5_adaptive_efficiency_delta.svg` | Bar: magnitude of C2-minus-C0 attainment-probability delta, per config (adaptive-vs-non-adaptive efficiency) |
| `research-output/phase8/final/figures/figure8_robustness_brier_vs_logloss.svg` | Grouped bar: Det-A-minus-BKT-fit difference under Brier (primary) vs. log loss (secondary), per family (robustness check, Section 25.2) |

Every figure's title states "EXPLORATORY / PILOT-SCALE (n=5 worlds) —
NOT a confirmatory result" directly in the image (not only in a caption
that could be separated from it), per the task's requirement that this
be visible wherever the figure travels.

**Explicitly NOT rendered, named rather than faked (per the task's own
instruction to mark unavailable figures rather than fabricate them):**

- **A calibration/reliability plot for Brier score** — requires raw
  per-response `(p, y)` pairs; only per-learner/per-world aggregate means
  were retained by this revision's pilot run (Section 21). `calibrationBins()`
  exists and is implemented and ready to use once that instrumentation is
  added.
- **Representative individual mastery trajectories** — requires per-step
  trajectory retention; only session-level outcomes (`itemsToCriterion`,
  `kT`) were retained. Section 21 names this as a bounded, straightforward
  future instrumentation step, not a structural impossibility.

---

## 32. Interpretation of Findings

### 32.1 What the evidence actually supports right now

1. The metric-provenance gap was real and is now investigated,
   documented, and proposed for formal reconciliation
   (`protocol/PROPOSED-AMENDMENT-A2-metric-reconciliation.md`) — a
   genuine pre-experimental correction, not a result-driven swap
   (Section 4).
2. All three originally-intended metrics (Brier, QTM, RMSE) are now
   implemented, independently verified against hand-computed reference
   cases across the task's full required edge-case list, and exercised
   end to end on a real, zero-failure, 13,560-run diagnostic pilot
   (Sections 17–19, 22, 24).
3. Under the reconciled metric set, Track A's qualitative pattern (BKT-
   fit ahead in S2/S4-ref, no detectable difference in S3, Det-A ahead in
   the S1 no-learning check) is **robust** to the choice between Brier
   and log loss, and between RMSE and MAE (Section 29) — a genuinely
   reassuring cross-metric consistency finding.
4. Track B's qualitative pattern is **mostly but not entirely robust**:
   QTM confirms K(T)'s finding that adaptive sequencing (C2) costs
   mastery relative to non-adaptive (C0) in S2/S3/S4-N/S4-GW, but
   **reverses K(T)'s one positive finding for S4-GF** (Section 26.4) —
   the single most scientifically important finding in this revision,
   because it shows the metric-reconciliation work was not a formality:
   it changes which of the two intended primary comparisons the data
   actually supports for the configuration the protocol's own design
   most wanted to test.
5. No confirmatory claim exists under either metric set — all of the
   above remains pilot-scale, exploratory evidence (Section 1.2, 24).

### 32.2 What a future confirmatory run must resolve, informed by this
revision

The S4-GF divergence (Section 26.4) means a future paper **cannot report
only one of K(T)/QTM for the prerequisite-awareness question** without
either (a) obtaining Amendment A2's approval and committing to QTM as
primary, with K(T) reported secondarily to explain the divergence
mechanistically, or (b) keeping the original protocol's K(T)-primary
design and reporting QTM as an important secondary finding that
complicates the primary result. Either choice must be made BEFORE a
confirmatory run, not after seeing confirmatory-scale numbers — exactly
the ordering this revision's exposure analysis (Section 4.4) is meant to
protect.

### 32.3 Claims permitted and forbidden (unchanged framework, PROTOCOL
REGISTERED B11.2, extended to the new metrics)

All of the original dossier's forbidden-claims list (Section 35.I below)
applies unchanged, plus: **"Questions-to-Mastery confirms K(T)'s finding
that prerequisite-aware sequencing helps in S4-GF" is explicitly FALSE
and must never be written** — the two metrics disagree on exactly that
point (Section 26.4), and reporting only the metric that gives the
preferred answer would be a textbook case of the "cherry-pick runs based
on results" violation this task explicitly forbids.

---

## 33. Limitations and Threats to Validity

All limitations from the prior dossier pass (original internal/
construct/external validity threats, B11.1) apply unchanged. **Added,
this revision:**

- **The reconciled metric set has no confirmatory sample-size
  determination yet** — QTM in particular has a fundamentally different
  variance structure than K(T) (a binary attainment event vs. a
  continuous average), and the original 20–92-world table cannot be
  assumed to transfer (Section 18.3, `protocol/PROPOSED-AMENDMENT-A2-metric-reconciliation.md`
  Section 7).
- **Both pilots (original and three-metric) share the same 5 worlds** —
  any future confirmatory claim, under either metric set, must use fresh
  seeds (Section 4.4) or it cannot be considered blind.
- **Calibration and trajectory-level figures are not yet instrumented**
  (Section 21) — this revision's pilot retains aggregates sufficient for
  every requested table and 8 of 10 requested figure types, but not the
  two requiring raw per-response or per-step data.
- **The S4-GF K(T)/QTM divergence (Section 26.4) is itself based on only
  5 worlds** — it is a real, mechanistically explicable pattern, but its
  magnitude and even its sign at confirmatory scale are unknown.

---

## 34. Future Research

All items from the prior dossier pass apply unchanged (Elo estimator,
C4-BKT sequencing, S4 intermediate cells, ablations, S5/S3-ZPD, one-at-
a-time sensitivity, Det-tuned/cross-family/multi-concept probes).
**Added, this revision:**

1. A dedicated outcome-blind precision run for Brier/RMSE/QTM specifically
   (fresh worlds), to produce a confirmatory world-count table analogous
   to Section 18.3's original one.
2. Instrument raw per-response prediction retention (for calibration
   plots) and per-step trajectory retention (for representative-learner
   figures) — both named as straightforward, bounded extensions in
   Section 21.
3. **Directly investigate the mechanism behind the S4-GF K(T)/QTM
   divergence** (Section 26.4) — e.g., by examining per-concept mastery
   distributions at session end for C2 vs. C0 in that configuration, to
   determine whether adaptive sequencing is leaving a broader set of
   concepts partially progressed versus completing fewer concepts fully.
   This is a concrete, well-specified follow-up this revision's own
   finding motivates.
4. Author/mentor review of `protocol/PROPOSED-AMENDMENT-A2-metric-
   reconciliation.md`.

---

## 35. Technical Implementation Details

**SOURCE VERIFIED**, this revision, in addition to the prior pass's
unchanged content (determinism, seed derivation, config versioning,
response-channel isolation, build-time safety — all unaffected).

- **New module:** `src/research/phase8/metrics/threeMetrics.ts` — pure
  functions only, no side effects, no RNG use, no dependency on any
  simulator/estimator/selection-policy module. Validates every input and
  throws on malformed data rather than coercing it.
- **New pipeline:** `src/research/phase8/pipeline/threeMetricPilot.ts` —
  calls the real, unmodified `runTrackA`/`runTrackBSession` with the
  identical identity/seed scheme as the protected `pilot.ts`; does not
  modify, import privately from, or alter the behavior of `pilot.ts` in
  any way. A second standalone diagnostic pathway, not a replacement.
- **New analysis scripts:** `analysis/threeMetricStats.ts`,
  `analysis/renderFigures.ts` — both read-only over stored artifacts,
  both write only to `research-output/phase8/final/`, neither overwrites
  an existing pilot report.
- **No simulator, estimator, selection-policy, or slice-selection file
  was modified.** Confirmed by `git status` / `git diff` showing zero
  changes to any file under `src/research/phase8/{simulator,estimators,
  slices}/`, `src/domain/learner-model/`, or `src/tutoring/selection/`.

---

## 36. Data Persistence and Reproducibility

**Unchanged infrastructure** (Stage 2 SQLite store, Phase 6 artifact
integrity verification, two-level replay design) — all re-confirmed
passing this revision via the full regression run below.

**New artifacts, this revision, never overwriting historical data:**

- `research-output/phase8/pilot/three-metric-pilot-report.json` (new
  file; the original `pilot-report.json` is untouched, confirmed by
  checksum before/after this revision's work).
- `research-output/phase8/final/three_metric_pilot_stats.json` (new).
- `research-output/phase8/final/figures/*.svg` (8 new files).
- `protocol/PROPOSED-AMENDMENT-A2-metric-reconciliation.md` (new;
  `protocol/phase8-protocol-v2.md` and `protocol/AMENDMENTS.md`
  untouched).

**Full reproduction commands (all actually run during this revision):**

```bash
npx vitest run tests/research/phase8/threeMetrics.test.ts   # 30/30
npx tsx scripts/run-three-metric-pilot.ts                   # writes three-metric-pilot-report.json (refuses to overwrite)
npx tsx analysis/threeMetricStats.ts                        # writes three_metric_pilot_stats.json
npx tsx analysis/renderFigures.ts                           # writes 8 SVG figures
```

Plus the original pass's full reproduction guide (Section 31 of the
prior pass; unchanged commands for the original pilot/stats script).

---

## 37. Verified References and Literature Inventory

Unchanged from the prior pass (Section 32's full table — Corbett &
Anderson 1994, Doroudi & Brunskill 2017, Bush & Mosteller 1955, Cen/
Koedinger/Junker 2006, Doignon & Falmagne 1985, Käser et al. 2014, Lord
1980, Badrinath/Wang/Pardos 2021, Gneiting & Raftery 2007, Naeini/
Cooper/Hauskrecht 2015, Holm 1979, Berger 1982, Lakens 2017, Field &
Welsh 2007, Jacovi & Goldberg 2020, Pelánek 2016, and others), all
PROTOCOL REGISTERED per the protocol document's own citation audit — not
independently re-verified again this revision (no new reference was
introduced; Brier's own primary citation, **Brier, G.W. (1950),
"Verification of forecasts expressed in terms of probability,"
*Monthly Weather Review*, 78(1), 1-3**, is the standard, universally-
cited source for the Brier score and is added here as the one new
reference this revision's content requires — a well-established result,
not independently re-verified against a library catalogue this task, but
consistent with how Gneiting & Raftery (2007) itself describes Brier's
original contribution).

---

## 38. Research Decisions and Protocol Deviations

All classifications from the prior pass retained unchanged (Amendment A1
slice selection — full record in `protocol/AMENDMENTS.md`, reproduced in
summary in Section 7; the `analysis/stats.py`-vs-`.ts` non-discrepancy;
the `research-output/phase8/final/` directory's creation). **This
revision's own classification:**

### 38.1 Metric mismatch — **documentation mismatch / correctable
implementation convenience** (Section 4, full record)

Resolved via `protocol/PROPOSED-AMENDMENT-A2-metric-reconciliation.md`,
a proposal, not an applied change. `protocol/phase8-protocol-v2.md`
remains exactly as drafted; nothing was silently swapped.

### 38.2 Reuse of the same 5 pilot worlds for the new diagnostic pilot —
**no discrepancy, with a binding forward-looking caveat**

Deliberate, for direct comparability and because this run's purpose was
explicitly to verify the three-metric pipeline works, not to produce
confirmatory evidence (Section 24). The caveat (Section 4.4): this
specific set of 5 worlds can never be used as a blind confirmatory
sample under any metric, past, present, or future.

### 38.3 One background-task operational mishap — **no discrepancy,
documented for completeness** (Section 24's operational note)

A shell-backgrounding error produced an orphaned process; the pipeline's
own no-overwrite guard correctly prevented any data corruption. One
valid, complete artifact exists; it was verified (`totalRuns`/
`failureCount`) before being used for any analysis.

---

## 39. Remaining Approval or Execution Requirements

**All items from the prior dossier pass's checklist (Section 34) still
apply, unchanged.** This revision adds:

1. ☐ Author/mentor review and decision on
   `protocol/PROPOSED-AMENDMENT-A2-metric-reconciliation.md` — accept,
   reject, or request changes.
2. ☐ If accepted: a dated entry in `protocol/AMENDMENTS.md` naming the
   approver, in Amendment A1's style.
3. ☐ A dedicated outcome-blind precision run for Brier/RMSE/QTM, on
   fresh (never-before-examined) simulation worlds, to establish a
   confirmatory world-count table for the revised metrics.
4. ☐ `protocol/APPROVAL.md` — still does not exist; still not created by
   this task; still gates ALL confirmatory execution regardless of which
   metric set is used.
5. ☐ Resolution of the S4-GF K(T)/QTM divergence (Section 32.2) — a
   decision on how the eventual paper will report a configuration where
   the two candidate primary metrics disagree.
6. ☐ Instrumentation for calibration-plot and trajectory-figure data
   (Section 21), if those figures are wanted for the final paper.
7. ☐ All items 1–10 from the prior pass's Section 34 (S2's 92-world
   requirement, BKT fit diagnostics cross-checks, named-test
   cross-referencing, H-C1/H-C2 at confirmatory scale) remain open and
   are **not** superseded by this revision's work — they apply to
   whichever metric set is ultimately adopted.

**None of the above was completed in this task, by design** — items 1,
2, and 4 are author-only decisions; items 3, 5, and 6 require either
author input or a scale of execution outside this task's diagnostic-only
mandate.

---

## 40. Paper-Writing Handoff for ChatGPT

### A. Exact research questions

See Section 3 (original, PROTOCOL REGISTERED) and Section 3's "project's
original framing" callout (Questions-to-Mastery, 2026-09-04). The
reconciled framing: does a transparent deterministic mastery heuristic
predict as well as calibrated BKT (scored by Brier score and RMSE), and
does prerequisite-aware adaptive sequencing get simulated learners to
mastery in fewer questions (scored by censored Questions-to-Mastery) than
non-adaptive or prerequisite-unaware sequencing?

### B. Original and revised hypotheses, stated precisely

Original (Section 3.1): H-A1/H-A2 (log loss/MAE non-inferiority),
H-B1–H-B4 (K(T)-based sequencing benefit and moderation). Revised,
PROPOSED (Section 3.2): H-A1-Brier/H-A2-RMSE (Brier/RMSE non-
inferiority), H-B1-QTM–H-B4-QTM (attainment-probability-based sequencing
benefit and moderation). Neither set has been confirmatorily tested;
both are stated precisely enough to test once approved and adequately
powered.

### C. Concise conditions/estimators/policies table

Unchanged from the prior pass (Section 35.C) — Det-A/Det-B/BKT-fit/BKT-
default/RunProp/EMA/B0 (Track A); C0/C1/C2/C3 (Track B); S1/S2/S3/S4-
{ref,GF,N,GW} (simulator families).

### D. Simulation methodology (compact, precise)

Unchanged from the prior pass (Section 35.D) — four learner families,
none sharing the tutor's own mastery equation; world as the unit of
inference; common random numbers; three real curriculum slices selected
by a pre-experimental, outcome-blind rule (Amendment A1).

### E. All essential equations

Mastery update and analytical properties: Section 8 / prior pass Section
35.E, unchanged. **New, this revision:**

```
Brier = (1/N) * Sum[(p_i - y_i)^2]
RMSE  = sqrt((1/N) * Sum[(Mhat_i - Mtrue_i)^2])
QTM:  attainmentProbability = nAttained / n
      restrictedMeanQtm = mean(min(T_i, budget))  [= RMST under fixed, single-horizon censoring]
```

### F. Numbered list of actual findings (original + new)

All seven findings from the prior pass (Section 35.F) still hold.
**Added, this revision:**

8. **[Code-verified]** Brier score and a ground-truth-based, already-
   censoring-aware Questions-to-Mastery quantity were computed by the
   codebase since Track A/B were first written; the paper-metric mismatch
   was a persistence/documentation gap, not a missing capability.
9. **[Exploratory, n=5 worlds]** The Track A estimator-comparison
   qualitative pattern is robust across all four tested metrics (log
   loss, Brier, MAE, RMSE) — no sign reversal in any family.
10. **[Exploratory, n=5 worlds]** The Track B sequencing-comparison
    qualitative pattern is robust in 5 of 6 configurations but **reverses
    in S4-GF**: K(T) shows adaptive sequencing (C2) ahead of non-adaptive
    (C0); Questions-to-Mastery shows C2 behind C0 in the same
    configuration. This is the dossier's single most important finding.

### G. One consolidated primary-results table (Brier/QTM/RMSE)

| Family/Config | Brier: Det-A | BKT-fit | RMSE: Det-A | BKT-fit | QTM attain: C0 | C2 | C3 |
|---|---|---|---|---|---|---|---|
| S1 | 0.2365 | 0.2383 | 0.1280 | 0.1348 | 0% | 0% | 0% |
| S2 | 0.1786 | 0.1697 | 0.2500 | 0.2318 | 26.9% | 8.1% | 23.2% |
| S3 | 0.2289 | 0.2295 | 0.1445 | 0.1457 | 1.9% | 0.7% | 1.2% |
| S4-GF/S4-ref | 0.1879 | 0.1759 | 0.2619 | 0.2368 | 1.7% | 0.3% | 0.5% |
| S4-N | — | — | — | — | 36.8% | 6.1% | 21.2% |
| S4-GW | — | — | — | — | 1.6% | 0.1% | 1.3% |

*Every cell: EXPLORATORY, pilot-scale (n=5 worlds). Source:
`research-output/phase8/final/three_metric_pilot_stats.json`.*

### H. Exact statistical claims the analysis supports

Same form as the prior pass (Section 35.H), now also covering the
revised metrics: "In this 5-world diagnostic pilot, [estimator/policy]
showed a [direction] difference of [X] in [Brier/RMSE/QTM-attainment],
95% CI [L,U] (exploratory, not adequately powered — no precision run has
yet been done for these metrics specifically)." Nothing stronger.

### I. Claims that must NOT appear in the paper

All items from the prior pass (Section 35.I / this dossier's Section
32.3), **plus: "Questions-to-Mastery confirms K(T)'s S4-GF finding"
(false — they disagree, Section 26.4), and "the metric reconciliation
proves the original log-loss/MAE/K(T) choice was wrong" (false — both
choices were, and remain, unapproved drafts; this is a reconciliation,
not a refutation).**

### J. Results-section outline

1. Implementation and dual pilot-scale verification (original + three-
   metric pilots).
2. Track A results under both metric sets, with the cross-metric
   robustness check as a dedicated subsection.
3. Track B results under both metric sets, with the S4-GF divergence as
   its own highlighted subsection — this is likely the paper's most
   interesting single result.
4. Confirmatory-study readiness, including the now-dual precision-run
   requirement (original metrics' 20–92-world table, plus a yet-to-be-run
   equivalent for the revised metrics).

### K. Discussion-section outline

1. Why Brier/RMSE/QTM were always the intended metrics, and what the
   provenance investigation found (Section 4) — useful context, not just
   a methods footnote.
2. The S4-GF divergence as the central discussion point: what it says
   about the difference between "raising average mastery" and "getting
   every prerequisite concept simultaneously over a hard threshold"
   within a fixed budget — a substantive, generalizable point about
   adaptive-sequencing evaluation design, not just this study's own
   finding.
3. Cross-metric robustness in Track A as a positive methodological
   result in its own right.
4. The question-bank coverage confound (Amendment A1) — unchanged from
   the prior pass.

### L. Limitations-section outline

Section 33, in order: original threats, this revision's additions (no
confirmatory sample size for new metrics, shared-worlds exposure
constraint, missing calibration/trajectory instrumentation, 5-world
divergence finding).

### M. Conclusion outline — what the evidence actually establishes

(1) A complete, mathematically-characterized, code-verified experimental
system exists under BOTH the original and the reconciled metric
frameworks; (2) it operates correctly at diagnostic scale with zero
failures across two independent 13,560-run pilots; (3) Track A's
estimator-comparison conclusion is robust to metric choice; (4) Track B's
sequencing conclusion is **not** fully robust to metric choice — a
genuine, reportable scientific finding requiring explicit author
resolution before a confirmatory paper claim can be made about the
S4-GF/prerequisite-awareness question; (5) no confirmatory claim can yet
be made under either metric set.

### N. Abstract-ready paragraph with real verified scale/findings (UPDATED)

"We present a simulation-based evaluation framework for an adaptive
mathematics tutoring system, comparing a deterministic mastery-
estimation heuristic against Bayesian Knowledge Tracing on response-
prediction accuracy (Brier score, log loss) and latent-mastery recovery
(RMSE, MAE), and comparing prerequisite-aware adaptive question
sequencing against non-adaptive and prerequisite-unaware alternatives on
censored Questions-to-Mastery and final simulated mastery, across four
synthetic-learner families and a real 1,840-question, 109-concept
mathematics curriculum. Two independent, zero-failure diagnostic pilots
(13,560 runs each, five simulated worlds per condition) show the
estimator-comparison result is robust across all four scored metrics, but
reveal that the sequencing-comparison result is **not**: final mastery
suggests adaptive sequencing outperforms non-adaptive sequencing when
prerequisite structure is both present and correctly modeled, while a
stricter, censored, ground-truth Questions-to-Mastery analysis of the
same simulated sessions shows adaptive sequencing attaining full mastery
less often in that same configuration. We report both results as
exploratory pilot-scale findings pending a confirmatory run, and identify
the resolution of this metric-dependent disagreement as a required
pre-registration decision before that run can proceed."

### O. Which figures/tables belong in which paper section

Original pass's Table 1/Figures (Methods) unchanged. New Tables 2–4
(Brier/RMSE/QTM) and Table 6 (robustness summary) -> Results. Figures
1/3/4 (Brier/RMSE/by-family) -> Results, Track A subsection. Figures
2a/2b/2c (QTM) -> Results, Track B subsection, with 2c specifically
illustrating the S4-GF divergence narrative. Figure 5 (efficiency delta)
and Figure 8 (robustness) -> Discussion, supporting the cross-metric
robustness argument.

### P. References to verify

Section 37's list, plus Brier (1950) — all PROTOCOL REGISTERED or
standard/well-established; none independently re-verified against a live
database this revision (no internet access used).

### Q. What's still missing before the manuscript can be finished

Section 39's checklist in full. In one sentence: **author/mentor review
of the metric-reconciliation proposal, a dedicated precision run for the
new metrics on fresh worlds, `protocol/APPROVAL.md`, and an explicit
decision on how to report the S4-GF K(T)/QTM divergence** are the four
items that gate a finished manuscript; everything else is additional
rigor.

### R. A note on how to present the S4-GF divergence specifically

Recommended framing for the eventual paper (INTERPRETATION, not a
finding itself): present BOTH metrics for S4-GF side by side, explain
the mechanistic reason they can diverge (Section 26.4), and treat the
divergence itself as a methodological contribution of the paper — "which
metric you choose changes the answer" is a publishable, generalizable
point about evaluating adaptive sequencing systems, independent of
whether either number reaches confirmatory significance.

### S. Honesty check for whoever drafts from this dossier

Every number in Sections 25–29 came from exactly one real, verified,
zero-failure 13,560-run execution (Section 24) — there is no second,
cherry-picked run behind any of them. If asked to "improve" or "clean up"
a result, the correct action is to note it as a limitation, never to
re-run until a more favorable number appears (explicitly forbidden by the
originating task and by this document's own purpose).

---

## 41. Appendix — Equations, Parameters, Conditions, and Schemas

All appendix tables from the prior dossier pass (mastery model full
parameter table, BKT bounds/grid, question bank/curriculum, Phase 8
slices, Track A/B session parameters, S4 cell parameters, 8C-Pilot run
totals) are **unchanged and retained in full** — see the historical
content preserved via git/version history of this file; reproduced here
in condensed form for this revision:

### 41.1 Mastery model — unchanged (Section 8.1)

### 41.2 BKT bounds/grid — unchanged

P(L0) in [0.001,0.999], P(T) in [0.001,0.999], G in [0.001,0.499], S in
[0.001,0.499]; 225-point coarse grid + BKT-default = 6 EM starts.

### 41.3 Question bank / curriculum — unchanged (Section 7)

### 41.4 Phase 8 slices — unchanged

Primary: CH07 (score 14), CH03 (score 10, tie-break winner), CH10 (score
10). Reserve: CH12 (score 8).

### 41.5 Track A/B session parameters — unchanged (Sections 14–16)

### 41.6 S4 cell parameters — unchanged

S4-ref (lambda=0.30, phi=1.0), S4-GF (0.05, 1.0), S4-N (1.0, —), S4-GW
(0.05, 0.0).

### 41.7 Both pilot run totals (new, combined)

| Metric | 8C-Pilot (original) | Three-metric pilot (this revision) |
|---|---|---|
| Total runs | 13,560 | 13,560 |
| Failures | 0 | 0 |
| Worlds | 5 | 5 (identical seeds) |
| Wall-clock | 386,877 ms | 345,013 ms |
| Generated at | 2026-10-27T14:58:15.938Z | 2026-11-04T17:53:27.003Z |

### 41.8 New module/file inventory, this revision

`src/research/phase8/metrics/threeMetrics.ts`,
`src/research/phase8/pipeline/threeMetricPilot.ts`,
`scripts/run-three-metric-pilot.ts`, `analysis/threeMetricStats.ts`,
`analysis/renderFigures.ts`,
`tests/research/phase8/threeMetrics.test.ts`,
`protocol/PROPOSED-AMENDMENT-A2-metric-reconciliation.md`,
`research-output/phase8/pilot/three-metric-pilot-report.json`,
`research-output/phase8/final/three_metric_pilot_stats.json`,
`research-output/phase8/final/figures/*.svg` (8 files).

---

*End of dossier. No protected algorithm, question bank, curriculum,
registered condition, historical pilot artifact (either the original
`pilot-report.json` or any Stage 1-3 output), or protocol file was
modified to produce this document or its revision.
`protocol/PROPOSED-AMENDMENT-A2-metric-reconciliation.md` is a proposal
only — it does not modify `protocol/phase8-protocol-v2.md`.
`protocol/APPROVAL.md` was not created. No confirmatory simulation was
run under either metric set.*

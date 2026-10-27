<!--
Saved as a reference artifact only — NOT an implementation input yet.

Status, per the document's own text: "This document supersedes the v1
draft... in full. It is a draft for author and mentor approval; it is
not frozen or approved. Freezing happens only when the author records
the SHA-256 of the exported protocol file in protocol/APPROVAL.md."

Provenance: pasted into the non-adaptive-tutor Claude Code session on
2026-10-26 and 2026-10-27 (across four separate pasted chunks, each
picking up where the prior one's ~50,000-character limit cut it off),
produced separately (per the author's stated workflow) via Claude Chat
reviewing docs/PHASE8_TECHNICAL_BRIEFING.md. No repository code was
changed as a result of receiving this document, per the Phase 8 task's
explicit instruction to stop at the scientific approval gate and not
invent or begin implementing a protocol independently.

COMPLETE as of 2026-10-27: all five deliverables (A — revision report
and contradiction audit; B1–B12 — the revised protocol; C0–C13 — the
Tier 1 implementation specification; D — the Tier 2 roadmap; E — the
final scientific review) are present below, reassembled from the
pasted chunks in the order given (note that the source document itself
interleaves Deliverable C's C0–C5 before D and E, then continues with
C6–C13 afterward — that ordering is preserved as received, not
reorganized). Still NOT present: `protocol/APPROVAL.md` (the author has
not yet recorded an approval hash — see Status below) and
`protocol/AMENDMENTS.md` (referenced throughout as where deviations
get logged, but not itself part of this paste).
-->

# RISE Phase 8A Protocol v2 — Revised Protocol and Tier 1 Specification

26 Oct 2026 · @Advik

## Status

This document supersedes the v1 draft ("RISE Phase 8A Experimental
Protocol", 2026-10-24) in full. It is a draft for author and mentor
approval; it is not frozen or approved. Freezing happens only when the
author records the SHA-256 of the exported protocol file in
`protocol/APPROVAL.md`.

No implemented mastery equation, selection-policy default, threshold or
question-bank file is changed. Every value that differs from an
implemented default is a new, separately versioned object, labelled as
such. Tags used throughout: **[Established]** = a published method or
result checked for this draft; **[Researcher-defined]** = a choice made
for this study; **[Derived]** = a mathematical consequence of the
implemented equations, proved in B2.

The document has five deliverables: A (revision report and contradiction
audit), B (the complete revised protocol, B1–B12), C (Tier 1
implementation specification), D (Tier 2 roadmap) and E (final review).

## Decisions that genuinely require author or mentor approval

Everything else in this protocol is resolved by methodological
reasoning. These six items are value judgements or scope choices, and
the protocol cannot be frozen until each is accepted or changed.

| # | Decision | Proposed default | Why it needs approval |
|---|---|---|---|
| D1 | Track A non-inferiority margins | 0.010 nats per response (log loss); 0.030 probability units (latent-recovery MAE) | A margin is a statement of what loss is practically negligible; no data can set it |
| D2 | Research-question scope for sequencing | Tier 1 compares sequencing policies with each other, not with a BKT-driven policy; BKT-driven sequencing (C4) moves to Tier 2 | Changes what the paper can claim about BKT in Track B |
| D3 | Primary BKT comparator | BKT-fit (calibrated) is the confirmatory comparator; BKT-default (untuned) is a pre-specified secondary | Determines which comparison the abstract leads with |
| D4 | Simulator parameter ranges (B3, C3) | As specified | All are researcher-defined; the research mentor should review them before freezing |
| D5 | Mechanism-activation interpretation threshold | 10% of C2 sessions in a cell | Sets when a prerequisite test is called "uninformative" |
| D6 | Compute budget ceiling | Author sets a wall-clock ceiling after the 8C-Pilot benchmark | Only the author knows what time is available; the protocol gives the reduction order if the ceiling is exceeded |

## Deliverable A — Revision report

Ten changes matter most. The largest are a multi-world design with
world-level inference, prerequisite hypotheses rewritten as moderation
tests, BKT fitted by bounded multi-start EM, and a Tier 1 core study cut
to six simulator configurations and four policies.

| # | Change | Why it was necessary |
|---|---|---|
| 1 | One world → 20 independent worlds per configuration; inference on world-level means (B8) | v1's learner-level bootstrap within one world measured only conditional uncertainty. Learners in a world share item noise, concept parameters and the true graph, so they are not independent draws from the stated simulation distribution |
| 2 | H-B3 equivalence test removed. Prerequisite hypotheses are now one main effect (H-B2) and two moderation contrasts: gating (H-B3) and graph fidelity (H-B4) (B8) | With no gating, prerequisite-aware sequencing still spends budget on background concepts, so equal learning rules do not imply equal outcomes. Moderation contrasts isolate the value of causal prerequisite structure net of that opportunity cost |
| 3 | BKT fitting: 106,875-point grid → coarse grid (225 points) + bounded multi-start EM, with a grid-agreement validation test (B4) | The v1 grid implied about 3.8 × 10¹¹ forward-pass steps across the Tier 1 fitting contexts alone. EM is the standard BKT fitting method; the agreement test checks it does not disadvantage BKT |
| 4 | Multi-concept BKT approximation removed from Tier 1. Track A histories use single-concept items only (B5) | v1's fractional-evidence update was not a proper hidden Markov model, so neither likelihood fitting nor EM was valid for it |
| 5 | Skill-retention ratio Q replaced by absolute paired loss differences with fixed margins (B8) | Q is undefined or unstable whenever BKT barely beats the base rate, which is exactly the case where interpretation matters |
| 6 | Pooled Track A test replaced by an intersection–union test across families (B8) | A pooled statistic could pass while the model fails badly in one family. The intersection–union test requires non-inferiority in every family and needs no multiplicity adjustment across them (Berger, 1982) |
| 7 | Both deterministic variants are now confirmatory in Track A (B8) | v1 made Det-B focal, which pre-judged the variant question |
| 8 | Ground truth formalised per family; reference-item guess now follows each family's own mechanism (B3) | v1 fixed the reference guess at 0.25, which contradicted the binary families' concept-level guess parameters |
| 9 | Two-level replay (engine replay from run records for every run; Phase 6 artifact replay for a stored sample) (B10) | v1 required every run to replay from persisted artifacts while storing only 10% of them |
| 10 | Tier 1 / Tier 2 split (B9, D) | v1 had 11 Track B configurations, 8 estimators and 8 policies — too broad for the timeline |

The analytical section (B2) was re-derived. All v1 numbers were correct,
but three statements were too strong: Variant A's difficulty
cancellation holds only for single-level item streams, threshold-
equivalent accuracies describe the long-run mean rather than when
decisions fire, and the default selection path needs 6 consecutive
correct answers from cold start. B2 adds two exact results v1 lacked:
the closed-form convergence of the mean and the closed-form stationary
variance.

### Tradeoffs introduced by simplifying

- **No Tier 1 comparison of sequencing against BKT.** Tier 1 can say how
  prerequisite-aware sequencing compares with non-adaptive and
  prerequisite-unaware sequencing, not whether a BKT-driven tutor
  sequences better (decision D2).
- **No logistic tracker (Elo) in Tier 1.** S3 is the family a logistic
  tracker would naturally win; without Elo, the strongest S3 baseline is
  missing. Elo is the first Tier 2 extension.
- **Single-concept items only in Track A.** Estimation results do not
  cover multi-concept attribution, which the tutor uses in deployment.
- **Fewer learners per world.** Precision now comes mainly from the
  number of worlds, so per-world diagnostics are noisier.
- **No misconception, diagnostic-backtracking or threshold experiments
  in Tier 1.** The paper cannot make claims about those components
  without Tier 2.

### Contradiction audit

The v1 draft contained 28 inconsistencies or unsupported choices; every
one is corrected below, and none is left open. Locations refer to v1
section numbers.

| # | Issue in v1 | v1 location | Correction in v2 |
|---|---|---|---|
| 1 | Hypotheses described as "tested separately in each family" and then pooled into one test | §2.2 | Intersection–union test across families; per-family estimates always reported (B8) |
| 2 | Det-B focal in Track A despite the instruction to evaluate both variants | §2.2 | Both variants confirmatory (B8) |
| 3 | H-B3 used equivalence where opportunity cost predicts a direction | §2.3 | Moderation contrast; no-gating effect reported as a two-sided estimand (B8) |
| 4 | H-B4 framed as non-superiority while §3.5 predicted "none or harm" | §2.3, §3.5 | Moderation by graph fidelity (B8) |
| 5 | Q undefined or unstable near a zero denominator | §2.1, §10.2 | Absolute paired differences with fixed margins (B8) |
| 6 | Learner-level bootstrap within one world presented as general uncertainty | §9.2, §10 | 20 worlds; world-level t-intervals; estimand population defined (B1, B8) |
| 7 | Runtime asserted ("hours on a laptop", "under 8 hours") without a benchmark | §9 lead, §9.3 | Removed; benchmark-based projection in 8C-Pilot (B9) |
| 8 | BKT grid of 106,875 points per concept fit | §4.2 | Coarse grid + multi-start EM + agreement test (B4) |
| 9 | Fractional multi-concept BKT update is not an HMM, so likelihood fitting was undefined | §4.2, S5 | Single-concept items in Track A (B5); approximation moved to Tier 2 |
| 10 | H-C1 required replay of every run from persisted artifacts, but only 10% were persisted | §2.4, §11.1(5), 8D-3 | Two-level replay with mandatory run records (B10) |
| 11 | Truth log "after every step for every slice concept" — about 1,200 rows per session | §11.1(6), S4 | Change-only truth log plus start/end snapshots (B10) |
| 12 | Reference-item guess fixed at 0.25, inconsistent with S2/S4 concept-level guess | §3.1 table, §8.1 | p* uses each family's own response mechanism (B3) |
| 13 | K(T) on different scales (σ(θ) vs binary) pooled across families in H-B1 | §2.3, §6.3 | All Track B inference per family; intersection–union for H-B1 (B8) |
| 14 | "Variant A cannot distinguish hard from easy in the long run" stated without its single-level assumption | §1b P2 | Restated with the mixed-level fixed point (B2) |
| 15 | Threshold-equivalent accuracies read as when decisions fire | §1b P3 | Labelled as long-run-mean equivalents; stationary SD added (B2) |
| 16 | Minimum correct answers ignored the actual default difficulty path | §1b P4, 8B-3 | Default path computed: 6 consecutive correct from cold start (B2) |
| 17 | G + S < 1 attributed as "the identifiability condition" of Doroudi & Brunskill | §3.3 | Their non-degeneracy condition is P(G) ≠ 1 − P(S); our bounds are a stronger, sufficient choice (B3, B12) |
| 18 | Baker et al. (2008) cited as the source of a 0.30 bound | §4.2 | Bound labelled researcher-defined; degeneracy definitions attributed correctly (B4, B12) |
| 19 | Slice rule required 10 items per concept, but the schedule draws 12 + reviews without replacement | §5.1, §5.2 | Pool requirement raised and tied to single-concept items (B5) |
| 20 | C0 behaviour unknown while H-B1 was confirmatory | §5.3 | C0 defined in advance with a fixed substitution rule (B6) |
| 21 | RQ claimed a BKT comparison in knowledge acquisition while C4 was exploratory | §1.3, §7.1 | Scope narrowed, flagged as D2 (B1) |
| 22 | Pilot "permuted condition labels" for paired differences still leaks effect magnitude | §9.1 | Precision computed from per-condition variances only (B9) |
| 23 | S1 negative control "exactly 0" is trivially true because S1 mastery never changes | §10.4 | Relabelled as an implementation check; S4-null is the scientific control (B6) |
| 24 | Sign-flip permutation assumed symmetric learner differences without stating it | §10.2 | World-level t-test primary; assumptions stated; permutation only as sensitivity (B8) |
| 25 | BKT recovery acceptance (±0.05 at 2,000 learners) ignored known fitting limits | 8B-4 | Large-N correctness test plus predictive-regret check at realistic N (B4) |
| 26 | Elo prediction expectations stated for S3 while Elo fit was underspecified | §2.2, S6 | Elo moved to Tier 2 with a full spec (D) |
| 27 | Activation threshold (10%) introduced late without approval | §10.4 | Listed as decision D5 |
| 28 | Exploratory C4 required a ConceptMasteryState view of BKT, left to Claude Code | S5 | Tier 2, with the design decision stated in D |

## Deliverable B — Revised Phase 8A protocol

### B1. Research question, design and estimand population

#### B1.1 Research question (Tier 1 scope)

Under explicitly specified simulated-learner families, how does a
transparent linear-operator mastery heuristic compare with Bayesian
Knowledge Tracing and simpler baselines in response prediction and
latent-state recovery; how does prerequisite-aware sequencing driven by
that heuristic compare with non-adaptive and prerequisite-unaware
sequencing in simulated knowledge acquisition under a fixed practice
budget; and to what extent can its decisions be computationally
reconstructed?

This keeps the author's wording except for the sequencing comparator.
Comparing sequencing against a BKT-driven policy is Tier 2 (decision
D2), because the implemented thresholds were designed for the
deterministic score and have no principled mapping onto P(L).

#### B1.2 Contribution

The update rule is a two-operator linear learning model of the Bush and
Mosteller (1955) type; with unit weights it is an asymmetric exponential
moving average of correctness. Prerequisite structure in assessment is
established by Knowledge Space Theory (Doignon & Falmagne, 1985) and
skill-topology Bayesian networks (Käser et al., 2014). The study's
contribution is therefore not a new learner model. It is (1) exact
analytical properties of the implemented rule (B2), (2) a pre-
registered, non-circular comparison against BKT and simpler baselines,
and (3) a precise account of what explicit traces do and do not
establish.

#### B1.3 Design at a glance

| Track | Question | What varies | What is held fixed | Primary outcome |
|---|---|---|---|---|
| A — estimation | Does the estimator know where the learner is? | Estimator | Response history (identical for every estimator) | Held-out log loss; latent-recovery MAE |
| B — sequencing | Does the policy move the learner? | Selection policy | Learner profile and random streams (common random numbers) | Final true mastery K(T) |
| C — traceability | Can decisions be reproduced and reconstructed? | — | — | Replay fidelity; trace-only reconstruction error |

#### B1.4 The population each estimate refers to

Every estimand is an expectation over a simulation distribution, not
over real students. For simulator configuration f:

```
Δ_f = E_{w~W_f}[ (1/3) Σ_{s=1}^{3} E_{l~L_f(w,s)}[ d_{w,s,l} ] ]
```

- `W_f` is the distribution of worlds: item noise ε_q, concept
  parameters and (for S4) the edge-retention draws, as specified in B3
  and C3.
- The three curriculum slices `s` are fixed, not sampled. Results are
  conditional on these slices, the canonical 1,840-question bank, the
  109-concept curriculum and the implemented defaults.
- `L_f(w, s)` is the distribution of learners given world and slice.
- `d` is a paired within-learner difference (two estimators on the same
  history, or two policies on the same profile).
- Inference treats worlds as the independent units (B8). An interval
  computed only from learners inside one world is conditional on that
  world and is used only as a diagnostic; it is never given a
  population interpretation.

#### B1.5 Phases

| Phase | Content | Gate to proceed |
|---|---|---|
| 8A | This protocol: review, approval, freezing | Author and mentor approve; hash recorded |
| 8B | Simulator and baseline implementation, mathematical validation, software tests | All 8B acceptance criteria pass (C12) |
| 8C-Pilot | Benchmarking and outcome-blind precision assessment | Pilot report accepted by author; amendments A1–A3 written |
| 8C | Confirmatory simulations, run once | Approval hash matches; integrity checks pass |
| 8D | Statistical analysis, tables, figures | Results report lists every confirmatory outcome before any exploratory one |

### B2. Analytical properties of the mastery update (appendix-ready)

Nine properties follow from the implemented equations. R1–R5, R7 and R9
are exact; R4's variance is exact for single-level streams; R6 and R8
contain one numerical or interpretive step, stated where it occurs.
Every v1 number was re-derived and is correct; three v1 statements were
too strong and are corrected in R3, R5 and R7.

**Setup and assumptions.** One concept, implemented defaults α = 0.12,
β = 0.10, M₀ = 0.5, difficulty weights w(L1…L5) = 0.8, 0.9, 1.0, 1.1,
1.2, no hints (always true in Phase 8). Write c ∈ (0, 1] for the concept
weight. The effective step sizes are:

```
a = c·α·w_d           (correct)
b = c·β·w_d'          (incorrect)
w_d' = w_d            (Variant A)
     = 1/w_d          (Variant B)
```

so that a correct answer gives `M′ = M + a(1 − M)` and an incorrect
answer gives `M′ = (1 − b)M`. Assumptions used below, named where
needed: **(S)** responses are independent Bernoulli(p) with constant p
(a stationary learner); **(L)** every item has the same level, so a and
b are constants.

**R1 — Boundedness (exact).** If 0 ≤ a ≤ 1 and 0 ≤ b ≤ 1, then M ∈
[0, 1] implies M′ ∈ [0, 1], because M + a(1 − M) = (1 − a)M + a is a
convex combination of M and 1, and (1 − b)M lies between 0 and M. Under
the defaults a ≤ 0.12 × 1.2 = 0.144 and b ≤ max(0.10 × 1.2, 0.10 / 0.8)
= 0.125, provided c ≤ 1. The clamp therefore never binds in exact
arithmetic. Requires: every concept weight in the bank lies in [0, 1]
(checked in 8B).

**R2 — Convergence of the mean (exact under S, L).** The conditional
expectation is affine in M:

```
E[M_{t+1} | M_t] = r·M_t + p·a,   r = 1 − p·a − (1−p)·b
```

Taking expectations and iterating gives an exact closed form for every
t:

```
E[M_t] = M° + r^t·(M_0 − M°),   M° = p·a / (p·a + (1−p)·b)
```

Substituting the variants (c cancels in both):

```
M°_A(p)   = p·α / (p·α + (1−p)·β)
M°_B(p,w) = p·α·w² / (p·α·w² + (1−p)·β)
```

M° is the long-run mean, not a limit of M itself (R4).

**R3 — Mixed difficulty levels (exact under S; corrects v1).** If each
item's level L is drawn independently with probability π_L and the
learner's success probability at that level is p_L, the zero of the
expected drift is:

```
M° = (α Σ_L π_L w_L p_L) / (α Σ_L π_L w_L p_L + β Σ_L π_L w_L' (1−p_L))
```

For Variant A this equals M°_A(p̄_w), where p̄_w = Σ π_L w_L p_L /
Σ π_L w_L is a difficulty-weighted accuracy: harder items count more.
So v1's statement that Variant A ignores difficulty in the long run
holds only for single-level streams. In a mixed stream, Variant A
weights accuracy by difficulty; Variant B additionally shifts the
balance between the two branches.

**R4 — Stationary spread (exact under S, L).** The update is a random
affine map M′ = A·M + B with (A, B) = (1 − a, a) with probability p and
(1 − b, 0) with probability 1 − p. Because A < 1 always, the chain has a
unique stationary distribution with mean M° and second moment:

```
s = (2·E[AB]·M° + E[B²]) / (1 − E[A²])
E[A²]  = p(1−a)² + (1−p)(1−b)²
E[AB]  = p·a(1−a)
E[B²]  = p·a²
```

Stationary SD = √(s − M°²). At L3 (a = 0.12, b = 0.10, either variant):

| Accuracy p | Long-run mean M° | Stationary SD |
|---|---|---|
| 0.25 | 0.286 | 0.111 |
| 0.50 | 0.545 | 0.120 |
| 0.75 | 0.783 | 0.097 |
| 0.90 | 0.915 | 0.065 |

A learner with constant 75% accuracy therefore hovers around 0.78 with
SD about 0.10 and repeatedly crosses the 0.75 progression threshold.
Crossing probabilities have no simple closed form; they are computed
numerically in 8B (test M-4).

**R5 — Mean-equivalent accuracies (exact; corrects v1's
interpretation).** Solving M° = θ gives the accuracy whose long-run mean
equals threshold θ:

```
p_θ = θ·b / (a(1−θ) + θ·b)
```

| Threshold θ | Variant A, single level | Variant B, L1 | Variant B, L5 |
|---|---|---|---|
| 0.50 (M₀) | 0.455 | 0.566 | 0.367 |
| 0.35 (remediation) | 0.310 | 0.412 | 0.238 |
| 0.75 (progression) | 0.714 | 0.796 | 0.635 |

These are not the accuracies at which decisions fire. Decisions fire on
the fluctuating M (R4), so a learner below p_θ can still trigger
progression, and one above it can still fall back.

**R6 — Guessing floor (exact mean; one numerical step).** A learner who
knows nothing and guesses among four options has p = 0.25, so M° = 0.286
with SD 0.111 (R4). The mean is below the 0.35 remediation threshold,
but the spread means such a learner is often above it. The share of time
above 0.35 is numerical (test M-4). Consequence: a low or moderate M
does not certify absence of knowledge, and M is not a probability of
knowing.

**R7 — Speed of progression (exact; corrects v1).** From M₀ with n
consecutive correct answers at constant a, 1 − M_n = (1 − a)ⁿ(1 − M₀),
so the minimum n to reach θ is ⌈ln((1 − θ)/(1 − M₀)) / ln(1 − a)⌉. From
0.5 to 0.75 at a constant level: 7 (L1), 7 (L2), 6 (L3), 5 (L4), 5 (L5).

On the default selection path from cold start the levels are not
constant. The first three questions are L2 (evidence below
minEvidenceCount), then the band rule applies:

| Correct answers | Level served | M after |
|---|---|---|
| 1–3 | L2 | 0.645 |
| 4 | L3 (M ≤ 0.65) | 0.688 |
| 5 | L4 (M ≤ 0.85) | 0.729 |
| 6 | L4 | 0.765 ≥ 0.75 |

So 6 consecutive correct answers are the minimum for progression under
the default policy, for both variants (the correct branch is
identical). Assumes: c = 1, exact-difficulty items available (no
widening), no repetition nudge triggered (none is, on this path).

**R8 — Memory of the mean (exact) and its interpretation
(approximate).** By R2 the effect of the starting value on the mean
decays geometrically with ratio r. The half-life is ln 2 / (−ln r): at
L3 it is 6.3, 6.0 and 5.7 responses for p = 0.25, 0.50 and 0.75 (time
constants 9.0, 8.6 and 8.2). This is exact for the mean. Saying the
model "remembers about 8–9 responses" is an interpretation: the realised
weight of any single past response depends on the outcomes that
followed it.

**R9 — Revocability (exact).** One incorrect answer at M = 0.75 gives
0.75(1 − b): 0.668 at L4 under Variant A and 0.682 under Variant B.
Because `isConceptMastered` is re-evaluated, the frontier moves back.
This can also happen without any backtracking decision: multi-concept
items update every concept in their weights, so a later item can push an
earlier concept below 0.75.

**Verification requirement.** Each result has a numerical test in 8B
(C9, tests M-1 to M-9), written by the independent verifier from this
section's equations, not from the implementation.

### B3. Simulator families and formal ground truth

Tier 1 uses four families (S1–S4), none of which uses the RISE mastery
equation, its thresholds or any selection-policy event. Each favours a
different estimator, and S4 provides cells where prerequisite awareness
should help, cost practice, or point at the wrong concepts. All
parameter values are **[Researcher-defined]** (decision D4) unless a
precedent is cited; the single source of values is C3.

#### B3.1 Shared notation

Learner l, concept k, item q, author level L_q ∈ {1,…,5}, option count
n_q, bank concept weights w_qk, normalised weights w̃_qk = w_qk /
Σ_j w_qj.

σ(x) = 1/(1 + e⁻ˣ). Probabilities are clipped to [0.01, 0.99] after
computation.

World-level draws (shared by all learners in a world, and by all S4
cells): item noise ε_q ~ N(0, 0.5²); concept easiness c_k ~ N(0, 0.5²);
family concept parameters; S4 edge-retention uniforms.

Learner-level draws: μ_l ~ N(0, 1); u_lk ~ N(0, 0.6²); γ_l ~ N(0,
0.05²); s_l ~ U(0.02, 0.12); ν_l ~ N(0, 0.3²) (S3 only).

Continuous-family item difficulty: b_q = 0.6·(L_q − 3) + ε_q (logits).

Learner guess on item q: g_lq = clip(1/n_q + γ_l, 0.05, 0.45).

Opportunity counting: after the response to q, each concept k with
w_qk > 0 receives a counted opportunity with probability w̃_qk
(probability 1 for single-concept items). n_lk(t) is the count so far.

Order within a step: respond from the current state → apply learning
transitions → log truth.

#### B3.2 The reference item (hypothetical, not from the bank)

The latent-recovery target is the probability of answering a
hypothetical reference item r_k correctly. r_k tests concept k only
(weight 1), has 4 options, author level 3, item noise ε = 0 (so b = 0 in
continuous families), and uses each family's own guess and slip
mechanism for that learner and concept. It is never presented to a
learner; it exists only to define truth.

#### B3.3 Family definitions

**S1 — Stationary logistic learners.** Precedent: logistic IRT with a
guessing floor **[Established]** (Lord, 1980); slip ceiling
**[Researcher-defined]**.

1. Latent state: θ_lk = μ_l + u_lk + c_k − 1.0, fixed.
2. Response: P(correct | q) = g_lq + (1 − g_lq − s_l)·σ(θ_q − b_q),
   with θ_q = Σ_k w̃_qk θ_lk.
3. Difficulty: through b_q only.
4. Guess/slip: floor g_lq, ceiling 1 − s_l.
5. Multi-concept: compensatory θ_q.
6. Transition: none.
7. p*_lk = g_l,ref + (1 − g_l,ref − s_l)·σ(θ_lk), with g_l,ref =
   clip(0.25 + γ_l, 0.05, 0.45).
8. m_lk = σ(θ_lk) — success probability on a b = 0 item with guessing
   and slipping removed.
9. mastered_lk ⇔ m_lk ≥ 0.8 ⇔ θ_lk ≥ ln 4 ≈ 1.386.

**S2 — BKT-generative learners.** Precedent: the BKT hidden Markov model
**[Established]** (Corbett & Anderson, 1994).

1. Latent state: L_lk ∈ {0, 1}; L_lk(0) ~ Bernoulli(P(L₀)_k).
2. Response, single concept: P(correct) = L(1 − S_k) + (1 − L)G_k.
3. Difficulty: none.
4. Guess/slip: concept-level G_k, S_k, independent of n_q (this is the
   family's mechanism).
5. Multi-concept: draw concept j with probability w̃_qj, then respond
   from j's state, so P(correct) = Σ_k w̃_qk[L_k(1 − S_k) + (1 −
   L_k)G_k].
6. Transition: on a counted opportunity, L_k = 0 becomes 1 with
   probability T_k. No forgetting.
7. p*_lk = L_lk(1 − S_k) + (1 − L_lk)G_k.
8. m_lk = L_lk.
9. mastered_lk ⇔ L_lk = 1.

**S3 — Practice-driven continuous learners.** Precedent: the Additive
Factors Model, where log-odds grow linearly with practice opportunities
**[Established]** (Cen, Koedinger & Junker, 2006); use as a generator
**[Researcher-defined]**.

1. Latent state: θ_lk(t) = θ_lk(0) + η_lk·n_lk(t), θ_lk(0) as in S1,
   η_lk = η_k·exp(ν_l).
2–5. As S1, using the current θ.
6. Transition: each counted opportunity adds η_lk. Independent of
   correctness and item difficulty.
7–9. As S1, using the current θ.

**S4 — Prerequisite-gated binary learners.** Precedents: conjunctive
prerequisite structure in Knowledge Space Theory **[Established]**
(Doignon & Falmagne, 1985); prerequisite relations in dynamic Bayesian
networks **[Established]** (Käser et al., 2014). Gating rule
**[Researcher-defined]**.

1. True graph G*. Fix a topological order of the curriculum graph G by
   (curriculumLevel, conceptId). Each curriculum edge e is kept if its
   world-level uniform u_e < φ. For each dropped edge, add one edge
   (i, j) with i before j in that order, chosen uniformly among pairs
   not yet in G*. G* is acyclic by construction. The tutor always sees
   G, never G*.
2. Gating factor: κ_lk(t) = 1 if every G*-parent of k is known at t,
   otherwise λ.
3. Latent state: L_lk ∈ {0, 1}. Initial state, in topological order of
   G*: L_lk(0) = 1 if u⁰_lk < κ_lk(0)·π_k.
4. Response, single concept: P(correct | L, L_q) = L·(1 − S_k
   e^{ζ(L_q − 3)}) + (1 − L)·G_k e^{−ζ(L_q − 3)}, ζ = 0.25.
5. Difficulty: harder items raise slip and lower guess.
6. Guess/slip: concept-level G_k, S_k modulated by level.
7. Multi-concept: concept-sampled mixture as in S2.
8. Transition: on a counted opportunity, L_k = 0 becomes 1 with
   probability κ_lk(t)·τ_k. No forgetting.
9. p*_lk = L_lk(1 − S_k) + (1 − L_lk)G_k (the reference item is level
   3, so the ζ term equals 1).
10. m_lk = L_lk.
11. mastered_lk ⇔ L_lk = 1.

**S4 cells (Tier 1).** All share the same worlds and learner draws
(common random numbers across cells); they differ only in λ and φ.

| Cell | λ | φ | Role | Expected effect of prerequisite awareness (C2 vs C3) |
|---|---|---|---|---|
| S4-ref | 0.30 | 1.0 | Track A family | — |
| S4-GF (gated, faithful) | 0.05 | 1.0 | H-B1, H-B2 | Benefit, net of budget spent on background concepts |
| S4-N (no gating) | 1.0 | — | H-B3 comparator; negative control for causal benefit | No causal benefit; a cost is possible |
| S4-GW (gated, wrong graph) | 0.05 | 0.0 | H-B4 comparator | Practice aimed at non-causal concepts; true gaps unaddressed |

#### B3.4 Common scales

| Quantity | Continuous families (S1, S3) | Binary families (S2, S4) | Used for |
|---|---|---|---|
| p*_lk | g_ref + (1 − g_ref − s_l)σ(θ_lk) | L(1 − S_k) + (1 − L)G_k | Track A latent recovery |
| m_lk | σ(θ_lk) | L_lk | Track B outcome |
| K(T) | mean of m over T_c at budget end | share of T_c truly known | Track B outcome |
| mastered | m ≥ 0.8 | L = 1 | Secondary metrics |

p* is a probability of a correct response; m is the latent state. In
binary families m is 0 or 1 — the truth about knowing — whereas p* still
includes guessing and slipping. BKT's P(L) estimates m; no estimator's
raw score is compared with m on a probability scale.

Predictions are compared on a common scale in two ways only: observed
correctness of actual items (log loss) and p* of the reference item
(MAE).

K(T) is never pooled across families because its meaning differs
between continuous and binary families. All Track B inference is per
family.

#### B3.5 Mathematical unit tests (written by the independent verifier)

| Test | Requirement |
|---|---|
| G-1 | For each family, an injected reference item answered 100,000 times by a frozen learner gives an empirical correct rate within 4 Monte Carlo SEs of p* |
| G-2 | m = σ(θ); mastered switches exactly at θ = ln 4 |
| G-3 | K(T) equals the mean of m over T_c, recomputed from the truth log |
| G-4 | S1 latent state is bit-identical after 1,000 steps |
| G-5 | S2 and S4 (λ = 1) transition frequencies match T_k and τ_k within 4 MCSE |
| G-6 | S3: θ increases by exactly η_lk per counted opportunity and is otherwise unchanged |
| G-7 | S4-N with the gating code path enabled equals a run with gating removed, byte for byte |
| G-8 | G* is acyclic; edge count equals curriculum edge count (or the shortfall is logged when no free pair exists) |
| G-9 | Multi-concept mixture: empirical correct rate matches Σ w̃[L(1 − S) + (1 − L)G] within 4 MCSE |
| G-10 | Opportunity-counting frequency per concept matches w̃_qk within 4 MCSE |
| G-11 | P(correct) is monotone non-increasing in L_q for S1, S3, S4 at fixed state |
| G-12 | S4 cells share initial uniforms: switching λ changes only states whose gating factor changes |
| G-13 | No estimator or policy input object contains any truth-log field (static and runtime check) |

Tier 2 family S5 (misconception overlay) is specified in Deliverable D.

### B4. Estimators, BKT fitting and Track A fairness

Tier 1 has seven estimators. BKT is fitted by bounded multi-start
expectation–maximisation instead of v1's exhaustive grid, which cuts
worst-case cost by about 30× and typical cost by over 100×, and a
pre-specified agreement test checks that this does not disadvantage
BKT.

#### B4.1 Tier 1 estimators

| ID | Definition | Parameters and how set | Role |
|---|---|---|---|
| Det-A | Implemented Variant A, unchanged | Frozen defaults (briefing §1.2) | Confirmatory |
| Det-B | Implemented Variant B, unchanged | Frozen defaults | Confirmatory |
| BKT-fit | Standard 4-parameter BKT per concept **[Established]** (Corbett & Anderson, 1994) | Fitted per concept on calibration learners (B4.2) | Confirmatory comparator (D3) |
| BKT-default | Same model, untuned | P(L₀) = 0.5, P(T) = 0.1, G = 0.25, S = 0.1, fixed before any data | Matched untuned comparator (secondary) |
| RunProp | Laplace-smoothed proportion correct, (c + 1)/(n + 2) | None | Simple baseline (secondary) |
| EMA | M ← M + 0.11(o − M), M₀ = 0.5 | λ = 0.11 = mean of α and β, untuned | Isolates what asymmetric rates and difficulty weights add (secondary) |
| B0 | Per (concept, level) calibration correct rate, add-one smoothed | Calibration responses | Static reference for reporting skill |

BKT-default's values are chosen to mirror Det's untuned status: P(L₀)
matches Det's M₀, G is the four-option chance rate, and P(T) and S are
round values. They are **[Researcher-defined]**.

#### B4.2 BKT computational feasibility

**Cost of v1's method.** The v1 grid had 19 × 25 × 15 × 15 = 106,875
parameter points. One likelihood evaluation is a forward pass over every
calibration observation of the concept. Summed over a context's
concepts, that is N_cal × R observations, where R ≈ 150 responses per
Track A learner. Over C fitting contexts:

```
cost_grid = G × N_cal × R × C = 106,875 × 100 × 150 × 240 ≈ 3.8 × 10¹¹ forward steps
```

with C = 4 families × 20 worlds × 3 slices = 240 Tier 1 contexts. Cost
grows linearly in each factor.

**Tier 1 method: coarse grid then bounded multi-start EM.**
Expectation–maximisation (Baum–Welch) is the standard BKT fitting
method, used for example by pyBKT, whose authors checked EM parameter
recovery on simulated data (Badrinath, Wang & Pardos, 2021). Doroudi and
Brunskill (2017) recommend grid search or multiple EM initialisations to
avoid local optima.

Bounds: P(L₀) ∈ [0.001, 0.999], P(T) ∈ [0.001, 0.999], G ∈ [0.001,
0.499], S ∈ [0.001, 0.499]. These guarantee G + S < 1, which implies the
non-degeneracy condition P(G) ≠ 1 − P(S) under which Doroudi and
Brunskill show BKT is identifiable, and they exclude slip or guess above
0.5, the "theoretical degeneracy" defined by Baker, Corbett and Aleven
and summarised by Doroudi and Brunskill (2017). The bounds are
deliberately wide so that a misspecified family (where the best-fitting
BKT may sit near a bound) is not forced far from its likelihood maximum.

Coarse grid (225 points): P(L₀) ∈ {0.1, 0.3, 0.5, 0.7, 0.9}, P(T) ∈
{0.02, 0.05, 0.1, 0.2, 0.4}, G ∈ {0.10, 0.25, 0.40}, S ∈ {0.05, 0.15,
0.30}.

Starts: the 5 coarse points with the highest log-likelihood, plus the
BKT-default point (6 starts, deterministic).

EM iteration: scaled forward–backward E-step; closed-form M-step for
each parameter, then clipped to its bound. In BKT's expected
complete-data log-likelihood the four parameters separate and each term
is a concave binomial log-likelihood, so clipping gives the exact
constrained M-step and every iteration is non-decreasing in likelihood
**[Derived]**.

Convergence: relative log-likelihood change below 10⁻⁹ for 3 consecutive
iterations, or maximum parameter change below 10⁻⁷. Cap: 300 iterations
per start.

Selection: the start with the highest final log-likelihood; ties broken
by the lexicographically smallest (P(L₀), P(T), G, S).

```
cost_EM ≤ (225 + 2 × 6 × 300) × N_cal × R × C ≈ 1.4 × 10¹⁰
```

That is the worst case (every start hits the cap); about 27× below the
grid. Typical EM convergence in tens of iterations gives over 100×.
Actual time is measured, not assumed (B9).

**Failure handling.** Every fit records: iterations used; whether any
start hit the cap; which parameters sit within 10⁻³ of a bound; and a
multimodality flag when the two best starts differ by less than 1 nat of
log-likelihood but by more than 0.1 in any parameter. A likelihood
decrease between iterations is a software defect and fails test B-2.
Flags are reported per family; fits are never re-run or adjusted after
confirmatory data exist.

**Calibration-to-test transfer.** BKT-fit is fitted once per (family
configuration, world, slice, concept) using only that world's
calibration learners. The fitted parameters are frozen and applied to
that world's test learners by forward filtering: predict P(correct) =
P(L)(1 − S) + (1 − P(L))G from the pre-response state, then update. This
mirrors fitting on an earlier cohort of the same curriculum.

#### B4.3 BKT validation (8B), not only software tests

| Test | What it checks | Pass rule |
|---|---|---|
| B-1 | Forward likelihood equals brute-force enumeration over hidden paths | Exact to 10⁻¹² for all sequences up to length 10 |
| B-2 | EM log-likelihood is non-decreasing | Every iteration, every fit |
| B-3 | Large-sample correctness: 10 known parameter sets (including near-bound values such as G = 0.45, S = 0.02, P(T) = 0.02), 20,000 synthetic learners × 20 observations | Every parameter within ±0.02 |
| B-4 | Realistic-sample behaviour: S2 pilot worlds at N_cal = 100 | Recovery errors reported; predictive regret (test log loss of fitted minus true parameters) reported. If median regret exceeds 0.005 nats per response, N_cal rises to 300 for all estimators (Amendment A3) before confirmatory runs |
| B-5 | Feasibility does not disadvantage BKT: 50 pilot fits on S2 and S3 compared with an exhaustive grid over the same bounds | EM log-likelihood ≥ grid log-likelihood − 0.5 nats in at least 95% of fits; otherwise Tier 1 uses the exhaustive grid |
| B-6 | Runtime per fit | Measured in 8C-Pilot |

B-4 is a scientific check, not a pass/fail software test. Small
calibration samples can make fitted BKT predict worse than BKT with true
parameters, and the study must know whether that is happening before
comparing BKT with anything.

#### B4.4 Fairness audit

| Question | Resolution |
|---|---|
| Equivalent histories? | Every estimator replays the identical response sequence of each test learner |
| Raw score vs probability? | Raw scores (M, P(L), proportions) are never scored as probabilities in a confirmatory test. Every estimator passes through the same calibration link (B4.5) |
| Links fitted only on calibration data? | Yes; frozen for test learners |
| Is the same link flexibility appropriate for all? | Yes as equal post-processing: 7 parameters against roughly 15,000 calibration responses per context, so overfitting is negligible. BKT's native predictions are also reported, because they are what a deployed BKT would output |
| Could the link hide differences? | Yes: it can correct a model's systematic miscalibration. So Track A measures the information content of each score. Identity (native for BKT) and Link-1 results are reported beside the primary Link-D results |
| Q stability? | Q is dropped; confirmatory tests use absolute paired differences (B8) |
| Fitted baselines vs frozen Det? | Two named comparisons: the calibrated-baseline comparison (Det frozen vs BKT-fit, confirmatory) and the matched-untuned comparison (Det frozen vs BKT-default, secondary). A tuned Det variant is Tier 2 |
| Multi-concept BKT? | Avoided: Tier 1 Track A uses single-concept items only (B5). The fractional-evidence update is a non-HMM approximation and appears only in Tier 2, labelled as such |

If BKT is consistently better, the paper reports the cost of the
heuristic in nats per response and probability units, per family, and
concludes that its value — if any — lies in transparency, speed or
sequencing behaviour, not in estimation accuracy. Because Tier 1 has no
BKT-driven policy, it could not then claim that the heuristic sequences
as well as BKT would.

#### B4.5 Calibration link (all estimators)

For raw score r, z = logit(clip(r, 10⁻⁴, 1 − 10⁻⁴)). Link-D: P̂ =
σ(a + b·z + Σ c_L·1[L_q = L]), with L3 as reference; if the pre-flight
finds option counts other than 4, an option-count term is added with n =
4 as reference. Fitted by Newton–Raphson maximum likelihood with an L2
penalty of 10⁻⁴, per estimator per (family configuration, world,
slice), on calibration learners' pre-update scores. Link-1 drops the
level terms. The latent estimate is the link at the reference item:
p̂* = σ(a + b·z).

### B5. Track A procedure

Every estimator replays the same estimator-independent response history
for each test learner, built from single-concept items in three fixed
curriculum slices. Fitting uses only calibration learners from the same
world; scoring uses only test learners.

#### B5.1 Curriculum slices (shared with Track B)

Slices are chosen by a fixed rule from bank and curriculum structure
only, before any outcome exists.

For each chapter c, T_c = its concepts (targets); X_c = prerequisites of
T_c within 5 prerequisiteIds hops that lie outside the chapter (external
prerequisites). SC(k) = number of questions whose concept weights name
only concept k.

A chapter is eligible if all hold:

1. 5 ≤ |T_c| ≤ 12 and at least 3 prerequisite edges inside T_c;
2. 2 ≤ |X_c| ≤ 10, and at least ⌈|T_c| / 2⌉ target concepts have an X_c
   concept within 5 hops (so ordinary backtracking can act);
3. SC(k) ≥ 16 for every k in T_c and SC(k) ≥ 8 for every k in X_c
   (enough single-concept items for the Track A schedule without
   reuse);
4. Q_slice, the set of questions whose every concept lies in T_c ∪ X_c,
   has at least 120 questions (twice the Track B budget).

Rank eligible chapters by (edges inside T_c + edges from X_c into T_c),
descending; ties by chapterId ascending. Take the top three.

If fewer than three are eligible, relax in this order, stopping as soon
as three qualify: (a) |T_c| range 4–16; (b) |X_c| ≥ 1 and at least one
target with an external prerequisite; (c) item thresholds counted over
all items rather than single-concept items, in which case Track A also
includes multi-concept items and BKT uses primary-concept attribution,
reported as an identified approximation.

Record the result, every relaxation applied and the item counts as
Amendment A1 before 8C-Pilot.

#### B5.2 History schedule ("blocked-with-review")

The schedule is generated from its own seed stream and cannot be
influenced by any estimator.

1. Phase 1: 6 items for each X_c concept, in topological order of the
   curriculum graph.
2. Phase 2: 12 items for each T_c concept, in curriculum order. After
   every 4th Phase 2 item, insert one review item from a concept chosen
   uniformly among those already practised.
3. Item choice within a concept: choose a level uniformly among levels
   with unused single-concept items of that concept, then an item
   uniformly within that level, without replacement. Reuse is allowed
   only if the concept is exhausted, and is logged.

Length per learner is 6|X_c| + 15|T_c| items (87–240 under the
eligibility rule).

#### B5.3 Procedure per (family configuration, world, slice)

1. Generate 100 calibration learners and 100 test learners from disjoint
   seed namespaces.
2. For each learner, generate the schedule, the responses and the truth
   log once.
3. Calibration learners: run every estimator over their histories; fit
   BKT-fit (B4.2), B0, and each estimator's calibration links (B4.5)
   from pre-update scores.
4. Test learners: replay each history through every estimator with
   frozen fitted parameters and links. At each response, record the
   estimator's pre-update raw score for that item's concept, the three
   link outputs, p̂*, and the truth (p*, m, mastered) at the pre-response
   state.
5. Compute per-learner metrics over that learner's responses (B8.2). No
   test-learner information enters any fit.

#### B5.4 Scoring points

Every response of a test learner is a scoring point, including the
first on each concept, so every estimator is scored on cold starts
equally. Latent recovery is scored at the same points, for the
practised concept only, which keeps both primary metrics on identical
points.

#### B5.5 What Track A does not cover

- Multi-concept attribution (unless relaxation (c) is triggered).
- Histories generated by an adaptive policy. Replaying C2 sessions
  through all estimators is Tier 2 and confounded by design, because
  those histories were selected by Det-B's own estimates.
- Robustness to fitting on one family and testing on another (Tier 2).

### B6. Track B procedure and validity audit

Four policies run on matched simulated learners under a 60-item budget,
all drawing from the same slice question pool. In Tier 1 simulators,
learning never depends on item difficulty, so Track B measures the
value of allocating practice across concepts, not of difficulty
matching.

#### B6.1 Session setup

- Curriculum order: T_c in topological order. X_c is deliberately left
  outside the order, so ordinary remediation (briefing §3.2) can reach
  external prerequisites and diagnostic backtracking (§3.3) can reach
  in-order ones.
- Question pool: Q_slice for every policy. If the engine cannot take a
  restricted bank (pre-flight item P-4), all policies use the full
  bank, which is equivalent in practice because every policy filters by
  target concept; the choice is recorded in A1.
- Budget: T = 60 questions. A session that ends early (pool exhaustion
  or another engine termination) is scored at its last step, with no
  further learning — an intention-to-treat rule that charges early
  termination to the policy that caused it. Early-termination rates are
  reported per policy and cell; a rate above 5% for any policy in a
  cell is flagged in the results.
- Learner: the simulator implements `ExperimentResponseProvider`,
  returns correctness for the selected question, then applies its own
  transitions. The engine never sees latent state.

#### B6.2 Tier 1 policies

| ID | Estimator | Selection | Role |
|---|---|---|---|
| C0 | Null | Non-adaptive (definition below) | Confirmatory comparator (H-B1) |
| C1 | Det-A | Default, prerequisite-aware | Secondary (variant comparison) |
| C2 | Det-B | Default, prerequisite-aware | Confirmatory focal (deployed condition) |
| C3 | Det-B | Prerequisite-unaware (implemented ablation) | Confirmatory comparator (H-B2–H-B4) |

**C0 definition (fixed now).** C0 is the implemented
`NonAdaptiveSelectionPolicy` if the pre-flight confirms it (i) can
present T_c in curriculum order from the slice pool and (ii) reads no
estimator state. Otherwise C0 is C0-slice, a new named policy: T_c in
curriculum order, ⌊60 / |T_c|⌋ questions per concept (remainder to the
earliest concepts), levels cycling L1→L5 within each block, items
uniform within level without replacement, seeded. The choice is recorded
in A1 before any outcome exists. C0 is a fair non-adaptive reference —
same pool, budget and order — but it differs from C2 in every adaptive
component at once, so H-B1 tests the adaptive bundle, not any single
mechanism.

#### B6.3 Matching and common random numbers

Each learner profile is generated once per (world, slice, learner) and
reused under every policy. Every stochastic draw uses a counter-based
stream keyed by (world, slice, learner, stream, concept, opportunity
index on that concept). The k-th practice opportunity on concept c
therefore uses the same random number under every policy.

When policies choose different questions, pairing is only partial: the
same uniform meets different items and states. This cannot bias any
comparison, because each key is used at most once per run, so each
run's draws are exactly the specified simulator's. Pairing only reduces
variance. The analysis does not assume perfect pairing; the achieved
correlation of K(T) between paired policies is reported.

#### B6.4 Validity audit

| Question | Finding and resolution |
|---|---|
| Equivalent eligible questions? | Yes: all policies use Q_slice. Only prerequisite-aware policies select X_c items, which is the mechanism under test |
| Is C0 fair? | Yes as a non-adaptive reference (B6.2); interpreted as a bundle comparison |
| Enough relevant questions? | Slice rule requires ≥ 120 questions in Q_slice and ≥ 16 single-concept items per target |
| Is prerequisite selection possible? | Slice rule requires at least half the targets to have an external prerequisite within 5 hops. Ordinary backtracking treats any prerequisite with fewer than 3 observations as needing attention, so in these slices it can fire on the first two-error streak |
| Activated often enough? | Measured, never forced (B6.5). Thresholds are not changed to increase activation |
| Do learning rules reward one policy? | No rule references any policy event. S4 rewards practice on unknown concepts and, in gated cells, on unknown true prerequisites; S2 and S3 reward practice where headroom remains. Difficulty never affects learning |
| Early termination and exhaustion? | Intention-to-treat scoring; rates reported (B6.1) |
| Common random numbers under divergent sequences? | Valid; partial pairing only reduces variance (B6.3) |
| Does adaptive difficulty add other differences? | Yes between C2 and C0 (part of the bundle). Between C2 and C3 the configurations differ only in `prerequisiteAware` (briefing §3.4); downstream differences in difficulty and exposure are consequences of that flag, so C2 − C3 is its total effect. Mediation analysis is Tier 2 |
| Negative controls | S1 (no learning): every policy must produce identical K(T) — an implementation check, since S1 mastery never changes. S4-N: the scientific control for causal prerequisite benefit. S2 and S3 have no prerequisite structure; C2 − C3 there is reported descriptively |

#### B6.5 Mechanism activation

From each selection trace, count decisions by reason: progression,
remediation, insufficient_evidence, prerequisite_backtrack,
diagnostic_probe, no_eligible_concept. Per session report: activated (at
least one prerequisite_backtrack or diagnostic_probe), diverted share
(fraction of the budget spent on concepts outside T_c), and backtrack
precision (share of backtracking decisions aimed at a concept truly
unknown at that moment).

**Interpretation rule (D5):** if fewer than 10% of C2 sessions in S4-GF
are activated, H-B2 to H-B4 are still computed and reported, but are
interpreted as "mechanism rarely active under these conditions" and give
no evidence for or against prerequisite awareness. Low activation is
then itself a reportable finding about the implemented trigger
thresholds.

#### B6.6 Outcomes

Primary: K(T) from the truth log (B3.4), never from any estimator.
Secondary: items to criterion (all targets truly mastered; restricted
mean, censored at 60), false-mastery rate (progressions made while the
concept is not truly mastered), K on X_c, diverted share, backtrack
precision, distinct items, maximum reuse, early termination.

### B7. Track C — traceability

Track C tests three distinct properties — reproducibility, faithful
reconstruction and explanation completeness — and deliberately measures
nothing about human interpretability. Faithfulness of an explanation to
the computation is treated separately from how plausible or
understandable it is to people, following Jacovi and Goldberg (2020).

| Construct | Operational measure | Applies to | Status |
|---|---|---|---|
| Computational reproducibility | R1: every run regenerated from its run record reproduces the identical artifact digest. R2: Phase 6 `replayFromArtifact` on the stored-artifact sample returns `computational_replay` with no divergence | Whole system | Confirmatory check H-C1 |
| Faithful reconstruction (updates) | An independent verifier, written from B2 and B4 equations only, recomputes every update from trace fields alone; maximum absolute error | Det-A, Det-B and BKT-fit | Confirmatory check H-C2 (tolerance 10⁻¹²) |
| Explanation consistency | Every number in Det's explanation string parses to the matching `termsComputed` value | Det | Part of H-C2 |
| Faithful reconstruction (selection) | Share of selection decisions that are fully, partially or not reconstructable from the selection trace alone (definitions in C8) | Selection policy | Descriptive |
| Explanation completeness | Checklist per model: inputs, all parameters, every intermediate term, output, model version | Det and BKT | Descriptive |
| Computational cost | Median per-update time and trace bytes per update | Det and BKT | Descriptive (Tier 1 minimal; profiling is Tier 2) |
| Human interpretability | Not measured | — | No claim permitted |

BKT receives a trace that is equally explicit: prior P(L), G, S, T, the
two likelihoods, the posterior, the post-transition value and the
prediction. The expected outcome is that both models are fully
reconstructable from their traces. If so, the paper can claim that the
RISE system's decisions are auditable and reproducible; it cannot claim
that deterministic updates are more interpretable than BKT. Selection
reconstructability is expected to fall short of 100%, because
`topCandidates` is capped at 10; that is reported as a property of the
implemented trace, not a failure.

### B8. Hypotheses and statistical analysis plan

Tier 1 has eight confirmatory statistical tests, Holm-corrected
together, plus two deterministic checks. Worlds are the independent
units; every comparison is paired within learners and worlds;
estimation hypotheses are non-inferiority tests that the deterministic
model can fail.

#### B8.1 Inference framework

**Aggregation.** A learner-level quantity (a metric, or a paired
difference d_l) is averaged over the learners in a world–slice cell,
then over the 3 slices with equal weight, giving one value D_w per
world. The family estimate is the mean of D_w over W = 20 worlds.

**Test and interval.** One-sample t on {D_w} with W − 1 degrees of
freedom; 95% two-sided t-interval for every estimand. A non-inferiority
decision at level α is equivalent to the one-sided upper confidence
bound lying below the margin.

**Why the world is the unit.** Learners in a world share item noise,
concept parameters and the true graph, so learner-level intervals
understate uncertainty about the simulation distribution (B1.4).
Responses within a learner are never treated as independent.

**Assumptions.** Worlds are independent and identically distributed by
construction. Each D_w averages 150 (Track B) to 300 (Track A) learner
values, so approximate normality of D_w is reasonable; this is checked
by the sensitivity analyses rather than assumed silently.

**Sensitivity analyses** (pre-specified, reported beside the primary):
(i) exact world-level sign-flip permutation (2²⁰ ≈ 10⁶ flips), which
assumes D_w is symmetric under the null; (ii) world-cluster
percentile-t bootstrap, 10,000 resamples (cluster resampling is the
variant shown consistent under random-effect models by Field & Welsh,
2007). If a sensitivity analysis disagrees with the primary decision,
both are reported and the pre-registered primary stands.

**Conditional diagnostics.** Learner-level bootstrap intervals within a
single world are reported only as diagnostics and labelled "conditional
on world".

#### B8.2 Learner-level metrics

```
LL_l  = -(1/n_l) Σ_i [ o_i·ln(P̂_i) + (1 − o_i)·ln(1 − P̂_i) ]
MAE_l =  (1/n_l) Σ_i | p̂*_i − p*_i |
```

over the learner's scoring points (B5.4), using Link-D predictions.
K_l(T) is defined in B3.4. Log loss is a strictly proper scoring rule
(Gneiting & Raftery, 2007), which is why it, not accuracy, carries the
predictive claim.

#### B8.3 Confirmatory hypotheses

F_A = {S1, S2, S3, S4-ref}. Margins are decision D1.

| ID | Estimand (per family f) | H₀ | H₁ | Test | Direction |
|---|---|---|---|---|---|
| H-A1-A | Δ^LL_f = E[LL(Det-A) − LL(BKT-fit)], nats per response | Δ^LL_f ≥ 0.010 for some f ∈ F_A | Δ^LL_f < 0.010 for every f | Intersection–union: p = max over f of one-sided t p-values | One-sided |
| H-A1-B | Same, Det-B | as above | as above | as above | One-sided |
| H-A2-A | Δ^MAE_f = E[MAE(Det-A) − MAE(BKT-fit)], probability units | Δ^MAE_f ≥ 0.030 for some f | < 0.030 for every f | Intersection–union | One-sided |
| H-A2-B | Same, Det-B | as above | as above | as above | One-sided |
| H-B1 | Δ_f = E[K(C2) − K(C0)] for f ∈ {S2, S3, S4-GF} | Δ_f ≤ 0 for some f | Δ_f > 0 for every f | Intersection–union | One-sided |
| H-B2 | Δ_GF = E[K(C2) − K(C3)] in S4-GF | Δ_GF ≤ 0 | Δ_GF > 0 | One-sample t on D_w | One-sided |
| H-B3 | Gating moderation: Δ_GF − Δ_N, paired by world (S4-GF and S4-N share worlds and learners) | ≤ 0 | > 0 | t on world-level differences | One-sided |
| H-B4 | Graph-fidelity moderation: Δ_GF − Δ_GW, paired by world | ≤ 0 | > 0 | t on world-level differences | One-sided |

- Unit of analysis: world (W = 20), with paired learner differences
  aggregated as in B8.1.
- Effect sizes: raw differences in natural units (nats per response,
  probability units, mastery points). World-level standardised effects
  (mean D_w / SD of D_w) are secondary.
- Intervals: 95% two-sided t-intervals for every per-family estimand
  and every contrast.
- Intersection–union tests reject only if every component rejects at
  level α, and need no adjustment across their components (Berger,
  1982). The per-family component results are reported as estimates;
  they are not separately error-controlled claims.
- Multiplicity: Holm's procedure (Holm, 1979) over the eight p-values
  at family-wise α = 0.05. Decision threshold: Holm-adjusted p < 0.05.
- Margin interpretation (D1): 0.010 nats per response is roughly the
  excess loss of predicting 0.63 when the truth is 0.70. A
  latent-recovery margin of 0.030 means three percentage points of
  reference-item correctness.

#### B8.4 Why H-B3 and H-B4 are moderation tests, not equivalence tests

Without gating (S4-N), prerequisite-aware sequencing can still spend
budget on background concepts, so a cost is expected and equivalence
has no theoretical basis. The three prerequisite hypotheses therefore
form one argument:

| Pattern | Interpretation |
|---|---|
| H-B2 fails | No net benefit even when prerequisites gate learning and the graph is correct |
| H-B2 passes, H-B3 fails | A benefit exists, but it is not attributable to causal prerequisite structure |
| H-B2 and H-B3 pass, H-B4 fails | The benefit depends on gating but not demonstrably on the graph being correct |
| All three pass | Benefit is specific to correct, causally relevant prerequisite knowledge, net of opportunity cost |

Δ_N (the effect with no gating, i.e. the opportunity cost or any
non-causal routing effect) and Δ_GW (the effect when the graph is
wrong) are descriptive-primary estimands: always reported with
two-sided intervals, never tested for equivalence. A non-significant
Δ_N is reported as "no difference detected", never as "no cost";
absence of an effect can only be supported by an equivalence test with
a justified margin (Lakens, 2017), and no such margin exists here.

#### B8.5 Deterministic checks (outside Holm)

- **H-C1 replay fidelity:** falsified by any single R1 or R2
  divergence.
- **H-C2 trace reconstruction:** falsified by any update error above
  10⁻¹² for Det or BKT.

#### B8.6 Non-evaluability and failure rules (fixed now)

| Condition | Consequence |
|---|---|
| BKT-fit's log loss exceeds B0's in a family (interval excluding 0), or BKT validation B-5 fails | H-A components for that family are labelled "comparator failure — non-inferiority uninformative"; the IUT result is reported with that qualification, alongside BKT-default and B0 |
| Fewer than 10% of C2 sessions in S4-GF are activated (D5) | H-B2–H-B4 reported but interpreted as uninformative (B6.5) |
| S1 implementation check: any policy difference in K(T) ≠ 0 | Analysis halts until explained |
| More than 1% of runs fail in any condition | Analysis halts; no run is ever excluded silently |
| A defect is found after confirmatory data exist | Fix only with an independent failing test that demonstrates the defect; rerun every affected condition; report original and corrected results side by side; record as an amendment |

#### B8.7 Pre-specified secondary analyses (intervals, no p-values)

Matched-untuned comparison (Det vs BKT-default); Det vs RunProp and EMA;
Det-A vs Det-B; BKT native predictions vs Det Link-D; Brier score; AUC
of raw scores (link-free); expected calibration error with 15
equal-mass bins (Naeini, Cooper & Hauskrecht, 2015) and reliability
diagrams; identity-link loss for Det (diagnostic only); P(L) vs true L
for BKT in S2 and S4; C1 vs C2; all secondary Track B metrics (B6.6);
Δ_N and Δ_GW; activation rates in every cell; H-C3 and completeness.
Every per-family estimate is shown, so a pooled or intersection–union
result cannot hide a family-specific failure.

### B9. Tiers, scale, compute and data volume

Tier 1 is about 48,000 Track A histories and 63,000 Track B sessions. No
runtime is asserted: operation counts are given here, and wall-clock
projections come only from the 8C-Pilot benchmark.

#### B9.1 Tier 1 — minimum confirmatory study

| Item | Track A | Track B |
|---|---|---|
| Simulator configurations | S1, S2, S3, S4-ref | S1 (implementation check), S2, S3, S4-GF, S4-N, S4-GW |
| Worlds per configuration | 20 | 20 (S1: 5) |
| Slices | 3 | 3 |
| Learners per world–slice | 100 calibration + 100 test | 50, each run under every policy |
| Conditions | 6 dynamic estimators + B0 | C0, C1, C2, C3 |
| Length | ≈ 150 responses (87–240) | T = 60 questions |
| Total units | 4 × 20 × 3 × 200 = 48,000 histories | (5 + 5 × 20) × 3 × 50 × 4 = 63,000 sessions |
| Core operations | ≈ 7.2 × 10⁶ simulated responses; ≈ 4.3 × 10⁷ estimator updates; ≈ 3,600 BKT fits (worst case 1.4 × 10¹⁰ forward steps); 1,440 link fits | ≈ 3.8 × 10⁶ selection steps, doubled to 7.6 × 10⁶ by R1 regeneration replay |
| Retained data (estimate, ~150 bytes per row) | Test-learner predictions ≈ 2.2 × 10⁷ rows ≈ 3 GB raw, ≈ 0.3–0.5 GB compressed; fitted parameters and links (small) | Export datasets + change-only truth log ≈ 2 × 10⁷ rows ≈ 3 GB raw, ≈ 0.3–0.5 GB compressed; full artifacts for a 5% sample (size measured in pilot) |

The byte estimates are assumptions to be replaced by pilot
measurements. Inference is at world level, so precision comes mainly
from the number of worlds; learners per world are set modestly for that
reason.

#### B9.2 Outcome-blind precision rule (8C-Pilot)

The pilot uses 5 separate pilot worlds per configuration (seed split
pilot). For each confirmatory estimand it computes only per-condition
world-level variances σ²_A and σ²_B — never a contrast — and a
conservative difference SD, SD_d = √(σ²_A + σ²_B), which ignores the
positive correlation created by common random numbers. For moderation
contrasts, the four relevant variances are summed.

Required W is the smallest W with t₀.₉₇₅,W−1 · SD_d / √W ≤ h, where the
target half-width h is half the margin in Track A (0.005 nats; 0.015
probability units) and 0.02 mastery points in Track B. Final W = max(20,
required W). If required W exceeds 60, the pilot reports this to the
author (D6) instead of proceeding. The result is recorded as Amendment
A2. The pilot prints no estimator or policy contrast.

#### B9.3 Runtime benchmark and reduction order

The pilot measures median and 95th-percentile wall time for: a Track B
selection step per policy; an estimator update per estimator; a BKT fit
(with iteration counts); a link fit; and bytes per session and per
stored artifact. Projection = Σ(operation count × median time) × 1.25,
reported with the machine specification.

If the projection exceeds the author's ceiling (D6), reduce in this
order and re-check the precision rule after each step: (1) Track B
learners per world–slice 50 → 30; (2) Track A test learners 100 → 60,
calibration unchanged; (3) S1 check worlds 5 → 3. Never reduce W below
20, and never drop a Tier 1 configuration, condition or hypothesis
without an author-approved amendment.

#### B9.4 Tier 2 — exploratory extensions (not required to finish the study)

| Extension | Adds |
|---|---|
| Elo estimator | Logistic, difficulty-aware tracker; the natural S3 winner |
| C4-BKT sequencing | Sequencing comparison against BKT (D2) |
| S4 intermediate cells (λ 0.30 × φ 0.5, 0.0; λ 0.05 × φ 0.5) | Full help/cost surface |
| C2-noDiag, C2-noMisc | Diagnostic-backtracking and misconception-ranking ablations |
| S5 misconception overlay; S3-ZPD | Misconception detection; difficulty-matching assumption |
| One-at-a-time sensitivity (thresholds, M₀, weights, σ_b, guess/slip, T = 120) | Robustness |
| Det-tuned, cross-family transfer, adaptive-history replay, multi-concept Track A | Fairness and generalisation probes |
| Detailed runtime and memory profiling | Cost comparison |

Priorities, complexity and sizes are in Deliverable D.

### B10. Reproducibility and artifact retention

Every run keeps a compact, mandatory run record from which it can be
regenerated and replayed; full Phase 6 artifacts are stored for a
sample. This resolves v1's contradiction (every run replayable, only
10% stored) without weakening reproducibility, because a run is a
deterministic function of code, configuration and seed tuple.

#### B10.1 Mandatory record for every run

| Field | Purpose |
|---|---|
| Run key: track, configuration, world, slice, split, learner, condition | Regenerates the run |
| Protocol hash, every config hash, package version, git commit | Pins the exact method |
| questionBankVersion, curriculumVersion, slice id, Q_slice hash | Pins inputs |
| Session limits, termination reason, number of steps | Pins the session envelope |
| Question-id sequence, correctness sequence (and chosen option where available) | Enables Phase 5 engine replay without the simulator |
| Content digest of the full in-memory ExperimentRunArtifact | Lets any regeneration be checked byte for byte |
| Truth summary: K at start and end, items to criterion, end mastered set; truth-log digest | Lets outcomes be checked without the full truth log |
| Mechanism counts by selection reason | Activation analysis |

Also mandatory: export datasets B–E of the Phase 6 export contract for
every Track B run, the change-only truth log (start snapshot, every
state change, end snapshot), and for Track A every test-learner
prediction row plus every fitted parameter and link.

#### B10.2 Two-level replay

- **R1a — engine replay, every run:** Phase 5 `replayExperimentSession`
  from the run record's condition, scenario and response sequence must
  reproduce the question sequence and the content digest. Pre-flight
  item P-7 confirms the record holds everything this needs.
- **R1b — regeneration, every run:** regenerate the learner from its
  seed key and rerun the whole session; the digest must match. This
  tests simulator determinism and seed isolation.
- **R2 — Phase 6 artifact replay, stored sample:** full artifacts are
  persisted for a stratified 5% sample (selected by a derived uniform
  within each configuration × condition × slice), for every run with an
  anomaly (early termination, failure, fit flag), and for every run
  used in an illustrative figure. `replayFromArtifact` must return
  `computational_replay` with no divergence.

H-C1 is defined as R1a and R1b for all runs and R2 for the sample, and
is reported that way.

#### B10.3 Randomness and isolation

Master seed string `RISE-PHASE8-v2`. Each derived seed is the first 8
bytes of SHA-256 over the master string and an ordered tuple (track,
family-group, world, slice, split, learner, stream, concept, index). S4
cells share the family-group S4, so they share worlds and learners.

Counter-based draws only: results cannot depend on execution order or
parallelism. The repository's existing seeded RNG and matched-scenario
infrastructure are reused if the pre-flight confirms they meet this
requirement; if the existing RNG is sequential, it is seeded per key so
that each key yields an independent short stream.

Splits calibration, test, pilot and world-k labels are disjoint by
construction; tests assert no learner id appears in two splits.

Estimators and policies receive only the response returned through
`ExternalResponse`; a static and runtime test asserts they cannot reach
truth (test G-13).

#### B10.4 Versioning, manifests and exports

Configurations: `simulator-config-v2.json`, `estimator-config-v2.json`,
`experiment-plan-v2.json`, each with a version string and its own
content hash recorded in every run record.

Phase 6 batch manifests are built per (track, configuration, slice);
they already reject mixed question-bank or curriculum hashes, so a
restricted slice bank is handled naturally.

Analysis reads only retained files: run records, export datasets, truth
logs, predictions, fits. Every table and figure is generated by a
script from those files. Hand-edited result files are forbidden.

At the end of 8D, an archive of configurations, run records, exports,
manifests and analysis outputs is written with its SHA-256, for the
paper's supplementary material.

`protocol/AMENDMENTS.md` records every deviation (A1 slices and C0, A2
worlds, A3 calibration size, any defect) with date, reason, and whether
it preceded confirmatory data.

### B11. Limitations and permitted claims

The study can establish how the system behaves under stated simulation
assumptions and that its decisions are reproducible. It cannot
establish that the tutor helps real students learn, or that its traces
are easier for people to understand.

#### B11.1 Threats to validity

| Type | Threat | Mitigation in this protocol | Residual |
|---|---|---|---|
| Internal | Simulator–model mismatch: each family is a researcher-chosen caricature | Four families favouring different estimators; per-family reporting; intersection–union tests | Conclusions are conditional on the families |
| Internal | Circularity: the author designed both gated simulators and the sequencing policy | Gating acts only on learning probabilities over a graph the tutor never sees; no-gating and wrong-graph cells; moderation tests | S4-GF was still built so that prerequisites can matter |
| Internal | Unequal tuning: BKT fitted, Det frozen | Calibrated and matched-untuned comparisons both reported; same link for all | Det-tuned only in Tier 2 |
| Internal | Shared use of author difficulty by simulator and Det | Item noise σ_b = 0.5; S2 has no difficulty effect | Sensitivity to σ_b only in Tier 2 |
| Internal | Low mechanism activation | Measured; pre-specified interpretation (D5) | Possible uninformative prerequisite results |
| Construct | Mastery as a latent variable is a modelling convention | Each family scored against its own truth via p* and m | Different conventions could shift absolute MAE |
| Construct | Author-assigned difficulty, uncalibrated misconception tags, no independent human review of the bank | Stated; misconception work is Tier 2 | Track B describes the policy on this metadata |
| Construct | Traces measure auditability, not interpretability | Track C restricted to reproducibility and reconstruction | No human-subjects evidence |
| Construct | Hints never exercised (usedHint always false) | Stated | No claim about hint handling |
| External | Simulated learners lack motivation, fatigue, disengagement and response times; learning ignores feedback quality | Stated | No transfer to real students without an empirical study |
| External | Three slices of one bank and curriculum | Fixed-slice conditioning stated in B1.4 | Results may not generalise to other chapters |

#### B11.2 Claims

| Claim | Permitted? |
|---|---|
| "Under family X, Det-B's next-response predictions were (or were not) non-inferior to calibrated BKT within 0.010 nats per response" | Yes |
| "Prerequisite-aware sequencing increased simulated knowledge when prerequisites gated learning and the graph was correct; the advantage did (not) exceed the no-gating case" | Yes, with the full pattern of H-B2–H-B4 and Δ_N, Δ_GW |
| "Every mastery update and selection can be regenerated exactly, and every update can be recomputed from its trace" | Yes, if H-C1 and H-C2 pass |
| "Prerequisite-aware sequencing costs nothing when prerequisites do not matter" | No — a non-significant Δ_N is not evidence of no cost |
| "The model sequences as well as a BKT-driven tutor" | No in Tier 1 |
| "The model is more interpretable than BKT" | No |
| "The tutor improves student learning" | No |
| "The mastery score is a calibrated probability of knowing" | No — B2 (R4–R6) shows it is not |
| "The update rule is a novel learner model" | No — it belongs to the linear-operator family |

### B12. Reference audit and references

Every reference in v2 was checked against a publisher, library or
primary-text record while drafting; the bibliographic details below
come from those records. One relevance claim (Bush & Mosteller) rests
on general knowledge of the book rather than its text and is flagged.
No v1 reference was fabricated, but two v1 attributions were wrong and
are corrected.

#### B12.1 Audit

| Reference | Bibliographic status | Relevance status | Used for |
|---|---|---|---|
| Corbett & Anderson (1994) | Verified (publisher DOI in bibliographies) | Established | BKT definition; S2 |
| Doroudi & Brunskill (2017) | Verified; full text read | Established | Identifiability condition P(G) ≠ 1 − P(S); local-optima advice; degeneracy; BKT fitted to AFM-generated data can be degenerate |
| Beck & Chang (2007) | Verified (record) | Established as the source of the identifiability claim, which Doroudi & Brunskill show was misnamed | Context |
| Baker, Corbett & Aleven (2008) | Verified (record) | Corrected: v1 cited it for a 0.30 bound it does not set. Degeneracy definitions are cited via Doroudi & Brunskill, who attribute them to a related 2008 Baker et al. report | B4.2 |
| van de Sande (2013) | Verified (record) | Established: a fixed-point analysis of BKT, a useful parallel for B2 | Optional citation in the paper's B2 discussion |
| Bush & Mosteller (1955) | Verified (library catalogues) | Flag: that the book's linear-operator model has the form p′ = p + a(1 − p) is from general knowledge; check the relevant chapter before submission | B1.2 framing |
| Cen, Koedinger & Junker (2006) | Verified | Established: source of the Additive Factors Model as used in later work | S3 precedent |
| Doignon & Falmagne (1985) | Verified | Established | S4 precedent |
| Käser et al. (2014) | Verified | Established | S4 precedent |
| Lord (1980) | Verified | Established | S1 precedent |
| Badrinath, Wang & Pardos (2021) | Verified | Established: pyBKT fits BKT by EM and checks EM recovery on simulated data | B4.2 |
| Morris, White & Crowther (2019) | Verified | Established | Simulation-study design (ADEMP), Monte Carlo SEs |
| Gneiting & Raftery (2007) | Verified | Established | Proper scoring rules |
| Naeini, Cooper & Hauskrecht (2015) | Verified | Established | Expected calibration error |
| Holm (1979) | Verified | Established | Multiplicity |
| Berger (1982) | Verified | Established | Intersection–union tests |
| Lakens (2017) | Verified | Established | Non-significance is not equivalence |
| Field & Welsh (2007) | Verified | Established | Cluster bootstrap sensitivity analysis |
| Jacovi & Goldberg (2020) | Verified | Established | Faithfulness vs plausibility |
| Pelánek (2016) | Verified | Established | Tier 2 Elo |
| Pavlik, Cen & Koedinger (2009) | Verified | Established | Tier 2 note (PFA) |
| Xu & Mostow (2011) | Verified (record) | Established | Tier 2 multi-subskill alternatives |
| Khajah, Lindsey & Mozer (2016) | Verified | Established | Tier 2 note on scope |

Researcher-defined, never to be described as established: every
simulator parameter range; the S4 gating rule and graph-fidelity
perturbation; the hypothetical reference item; the blocked-with-review
schedule; C0-slice; the slice rule; the calibration-link specification
(an adaptation of logistic recalibration); BKT-default values; EM
starts and bounds; all margins and the activation threshold; the
fractional multi-concept BKT update (Tier 2).

#### B12.2 References

- Badrinath, A., Wang, F., & Pardos, Z. A. (2021). pyBKT: An accessible
  Python library of Bayesian knowledge tracing models. *Proceedings of
  the 14th International Conference on Educational Data Mining*,
  468–474. arXiv
- Baker, R. S. J. d., Corbett, A. T., & Aleven, V. (2008). More accurate
  student modeling through contextual estimation of slip and guess
  probabilities in Bayesian knowledge tracing. *Intelligent Tutoring
  Systems (ITS 2008)*, 406–415. Springer.
- Beck, J. E., & Chang, K.-m. (2007). Identifiability: A fundamental
  problem of student modeling. *User Modeling 2007*, 137–146. Springer.
- Berger, R. L. (1982). Multiparameter hypothesis testing and
  acceptance sampling. *Technometrics*, 24(4), 295–300.
- Bush, R. R., & Mosteller, F. (1955). *Stochastic Models for
  Learning*. Wiley.
- Cen, H., Koedinger, K. R., & Junker, B. (2006). Learning Factors
  Analysis — A general method for cognitive model evaluation and
  improvement. *Intelligent Tutoring Systems (ITS 2006)*, LNCS 4053,
  164–175.
- Corbett, A. T., & Anderson, J. R. (1994). Knowledge tracing: Modeling
  the acquisition of procedural knowledge. *User Modeling and
  User-Adapted Interaction*, 4, 253–278.
  https://doi.org/10.1007/BF01099821
- Doignon, J.-P., & Falmagne, J.-C. (1985). Spaces for the assessment
  of knowledge. *International Journal of Man-Machine Studies*, 23(2),
  175–196. https://doi.org/10.1016/S0020-7373(85)80031-6
- Doroudi, S., & Brunskill, E. (2017). The misidentified identifiability
  problem of Bayesian knowledge tracing. *Proceedings of the 10th
  International Conference on Educational Data Mining*.
- Field, C. A., & Welsh, A. H. (2007). Bootstrapping clustered data.
  *Journal of the Royal Statistical Society: Series B*, 69(3), 369–390.
  https://doi.org/10.1111/j.1467-9868.2007.00593.x
- Gneiting, T., & Raftery, A. E. (2007). Strictly proper scoring rules,
  prediction, and estimation. *Journal of the American Statistical
  Association*, 102(477), 359–378.
  https://doi.org/10.1198/016214506000001437
- Holm, S. (1979). A simple sequentially rejective multiple test
  procedure. *Scandinavian Journal of Statistics*, 6(2), 65–70.
- Jacovi, A., & Goldberg, Y. (2020). Towards faithfully interpretable
  NLP systems: How should we define and evaluate faithfulness?
  *Proceedings of ACL 2020*, 4198–4205.
- Käser, T., Klingler, S., Schwing, A. G., & Gross, M. (2014). Beyond
  knowledge tracing: Modeling skill topologies with Bayesian networks.
  *Intelligent Tutoring Systems (ITS 2014)*, LNCS 8474, 188–198.
- Khajah, M., Lindsey, R. V., & Mozer, M. C. (2016). How deep is
  knowledge tracing? *Proceedings of the 9th International Conference
  on Educational Data Mining*, 94–101.
- Lakens, D. (2017). Equivalence tests: A practical primer for t tests,
  correlations, and meta-analyses. *Social Psychological and
  Personality Science*, 8(4), 355–362.
- Lord, F. M. (1980). *Applications of Item Response Theory to
  Practical Testing Problems*. Lawrence Erlbaum.
- Morris, T. P., White, I. R., & Crowther, M. J. (2019). Using
  simulation studies to evaluate statistical methods. *Statistics in
  Medicine*, 38(11), 2074–2102.
- Naeini, M. P., Cooper, G. F., & Hauskrecht, M. (2015). Obtaining well
  calibrated probabilities using Bayesian binning. *Proceedings of AAAI
  2015*, 2901–2907.
- Pavlik, P. I., Cen, H., & Koedinger, K. R. (2009). Performance
  Factors Analysis — A new alternative to knowledge tracing.
  *Artificial Intelligence in Education*, Frontiers in AI and
  Applications 200, 531–538.
- Pelánek, R. (2016). Applications of the Elo rating system in adaptive
  educational systems. *Computers & Education*, 98.
  https://doi.org/10.1016/j.compedu.2016.03.017
- van de Sande, B. (2013). Properties of the Bayesian knowledge tracing
  model. *Journal of Educational Data Mining*, 5(2), 1–10.
- Xu, Y., & Mostow, J. (2011). Logistic regression in a dynamic Bayes
  net models multiple subskills better! *Proceedings of the 4th
  International Conference on Educational Data Mining*, 337–338.

## Deliverable C — Tier 1 implementation specification for Claude Code

Implement Phase 8B and run Phase 8C-Pilot, then stop and report. Do not
start Phase 8C confirmatory runs until `protocol/APPROVAL.md` exists,
was written by the author, and contains the SHA-256 of
`protocol/phase8-protocol-v2.md` and of every config file. This section
is self-contained; where it cites B-sections, the equations are
repeated here.

### C0. Ground rules

1. Do not modify anything under `src/domain/learner-model/`,
   `src/tutoring/selection/`, `data/question-bank/`, or any exported
   default (`DEFAULT_MODEL_PARAMETERS`,
   `DEFAULT_MODEL_PARAMETERS_V2_INVERSE_DIFFICULTY`,
   `DEFAULT_ADAPTIVE_SELECTION_CONFIG`,
   `PREREQUISITE_UNAWARE_ADAPTIVE_SELECTION_CONFIG`). The existing 686
   tests must still pass unchanged.
2. New code lives under `src/research/phase8/`, `config/phase8/`,
   `tests/research/phase8/`, `analysis/`, `protocol/`, `docs/phase8/`.
3. Every numeric value comes from `config/phase8/*.json`. Only
   mathematical constants and the clip bounds below may appear as
   literals.
4. Reuse existing infrastructure (seeded RNG, simulator interfaces,
   batch orchestration, matched scenarios, Phase 5 engine, Phase 6
   artifacts) wherever the pre-flight shows it meets these
   requirements. Do not duplicate it.
5. If the code contradicts any assumption below, stop and report. You
   may not resolve a methodological question yourself; the list of
   such questions is in C13.

### C1. Pre-flight (first task; output `docs/phase8/preflight-report.md` with file and line references)

| Item | Question to answer from the code | If the answer is unfavourable |
|---|---|---|
| P-1 | Exact shape of `ExternalResponse`; does it carry a chosen option? | Tier 1 needs correctness only; note it for Tier 2 |
| P-2 | Do all concept weights lie in [0, 1]? Share of questions with one concept key; option-count distribution | Weights outside [0, 1]: stop (B2 R1 premise fails) |
| P-3 | How `createAdaptiveSelectionAdapter` reads estimator state | Report only (Tier 2 C4 depends on it) |
| P-4 | Can the session engine take a restricted question bank? | Use full bank; record in A1 |
| P-5 | Behaviour of `NonAdaptiveSelectionPolicy`: order, use of estimator state, slice restriction | Apply the C0-slice rule (C8.2) |
| P-6 | How `sessionLimits` caps a session; every `terminationReason` | Report |
| P-7 | Does a run record (C11) contain everything `replayExperimentSession` needs? | Add the missing fields to the run record; do not alter the engine |
| P-8 | Is the existing seeded RNG counter-based or sequential? Does matched-scenario infrastructure reuse a learner profile across conditions? | Sequential RNG: seed one instance per derived key (C4) |
| P-9 | Exact field names in `AdaptiveSelectionTrace` (`candidateFilter`, `topCandidates`, `reason`, `diagnosticDetails`) | Report; C8.5 definitions use them |

### C2. Layout

```
src/research/phase8/
  rng/            derive.ts (C4)
  config/         load.ts — schema validation + content hashes
  slices/         selectSlices.ts (C7.1)
  simulator/      shared.ts s1.ts s2.ts s3.ts s4.ts trueGraph.ts referenceItem.ts
                  responseProvider.ts truthLog.ts
  estimators/     bkt.ts bktEm.ts runProp.ts ema.ts baseRate.ts link.ts
  trackA/         schedule.ts runTrackA.ts
  trackB/         conditions.ts c0Slice.ts runTrackB.ts mechanism.ts
  trackC/         replay.ts selectionReconstruct.ts completeness.ts perf.ts
  trackC/verifier/   ← written by a separate agent (C9.3)
  pipeline/       pilot.ts confirmatory.ts approvalGate.ts
config/phase8/    simulator-config-v2.json estimator-config-v2.json experiment-plan-v2.json
analysis/         stats.py figures/ tables/ requirements.txt (pinned)
protocol/         phase8-protocol-v2.md AMENDMENTS.md APPROVAL.template.md
research-output/phase8/   pilot/ confirmatory/   (gitignored)
```

### C3. Versioned configuration

```json
// simulator-config-v2.json
{ "version": "phase8-sim-v2",
  "shared": { "delta": 0.6, "sigmaB": 0.5, "muSd": 1.0, "uSd": 0.6, "cSd": 0.5,
              "thetaOffset": -1.0, "gammaSd": 0.05, "guessClip": [0.05, 0.45],
              "slip": [0.02, 0.12], "probClip": [0.01, 0.99], "masteredM": 0.8,
              "reference": { "options": 4, "level": 3, "epsilon": 0 } },
  "S2": { "pL0": [0.10, 0.50], "T": [0.05, 0.25], "G": [0.15, 0.30], "S": [0.03, 0.15] },
  "S3": { "eta": [0.05, 0.20], "nuSd": 0.3 },
  "S4": { "piTarget": [0.05, 0.25], "piOther": [0.40, 0.80], "tau": [0.10, 0.30],
          "G": [0.15, 0.30], "S": [0.03, 0.15], "zeta": 0.25,
          "cells": { "S4-ref": { "lambda": 0.30, "phi": 1.0 }, "S4-GF": { "lambda": 0.05, "phi": 1.0 },
                     "S4-N": { "lambda": 1.0, "phi": 1.0 }, "S4-GW": { "lambda": 0.05, "phi": 0.0 } } } }
```

```json
// estimator-config-v2.json
{ "version": "phase8-est-v2",
  "detA": "DEFAULT_MODEL_PARAMETERS", "detB": "DEFAULT_MODEL_PARAMETERS_V2_INVERSE_DIFFICULTY",
  "bktDefault": { "pL0": 0.5, "T": 0.1, "G": 0.25, "S": 0.1 },
  "bktEm": { "bounds": { "pL0": [0.001, 0.999], "T": [0.001, 0.999], "G": [0.001, 0.499], "S": [0.001, 0.499] },
             "coarse": { "pL0": [0.1, 0.3, 0.5, 0.7, 0.9], "T": [0.02, 0.05, 0.1, 0.2, 0.4],
                         "G": [0.10, 0.25, 0.40], "S": [0.05, 0.15, 0.30] },
             "topStarts": 5, "includeDefaultStart": true, "relTol": 1e-9, "tolStreak": 3,
             "paramTol": 1e-7, "maxIter": 300, "boundFlagEps": 1e-3,
             "multimodal": { "llGap": 1.0, "paramGap": 0.1 } },
  "runProp": { "prior": [1, 2] }, "ema": { "lambda": 0.11, "m0": 0.5 },
  "baseRate": { "addOne": true },
  "link": { "clip": 1e-4, "l2": 1e-4, "newtonTol": 1e-10, "maxIter": 100, "referenceLevel": 3 } }
```

```json
// experiment-plan-v2.json
{ "version": "phase8-plan-v2", "masterSeed": "RISE-PHASE8-v2",
  "slices": 3, "worlds": 20, "worldsS1": 5, "worldsCap": 60,
  "trackA": { "configs": ["S1", "S2", "S3", "S4-ref"], "calLearners": 100, "testLearners": 100,
              "phase1PerX": 6, "phase2PerT": 12, "reviewEvery": 4 },
  "trackB": { "configs": ["S1", "S2", "S3", "S4-GF", "S4-N", "S4-GW"], "learners": 50, "budget": 60,
              "policies": ["C0", "C1", "C2", "C3"], "artifactSampleRate": 0.05, "earlyTermFlag": 0.05 },
  "margins": { "logloss": 0.010, "mae": 0.030 }, "alpha": 0.05, "activationThreshold": 0.10,
  "precision": { "trackAHalfWidthFraction": 0.5, "trackBHalfWidth": 0.02 },
  "pilot": { "worlds": 5, "trackALearners": [100, 100], "trackBLearners": 50 },
  "analysis": { "eceBins": 15, "bootstrap": 10000, "signFlipExact": true },
  "bkt4": { "regretFlag": 0.005, "calLearnersIfFlag": 300 },
  "bkt5": { "fits": 50, "llTolerance": 0.5, "passShare": 0.95 } }
```

Changing any value requires a new version string and an amendment
entry. Each file's SHA-256 is written into every run record.

### C4. Randomness

`derive(tuple) → uint64`: first 8 bytes (big-endian) of SHA-256 of the
UTF-8 string `masterSeed|f1|f2|…|f9` with fields (track, familyGroup,
world, slice, split, learner, stream, concept, index); unused fields
are the literal `-`. Uniform `u = (x >>> 11) / 2⁵³`. Normal: Box–Muller
from indices 2i and 2i + 1.

`familyGroup ∈ {S1, S2, S3, S4}`: all S4 cells share `S4`. No tuple
contains the cell or the condition, so cells share worlds and learners
and all policies share random numbers.

`split ∈ {calibration, test, pilot}`. World-level streams use learner
`-`.

Streams: `itemNoise`, `conceptParams`, `edgeKeep`, `edgeAdd`, `profile`,
`init`, `response`, `mixture`, `opp`, `learn`, `schedule`, `c0slice`,
`artifactSample`, `bootstrap`.

Opportunity-indexed keys: each learner keeps a counter o_k per concept,
incremented after every presented item with w_qk > 0. `response` and
`mixture` use (concept = the item's primary concept, index = o_primary
read before increment). `opp` and `learn` use (concept k, index o_k
read before increment).

If the existing RNG is sequential (P-8), create one instance per
derived key and draw only from that key's instance.

### C5. Simulator

Notation: σ(x) = 1/(1 + e⁻ˣ); w̃_qk = w_qk / Σ_j w_qj; clip all
probabilities to [0.01, 0.99].

World draws: ε_q ~ N(0, 0.5²); c_k ~ N(0, 0.5²); family concept
parameters (uniform ranges in C3); for S4, u_e ~ U(0, 1) per curriculum
edge.

Learner draws: μ_l ~ N(0, 1); u_lk ~ N(0, 0.6²); γ_l ~ N(0, 0.05²); s_l
~ U(0.02, 0.12); ν_l ~ N(0, 0.3²); S4 initial uniforms u⁰_lk.

Continuous (S1, S3): b_q = 0.6(L_q − 3) + ε_q; g_lq = clip(1/n_q + γ_l,
0.05, 0.45); θ_lk(0) = μ_l + u_lk + c_k − 1.0; P(correct) = g_lq + (1 −
g_lq − s_l)σ(Σ_k w̃_qk θ_lk − b_q). S3: θ_lk += η_lk per counted
opportunity, η_lk = η_k·exp(ν_l).

Binary (S2, S4): choose concept j with probability w̃_qj (stream
`mixture`); S2: P(correct) = L_j(1 − S_j) + (1 − L_j)G_j; S4: L_j(1 −
S_j e^{0.25(L_q − 3)}) + (1 − L_j)G_j e^{−0.25(L_q − 3)}.

Opportunities and learning: for each k with w_qk > 0, counted with
probability w̃_qk (stream `opp`). S2: unknown → known with probability
T_k. S4: with probability κ·τ_k, κ = 1 if all G*-parents are known now,
else λ. No forgetting.

S4 initial state: in topological order of G*, L_lk(0) = 1 if u⁰_lk <
κ·π_k, with π_k from `piTarget` for k ∈ T_c and `piOther` otherwise.

G*: order G by (curriculumLevel, conceptId); keep edge e if u_e < φ;
for each dropped edge, add one edge (i, j), i earlier than j, uniformly
among pairs not in G* (stream `edgeAdd`, successive indices); log any
shortfall.

Truth per concept: p* = g_ref + (1 − g_ref − s_l)σ(θ) with g_ref =
clip(0.25 + γ_l, 0.05, 0.45) (continuous); p* = L(1 − S) + (1 − L)G
(binary). m = σ(θ) or L. mastered: m ≥ 0.8 or L = 1.

Step order: respond from current state → count opportunities and apply
learning → append changed truth rows.

`responseProvider.ts` adapts this to `ExperimentResponseProvider`; it
reads nothing from engine state except the selected question.

```ts
interface SimWorld { family; cell; sliceId; world; itemNoise: Map<QuestionId, number>;
                     concept: Map<ConceptId, FamilyParams>; trueGraph?: Map<ConceptId, ConceptId[]> }
interface LearnerState { latent: Map<ConceptId, number>; opp: Map<ConceptId, number> }
respond(world, profile, state, question) → { correct: boolean }
learn(world, profile, state, question) → LearnerState        // pure
truth(world, profile, state, conceptId) → { pStar, m, mastered }
referenceCorrect(world, profile, state, conceptId, u) → boolean   // test hook for G-1 only
```

## Deliverable D — Tier 2 research extension roadmap

Tier 2 is optional; the core study is complete without any of it.
Extensions are ranked by scientific value to the paper relative to
implementation cost. Every Tier 2 result is exploratory: intervals
only, no p-values, labelled in the paper as such, and run only after
Tier 1 confirmatory data are frozen.

| Priority | Extension | Scientific value | Complexity | Paper use | Approximate size |
|---|---|---|---|---|---|
| 1 | Elo estimator (Pelánek, 2016) | High: supplies the natural S3 winner and a difficulty-aware logistic comparator, closing Tier 1's main baseline gap | Low | Track A table column | Track A replay only; no new sessions |
| 2 | C4-BKT sequencing | High: the only route to a sequencing comparison with BKT (D2) | Medium | One Track B comparison | 2 policies × Tier 1 Track B grid ≈ 31,500 sessions |
| 3 | Full S4 grid (λ ∈ {0.30, 0.05} × φ ∈ {1, 0.5, 0}) | Medium–high: maps where prerequisite awareness helps or costs | Low (config only) | Heatmap figure | 3 extra cells × 2 policies (C2, C3) ≈ 18,000 sessions |
| 4 | One-at-a-time sensitivity (σ_b ∈ {0, 1.0}; G up to 0.40, S up to 0.25; M₀ ∈ {0.3, 0.7}; progression threshold ∈ {0.65, 0.85}; flat difficulty weights*; T = 120) | Medium: robustness of conclusions | Low | Supplementary table | 10 worlds per row, reduced learners |
| 5 | C2-noDiag ablation (`diagnosticBacktrackConsecutiveIncorrectThreshold = 10⁹`, new named config) | Medium: isolates diagnostic backtracking | Low | Mechanism paragraph | 1 policy × S4 cells |
| 6 | Det-tuned (α, β on a 0.02-step grid in [0.02, 0.30], calibration only) | Medium: removes the tuned-vs-frozen asymmetry | Low | Fairness check | Track A replay only |
| 7 | Cross-family transfer (fit on S3, test on S2 and S4-ref) | Medium: misspecification robustness | Low | Supplementary | Track A replay only |
| 8 | S5 misconception overlay | Medium for the misconception component | Medium (needs chosen option in `ExternalResponse`, P-1) | Detection precision/recall | S3-based Track B, C2 vs C2-noMisc |
| 9 | S3-ZPD (gain × 4P(1 − P)) | Low–medium: shows how much a difficulty-matching assumption favours adaptivity; circular by design | Low | Caveat paragraph | One extra configuration |
| 10 | Adaptive-history replay (C2 histories through all estimators) | Low: confounded by design | Low | Supplementary | Reuses Tier 1 runs |
| 11 | Multi-concept Track A (fractional-evidence BKT, or the logistic-regression DBN approach of Xu & Mostow, 2011) | Low–medium | Medium–high | Limitation follow-up | New Track A histories |
| 12 | Mediation of C2 − C3 through difficulty and exposure | Low | Medium | Discussion | Reuses Tier 1 traces |
| 13 | Runtime and memory profiling | Low | Low | Appendix | Benchmark only |

Rows marked * vary a tutor parameter; each is a new named variant and
the implemented default remains the primary analysis.

### D1. Specifications for the top two extensions

**Elo.** Prediction P = g_q + (1 − g_q)·σ(θ − d_{L_q}), g_q = 1/n_q.
Update θ ← θ + K_n(o − P), K_n = a / (1 + b·n), n = prior opportunities
(Pelánek's uncertainty-function form). Level difficulties d₁…d₅ by
maximum likelihood on calibration responses treating every learner as θ
= 0; a ∈ {0.2, 0.4, …, 2.0} and b ∈ {0, 0.05, 0.1, 0.2, 0.5} by grid on
calibration log loss. Raw score for the link: P at d₃ with g = 0.25.

**C4-BKT.** The BKT adapter must expose a `ConceptMasteryState`-
compatible view (counts identical to Det's; mastery = P(L)) if
pre-flight P-3 shows the selection adapter needs one. Because the
selection thresholds were set for the deterministic score, run two
named threshold mappings — (i) defaults unchanged and (ii) progression
threshold 0.95, the conventional BKT mastery criterion — and report
both. Neither is a principled equivalence; the comparison is
exploratory.

**S5 (for priority 8).** Each learner holds each misconception
independently with probability 0.3. Correctness follows the base
family. Given an incorrect response, a held misconception attached to
one of the item's distractors (the first-listed `misconceptionId`, as
the tutor sees it) is chosen with probability 0.7; otherwise a
distractor is chosen uniformly. S5-null: misconceptions never affect
learning; misconception ranking is evaluated only on whether tallies of
2 or more detect held misconceptions (precision and recall).

## Deliverable E — Final scientific review

Read as a skeptical reviewer, the revised protocol is internally
consistent, feasible to benchmark and honest about what it can show.
Five threats remain; none can be fully resolved by simulation, so each
requires a specific qualification in the paper.

| # | Threat | Why it matters | Resolved or mitigated? | Required qualification in the paper |
|---|---|---|---|---|
| 1 | Every conclusion depends on researcher-designed simulators | A different, equally plausible family could reverse a ranking | Mitigated: four families favouring different estimators, intersection–union tests, per-family reporting. Not resolvable without real data | State every result as "under family X"; never generalise to students |
| 2 | The favourable prerequisite cell is partly built to succeed, and the mechanism may rarely fire | H-B2 alone would be near-circular; low activation would make all prerequisite tests uninformative | Mitigated: moderation tests (H-B3, H-B4), no-gating and wrong-graph cells, activation measured with a pre-set interpretation rule | Report the full Δ_GF, Δ_N, Δ_GW pattern with activation rates; if activation is low, say the prerequisite question was not answered |
| 3 | Margins and thresholds are value judgements (0.010 nats, 0.030 MAE, 10% activation) | A different margin could flip a non-inferiority decision | Not resolvable by method; mitigated by reporting every interval and effect size regardless of the decision; sensitivity in Tier 2 | State the margins, why they were chosen, and show intervals so readers can apply their own |
| 4 | Comparison asymmetries remain | BKT is fitted and Det is not; the shared link can absorb calibration differences; Tier 1 has no logistic tracker, no BKT-driven sequencing and no multi-concept estimation | Mitigated: calibrated and matched-untuned comparisons, native BKT predictions, Link-1 and identity results; gaps listed as Tier 2 | Describe Track A as measuring the information content of each score; make no claim that the heuristic sequences as well as BKT; name the missing baselines |
| 5 | Construct validity of the outcomes | Author-assigned difficulty and unvalidated bank metadata; simulated knowledge is not learning; reconstructable traces are not demonstrated interpretability | Not resolved; explicitly out of scope | Use "simulated knowledge acquisition" and "computational auditability"; state that the bank has had no empirical or comprehensive independent human validation |

**What a negative result would mean.** If BKT wins Track A, the paper
reports the cost of the heuristic per family and argues, if the data
allow, only for its transparency and speed. If prerequisite awareness
shows no moderated benefit, the paper reports that the implemented
triggers did not translate prerequisite structure into simulated
learning under these conditions. Both are publishable findings under
this design.

### Conclusion

Ready for author and mentor approval.

Approval should explicitly settle decisions D1–D6 (Status section). The
protocol is not frozen until the author records its hash in
`protocol/APPROVAL.md`; that step is the author's alone.

### C6. Estimators and fitting

All estimators implement `EstimatorAdapter`, expose `readMastery` as
their raw score r, and emit a per-update trace.

| Estimator | Raw score r | Update | Trace fields |
|---|---|---|---|
| Det-A, Det-B | Implemented adapter, unchanged | Implemented | Existing `MasteryUpdateTrace` |
| BKT-fit, BKT-default | Prior P(L) before the response | Posterior: correct → P(L)(1 − S) / [P(L)(1 − S) + (1 − P(L))G]; incorrect → P(L)S / [P(L)S + (1 − P(L))(1 − G)]; then P(L) ← post + (1 − post)T | version, pL0, T, G, S, prior, correct, likKnown, likUnknown, posterior, postTransition, predicted |
| RunProp | (c + 1)/(n + 2) | c, n += 1 per observation | c, n before and after |
| EMA | M | M ← M + 0.11(o − M) | M before, λ, o, M after |
| B0 | Per (concept, level) calibration rate | None | rate, counts |

**BKT EM (`bktEm.ts`)**, per (configuration, world, slice, concept),
calibration learners only:

1. Data: each calibration learner's ordered observations of the
   concept.
2. Evaluate the log-likelihood (scaled forward pass) at all 225 coarse
   points; keep the top 5 distinct points plus the BKT-default point as
   starts.
3. From each start, iterate: scaled forward–backward; M-step pL0 = mean
   γ₁(known); T = Σ ξ(unknown→known) / Σ_{t<n} γ_t(unknown); G = Σ
   γ_t(unknown)·o_t / Σ γ_t(unknown); S = Σ γ_t(known)(1 − o_t) / Σ
   γ_t(known); clip each to its bound.
4. Stop when relative log-likelihood change < 10⁻⁹ for 3 consecutive
   iterations, or max parameter change < 10⁻⁷, or 300 iterations.
5. Choose the highest final log-likelihood; ties → lexicographically
   smallest (pL0, T, G, S).
6. Record: iterations per start, cap hits, parameters within 10⁻³ of a
   bound, multimodality flag (two best starts within 1 nat but > 0.1
   apart in any parameter). Write
   `fits/bkt-<config>-<world>-<slice>-<concept>.json` with the
   calibration-data hash.

**Link (`link.ts`):** z = logit(clip(r, 10⁻⁴, 1 − 10⁻⁴)). Link-D
features [1, z, 1[L=1], 1[L=2], 1[L=4], 1[L=5]] (+ option-count dummies
with 4 as reference if P-2 finds other counts). Link-1 features [1, z].
Newton–Raphson, L2 penalty 10⁻⁴ on all coefficients, stop when max
coefficient change < 10⁻¹⁰, at most 100 iterations. One fit per
estimator per (configuration, world, slice) on calibration learners'
pre-update scores. p̂* = σ(a + b·z). B0 and BKT native predictions are
additionally scored without a link.

### C7. Track A runner

**C7.1 Slices (`selectSlices.ts`).** Implement B5.1 exactly: T_c, X_c
(≤ 5 hops, outside chapter), SC(k), eligibility (5 ≤ |T_c| ≤ 12; ≥ 3
internal edges; 2 ≤ |X_c| ≤ 10; ≥ ⌈|T_c|/2⌉ targets with an external
prerequisite; SC ≥ 16 for T_c and ≥ 8 for X_c; |Q_slice| ≥ 120),
ranking, and the relaxation order (a) → (b) → (c). Write the result,
counts and relaxations to `protocol/AMENDMENTS.md` as A1.

**C7.2 Schedule (`schedule.ts`, stream `schedule`).** Phase 1: 6
single-concept items per X_c concept in topological order. Phase 2: 12
per T_c concept in curriculum order; after every 4th Phase 2 item, one
review item from a concept chosen uniformly among those already
practised. Within a concept: level uniform among levels with unused
items, then item uniform; no replacement; log any reuse.

**C7.3 Run.** For each (config ∈ `trackA.configs`, world, slice):
generate 100 calibration and 100 test learners; generate each history
once; fit BKT, B0 and links on calibration learners; replay test
histories through all estimators with frozen fits. Output:

- `trackA_predictions.csv.gz` (test learners): config, world, slice,
  learner, step, questionId, level, conceptId, correct, estimator,
  rawScore, pIdentity, pLink1, pLinkD, pStarHat, pStarTrue, mTrue,
  masteredTrue.
- `trackA_learner_metrics.csv`: per (config, world, slice, learner,
  estimator, link): mean log loss, mean Brier, MAE(p̂*, p*), n.
- `fits/` and `links/` JSON.

### C8. Track B runner

**C8.1 Conditions (`conditions.ts`).** C0 (C8.2); C1 =
`buildExperimentCondition("C1", createDeterministicEstimatorAdapter(DEFAULT_MODEL_PARAMETERS), createAdaptiveSelectionAdapter(DEFAULT_ADAPTIVE_SELECTION_CONFIG))`;
C2 = Variant B estimator with the default prerequisite-aware config; C3
= Variant B estimator with `PREREQUISITE_UNAWARE_ADAPTIVE_SELECTION_CONFIG`.
Use the existing C0–C3 definitions in `conditions.ts` if they match
exactly.

**C8.2 C0 rule.** Use the implemented non-adaptive policy if P-5
confirms it can present T_c in curriculum order from the slice pool and
reads no estimator state. Otherwise implement C0-slice (`c0Slice.ts`):
T_c in curriculum order, ⌊60/|T_c|⌋ questions per concept (remainder to
the earliest concepts), levels cycling L1→L5 within each block, items
uniform within level without replacement (stream `c0slice`). Record the
choice in A1.

**C8.3 Sessions.** `curriculumOrder` = T_c in topological order;
question pool = Q_slice (or full bank per P-4); session limit 60. For
each (config, world, slice, learner) build the profile once; run C0–C3
each with a fresh response provider over that profile. Use the
existing Phase 5 engine (`runExperimentToCompletion`) and Phase 6
artifact builder with `track = "B"`.

**C8.4 Per-session outputs.** Run record (C11); export datasets B–E;
change-only truth log; and a row in `trackB_sessions.csv`: K_T,
K_start, K_X, itemsToCriterion (with censoring flag), falseMasteryCount
and rate, divertedShare, activated, counts per selection reason,
backtrackPrecision, distinctItems, maxReuse, terminationReason,
earlyTerminated.

**C8.5 Definitions.**

- **False-mastery event:** the first step at which (estimator mastery ≥
  `masteryProgressionThreshold` and `numObservations` ≥
  `minEvidenceCount`) becomes true for a concept; false if truth
  mastered is false at that step.
- **Diverted share:** questions whose selected target concept is not in
  T_c, divided by questions administered.
- **Activated:** at least one decision with reason
  `prerequisite_backtrack` or `diagnostic_probe`.
- **Backtrack precision:** among those decisions, the share whose
  target concept is truly unknown (binary) or unmastered (continuous)
  at that step.
- **Selection reconstructability:** full if the final candidate count
  is ≤ 10 and re-scoring `topCandidates` with score = 10·
  misconceptionOverlap + (5 if difficulty = target else −|difficulty −
  target|) and questionId tie-break reproduces the selection; partial
  if the pool exceeded 10 but the selection is the recorded top
  candidate and re-scoring reproduces it within `topCandidates`; not
  reconstructable otherwise.

### C9. Track C and tests

**C9.1 Replay.** R1a: Phase 5 `replayExperimentSession` from every run
record. R1b: regenerate and rerun every run; compare digests. R2:
`replayFromArtifact` on every stored artifact (stratified 5% by stream
`artifactSample`, plus anomalies and illustrative runs). Any divergence
falsifies H-C1.

**C9.2 Reconstruction.** For every Det and BKT update in Tracks A and
B, the verifier recomputes the output from trace fields only; record
the maximum absolute error (tolerance 10⁻¹²). For Det, parse every
number in `explanation` and compare to `termsComputed`. Completeness
checklist per model (inputs, parameters, intermediate terms, output,
version, explanation). Performance: 1,000 warm-up then 100,000 timed
updates per estimator with `process.hrtime.bigint()`; median, IQR, mean
canonical-JSON trace bytes.

**C9.3 Independent verifier.** Spawn a separate agent whose only inputs
are protocol sections B2, B3, B4.2, B4.5 and C5–C6. It writes
`src/research/phase8/trackC/verifier/` without reading or importing
`src/domain/learner-model/`, `src/research/phase8/estimators/` or
`src/research/phase8/simulator/`. An import-restriction test enforces
this. The verifier also writes the G-, M- and B-test oracles.

**C9.4 Required tests** (all must pass in 8B unless marked "report").

| Group | Tests |
|---|---|
| Ground truth | G-1 to G-13 (B3.5) |
| Analytical | M-1 boundedness: zero clamp-binding events in 10⁵ random steps per variant. M-2 mean trajectory: Monte Carlo mean of 10⁵ chains within 4 MCSE of R2 at t = 1…50. M-3 mixed-level fixed point (R3). M-4 stationary mean and SD within 4 MCSE of R4; threshold-crossing shares (report). M-5 R5 table to 3 decimals. M-6 guessing-floor share above 0.35 (report). M-7 constant-level counts 7, 7, 6, 5, 5; real engine with an always-correct provider progresses after exactly 6 answers for both variants. M-8 half-lives (R8). M-9 revocation values and frontier regression through the real engine (R9) |
| BKT | B-1 to B-5 (B4.3); B-4 and B-5 run on pilot worlds |
| Reproducibility | R-1 a 100-session batch run twice and in reversed order gives identical digests. R-2 common-random-number invariance: the k-th opportunity on a concept draws the same number under two policies. R-3 no learner id in two splits. R-4 changing any config value changes its hash and the run-record hash. R-5 a run record alone suffices for R1a. R-6 git diff against the Phase 7 commit touches no protected path (C0.1) |
| Numerics | L-1 link fit matches a reference implementation on a fixture within 10⁻⁶. S-1 `stats.py` t-test, Holm, intersection–union and sign-flip functions match reference outputs on fixed vectors |

### C10. Statistical procedures (`analysis/stats.py`)

1. Read only retained files (C11).
2. Learner metrics → world–slice means → equal-weight mean over slices
   → D_w per world.
3. For each confirmatory hypothesis (B8.3): compute D_w; one-sided
   one-sample t-test with W − 1 df (against the margin for H-A, against
   0 otherwise); intersection–union p = max of component p-values
   (H-A, H-B1); world-level differences of D_w for H-B3 and H-B4.
4. Holm over the eight p-values at α = 0.05; report raw p, adjusted p,
   decision.
5. Report for every estimand: mean, 95% two-sided t-interval,
   world-level SD, standardised effect.
6. Sensitivity: exact world-level sign-flip (2^W flips) and
   world-cluster percentile-t bootstrap (10,000, stream `bootstrap`).
7. Apply B8.6 rules (comparator failure, activation, S1 halt, failure
   rate) before writing decisions.
8. Write `results/confirmatory.json`, then `results/secondary.json`
   (intervals only, no p-values), then figures and tables (C11).

### C11. Retained outputs

| Output | Every run? | Content |
|---|---|---|
| Run record (`runs.jsonl.gz`) | Yes | Fields in B10.1 |
| Export datasets B–E | Yes (Track B) | Phase 6 export contract |
| Change-only truth log | Yes | Start snapshot, every change, end snapshot |
| `trackA_predictions.csv.gz`, `trackA_learner_metrics.csv` | Yes (test learners) | C7.3 |
| `trackB_sessions.csv` | Yes | C8.4 |
| Fits and links | Yes | C6 |
| Full `ExperimentRunArtifact` | Sample (C9.1) | Phase 6 persistence, unchanged |
| Manifests | One per (track, config, slice) | `buildManifestFromArtifacts` |
| `environment.json` | Per batch | Node version, lockfile hash, OS, CPU, commit |
| Final archive + SHA-256 | Once, end of 8D | Configs, records, exports, manifests, results |

Figures: F1 study architecture; F2 fixed-point curves with stationary
bands (from B2, analytic); F3 Track A paired differences with intervals
and margins, per family and variant; F4 reliability diagrams; F5 C2 −
C0 per family; F6 the three-cell prerequisite pattern (Δ_GF, Δ_N, Δ_GW)
with intervals; F7 activation and diverted share per cell. Tables: T1
implemented parameters; T2 simulator families; T3 estimators; T4 Track
A results; T5 Track B results; T6 traceability checks.

### C12. Acceptance criteria

- **8B — implementation and validation.** All pre-existing tests pass;
  every C9.4 test passes ("report" items produce their reports);
  pre-flight report delivered; A1 written; the verifier was built in
  isolation; no confirmatory seed was used.
- **8C-Pilot — benchmarking and precision** (pilot seeds only). Outputs
  limited to: failure counts; B-4 and B-5 results; runtime and storage
  projection (B9.3); required W from per-condition variances (B9.2);
  activation rates per cell; S1 check. No contrast between estimators
  or policies is computed or printed. A2 (and A3 if triggered) written.
  Stop and report.
- **8C — confirmatory** (only after approval). `approvalGate.ts`
  verifies `protocol/APPROVAL.md` against the protocol and config
  hashes; mismatch aborts. Each batch runs once. Every manifest
  verifies; every stored artifact passes all four
  `verifyArtifactIntegrity` checks; R1a and R1b pass for every run.
- **8D — analysis.** `results/confirmatory.json` lists every
  confirmatory hypothesis with estimate, interval, raw and
  Holm-adjusted p, decision and any B8.6 label, before any secondary
  result. All figures and tables regenerate identically from retained
  files on a clean checkout. The amendment log is complete.

### C13. Stop conditions and decisions reserved for the author

Stop and report, without working around the problem, if:

- any pre-flight item fails in a way marked "stop", or the code
  contradicts this specification;
- any 8B test fails and passing it would require changing the
  protocol;
- an implemented default appears to be a bug (report it; never fix it
  in Phase 8);
- B-5 fails (switch to the exhaustive grid only after reporting the
  cost);
- required W exceeds 60, or the runtime projection exceeds the
  author's ceiling;
- fewer than three slices qualify even after all relaxations;
- more than 1% of runs fail, or the S1 check is non-zero.

You may never decide alone: any change to a simulator range, margin,
sample size, metric, family, condition or hypothesis; any substitution
for C0 beyond the C0-slice rule; anything that would change a frozen
file. You must never create or edit `protocol/APPROVAL.md`.

Hand back after 8B: the pre-flight report, A1, the acceptance checklist
with evidence, and test output. After 8C-Pilot: the pilot report, A2
(and A3), and an explicit statement that no confirmatory run has been
executed.


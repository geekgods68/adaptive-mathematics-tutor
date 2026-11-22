# 06. Synthetic Learner Simulation

**VERIFIED — SOURCE** for the four family headers (`src/research/phase8/simulator/{s1,s2,s3,s4}.ts`, docstrings read directly). Internal equations (response-probability functions, parameter-generation code) were **not** fully re-derived line-by-line in this pass — flagged explicitly below.

## Family summary

| Family | Design | Cited precedent | Ground truth changes over time? |
|---|---|---|---|
| **S1** | Stationary logistic learners — fixed latent state, no transition | Standard logistic-IRT with guessing floor / slip ceiling | **No** — "Fixed latent state (no transition)" per the file's own docstring |
| **S2** | BKT-generative learners — binary latent state | Corbett & Anderson (1994), standard 4-parameter BKT used as the *generator*, not a fitted model | **Yes** — binary mastery transitions occur per the standard BKT generative process |
| **S3** | Practice-driven continuous learners — same response mechanism as S1, but $\theta$ grows linearly with counted practice opportunities | Additive Factors Model (Cen, Koedinger & Junker, 2006) | **Yes** — "theta grows linearly with counted practice opportunities, independent of correctness or item difficulty" (verbatim from docstring) |
| **S4** | Prerequisite-gated binary learners — a separate hidden "true graph" $G^*$ distinct from the tutor-visible curriculum graph $G$ drives learning | Doignon & Falmagne (1985) conjunctive prerequisite structure; Kaser et al. (2014) prerequisite DBNs | **Yes**, gated by $G^*$ |

**Important self-disclosure found directly in the source comment for S4**: *"The gating rule itself is [Researcher-defined]."* This bracketed annotation appears to be the simulator authors' own explicit flag that this specific mechanism is a researcher judgment call rather than a literature-derived or empirically-calibrated rule. This is directly relevant to any construct-validity discussion of the S4 family (and therefore of the S4-GF scenario central to file 10's reversal finding) — it should be cited in the paper's limitations section verbatim.

## What is actually being simulated

Per the family descriptions above: **a combination** of hidden learner knowledge (the latent state) **and** observed responses generated from it (via a logistic/BKT response function) **and**, in S2/S3/S4, **learning over time** (state transitions). S1 is the one family with no learning dynamic at all — it exists as a stationary baseline/implementation check (consistent with the protocol's own description of S1 as a "negative control": *"S1 (no learning): every policy must produce identical K(T))"* — `protocol/phase8-protocol-v2.md` line 881, VERIFIED — SOURCE, and consistent with the pilot data in file 10 §10.5's K(T) table showing all three conditions (C0/C2/C3) producing numerically identical means in S1).

## Hidden ground truth vs. estimated mastery

The distinction the RMSE metric depends on (file 08) is structural in this codebase: each simulator produces a `TruthRow` (hidden ground-truth state, used only for `K(T)`, the `itemsToCriterion`/QTM determination, and RMSE's $M^{true}$ term) that is never given to any estimator under test. The estimator only ever sees response outcomes via the `responseProvider` seam (per the Phase 8 architecture, cited in CLAUDE.md's Phase 8B history; not re-opened directly in this pass). This separation is the entire reason RMSE/latent-recovery analysis is possible at all for synthetic learners and is explicitly impossible with real students (file 11, external validity).

## Could the simulator structurally favor one condition?

**Partially investigated, not conclusively resolved in this pass.** S4's design — a hidden true prerequisite graph distinct from the tutor's own curriculum graph — means a prerequisite-*aware* selection policy (C1/C2) could plausibly align better or worse with $G^*$ than $G$, depending on how closely the two graphs match; this audit did not open `trueGraph.ts` to check how closely $G^*$ is constructed to resemble $G$ (the tutor-visible graph that the production prerequisite-aware selector actually targets), which bears directly on whether the C2-vs-C3 comparison in S4 scenarios could structurally favor or disadvantage prerequisite-awareness independent of its real educational value. **This is flagged as an open question for Part 16**, not resolved here.

## Limitation specific to the simulator (separate from the estimator's own limitations, file 04)

- No real-student response-time, fatigue, forgetting (outside S2/S3's modeled dynamics), or affective/motivational behavior is modeled in any family.
- The S4 gating mechanism is self-labeled by its own authors as a researcher-defined choice, not literature-calibrated.
- This audit did not verify whether guessing/slipping parameters are drawn from a documented, justified distribution or hand-set constants — requires opening `shared.ts`'s `learnerGuess`/`itemNoiseFor` functions, not done in this pass.

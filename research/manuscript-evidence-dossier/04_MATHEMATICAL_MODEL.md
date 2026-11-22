# 04. Mathematical Model Specification

**VERIFIED — SOURCE throughout**, directly from `src/domain/learner-model/updateMastery.ts` and `src/domain/learner-model/parameters.ts`, read in full during this audit.

## Equations

For a single concept $c$ with current mastery $M_{old}$, given a response of difficulty level $d$ (weight $w_d$) and hint usage flag:

**Correct response:**
$$M_{new} = M_{old} + \alpha \cdot (1 - M_{old}) \cdot w_d \cdot w_h$$

**Incorrect response — Variant A (`deterministic-mastery-v1`, "multiplicative"):**
$$M_{new} = M_{old} - \beta \cdot M_{old} \cdot w_d$$

**Incorrect response — Variant B (`deterministic-mastery-v2-inverse-difficulty`, "inverse"):**
$$M_{new} = M_{old} - \beta \cdot M_{old} \cdot \frac{1}{w_d}$$

Both branches are followed by clamping: $M_{new} \leftarrow \min(1, \max(0, M_{new}))$.

For a multi-concept question, the same formula is applied **independently per concept**, with the resulting *delta* (not $M_{old}$) scaled by that concept's `conceptWeight` $w_c$ from the question's `conceptWeights` map:
$$\Delta_{applied} = \Delta_{unweighted} \cdot w_c$$
At $w_c = 1$ (the single-concept case) this reduces exactly to the formulas above — this specific identity is asserted to be covered by a dedicated test in the source comment (not re-run by this audit pass, but the code path is structurally a strict reduction, i.e. multiplying by 1 is a no-op by construction).

## Variable definitions

| Symbol | Meaning | Source field |
|---|---|---|
| $M_{old}, M_{new}$ | mastery estimate for one concept, before/after this response, in $[0,1]$ | `ConceptMasteryState.mastery` |
| $\alpha$ | correct-response gain rate | `correctGainRate` |
| $\beta$ | incorrect-response loss rate | `incorrectLossRate` |
| $w_d$ | difficulty weight for the question's level (1-5) | `difficultyWeights[difficulty]` |
| $w_h$ | hint-usage multiplier, applied **only** on a correct response (never reduces mastery on an incorrect one) | `hintGainMultiplier` |
| $w_c$ | per-concept attribution weight for a multi-concept question | `evidence.conceptWeights[conceptId]` |

## Verified parameter values (DEFAULT_MODEL_PARAMETERS / V2)

| Parameter | Value | Shared by both variants? |
|---|---|---|
| `initialMastery` ($M_0$) | **0.5** | Yes |
| `correctGainRate` ($\alpha$) | **0.12** | Yes |
| `incorrectLossRate` ($\beta$) | **0.10** | Yes |
| `hintGainMultiplier` ($w_h$) | **0.6** | Yes |
| `difficultyWeights` ($w_d$, L1→L5) | **0.8, 0.9, 1.0, 1.1, 1.2** | Yes |
| `incorrectDifficultyWeighting` | `"multiplicative"` (A) vs. `"inverse"` (B) | **No — this is the only difference between the two variants** |
| `recentEvidenceLimit` | 10 (most recent evidence items retained per concept, audit-trail only) | Yes |

These values **exactly match** the historical description quoted in the auditing brief (α=0.12, β=0.10, w_h=0.6, M₀=0.5, difficulty weights spanning ~0.8-1.2) — **no discrepancy found.**

## Numerical worked example (DERIVED — NEW ANALYSIS, computed by hand from the verified formula, Variant A)

Start $M_{old} = 0.5$. Correct response, difficulty L3 ($w_d = 1.0$), no hint ($w_h = 1$ since `usedHint` false → multiplier term is 1 per the code: `hintMultiplier = correct && usedHint ? parameters.hintGainMultiplier : 1`):
$$M_{new} = 0.5 + 0.12 \times (1 - 0.5) \times 1.0 \times 1 = 0.5 + 0.06 = 0.56$$

Then an incorrect response, difficulty L5 ($w_d = 1.2$), Variant A:
$$M_{new} = 0.56 - 0.10 \times 0.56 \times 1.2 = 0.56 - 0.0672 = 0.4928$$

Same second step under Variant B (inverse):
$$M_{new} = 0.56 - 0.10 \times 0.56 \times (1/1.2) = 0.56 - 0.04\overline{6} = 0.5133$$

This concretely demonstrates Variant B's design intent (verified from the code's own comment): a hard incorrect answer is penalized *less* under Variant B than Variant A ($0.5133$ vs $0.4928$), because the inverse weighting treats failing an easy question as stronger evidence of a true gap than failing a hard one.

## Properties

- **Clamped**: yes, to $[0,1]$, every update (`clamp()` in source).
- **Deterministic**: yes — identical `(previousState, evidence, conceptWeight, parameters)` always yields identical output; no RNG call in this function.
- **Decay**: no explicit time-decay term; mastery only moves in response to new evidence, never passively drifts.
- **Prerequisites**: **not** directly touched by a single response — `applyResponseEvidence`'s own doc comment states explicitly it does *not* update a question's `prerequisiteConceptIds`, "by design... do not automatically award mastery to prerequisite concepts merely because a dependent question was answered correctly." Prerequisite *influence* on the system happens at the selection-policy layer (which concept to target next), not at the mastery-update layer.
- **Staleness / evidence windows**: `recentEvidenceLimit` (10) bounds only the stored audit trail (`recentEvidence` array, last-N responses kept for explanation/trace purposes); it does not affect the mastery arithmetic itself, which uses only the running `mastery` scalar and counters (`numObservations`, `correctCount`, etc.), not a sliding window recomputation.
- **Calibration**: the mastery score is a **bounded, monotonic heuristic**, not a probabilistically fitted or calibrated quantity — there is no likelihood function, no fitting procedure, and no guarantee that $M$ equals $P(\text{correct on an item of average difficulty})$ in any formal sense. This matters directly for Brier Score reporting (file 08): when this deterministic estimator's mastery value is used as a predicted probability, that is an interpretive choice made by the Track A harness (converting a heuristic score into $[0,1]$ and treating it as $p$), not a property the estimator itself was designed or validated to have. This should be stated explicitly in any paper discussion of this estimator's Brier Score results.

## Known mathematical limitations

1. No calibration guarantee (above) — directly affects the validity of interpreting this estimator's Brier Score as "probabilistic forecasting quality" in the formal sense that a genuinely fitted model (e.g., BKT) would support.
2. The two incorrect-response variants (A vs. B) are **both researcher-specified design choices**, not empirically fit from data — confirmed by the source comment: Variant B is "a research design choice, not a claim of empirical superiority over Variant A."
3. Multi-concept attribution splits the delta multiplicatively by `conceptWeight` but does not model any interaction or correlation between concepts' updates — each concept's state evolves independently given the shared evidence event.

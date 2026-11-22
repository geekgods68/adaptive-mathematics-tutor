# 05. The Four Experimental Conditions

**VERIFIED — SOURCE**, from `src/research/experiment/conditions.ts`, read in full this session.

## Critical correction to the audit brief's own framing

The originating task's Part 6 describes "C1 — Heuristic baseline" as if it were a rule-based system distinct from C2's mastery estimation. **This is not what the code implements.** Per the task's own instruction ("Do not describe all four conditions as four distinct mastery-estimation models unless that is actually what the code implements"), here is what is actually registered:

| Condition | Estimator | Selection policy | What actually differs from C2 |
|---|---|---|---|
| **C0** | `createNullEstimatorAdapter()` — **no mastery estimation at all** | `createNonAdaptiveSelectionAdapter()` | Everything — this is a pure sequencing control, explicitly documented in its own `description` field as *"Not a mastery-estimation baseline, a sequencing control."* |
| **C1** | Deterministic **Variant A** (`DEFAULT_MODEL_PARAMETERS`, multiplicative incorrect-weighting) | `createAdaptiveSelectionAdapter(DEFAULT_ADAPTIVE_SELECTION_CONFIG)` — **identical adaptive policy object/config as C2** | Only the mastery-formula variant (A vs. B) |
| **C2** | Deterministic **Variant B** (`DEFAULT_MODEL_PARAMETERS_V2_INVERSE_DIFFICULTY`, inverse incorrect-weighting) | `createAdaptiveSelectionAdapter(DEFAULT_ADAPTIVE_SELECTION_CONFIG)` | — (reference condition) |
| **C3** | Same as C2 — Variant B | `createAdaptiveSelectionAdapter(PREREQUISITE_UNAWARE_ADAPTIVE_SELECTION_CONFIG)` — **prerequisite-aware targeting disabled** | Only the selection config's prerequisite-awareness flag |

**Conclusion:** C1 and C2 are the same adaptive selection algorithm with a swapped mastery-formula parameter set — not a "heuristic vs. model-based" comparison. C3 is a genuinely clean ablation of C2 (same estimator, one selection-policy feature flag flipped) — this part of the brief's framing is accurate. C0 is the only condition with no mastery estimation whatsoever, making the "C0 vs C2" contrast simultaneously a "no estimation vs. estimation" *and* a "non-adaptive vs. adaptive" contrast — these two things are confounded together in that single comparison (this is the expected, acknowledged design: sequencing policy and estimator presence are intentionally coupled in the live product's two shipped conditions, per `docs/research-design.md`).

## Fairness checklist (what this audit could verify from `conditions.ts` alone)

| Dimension | Same across C0-C3? | Evidence |
|---|---|---|
| Question bank | Yes (by construction — all four share one `buildExperimentCondition` entry point and the same engine) | SOURCE |
| Grading | Yes — shared `gradeAnswer`, no per-condition branch (per Stage 1's report; not re-opened this pass) | PRIOR-STAGE REPORT, not re-verified here |
| Selection *object* for C1/C2 | Yes, literally the same `createAdaptiveSelectionAdapter(DEFAULT_ADAPTIVE_SELECTION_CONFIG)` call | SOURCE |
| Prerequisite awareness C2 vs C3 | Differs by design (the intended ablation) | SOURCE |
| Estimator presence C0 vs C1/C2/C3 | Differs by design (C0 has none) | SOURCE |
| Starting mastery, question budget, seeds | **Not independently re-verified in this pass** — requires opening the Track A/B runner and simulator profile-construction code in full, which this pass did only partially (see file 06) | NOT VERIFIED (this pass) |

## C4 — explicitly not implemented

`buildC4PluggableEstimatorCondition` exists as a typed extension point only; the source comment states directly: *"there is no real estimator to plug in yet, and fabricating one would violate this phase's explicit scope limits."* C4 should not be described in the paper as an executed or even fully specified condition — it is unimplemented scaffolding.

## What this file does not cover

Full pseudocode of the adaptive selection policy's internal decision order (progression/remediation/diagnostic-backtracking/difficulty-selection branches) was not re-derived from source in this pass; prior-stage documentation (`docs/COMPLETE_RESEARCH_PAPER_EVIDENCE_DOSSIER.md` Section 10, per that stage's own self-report) claims to cover this, but this audit did not re-verify it against `src/tutoring/selection/adaptive/` directly. This is a genuine gap in this audit pass, stated honestly rather than papered over.

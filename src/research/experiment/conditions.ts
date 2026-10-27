import { DEFAULT_MODEL_PARAMETERS, DEFAULT_MODEL_PARAMETERS_V2_INVERSE_DIFFICULTY } from "@/domain/learner-model/parameters";
import { DEFAULT_ADAPTIVE_SELECTION_CONFIG, PREREQUISITE_UNAWARE_ADAPTIVE_SELECTION_CONFIG } from "@/tutoring/selection/adaptive/config";
import { createDeterministicEstimatorAdapter, createNullEstimatorAdapter } from "@/research/experiment/estimatorAdapter";
import { createAdaptiveSelectionAdapter, createNonAdaptiveSelectionAdapter } from "@/research/experiment/selectionAdapter";
import type { EstimatorAdapter, ExperimentConfig, SelectionAdapter } from "@/research/experiment/types";

/**
 * Builds an arbitrary experiment condition from any conforming
 * `EstimatorAdapter`/`SelectionAdapter` pair — the extension point for
 * condition C4 ("pluggable knowledge-tracing estimator... compatible
 * adaptive policy") and any future custom condition. No BKT estimator is
 * implemented in this phase; a future one plugs in here by implementing
 * `EstimatorAdapter` and passing it to this same function — nothing else
 * changes. This is also how Track A's "non-adaptive selection policy
 * running alongside a mastery estimator" combination (comparing
 * estimators under a FIXED, non-confounding question sequence) is built:
 * `buildExperimentCondition("estimator-comparison", someEstimator,
 * createNonAdaptiveSelectionAdapter())`.
 */
export function buildExperimentCondition(conditionId: string, estimator: EstimatorAdapter, selection: SelectionAdapter): ExperimentConfig {
  return { conditionId, estimator, selection };
}

/**
 * The five Phase 5 research configurations from the condition table —
 * see docs/research-decisions.md RD-0006. These are INITIAL research
 * configurations, not an exhaustive or final experimental design;
 * `buildExperimentCondition` above exists precisely so further conditions
 * don't require new engine code.
 */
export const EXPERIMENT_CONDITIONS: Record<"C0" | "C1" | "C2" | "C3", { description: string; build: () => ExperimentConfig }> = {
  C0: {
    description: "Non-adaptive sequencing control — no mastery estimation. Not a mastery-estimation baseline, a sequencing control.",
    build: () => buildExperimentCondition("C0", createNullEstimatorAdapter(), createNonAdaptiveSelectionAdapter()),
  },
  C1: {
    description: "Deterministic mastery Variant A (symmetric difficulty weighting, deterministic-mastery-v1) + prerequisite-aware adaptive selection.",
    build: () =>
      buildExperimentCondition(
        "C1",
        createDeterministicEstimatorAdapter(DEFAULT_MODEL_PARAMETERS),
        createAdaptiveSelectionAdapter(DEFAULT_ADAPTIVE_SELECTION_CONFIG),
      ),
  },
  C2: {
    description: "Deterministic mastery Variant B (inverse difficulty weighting, deterministic-mastery-v2-inverse-difficulty) + prerequisite-aware adaptive selection.",
    build: () =>
      buildExperimentCondition(
        "C2",
        createDeterministicEstimatorAdapter(DEFAULT_MODEL_PARAMETERS_V2_INVERSE_DIFFICULTY),
        createAdaptiveSelectionAdapter(DEFAULT_ADAPTIVE_SELECTION_CONFIG),
      ),
  },
  C3: {
    description: "Deterministic mastery Variant B + prerequisite-UNAWARE adaptive selection (the controlled ablation — same estimator as C2, graph-based targeting disabled).",
    build: () =>
      buildExperimentCondition(
        "C3",
        createDeterministicEstimatorAdapter(DEFAULT_MODEL_PARAMETERS_V2_INVERSE_DIFFICULTY),
        createAdaptiveSelectionAdapter(PREREQUISITE_UNAWARE_ADAPTIVE_SELECTION_CONFIG),
      ),
  },
};

/**
 * C4 ("pluggable knowledge-tracing estimator + compatible adaptive
 * policy") is deliberately NOT a registry entry with a concrete
 * build() — there is no real estimator to plug in yet, and fabricating
 * one would violate this phase's explicit scope limits. This function
 * documents and type-checks the shape such a condition would take:
 * any `EstimatorAdapter` (e.g. a future `createBktEstimatorAdapter`)
 * paired with `createAdaptiveSelectionAdapter`.
 */
export function buildC4PluggableEstimatorCondition(estimator: EstimatorAdapter, config = DEFAULT_ADAPTIVE_SELECTION_CONFIG): ExperimentConfig {
  return buildExperimentCondition("C4", estimator, createAdaptiveSelectionAdapter(config));
}

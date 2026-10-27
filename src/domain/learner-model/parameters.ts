import type { ModelParameters } from "@/domain/learner-model/types";

/**
 * Variant A — the original, historical Phase 3 baseline. See
 * docs/research-decisions.md RD-0003 for the full specification and
 * critical examination, and RD-0004 for how the difficulty-direction
 * question RD-0003 left open was resolved (by introducing Variant B
 * below as an explicit, separately-versioned alternative, WITHOUT
 * changing this export's historical behaviour — every existing caller
 * that doesn't pass parameters explicitly keeps getting exactly this).
 */
export const DEFAULT_MODEL_PARAMETERS: ModelParameters = {
  version: "deterministic-mastery-v1",
  initialMastery: 0.5,
  correctGainRate: 0.12,
  incorrectLossRate: 0.1,
  hintGainMultiplier: 0.6,
  difficultyWeights: {
    1: 0.8,
    2: 0.9,
    3: 1.0,
    4: 1.1,
    5: 1.2,
  },
  incorrectDifficultyWeighting: "multiplicative",
  recentEvidenceLimit: 10,
};

/**
 * Variant B — inverse difficulty weighting on the incorrect branch (see
 * docs/research-decisions.md RD-0004). Identical to
 * DEFAULT_MODEL_PARAMETERS in every parameter except
 * `incorrectDifficultyWeighting` and `version`: a harder incorrect
 * response now produces a SMALLER penalty, and an easier incorrect
 * response a LARGER one. Adopted as the PROVISIONAL default for Phase 4
 * work — a research design choice, not a claim of empirical superiority
 * over Variant A, which remains the frozen `deterministic-mastery-v1`
 * baseline.
 */
export const DEFAULT_MODEL_PARAMETERS_V2_INVERSE_DIFFICULTY: ModelParameters = {
  version: "deterministic-mastery-v2-inverse-difficulty",
  initialMastery: 0.5,
  correctGainRate: 0.12,
  incorrectLossRate: 0.1,
  hintGainMultiplier: 0.6,
  difficultyWeights: {
    1: 0.8,
    2: 0.9,
    3: 1.0,
    4: 1.1,
    5: 1.2,
  },
  incorrectDifficultyWeighting: "inverse",
  recentEvidenceLimit: 10,
};

import type { ExperimentConfig, ExperimentScenario } from "@/research/experiment/types";

export interface ExperimentValidationError {
  field: string;
  message: string;
}

export interface ExperimentValidationResult {
  valid: boolean;
  errors: ExperimentValidationError[];
}

function err(errors: ExperimentValidationError[], field: string, message: string): void {
  errors.push({ field, message });
}

/**
 * Structural + cross-field validation run BEFORE a session is started —
 * see docs/research-decisions.md RD-0006 and requirement 11. Rejects
 * malformed adapters, incompatible estimator/policy combinations, and
 * invalid scenario limits. Deliberately does NOT maintain a closed
 * allowlist of estimator type strings (that would make the explicitly-
 * intended C4 "pluggable estimator" extension point impossible) — it
 * validates SHAPE and cross-field compatibility instead.
 */
export function validateExperimentConfig(config: ExperimentConfig, scenario: ExperimentScenario): ExperimentValidationResult {
  const errors: ExperimentValidationError[] = [];

  if (!config.conditionId || typeof config.conditionId !== "string") {
    err(errors, "config.conditionId", "conditionId must be a non-empty string.");
  }

  validateEstimator(config, errors);
  validateSelection(config, errors);
  validateCrossCompatibility(config, scenario, errors);
  validateScenario(scenario, errors);

  return { valid: errors.length === 0, errors };
}

function validateEstimator(config: ExperimentConfig, errors: ExperimentValidationError[]): void {
  const estimator = config.estimator;
  if (!estimator) {
    err(errors, "config.estimator", "An EstimatorAdapter is required (use createNullEstimatorAdapter() for 'no estimation').");
    return;
  }
  if (!estimator.estimatorType || typeof estimator.estimatorType !== "string") {
    err(errors, "config.estimator.estimatorType", "estimatorType must be a non-empty string.");
  }
  if (!estimator.version || typeof estimator.version !== "string") {
    err(errors, "config.estimator.version", "version must be a non-empty string.");
  }
  for (const fn of ["initConcept", "applyResponse", "readMastery", "serializeStates", "restoreStates"] as const) {
    if (typeof estimator[fn] !== "function") {
      err(errors, `config.estimator.${fn}`, `EstimatorAdapter.${fn} must be a function.`);
    }
  }
  if (estimator.estimatorType === "deterministic-mastery") {
    const params = estimator.parameters as { difficultyWeights?: Record<number, number>; correctGainRate?: unknown; incorrectLossRate?: unknown };
    const weights = params.difficultyWeights;
    if (!weights || [1, 2, 3, 4, 5].some((level) => typeof weights[level] !== "number")) {
      err(errors, "config.estimator.parameters.difficultyWeights", "deterministic-mastery estimator parameters must define a numeric weight for every difficulty level 1-5.");
    }
    if (typeof params.correctGainRate !== "number" || typeof params.incorrectLossRate !== "number") {
      err(errors, "config.estimator.parameters", "deterministic-mastery estimator parameters must define numeric correctGainRate and incorrectLossRate.");
    }
  }
}

function validateSelection(config: ExperimentConfig, errors: ExperimentValidationError[]): void {
  const selection = config.selection;
  if (!selection) {
    err(errors, "config.selection", "A SelectionAdapter is required.");
    return;
  }
  if (selection.policyType !== "non_adaptive" && selection.policyType !== "adaptive") {
    err(errors, "config.selection.policyType", `Unknown selection policyType "${String(selection.policyType)}" — must be "non_adaptive" or "adaptive".`);
  }
  if (!selection.version || typeof selection.version !== "string") {
    err(errors, "config.selection.version", "version must be a non-empty string.");
  }
  if (typeof selection.selectNext !== "function") {
    err(errors, "config.selection.selectNext", "SelectionAdapter.selectNext must be a function.");
  }
  if (selection.policyType === "adaptive") {
    const prerequisiteAware = (selection.parameters as { prerequisiteAware?: unknown }).prerequisiteAware;
    if (prerequisiteAware !== undefined && typeof prerequisiteAware !== "boolean") {
      err(errors, "config.selection.parameters.prerequisiteAware", "prerequisiteAware, if present, must be a boolean.");
    }
  }
}

function validateCrossCompatibility(config: ExperimentConfig, scenario: ExperimentScenario, errors: ExperimentValidationError[]): void {
  if (!config.estimator || !config.selection) return;

  // "A fully adaptive policy must receive compatible mastery information."
  if (config.selection.policyType === "adaptive" && config.estimator.estimatorType === "none") {
    err(
      errors,
      "config",
      'An adaptive selection policy requires a real mastery estimator — the "none" estimator (condition C0) is only compatible with non-adaptive selection.',
    );
  }

  // "A non-adaptive policy must not accidentally consume learner mastery
  // information simply because an estimator is present" is enforced
  // structurally (NonAdaptiveSelectionContext has no such field — see
  // createNonAdaptiveSelectionAdapter) rather than here; this check only
  // confirms the scenario gives the non-adaptive adapter what IT needs.
  if (config.selection.policyType === "non_adaptive" && (!scenario.predeterminedSequence || scenario.predeterminedSequence.length === 0)) {
    err(errors, "scenario.predeterminedSequence", "A non-adaptive condition requires a non-empty predeterminedSequence.");
  }
}

function validateScenario(scenario: ExperimentScenario, errors: ExperimentValidationError[]): void {
  if (!scenario.learnerId) err(errors, "scenario.learnerId", "learnerId is required.");
  if (!Array.isArray(scenario.availableQuestions) || scenario.availableQuestions.length === 0) {
    err(errors, "scenario.availableQuestions", "availableQuestions must be a non-empty array (missing required dataset reference).");
  }
  if (!Array.isArray(scenario.concepts)) {
    err(errors, "scenario.concepts", "concepts must be an array (may be empty for a non-adaptive-only scenario).");
  }
  if (!Array.isArray(scenario.curriculumOrder)) {
    err(errors, "scenario.curriculumOrder", "curriculumOrder must be an array (may be empty).");
  }
  if (!Number.isInteger(scenario.maxQuestions) || scenario.maxQuestions <= 0) {
    err(errors, "scenario.maxQuestions", "maxQuestions must be a positive integer.");
  }
  if (scenario.maxExposurePerQuestion !== undefined && (!Number.isInteger(scenario.maxExposurePerQuestion) || scenario.maxExposurePerQuestion < 1)) {
    err(errors, "scenario.maxExposurePerQuestion", "maxExposurePerQuestion, if present, must be an integer >= 1.");
  }
  if (scenario.completionCheck) {
    const { masteryThreshold, minEvidenceCount } = scenario.completionCheck;
    if (typeof masteryThreshold !== "number" || masteryThreshold < 0 || masteryThreshold > 1) {
      err(errors, "scenario.completionCheck.masteryThreshold", "masteryThreshold must be a number in [0,1].");
    }
    if (!Number.isInteger(minEvidenceCount) || minEvidenceCount < 0) {
      err(errors, "scenario.completionCheck.minEvidenceCount", "minEvidenceCount must be a non-negative integer.");
    }
  }
  const invalidDifficulty = scenario.availableQuestions?.find((q) => ![1, 2, 3, 4, 5].includes(q.difficulty));
  if (invalidDifficulty) {
    err(errors, "scenario.availableQuestions", `Question "${invalidDifficulty.id}" has an unsupported difficulty level "${String(invalidDifficulty.difficulty)}" (must be 1-5).`);
  }
}

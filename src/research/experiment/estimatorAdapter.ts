import type { ConceptMasteryState, ModelParameters, ResponseEvidence } from "@/domain/learner-model/types";
import { createInitialConceptState } from "@/domain/learner-model/initialize";
import { applyResponseEvidence } from "@/domain/learner-model/updateMastery";
import { DEFAULT_MODEL_PARAMETERS } from "@/domain/learner-model/parameters";
import type { EstimatorAdapter, EstimatorResponseEvidence } from "@/research/experiment/types";

/**
 * "No mastery estimation required" (condition C0). Every operation is a
 * documented no-op: states are always `{}`, `readMastery` always returns
 * `undefined`. This lets the session engine run a non-adaptive condition
 * through the exact same `EstimatorAdapter` seam as every other
 * condition, rather than special-casing "no estimator" throughout —
 * satisfying "the framework must also permit a non-adaptive selection
 * policy to run alongside a mastery estimator... or without one."
 */
export function createNullEstimatorAdapter(): EstimatorAdapter<Record<string, never>> {
  return {
    estimatorType: "none",
    version: "null-estimator-v1",
    parameters: {},
    initConcept: () => ({}),
    applyResponse: (currentStates) => ({ updatedStates: { ...currentStates }, traces: [] }),
    readMastery: () => undefined,
    serializeStates: (states) => JSON.stringify(states),
    restoreStates: (serialized) => JSON.parse(serialized) as Record<string, never>,
  };
}

function toResponseEvidence(evidence: EstimatorResponseEvidence): ResponseEvidence {
  return {
    questionId: evidence.questionId,
    conceptWeights: evidence.conceptWeights,
    difficulty: evidence.difficulty,
    correct: evidence.correct,
    selectedOptionId: evidence.selectedOptionId,
    misconceptionId: evidence.misconceptionId,
    usedHint: evidence.usedHint,
    sequenceIndex: evidence.sequenceIndex,
    timestamp: evidence.timestamp,
  };
}

/**
 * Wraps the Phase 3 deterministic mastery model (src/domain/learner-model/)
 * to satisfy `EstimatorAdapter` — used for conditions C1 (Variant A,
 * `DEFAULT_MODEL_PARAMETERS`) and C2/C3 (Variant B,
 * `DEFAULT_MODEL_PARAMETERS_V2_INVERSE_DIFFICULTY`). Reuses
 * `applyResponseEvidence` directly rather than re-deriving its
 * multi-concept fan-out logic — the only thing this adapter adds is the
 * common-interface shape (`estimatorType`/`version`/`parameters`,
 * serialization) the experiment layer needs.
 */
export function createDeterministicEstimatorAdapter(parameters: ModelParameters = DEFAULT_MODEL_PARAMETERS): EstimatorAdapter<ConceptMasteryState> {
  return {
    estimatorType: "deterministic-mastery",
    version: parameters.version,
    parameters: parameters as unknown as Record<string, unknown>,

    initConcept: (learnerId, conceptId, timestamp) => createInitialConceptState(learnerId, conceptId, timestamp, parameters),

    applyResponse: (currentStates, evidence, learnerId) => {
      const { updatedStates, traces } = applyResponseEvidence(
        currentStates as Record<string, ConceptMasteryState>,
        toResponseEvidence(evidence),
        learnerId,
        parameters,
      );
      return { updatedStates, traces };
    },

    readMastery: (state) => state.mastery,

    // A simple, explicitly-labelled prediction derived FROM the mastery
    // estimate — not a separately calibrated predictive model. Kept
    // deliberately naive (mastery itself, independent of difficulty) so
    // it is never mistaken for a validated prediction; a future
    // estimator (e.g. BKT) may define this far more rigorously.
    predictCorrectness: (state) => state.mastery,

    serializeStates: (states) => JSON.stringify(states),
    restoreStates: (serialized) => JSON.parse(serialized) as Record<string, ConceptMasteryState>,
  };
}

import type { ConceptMasteryState, ModelParameters } from "@/domain/learner-model/types";
import { DEFAULT_MODEL_PARAMETERS } from "@/domain/learner-model/parameters";

/**
 * Creates a fresh, zero-evidence concept state. This is the cold-start
 * case (section 4's "how cold-start learners and concepts with no
 * observations are handled"): mastery starts at `parameters.initialMastery`
 * for every concept, independent of any other concept's state — there is
 * no cross-concept prior-sharing in this phase (see prerequisite-aware
 * read-only queries in queries.ts for how a FUTURE phase could read, not
 * write, across concepts).
 */
export function createInitialConceptState(
  learnerId: string,
  conceptId: string,
  timestamp: string,
  parameters: ModelParameters = DEFAULT_MODEL_PARAMETERS,
): ConceptMasteryState {
  return {
    learnerId,
    conceptId,
    mastery: parameters.initialMastery,
    initialMastery: parameters.initialMastery,
    numObservations: 0,
    correctCount: 0,
    incorrectCount: 0,
    consecutiveCorrect: 0,
    consecutiveIncorrect: 0,
    recentEvidence: [],
    modelVersion: parameters.version,
    lastSequenceIndex: -1,
    createdAt: timestamp,
    lastUpdatedAt: timestamp,
  };
}

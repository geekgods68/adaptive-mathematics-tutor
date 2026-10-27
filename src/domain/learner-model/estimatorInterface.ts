import type { ConceptMasteryState, ModelParameters, ResponseEvidence } from "@/domain/learner-model/types";
import { createInitialConceptState } from "@/domain/learner-model/initialize";
import { updateMastery } from "@/domain/learner-model/updateMastery";

/**
 * A model-agnostic contract so a FUTURE estimator (e.g. Bayesian Knowledge
 * Tracing) can consume the same `ResponseEvidence` and produce comparable
 * concept-level mastery estimates, for the research comparison this
 * project is ultimately built to run (mastery-estimation error against
 * simulated ground truth, predictive accuracy, calibration, sensitivity
 * to learner profiles, decision traceability — see docs/research-design.md
 * and docs/research-decisions.md RD-0003).
 *
 * NOT implemented here beyond the one deterministic estimator this phase
 * builds (`deterministicMasteryEstimator` in index.ts) — no BKT, no
 * simulated-learner engine, no comparison harness. This interface exists
 * so that future work has a stable seam to implement against, not because
 * a second estimator is being built now.
 *
 * Every estimator conforming to this interface must be:
 * - Deterministic given its own internal state representation (an
 *   estimator MAY be probabilistic in its update rule, e.g. BKT's
 *   posterior update — "deterministic" here means "reproducible given
 *   the same RNG seed if any," not "non-probabilistic").
 * - Able to represent "no evidence yet" (cold start) for any concept.
 * - Able to report a single scalar mastery estimate per concept, so
 *   estimates are comparable across estimator implementations even when
 *   their internal state representations differ completely.
 */
export interface MasteryEstimator<TState = ConceptMasteryState> {
  /** Identifies which estimator produced a given state/trace — e.g. "deterministic-mastery-v1" vs a future "bkt-v1". */
  readonly estimatorId: string;

  /** Cold-start state for one concept. */
  initializeConcept(learnerId: string, conceptId: string, timestamp: string): TState;

  /** Applies one response's evidence to a concept's existing state, returning the updated state and SOME structured trace of the update (shape is estimator-specific; only `mastery` below is required to be comparable across estimators). */
  update(previousState: TState, evidence: ResponseEvidence, conceptWeight: number): { state: TState; trace: unknown };

  /** The single comparable scalar this estimator currently believes for a concept, in [0, 1] regardless of the estimator's internal representation (e.g. a BKT estimator would report P(mastered) here, derived from its own hidden-state parameters). */
  readMastery(state: TState): number;
}

/**
 * Wraps this phase's deterministic formula (updateMastery.ts) to satisfy
 * `MasteryEstimator`, so it can be plugged into a future comparison
 * harness alongside other estimators without that harness needing to
 * know this estimator's internals.
 */
export function createDeterministicMasteryEstimator(parameters: ModelParameters): MasteryEstimator<ConceptMasteryState> {
  return {
    estimatorId: parameters.version,
    initializeConcept: (learnerId, conceptId, timestamp) => createInitialConceptState(learnerId, conceptId, timestamp, parameters),
    update: (previousState, evidence, conceptWeight) => updateMastery(previousState, evidence, conceptWeight, parameters),
    readMastery: (state) => state.mastery,
  };
}

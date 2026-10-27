import type { Question } from "@/domain/questions/types";
import type { ExperimentResponseProvider } from "@/research/experiment/sessionEngine";
import type { ExperimentSessionState, ExternalResponse, RecordedExperimentResponse } from "@/research/experiment/types";

/**
 * The generic CONTRACT a future simulated learner must satisfy — see
 * docs/PHASE8_TECHNICAL_BRIEFING.md §11. This interface decides NOTHING
 * about response probabilities, knowledge-transition dynamics, or
 * prerequisite dependencies; it only standardizes the SHAPE a simulator
 * takes so it can plug into the existing Phase 5 session engine (which
 * already consumes an `ExperimentResponseProvider` and never generates a
 * response itself). Implementing a specific simulator (parameters,
 * distributions, learner profiles) is a Phase 8B protocol decision, not
 * part of this infrastructure.
 */
export interface LearnerSimulatorContext {
  readonly question: Question;
  readonly sequenceIndex: number;
  readonly priorResponses: readonly RecordedExperimentResponse[];
}

export interface LearnerSimulator {
  readonly simulatorId: string;
  readonly version: string;
  readonly parameters: Readonly<Record<string, unknown>>;
  /** Produces the next response given the question and this learner's own response history so far. Implementations MAY use deterministic randomness (see rng.ts) but must not reach outside `context` for anything the experiment engine itself tracks — the engine already supplies everything relevant via `context`. */
  respond(context: LearnerSimulatorContext): ExternalResponse;
}

/**
 * Bridges any conforming `LearnerSimulator` into the
 * `ExperimentResponseProvider` shape `runExperimentToCompletion` already
 * accepts (src/research/experiment/sessionEngine.ts) — the only
 * integration point a simulator needs. No simulator-specific logic
 * lives here; this function only reshapes `ExperimentSessionState` into
 * the narrower `LearnerSimulatorContext` a simulator actually needs.
 */
export function createResponseProviderFromSimulator(simulator: LearnerSimulator): ExperimentResponseProvider {
  return (state: ExperimentSessionState, question: Question) =>
    simulator.respond({ question, sequenceIndex: state.sequenceIndex, priorResponses: state.responses });
}

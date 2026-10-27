/**
 * C6 (protocol/phase8-protocol-v2.md): standard 4-parameter Bayesian
 * Knowledge Tracing (Corbett & Anderson, 1994) as an ESTIMATOR -- this
 * is BKT-fit/BKT-default trying to recover a concept's mastery from
 * behaviour, never to be confused with simulator/s2.ts, which uses the
 * identical equations as a GROUND-TRUTH GENERATOR. The two are
 * deliberately independent implementations reading the same published
 * model, not a shared code path, matching B4's point that this is the
 * published, standard form.
 */

import type { EstimatorAdapter } from "@/research/experiment/types";

export interface BktParams {
  pL0: number;
  T: number;
  G: number;
  S: number;
}

export interface BktState {
  /** Current P(L) -- the PRIOR for the next response, i.e. the raw score r (C6). */
  pL: number;
}

export interface BktTrace {
  estimatorType: "bkt-fit" | "bkt-default";
  conceptId: string;
  version: string;
  pL0: number;
  T: number;
  G: number;
  S: number;
  prior: number;
  correct: boolean;
  likKnown: number;
  likUnknown: number;
  posterior: number;
  postTransition: number;
  predicted: number;
}

/** emit(known, correct) = 1-S, emit(known, incorrect) = S, emit(unknown, correct) = G, emit(unknown, incorrect) = 1-G. */
export function emissionProb(known: boolean, correct: boolean, params: Pick<BktParams, "G" | "S">): number {
  if (known) return correct ? 1 - params.S : params.S;
  return correct ? params.G : 1 - params.G;
}

/** Native BKT prediction P(correct) = P(L)(1-S) + (1-P(L))G, from the PRE-response state. */
export function bktPredict(pL: number, params: Pick<BktParams, "G" | "S">): number {
  return pL * (1 - params.S) + (1 - pL) * params.G;
}

/**
 * One BKT posterior-then-transition step (C6's exact update):
 * correct -> post = pL(1-S) / [pL(1-S) + (1-pL)G]
 * incorrect -> post = pL*S / [pL*S + (1-pL)(1-G)]
 * then pL' = post + (1-post)*T.
 */
export function bktStep(pL: number, correct: boolean, params: BktParams): { posterior: number; postTransition: number; likKnown: number; likUnknown: number } {
  const likKnown = emissionProb(true, correct, params);
  const likUnknown = emissionProb(false, correct, params);
  const numerator = pL * likKnown;
  const denominator = numerator + (1 - pL) * likUnknown;
  const posterior = denominator > 0 ? numerator / denominator : pL;
  const postTransition = posterior + (1 - posterior) * params.T;
  return { posterior, postTransition, likKnown, likUnknown };
}

export type ConceptParamsLookup = (conceptId: string) => BktParams;

/**
 * Builds an `EstimatorAdapter` for either BKT-default (a fixed lookup
 * returning the same params for every concept) or BKT-fit (a lookup
 * backed by per-concept fitted parameters from bktEm.ts). Single-concept
 * only -- Track A (the only place this estimator runs, B4.4) uses
 * single-concept items exclusively, so this does not implement a
 * multi-concept fan-out.
 */
export function createBktEstimatorAdapter(
  estimatorType: "bkt-fit" | "bkt-default",
  version: string,
  getParams: ConceptParamsLookup,
): EstimatorAdapter<BktState> {
  return {
    estimatorType,
    version,
    parameters: {},

    initConcept(_learnerId, conceptId) {
      return { pL: getParams(conceptId).pL0 };
    },

    applyResponse(currentStates, evidence) {
      const updatedStates: Record<string, BktState> = { ...currentStates };
      const traces: BktTrace[] = [];
      for (const conceptId of Object.keys(evidence.conceptWeights)) {
        if ((evidence.conceptWeights[conceptId] ?? 0) <= 0) continue;
        const params = getParams(conceptId);
        const state = currentStates[conceptId] ?? { pL: params.pL0 };
        const { posterior, postTransition, likKnown, likUnknown } = bktStep(state.pL, evidence.correct, params);
        updatedStates[conceptId] = { pL: postTransition };
        traces.push({
          estimatorType,
          conceptId,
          version,
          pL0: params.pL0,
          T: params.T,
          G: params.G,
          S: params.S,
          prior: state.pL,
          correct: evidence.correct,
          likKnown,
          likUnknown,
          posterior,
          postTransition,
          predicted: bktPredict(state.pL, params),
        });
      }
      return { updatedStates, traces };
    },

    readMastery(state) {
      return state.pL;
    },

    // predictCorrectness is deliberately omitted: BKT's prediction needs the concept's own
    // {G, S} (B4.1: "Difficulty: none", but concept-specific), which this per-state signature
    // cannot carry. Callers needing a prediction use bktPredict(state.pL, params) directly.

    serializeStates(states) {
      return JSON.stringify(states);
    },

    restoreStates(serialized) {
      return JSON.parse(serialized) as Record<string, BktState>;
    },
  };
}

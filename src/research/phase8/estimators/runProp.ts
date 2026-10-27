/**
 * C6: RunProp -- Laplace-smoothed proportion correct, (c+1)/(n+2). No
 * tunable parameters (B4.1).
 */

import type { EstimatorAdapter } from "@/research/experiment/types";

export interface RunPropState {
  c: number;
  n: number;
}

export function createRunPropEstimatorAdapter(): EstimatorAdapter<RunPropState> {
  return {
    estimatorType: "run-prop",
    version: "phase8-runprop-v1",
    parameters: {},

    initConcept() {
      return { c: 0, n: 0 };
    },

    applyResponse(currentStates, evidence) {
      const updatedStates: Record<string, RunPropState> = { ...currentStates };
      const traces: Array<{ conceptId: string; cBefore: number; nBefore: number; cAfter: number; nAfter: number }> = [];
      for (const conceptId of Object.keys(evidence.conceptWeights)) {
        if ((evidence.conceptWeights[conceptId] ?? 0) <= 0) continue;
        const state = currentStates[conceptId] ?? { c: 0, n: 0 };
        const next = { c: state.c + (evidence.correct ? 1 : 0), n: state.n + 1 };
        updatedStates[conceptId] = next;
        traces.push({ conceptId, cBefore: state.c, nBefore: state.n, cAfter: next.c, nAfter: next.n });
      }
      return { updatedStates, traces };
    },

    readMastery(state) {
      return (state.c + 1) / (state.n + 2);
    },

    predictCorrectness(state) {
      return (state.c + 1) / (state.n + 2);
    },

    serializeStates(states) {
      return JSON.stringify(states);
    },

    restoreStates(serialized) {
      return JSON.parse(serialized) as Record<string, RunPropState>;
    },
  };
}

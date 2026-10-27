/**
 * C6: EMA -- M <- M + lambda(o - M), M0 = 0.5, lambda = 0.11 (the mean
 * of Det's alpha and beta, untuned; B4.1).
 */

import type { EstimatorAdapter } from "@/research/experiment/types";
import type { EstimatorConfig } from "@/research/phase8/config/load";

export interface EmaState {
  M: number;
}

export function createEmaEstimatorAdapter(cfg: EstimatorConfig["ema"]): EstimatorAdapter<EmaState> {
  return {
    estimatorType: "ema",
    version: "phase8-ema-v1",
    parameters: { lambda: cfg.lambda, m0: cfg.m0 },

    initConcept() {
      return { M: cfg.m0 };
    },

    applyResponse(currentStates, evidence) {
      const updatedStates: Record<string, EmaState> = { ...currentStates };
      const traces: Array<{ conceptId: string; before: number; lambda: number; o: number; after: number }> = [];
      for (const conceptId of Object.keys(evidence.conceptWeights)) {
        if ((evidence.conceptWeights[conceptId] ?? 0) <= 0) continue;
        const state = currentStates[conceptId] ?? { M: cfg.m0 };
        const o = evidence.correct ? 1 : 0;
        const after = state.M + cfg.lambda * (o - state.M);
        updatedStates[conceptId] = { M: after };
        traces.push({ conceptId, before: state.M, lambda: cfg.lambda, o, after });
      }
      return { updatedStates, traces };
    },

    readMastery(state) {
      return state.M;
    },

    predictCorrectness(state) {
      return state.M;
    },

    serializeStates(states) {
      return JSON.stringify(states);
    },

    restoreStates(serialized) {
      return JSON.parse(serialized) as Record<string, EmaState>;
    },
  };
}

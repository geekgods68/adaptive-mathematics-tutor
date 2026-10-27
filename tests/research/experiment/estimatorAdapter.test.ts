import { describe, expect, it } from "vitest";
import { createDeterministicEstimatorAdapter, createNullEstimatorAdapter } from "@/research/experiment/estimatorAdapter";
import { DEFAULT_MODEL_PARAMETERS, DEFAULT_MODEL_PARAMETERS_V2_INVERSE_DIFFICULTY } from "@/domain/learner-model/parameters";
import type { EstimatorResponseEvidence } from "@/research/experiment/types";

const T0 = "2026-10-30T00:00:00.000Z";

function evidence(overrides: Partial<EstimatorResponseEvidence> = {}): EstimatorResponseEvidence {
  return {
    questionId: "q1",
    conceptWeights: { c1: 1 },
    difficulty: 3,
    correct: true,
    selectedOptionId: "a",
    usedHint: false,
    sequenceIndex: 0,
    timestamp: T0,
    ...overrides,
  };
}

describe("createNullEstimatorAdapter — condition C0", () => {
  it("never produces a mastery estimate", () => {
    const adapter = createNullEstimatorAdapter();
    const state = adapter.initConcept("l1", "c1", T0);
    expect(adapter.readMastery(state)).toBeUndefined();
  });

  it("applyResponse is a true no-op: states pass through unchanged, no traces", () => {
    const adapter = createNullEstimatorAdapter();
    const { updatedStates, traces } = adapter.applyResponse({}, evidence(), "l1");
    expect(updatedStates).toEqual({});
    expect(traces).toEqual([]);
  });

  it("serializes and restores (trivially) without error", () => {
    const adapter = createNullEstimatorAdapter();
    const serialized = adapter.serializeStates({});
    expect(adapter.restoreStates(serialized)).toEqual({});
  });

  it("identifies itself distinctly from the deterministic estimator", () => {
    expect(createNullEstimatorAdapter().estimatorType).toBe("none");
  });
});

describe("createDeterministicEstimatorAdapter — Variant A and Variant B", () => {
  it("Variant A reports its version as deterministic-mastery-v1", () => {
    const adapter = createDeterministicEstimatorAdapter(DEFAULT_MODEL_PARAMETERS);
    expect(adapter.estimatorType).toBe("deterministic-mastery");
    expect(adapter.version).toBe("deterministic-mastery-v1");
  });

  it("Variant B reports its own distinct version", () => {
    const adapter = createDeterministicEstimatorAdapter(DEFAULT_MODEL_PARAMETERS_V2_INVERSE_DIFFICULTY);
    expect(adapter.version).toBe("deterministic-mastery-v2-inverse-difficulty");
  });

  it("applyResponse reuses the real Phase 3 formula exactly (0.5 -> 0.56 on a standard-difficulty correct answer)", () => {
    const adapter = createDeterministicEstimatorAdapter(DEFAULT_MODEL_PARAMETERS);
    const cold = adapter.initConcept("l1", "c1", T0);
    const { updatedStates, traces } = adapter.applyResponse({ c1: cold }, evidence({ correct: true }), "l1");
    expect(adapter.readMastery(updatedStates.c1)).toBeCloseTo(0.56, 10);
    expect(traces).toHaveLength(1);
  });

  it("Variant A and Variant B diverge on an incorrect, non-standard-difficulty response (the documented difference between them)", () => {
    const a = createDeterministicEstimatorAdapter(DEFAULT_MODEL_PARAMETERS);
    const b = createDeterministicEstimatorAdapter(DEFAULT_MODEL_PARAMETERS_V2_INVERSE_DIFFICULTY);
    const cold = a.initConcept("l1", "c1", T0);
    const warm = { ...cold, mastery: 0.6 };
    const aResult = a.applyResponse({ c1: warm }, evidence({ correct: false, difficulty: 1 }), "l1");
    const bResult = b.applyResponse({ c1: warm }, evidence({ correct: false, difficulty: 1 }), "l1");
    expect(a.readMastery(aResult.updatedStates.c1)).not.toBeCloseTo(b.readMastery(bResult.updatedStates.c1)!, 5);
  });

  it("fans one response out across multiple concepts via conceptWeights, matching Phase 3's multi-concept rule", () => {
    const adapter = createDeterministicEstimatorAdapter(DEFAULT_MODEL_PARAMETERS);
    const { updatedStates } = adapter.applyResponse({}, evidence({ conceptWeights: { c1: 0.7, c2: 0.3 } }), "l1");
    expect(Object.keys(updatedStates).sort()).toEqual(["c1", "c2"]);
  });

  it("predictCorrectness returns a value derived from mastery, distinct from readMastery's own contract being optional", () => {
    const adapter = createDeterministicEstimatorAdapter(DEFAULT_MODEL_PARAMETERS);
    const state = adapter.initConcept("l1", "c1", T0);
    expect(adapter.predictCorrectness?.(state, 3)).toBe(adapter.readMastery(state));
  });

  it("states round-trip through serializeStates/restoreStates with no loss of fidelity", () => {
    const adapter = createDeterministicEstimatorAdapter(DEFAULT_MODEL_PARAMETERS);
    const { updatedStates } = adapter.applyResponse({}, evidence({ correct: true }), "l1");
    const restored = adapter.restoreStates(adapter.serializeStates(updatedStates));
    expect(restored).toEqual(updatedStates);
  });

  it("does not mutate the input states map", () => {
    const adapter = createDeterministicEstimatorAdapter(DEFAULT_MODEL_PARAMETERS);
    const cold = adapter.initConcept("l1", "c1", T0);
    const states = { c1: cold };
    const snapshot = JSON.parse(JSON.stringify(states));
    adapter.applyResponse(states, evidence(), "l1");
    expect(states).toEqual(snapshot);
  });

  it("exposes its exact parameters object for provenance recording", () => {
    const adapter = createDeterministicEstimatorAdapter(DEFAULT_MODEL_PARAMETERS);
    expect(adapter.parameters).toEqual(DEFAULT_MODEL_PARAMETERS);
  });
});

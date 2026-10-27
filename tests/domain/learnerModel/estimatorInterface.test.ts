import { describe, expect, it } from "vitest";
import { createDeterministicMasteryEstimator } from "@/domain/learner-model/estimatorInterface";
import { DEFAULT_MODEL_PARAMETERS } from "@/domain/learner-model/parameters";
import type { ResponseEvidence } from "@/domain/learner-model/types";

const T0 = "2026-10-30T00:00:00.000Z";

function evidence(overrides: Partial<ResponseEvidence> = {}): ResponseEvidence {
  return {
    questionId: "q-1",
    conceptWeights: { c1: 1 },
    difficulty: 3,
    correct: true,
    selectedOptionId: "A",
    usedHint: false,
    sequenceIndex: 0,
    timestamp: T0,
    ...overrides,
  };
}

describe("createDeterministicMasteryEstimator — MasteryEstimator contract", () => {
  it("exposes an estimatorId matching the parameters' version", () => {
    const estimator = createDeterministicMasteryEstimator(DEFAULT_MODEL_PARAMETERS);
    expect(estimator.estimatorId).toBe(DEFAULT_MODEL_PARAMETERS.version);
  });

  it("initializeConcept produces a cold-start state readable via readMastery", () => {
    const estimator = createDeterministicMasteryEstimator(DEFAULT_MODEL_PARAMETERS);
    const state = estimator.initializeConcept("l1", "c1", T0);
    expect(estimator.readMastery(state)).toBe(DEFAULT_MODEL_PARAMETERS.initialMastery);
  });

  it("update() applies one response and readMastery reflects the new value", () => {
    const estimator = createDeterministicMasteryEstimator(DEFAULT_MODEL_PARAMETERS);
    const cold = estimator.initializeConcept("l1", "c1", T0);
    const { state } = estimator.update(cold, evidence({ correct: true }), 1);
    expect(estimator.readMastery(state)).toBeCloseTo(0.56, 10);
  });

  it("two estimators built from different parameter sets are independently addressable by estimatorId, for future cross-estimator comparison", () => {
    const a = createDeterministicMasteryEstimator(DEFAULT_MODEL_PARAMETERS);
    const b = createDeterministicMasteryEstimator({ ...DEFAULT_MODEL_PARAMETERS, version: "deterministic-mastery-v2", correctGainRate: 0.3 });
    const stateA = a.update(a.initializeConcept("l1", "c1", T0), evidence({ correct: true }), 1).state;
    const stateB = b.update(b.initializeConcept("l1", "c1", T0), evidence({ correct: true }), 1).state;
    expect(a.estimatorId).not.toBe(b.estimatorId);
    expect(a.readMastery(stateA)).not.toBe(b.readMastery(stateB));
  });
});

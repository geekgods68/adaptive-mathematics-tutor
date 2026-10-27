import { describe, expect, it } from "vitest";
import { createInitialConceptState } from "@/domain/learner-model/initialize";
import { updateMastery } from "@/domain/learner-model/updateMastery";
import { DEFAULT_MODEL_PARAMETERS, DEFAULT_MODEL_PARAMETERS_V2_INVERSE_DIFFICULTY } from "@/domain/learner-model/parameters";
import type { ModelParameters, ResponseEvidence } from "@/domain/learner-model/types";

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

describe("Variant A (deterministic-mastery-v1, multiplicative) — original behaviour is preserved", () => {
  it("is the DEFAULT_MODEL_PARAMETERS export, with incorrectDifficultyWeighting = 'multiplicative'", () => {
    expect(DEFAULT_MODEL_PARAMETERS.version).toBe("deterministic-mastery-v1");
    expect(DEFAULT_MODEL_PARAMETERS.incorrectDifficultyWeighting).toBe("multiplicative");
  });

  it("reproduces the original 6-step Phase 3 worked example exactly, unchanged by the variant refactor", () => {
    let state = createInitialConceptState("l1", "c1", T0, DEFAULT_MODEL_PARAMETERS);
    const steps: Array<Partial<ResponseEvidence>> = [
      { correct: true, difficulty: 3, usedHint: false },
      { correct: true, difficulty: 3, usedHint: false },
      { correct: false, difficulty: 3, usedHint: false },
      { correct: true, difficulty: 3, usedHint: true },
      { correct: false, difficulty: 1, usedHint: false },
      { correct: true, difficulty: 5, usedHint: false },
    ];
    const expected = [0.56, 0.6128, 0.5515, 0.5838, 0.5371, 0.6038];
    steps.forEach((step, i) => {
      state = updateMastery(state, evidence({ ...step, sequenceIndex: i }), 1, DEFAULT_MODEL_PARAMETERS).state;
      expect(state.mastery).toBeCloseTo(expected[i], 3);
    });
  });

  it("a harder incorrect response produces a LARGER penalty than an easier one (symmetric with the correct branch)", () => {
    const state = { ...createInitialConceptState("l1", "c1", T0), mastery: 0.6 };
    const easy = updateMastery(state, evidence({ correct: false, difficulty: 1 }), 1, DEFAULT_MODEL_PARAMETERS);
    const hard = updateMastery(state, evidence({ correct: false, difficulty: 5 }), 1, DEFAULT_MODEL_PARAMETERS);
    expect(hard.trace.newMastery).toBeLessThan(easy.trace.newMastery);
    expect(hard.trace.termsComputed.difficultyFactorApplied).toBe(hard.trace.termsComputed.difficultyWeight);
  });

  it("difficultyFactorApplied equals the raw table difficultyWeight for every difficulty level (no inversion)", () => {
    const state = { ...createInitialConceptState("l1", "c1", T0), mastery: 0.6 };
    for (const [diffStr, weight] of Object.entries(DEFAULT_MODEL_PARAMETERS.difficultyWeights)) {
      const difficulty = Number(diffStr) as 1 | 2 | 3 | 4 | 5;
      const { trace } = updateMastery(state, evidence({ correct: false, difficulty }), 1, DEFAULT_MODEL_PARAMETERS);
      expect(trace.termsComputed.difficultyFactorApplied).toBe(weight);
    }
  });
});

describe("Variant B (deterministic-mastery-v2-inverse-difficulty) — inverse difficulty weighting on the incorrect branch", () => {
  it("has a distinct version identifier and incorrectDifficultyWeighting = 'inverse'", () => {
    expect(DEFAULT_MODEL_PARAMETERS_V2_INVERSE_DIFFICULTY.version).toBe("deterministic-mastery-v2-inverse-difficulty");
    expect(DEFAULT_MODEL_PARAMETERS_V2_INVERSE_DIFFICULTY.incorrectDifficultyWeighting).toBe("inverse");
    expect(DEFAULT_MODEL_PARAMETERS_V2_INVERSE_DIFFICULTY.version).not.toBe(DEFAULT_MODEL_PARAMETERS.version);
  });

  it("shares every OTHER parameter with Variant A exactly (only the incorrect-branch weighting mode and version differ)", () => {
    const restA = { ...DEFAULT_MODEL_PARAMETERS, version: undefined, incorrectDifficultyWeighting: undefined };
    const restB = { ...DEFAULT_MODEL_PARAMETERS_V2_INVERSE_DIFFICULTY, version: undefined, incorrectDifficultyWeighting: undefined };
    expect(restA).toEqual(restB);
  });

  it("the correct-response formula is byte-identical between variants (unchanged per spec)", () => {
    const state = { ...createInitialConceptState("l1", "c1", T0), mastery: 0.42 };
    const a = updateMastery(state, evidence({ correct: true, difficulty: 4 }), 1, DEFAULT_MODEL_PARAMETERS);
    const b = updateMastery(state, evidence({ correct: true, difficulty: 4 }), 1, DEFAULT_MODEL_PARAMETERS_V2_INVERSE_DIFFICULTY);
    expect(a.trace.newMastery).toBe(b.trace.newMastery);
    expect(a.trace.termsComputed).toEqual(b.trace.termsComputed);
  });

  it("a harder incorrect response produces a SMALLER penalty than an easier one (inverted from Variant A)", () => {
    const state = { ...createInitialConceptState("l1", "c1", T0), mastery: 0.6 };
    const easy = updateMastery(state, evidence({ correct: false, difficulty: 1 }), 1, DEFAULT_MODEL_PARAMETERS_V2_INVERSE_DIFFICULTY);
    const hard = updateMastery(state, evidence({ correct: false, difficulty: 5 }), 1, DEFAULT_MODEL_PARAMETERS_V2_INVERSE_DIFFICULTY);
    expect(hard.trace.newMastery).toBeGreaterThan(easy.trace.newMastery); // hard = smaller penalty = higher resulting mastery
  });

  it("computes exactly 1/w_d for every one of the five difficulty levels", () => {
    const state = { ...createInitialConceptState("l1", "c1", T0), mastery: 0.6 };
    for (const [diffStr, weight] of Object.entries(DEFAULT_MODEL_PARAMETERS_V2_INVERSE_DIFFICULTY.difficultyWeights)) {
      const difficulty = Number(diffStr) as 1 | 2 | 3 | 4 | 5;
      const { trace } = updateMastery(state, evidence({ correct: false, difficulty }), 1, DEFAULT_MODEL_PARAMETERS_V2_INVERSE_DIFFICULTY);
      expect(trace.termsComputed.difficultyFactorApplied).toBeCloseTo(1 / weight, 10);
      expect(trace.termsComputed.difficultyWeight).toBe(weight); // raw table value still recorded
      const expectedDelta = -DEFAULT_MODEL_PARAMETERS_V2_INVERSE_DIFFICULTY.incorrectLossRate * 0.6 * (1 / weight);
      expect(trace.termsComputed.unweightedDelta).toBeCloseTo(expectedDelta, 10);
    }
  });

  it("matches the exact hand-computed example: M_old=0.6, L1 (w_d=0.8) -> penalty factor 1.25", () => {
    const state = { ...createInitialConceptState("l1", "c1", T0), mastery: 0.6 };
    const { trace } = updateMastery(state, evidence({ correct: false, difficulty: 1 }), 1, DEFAULT_MODEL_PARAMETERS_V2_INVERSE_DIFFICULTY);
    // 0.6 - 0.10*0.6*(1/0.8) = 0.6 - 0.10*0.6*1.25 = 0.6 - 0.075 = 0.525
    expect(trace.newMastery).toBeCloseTo(0.525, 10);
  });

  it("matches the exact hand-computed example: M_old=0.6, L5 (w_d=1.2) -> penalty factor 0.8333...", () => {
    const state = { ...createInitialConceptState("l1", "c1", T0), mastery: 0.6 };
    const { trace } = updateMastery(state, evidence({ correct: false, difficulty: 5 }), 1, DEFAULT_MODEL_PARAMETERS_V2_INVERSE_DIFFICULTY);
    // 0.6 - 0.10*0.6*(1/1.2) = 0.6 - 0.05 = 0.55
    expect(trace.newMastery).toBeCloseTo(0.55, 10);
  });

  it("stays bounded in [0, 1] across many consecutive incorrect responses at the difficulty level with the largest inverse factor (L1)", () => {
    let state = createInitialConceptState("l1", "c1", T0, DEFAULT_MODEL_PARAMETERS_V2_INVERSE_DIFFICULTY);
    for (let i = 0; i < 500; i++) {
      state = updateMastery(state, evidence({ correct: false, difficulty: 1, sequenceIndex: i }), 1, DEFAULT_MODEL_PARAMETERS_V2_INVERSE_DIFFICULTY).state;
      expect(state.mastery).toBeGreaterThanOrEqual(0);
      expect(state.mastery).toBeLessThanOrEqual(1);
    }
  });

  it("is deterministic: identical inputs produce identical state and trace", () => {
    const state = createInitialConceptState("l1", "c1", T0, DEFAULT_MODEL_PARAMETERS_V2_INVERSE_DIFFICULTY);
    const e = evidence({ correct: false, difficulty: 2 });
    const r1 = updateMastery(state, e, 1, DEFAULT_MODEL_PARAMETERS_V2_INVERSE_DIFFICULTY);
    const r2 = updateMastery(state, e, 1, DEFAULT_MODEL_PARAMETERS_V2_INVERSE_DIFFICULTY);
    expect(r1).toEqual(r2);
  });

  it("multi-concept attribution still scales proportionally under the inverse variant", () => {
    const state = createInitialConceptState("l1", "c1", T0, DEFAULT_MODEL_PARAMETERS_V2_INVERSE_DIFFICULTY);
    const warm = { ...state, mastery: 0.6 };
    const solo = updateMastery(warm, evidence({ correct: false, difficulty: 1, conceptWeights: { c1: 1 } }), 1, DEFAULT_MODEL_PARAMETERS_V2_INVERSE_DIFFICULTY);
    const scaled = updateMastery(warm, evidence({ correct: false, difficulty: 1, conceptWeights: { c1: 0.4 } }), 0.4, DEFAULT_MODEL_PARAMETERS_V2_INVERSE_DIFFICULTY);
    expect(scaled.trace.termsComputed.appliedDelta).toBeCloseTo(solo.trace.termsComputed.unweightedDelta * 0.4, 10);
  });

  it("the decision trace's embedded parameters identify the variant used, distinguishing it from Variant A", () => {
    const state = createInitialConceptState("l1", "c1", T0, DEFAULT_MODEL_PARAMETERS_V2_INVERSE_DIFFICULTY);
    const { trace } = updateMastery(state, evidence({ correct: false }), 1, DEFAULT_MODEL_PARAMETERS_V2_INVERSE_DIFFICULTY);
    expect(trace.parameters.incorrectDifficultyWeighting).toBe("inverse");
    expect(trace.modelVersion).toBe("deterministic-mastery-v2-inverse-difficulty");
    expect(trace.explanation).toContain("inverse");
  });

  it("full trace reconstruction: newMastery is recoverable from previousMastery + appliedDelta exactly as under Variant A", () => {
    const state = { ...createInitialConceptState("l1", "c1", T0, DEFAULT_MODEL_PARAMETERS_V2_INVERSE_DIFFICULTY), mastery: 0.37 };
    const { trace } = updateMastery(state, evidence({ correct: false, difficulty: 3 }), 1, DEFAULT_MODEL_PARAMETERS_V2_INVERSE_DIFFICULTY);
    const recomputed = Math.min(1, Math.max(0, trace.previousMastery + trace.termsComputed.appliedDelta));
    expect(recomputed).toBeCloseTo(trace.newMastery, 10);
  });
});

describe("stability guard — inverse weighting requires a nonzero difficulty weight", () => {
  it("throws rather than producing Infinity/NaN if a 0-weighted difficulty level is configured under the inverse variant", () => {
    const badParams: ModelParameters = {
      ...DEFAULT_MODEL_PARAMETERS_V2_INVERSE_DIFFICULTY,
      difficultyWeights: { ...DEFAULT_MODEL_PARAMETERS_V2_INVERSE_DIFFICULTY.difficultyWeights, 3: 0 },
    };
    const state = createInitialConceptState("l1", "c1", T0, badParams);
    expect(() => updateMastery(state, evidence({ correct: false, difficulty: 3 }), 1, badParams)).toThrow();
  });

  it("a 0-weighted difficulty level does NOT throw under the multiplicative variant (it simply zeroes the penalty)", () => {
    const zeroWeightParams: ModelParameters = {
      ...DEFAULT_MODEL_PARAMETERS,
      difficultyWeights: { ...DEFAULT_MODEL_PARAMETERS.difficultyWeights, 3: 0 },
    };
    const state = { ...createInitialConceptState("l1", "c1", T0, zeroWeightParams), mastery: 0.5 };
    const { trace } = updateMastery(state, evidence({ correct: false, difficulty: 3 }), 1, zeroWeightParams);
    expect(trace.newMastery).toBe(0.5);
  });
});

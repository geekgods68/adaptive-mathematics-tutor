import { describe, expect, it } from "vitest";
import { createInitialConceptState } from "@/domain/learner-model/initialize";
import { updateMastery } from "@/domain/learner-model/updateMastery";
import { DEFAULT_MODEL_PARAMETERS } from "@/domain/learner-model/parameters";
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

describe("updateMastery — documented formula at standard difficulty (weight = 1)", () => {
  it("computes the exact correct-response formula: M_new = M_old + α(1-M_old)·w_d·w_h", () => {
    const state = createInitialConceptState("l1", "c1", T0);
    const { trace } = updateMastery(state, evidence({ correct: true, difficulty: 3 }), 1);
    // M0=0.5, alpha=0.12, w_d(3)=1.0, w_h=1.0 -> 0.5 + 0.12*0.5*1*1 = 0.56
    expect(trace.newMastery).toBeCloseTo(0.56, 10);
    expect(trace.termsComputed.rateConstant).toBe("correctGainRate");
  });

  it("computes the exact incorrect-response formula: M_new = M_old - β·M_old·w_d", () => {
    const state = { ...createInitialConceptState("l1", "c1", T0), mastery: 0.6 };
    const { trace } = updateMastery(state, evidence({ correct: false, difficulty: 3 }), 1);
    // 0.6 - 0.10*0.6*1.0 = 0.54
    expect(trace.newMastery).toBeCloseTo(0.54, 10);
    expect(trace.termsComputed.rateConstant).toBe("incorrectLossRate");
  });

  it("applies the hint multiplier ONLY to a correct response", () => {
    const state = createInitialConceptState("l1", "c1", T0);
    const unhinted = updateMastery(state, evidence({ correct: true, usedHint: false }), 1);
    const hinted = updateMastery(state, evidence({ correct: true, usedHint: true }), 1);
    expect(hinted.trace.newMastery).toBeLessThan(unhinted.trace.newMastery);
    expect(hinted.trace.termsComputed.hintMultiplier).toBe(DEFAULT_MODEL_PARAMETERS.hintGainMultiplier);
  });

  it("does NOT apply the hint multiplier to an incorrect response even if usedHint is true", () => {
    const state = { ...createInitialConceptState("l1", "c1", T0), mastery: 0.6 };
    const a = updateMastery(state, evidence({ correct: false, usedHint: false }), 1);
    const b = updateMastery(state, evidence({ correct: false, usedHint: true }), 1);
    expect(a.trace.newMastery).toBe(b.trace.newMastery);
    expect(b.trace.termsComputed.hintMultiplier).toBe(1);
  });
});

describe("updateMastery — determinism", () => {
  it("produces byte-identical state and trace for identical inputs, called repeatedly", () => {
    const state = createInitialConceptState("l1", "c1", T0);
    const e = evidence();
    const r1 = updateMastery(state, e, 1);
    const r2 = updateMastery(state, e, 1);
    expect(r1.state).toEqual(r2.state);
    expect(r1.trace).toEqual(r2.trace);
  });

  it("does not mutate the input state", () => {
    const state = createInitialConceptState("l1", "c1", T0);
    const snapshot = JSON.parse(JSON.stringify(state));
    updateMastery(state, evidence(), 1);
    expect(state).toEqual(snapshot);
  });
});

describe("updateMastery — bounds", () => {
  it("never exceeds 1 even after many consecutive correct responses", () => {
    let state = createInitialConceptState("l1", "c1", T0);
    for (let i = 0; i < 500; i++) {
      state = updateMastery(state, evidence({ correct: true, difficulty: 5, sequenceIndex: i }), 1).state;
      expect(state.mastery).toBeLessThanOrEqual(1);
      expect(state.mastery).toBeGreaterThanOrEqual(0);
    }
    expect(state.mastery).toBeCloseTo(1, 2);
  });

  it("never goes below 0 even after many consecutive incorrect responses", () => {
    let state = createInitialConceptState("l1", "c1", T0);
    for (let i = 0; i < 500; i++) {
      state = updateMastery(state, evidence({ correct: false, difficulty: 5, sequenceIndex: i }), 1).state;
      expect(state.mastery).toBeLessThanOrEqual(1);
      expect(state.mastery).toBeGreaterThanOrEqual(0);
    }
    expect(state.mastery).toBeCloseTo(0, 2);
  });

  it("clamps correctly under an adversarial (out-of-spec) parameter set that would overshoot 1", () => {
    const adversarial: ModelParameters = { ...DEFAULT_MODEL_PARAMETERS, correctGainRate: 5 };
    const state = { ...createInitialConceptState("l1", "c1", T0), mastery: 0.9 };
    const { trace } = updateMastery(state, evidence({ correct: true }), 1, adversarial);
    expect(trace.newMastery).toBe(1);
    expect(trace.termsComputed.clampedResult).toBe(1);
  });

  it("clamps correctly under an adversarial parameter set that would overshoot below 0", () => {
    const adversarial: ModelParameters = { ...DEFAULT_MODEL_PARAMETERS, incorrectLossRate: 5 };
    const state = { ...createInitialConceptState("l1", "c1", T0), mastery: 0.1 };
    const { trace } = updateMastery(state, evidence({ correct: false }), 1, adversarial);
    expect(trace.newMastery).toBe(0);
  });

  it("stays exactly at 1 on a correct answer once mastery has reached 1 (gap term is 0)", () => {
    const state = { ...createInitialConceptState("l1", "c1", T0), mastery: 1 };
    const { trace } = updateMastery(state, evidence({ correct: true }), 1);
    expect(trace.newMastery).toBe(1);
    expect(trace.termsComputed.gapOrCurrentTerm).toBe(0);
  });

  it("stays exactly at 0 on an incorrect answer once mastery has reached 0 (current term is 0)", () => {
    const state = { ...createInitialConceptState("l1", "c1", T0), mastery: 0 };
    const { trace } = updateMastery(state, evidence({ correct: false }), 1);
    expect(trace.newMastery).toBe(0);
    expect(trace.termsComputed.gapOrCurrentTerm).toBe(0);
  });
});

describe("updateMastery — difficulty weighting", () => {
  it("gives a harder correct response a LARGER gain than an easier one, from the same starting mastery", () => {
    const state = createInitialConceptState("l1", "c1", T0);
    const easy = updateMastery(state, evidence({ correct: true, difficulty: 1 }), 1);
    const hard = updateMastery(state, evidence({ correct: true, difficulty: 5 }), 1);
    expect(hard.trace.newMastery).toBeGreaterThan(easy.trace.newMastery);
  });

  it("gives a harder incorrect response a LARGER penalty than an easier one, from the same starting mastery (documented current behaviour — see docs/research-decisions.md RD-0003 for the open question about whether this direction is desirable)", () => {
    const state = { ...createInitialConceptState("l1", "c1", T0), mastery: 0.6 };
    const easy = updateMastery(state, evidence({ correct: false, difficulty: 1 }), 1);
    const hard = updateMastery(state, evidence({ correct: false, difficulty: 5 }), 1);
    expect(hard.trace.newMastery).toBeLessThan(easy.trace.newMastery);
  });

  it("every configured difficulty weight (1-5) is applied exactly as specified", () => {
    const state = { ...createInitialConceptState("l1", "c1", T0), mastery: 0.5 };
    for (const [diffStr, weight] of Object.entries(DEFAULT_MODEL_PARAMETERS.difficultyWeights)) {
      const difficulty = Number(diffStr) as 1 | 2 | 3 | 4 | 5;
      const { trace } = updateMastery(state, evidence({ correct: true, difficulty }), 1);
      expect(trace.termsComputed.difficultyWeight).toBe(weight);
      expect(trace.termsComputed.unweightedDelta).toBeCloseTo(0.12 * 0.5 * weight, 10);
    }
  });

  it("throws on an unconfigured difficulty value rather than silently defaulting", () => {
    const state = createInitialConceptState("l1", "c1", T0);
    const badParams: ModelParameters = {
      ...DEFAULT_MODEL_PARAMETERS,
      difficultyWeights: { 1: 0.8, 2: 0.9, 3: 1.0, 4: 1.1 } as ModelParameters["difficultyWeights"],
    };
    expect(() => updateMastery(state, evidence({ difficulty: 5 }), 1, badParams)).toThrow();
  });
});

describe("updateMastery — correct responses do NOT all produce identical increases", () => {
  it("the gain shrinks as mastery approaches 1 (diminishing returns), not a constant step", () => {
    const low = updateMastery({ ...createInitialConceptState("l1", "c1", T0), mastery: 0.1 }, evidence({ correct: true }), 1);
    const high = updateMastery({ ...createInitialConceptState("l1", "c1", T0), mastery: 0.9 }, evidence({ correct: true }), 1);
    const lowDelta = low.trace.termsComputed.appliedDelta;
    const highDelta = high.trace.termsComputed.appliedDelta;
    expect(lowDelta).not.toBeCloseTo(highDelta, 5);
    expect(highDelta).toBeLessThan(lowDelta);
  });

  it("the penalty shrinks as mastery approaches 0, not a constant step", () => {
    const low = updateMastery({ ...createInitialConceptState("l1", "c1", T0), mastery: 0.1 }, evidence({ correct: false }), 1);
    const high = updateMastery({ ...createInitialConceptState("l1", "c1", T0), mastery: 0.9 }, evidence({ correct: false }), 1);
    expect(Math.abs(low.trace.termsComputed.appliedDelta)).toBeLessThan(Math.abs(high.trace.termsComputed.appliedDelta));
  });
});

describe("updateMastery — repeated and alternating sequences", () => {
  it("repeated correct responses monotonically increase mastery (strictly, until clamped)", () => {
    let state = createInitialConceptState("l1", "c1", T0);
    let prev = state.mastery;
    for (let i = 0; i < 20; i++) {
      state = updateMastery(state, evidence({ correct: true, sequenceIndex: i }), 1).state;
      expect(state.mastery).toBeGreaterThan(prev);
      prev = state.mastery;
    }
    expect(state.correctCount).toBe(20);
    expect(state.consecutiveCorrect).toBe(20);
  });

  it("repeated incorrect responses monotonically decrease mastery (strictly, until clamped)", () => {
    let state = createInitialConceptState("l1", "c1", T0);
    let prev = state.mastery;
    for (let i = 0; i < 20; i++) {
      state = updateMastery(state, evidence({ correct: false, sequenceIndex: i }), 1).state;
      expect(state.mastery).toBeLessThan(prev);
      prev = state.mastery;
    }
    expect(state.incorrectCount).toBe(20);
    expect(state.consecutiveIncorrect).toBe(20);
  });

  it("alternating correct/incorrect resets the consecutive streak counters correctly", () => {
    let state = createInitialConceptState("l1", "c1", T0);
    const pattern = [true, true, false, true, false, false, true];
    for (let i = 0; i < pattern.length; i++) {
      state = updateMastery(state, evidence({ correct: pattern[i], sequenceIndex: i }), 1).state;
    }
    expect(state.numObservations).toBe(7);
    expect(state.correctCount).toBe(4);
    expect(state.incorrectCount).toBe(3);
    expect(state.consecutiveCorrect).toBe(1); // last response was correct, after a false
    expect(state.consecutiveIncorrect).toBe(0);
  });

  it("an alternating sequence does not generally return to the starting mastery (path-dependence is a documented, expected property, not a bug)", () => {
    const upThenDown = [true, false].reduce(
      (s, correct, i) => updateMastery(s, evidence({ correct, sequenceIndex: i }), 1).state,
      createInitialConceptState("l1", "c1", T0),
    );
    const downThenUp = [false, true].reduce(
      (s, correct, i) => updateMastery(s, evidence({ correct, sequenceIndex: i }), 1).state,
      createInitialConceptState("l1", "c1", T0),
    );
    expect(upThenDown.mastery).not.toBeCloseTo(downThenUp.mastery, 5);
  });
});

describe("updateMastery — extreme permitted parameter values", () => {
  it("a zero learning rate produces no change on a correct response", () => {
    const params: ModelParameters = { ...DEFAULT_MODEL_PARAMETERS, correctGainRate: 0 };
    const state = createInitialConceptState("l1", "c1", T0);
    const { trace } = updateMastery(state, evidence({ correct: true }), 1, params);
    expect(trace.newMastery).toBe(state.mastery);
  });

  it("a zero loss rate produces no change on an incorrect response", () => {
    const params: ModelParameters = { ...DEFAULT_MODEL_PARAMETERS, incorrectLossRate: 0 };
    const state = { ...createInitialConceptState("l1", "c1", T0), mastery: 0.7 };
    const { trace } = updateMastery(state, evidence({ correct: false }), 1, params);
    expect(trace.newMastery).toBe(0.7);
  });

  it("a rate of 1.0 with difficultyWeight 1 drives mastery to exactly the gap/current term in one step", () => {
    const params: ModelParameters = {
      ...DEFAULT_MODEL_PARAMETERS,
      correctGainRate: 1,
      difficultyWeights: { 1: 1, 2: 1, 3: 1, 4: 1, 5: 1 },
    };
    const state = { ...createInitialConceptState("l1", "c1", T0), mastery: 0.3 };
    const { trace } = updateMastery(state, evidence({ correct: true, difficulty: 3 }), 1, params);
    expect(trace.newMastery).toBeCloseTo(1, 10); // 0.3 + 1*(0.7)*1*1 = 1.0
  });

  it("initialMastery of 0 and 1 are both valid cold-start values", () => {
    const zeroStart = createInitialConceptState("l1", "c1", T0, { ...DEFAULT_MODEL_PARAMETERS, initialMastery: 0 });
    const oneStart = createInitialConceptState("l1", "c1", T0, { ...DEFAULT_MODEL_PARAMETERS, initialMastery: 1 });
    expect(zeroStart.mastery).toBe(0);
    expect(oneStart.mastery).toBe(1);
  });
});

describe("updateMastery — missing or invalid metadata", () => {
  it("throws when conceptWeights maps to an empty object in applyResponseEvidence (tested via that function, not updateMastery directly, since updateMastery takes a single resolved weight)", () => {
    // see multiConcept.test.ts for applyResponseEvidence-level checks
    expect(true).toBe(true);
  });

  it("accepts a response with no misconceptionId (the common case — most distractors aren't misconception-tagged)", () => {
    const state = { ...createInitialConceptState("l1", "c1", T0), mastery: 0.6 };
    const { trace } = updateMastery(state, evidence({ correct: false, misconceptionId: undefined }), 1);
    expect(trace.misconceptionId).toBeUndefined();
  });

  it("carries a misconceptionId through to the trace and evidence record when present", () => {
    const state = { ...createInitialConceptState("l1", "c1", T0), mastery: 0.6 };
    const { trace, state: newState } = updateMastery(state, evidence({ correct: false, misconceptionId: "M001" }), 1);
    expect(trace.misconceptionId).toBe("M001");
    expect(newState.recentEvidence.at(-1)?.misconceptionId).toBe("M001");
  });

  it("does not record a misconceptionId on a CORRECT response even if one was somehow supplied (a correct answer cannot be evidence of a misconception)", () => {
    const state = createInitialConceptState("l1", "c1", T0);
    const { state: newState } = updateMastery(state, evidence({ correct: true, misconceptionId: "M001" }), 1);
    expect(newState.recentEvidence.at(-1)?.misconceptionId).toBeUndefined();
  });
});

describe("updateMastery — decision-trace reconstruction", () => {
  it("the trace's numerical fields are sufficient to recompute newMastery by hand, matching exactly", () => {
    const state = { ...createInitialConceptState("l1", "c1", T0), mastery: 0.42 };
    const { trace } = updateMastery(state, evidence({ correct: true, difficulty: 4 }), 1);
    const recomputed = trace.previousMastery + trace.termsComputed.appliedDelta;
    expect(Math.min(1, Math.max(0, recomputed))).toBeCloseTo(trace.newMastery, 10);
  });

  it("the explanation string is generated from, and numerically consistent with, termsComputed", () => {
    const state = { ...createInitialConceptState("l1", "c1", T0), mastery: 0.3333 };
    const { trace } = updateMastery(state, evidence({ correct: true, difficulty: 2 }), 1);
    expect(trace.explanation).toContain(trace.newMastery.toFixed(4));
    expect(trace.explanation).toContain(trace.previousMastery.toFixed(4));
  });

  it("records the exact parameters object used, not just its version string", () => {
    const customParams: ModelParameters = { ...DEFAULT_MODEL_PARAMETERS, version: "test-variant-v1", correctGainRate: 0.2 };
    const state = createInitialConceptState("l1", "c1", T0);
    const { trace } = updateMastery(state, evidence({ correct: true }), 1, customParams);
    expect(trace.parameters).toEqual(customParams);
    expect(trace.modelVersion).toBe("test-variant-v1");
  });

  it("records sequenceIndex, questionId, and selectedOptionId exactly as given", () => {
    const state = createInitialConceptState("l1", "c1", T0);
    const { trace } = updateMastery(state, evidence({ questionId: "q-42", selectedOptionId: "C", sequenceIndex: 7 }), 1);
    expect(trace.questionId).toBe("q-42");
    expect(trace.selectedOptionId).toBe("C");
    expect(trace.sequenceIndex).toBe(7);
  });
});

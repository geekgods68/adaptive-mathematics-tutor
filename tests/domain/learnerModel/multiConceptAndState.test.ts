import { describe, expect, it } from "vitest";
import { createInitialConceptState } from "@/domain/learner-model/initialize";
import { applyResponseEvidence, updateMastery } from "@/domain/learner-model/updateMastery";
import { DEFAULT_MODEL_PARAMETERS } from "@/domain/learner-model/parameters";
import type { ConceptMasteryState, ResponseEvidence } from "@/domain/learner-model/types";

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

describe("applyResponseEvidence — multi-concept attribution", () => {
  it("scales each concept's delta by its own conceptWeight, proportionally", () => {
    const { updatedStates } = applyResponseEvidence(
      {},
      evidence({ conceptWeights: { c1: 0.7, c2: 0.3 } }),
      "learner-1",
    );
    const soloDelta = updateMastery(createInitialConceptState("learner-1", "c1", T0), evidence({ conceptWeights: { c1: 1 } }), 1)
      .trace.termsComputed.unweightedDelta;

    const c1Delta = updatedStates.c1.mastery - 0.5;
    const c2Delta = updatedStates.c2.mastery - 0.5;
    expect(c1Delta).toBeCloseTo(soloDelta * 0.7, 10);
    expect(c2Delta).toBeCloseTo(soloDelta * 0.3, 10);
  });

  it("reduces exactly to the single-concept formula when weight = 1", () => {
    const multi = applyResponseEvidence({}, evidence({ conceptWeights: { c1: 1 } }), "learner-1");
    const solo = updateMastery(createInitialConceptState("learner-1", "c1", T0), evidence({ conceptWeights: { c1: 1 } }), 1);
    expect(multi.updatedStates.c1.mastery).toBe(solo.state.mastery);
    expect(multi.traces[0].termsComputed).toEqual(solo.trace.termsComputed);
  });

  it("produces one trace per concept referenced in conceptWeights, in that key order", () => {
    const { traces } = applyResponseEvidence({}, evidence({ conceptWeights: { c1: 0.5, c2: 0.3, c3: 0.2 } }), "learner-1");
    expect(traces).toHaveLength(3);
    expect(traces.map((t) => t.conceptId)).toEqual(["c1", "c2", "c3"]);
  });

  it("creates cold-start state for any concept not already present, leaving existing concepts' state untouched", () => {
    const existingC1: ConceptMasteryState = { ...createInitialConceptState("learner-1", "c1", T0), mastery: 0.8 };
    const { updatedStates } = applyResponseEvidence(
      { c1: existingC1 },
      evidence({ conceptWeights: { c1: 1, c2: 1 } }),
      "learner-1",
    );
    expect(updatedStates.c2.mastery).not.toBe(existingC1.mastery);
    expect(updatedStates.c2.numObservations).toBe(1);
    // c1 was updated FROM 0.8, not reset to a fresh cold start
    expect(updatedStates.c1.mastery).toBeGreaterThan(0.8);
  });

  it("throws on an empty conceptWeights map rather than silently doing nothing", () => {
    expect(() => applyResponseEvidence({}, evidence({ conceptWeights: {} }), "learner-1")).toThrow();
  });

  it("does NOT update any concept outside conceptWeights — in particular, prerequisiteConceptIds are never auto-credited", () => {
    const states: Record<string, ConceptMasteryState> = {
      prereq: { ...createInitialConceptState("learner-1", "prereq", T0), mastery: 0.3 },
    };
    const { updatedStates } = applyResponseEvidence(
      states,
      evidence({ conceptWeights: { dependent: 1 } }), // "prereq" is NOT listed here
      "learner-1",
    );
    expect(updatedStates.prereq).toBe(states.prereq); // byte-identical, untouched reference
    expect(updatedStates.prereq.mastery).toBe(0.3);
    expect(updatedStates.dependent).toBeDefined();
  });
});

describe("independent concept states", () => {
  it("updating one concept never mutates another concept's state object", () => {
    const c1 = createInitialConceptState("learner-1", "c1", T0);
    const c2 = createInitialConceptState("learner-1", "c2", T0);
    const states = { c1, c2 };
    const { updatedStates } = applyResponseEvidence(states, evidence({ conceptWeights: { c1: 1 } }), "learner-1");
    expect(updatedStates.c2).toBe(c2);
    expect(updatedStates.c1).not.toBe(c1);
  });

  it("two concepts with identical prior states but different response histories diverge independently", () => {
    let states: Record<string, ConceptMasteryState> = {
      a: createInitialConceptState("learner-1", "a", T0),
      b: createInitialConceptState("learner-1", "b", T0),
    };
    states = applyResponseEvidence(states, evidence({ conceptWeights: { a: 1 }, correct: true, sequenceIndex: 0 }), "learner-1").updatedStates;
    states = applyResponseEvidence(states, evidence({ conceptWeights: { b: 1 }, correct: false, sequenceIndex: 1 }), "learner-1").updatedStates;
    expect(states.a.mastery).toBeGreaterThan(0.5);
    expect(states.b.mastery).toBeLessThan(0.5);
  });
});

describe("cold-start handling", () => {
  it("a concept with no state starts at exactly parameters.initialMastery with zero observations", () => {
    const state = createInitialConceptState("learner-1", "c1", T0);
    expect(state.mastery).toBe(DEFAULT_MODEL_PARAMETERS.initialMastery);
    expect(state.numObservations).toBe(0);
    expect(state.correctCount).toBe(0);
    expect(state.incorrectCount).toBe(0);
    expect(state.recentEvidence).toEqual([]);
    expect(state.lastSequenceIndex).toBe(-1);
  });

  it("cold-start is independent per concept — no cross-concept prior sharing", () => {
    const warmC1 = updateMastery(createInitialConceptState("learner-1", "c1", T0), evidence({ conceptWeights: { c1: 1 }, correct: true }), 1).state;
    const coldC2 = createInitialConceptState("learner-1", "c2", T0);
    expect(coldC2.mastery).toBe(DEFAULT_MODEL_PARAMETERS.initialMastery);
    expect(coldC2.mastery).not.toBe(warmC1.mastery);
  });

  it("a custom initialMastery parameter is honored at cold start", () => {
    const params = { ...DEFAULT_MODEL_PARAMETERS, initialMastery: 0.2 };
    const state = createInitialConceptState("learner-1", "c1", T0, params);
    expect(state.mastery).toBe(0.2);
    expect(state.initialMastery).toBe(0.2);
  });
});

describe("serialization and restoration of learner states", () => {
  it("a state round-trips through JSON.stringify/parse with no loss of fidelity", () => {
    const state = updateMastery(createInitialConceptState("learner-1", "c1", T0), evidence({ correct: true }), 1).state;
    const restored = JSON.parse(JSON.stringify(state)) as ConceptMasteryState;
    expect(restored).toEqual(state);
  });

  it("a restored state can be used as the input to a further update and produces the same result as continuing on the original object", () => {
    const original = updateMastery(createInitialConceptState("learner-1", "c1", T0), evidence({ correct: true, sequenceIndex: 0 }), 1).state;
    const restored = JSON.parse(JSON.stringify(original)) as ConceptMasteryState;

    const fromOriginal = updateMastery(original, evidence({ correct: false, sequenceIndex: 1 }), 1);
    const fromRestored = updateMastery(restored, evidence({ correct: false, sequenceIndex: 1 }), 1);
    expect(fromRestored.state).toEqual(fromOriginal.state);
    expect(fromRestored.trace).toEqual(fromOriginal.trace);
  });

  it("a full map of concept states round-trips through serialization", () => {
    const states: Record<string, ConceptMasteryState> = {
      c1: createInitialConceptState("learner-1", "c1", T0),
      c2: updateMastery(createInitialConceptState("learner-1", "c2", T0), evidence({ correct: false }), 1).state,
    };
    const restored = JSON.parse(JSON.stringify(states)) as Record<string, ConceptMasteryState>;
    expect(restored).toEqual(states);
  });

  it("a trace round-trips through serialization, including its nested parameters and termsComputed objects", () => {
    const { trace } = updateMastery(createInitialConceptState("learner-1", "c1", T0), evidence({ correct: true, misconceptionId: undefined }), 1);
    const restored = JSON.parse(JSON.stringify(trace));
    expect(restored).toEqual(trace);
  });
});

describe("worked example — multi-step sequence matches hand computation exactly", () => {
  it("reproduces the documented 6-step sequence: 0.5 -> 0.56 -> 0.6128 -> 0.5515 -> 0.5838 -> 0.5371 -> 0.6038", () => {
    let state = createInitialConceptState("learner-1", "c1", T0);
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
      state = updateMastery(state, evidence({ ...step, sequenceIndex: i }), 1).state;
      expect(state.mastery).toBeCloseTo(expected[i], 3);
    });
  });
});

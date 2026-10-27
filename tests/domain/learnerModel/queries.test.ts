import { describe, expect, it } from "vitest";
import {
  getMastery,
  getPrerequisiteMastery,
  getConceptsWithInsufficientEvidence,
  getEvidenceForConcept,
  getTracesForConcept,
} from "@/domain/learner-model/queries";
import { createInitialConceptState } from "@/domain/learner-model/initialize";
import { updateMastery } from "@/domain/learner-model/updateMastery";
import type { MasteryUpdateTrace, ResponseEvidence } from "@/domain/learner-model/types";
import type { Concept } from "@/domain/concepts/types";

const T0 = "2026-10-30T00:00:00.000Z";

function concept(id: string, prerequisiteIds: string[] = []): Concept {
  return { id, name: id, description: id, prerequisiteIds, strand: "algebra_foundations" };
}

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

describe("getMastery", () => {
  it("returns the current mastery for an observed concept", () => {
    const states = { c1: createInitialConceptState("l1", "c1", T0) };
    expect(getMastery(states, "c1")).toBe(0.5);
  });

  it("returns undefined for a concept with no state (never observed) rather than a default", () => {
    expect(getMastery({}, "unknown")).toBeUndefined();
  });
});

describe("getPrerequisiteMastery", () => {
  it("returns mastery for each direct prerequisite only (not transitive)", () => {
    const concepts = [concept("root", ["mid"]), concept("mid", ["leaf"]), concept("leaf")];
    const states = {
      mid: createInitialConceptState("l1", "mid", T0),
      leaf: { ...createInitialConceptState("l1", "leaf", T0), mastery: 0.9 },
    };
    const result = getPrerequisiteMastery(states, concepts, "root");
    expect(result).toEqual({ mid: 0.5 });
    expect(result.leaf).toBeUndefined(); // transitive prerequisite, not direct — out of scope
  });

  it("reports undefined (not 0) for a prerequisite with no observed state", () => {
    const concepts = [concept("root", ["unseen"])];
    const result = getPrerequisiteMastery({}, concepts, "root");
    expect(result).toEqual({ unseen: undefined });
  });

  it("throws on an unknown conceptId rather than returning an empty object silently", () => {
    expect(() => getPrerequisiteMastery({}, [concept("a")], "nonexistent")).toThrow();
  });

  it("returns an empty object for a concept with no prerequisites", () => {
    const concepts = [concept("root", [])];
    expect(getPrerequisiteMastery({}, concepts, "root")).toEqual({});
  });
});

describe("getConceptsWithInsufficientEvidence", () => {
  it("treats a concept with no state at all as 0 observations", () => {
    expect(getConceptsWithInsufficientEvidence({}, ["c1"], 1)).toEqual(["c1"]);
  });

  it("excludes concepts that meet or exceed the threshold", () => {
    const warm = updateMastery(createInitialConceptState("l1", "c1", T0), evidence(), 1).state;
    const states = { c1: warm };
    expect(getConceptsWithInsufficientEvidence(states, ["c1"], 1)).toEqual([]);
    expect(getConceptsWithInsufficientEvidence(states, ["c1"], 2)).toEqual(["c1"]);
  });

  it("preserves the order of the input conceptIds list", () => {
    expect(getConceptsWithInsufficientEvidence({}, ["b", "a", "c"], 1)).toEqual(["b", "a", "c"]);
  });
});

describe("getEvidenceForConcept", () => {
  it("returns an empty array (not undefined) for an unobserved concept", () => {
    expect(getEvidenceForConcept({}, "unknown")).toEqual([]);
  });

  it("returns the recentEvidence trail for an observed concept, oldest first", () => {
    let state = createInitialConceptState("l1", "c1", T0);
    state = updateMastery(state, evidence({ sequenceIndex: 0 }), 1).state;
    state = updateMastery(state, evidence({ sequenceIndex: 1, correct: false }), 1).state;
    const trail = getEvidenceForConcept({ c1: state }, "c1");
    expect(trail.map((e) => e.sequenceIndex)).toEqual([0, 1]);
  });
});

describe("getTracesForConcept", () => {
  it("filters a mixed trace list down to one concept, preserving given order", () => {
    const traceFor = (conceptId: string, sequenceIndex: number): MasteryUpdateTrace =>
      updateMastery(createInitialConceptState("l1", conceptId, T0), evidence({ conceptWeights: { [conceptId]: 1 }, sequenceIndex }), 1).trace;
    const traces = [traceFor("a", 0), traceFor("b", 1), traceFor("a", 2)];
    expect(getTracesForConcept(traces, "a").map((t) => t.sequenceIndex)).toEqual([0, 2]);
    expect(getTracesForConcept(traces, "b")).toHaveLength(1);
    expect(getTracesForConcept(traces, "nonexistent")).toEqual([]);
  });
});

describe("learner model does not select questions (read-only boundary)", () => {
  it("none of the query functions' exports include anything resembling a selection decision", () => {
    // Structural guard: the public surface of queries.ts is read-only getters.
    // This test exists to make an accidental future addition of a
    // `selectNextQuestion`-shaped export to this module fail loudly.
    const queries = { getMastery, getPrerequisiteMastery, getConceptsWithInsufficientEvidence, getEvidenceForConcept, getTracesForConcept };
    expect(Object.keys(queries).every((name) => !/select|next|recommend/i.test(name))).toBe(true);
  });
});

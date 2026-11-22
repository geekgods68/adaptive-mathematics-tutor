import { describe, expect, it } from "vitest";
import { reconstructMasteryStatesForSession, sanitizeMasteryStatesForClient } from "@/tutoring/adaptiveSession/masteryStateTransfer";
import type { ConceptMasteryState } from "@/domain/learner-model/types";

const MODEL_VERSION = "v2-inverse-difficulty";

function makeState(conceptId: string, overrides: Partial<ConceptMasteryState> = {}): ConceptMasteryState {
  return {
    learnerId: "learner-1",
    conceptId,
    mastery: 0.55,
    initialMastery: 0.3,
    numObservations: 3,
    correctCount: 2,
    incorrectCount: 1,
    consecutiveCorrect: 1,
    consecutiveIncorrect: 0,
    recentEvidence: [{ misconceptionId: "mc-1", difficulty: "L3" } as unknown as ConceptMasteryState["recentEvidence"][number]],
    modelVersion: MODEL_VERSION,
    lastSequenceIndex: 2,
    createdAt: "2026-01-01T00:00:00.000Z",
    lastUpdatedAt: "2026-01-01T00:10:00.000Z",
    ...overrides,
  };
}

describe("sanitizeMasteryStatesForClient", () => {
  it("strips recentEvidence and learnerId entirely — never sends misconceptionId/difficulty to the client", () => {
    const sanitized = sanitizeMasteryStatesForClient({ c1: makeState("c1") });
    const serialized = JSON.stringify(sanitized);
    expect(serialized).not.toContain("mc-1");
    expect(serialized).not.toContain("recentEvidence");
    expect(serialized).not.toContain('"difficulty"');
    expect((sanitized.c1 as unknown as Record<string, unknown>).learnerId).toBeUndefined();
  });

  it("preserves every field needed for exact continuation", () => {
    const state = makeState("c1", { mastery: 0.77, numObservations: 9, correctCount: 7, incorrectCount: 2 });
    const sanitized = sanitizeMasteryStatesForClient({ c1: state });
    expect(sanitized.c1).toEqual({
      conceptId: "c1",
      mastery: 0.77,
      initialMastery: 0.3,
      numObservations: 9,
      correctCount: 7,
      incorrectCount: 2,
      consecutiveCorrect: 1,
      consecutiveIncorrect: 0,
      modelVersion: MODEL_VERSION,
      createdAt: "2026-01-01T00:00:00.000Z",
      lastUpdatedAt: "2026-01-01T00:10:00.000Z",
    });
  });
});

describe("reconstructMasteryStatesForSession", () => {
  it("round-trips a sanitized snapshot back into valid ConceptMasteryState objects", () => {
    const original = makeState("c1", { mastery: 0.8 });
    const sanitized = sanitizeMasteryStatesForClient({ c1: original });
    const { states, rejectedConceptIds } = reconstructMasteryStatesForSession(sanitized, "learner-2", MODEL_VERSION);
    expect(rejectedConceptIds).toEqual([]);
    expect(states.c1.mastery).toBe(0.8);
    expect(states.c1.numObservations).toBe(original.numObservations);
    expect(states.c1.correctCount).toBe(original.correctCount);
  });

  it("re-stamps learnerId to the new session's participant, never the original", () => {
    const sanitized = sanitizeMasteryStatesForClient({ c1: makeState("c1") });
    const { states } = reconstructMasteryStatesForSession(sanitized, "new-participant", MODEL_VERSION);
    expect(states.c1.learnerId).toBe("new-participant");
  });

  it("resets recentEvidence to empty and lastSequenceIndex to the cold-start sentinel -1", () => {
    const sanitized = sanitizeMasteryStatesForClient({ c1: makeState("c1") });
    const { states } = reconstructMasteryStatesForSession(sanitized, "learner-2", MODEL_VERSION);
    expect(states.c1.recentEvidence).toEqual([]);
    expect(states.c1.lastSequenceIndex).toBe(-1);
  });

  it("rejects an entry with a mismatched modelVersion rather than blending it into a different formula's state", () => {
    const sanitized = sanitizeMasteryStatesForClient({ c1: makeState("c1") });
    const { states, rejectedConceptIds } = reconstructMasteryStatesForSession(sanitized, "learner-2", "a-different-version");
    expect(states.c1).toBeUndefined();
    expect(rejectedConceptIds).toEqual(["c1"]);
  });

  it("rejects out-of-range mastery values (e.g. negative, or > 1) rather than passing them through", () => {
    const bogus = { c1: { conceptId: "c1", mastery: 1.5, initialMastery: 0.3, numObservations: 1, correctCount: 1, incorrectCount: 0, consecutiveCorrect: 1, consecutiveIncorrect: 0, modelVersion: MODEL_VERSION, createdAt: "x", lastUpdatedAt: "y" } };
    const { states, rejectedConceptIds } = reconstructMasteryStatesForSession(bogus, "learner-2", MODEL_VERSION);
    expect(states.c1).toBeUndefined();
    expect(rejectedConceptIds).toEqual(["c1"]);
  });

  it("rejects an entry whose correctCount + incorrectCount exceeds numObservations (internally inconsistent data)", () => {
    const bogus = { c1: { conceptId: "c1", mastery: 0.5, initialMastery: 0.3, numObservations: 1, correctCount: 5, incorrectCount: 5, consecutiveCorrect: 1, consecutiveIncorrect: 0, modelVersion: MODEL_VERSION, createdAt: "x", lastUpdatedAt: "y" } };
    const { states, rejectedConceptIds } = reconstructMasteryStatesForSession(bogus, "learner-2", MODEL_VERSION);
    expect(states.c1).toBeUndefined();
    expect(rejectedConceptIds).toEqual(["c1"]);
  });

  it("rejects an entry whose key does not match its own conceptId (tamper guard)", () => {
    const sanitized = sanitizeMasteryStatesForClient({ c1: makeState("c1") });
    const swapped = { c2: sanitized.c1 };
    const { states, rejectedConceptIds } = reconstructMasteryStatesForSession(swapped, "learner-2", MODEL_VERSION);
    expect(states.c2).toBeUndefined();
    expect(rejectedConceptIds).toEqual(["c2"]);
  });

  it("handles completely malformed input (null, array, primitive) by returning empty, never throwing", () => {
    expect(reconstructMasteryStatesForSession(null, "learner-2", MODEL_VERSION)).toEqual({ states: {}, rejectedConceptIds: [] });
    expect(reconstructMasteryStatesForSession("garbage", "learner-2", MODEL_VERSION)).toEqual({ states: {}, rejectedConceptIds: [] });
    expect(reconstructMasteryStatesForSession(undefined, "learner-2", MODEL_VERSION)).toEqual({ states: {}, rejectedConceptIds: [] });
  });

  it("accepts multiple valid concepts while rejecting only the malformed ones", () => {
    const good1 = sanitizeMasteryStatesForClient({ c1: makeState("c1") }).c1;
    const good2 = sanitizeMasteryStatesForClient({ c2: makeState("c2", { mastery: 0.4 }) }).c2;
    const mixed = { c1: good1, c2: good2, c3: { garbage: true } };
    const { states, rejectedConceptIds } = reconstructMasteryStatesForSession(mixed, "learner-2", MODEL_VERSION);
    expect(Object.keys(states).sort()).toEqual(["c1", "c2"]);
    expect(rejectedConceptIds).toEqual(["c3"]);
  });
});

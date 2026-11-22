// @vitest-environment jsdom
import { describe, expect, it, beforeEach } from "vitest";
import { clearMasteryState, readMasteryState, writeMasteryState } from "@/lib/studentMasteryState";
import type { PersistableConceptMasteryState } from "@/tutoring/adaptiveSession/masteryStateTransfer";

function makeEntry(conceptId: string, overrides: Partial<PersistableConceptMasteryState> = {}): PersistableConceptMasteryState {
  return {
    conceptId,
    mastery: 0.6,
    initialMastery: 0.3,
    numObservations: 4,
    correctCount: 3,
    incorrectCount: 1,
    consecutiveCorrect: 2,
    consecutiveIncorrect: 0,
    modelVersion: "v2-inverse-difficulty",
    createdAt: "2026-01-01T00:00:00.000Z",
    lastUpdatedAt: "2026-01-01T00:05:00.000Z",
    ...overrides,
  };
}

beforeEach(() => {
  localStorage.clear();
});

describe("studentMasteryState — client-side persistence of real estimator state", () => {
  it("returns null when nothing has ever been stored", () => {
    expect(readMasteryState()).toBeNull();
  });

  it("round-trips a full snapshot exactly (no rounding, no field loss)", () => {
    const states = { c1: makeEntry("c1"), c2: makeEntry("c2", { mastery: 0.9, numObservations: 10, correctCount: 9, incorrectCount: 1 }) };
    writeMasteryState("v2-inverse-difficulty", states);
    const read = readMasteryState();
    expect(read?.modelVersion).toBe("v2-inverse-difficulty");
    expect(read?.states).toEqual(states);
  });

  it("a later write fully replaces the prior snapshot (not merged)", () => {
    writeMasteryState("v2-inverse-difficulty", { c1: makeEntry("c1") });
    writeMasteryState("v2-inverse-difficulty", { c2: makeEntry("c2") });
    const read = readMasteryState();
    expect(Object.keys(read!.states)).toEqual(["c2"]);
  });

  it("corrupted JSON in storage reads back as null rather than throwing", () => {
    localStorage.setItem("rise-student-mastery-state-v1", "{not valid json");
    expect(() => readMasteryState()).not.toThrow();
    expect(readMasteryState()).toBeNull();
  });

  it("drops a malformed per-concept entry (missing required fields) instead of returning it", () => {
    localStorage.setItem(
      "rise-student-mastery-state-v1",
      JSON.stringify({ modelVersion: "v2-inverse-difficulty", updatedAt: "2026-01-01T00:00:00.000Z", states: { c1: { conceptId: "c1" } } }),
    );
    const read = readMasteryState();
    expect(read?.states).toEqual({});
  });

  it("drops an entry whose key does not match its own conceptId field (tamper/corruption guard)", () => {
    const entry = makeEntry("c1");
    localStorage.setItem(
      "rise-student-mastery-state-v1",
      JSON.stringify({ modelVersion: "v2-inverse-difficulty", updatedAt: "2026-01-01T00:00:00.000Z", states: { c2: entry } }),
    );
    const read = readMasteryState();
    expect(read?.states).toEqual({});
  });

  it("clearMasteryState removes the stored snapshot entirely", () => {
    writeMasteryState("v2-inverse-difficulty", { c1: makeEntry("c1") });
    clearMasteryState();
    expect(readMasteryState()).toBeNull();
  });
});

import { describe, expect, it } from "vitest";
import { createMatchedScenarioSet, isMatchedScenarioSet } from "@/research/experiment/matchedScenarios";
import type { ExperimentScenario } from "@/research/experiment/types";
import { concept, manyQuestions } from "../artifact/fixtures";

function baseScenario(): Omit<ExperimentScenario, "scenarioId"> {
  return {
    learnerId: "l1",
    availableQuestions: manyQuestions("c1", 10),
    concepts: [concept("c1", [])],
    curriculumOrder: ["c1"],
    maxQuestions: 5,
    startTimestamp: "2026-10-30T00:00:00.000Z",
  };
}

describe("createMatchedScenarioSet", () => {
  it("stamps the same scenarioId onto every condition's scenario", () => {
    const set = createMatchedScenarioSet(baseScenario(), ["C1", "C2", "C3"] as const, "matched-1");
    expect(set.C1.scenarioId).toBe("matched-1");
    expect(set.C2.scenarioId).toBe("matched-1");
    expect(set.C3.scenarioId).toBe("matched-1");
  });

  it("every condition gets byte-identical starting conditions otherwise", () => {
    const set = createMatchedScenarioSet(baseScenario(), ["C1", "C2"] as const, "matched-2");
    expect(set.C1.availableQuestions).toBe(set.C2.availableQuestions);
    expect(set.C1.concepts).toBe(set.C2.concepts);
    expect(set.C1.maxQuestions).toBe(set.C2.maxQuestions);
  });

  it("produces one entry per condition id, keyed correctly", () => {
    const set = createMatchedScenarioSet(baseScenario(), ["C1", "C2", "C3"] as const, "matched-3");
    expect(Object.keys(set).sort()).toEqual(["C1", "C2", "C3"]);
  });

  it("rejects an empty condition-id list", () => {
    expect(() => createMatchedScenarioSet(baseScenario(), [], "matched-4")).toThrow();
  });

  it("is deterministic — building the same set twice produces an equal result", () => {
    const base = baseScenario();
    expect(createMatchedScenarioSet(base, ["C1", "C2"] as const, "matched-5")).toEqual(createMatchedScenarioSet(base, ["C1", "C2"] as const, "matched-5"));
  });
});

describe("isMatchedScenarioSet", () => {
  it("confirms a genuinely matched set", () => {
    const set = createMatchedScenarioSet(baseScenario(), ["C1", "C2"] as const, "matched-6");
    expect(isMatchedScenarioSet([set.C1, set.C2])).toBe(true);
  });

  it("rejects scenarios with different scenarioIds", () => {
    const a = { ...baseScenario(), scenarioId: "x" };
    const b = { ...baseScenario(), scenarioId: "y" };
    expect(isMatchedScenarioSet([a, b])).toBe(false);
  });

  it("rejects scenarios missing a scenarioId", () => {
    const a = { ...baseScenario(), scenarioId: undefined };
    const b = { ...baseScenario(), scenarioId: undefined };
    expect(isMatchedScenarioSet([a, b])).toBe(false);
  });

  it("rejects scenarios with different maxQuestions even if scenarioId matches", () => {
    const a = { ...baseScenario(), scenarioId: "z", maxQuestions: 5 };
    const b = { ...baseScenario(), scenarioId: "z", maxQuestions: 10 };
    expect(isMatchedScenarioSet([a, b])).toBe(false);
  });

  it("returns false for an empty array", () => {
    expect(isMatchedScenarioSet([])).toBe(false);
  });

  it("does not require identical question SEQUENCES to be selected — that's checked at the state/run level, not the scenario level", () => {
    const set = createMatchedScenarioSet(baseScenario(), ["C1", "C2"] as const, "matched-7");
    // Scenarios are matched purely on starting conditions; this function
    // has no notion of "what was selected" at all.
    expect(isMatchedScenarioSet([set.C1, set.C2])).toBe(true);
  });
});

import { describe, expect, it } from "vitest";
import { runExperimentBatch, type BatchRunSpec } from "@/research/experiment/batch";
import { EXPERIMENT_CONDITIONS } from "@/research/experiment/conditions";
import type { ExperimentScenario, ExternalResponse } from "@/research/experiment/types";
import { concept, manyQuestions } from "../artifact/fixtures";

function scenario(): ExperimentScenario {
  return {
    learnerId: "l1",
    availableQuestions: manyQuestions("c1", 10),
    concepts: [concept("c1", [])],
    curriculumOrder: ["c1"],
    maxQuestions: 3,
    startTimestamp: "2026-10-30T00:00:00.000Z",
  };
}

function fixedCorrectProvider() {
  return (_state: unknown, question: { correctOptionId: string }): ExternalResponse => ({
    selectedOptionId: question.correctOptionId,
    timestamp: "2026-10-30T00:00:00.000Z",
  });
}

describe("runExperimentBatch", () => {
  it("runs every spec and returns one result per spec, in the same order", () => {
    const specs: BatchRunSpec[] = [
      { runId: "batch-run-a", config: EXPERIMENT_CONDITIONS.C1.build(), scenario: scenario(), responseProvider: fixedCorrectProvider() },
      { runId: "batch-run-b", config: EXPERIMENT_CONDITIONS.C2.build(), scenario: scenario(), responseProvider: fixedCorrectProvider() },
      { runId: "batch-run-c", config: EXPERIMENT_CONDITIONS.C0.build(), scenario: { ...scenario(), predeterminedSequence: manyQuestions("c1", 10).map((q) => q.id) }, responseProvider: fixedCorrectProvider() },
    ];
    const results = runExperimentBatch(specs);
    expect(results.map((r) => r.runId)).toEqual(["batch-run-a", "batch-run-b", "batch-run-c"]);
    expect(results.every((r) => r.state.status === "terminated")).toBe(true);
  });

  it("isolates runs from each other — one run's estimator state never leaks into another's", () => {
    const sharedScenario = scenario();
    const specs: BatchRunSpec[] = [
      { runId: "isolated-a", config: EXPERIMENT_CONDITIONS.C1.build(), scenario: sharedScenario, responseProvider: fixedCorrectProvider() },
      { runId: "isolated-b", config: EXPERIMENT_CONDITIONS.C1.build(), scenario: sharedScenario, responseProvider: fixedCorrectProvider() },
    ];
    const results = runExperimentBatch(specs);
    // Both runs started cold and saw the identical response pattern against
    // the identical scenario, so their estimator trajectories must match --
    // if state leaked between runs (e.g. a shared mutable object), one run
    // would start "warm" from the other's progress instead.
    expect(results[0].state.estimatorStates).toEqual(results[1].state.estimatorStates);
    expect(results[0].state.runId).not.toBe(results[1].state.runId);
  });

  it("is deterministic: running the identical batch twice produces identical results (aside from nothing — runId is caller-supplied and identical here)", () => {
    const specs: BatchRunSpec[] = [{ runId: "det-run", config: EXPERIMENT_CONDITIONS.C2.build(), scenario: scenario(), responseProvider: fixedCorrectProvider() }];
    expect(runExperimentBatch(specs)).toEqual(runExperimentBatch(specs));
  });

  it("handles an empty batch without error", () => {
    expect(runExperimentBatch([])).toEqual([]);
  });

  it("each run's presented questions are drawn independently — no shared exposure state across runs", () => {
    const sharedScenario = scenario();
    const specs: BatchRunSpec[] = [
      { runId: "exposure-a", config: EXPERIMENT_CONDITIONS.C1.build(), scenario: sharedScenario, responseProvider: fixedCorrectProvider() },
      { runId: "exposure-b", config: EXPERIMENT_CONDITIONS.C1.build(), scenario: sharedScenario, responseProvider: fixedCorrectProvider() },
    ];
    const results = runExperimentBatch(specs);
    // If exposure state leaked between runs, the second run would be
    // forced to pick different (already-"seen") questions than the first.
    expect(results[0].state.presentedQuestionIds).toEqual(results[1].state.presentedQuestionIds);
  });
});

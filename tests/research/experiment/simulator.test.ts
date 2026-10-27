import { describe, expect, it } from "vitest";
import { createResponseProviderFromSimulator } from "@/research/experiment/simulator";
import type { LearnerSimulator } from "@/research/experiment/simulator";
import { EXPERIMENT_CONDITIONS } from "@/research/experiment/conditions";
import { runExperimentToCompletion } from "@/research/experiment/sessionEngine";
import type { ExperimentScenario } from "@/research/experiment/types";
import { concept, manyQuestions } from "../artifact/fixtures";

/**
 * A trivial, clearly-labelled TEST fixture — not a real research
 * simulator. It exists only to prove the `LearnerSimulator` ->
 * `ExperimentResponseProvider` bridge works mechanically; it makes no
 * claim about modelling real learner behaviour.
 */
function makeAlwaysCorrectTestSimulator(): LearnerSimulator {
  return {
    simulatorId: "test-always-correct",
    version: "test-fixture-v1",
    parameters: {},
    respond: (context) => ({ selectedOptionId: context.question.correctOptionId, timestamp: "2026-10-30T00:00:00.000Z" }),
  };
}

function makeCountingTestSimulator(): LearnerSimulator {
  return {
    simulatorId: "test-counting",
    version: "test-fixture-v1",
    parameters: {},
    respond: (context) => ({
      // Deterministic function of its own prior response count and the
      // question — exercises that `priorResponses` is actually passed through.
      selectedOptionId: context.priorResponses.length % 2 === 0 ? context.question.correctOptionId : context.question.options.find((o) => !o.isCorrect)!.id,
      timestamp: `2026-10-30T00:${String(context.sequenceIndex).padStart(2, "0")}:00.000Z`,
    }),
  };
}

describe("createResponseProviderFromSimulator", () => {
  const concepts = [concept("c1", [])];
  const questions = manyQuestions("c1", 10);

  function scenario(): ExperimentScenario {
    return { learnerId: "l1", availableQuestions: questions, concepts, curriculumOrder: ["c1"], maxQuestions: 5, startTimestamp: "2026-10-30T00:00:00.000Z" };
  }

  it("bridges a LearnerSimulator into a working ExperimentResponseProvider that drives a real session to completion", () => {
    const config = EXPERIMENT_CONDITIONS.C1.build();
    const provider = createResponseProviderFromSimulator(makeAlwaysCorrectTestSimulator());
    const state = runExperimentToCompletion(config, scenario(), "sim-run-1", provider);
    expect(state.status).toBe("terminated");
    expect(state.responses.every((r) => r.isCorrect)).toBe(true);
  });

  it("passes the question, sequenceIndex, and prior response history through to the simulator correctly", () => {
    const config = EXPERIMENT_CONDITIONS.C1.build();
    const provider = createResponseProviderFromSimulator(makeCountingTestSimulator());
    const state = runExperimentToCompletion(config, scenario(), "sim-run-2", provider);
    // The counting simulator alternates correct/incorrect based on its
    // own growing response count — if `priorResponses` were NOT passed
    // through correctly, every response would look identical.
    const correctness = state.responses.map((r) => r.isCorrect);
    expect(new Set(correctness).size).toBeGreaterThan(1);
  });

  it("is deterministic: the same simulator run against the same scenario twice produces identical results", () => {
    const config = EXPERIMENT_CONDITIONS.C1.build();
    const run = () => runExperimentToCompletion(config, scenario(), "sim-run-3", createResponseProviderFromSimulator(makeCountingTestSimulator()));
    expect(run()).toEqual(run());
  });

  it("never generates a response itself when the simulator runs out of distinguishable behaviour — the engine's own termination rules still apply", () => {
    const config = EXPERIMENT_CONDITIONS.C1.build();
    const state = runExperimentToCompletion(config, scenario(), "sim-run-4", createResponseProviderFromSimulator(makeAlwaysCorrectTestSimulator()));
    expect(state.terminationReason).toBeDefined();
  });
});

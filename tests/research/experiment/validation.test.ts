import { describe, expect, it } from "vitest";
import { validateExperimentConfig } from "@/research/experiment/validation";
import { EXPERIMENT_CONDITIONS } from "@/research/experiment/conditions";
import { createDeterministicEstimatorAdapter, createNullEstimatorAdapter } from "@/research/experiment/estimatorAdapter";
import { createAdaptiveSelectionAdapter, createNonAdaptiveSelectionAdapter } from "@/research/experiment/selectionAdapter";
import { DEFAULT_MODEL_PARAMETERS } from "@/domain/learner-model/parameters";
import type { AnswerOption, Question } from "@/domain/questions/types";
import type { ExperimentScenario } from "@/research/experiment/types";

function option(id: string, isCorrect: boolean): AnswerOption {
  return { id, display: id, isCorrect };
}

function question(id: string, difficulty: 1 | 2 | 3 | 4 | 5 = 2): Question {
  return {
    id,
    stem: "stem",
    conceptIds: ["c1"],
    primaryConceptId: "c1",
    difficulty,
    options: [option(`${id}-correct`, true), option(`${id}-wrong`, false)],
    correctOptionId: `${id}-correct`,
    workedSolution: "solution",
    version: 1,
  };
}

function baseScenario(overrides: Partial<ExperimentScenario> = {}): ExperimentScenario {
  return {
    learnerId: "l1",
    availableQuestions: [question("q1")],
    concepts: [],
    curriculumOrder: [],
    maxQuestions: 10,
    startTimestamp: "2026-10-30T00:00:00.000Z",
    ...overrides,
  };
}

describe("validateExperimentConfig — valid configurations", () => {
  it("accepts every registered C0-C3 condition against a compatible scenario", () => {
    for (const entry of Object.values(EXPERIMENT_CONDITIONS)) {
      const config = entry.build();
      const scenario = baseScenario(
        config.selection.policyType === "non_adaptive" ? { predeterminedSequence: ["q1"] } : {},
      );
      const result = validateExperimentConfig(config, scenario);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    }
  });
});

describe("validateExperimentConfig — rejects invalid configurations", () => {
  it("rejects an adaptive policy paired with the 'none' estimator (incompatible combination)", () => {
    const config = { conditionId: "bad", estimator: createNullEstimatorAdapter(), selection: createAdaptiveSelectionAdapter() };
    const result = validateExperimentConfig(config, baseScenario());
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === "config")).toBe(true);
  });

  it("rejects a non-adaptive policy with no predeterminedSequence", () => {
    const config = { conditionId: "bad", estimator: createNullEstimatorAdapter(), selection: createNonAdaptiveSelectionAdapter() };
    const result = validateExperimentConfig(config, baseScenario());
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === "scenario.predeterminedSequence")).toBe(true);
  });

  it("rejects an unknown selection policyType", () => {
    const config = {
      conditionId: "bad",
      estimator: createNullEstimatorAdapter(),
      selection: { policyType: "quantum" as never, version: "v1", parameters: {}, selectNext: () => ({ result: { questionId: null } }) },
    };
    const result = validateExperimentConfig(config, baseScenario());
    expect(result.valid).toBe(false);
  });

  it("rejects invalid deterministic-mastery parameters (missing difficulty weights)", () => {
    const badParams = { ...DEFAULT_MODEL_PARAMETERS, difficultyWeights: { 1: 0.8 } as never };
    const config = { conditionId: "bad", estimator: createDeterministicEstimatorAdapter(badParams), selection: createAdaptiveSelectionAdapter() };
    const result = validateExperimentConfig(config, baseScenario());
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field.includes("difficultyWeights"))).toBe(true);
  });

  it("rejects a non-positive maxQuestions", () => {
    const config = EXPERIMENT_CONDITIONS.C1.build();
    const result = validateExperimentConfig(config, baseScenario({ maxQuestions: 0 }));
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === "scenario.maxQuestions")).toBe(true);
  });

  it("rejects an empty availableQuestions array (missing required dataset reference)", () => {
    const config = EXPERIMENT_CONDITIONS.C1.build();
    const result = validateExperimentConfig(config, baseScenario({ availableQuestions: [] }));
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === "scenario.availableQuestions")).toBe(true);
  });

  it("rejects a question with an unsupported difficulty level", () => {
    const config = EXPERIMENT_CONDITIONS.C1.build();
    const badQuestion = question("bad-q", 2);
    (badQuestion as { difficulty: number }).difficulty = 99;
    const result = validateExperimentConfig(config, baseScenario({ availableQuestions: [badQuestion] }));
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.message.includes("unsupported difficulty"))).toBe(true);
  });

  it("rejects an invalid maxExposurePerQuestion", () => {
    const config = EXPERIMENT_CONDITIONS.C1.build();
    const result = validateExperimentConfig(config, baseScenario({ maxExposurePerQuestion: 0 }));
    expect(result.valid).toBe(false);
  });

  it("rejects an invalid completionCheck.masteryThreshold", () => {
    const config = EXPERIMENT_CONDITIONS.C1.build();
    const result = validateExperimentConfig(config, baseScenario({ completionCheck: { masteryThreshold: 1.5, minEvidenceCount: 3 } }));
    expect(result.valid).toBe(false);
  });

  it("collects multiple independent errors in one pass rather than stopping at the first", () => {
    const config = { conditionId: "", estimator: createNullEstimatorAdapter(), selection: createAdaptiveSelectionAdapter() };
    const result = validateExperimentConfig(config, baseScenario({ maxQuestions: -1, availableQuestions: [] }));
    expect(result.errors.length).toBeGreaterThan(2);
  });
});

import { describe, expect, it } from "vitest";
import { computeMetric, computeMetrics, type MetricDefinition } from "@/research/experiment/metrics";
import { EXPERIMENT_CONDITIONS } from "@/research/experiment/conditions";
import { runExperimentToCompletion } from "@/research/experiment/sessionEngine";
import { buildExperimentRunArtifact } from "@/research/artifact/buildArtifact";
import type { ExperimentRunArtifact } from "@/research/artifact/types";
import type { ExperimentScenario } from "@/research/experiment/types";
import { concept, manyQuestions } from "../artifact/fixtures";

/**
 * A trivial, explicitly-labelled TEST metric (counts runs) — this is
 * infrastructure verification, not a real evaluation metric. Phase 8A
 * chooses actual scientific metrics; this file only proves the generic
 * MetricDefinition contract is invokable.
 */
const runCountMetric: MetricDefinition<number> = {
  metricId: "test-run-count",
  version: "test-fixture-v1",
  compute: (artifacts) => artifacts.length,
};

const totalQuestionsMetric: MetricDefinition<number> = {
  metricId: "test-total-questions",
  version: "test-fixture-v1",
  compute: (artifacts) => artifacts.reduce((sum, a) => sum + a.provenance.responseSequence.length, 0),
};

function buildSampleArtifacts(count: number): ExperimentRunArtifact[] {
  const concepts = [concept("c1", [])];
  const questions = manyQuestions("c1", 5);
  const scenario: ExperimentScenario = { learnerId: "l1", availableQuestions: questions, concepts, curriculumOrder: ["c1"], maxQuestions: 2, startTimestamp: "2026-10-30T00:00:00.000Z" };
  const config = EXPERIMENT_CONDITIONS.C1.build();

  return Array.from({ length: count }, (_, i) => {
    const state = runExperimentToCompletion(config, scenario, `metric-run-${i}`, (s, q) => ({ selectedOptionId: q.correctOptionId, timestamp: "2026-10-30T00:00:00.000Z" }));
    return buildExperimentRunArtifact(config, scenario, state);
  });
}

describe("computeMetric", () => {
  it("invokes the supplied metric's compute function against the given artifacts", () => {
    const artifacts = buildSampleArtifacts(3);
    expect(computeMetric(runCountMetric, artifacts)).toBe(3);
  });

  it("does not mutate the artifacts passed in", () => {
    const artifacts = buildSampleArtifacts(2);
    const snapshot = JSON.parse(JSON.stringify(artifacts));
    computeMetric(totalQuestionsMetric, artifacts);
    expect(artifacts).toEqual(snapshot);
  });

  it("is agnostic to what the metric actually measures — any pure function of artifacts works", () => {
    const artifacts = buildSampleArtifacts(2);
    expect(computeMetric(totalQuestionsMetric, artifacts)).toBe(4); // 2 runs x 2 questions each
  });

  it("handles an empty artifact list", () => {
    expect(computeMetric(runCountMetric, [])).toBe(0);
  });
});

describe("computeMetrics", () => {
  it("runs multiple metrics and keys results by metricId", () => {
    const artifacts = buildSampleArtifacts(2);
    const results = computeMetrics([runCountMetric, totalQuestionsMetric], artifacts);
    expect(results).toEqual({ "test-run-count": 2, "test-total-questions": 4 });
  });

  it("handles an empty metric list", () => {
    expect(computeMetrics([], buildSampleArtifacts(1))).toEqual({});
  });
});

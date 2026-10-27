import { describe, expect, it, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { buildSampleArtifact } from "./fixtures";
import { saveExperimentRunArtifact } from "@/research/artifact/persistence";
import { EXPERIMENT_CONDITIONS } from "@/research/experiment/conditions";
import { runExperimentToCompletion } from "@/research/experiment/sessionEngine";
import { buildExperimentRunArtifact } from "@/research/artifact/buildArtifact";
import { compareRunProvenance, getRun, listRuns, summarizeRun, verifyRun } from "@/research/artifact/inspect";
import type { ExperimentScenario } from "@/research/experiment/types";

let tempDir: string;

beforeEach(() => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "artifact-inspect-test-"));
});

afterEach(() => {
  fs.rmSync(tempDir, { recursive: true, force: true });
});

describe("listRuns", () => {
  it("lists all stored runs with no filter", () => {
    saveExperimentRunArtifact(buildSampleArtifact({ runId: "run-a" }).artifact, { dir: tempDir });
    saveExperimentRunArtifact(buildSampleArtifact({ runId: "run-b" }).artifact, { dir: tempDir });
    expect(listRuns({}, tempDir).map((r) => r.runId).sort()).toEqual(["run-a", "run-b"]);
  });

  it("filters by conditionId", () => {
    const c1Config = EXPERIMENT_CONDITIONS.C1.build();
    const c0Config = EXPERIMENT_CONDITIONS.C0.build();
    const scenario: ExperimentScenario = {
      learnerId: "l1",
      availableQuestions: [{ id: "q1", stem: "s", conceptIds: ["c1"], primaryConceptId: "c1", difficulty: 2, options: [{ id: "a", display: "a", isCorrect: true }], correctOptionId: "a", workedSolution: "w", version: 1 }],
      concepts: [],
      curriculumOrder: [],
      predeterminedSequence: ["q1"],
      maxQuestions: 1,
      startTimestamp: "2026-10-30T00:00:00.000Z",
    };
    const c0State = runExperimentToCompletion(c0Config, scenario, "c0-run", (s, q) => ({ selectedOptionId: q.correctOptionId, timestamp: "2026-10-30T00:00:00.000Z" }));
    saveExperimentRunArtifact(buildExperimentRunArtifact(c0Config, scenario, c0State), { dir: tempDir });
    saveExperimentRunArtifact(buildSampleArtifact({ runId: "c1-run" }).artifact, { dir: tempDir }); // C1
    void c1Config;

    expect(listRuns({ conditionId: "C0" }, tempDir).map((r) => r.runId)).toEqual(["c0-run"]);
    expect(listRuns({ conditionId: "C1" }, tempDir).map((r) => r.runId)).toEqual(["c1-run"]);
  });

  it("filters by scenarioId", () => {
    saveExperimentRunArtifact(buildSampleArtifact({ runId: "run-s1", scenarioId: "scenario-1" }).artifact, { dir: tempDir });
    saveExperimentRunArtifact(buildSampleArtifact({ runId: "run-s2", scenarioId: "scenario-2" }).artifact, { dir: tempDir });
    expect(listRuns({ scenarioId: "scenario-1" }, tempDir).map((r) => r.runId)).toEqual(["run-s1"]);
  });

  it("filters by terminationStatus", () => {
    saveExperimentRunArtifact(buildSampleArtifact({ runId: "run-term" }).artifact, { dir: tempDir });
    expect(listRuns({ terminationStatus: "terminated" }, tempDir).map((r) => r.runId)).toEqual(["run-term"]);
    expect(listRuns({ terminationStatus: "active" }, tempDir)).toEqual([]);
  });
});

describe("getRun / verifyRun / summarizeRun", () => {
  it("getRun loads the full stored artifact", () => {
    const { artifact } = buildSampleArtifact({ runId: "run-full" });
    saveExperimentRunArtifact(artifact, { dir: tempDir });
    expect(getRun("run-full", tempDir)).toEqual(artifact);
  });

  it("verifyRun loads and verifies in one call", () => {
    saveExperimentRunArtifact(buildSampleArtifact({ runId: "run-verify" }).artifact, { dir: tempDir });
    expect(verifyRun("run-verify", undefined, tempDir).contentDigestValid).toBe(true);
  });

  it("summarizeRun produces the run-summary export row", () => {
    saveExperimentRunArtifact(buildSampleArtifact({ runId: "run-summary" }).artifact, { dir: tempDir });
    expect(summarizeRun("run-summary", tempDir).runId).toBe("run-summary");
  });

  it("none of these functions modify the stored artifact", () => {
    const { artifact } = buildSampleArtifact({ runId: "run-readonly" });
    saveExperimentRunArtifact(artifact, { dir: tempDir });
    const before = fs.readFileSync(path.join(tempDir, "run-readonly.json"), "utf8");
    getRun("run-readonly", tempDir);
    verifyRun("run-readonly", undefined, tempDir);
    summarizeRun("run-readonly", tempDir);
    const after = fs.readFileSync(path.join(tempDir, "run-readonly.json"), "utf8");
    expect(after).toBe(before);
  });
});

describe("compareRunProvenance", () => {
  it("identifies two runs from the same scenario/bank/curriculum/software as a matched scenario", () => {
    const run1 = buildSampleArtifact({ runId: "match-a", scenarioId: "shared-scenario" }).artifact;
    const run2 = buildSampleArtifact({ runId: "match-b", scenarioId: "shared-scenario" }).artifact;
    saveExperimentRunArtifact(run1, { dir: tempDir });
    saveExperimentRunArtifact(run2, { dir: tempDir });
    const comparison = compareRunProvenance("match-a", "match-b", tempDir);
    expect(comparison.matchedScenario).toBe(true);
    expect(comparison.sameQuestionBankHash).toBe(true);
  });

  it("does not require identical selection outcomes to call it a matched scenario (fairness != identical sequence)", () => {
    const run1 = buildSampleArtifact({ runId: "fair-a", scenarioId: "shared" }).artifact;
    const run2 = buildSampleArtifact({ runId: "fair-b", scenarioId: "shared" }).artifact;
    saveExperimentRunArtifact(run1, { dir: tempDir });
    saveExperimentRunArtifact(run2, { dir: tempDir });
    const comparison = compareRunProvenance("fair-a", "fair-b", tempDir);
    expect(comparison).not.toHaveProperty("sameQuestionSequence");
    expect(comparison.matchedScenario).toBe(true);
  });

  it("flags runs with different scenario ids as not a matched scenario", () => {
    saveExperimentRunArtifact(buildSampleArtifact({ runId: "diff-a", scenarioId: "scenario-x" }).artifact, { dir: tempDir });
    saveExperimentRunArtifact(buildSampleArtifact({ runId: "diff-b", scenarioId: "scenario-y" }).artifact, { dir: tempDir });
    expect(compareRunProvenance("diff-a", "diff-b", tempDir).matchedScenario).toBe(false);
  });
});

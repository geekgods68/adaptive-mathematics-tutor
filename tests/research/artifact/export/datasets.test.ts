import { describe, expect, it } from "vitest";
import { buildSampleArtifact, question, concept } from "../fixtures";
import { EXPERIMENT_CONDITIONS } from "@/research/experiment/conditions";
import { runExperimentToCompletion } from "@/research/experiment/sessionEngine";
import { buildExperimentRunArtifact } from "@/research/artifact/buildArtifact";
import {
  buildMasteryTrajectoryRows,
  buildMisconceptionEvidenceRows,
  buildQuestionResponseRows,
  buildRunSummaryRow,
  buildSelectionDecisionRows,
} from "@/research/artifact/export/datasets";
import { toCsv, toJsonl } from "@/research/artifact/export/csv";
import type { ExperimentScenario } from "@/research/experiment/types";

describe("buildRunSummaryRow", () => {
  it("reports accurate administered/correct/incorrect counts, with no fabricated learning-gain figure", () => {
    const { artifact } = buildSampleArtifact();
    const row = buildRunSummaryRow(artifact);
    expect(row.questionCount).toBe(artifact.provenance.responseSequence.length);
    expect(row.correctCount + row.incorrectCount).toBe(row.questionCount);
    expect(row).not.toHaveProperty("learningGain");
    expect(row).not.toHaveProperty("masteryAccuracy");
  });

  it("round-trips through CSV with a stable header", () => {
    const { artifact } = buildSampleArtifact();
    const row = buildRunSummaryRow(artifact);
    const csv = toCsv([row], ["runId", "conditionId", "questionCount", "correctCount"]);
    const lines = csv.trim().split("\r\n");
    expect(lines[0]).toBe("runId,conditionId,questionCount,correctCount");
    expect(lines[1]).toContain(row.runId);
  });
});

describe("buildQuestionResponseRows", () => {
  it("produces one row per administered question with concept/difficulty looked up from the live bank, not duplicated bank content", () => {
    const { artifact, questions } = buildSampleArtifact();
    const rows = buildQuestionResponseRows(artifact, new Map(questions.map((q) => [q.id, q])));
    expect(rows).toHaveLength(artifact.provenance.responseSequence.length);
    expect(rows[0].conceptIds).toBe("c1");
    expect(rows[0].difficulty).toBeGreaterThanOrEqual(1);
  });

  it("leaves concept/difficulty blank (not fabricated) when the question isn't in the supplied lookup", () => {
    const { artifact } = buildSampleArtifact();
    const rows = buildQuestionResponseRows(artifact, new Map());
    expect(rows[0].conceptIds).toBe("");
    expect(rows[0].difficulty).toBe("");
  });

  it("preserves the exact selected/correct option ids and correctness per response", () => {
    const { artifact, questions } = buildSampleArtifact();
    const rows = buildQuestionResponseRows(artifact, new Map(questions.map((q) => [q.id, q])));
    rows.forEach((row, i) => {
      expect(row.isCorrect).toBe(artifact.provenance.responseSequence[i].isCorrect);
      expect(row.selectedOptionId).toBe(artifact.provenance.responseSequence[i].selectedOptionId);
    });
  });
});

describe("buildMasteryTrajectoryRows — multi-concept attribution", () => {
  it("produces ONE row per concept a multi-concept question touched, not one collapsed row", () => {
    const config = EXPERIMENT_CONDITIONS.C1.build();
    const multiQuestion = question("multi-q", ["c1", "c2"], 3);
    const scenario: ExperimentScenario = {
      learnerId: "l1",
      availableQuestions: [multiQuestion],
      concepts: [concept("c1"), concept("c2")],
      curriculumOrder: ["c1", "c2"],
      maxQuestions: 1,
      startTimestamp: "2026-10-30T00:00:00.000Z",
    };
    // multiQuestion has no explicit conceptWeights, so resolveConceptWeights
    // in the session engine falls back to { [primaryConceptId]: 1 } (c1
    // only) — to exercise genuine multi-concept attribution we need a
    // question whose conceptWeights spans both concepts explicitly.
    multiQuestion.conceptWeights = { c1: 0.6, c2: 0.4 };
    const state = runExperimentToCompletion(config, scenario, "multi-run", (s, q) => ({ selectedOptionId: q.correctOptionId, timestamp: "2026-10-30T00:00:00.000Z" }));
    const artifact = buildExperimentRunArtifact(config, scenario, state);

    const rows = buildMasteryTrajectoryRows(artifact);
    expect(rows).toHaveLength(2);
    expect(rows.map((r) => r.conceptId).sort()).toEqual(["c1", "c2"]);
    expect(rows.find((r) => r.conceptId === "c1")?.conceptWeight).toBe(0.6);
    expect(rows.find((r) => r.conceptId === "c2")?.conceptWeight).toBe(0.4);
  });

  it("preserves full-precision masteryBefore/masteryAfter/appliedDelta values, matching the original trace exactly", () => {
    const { artifact } = buildSampleArtifact();
    const rows = buildMasteryTrajectoryRows(artifact);
    expect(rows.length).toBeGreaterThan(0);
    const trace = artifact.provenance.estimatorTraces[0] as { previousMastery: number; newMastery: number; termsComputed: { appliedDelta: number } };
    expect(rows[0].masteryBefore).toBe(trace.previousMastery);
    expect(rows[0].masteryAfter).toBe(trace.newMastery);
    expect(rows[0].appliedDelta).toBe(trace.termsComputed.appliedDelta);
  });

  it("produces no rows for the null estimator (C0)", () => {
    const config = EXPERIMENT_CONDITIONS.C0.build();
    const scenario: ExperimentScenario = {
      learnerId: "l1",
      availableQuestions: [question("q1", ["c1"])],
      concepts: [],
      curriculumOrder: [],
      predeterminedSequence: ["q1"],
      maxQuestions: 1,
      startTimestamp: "2026-10-30T00:00:00.000Z",
    };
    const state = runExperimentToCompletion(config, scenario, "c0-run", (s, q) => ({ selectedOptionId: q.correctOptionId, timestamp: "2026-10-30T00:00:00.000Z" }));
    const artifact = buildExperimentRunArtifact(config, scenario, state);
    expect(buildMasteryTrajectoryRows(artifact)).toEqual([]);
  });
});

describe("buildSelectionDecisionRows", () => {
  it("produces one row per adaptive selection with the reason and backtrack/probe flags", () => {
    const { artifact } = buildSampleArtifact();
    const rows = buildSelectionDecisionRows(artifact);
    expect(rows.length).toBeGreaterThan(0);
    expect(rows[0]).toHaveProperty("reason");
    expect(typeof rows[0].prerequisiteBacktrackOccurred).toBe("boolean");
    expect(typeof rows[0].diagnosticProbeOccurred).toBe("boolean");
  });

  it("produces no rows for a non-adaptive condition (no per-call trace to flatten)", () => {
    const config = EXPERIMENT_CONDITIONS.C0.build();
    const scenario: ExperimentScenario = {
      learnerId: "l1",
      availableQuestions: [question("q1", ["c1"])],
      concepts: [],
      curriculumOrder: [],
      predeterminedSequence: ["q1"],
      maxQuestions: 1,
      startTimestamp: "2026-10-30T00:00:00.000Z",
    };
    const state = runExperimentToCompletion(config, scenario, "c0-run-2", (s, q) => ({ selectedOptionId: q.correctOptionId, timestamp: "2026-10-30T00:00:00.000Z" }));
    const artifact = buildExperimentRunArtifact(config, scenario, state);
    expect(buildSelectionDecisionRows(artifact)).toEqual([]);
  });
});

describe("buildMisconceptionEvidenceRows", () => {
  it("includes only responses that evidenced a misconception, always marked as NOT a confirmed diagnosis", () => {
    const { artifact } = buildSampleArtifact();
    const rows = buildMisconceptionEvidenceRows(artifact);
    const incorrectWithMisconception = artifact.provenance.responseSequence.filter((r) => r.misconceptionId !== undefined);
    expect(rows).toHaveLength(incorrectWithMisconception.length);
    expect(rows.every((r) => r.isConfirmedDiagnosis === false)).toBe(true);
  });
});

describe("CSV/JSONL escaping", () => {
  it("quotes a field containing a comma, quote, or newline per RFC 4180", () => {
    const rows = [{ a: 'has,"comma and quote"', b: "line1\nline2" }];
    const csv = toCsv(rows, ["a", "b"]);
    const dataLine = csv.trim().split("\r\n")[1];
    expect(dataLine).toContain('"has,""comma and quote"""');
    expect(dataLine).toContain('"line1\nline2"');
  });

  it("does not quote a plain field", () => {
    const csv = toCsv([{ a: "plain" }], ["a"]);
    expect(csv.trim().split("\r\n")[1]).toBe("plain");
  });

  it("JSONL produces one parseable JSON object per line, preserving nested structure CSV would flatten away", () => {
    const rows = [{ id: 1, nested: { a: [1, 2, 3] } }];
    const jsonl = toJsonl(rows);
    const parsed = jsonl.trim().split("\n").map((line) => JSON.parse(line));
    expect(parsed).toEqual(rows);
  });

  it("produces deterministic output for the same input", () => {
    const { artifact, questions } = buildSampleArtifact();
    const rows = buildQuestionResponseRows(artifact, new Map(questions.map((q) => [q.id, q])));
    expect(toCsv(rows, ["runId", "questionId"])).toBe(toCsv(rows, ["runId", "questionId"]));
  });
});

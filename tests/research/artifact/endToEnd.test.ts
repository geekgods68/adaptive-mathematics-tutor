import { describe, expect, it, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { EXPERIMENT_CONDITIONS } from "@/research/experiment/conditions";
import { runExperimentToCompletion } from "@/research/experiment/sessionEngine";
import { buildExperimentRunArtifact } from "@/research/artifact/buildArtifact";
import { saveExperimentRunArtifact, loadExperimentRunArtifact } from "@/research/artifact/persistence";
import { verifyArtifactIntegrity } from "@/research/artifact/integrity";
import { replayFromArtifact } from "@/research/artifact/replayArtifact";
import {
  buildMasteryTrajectoryRows,
  buildMisconceptionEvidenceRows,
  buildQuestionResponseRows,
  buildRunSummaryRow,
  buildSelectionDecisionRows,
} from "@/research/artifact/export/datasets";
import { toCsv, toJsonl } from "@/research/artifact/export/csv";
import { RISE_CONCEPTS, RISE_QUESTIONS } from "@/domain/rise";
import type { ExperimentScenario } from "@/research/experiment/types";
import { concept, manyQuestions } from "./fixtures";

let tempDir: string;

beforeEach(() => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "artifact-e2e-test-"));
});

afterEach(() => {
  fs.rmSync(tempDir, { recursive: true, force: true });
});

describe("End-to-end research pipeline demonstration (Phase 6, section 13)", () => {
  it(
    "initializes a real C2 condition, runs it, persists, loads, verifies, exports every dataset, and replays it — " +
      "all against REAL engine logic, no fabricated or hand-constructed 'completed' session",
    () => {
      // 1. Initialize a valid Phase 5 experimental condition.
      const config = EXPERIMENT_CONDITIONS.C2.build();
      const concepts = [concept("c1", [])];
      const questions = manyQuestions("c1", 10);
      const scenario: ExperimentScenario = {
        scenarioId: "e2e-scenario",
        learnerId: "e2e-learner",
        availableQuestions: questions,
        concepts,
        curriculumOrder: ["c1"],
        maxQuestions: 5,
        startTimestamp: "2026-10-30T00:00:00.000Z",
      };

      // 2. Run a deterministic session using EXTERNALLY supplied response
      // evidence — a fixed correctness pattern played back round by round
      // through the real engine, not a manually assembled "pretend" result.
      const pattern = [true, false, true, true, false];
      let i = 0;
      const finalState = runExperimentToCompletion(config, scenario, "e2e-run", (s, q) => {
        const correct = pattern[i % pattern.length];
        const timestamp = `2026-10-30T00:0${i}:00.000Z`;
        i++;
        return { selectedOptionId: correct ? q.correctOptionId : q.options.find((o) => !o.isCorrect)!.id, timestamp };
      });
      expect(finalState.status).toBe("terminated");
      expect(finalState.responses.length).toBeGreaterThan(0);

      // 3. Confirm actual mastery and selection traces were recorded (not
      // reconstructed after the fact).
      expect(finalState.estimatorTraces.length).toBeGreaterThan(0);
      expect(finalState.selectionTraces.length).toBeGreaterThan(0);

      // 4. Construct a canonical run artifact.
      const artifact = buildExperimentRunArtifact(config, scenario, finalState, { track: "B" });
      expect(artifact.contentDigest).toMatch(/^[0-9a-f]{64}$/);

      // 5. Persist the artifact.
      const savedPath = saveExperimentRunArtifact(artifact, { dir: tempDir });
      expect(fs.existsSync(savedPath)).toBe(true);

      // 6. Load it from disk.
      const loaded = loadExperimentRunArtifact("e2e-run", tempDir);
      expect(loaded).toEqual(artifact);

      // 7. Verify its integrity.
      const integrity = verifyArtifactIntegrity(loaded, { currentQuestions: questions, currentConcepts: concepts, currentCurriculumOrder: ["c1"] });
      expect(integrity.contentDigestValid).toBe(true);
      expect(integrity.questionBankMatchesCurrent).toBe(true);
      expect(integrity.curriculumMatchesCurrent).toBe(true);
      expect(integrity.issues).toEqual([]);

      // 8. Export its observations, mastery trajectories, and selection
      // records (plus run summary and misconception evidence, for
      // completeness).
      const questionsById = new Map(questions.map((q) => [q.id, q]));
      const runSummary = buildRunSummaryRow(loaded);
      const responseRows = buildQuestionResponseRows(loaded, questionsById);
      const masteryRows = buildMasteryTrajectoryRows(loaded);
      const selectionRows = buildSelectionDecisionRows(loaded);
      const misconceptionRows = buildMisconceptionEvidenceRows(loaded);

      expect(runSummary.questionCount).toBe(finalState.responses.length);
      expect(responseRows).toHaveLength(finalState.responses.length);
      expect(masteryRows.length).toBeGreaterThan(0);
      expect(selectionRows.length).toBeGreaterThan(0);

      // CSV and JSONL both actually serialize without error.
      expect(() => toCsv(responseRows, ["runId", "questionId", "isCorrect"])).not.toThrow();
      expect(() => toJsonl(masteryRows)).not.toThrow();
      const csv = toCsv(responseRows, ["runId", "questionId", "isCorrect"]);
      expect(csv.split("\r\n")[0]).toBe("runId,questionId,isCorrect");

      // 9. Replay the session (reusing Phase 5's replay, not duplicating it).
      const verification = replayFromArtifact(loaded, scenario);
      expect(verification.kind).toBe("computational_replay");

      // 10. Confirm the reconstructed computations match the stored evidence.
      if (verification.kind === "computational_replay") {
        expect(verification.replay.matches).toBe(true);
        expect(verification.replay.firstDivergence).toBeNull();
        expect(verification.replay.replayedState.estimatorStates).toEqual(finalState.estimatorStates);
        expect(verification.replay.replayedState.presentedQuestionIds).toEqual(finalState.presentedQuestionIds);
      }

      // Misconception evidence rows, if any, are never marked as a
      // confirmed diagnosis (CLAUDE.md principle 7).
      expect(misconceptionRows.every((r) => r.isConfirmedDiagnosis === false)).toBe(true);
    },
  );

  it("this demonstration is illustrative only — it uses a FIXED response pattern, not a validated simulated learner; it establishes the pipeline mechanism, not a scientific finding", () => {
    // This test exists to make that distinction explicit and checkable:
    // nothing in the artifact/export/replay layer computes or claims a
    // "learning gain" or "mastery accuracy" figure from this kind of run.
    const config = EXPERIMENT_CONDITIONS.C1.build();
    const concepts = [concept("c1", [])];
    const questions = manyQuestions("c1", 5);
    const scenario: ExperimentScenario = {
      learnerId: "l1",
      availableQuestions: questions,
      concepts,
      curriculumOrder: ["c1"],
      maxQuestions: 3,
      startTimestamp: "2026-10-30T00:00:00.000Z",
    };
    const state = runExperimentToCompletion(config, scenario, "illustrative-run", (s, q) => ({ selectedOptionId: q.correctOptionId, timestamp: "2026-10-30T00:00:00.000Z" }));
    const artifact = buildExperimentRunArtifact(config, scenario, state);
    const summary = buildRunSummaryRow(artifact);
    expect(Object.keys(summary)).not.toContain("learningGain");
    expect(Object.keys(summary)).not.toContain("masteryAccuracy");
  });

  it("the full pipeline also works against the real, integrated 1,840-question RISE bank and 109-concept curriculum", () => {
    const config = EXPERIMENT_CONDITIONS.C2.build();
    const curriculumOrder = RISE_CONCEPTS.map((c) => c.id).slice(0, 10);
    const scenario: ExperimentScenario = {
      scenarioId: "rise-e2e",
      learnerId: "rise-learner",
      availableQuestions: RISE_QUESTIONS,
      concepts: RISE_CONCEPTS,
      curriculumOrder,
      maxQuestions: 10,
      startTimestamp: "2026-10-30T00:00:00.000Z",
    };
    const state = runExperimentToCompletion(config, scenario, "rise-e2e-run", (s, q) => ({ selectedOptionId: q.correctOptionId, timestamp: "2026-10-30T00:00:00.000Z" }));
    const artifact = buildExperimentRunArtifact(config, scenario, state);

    saveExperimentRunArtifact(artifact, { dir: tempDir });
    const loaded = loadExperimentRunArtifact("rise-e2e-run", tempDir);
    const integrity = verifyArtifactIntegrity(loaded, { currentQuestions: RISE_QUESTIONS, currentConcepts: RISE_CONCEPTS, currentCurriculumOrder: curriculumOrder });
    expect(integrity.contentDigestValid).toBe(true);
    expect(integrity.questionBankMatchesCurrent).toBe(true);

    const verification = replayFromArtifact(loaded, scenario);
    expect(verification.kind).toBe("computational_replay");
    if (verification.kind === "computational_replay") {
      expect(verification.replay.matches).toBe(true);
    }
  });
});

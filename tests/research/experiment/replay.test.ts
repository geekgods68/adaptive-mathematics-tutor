import { describe, expect, it } from "vitest";
import { replayExperimentSession } from "@/research/experiment/replay";
import { advanceExperimentSession, recordExperimentResponse, startExperimentSession } from "@/research/experiment/sessionEngine";
import { EXPERIMENT_CONDITIONS } from "@/research/experiment/conditions";
import type { AnswerOption, Question } from "@/domain/questions/types";
import type { Concept } from "@/domain/concepts/types";
import type { ExperimentScenario, ExternalResponse } from "@/research/experiment/types";

const T0 = "2026-10-30T00:00:00.000Z";

function option(id: string, isCorrect: boolean): AnswerOption {
  return { id, display: id, isCorrect };
}

function question(id: string, conceptId: string, difficulty: 1 | 2 | 3 | 4 | 5 = 2): Question {
  return {
    id,
    stem: "stem",
    conceptIds: [conceptId],
    primaryConceptId: conceptId,
    difficulty,
    options: [option(`${id}-correct`, true), option(`${id}-wrong`, false)],
    correctOptionId: `${id}-correct`,
    workedSolution: "solution",
    version: 1,
  };
}

function concept(id: string, prerequisiteIds: string[] = []): Concept {
  return { id, name: id, description: id, prerequisiteIds, strand: "algebra_foundations" };
}

function manyQuestions(conceptId: string, count: number): Question[] {
  const difficulties: Array<1 | 2 | 3 | 4 | 5> = [1, 2, 3, 4, 5];
  return Array.from({ length: count }, (_, i) => question(`${conceptId}-q${i}`, conceptId, difficulties[i % 5]));
}

function responseFor(q: Question, correct: boolean, timestamp: string): ExternalResponse {
  return { selectedOptionId: correct ? q.correctOptionId : q.options.find((o) => !o.isCorrect)!.id, timestamp };
}

function runOriginal(config: ReturnType<(typeof EXPERIMENT_CONDITIONS)["C2"]["build"]>, scenario: ExperimentScenario, runId: string) {
  let state = startExperimentSession(config, scenario, runId);
  const responses: ExternalResponse[] = [];
  const pattern = [true, false, true, true, false];
  for (let i = 0; i < pattern.length; i++) {
    if (state.status !== "active" || !state.currentQuestionId) break;
    const presented = scenario.availableQuestions.find((q) => q.id === state.currentQuestionId)!;
    const response = responseFor(presented, pattern[i], `2026-10-30T00:0${i}:00.000Z`);
    responses.push(response);
    state = recordExperimentResponse(config, scenario, state, response);
    state = advanceExperimentSession(config, scenario, state);
  }
  return { finalState: state, responses };
}

describe("replayExperimentSession", () => {
  const concepts = [concept("c1", [])];
  const questions = manyQuestions("c1", 8);
  const scenario: ExperimentScenario = {
    learnerId: "l1",
    availableQuestions: questions,
    concepts,
    curriculumOrder: ["c1"],
    maxQuestions: 5,
    startTimestamp: T0,
  };

  it("reproduces an identical final state when given the same response sequence", () => {
    const config = EXPERIMENT_CONDITIONS.C2.build();
    const { finalState, responses } = runOriginal(config, scenario, "run-original");
    const replay = replayExperimentSession(config, scenario, finalState, responses);
    expect(replay.matches).toBe(true);
    expect(replay.firstDivergence).toBeNull();
    expect(replay.replayedState).toEqual(finalState);
  });

  it("reproduces the exact question selection sequence", () => {
    const config = EXPERIMENT_CONDITIONS.C2.build();
    const { finalState, responses } = runOriginal(config, scenario, "run-original");
    const replay = replayExperimentSession(config, scenario, finalState, responses);
    expect(replay.replayedState.presentedQuestionIds).toEqual(finalState.presentedQuestionIds);
  });

  it("reproduces the exact mastery estimates and decision traces", () => {
    const config = EXPERIMENT_CONDITIONS.C1.build();
    const { finalState, responses } = runOriginal(config, scenario, "run-original");
    const replay = replayExperimentSession(config, scenario, finalState, responses);
    expect(replay.replayedState.estimatorStates).toEqual(finalState.estimatorStates);
    expect(replay.replayedState.estimatorTraces).toEqual(finalState.estimatorTraces);
    expect(replay.replayedState.selectionTraces).toEqual(finalState.selectionTraces);
  });

  it("reproduces the exact termination state", () => {
    const config = EXPERIMENT_CONDITIONS.C0.build();
    const singleQuestionScenario: ExperimentScenario = {
      learnerId: "l1",
      availableQuestions: [question("q1", "c1")],
      concepts: [],
      curriculumOrder: [],
      predeterminedSequence: ["q1"],
      maxQuestions: 1,
      startTimestamp: T0,
    };
    const { finalState, responses } = runOriginal(config, singleQuestionScenario, "run-original");
    const replay = replayExperimentSession(config, singleQuestionScenario, finalState, responses);
    expect(replay.replayedState.status).toBe(finalState.status);
    expect(replay.replayedState.terminationReason).toBe(finalState.terminationReason);
    expect(replay.matches).toBe(true);
  });

  it("detects a divergence and identifies its first location when the response sequence differs", () => {
    const config = EXPERIMENT_CONDITIONS.C2.build();
    const { finalState, responses } = runOriginal(config, scenario, "run-original");
    const alteredResponses = [...responses];
    // Flip the correctness of the LAST response only — flipping an
    // earlier one would cascade into a genuinely different subsequent
    // question selection, making the rest of the original (now stale)
    // response list invalid against a question it was never written
    // for. Flipping the final response isolates exactly one divergence.
    const lastIndex = alteredResponses.length - 1;
    const lastQuestionId = finalState.presentedQuestionIds[lastIndex];
    const lastQuestion = questions.find((q) => q.id === lastQuestionId)!;
    alteredResponses[lastIndex] = responseFor(lastQuestion, !finalState.responses[lastIndex].isCorrect, alteredResponses[lastIndex].timestamp);

    const replay = replayExperimentSession(config, scenario, finalState, alteredResponses);
    expect(replay.matches).toBe(false);
    expect(replay.firstDivergence).not.toBeNull();
    expect(replay.firstDivergence!.field).toBeTruthy();
  });

  it("does not mutate or overwrite the original state object", () => {
    const config = EXPERIMENT_CONDITIONS.C2.build();
    const { finalState, responses } = runOriginal(config, scenario, "run-original");
    const snapshot = JSON.parse(JSON.stringify(finalState));
    replayExperimentSession(config, scenario, finalState, responses);
    expect(finalState).toEqual(snapshot);
  });

  it("a replay under an explicitly different runId is correctly detected as diverging only in the id-derived fields", () => {
    const config = EXPERIMENT_CONDITIONS.C0.build();
    const singleQuestionScenario: ExperimentScenario = {
      learnerId: "l1",
      availableQuestions: [question("q1", "c1")],
      concepts: [],
      curriculumOrder: [],
      predeterminedSequence: ["q1"],
      maxQuestions: 1,
      startTimestamp: T0,
    };
    const { finalState, responses } = runOriginal(config, singleQuestionScenario, "run-original");
    const replay = replayExperimentSession(config, singleQuestionScenario, finalState, responses, "a-deliberately-different-run-id");
    // Non-adaptive traces/results never embed the run id (QuestionSelectionResult has no sessionId field),
    // so for this condition even a relabeled replay still matches exactly.
    expect(replay.matches).toBe(true);
  });
});

import { EXPERIMENT_CONDITIONS } from "@/research/experiment/conditions";
import { runExperimentToCompletion } from "@/research/experiment/sessionEngine";
import { buildExperimentRunArtifact } from "@/research/artifact/buildArtifact";
import type { ExperimentRunArtifact } from "@/research/artifact/types";
import type { AnswerOption, Question } from "@/domain/questions/types";
import type { Concept } from "@/domain/concepts/types";
import type { ExperimentScenario } from "@/research/experiment/types";

export const T0 = "2026-10-30T00:00:00.000Z";

export function option(id: string, isCorrect: boolean, misconceptionId?: string): AnswerOption {
  return { id, display: id, isCorrect, misconceptionId, derivationNote: misconceptionId ? "note" : undefined };
}

export function question(id: string, conceptIds: string[], difficulty: 1 | 2 | 3 | 4 | 5 = 2, questionFamily?: string): Question {
  return {
    id,
    stem: "stem",
    conceptIds,
    primaryConceptId: conceptIds[0],
    difficulty,
    options: [option(`${id}-correct`, true), option(`${id}-wrong`, false, "M001")],
    correctOptionId: `${id}-correct`,
    workedSolution: "solution",
    version: 1,
    questionFamily,
  };
}

export function concept(id: string, prerequisiteIds: string[] = []): Concept {
  return { id, name: id, description: id, prerequisiteIds, strand: "algebra_foundations" };
}

export function manyQuestions(conceptId: string, count: number): Question[] {
  const difficulties: Array<1 | 2 | 3 | 4 | 5> = [1, 2, 3, 4, 5];
  return Array.from({ length: count }, (_, i) => question(`${conceptId}-q${i}`, [conceptId], difficulties[i % 5]));
}

/** Runs a real, complete C1 (deterministic Variant A + adaptive) session against a small synthetic bank, then builds its artifact — the ONE real, end-to-end-executed fixture every artifact-layer test builds on. Never a hand-constructed "pretend" result. */
export function buildSampleArtifact(options: { runId?: string; scenarioId?: string; maxQuestions?: number } = {}): {
  artifact: ExperimentRunArtifact;
  scenario: ExperimentScenario;
  questions: Question[];
} {
  const config = EXPERIMENT_CONDITIONS.C1.build();
  const concepts = [concept("c1", [])];
  const questions = manyQuestions("c1", 10);
  const scenario: ExperimentScenario = {
    scenarioId: options.scenarioId ?? "scenario-fixture",
    learnerId: "learner-fixture",
    availableQuestions: questions,
    concepts,
    curriculumOrder: ["c1"],
    maxQuestions: options.maxQuestions ?? 4,
    startTimestamp: T0,
  };
  const pattern = [true, false, true, true];
  let i = 0;
  const state = runExperimentToCompletion(config, scenario, options.runId ?? "sample-run", (s, q) => {
    const correct = pattern[i % pattern.length];
    const timestamp = `2026-10-30T00:0${i}:00.000Z`;
    i++;
    return { selectedOptionId: correct ? q.correctOptionId : q.options.find((o) => !o.isCorrect)!.id, timestamp };
  });
  const artifact = buildExperimentRunArtifact(config, scenario, state, { createdAt: T0 });
  return { artifact, scenario, questions };
}

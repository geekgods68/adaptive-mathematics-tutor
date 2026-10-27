import { describe, expect, it } from "vitest";
import { createAdaptiveSelectionAdapter, createNonAdaptiveSelectionAdapter } from "@/research/experiment/selectionAdapter";
import { DEFAULT_ADAPTIVE_SELECTION_CONFIG, PREREQUISITE_UNAWARE_ADAPTIVE_SELECTION_CONFIG } from "@/tutoring/selection/adaptive/config";
import { createInitialConceptState } from "@/domain/learner-model/initialize";
import type { AnswerOption, Question } from "@/domain/questions/types";
import type { Concept } from "@/domain/concepts/types";
import type { SelectionAdapterInput } from "@/research/experiment/types";

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

function baseInput(overrides: Partial<SelectionAdapterInput> = {}): SelectionAdapterInput {
  return {
    learnerId: "l1",
    sessionId: "s1",
    sequenceIndex: 0,
    availableQuestions: [],
    concepts: [],
    curriculumOrder: [],
    conceptMasteryStates: {},
    misconceptionTallies: {},
    presentedQuestionIds: [],
    ...overrides,
  };
}

describe("createNonAdaptiveSelectionAdapter", () => {
  it("selects by fixed sequence position, ignoring any mastery state present", () => {
    const adapter = createNonAdaptiveSelectionAdapter();
    const input = baseInput({ predeterminedSequence: ["qa", "qb", "qc"], sequenceIndex: 1, conceptMasteryStates: { c1: { mastery: 0.99 } } });
    expect(adapter.selectNext(input).result.questionId).toBe("qb");
  });

  it("returns null once the sequence is exhausted", () => {
    const adapter = createNonAdaptiveSelectionAdapter();
    const input = baseInput({ predeterminedSequence: ["qa"], sequenceIndex: 5 });
    expect(adapter.selectNext(input).result.questionId).toBeNull();
  });

  it("throws if no predeterminedSequence is supplied (a configuration error, caught by validation before this would normally run)", () => {
    const adapter = createNonAdaptiveSelectionAdapter();
    expect(() => adapter.selectNext(baseInput())).toThrow();
  });

  it("identifies itself as non_adaptive with no trace exposed (the non-adaptive policy produces only a rationale, not a structured trace)", () => {
    const adapter = createNonAdaptiveSelectionAdapter();
    expect(adapter.policyType).toBe("non_adaptive");
    const { trace } = adapter.selectNext(baseInput({ predeterminedSequence: ["qa"] }));
    expect(trace).toBeUndefined();
  });

  it("selecting at the SAME position twice is identical regardless of what mastery/misconception data is passed (structural independence from performance data)", () => {
    const adapter = createNonAdaptiveSelectionAdapter();
    const withMastery = adapter.selectNext(
      baseInput({ predeterminedSequence: ["qa", "qb"], sequenceIndex: 0, conceptMasteryStates: { c1: { mastery: 0.01 } } }),
    );
    const withoutMastery = adapter.selectNext(baseInput({ predeterminedSequence: ["qa", "qb"], sequenceIndex: 0, conceptMasteryStates: {} }));
    expect(withMastery.result).toEqual(withoutMastery.result);
  });
});

describe("createAdaptiveSelectionAdapter", () => {
  const concepts = [concept("c1", [])];
  const curriculumOrder = ["c1"];
  const questions = [question("q1", "c1", 2)];

  it("selects a question and exposes a full structured trace", () => {
    const adapter = createAdaptiveSelectionAdapter(DEFAULT_ADAPTIVE_SELECTION_CONFIG);
    const { result, trace } = adapter.selectNext(baseInput({ availableQuestions: questions, concepts, curriculumOrder }));
    expect(result.questionId).toBe("q1");
    expect(trace).toBeDefined();
    expect((trace as { selectedQuestionId: string }).selectedQuestionId).toBe("q1");
  });

  it("identifies itself as adaptive, with version matching the supplied config", () => {
    const adapter = createAdaptiveSelectionAdapter(DEFAULT_ADAPTIVE_SELECTION_CONFIG);
    expect(adapter.policyType).toBe("adaptive");
    expect(adapter.version).toBe(DEFAULT_ADAPTIVE_SELECTION_CONFIG.version);
  });

  it("the prerequisite-unaware config produces a distinctly-versioned adapter that never backtracks", () => {
    const topConcepts = [concept("top", ["mid"]), concept("mid", [])];
    const states = {
      top: { ...createInitialConceptState("l1", "top", T0), mastery: 0.3, numObservations: 5, consecutiveIncorrect: 3 },
      mid: { ...createInitialConceptState("l1", "mid", T0), mastery: 0.1, numObservations: 1 },
    };
    const aware = createAdaptiveSelectionAdapter(DEFAULT_ADAPTIVE_SELECTION_CONFIG);
    const unaware = createAdaptiveSelectionAdapter(PREREQUISITE_UNAWARE_ADAPTIVE_SELECTION_CONFIG);
    const input = baseInput({
      availableQuestions: [question("top-q", "top", 2), question("mid-q", "mid", 2)],
      concepts: topConcepts,
      curriculumOrder: ["top"],
      conceptMasteryStates: states,
    });

    expect(aware.version).not.toBe(unaware.version);
    const awareTrace = aware.selectNext(input).trace as { targetConcept: { reason: string } };
    const unawareTrace = unaware.selectNext(input).trace as { targetConcept: { reason: string } };
    expect(awareTrace.targetConcept.reason).toBe("prerequisite_backtrack");
    expect(unawareTrace.targetConcept.reason).toBe("remediation");
  });

  it("is deterministic for identical input", () => {
    const adapter = createAdaptiveSelectionAdapter(DEFAULT_ADAPTIVE_SELECTION_CONFIG);
    const input = baseInput({ availableQuestions: questions, concepts, curriculumOrder });
    expect(adapter.selectNext(input)).toEqual(adapter.selectNext(input));
  });
});

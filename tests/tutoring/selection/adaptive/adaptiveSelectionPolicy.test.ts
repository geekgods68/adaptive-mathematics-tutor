import { describe, expect, it } from "vitest";
import { AdaptiveSelectionPolicy, selectAdaptiveQuestion } from "@/tutoring/selection/adaptive/adaptiveSelectionPolicy";
import { DEFAULT_ADAPTIVE_SELECTION_CONFIG } from "@/tutoring/selection/adaptive/config";
import { applyResponseEvidence } from "@/domain/learner-model/updateMastery";
import { DEFAULT_MODEL_PARAMETERS_V2_INVERSE_DIFFICULTY } from "@/domain/learner-model/parameters";
import { accumulateMisconceptionEvidence } from "@/domain/learner-model/misconceptionEvidence";
import type { ConceptMasteryState, ResponseEvidence } from "@/domain/learner-model/types";
import type { MisconceptionEvidenceTally } from "@/domain/learner-model/misconceptionEvidence";
import type { AdaptiveSelectionContext } from "@/tutoring/selection/adaptive/types";
import type { AnswerOption, Question } from "@/domain/questions/types";
import type { Concept } from "@/domain/concepts/types";
import { NonAdaptiveSelectionPolicy } from "@/tutoring/selection/nonAdaptive/nonAdaptiveSelectionPolicy";
import { RISE_QUESTIONS, RISE_CONCEPTS } from "@/domain/rise";

const T0 = "2026-10-30T00:00:00.000Z";
const config = DEFAULT_ADAPTIVE_SELECTION_CONFIG;

function option(id: string, isCorrect: boolean, misconceptionId?: string): AnswerOption {
  return { id, display: id, isCorrect, misconceptionId, derivationNote: misconceptionId ? `derivation for ${id}` : undefined };
}

function question(overrides: Partial<Question> & { id: string }): Question {
  return {
    stem: "stem",
    conceptIds: ["leaf"],
    primaryConceptId: "leaf",
    difficulty: 2,
    options: [option(`${overrides.id}-correct`, true), option(`${overrides.id}-wrong`, false)],
    correctOptionId: `${overrides.id}-correct`,
    workedSolution: "solution",
    version: 1,
    ...overrides,
  };
}

function concept(id: string, prerequisiteIds: string[] = []): Concept {
  return { id, name: id, description: id, prerequisiteIds, strand: "algebra_foundations" };
}

function emptyContext(overrides: Partial<AdaptiveSelectionContext> = {}): AdaptiveSelectionContext {
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

describe("AdaptiveSelectionPolicy — worked multi-round adaptive session", () => {
  const concepts = [concept("leaf", []), concept("mid", ["leaf"])];
  const curriculumOrder = ["leaf", "mid"];
  const questions: Question[] = [
    question({ id: "leaf-d1-a", conceptIds: ["leaf"], primaryConceptId: "leaf", difficulty: 1 }),
    question({ id: "leaf-d2-a", conceptIds: ["leaf"], primaryConceptId: "leaf", difficulty: 2 }),
    question({ id: "leaf-d2-b", conceptIds: ["leaf"], primaryConceptId: "leaf", difficulty: 2 }),
    question({ id: "leaf-d3-a", conceptIds: ["leaf"], primaryConceptId: "leaf", difficulty: 3 }),
    question({ id: "mid-d2-a", conceptIds: ["mid"], primaryConceptId: "mid", difficulty: 2 }),
  ];

  it("runs a full round-trip: select -> respond -> update mastery -> select again, deterministically, across several rounds", () => {
    const policy = new AdaptiveSelectionPolicy();
    let conceptMasteryStates: Record<string, ConceptMasteryState> = {};
    const misconceptionTallies: Record<string, MisconceptionEvidenceTally> = {};
    const presentedQuestionIds: string[] = [];
    const selections: Array<{ questionId: string | null; targetConcept: string | null; reason: string }> = [];

    // Three consecutive correct responses at "leaf" should eventually move
    // evidence past minEvidenceCount and raise mastery.
    for (let round = 0; round < 3; round++) {
      const context: AdaptiveSelectionContext = {
        learnerId: "l1",
        sessionId: "s1",
        sequenceIndex: round,
        availableQuestions: questions,
        concepts,
        curriculumOrder,
        conceptMasteryStates,
        misconceptionTallies,
        presentedQuestionIds: [...presentedQuestionIds],
      };
      const { trace } = policy.selectNextQuestionWithTrace(context);
      expect(trace.selectedQuestionId).not.toBeNull();
      selections.push({ questionId: trace.selectedQuestionId, targetConcept: trace.targetConcept.conceptId, reason: trace.targetConcept.reason });
      presentedQuestionIds.push(trace.selectedQuestionId!);

      const presentedQuestion = questions.find((q) => q.id === trace.selectedQuestionId)!;
      const evidence: ResponseEvidence = {
        questionId: presentedQuestion.id,
        conceptWeights: { [presentedQuestion.primaryConceptId]: 1 },
        difficulty: presentedQuestion.difficulty,
        correct: true,
        selectedOptionId: presentedQuestion.correctOptionId,
        usedHint: false,
        sequenceIndex: round,
        timestamp: T0,
      };
      const applyResult = applyResponseEvidence(conceptMasteryStates, evidence, "l1", DEFAULT_MODEL_PARAMETERS_V2_INVERSE_DIFFICULTY);
      conceptMasteryStates = applyResult.updatedStates;
    }

    // Every selected question was distinct (no accidental repeats).
    expect(new Set(selections.map((s) => s.questionId)).size).toBe(3);
    // All three rounds targeted "leaf" (not enough evidence yet to progress to "mid").
    expect(selections.every((s) => s.targetConcept === "leaf")).toBe(true);
    // After 3 correct responses mastery should have risen above the cold-start 0.5.
    expect(conceptMasteryStates.leaf.mastery).toBeGreaterThan(0.5);
    expect(conceptMasteryStates.leaf.numObservations).toBe(3);
  });

  it("is fully deterministic: re-running the exact same round with the exact same prior state produces an identical trace", () => {
    const policy = new AdaptiveSelectionPolicy();
    const context = emptyContext({ availableQuestions: questions, concepts, curriculumOrder });
    const { trace: t1 } = policy.selectNextQuestionWithTrace(context);
    const { trace: t2 } = policy.selectNextQuestionWithTrace(context);
    expect(t1).toEqual(t2);
  });

  it("falls through to progression once the current concept is mastered with sufficient evidence", () => {
    const states: Record<string, ConceptMasteryState> = {
      leaf: {
        learnerId: "l1",
        conceptId: "leaf",
        mastery: 0.9,
        initialMastery: 0.5,
        numObservations: 5,
        correctCount: 5,
        incorrectCount: 0,
        consecutiveCorrect: 5,
        consecutiveIncorrect: 0,
        recentEvidence: [],
        modelVersion: "deterministic-mastery-v1",
        lastSequenceIndex: 4,
        createdAt: T0,
        lastUpdatedAt: T0,
      },
    };
    const context = emptyContext({ availableQuestions: questions, concepts, curriculumOrder, conceptMasteryStates: states });
    const policy = new AdaptiveSelectionPolicy();
    const { trace } = policy.selectNextQuestionWithTrace(context);
    expect(trace.targetConcept.conceptId).toBe("mid");
    expect(trace.selectedQuestionId).toBe("mid-d2-a");
  });
});

describe("AdaptiveSelectionPolicy — exhausted pools fall through to the next eligible concept", () => {
  const concepts = [concept("leaf", []), concept("mid", ["leaf"])];
  const curriculumOrder = ["leaf", "mid"];

  it("moves on to the next not-yet-mastered concept when the current target's pool is fully exhausted", () => {
    const leafQuestion = question({ id: "leaf-only", conceptIds: ["leaf"], primaryConceptId: "leaf", difficulty: 2 });
    const midQuestion = question({ id: "mid-only", conceptIds: ["mid"], primaryConceptId: "mid", difficulty: 2 });
    const context = emptyContext({
      availableQuestions: [leafQuestion, midQuestion],
      concepts,
      curriculumOrder,
      presentedQuestionIds: ["leaf-only"], // leaf's only question is already used up
    });
    const policy = new AdaptiveSelectionPolicy();
    const { trace } = policy.selectNextQuestionWithTrace(context);
    expect(trace.selectedQuestionId).toBe("mid-only");
    expect(trace.fallbackUsed).toBe("next_eligible_concept");
  });

  it("returns null with an explanatory trace when the ENTIRE bank is exhausted", () => {
    const leafQuestion = question({ id: "leaf-only", conceptIds: ["leaf"], primaryConceptId: "leaf", difficulty: 2 });
    const context = emptyContext({
      availableQuestions: [leafQuestion],
      concepts,
      curriculumOrder,
      presentedQuestionIds: ["leaf-only"],
    });
    const policy = new AdaptiveSelectionPolicy();
    const { trace } = policy.selectNextQuestionWithTrace(context);
    expect(trace.selectedQuestionId).toBeNull();
    expect(trace.fallbackUsed).toBe("exhausted");
    expect(trace.explanation.length).toBeGreaterThan(0);
  });
});

describe("AdaptiveSelectionPolicy — missing or invalid metadata", () => {
  it("handles a concept id referenced by curriculumOrder but absent from concepts[] without throwing", () => {
    const context = emptyContext({ curriculumOrder: ["ghost-concept"], availableQuestions: [] });
    const policy = new AdaptiveSelectionPolicy();
    expect(() => policy.selectNextQuestion(context)).not.toThrow();
  });

  it("handles a question with an empty conceptIds array (never selectable, never crashes)", () => {
    const orphan = question({ id: "orphan", conceptIds: [], primaryConceptId: "leaf" });
    const context = emptyContext({ curriculumOrder: ["leaf"], concepts: [concept("leaf")], availableQuestions: [orphan] });
    const policy = new AdaptiveSelectionPolicy();
    const result = policy.selectNextQuestion(context);
    expect(result.questionId).toBeNull();
  });
});

describe("AdaptiveSelectionPolicy — decision-trace reconstruction", () => {
  it("the trace fully explains a selection without needing to re-run the computation", () => {
    const concepts = [concept("leaf", [])];
    const questions = [question({ id: "q1", conceptIds: ["leaf"], primaryConceptId: "leaf", difficulty: 2 })];
    const context = emptyContext({ availableQuestions: questions, concepts, curriculumOrder: ["leaf"] });
    const trace = selectAdaptiveQuestion(context, config);

    expect(trace.selectedQuestionId).toBe("q1");
    expect(trace.targetConcept.conceptId).toBe("leaf");
    expect(trace.targetDifficulty.difficulty).toBe(config.diagnosticDifficultyForLowEvidence);
    expect(trace.candidateFilter.afterConceptFilter).toBe(1);
    expect(trace.explanation).toContain("leaf");
    expect(trace.explanation).toContain("q1");
    expect(trace.policyVersion).toBeTruthy();
    expect(trace.configVersion).toBe(config.version);
  });

  it("carries forward whatever misconception evidence was considered for the target concept", () => {
    const concepts = [concept("leaf", [])];
    const questions = [question({ id: "q1", conceptIds: ["leaf"], primaryConceptId: "leaf", difficulty: 2 })];
    const tally = accumulateMisconceptionEvidence(
      {},
      { questionId: "prior", conceptId: "leaf", selectedOptionId: "x", misconceptionId: "M001", difficulty: 2, sequenceIndex: 0, timestamp: T0 },
    );
    const context = emptyContext({
      availableQuestions: questions,
      concepts,
      curriculumOrder: ["leaf"],
      misconceptionTallies: { leaf: tally },
    });
    const trace = selectAdaptiveQuestion(context, config);
    expect(trace.misconceptionEvidenceConsidered).toEqual({ M001: 1 });
  });
});

describe("AdaptiveSelectionPolicy — diagnostic-probe orchestration", () => {
  const concepts = [concept("top", ["mid"]), concept("mid", [])];
  const curriculumOrder = ["top"];

  function topState(overrides: Partial<ConceptMasteryState> = {}): ConceptMasteryState {
    return {
      learnerId: "l1",
      conceptId: "top",
      mastery: 0.5,
      initialMastery: 0.5,
      numObservations: 5,
      correctCount: 1,
      incorrectCount: 4,
      consecutiveCorrect: 0,
      consecutiveIncorrect: 4,
      recentEvidence: [],
      modelVersion: "deterministic-mastery-v1",
      lastSequenceIndex: 19,
      createdAt: T0,
      lastUpdatedAt: T0,
      ...overrides,
    };
  }

  it("selects a question for a previously-mastered, stale prerequisite when sustained difficulty triggers a diagnostic probe", () => {
    const midQuestion = question({ id: "mid-q", conceptIds: ["mid"], primaryConceptId: "mid", difficulty: 2 });
    const topQuestion = question({ id: "top-q", conceptIds: ["top"], primaryConceptId: "top", difficulty: 2 });
    const states = {
      top: topState(),
      mid: { ...topState({}), conceptId: "mid", mastery: 0.9, numObservations: 5, consecutiveIncorrect: 0, lastSequenceIndex: 0 },
    };
    const context = emptyContext({
      availableQuestions: [midQuestion, topQuestion],
      concepts,
      curriculumOrder,
      conceptMasteryStates: states,
      sequenceIndex: 20,
    });
    const policy = new AdaptiveSelectionPolicy();
    const { trace } = policy.selectNextQuestionWithTrace(context);
    expect(trace.selectedQuestionId).toBe("mid-q");
    expect(trace.targetConcept.reason).toBe("diagnostic_probe");
    expect(trace.explanation).toContain("DIAGNOSTIC PROBE");
  });

  it("falls through to the next eligible concept when the diagnostic target's own question pool is exhausted", () => {
    const midQuestion = question({ id: "mid-q", conceptIds: ["mid"], primaryConceptId: "mid", difficulty: 2 });
    const topQuestion = question({ id: "top-q", conceptIds: ["top"], primaryConceptId: "top", difficulty: 2 });
    const states = {
      top: topState(),
      mid: { ...topState({}), conceptId: "mid", mastery: 0.9, numObservations: 5, consecutiveIncorrect: 0, lastSequenceIndex: 0 },
    };
    const context = emptyContext({
      availableQuestions: [midQuestion, topQuestion],
      concepts,
      curriculumOrder,
      conceptMasteryStates: states,
      sequenceIndex: 20,
      presentedQuestionIds: ["mid-q"], // the diagnostic target's only question is already used
    });
    const policy = new AdaptiveSelectionPolicy();
    const { trace } = policy.selectNextQuestionWithTrace(context);
    expect(trace.targetConcept.reason).toBe("diagnostic_probe"); // the DECISION still targets "mid"...
    expect(trace.selectedQuestionId).toBe("top-q"); // ...but the orchestration falls through to "top" since "mid" has nothing left
    expect(trace.fallbackUsed).toBe("next_eligible_concept");
  });
});

describe("AdaptiveSelectionPolicy — non-adaptive baseline is unaffected", () => {
  it("NonAdaptiveSelectionPolicy still selects purely by fixed sequence position, with the adaptive module loaded alongside it", () => {
    const nonAdaptive = new NonAdaptiveSelectionPolicy();
    const result = nonAdaptive.selectNextQuestion({
      participantId: "p1",
      predeterminedSequence: ["qa", "qb", "qc"],
      positionIndex: 1,
    });
    expect(result.questionId).toBe("qb");
  });
});

describe("AdaptiveSelectionPolicy — compatibility with the full 14-chapter RISE question bank", () => {
  it("selects a valid first question against the real 1,840-question bank and 109-concept graph without throwing", () => {
    const curriculumOrder = RISE_CONCEPTS.map((c) => c.id).slice(0, 20);
    const context = emptyContext({
      availableQuestions: RISE_QUESTIONS,
      concepts: RISE_CONCEPTS,
      curriculumOrder,
    });
    const policy = new AdaptiveSelectionPolicy();
    const { trace } = policy.selectNextQuestionWithTrace(context);
    expect(trace.selectedQuestionId).not.toBeNull();
    const selected = RISE_QUESTIONS.find((q) => q.id === trace.selectedQuestionId);
    expect(selected).toBeDefined();
    expect(selected!.conceptIds).toContain(trace.targetConcept.conceptId);
  });

  it("running 25 rounds against the real bank never repeats a question and always terminates", () => {
    const curriculumOrder = RISE_CONCEPTS.map((c) => c.id).slice(0, 10);
    const policy = new AdaptiveSelectionPolicy();
    let conceptMasteryStates: Record<string, ConceptMasteryState> = {};
    const presentedQuestionIds: string[] = [];

    for (let round = 0; round < 25; round++) {
      const context: AdaptiveSelectionContext = {
        learnerId: "l1",
        sessionId: "s1",
        sequenceIndex: round,
        availableQuestions: RISE_QUESTIONS,
        concepts: RISE_CONCEPTS,
        curriculumOrder,
        conceptMasteryStates,
        misconceptionTallies: {},
        presentedQuestionIds: [...presentedQuestionIds],
      };
      const { trace } = policy.selectNextQuestionWithTrace(context);
      if (trace.selectedQuestionId === null) break;
      presentedQuestionIds.push(trace.selectedQuestionId);
      const presentedQuestion = RISE_QUESTIONS.find((q) => q.id === trace.selectedQuestionId)!;
      const correct = round % 3 !== 0; // deterministic mixed correctness pattern
      const evidence: ResponseEvidence = {
        questionId: presentedQuestion.id,
        conceptWeights: presentedQuestion.conceptWeights ?? { [presentedQuestion.primaryConceptId]: 1 },
        difficulty: presentedQuestion.difficulty,
        correct,
        selectedOptionId: correct ? presentedQuestion.correctOptionId : presentedQuestion.options.find((o) => !o.isCorrect)!.id,
        usedHint: false,
        sequenceIndex: round,
        timestamp: T0,
      };
      const applyResult = applyResponseEvidence(conceptMasteryStates, evidence, "l1", DEFAULT_MODEL_PARAMETERS_V2_INVERSE_DIFFICULTY);
      conceptMasteryStates = applyResult.updatedStates;
    }

    expect(new Set(presentedQuestionIds).size).toBe(presentedQuestionIds.length);
    expect(presentedQuestionIds.length).toBeGreaterThan(0);
  });
});

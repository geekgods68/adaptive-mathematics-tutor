import { describe, expect, it } from "vitest";
import { selectCandidateQuestion } from "@/tutoring/selection/adaptive/candidateSelection";
import { DEFAULT_ADAPTIVE_SELECTION_CONFIG } from "@/tutoring/selection/adaptive/config";
import type { AdaptiveSelectionContext } from "@/tutoring/selection/adaptive/types";
import type { AnswerOption, DifficultyLevel, Question } from "@/domain/questions/types";

const config = DEFAULT_ADAPTIVE_SELECTION_CONFIG;

function option(id: string, isCorrect: boolean, misconceptionId?: string): AnswerOption {
  return { id, display: id, isCorrect, misconceptionId, derivationNote: misconceptionId ? `derivation for ${id}` : undefined };
}

function question(overrides: Partial<Question> & { id: string }): Question {
  return {
    stem: "stem",
    conceptIds: ["c1"],
    primaryConceptId: "c1",
    difficulty: 3,
    options: [option(`${overrides.id}-correct`, true), option(`${overrides.id}-wrong`, false)],
    correctOptionId: `${overrides.id}-correct`,
    workedSolution: "solution",
    version: 1,
    ...overrides,
  };
}

function baseContext(overrides: Partial<AdaptiveSelectionContext> = {}): AdaptiveSelectionContext {
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

describe("selectCandidateQuestion — deterministic filtering and ranking", () => {
  it("selects the only matching, unseen, correct-difficulty question", () => {
    const q = question({ id: "q1", difficulty: 3 });
    const context = baseContext({ availableQuestions: [q] });
    const result = selectCandidateQuestion("c1", 3, context, config);
    expect(result.selected?.id).toBe("q1");
    expect(result.fallbackUsed).toBe("none");
  });

  it("is deterministic and stably tie-breaks by ascending questionId when scores are equal", () => {
    const questions = [question({ id: "q3", difficulty: 3 }), question({ id: "q1", difficulty: 3 }), question({ id: "q2", difficulty: 3 })];
    const context = baseContext({ availableQuestions: questions });
    const r1 = selectCandidateQuestion("c1", 3, context, config);
    const r2 = selectCandidateQuestion("c1", 3, context, config);
    expect(r1.selected?.id).toBe("q1");
    expect(r1).toEqual(r2);
  });

  it("excludes a question whose concept does not match", () => {
    const q = question({ id: "q1", conceptIds: ["other"], primaryConceptId: "other" });
    const context = baseContext({ availableQuestions: [q] });
    const result = selectCandidateQuestion("c1", 3, context, config);
    expect(result.selected).toBeNull();
    expect(result.filterCounts.afterConceptFilter).toBe(0);
  });

  it("excludes a question already presented (exposure avoidance)", () => {
    const q = question({ id: "q1", difficulty: 3 });
    const context = baseContext({ availableQuestions: [q], presentedQuestionIds: ["q1"] });
    const result = selectCandidateQuestion("c1", 3, context, config);
    expect(result.selected).toBeNull();
    expect(result.filterCounts.afterExposureFilter).toBe(0);
    expect(result.fallbackUsed).toBe("exhausted");
  });

  it("includes a multi-concept question as a candidate for any of its concepts, including a non-primary one", () => {
    const q = question({ id: "q1", conceptIds: ["c1", "c2"], primaryConceptId: "c2", difficulty: 3 });
    const context = baseContext({ availableQuestions: [q] });
    expect(selectCandidateQuestion("c1", 3, context, config).selected?.id).toBe("q1");
    expect(selectCandidateQuestion("c2", 3, context, config).selected?.id).toBe("q1");
  });

  it("widens to the nearest available difficulty when nothing matches the exact target", () => {
    const q = question({ id: "q1", difficulty: 5 });
    const context = baseContext({ availableQuestions: [q] });
    const result = selectCandidateQuestion("c1", 3, context, config);
    expect(result.selected?.id).toBe("q1");
    expect(result.fallbackUsed).toBe("widened_difficulty");
  });

  it("when widening, prefers the closest difficulty, tie-breaking by questionId", () => {
    const questions = [
      question({ id: "far", difficulty: 5 }),
      question({ id: "near-b", difficulty: 4 }),
      question({ id: "near-a", difficulty: 2 }),
    ];
    const context = baseContext({ availableQuestions: questions });
    const result = selectCandidateQuestion("c1", 3, context, config);
    // both "near-a" (|2-3|=1) and "near-b" (|4-3|=1) are equally close; "near-a" wins alphabetically
    expect(result.selected?.id).toBe("near-a");
  });

  it("returns null with fallback 'exhausted' when the entire question pool for the concept has been presented", () => {
    const q = question({ id: "q1", difficulty: 3 });
    const context = baseContext({ availableQuestions: [q], presentedQuestionIds: ["q1"] });
    const result = selectCandidateQuestion("c1", 3, context, config);
    expect(result.selected).toBeNull();
    expect(result.fallbackUsed).toBe("exhausted");
  });

  it("deprioritises (soft-excludes) a question whose family is already at the repetition limit, but falls back to it if nothing else is available", () => {
    const seenFamily = question({ id: "seen", difficulty: 3, questionFamily: "fam-a" });
    const anotherFromFamily = question({ id: "another-fam-a", difficulty: 3, questionFamily: "fam-a" });
    const differentFamily = question({ id: "fam-b", difficulty: 3, questionFamily: "fam-b" });

    const withAlternative = baseContext({
      availableQuestions: [seenFamily, anotherFromFamily, differentFamily],
      presentedQuestionIds: ["seen"],
    });
    const result = selectCandidateQuestion("c1", 3, withAlternative, config);
    expect(result.selected?.id).toBe("fam-b"); // family limit (1) excludes fam-a's remaining question

    const withoutAlternative = baseContext({
      availableQuestions: [seenFamily, anotherFromFamily],
      presentedQuestionIds: ["seen"],
    });
    const fallbackResult = selectCandidateQuestion("c1", 3, withoutAlternative, config);
    expect(fallbackResult.selected?.id).toBe("another-fam-a"); // relaxed back since it was the only option
  });

  it("scores a candidate higher when its distractors overlap with a sufficiently-evidenced misconception", () => {
    const plain = question({ id: "plain", difficulty: 3, options: [option("plain-correct", true), option("plain-wrong", false)], correctOptionId: "plain-correct" });
    const diagnostic = question({
      id: "diagnostic",
      difficulty: 3,
      options: [option("diagnostic-correct", true), option("diagnostic-wrong", false, "M001")],
      correctOptionId: "diagnostic-correct",
    });
    const context = baseContext({
      availableQuestions: [plain, diagnostic],
      misconceptionTallies: { c1: { M001: config.misconceptionEvidenceMinCount } },
    });
    const result = selectCandidateQuestion("c1", 3, context, config);
    expect(result.selected?.id).toBe("diagnostic");
    const diagnosticScore = result.topCandidates.find((c) => c.questionId === "diagnostic");
    expect(diagnosticScore?.misconceptionOverlap).toBe(1);
  });

  it("does NOT give misconception-overlap credit when the tally is below the configured minimum (a single isolated mistake is not yet 'worth diagnosing')", () => {
    const diagnostic = question({
      id: "diagnostic",
      difficulty: 3,
      options: [option("diagnostic-correct", true), option("diagnostic-wrong", false, "M001")],
      correctOptionId: "diagnostic-correct",
    });
    const context = baseContext({
      availableQuestions: [diagnostic],
      misconceptionTallies: { c1: { M001: config.misconceptionEvidenceMinCount - 1 } },
    });
    const result = selectCandidateQuestion("c1", 3, context, config);
    expect(result.topCandidates[0]?.misconceptionOverlap).toBe(0);
  });

  it("records a full, accurate filter-count funnel for trace reconstruction", () => {
    const q1 = question({ id: "q1", conceptIds: ["c1"], difficulty: 3 });
    const q2 = question({ id: "q2", conceptIds: ["other"], difficulty: 3 });
    const context = baseContext({ availableQuestions: [q1, q2] });
    const result = selectCandidateQuestion("c1", 3, context, config);
    expect(result.filterCounts).toEqual({
      totalAvailable: 2,
      afterConceptFilter: 1,
      afterExposureFilter: 1,
      afterFamilyLimitFilter: 1,
      afterDifficultyFilter: 1,
    });
  });

  it("handles a question with an invalid/out-of-range difficulty gracefully (never crashes the filter)", () => {
    const q = question({ id: "q1", difficulty: 99 as unknown as DifficultyLevel });
    const context = baseContext({ availableQuestions: [q] });
    expect(() => selectCandidateQuestion("c1", 3, context, config)).not.toThrow();
  });
});

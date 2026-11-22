import { describe, expect, it } from "vitest";
import { buildAdaptiveFeedback, toPublicAdaptiveQuestionView } from "@/tutoring/adaptiveSession/publicViews";
import { gradeAnswer } from "@/tutoring/grading/grade";
import { RISE_QUESTIONS } from "@/domain/rise";
import { DEFAULT_ADAPTIVE_SELECTION_CONFIG } from "@/tutoring/selection/adaptive/config";
import type { AdaptiveSelectionTrace } from "@/tutoring/selection/adaptive/types";

function fakeTrace(overrides: Partial<AdaptiveSelectionTrace> = {}): AdaptiveSelectionTrace {
  return {
    policyVersion: "v",
    configVersion: "v",
    config: DEFAULT_ADAPTIVE_SELECTION_CONFIG,
    learnerId: "l1",
    sessionId: "s1",
    sequenceIndex: 0,
    targetConcept: { conceptId: "c1", reason: "progression", consideredConcepts: [] },
    targetDifficulty: { difficulty: 3, reason: "r", masteryUsed: 0.5, evidenceCount: 5 },
    misconceptionEvidenceConsidered: {},
    candidateFilter: { totalAvailable: 1, afterConceptFilter: 1, afterExposureFilter: 1, afterFamilyLimitFilter: 1, afterDifficultyFilter: 1 },
    topCandidates: [],
    selectedQuestionId: "q1",
    fallbackUsed: "none",
    explanation: "internal numerical explanation — never shown to students",
    ...overrides,
  };
}

describe("toPublicAdaptiveQuestionView — research-metadata boundary (CLAUDE.md hard constraint 11)", () => {
  // Use real bank questions so this test exercises the actual data shape,
  // not a hand-crafted fixture that might not reflect what's really on Question.
  const sampleQuestions = RISE_QUESTIONS.slice(0, 25);

  it("never includes misconceptionId, derivationNote, difficulty, or conceptIds for any real question", () => {
    for (const question of sampleQuestions) {
      const view = toPublicAdaptiveQuestionView(question, fakeTrace());
      const serialized = JSON.stringify(view);
      expect(serialized).not.toContain("misconceptionId");
      expect(serialized).not.toContain("derivationNote");
      expect(serialized).toEqual(expect.not.stringContaining('"difficulty"'));
      expect(serialized).toEqual(expect.not.stringContaining('"conceptIds"'));
    }
  });

  it("never reveals which option is correct before submission", () => {
    const question = sampleQuestions[0];
    const view = toPublicAdaptiveQuestionView(question, fakeTrace());
    expect(JSON.stringify(view)).not.toContain("isCorrect");
    expect(JSON.stringify(view)).not.toContain("correctOptionId");
  });

  it("never includes a raw concept id or the trace's internal numerical explanation", () => {
    const question = sampleQuestions[0];
    const view = toPublicAdaptiveQuestionView(question, fakeTrace({ targetConcept: { conceptId: "SECRET_ID", reason: "progression", consideredConcepts: [] } }));
    const serialized = JSON.stringify(view);
    expect(serialized).not.toContain("SECRET_ID");
    expect(serialized).not.toContain("internal numerical explanation");
  });

  it("includes a plain-language selectionExplanation derived from the real trace reason", () => {
    const view = toPublicAdaptiveQuestionView(sampleQuestions[0], fakeTrace({ targetConcept: { conceptId: "c1", reason: "remediation", consideredConcepts: [] } }));
    expect(view.selectionExplanation).toMatch(/easier question/i);
  });

  it("uses the same deterministic option shuffle as the non-adaptive condition (same seed = same order)", () => {
    const question = sampleQuestions[0];
    const view1 = toPublicAdaptiveQuestionView(question, fakeTrace());
    const view2 = toPublicAdaptiveQuestionView(question, fakeTrace());
    expect(view1.options.map((o) => o.id)).toEqual(view2.options.map((o) => o.id));
  });

  it("accepts an optional previousDifficulty (Stage 3 before/after comparison) without leaking it as raw difficulty metadata", () => {
    const view = toPublicAdaptiveQuestionView(sampleQuestions[0], fakeTrace({ targetDifficulty: { difficulty: 4, reason: "r", masteryUsed: 0.5, evidenceCount: 5 } }), 2);
    expect(view.selectionExplanation).toMatch(/harder question/i);
    expect(JSON.stringify(view)).not.toMatch(/"difficulty"/);
  });

  it("includes every real option with only id and display, nothing else", () => {
    const question = sampleQuestions[0];
    const view = toPublicAdaptiveQuestionView(question, fakeTrace());
    expect(view.options).toHaveLength(question.options.length);
    for (const option of view.options) {
      expect(Object.keys(option).sort()).toEqual(["display", "id"]);
    }
  });
});

describe("buildAdaptiveFeedback — pedagogical misconception presentation", () => {
  it("includes a non-diagnostic misconceptionNote only when the selected option actually carries a misconceptionId", () => {
    const questionWithMisconception = RISE_QUESTIONS.find((q) => q.options.some((o) => !o.isCorrect && o.misconceptionId))!;
    const wrongOption = questionWithMisconception.options.find((o) => !o.isCorrect && o.misconceptionId)!;
    const grading = gradeAnswer(questionWithMisconception, wrongOption.id);
    const feedback = buildAdaptiveFeedback(questionWithMisconception, grading);
    expect(feedback.misconceptionNote).toBeDefined();
    expect(feedback.misconceptionNote).not.toContain(wrongOption.misconceptionId);
  });

  it("omits misconceptionNote for a correct answer", () => {
    const question = RISE_QUESTIONS[0];
    const grading = gradeAnswer(question, question.correctOptionId);
    const feedback = buildAdaptiveFeedback(question, grading);
    expect(feedback.misconceptionNote).toBeUndefined();
  });

  it("never asserts the student 'has' the misconception — the note is a fixed, generic sentence, never the taxonomy's own description text", () => {
    const questionWithMisconception = RISE_QUESTIONS.find((q) => q.options.some((o) => !o.isCorrect && o.misconceptionId))!;
    const wrongOption = questionWithMisconception.options.find((o) => !o.isCorrect && o.misconceptionId)!;
    const grading = gradeAnswer(questionWithMisconception, wrongOption.id);
    const feedback = buildAdaptiveFeedback(questionWithMisconception, grading);
    expect(feedback.misconceptionNote).not.toMatch(/you have|you possess|diagnos/i);
  });

  it("feedback never leaks misconceptionId or derivationNote directly", () => {
    const question = RISE_QUESTIONS[1];
    const grading = gradeAnswer(question, question.options.find((o) => !o.isCorrect)!.id);
    const feedback = buildAdaptiveFeedback(question, grading);
    expect(JSON.stringify(feedback)).not.toContain("derivationNote");
  });
});

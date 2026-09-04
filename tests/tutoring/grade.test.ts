import { describe, expect, it } from "vitest";
import { gradeAnswer } from "@/tutoring/grading/grade";
import { QUESTIONS } from "@/domain/questions";
import type { Question } from "@/domain/questions/types";

const sampleQuestion: Question = {
  id: "q-fixture",
  stem: "1 + 1 = ?",
  conceptIds: ["concept-quadratic-expressions"],
  primaryConceptId: "concept-quadratic-expressions",
  difficulty: 1,
  correctOptionId: "option-b",
  options: [
    { id: "option-a", display: "1", isCorrect: false, misconceptionId: "SIGN_ERROR" },
    { id: "option-b", display: "2", isCorrect: true },
    { id: "option-c", display: "3", isCorrect: false },
  ],
  workedSolution: "1 + 1 = 2",
  version: 1,
};

describe("gradeAnswer", () => {
  it("marks the correct option as correct, with no misconceptionId", () => {
    const result = gradeAnswer(sampleQuestion, "option-b");
    expect(result).toEqual({
      questionId: "q-fixture",
      selectedOptionId: "option-b",
      isCorrect: true,
      selectedOption: sampleQuestion.options[1],
      misconceptionId: undefined,
    });
  });

  it("marks an incorrect option as incorrect and surfaces its misconceptionId", () => {
    const result = gradeAnswer(sampleQuestion, "option-a");
    expect(result.isCorrect).toBe(false);
    expect(result.misconceptionId).toBe("SIGN_ERROR");
    expect(result.selectedOption).toEqual(sampleQuestion.options[0]);
  });

  it("marks an incorrect option with no mapped misconception as incorrect, with an undefined misconceptionId", () => {
    const result = gradeAnswer(sampleQuestion, "option-c");
    expect(result.isCorrect).toBe(false);
    expect(result.misconceptionId).toBeUndefined();
  });

  it("throws on an option id that does not belong to the question", () => {
    expect(() => gradeAnswer(sampleQuestion, "not-a-real-option")).toThrow();
  });

  it("is unaffected by option array order (correctness follows id, not position)", () => {
    const reordered: Question = {
      ...sampleQuestion,
      options: [...sampleQuestion.options].reverse(),
    };
    const result = gradeAnswer(reordered, "option-b");
    expect(result.isCorrect).toBe(true);
  });

  it("grades every seed question's correct option as correct", () => {
    for (const question of QUESTIONS) {
      const result = gradeAnswer(question, question.correctOptionId);
      expect(result.isCorrect).toBe(true);
    }
  });

  it("grades every seed question's incorrect options as incorrect and surfaces their misconceptionId", () => {
    for (const question of QUESTIONS) {
      for (const option of question.options) {
        if (option.isCorrect) continue;
        const result = gradeAnswer(question, option.id);
        expect(result.isCorrect).toBe(false);
        expect(result.misconceptionId).toBe(option.misconceptionId);
      }
    }
  });
});

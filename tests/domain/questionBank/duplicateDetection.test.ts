import { describe, expect, it } from "vitest";
import { QUESTIONS } from "@/domain/questions";
import type { Question } from "@/domain/questions/types";
import {
  findDuplicateOptionSetGroups,
  findDuplicateQuestionIds,
  findDuplicateStemGroups,
  findDuplicateWorkedSolutionGroups,
} from "@/domain/questions/bankStatistics";

function fixture(overrides: Partial<Question>): Question {
  return {
    id: "q-fixture-a",
    stem: "Stem A",
    conceptIds: ["concept-collecting-like-terms"],
    primaryConceptId: "concept-collecting-like-terms",
    difficulty: 1,
    correctOptionId: "o1",
    options: [
      { id: "o1", display: "2x", isCorrect: true },
      { id: "o2", display: "3x", isCorrect: false },
    ],
    workedSolution: "Work A",
    version: 1,
    ...overrides,
  };
}

describe("production bank has no accidental duplicates", () => {
  it("has zero duplicate question ids", () => {
    expect(findDuplicateQuestionIds(QUESTIONS)).toEqual([]);
  });

  it("has zero duplicate (normalized) stems", () => {
    expect(findDuplicateStemGroups(QUESTIONS)).toEqual([]);
  });
});

describe("findDuplicateQuestionIds", () => {
  it("detects a repeated id", () => {
    const questions = [fixture({ id: "q-1" }), fixture({ id: "q-1" }), fixture({ id: "q-2" })];
    expect(findDuplicateQuestionIds(questions)).toEqual(["q-1"]);
  });

  it("returns empty for all-unique ids", () => {
    const questions = [fixture({ id: "q-1" }), fixture({ id: "q-2" })];
    expect(findDuplicateQuestionIds(questions)).toEqual([]);
  });
});

describe("findDuplicateStemGroups", () => {
  it("detects stems that differ only in whitespace/case", () => {
    const questions = [
      fixture({ id: "q-1", stem: "Solve x² = 4" }),
      fixture({ id: "q-2", stem: "  solve   x² = 4  " }),
    ];
    const groups = findDuplicateStemGroups(questions);
    expect(groups).toHaveLength(1);
    expect(groups[0].sort()).toEqual(["q-1", "q-2"]);
  });

  it("does not flag genuinely different stems", () => {
    const questions = [fixture({ id: "q-1", stem: "Solve x² = 4" }), fixture({ id: "q-2", stem: "Solve x² = 9" })];
    expect(findDuplicateStemGroups(questions)).toEqual([]);
  });
});

describe("findDuplicateOptionSetGroups", () => {
  it("detects two questions with the same option display set regardless of order", () => {
    const questions = [
      fixture({
        id: "q-1",
        options: [
          { id: "a1", display: "Yes", isCorrect: true },
          { id: "a2", display: "No", isCorrect: false },
        ],
      }),
      fixture({
        id: "q-2",
        options: [
          { id: "b1", display: "No", isCorrect: false },
          { id: "b2", display: "Yes", isCorrect: true },
        ],
      }),
    ];
    const groups = findDuplicateOptionSetGroups(questions);
    expect(groups).toHaveLength(1);
    expect(groups[0].sort()).toEqual(["q-1", "q-2"]);
  });

  it("does not flag questions with different option sets", () => {
    const questions = [
      fixture({ id: "q-1", options: [{ id: "a1", display: "Yes", isCorrect: true }, { id: "a2", display: "No", isCorrect: false }] }),
      fixture({ id: "q-2", options: [{ id: "b1", display: "Maybe", isCorrect: true }, { id: "b2", display: "Never", isCorrect: false }] }),
    ];
    expect(findDuplicateOptionSetGroups(questions)).toEqual([]);
  });
});

describe("findDuplicateWorkedSolutionGroups", () => {
  it("detects two questions with an identical worked solution", () => {
    const questions = [
      fixture({ id: "q-1", workedSolution: "Factorise and solve." }),
      fixture({ id: "q-2", workedSolution: "Factorise and solve." }),
    ];
    const groups = findDuplicateWorkedSolutionGroups(questions);
    expect(groups).toHaveLength(1);
  });

  it("does not flag distinct worked solutions", () => {
    const questions = [
      fixture({ id: "q-1", workedSolution: "Factorise and solve." }),
      fixture({ id: "q-2", workedSolution: "Complete the square." }),
    ];
    expect(findDuplicateWorkedSolutionGroups(questions)).toEqual([]);
  });
});

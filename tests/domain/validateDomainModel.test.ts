import { describe, expect, it } from "vitest";
import { CONCEPTS } from "@/domain/concepts/data";
import { MISCONCEPTIONS } from "@/domain/misconceptions/data";
import { QUESTIONS } from "@/domain/questions/data";
import { validateDomainModel } from "@/domain/validateDomainModel";
import type { Concept } from "@/domain/concepts/types";
import type { Misconception } from "@/domain/misconceptions/types";
import type { Question } from "@/domain/questions/types";

function makeValidQuestion(overrides: Partial<Question> = {}): Question {
  return {
    id: "q-fixture-01",
    stem: "1 + 1 = ?",
    conceptIds: ["concept-quadratic-expressions"],
    primaryConceptId: "concept-quadratic-expressions",
    difficulty: 1,
    correctOptionId: "q-fixture-01-o1",
    options: [
      { id: "q-fixture-01-o1", display: "2", isCorrect: true },
      { id: "q-fixture-01-o2", display: "3", isCorrect: false },
    ],
    workedSolution: "1 + 1 = 2",
    version: 1,
    ...overrides,
  };
}

describe("seed domain data", () => {
  it("is internally consistent (concepts, misconceptions, questions)", () => {
    const errors = validateDomainModel(QUESTIONS, CONCEPTS, MISCONCEPTIONS);
    expect(errors).toEqual([]);
  });

  it("has at least one question with a diagnostic distractor", () => {
    const hasDiagnosticDistractor = QUESTIONS.some((q) =>
      q.options.some((o) => !o.isCorrect && o.misconceptionId !== undefined),
    );
    expect(hasDiagnosticDistractor).toBe(true);
  });
});

describe("question integrity", () => {
  it("passes for a well-formed question", () => {
    const errors = validateDomainModel([makeValidQuestion()], CONCEPTS, MISCONCEPTIONS);
    expect(errors).toEqual([]);
  });

  it("flags a question with zero correct options", () => {
    const question = makeValidQuestion({
      options: [
        { id: "o1", display: "2", isCorrect: false },
        { id: "o2", display: "3", isCorrect: false },
      ],
    });
    const errors = validateDomainModel([question], CONCEPTS, MISCONCEPTIONS);
    expect(errors.some((e) => e.includes("correct options"))).toBe(true);
  });

  it("flags a question with two correct options", () => {
    const question = makeValidQuestion({
      options: [
        { id: "o1", display: "2", isCorrect: true },
        { id: "o2", display: "3", isCorrect: true },
      ],
      correctOptionId: "o1",
    });
    const errors = validateDomainModel([question], CONCEPTS, MISCONCEPTIONS);
    expect(errors.some((e) => e.includes("correct options"))).toBe(true);
  });

  it("flags a correctOptionId that does not match any option", () => {
    const question = makeValidQuestion({ correctOptionId: "does-not-exist" });
    const errors = validateDomainModel([question], CONCEPTS, MISCONCEPTIONS);
    expect(errors.some((e) => e.includes("does not match any option id"))).toBe(true);
  });

  it("flags duplicate question ids", () => {
    const errors = validateDomainModel(
      [makeValidQuestion(), makeValidQuestion()],
      CONCEPTS,
      MISCONCEPTIONS,
    );
    expect(errors.some((e) => e.includes("Duplicate question id"))).toBe(true);
  });

  it("flags duplicate option ids within a question", () => {
    const question = makeValidQuestion({
      options: [
        { id: "dup", display: "2", isCorrect: true },
        { id: "dup", display: "3", isCorrect: false },
      ],
      correctOptionId: "dup",
    });
    const errors = validateDomainModel([question], CONCEPTS, MISCONCEPTIONS);
    expect(errors.some((e) => e.includes("duplicate option id"))).toBe(true);
  });

  it("flags difficulty outside the 1-5 range", () => {
    // @ts-expect-error deliberately invalid for the test
    const question = makeValidQuestion({ difficulty: 9 });
    const errors = validateDomainModel([question], CONCEPTS, MISCONCEPTIONS);
    expect(errors.some((e) => e.includes("out-of-range difficulty"))).toBe(true);
  });
});

describe("diagnostic metadata", () => {
  it("allows a misconceptionId on an incorrect option", () => {
    const question = makeValidQuestion({
      options: [
        { id: "o1", display: "2", isCorrect: true },
        { id: "o2", display: "3", isCorrect: false, misconceptionId: "SIGN_ERROR" },
      ],
      correctOptionId: "o1",
    });
    const errors = validateDomainModel([question], CONCEPTS, MISCONCEPTIONS);
    expect(errors).toEqual([]);
  });

  it("flags a misconceptionId that does not exist in the misconception bank", () => {
    const question = makeValidQuestion({
      options: [
        { id: "o1", display: "2", isCorrect: true },
        { id: "o2", display: "3", isCorrect: false, misconceptionId: "NOT_A_REAL_MISCONCEPTION" },
      ],
    });
    const errors = validateDomainModel([question], CONCEPTS, MISCONCEPTIONS);
    expect(errors.some((e) => e.includes("unknown misconceptionId"))).toBe(true);
  });
});

describe("concept integrity", () => {
  it("flags duplicate concept ids", () => {
    const concepts: Concept[] = [
      { id: "c1", name: "A", description: "", prerequisiteIds: [] },
      { id: "c1", name: "A again", description: "", prerequisiteIds: [] },
    ];
    const errors = validateDomainModel([], concepts, []);
    expect(errors.some((e) => e.includes("Duplicate concept id"))).toBe(true);
  });

  it("flags a prerequisiteId that does not reference a real concept", () => {
    const concepts: Concept[] = [
      { id: "c1", name: "A", description: "", prerequisiteIds: ["does-not-exist"] },
    ];
    const errors = validateDomainModel([], concepts, []);
    expect(errors.some((e) => e.includes("unknown prerequisiteId"))).toBe(true);
  });

  it("flags a misconception referencing an unknown concept", () => {
    const misconceptions: Misconception[] = [
      { id: "M1", label: "x", description: "", conceptIds: ["does-not-exist"] },
    ];
    const errors = validateDomainModel([], [], misconceptions);
    expect(errors.some((e) => e.includes("references unknown conceptId"))).toBe(true);
  });
});

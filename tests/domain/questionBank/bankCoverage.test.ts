import { describe, expect, it } from "vitest";
import { QUESTIONS } from "@/domain/questions";
import { CONCEPTS } from "@/domain/concepts/data";
import { MISCONCEPTIONS } from "@/domain/misconceptions/data";
import { computeBankStatistics } from "@/domain/questions/bankStatistics";

const stats = computeBankStatistics(QUESTIONS, CONCEPTS, MISCONCEPTIONS);

describe("concept coverage", () => {
  it("every assessable concept has at least one question as its primary concept", () => {
    expect(stats.conceptsWithNoQuestions).toEqual([]);
  });

  it("core concepts (factorisation, solving, discriminant strands) have more than one question", () => {
    const coreConcepts = [
      "concept-factorising-monic-quadratics",
      "concept-solving-by-factorisation",
      "concept-quadratic-formula",
      "concept-computing-discriminant",
      "concept-discriminant-nature-of-roots",
    ];
    for (const conceptId of coreConcepts) {
      expect(stats.byConcept[conceptId]).toBeGreaterThan(1);
    }
  });

  it("has few or no concepts below the low-coverage threshold, and any that exist are documented", () => {
    // A handful of narrow concepts legitimately need only 1-2 items —
    // this test just guards against a large silent coverage gap.
    expect(stats.conceptsWithLowCoverage.length).toBeLessThanOrEqual(6);
  });
});

describe("difficulty distribution", () => {
  it("is centred on Levels 2-4 with no extreme imbalance", () => {
    const total = QUESTIONS.length;
    const pct = (level: number) => (100 * (stats.byDifficulty[level as 1 | 2 | 3 | 4 | 5] ?? 0)) / total;

    // Reasonable tolerance around the target shares (L1 10-15%, L2 20-25%,
    // L3 25-30%, L4 20-25%, L5 10-15%) — flag major imbalance, not minor drift.
    expect(pct(1)).toBeGreaterThan(5);
    expect(pct(1)).toBeLessThan(20);
    expect(pct(2)).toBeGreaterThan(15);
    expect(pct(2)).toBeLessThan(35);
    expect(pct(3)).toBeGreaterThan(20);
    expect(pct(3)).toBeLessThan(35);
    expect(pct(4)).toBeGreaterThan(10);
    expect(pct(4)).toBeLessThan(30);
    expect(pct(5)).toBeGreaterThan(3);
    expect(pct(5)).toBeLessThan(20);
  });

  it("every difficulty level 1-5 is represented", () => {
    for (const level of [1, 2, 3, 4, 5] as const) {
      expect(stats.byDifficulty[level]).toBeGreaterThan(0);
    }
  });
});

describe("misconception coverage", () => {
  it("every misconception in the taxonomy is represented in at least one distractor", () => {
    expect(stats.misconceptionsNeverRepresented).toEqual([]);
  });

  it("high-frequency misconceptions appear across multiple questions", () => {
    const highFrequency = ["PLUS_MINUS_DROPPED", "FACTOR_SIGN_ERROR", "B2_PLUS_4AC", "NEGATIVE_B_DROPPED"];
    for (const id of highFrequency) {
      expect(stats.byMisconception[id]).toBeGreaterThan(1);
    }
  });
});

describe("options and diagnostic distractors", () => {
  it("most questions have at least one diagnostic distractor", () => {
    expect(stats.questionsWithDiagnosticDistractors / stats.totalQuestions).toBeGreaterThan(0.75);
  });

  it("average option count is a reasonable MCQ size", () => {
    expect(stats.averageOptionsPerQuestion).toBeGreaterThan(2.5);
    expect(stats.averageOptionsPerQuestion).toBeLessThan(6);
  });
});

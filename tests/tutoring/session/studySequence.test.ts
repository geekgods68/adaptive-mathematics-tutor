import { describe, expect, it } from "vitest";
import { NON_ADAPTIVE_STUDY_SEQUENCE } from "@/tutoring/selection/nonAdaptive/studySequence";
import { QUESTIONS } from "@/domain/questions";
import { CONCEPTS } from "@/domain/concepts/data";
import { NonAdaptiveSelectionPolicy } from "@/tutoring/selection/nonAdaptive/nonAdaptiveSelectionPolicy";
import type { NonAdaptiveSelectionContext } from "@/tutoring/selection/nonAdaptive/types";

const questionById = new Map(QUESTIONS.map((q) => [q.id, q]));
const conceptById = new Map(CONCEPTS.map((c) => [c.id, c]));

describe("NON_ADAPTIVE_STUDY_SEQUENCE", () => {
  it("has approximately 35 questions", () => {
    expect(NON_ADAPTIVE_STUDY_SEQUENCE.length).toBeGreaterThanOrEqual(30);
    expect(NON_ADAPTIVE_STUDY_SEQUENCE.length).toBeLessThanOrEqual(40);
  });

  it("references only valid production-bank question ids", () => {
    for (const id of NON_ADAPTIVE_STUDY_SEQUENCE) {
      expect(questionById.has(id)).toBe(true);
    }
  });

  it("has no duplicate question ids", () => {
    expect(new Set(NON_ADAPTIVE_STUDY_SEQUENCE).size).toBe(NON_ADAPTIVE_STUDY_SEQUENCE.length);
  });

  it("represents all 9 curriculum strands", () => {
    const strands = new Set(
      NON_ADAPTIVE_STUDY_SEQUENCE.map((id) => conceptById.get(questionById.get(id)!.primaryConceptId)?.strand),
    );
    expect(strands.size).toBe(9);
  });

  it("weights core strands (factorisation, solving) above simple recognition-only strands", () => {
    const countByStrand: Record<string, number> = {};
    for (const id of NON_ADAPTIVE_STUDY_SEQUENCE) {
      const strand = conceptById.get(questionById.get(id)!.primaryConceptId)!.strand;
      countByStrand[strand] = (countByStrand[strand] ?? 0) + 1;
    }
    expect(countByStrand.solving).toBeGreaterThan(countByStrand.algebra_foundations);
    expect(countByStrand.factorisation).toBeGreaterThan(countByStrand.algebra_foundations);
  });

  it("matches the intended difficulty distribution (L1 4-5, L2 8-9, L3 10-11, L4 7-8, L5 3-4)", () => {
    const byDifficulty: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const id of NON_ADAPTIVE_STUDY_SEQUENCE) {
      byDifficulty[questionById.get(id)!.difficulty] += 1;
    }
    expect(byDifficulty[1]).toBeGreaterThanOrEqual(4);
    expect(byDifficulty[1]).toBeLessThanOrEqual(5);
    expect(byDifficulty[2]).toBeGreaterThanOrEqual(8);
    expect(byDifficulty[2]).toBeLessThanOrEqual(9);
    expect(byDifficulty[3]).toBeGreaterThanOrEqual(10);
    expect(byDifficulty[3]).toBeLessThanOrEqual(11);
    expect(byDifficulty[4]).toBeGreaterThanOrEqual(7);
    expect(byDifficulty[4]).toBeLessThanOrEqual(8);
    expect(byDifficulty[5]).toBeGreaterThanOrEqual(3);
    expect(byDifficulty[5]).toBeLessThanOrEqual(4);
  });

  it("includes at least 3 Level 5 reasoning items", () => {
    const l5Count = NON_ADAPTIVE_STUDY_SEQUENCE.filter((id) => questionById.get(id)!.difficulty === 5).length;
    expect(l5Count).toBeGreaterThanOrEqual(3);
  });

  it("does not sort into flat ascending difficulty blocks (varies while generally rising)", () => {
    const difficulties = NON_ADAPTIVE_STUDY_SEQUENCE.map((id) => questionById.get(id)!.difficulty);
    const isMonotonicNonDecreasing = difficulties.every((d, i) => i === 0 || d >= difficulties[i - 1]);
    expect(isMonotonicNonDecreasing).toBe(false);

    // But the back half should skew harder than the front half — "generally rising."
    const mid = Math.floor(difficulties.length / 2);
    const frontAverage = difficulties.slice(0, mid).reduce((a, b) => a + b, 0) / mid;
    const backAverage = difficulties.slice(mid).reduce((a, b) => a + b, 0) / (difficulties.length - mid);
    expect(backAverage).toBeGreaterThan(frontAverage);
  });

  it("represents core concepts (factorising-monic-quadratics, solving-by-factorisation, quadratic-formula, discriminant) at least once", () => {
    const conceptIds = new Set(NON_ADAPTIVE_STUDY_SEQUENCE.map((id) => questionById.get(id)!.primaryConceptId));
    expect(conceptIds.has("concept-factorising-monic-quadratics")).toBe(true);
    expect(conceptIds.has("concept-solving-by-factorisation")).toBe(true);
    expect(conceptIds.has("concept-quadratic-formula")).toBe(true);
    expect(conceptIds.has("concept-discriminant-nature-of-roots")).toBe(true);
  });

  it("gives high-frequency misconceptions multiple independent opportunities across the sequence", () => {
    const misconceptionCounts: Record<string, number> = {};
    for (const id of NON_ADAPTIVE_STUDY_SEQUENCE) {
      for (const option of questionById.get(id)!.options) {
        if (option.misconceptionId) {
          misconceptionCounts[option.misconceptionId] = (misconceptionCounts[option.misconceptionId] ?? 0) + 1;
        }
      }
    }
    expect(misconceptionCounts.FACTOR_SIGN_ERROR ?? 0).toBeGreaterThan(1);
  });

  it("contains no exact-duplicate consecutive stems", () => {
    for (let i = 1; i < NON_ADAPTIVE_STUDY_SEQUENCE.length; i++) {
      const prevStem = questionById.get(NON_ADAPTIVE_STUDY_SEQUENCE[i - 1])!.stem;
      const currStem = questionById.get(NON_ADAPTIVE_STUDY_SEQUENCE[i])!.stem;
      expect(prevStem).not.toBe(currStem);
    }
  });

  it("has no performance-based branching — selecting every position depends only on the fixed sequence and index", () => {
    // Structural proof: NonAdaptiveSelectionContext (the only input the
    // policy accepts) cannot express correctness, mastery, or timing —
    // see src/tutoring/selection/nonAdaptive/types.ts. This test confirms
    // walking the whole study sequence through the real policy reproduces
    // it exactly, using only participantId/sequence/positionIndex.
    const policy = new NonAdaptiveSelectionPolicy();
    const reproduced: string[] = [];
    for (let position = 0; position < NON_ADAPTIVE_STUDY_SEQUENCE.length; position++) {
      const context: NonAdaptiveSelectionContext = {
        participantId: "any-participant",
        predeterminedSequence: NON_ADAPTIVE_STUDY_SEQUENCE,
        positionIndex: position,
      };
      const result = policy.selectNextQuestion(context);
      reproduced.push(result.questionId!);
    }
    expect(reproduced).toEqual(NON_ADAPTIVE_STUDY_SEQUENCE);
  });
});

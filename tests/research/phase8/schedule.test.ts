import { describe, expect, it } from "vitest";
import { generateHistorySchedule, expectedScheduleLength, type ScheduleIdentity } from "@/research/phase8/trackA/schedule";
import type { Concept } from "@/domain/concepts/types";
import type { Question } from "@/domain/questions/types";

function concept(id: string, curriculumLevel: number): Concept {
  return { id, name: id, description: id, prerequisiteIds: [], strand: "ch01_algebra", chapterId: "CH01", curriculumLevel };
}

function question(id: string, conceptId: string, difficulty: 1 | 2 | 3 | 4 | 5): Question {
  return {
    id,
    stem: id,
    conceptIds: [conceptId],
    primaryConceptId: conceptId,
    difficulty,
    options: [
      { id: `${id}-a`, display: "a", isCorrect: true },
      { id: `${id}-b`, display: "b", isCorrect: false },
    ],
    correctOptionId: `${id}-a`,
    workedSolution: "ws",
    version: 1,
  };
}

function identity(learnerId: string): ScheduleIdentity {
  return { masterSeed: "RISE-PHASE8-v2", family: "S1", cell: "S1", world: 1, sliceId: "CH-TEST", split: "test", learnerId };
}

/** Builds `count` single-concept questions for `conceptId`, spread round-robin across levels 1-5. */
function manyQuestions(conceptId: string, count: number): Question[] {
  return Array.from({ length: count }, (_, i) => question(`${conceptId}-q${i}`, conceptId, (((i % 5) + 1) as 1 | 2 | 3 | 4 | 5)));
}

describe("generateHistorySchedule", () => {
  const targetIds = ["T1", "T2"];
  const externalIds = ["X1"];
  const concepts = [concept("X1", 1), concept("T1", 2), concept("T2", 3)];
  const qSlice = [...manyQuestions("X1", 30), ...manyQuestions("T1", 30), ...manyQuestions("T2", 30)];

  it("produces the expected total length: phase1PerX*|X_c| + (phase2PerT + reviews)*|T_c|", () => {
    const result = generateHistorySchedule(identity("L1"), targetIds, externalIds, concepts, qSlice, 6, 12, 4);
    const expected = expectedScheduleLength(externalIds.length, targetIds.length, 6, 12, 4);
    expect(result.items.length).toBe(expected);
    expect(expected).toBe(6 * 1 + 15 * 2); // matches B5.2's stated formula 6|X_c| + 15|T_c|
  });

  it("Phase 1 items precede all Phase 2/review items, and cover X_c concepts in topological (curriculumLevel, id) order", () => {
    const result = generateHistorySchedule(identity("L1"), targetIds, externalIds, concepts, qSlice, 6, 12, 4);
    const phase1 = result.items.filter((i) => i.phase === "phase1");
    const rest = result.items.filter((i) => i.phase !== "phase1");
    expect(phase1).toHaveLength(6);
    expect(phase1.every((i) => i.conceptId === "X1")).toBe(true);
    expect(result.items.indexOf(phase1[phase1.length - 1])).toBeLessThan(result.items.indexOf(rest[0]));
  });

  it("inserts exactly one review item after every 4th Phase 2 item", () => {
    const result = generateHistorySchedule(identity("L1"), targetIds, externalIds, concepts, qSlice, 6, 12, 4);
    const phase2AndReview = result.items.filter((i) => i.phase !== "phase1");
    let phase2Count = 0;
    for (let idx = 0; idx < phase2AndReview.length; idx++) {
      if (phase2AndReview[idx].phase === "phase2") {
        phase2Count++;
        if (phase2Count % 4 === 0) {
          expect(phase2AndReview[idx + 1]?.phase).toBe("review");
        }
      }
    }
    const reviewCount = phase2AndReview.filter((i) => i.phase === "review").length;
    expect(reviewCount).toBe(6); // 3 per target concept * 2 targets
  });

  it("draws items without replacement when the pool is not exhausted (no question id repeats, no reuse flagged)", () => {
    const result = generateHistorySchedule(identity("L1"), targetIds, externalIds, concepts, qSlice, 6, 12, 4);
    const ids = result.items.map((i) => i.questionId);
    expect(new Set(ids).size).toBe(ids.length);
    expect(result.reuseCount).toBe(0);
    expect(result.items.every((i) => !i.reused)).toBe(true);
  });

  it("is deterministic: the same identity and inputs always produce the identical schedule", () => {
    const first = generateHistorySchedule(identity("L1"), targetIds, externalIds, concepts, qSlice, 6, 12, 4);
    const second = generateHistorySchedule(identity("L1"), targetIds, externalIds, concepts, qSlice, 6, 12, 4);
    expect(first.items).toEqual(second.items);
  });

  it("produces a different schedule for a different learner (independent seed key)", () => {
    const first = generateHistorySchedule(identity("L1"), targetIds, externalIds, concepts, qSlice, 6, 12, 4);
    const second = generateHistorySchedule(identity("L2"), targetIds, externalIds, concepts, qSlice, 6, 12, 4);
    expect(first.items.map((i) => i.questionId)).not.toEqual(second.items.map((i) => i.questionId));
  });

  it("falls back to logged reuse once a concept's single-concept pool is exhausted, rather than throwing", () => {
    const smallConcepts = [concept("X1", 1), concept("T1", 2)];
    const smallQSlice = [...manyQuestions("X1", 2), ...manyQuestions("T1", 2)]; // far fewer than phase1PerX=6 needs
    const result = generateHistorySchedule(identity("L1"), ["T1"], ["X1"], smallConcepts, smallQSlice, 6, 2, 4);
    expect(result.reuseCount).toBeGreaterThan(0);
    const x1Items = result.items.filter((i) => i.conceptId === "X1");
    expect(x1Items).toHaveLength(6);
    expect(x1Items.some((i) => i.reused)).toBe(true);
  });

  it("throws a clear error rather than silently producing an empty draw when a concept has zero single-concept items", () => {
    const sparseConcepts = [concept("X1", 1), concept("T1", 2)];
    const sparseQSlice = [...manyQuestions("T1", 10)]; // X1 has no items at all
    expect(() => generateHistorySchedule(identity("L1"), ["T1"], ["X1"], sparseConcepts, sparseQSlice, 6, 12, 4)).toThrow(/zero single-concept items/);
  });
});

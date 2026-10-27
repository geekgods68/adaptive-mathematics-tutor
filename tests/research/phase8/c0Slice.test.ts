import { describe, expect, it } from "vitest";
import { buildC0SliceSequence, type C0SliceIdentity } from "@/research/phase8/trackB/c0Slice";
import type { Question } from "@/domain/questions/types";

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

function manyQuestions(conceptId: string, countPerLevel: number): Question[] {
  const out: Question[] = [];
  for (let level = 1; level <= 5; level++) {
    for (let i = 0; i < countPerLevel; i++) out.push(question(`${conceptId}-L${level}-${i}`, conceptId, level as 1 | 2 | 3 | 4 | 5));
  }
  return out;
}

function identity(learnerId: string): C0SliceIdentity {
  return { masterSeed: "RISE-PHASE8-v2", world: 1, sliceId: "CH-TEST", learnerId };
}

describe("buildC0SliceSequence", () => {
  const targets = ["T1", "T2", "T3"]; // in curriculum order
  const qSlice = [...manyQuestions("T1", 10), ...manyQuestions("T2", 10), ...manyQuestions("T3", 10)];

  it("produces exactly `budget` items, distributed floor(budget/|T_c|) per concept with remainder to the earliest concepts", () => {
    const sequence = buildC0SliceSequence(targets, qSlice, 60, identity("L1"));
    expect(sequence).toHaveLength(60);
    // 60 / 3 = 20 per concept, no remainder.
    const byConcept = new Map<string, number>();
    for (const id of sequence) {
      const conceptId = id.split("-L")[0];
      byConcept.set(conceptId, (byConcept.get(conceptId) ?? 0) + 1);
    }
    expect(byConcept.get("T1")).toBe(20);
    expect(byConcept.get("T2")).toBe(20);
    expect(byConcept.get("T3")).toBe(20);
  });

  it("distributes the remainder to the earliest concepts in curriculum order", () => {
    const sequence = buildC0SliceSequence(targets, qSlice, 61, identity("L1")); // 61/3 = 20 r1 -> T1 gets 21
    const byConcept = new Map<string, number>();
    for (const id of sequence) {
      const conceptId = id.split("-L")[0];
      byConcept.set(conceptId, (byConcept.get(conceptId) ?? 0) + 1);
    }
    expect(byConcept.get("T1")).toBe(21);
    expect(byConcept.get("T2")).toBe(20);
    expect(byConcept.get("T3")).toBe(20);
  });

  it("presents concepts in blocks, in the given curriculum order (T1's block entirely before T2's, etc.)", () => {
    const sequence = buildC0SliceSequence(targets, qSlice, 30, identity("L1"));
    const conceptSequence = sequence.map((id) => id.split("-L")[0]);
    const firstT2Index = conceptSequence.indexOf("T2");
    const lastT1Index = conceptSequence.lastIndexOf("T1");
    expect(lastT1Index).toBeLessThan(firstT2Index);
  });

  it("cycles levels L1->L5 within each concept's block", () => {
    const sequence = buildC0SliceSequence(["T1"], manyQuestions("T1", 10), 12, identity("L1"));
    const levels = sequence.map((id) => Number(id.split("-L")[1].split("-")[0]));
    expect(levels.slice(0, 5)).toEqual([1, 2, 3, 4, 5]);
    expect(levels[5]).toBe(1); // cycles back
  });

  it("never repeats an item within a single learner's sequence when enough distinct items exist", () => {
    const sequence = buildC0SliceSequence(targets, qSlice, 60, identity("L1"));
    expect(new Set(sequence).size).toBe(sequence.length);
  });

  it("is deterministic for the same identity, and different for a different learner", () => {
    const first = buildC0SliceSequence(targets, qSlice, 30, identity("L1"));
    const second = buildC0SliceSequence(targets, qSlice, 30, identity("L1"));
    expect(first).toEqual(second);
    const other = buildC0SliceSequence(targets, qSlice, 30, identity("L2"));
    expect(first).not.toEqual(other);
  });

  it("throws a clear error when a concept's pool cannot fill its block at all", () => {
    const sparse = [question("only-one", "T1", 1)];
    expect(() => buildC0SliceSequence(["T1"], sparse, 5, identity("L1"))).toThrow(/no remaining items/);
  });
});

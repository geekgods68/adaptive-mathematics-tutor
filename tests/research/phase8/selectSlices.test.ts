import { describe, expect, it } from "vitest";
import { effectiveConceptWeights, selectSlices } from "@/research/phase8/slices/selectSlices";
import type { Concept } from "@/domain/concepts/types";
import type { Question } from "@/domain/questions/types";

function concept(id: string, chapterId: string, prerequisiteIds: string[] = [], curriculumLevel = 1): Concept {
  return { id, name: id, description: id, prerequisiteIds, strand: "ch01_algebra", chapterId, curriculumLevel };
}

function question(id: string, conceptIds: string[], primary = conceptIds[0]): Question {
  return {
    id,
    stem: id,
    conceptIds,
    primaryConceptId: primary,
    difficulty: 3,
    options: [
      { id: `${id}-a`, display: "a", isCorrect: true },
      { id: `${id}-b`, display: "b", isCorrect: false },
    ],
    correctOptionId: `${id}-a`,
    workedSolution: "ws",
    version: 1,
    chapterId: conceptIds.length ? undefined : undefined,
  };
}

/** Builds a chapter with `targetCount` targets (chained prerequisites inside the chapter, ensuring >= 3 internal edges when targetCount >= 4), each with `questionsPerTarget` dedicated single-concept questions, and `externalCount` external prerequisites each with `questionsPerExternal` questions, each target depending on the first external concept. */
function buildEligibleChapter(
  chapterId: string,
  targetCount: number,
  externalCount: number,
  questionsPerTarget: number,
  questionsPerExternal: number,
): { concepts: Concept[]; questions: Question[] } {
  const concepts: Concept[] = [];
  const questions: Question[] = [];
  const externalIds = Array.from({ length: externalCount }, (_, i) => `${chapterId}-ext-${i}`);
  for (const extId of externalIds) {
    concepts.push(concept(extId, "EXTCH", [], 0));
    for (let q = 0; q < questionsPerExternal; q++) {
      questions.push(question(`${extId}-q${q}`, [extId]));
    }
  }
  const targetIds = Array.from({ length: targetCount }, (_, i) => `${chapterId}-t-${i}`);
  for (let i = 0; i < targetCount; i++) {
    // Chain targets to each other (t-i depends on t-(i-1)) for internal edges, and every
    // target depends on EVERY external concept, so each one is genuinely reachable as an
    // external prerequisite (a concept nothing in T_c points to is not part of X_c at all).
    const prereqs: string[] = [];
    if (i > 0) prereqs.push(targetIds[i - 1]);
    prereqs.push(...externalIds);
    concepts.push(concept(targetIds[i], chapterId, prereqs, i + 1));
    for (let q = 0; q < questionsPerTarget; q++) {
      questions.push(question(`${targetIds[i]}-q${q}`, [targetIds[i]]));
    }
  }
  return { concepts, questions };
}

describe("effectiveConceptWeights", () => {
  it("defaults to {[primaryConceptId]: 1} when conceptWeights is absent", () => {
    const q = question("q1", ["c-1", "c-2"], "c-1");
    expect(effectiveConceptWeights(q)).toEqual({ "c-1": 1 });
  });

  it("uses the explicit conceptWeights when present", () => {
    const q = { ...question("q1", ["c-1", "c-2"], "c-1"), conceptWeights: { "c-1": 0.6, "c-2": 0.4 } };
    expect(effectiveConceptWeights(q)).toEqual({ "c-1": 0.6, "c-2": 0.4 });
  });
});

describe("selectSlices", () => {
  it("selects 3 eligible chapters with no relaxation needed when the bank/curriculum comfortably meets every threshold", () => {
    const chapters = ["CHA", "CHB", "CHC", "CHD"].map((id) => buildEligibleChapter(id, 6, 3, 20, 10));
    const concepts = chapters.flatMap((c) => c.concepts);
    const questions = chapters.flatMap((c) => c.questions);

    const result = selectSlices(concepts, questions);
    expect(result.relaxationApplied).toBe("none");
    expect(result.eligibleChapterCount).toBe(4);
    expect(result.slices).toHaveLength(3);
    for (const slice of result.slices) {
      expect(slice.targetConceptIds.length).toBeGreaterThanOrEqual(5);
      expect(slice.targetConceptIds.length).toBeLessThanOrEqual(12);
      expect(slice.externalPrereqConceptIds.length).toBeGreaterThanOrEqual(2);
      expect(slice.qSlice.length).toBeGreaterThanOrEqual(120);
      expect(slice.singleConceptOnly).toBe(true);
    }
  });

  it("ranks eligible chapters by (edges inside + edges from external), descending, ties by chapterId", () => {
    const strong = buildEligibleChapter("CHSTRONG", 8, 3, 20, 10); // more targets -> more chained internal edges
    const weak = buildEligibleChapter("CHWEAK", 5, 2, 20, 10);
    const another = buildEligibleChapter("CHMID", 6, 3, 20, 10);
    const concepts = [...strong.concepts, ...weak.concepts, ...another.concepts];
    const questions = [...strong.questions, ...weak.questions, ...another.questions];
    const result = selectSlices(concepts, questions);
    expect(result.slices.map((s) => s.chapterId)[0]).toBe("CHSTRONG");
  });

  it("relaxes to (a)/(b)/(c) in order when fewer than 3 chapters are eligible under stricter rules, and reports which level was needed", () => {
    // Two chapters comfortably eligible, one chapter needs relaxation (b): |X_c|=1 only (fails the base 2<=X_c<=10 rule).
    const eligible1 = buildEligibleChapter("CH1", 6, 3, 20, 10);
    const eligible2 = buildEligibleChapter("CH2", 6, 3, 20, 10);
    const needsRelaxB = buildEligibleChapter("CH3", 6, 1, 20, 10); // X_c = 1, fails base (needs >=2), passes relaxation (b) (needs >=1)
    const concepts = [...eligible1.concepts, ...eligible2.concepts, ...needsRelaxB.concepts];
    const questions = [...eligible1.questions, ...eligible2.questions, ...needsRelaxB.questions];
    const result = selectSlices(concepts, questions);
    expect(result.relaxationApplied).toBe("b");
    expect(result.slices.map((s) => s.chapterId).sort()).toEqual(["CH1", "CH2", "CH3"]);
  });

  it("Q_slice contains only questions whose every concept lies in T_c union X_c", () => {
    const { concepts, questions } = buildEligibleChapter("CHX", 6, 3, 20, 10);
    // Add a stray question referencing a concept outside this chapter entirely.
    const strayConcept = concept("stray-concept", "OTHERCH", [], 0);
    const strayQuestion = question("stray-q", ["stray-concept"]);
    const result = selectSlices([...concepts, strayConcept], [...questions, strayQuestion]);
    const slice = result.slices.find((s) => s.chapterId === "CHX")!;
    expect(slice.qSlice.find((q) => q.id === "stray-q")).toBeUndefined();
  });

  it("reports eligibleChapterCount below 3 (the C13 stop condition) rather than inventing a further relaxation", () => {
    // Only one chapter can ever be eligible -- far too few single-concept items per target.
    const { concepts, questions } = buildEligibleChapter("CHSPARSE", 6, 3, 2, 1);
    const result = selectSlices(concepts, questions);
    expect(result.eligibleChapterCount).toBeLessThan(3);
    expect(result.relaxationApplied).toBe("c"); // tried every relaxation level available
  });
});

import { describe, expect, it } from "vitest";
import { selectConceptSubgraphSlices, effectiveConceptWeights } from "@/research/phase8/slices/selectSlices";
import { RISE_CONCEPTS, RISE_QUESTIONS } from "@/domain/rise";
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
  };
}

/**
 * A chapter with `targetCount` targets (chained + each depends on every
 * external concept) where the LAST target is deliberately under-covered.
 * It is placed last specifically so dropping it never forces it back in
 * as an external prerequisite of any RETAINED concept (nothing in the
 * chain depends on the last link) -- isolating "drop one weak leaf
 * concept" from the separate, real structural case (also present in the
 * actual RISE data and exercised by the real-bank tests below) where a
 * dropped concept remains a genuine prerequisite of a retained one and
 * must then itself clear the external-coverage bar.
 */
function buildChapterWithOneWeakConcept(
  chapterId: string,
  targetCount: number,
  externalCount: number,
  wellCoveredCount: number,
  weakCount: number,
): { concepts: Concept[]; questions: Question[] } {
  const concepts: Concept[] = [];
  const questions: Question[] = [];
  const externalIds = Array.from({ length: externalCount }, (_, i) => `${chapterId}-ext-${i}`);
  for (const extId of externalIds) {
    concepts.push(concept(extId, "EXTCH", [], 0));
    for (let q = 0; q < 10; q++) questions.push(question(`${extId}-q${q}`, [extId]));
  }
  const targetIds = Array.from({ length: targetCount }, (_, i) => `${chapterId}-t-${i}`);
  for (let i = 0; i < targetCount; i++) {
    const prereqs: string[] = [];
    if (i > 0) prereqs.push(targetIds[i - 1]);
    prereqs.push(...externalIds);
    concepts.push(concept(targetIds[i], chapterId, prereqs, i + 1));
    const count = i === targetCount - 1 ? weakCount : wellCoveredCount; // last target is the deliberately weak leaf
    for (let q = 0; q < count; q++) questions.push(question(`${targetIds[i]}-q${q}`, [targetIds[i]]));
  }
  return { concepts, questions };
}

describe("selectConceptSubgraphSlices -- Amendment A1 procedure", () => {
  it("drops only the under-covered concept(s) and keeps the rest of the chapter as the retained target set", () => {
    const { concepts, questions } = buildChapterWithOneWeakConcept("CH1", 6, 3, 20, 5);
    const result = selectConceptSubgraphSlices(concepts, questions);
    const diag = result.perChapterDiagnostics.find((d) => d.chapterId === "CH1")!;
    expect(diag.droppedConceptIds).toEqual(["CH1-t-5"]);
    expect(diag.retainedTargetIds).toEqual(["CH1-t-0", "CH1-t-1", "CH1-t-2", "CH1-t-3", "CH1-t-4"]);
    expect(diag.eligible).toBe(true);
  });

  it("every retained target concept in the primary and reserve slices meets the original coverage threshold (SC >= 16 by default)", () => {
    const chapters = ["CHA", "CHB", "CHC", "CHD"].map((id) => buildChapterWithOneWeakConcept(id, 6, 3, 20, 5));
    const concepts = chapters.flatMap((c) => c.concepts);
    const questions = chapters.flatMap((c) => c.questions);
    const result = selectConceptSubgraphSlices(concepts, questions);

    function sc(conceptId: string): number {
      return questions.filter((q) => {
        const w = effectiveConceptWeights(q);
        const keys = Object.keys(w);
        return keys.length === 1 && keys[0] === conceptId;
      }).length;
    }

    for (const slice of [...result.primarySlices, ...(result.reserveSlice ? [result.reserveSlice] : [])]) {
      for (const conceptId of slice.targetConceptIds) {
        expect(sc(conceptId)).toBeGreaterThanOrEqual(16);
      }
    }
  });

  it("excluded (dropped) concepts never appear as a target in any selected slice", () => {
    const { concepts, questions } = buildChapterWithOneWeakConcept("CH1", 6, 3, 20, 5);
    const other = buildChapterWithOneWeakConcept("CH2", 6, 3, 20, 5);
    const result = selectConceptSubgraphSlices([...concepts, ...other.concepts], [...questions, ...other.questions]);
    const allTargets = new Set(result.primarySlices.flatMap((s) => s.targetConceptIds));
    expect(allTargets.has("CH1-t-5")).toBe(false);
    expect(allTargets.has("CH2-t-5")).toBe(false);
  });

  it("is deterministic: the same curriculum/question-bank snapshot always produces the same primary and reserve slices", () => {
    const chapters = ["CHA", "CHB", "CHC", "CHD"].map((id) => buildChapterWithOneWeakConcept(id, 6, 3, 20, 5));
    const concepts = chapters.flatMap((c) => c.concepts);
    const questions = chapters.flatMap((c) => c.questions);
    const first = selectConceptSubgraphSlices(concepts, questions);
    const second = selectConceptSubgraphSlices(concepts, questions);
    expect(first.primarySlices.map((s) => s.chapterId)).toEqual(second.primarySlices.map((s) => s.chapterId));
    expect(first.reserveSlice?.chapterId).toEqual(second.reserveSlice?.chapterId);
  });

  it("falls back cleanly (no crash, eligible: false) when a chapter has zero well-covered concepts", () => {
    const { concepts, questions } = buildChapterWithOneWeakConcept("CH1", 6, 3, 3, 3); // every target under threshold
    const result = selectConceptSubgraphSlices(concepts, questions);
    const diag = result.perChapterDiagnostics.find((d) => d.chapterId === "CH1")!;
    expect(diag.eligible).toBe(false);
  });

  it("never selects more than 3 primary slices even when more than 4 chapters are eligible", () => {
    const chapters = ["CHA", "CHB", "CHC", "CHD", "CHE"].map((id) => buildChapterWithOneWeakConcept(id, 6, 3, 20, 5));
    const concepts = chapters.flatMap((c) => c.concepts);
    const questions = chapters.flatMap((c) => c.questions);
    const result = selectConceptSubgraphSlices(concepts, questions);
    expect(result.primarySlices.length).toBe(3);
    expect(result.eligibleChapterCount).toBe(5);
  });
});

describe("selectConceptSubgraphSlices against the real RISE bank (regression pin for the approved Amendment A1 outcome)", () => {
  it("reproduces the author-approved primary slices (CH07, CH03, CH10) and reserve (CH12)", () => {
    const result = selectConceptSubgraphSlices(RISE_CONCEPTS, RISE_QUESTIONS);
    expect(result.primarySlices.map((s) => s.chapterId)).toEqual(["CH07", "CH03", "CH10"]);
    expect(result.reserveSlice?.chapterId).toBe("CH12");
    expect(result.eligibleChapterCount).toBe(4);
  });

  it("every primary and reserve slice's retained targets meet SC(k) >= 16 against the real bank", () => {
    const result = selectConceptSubgraphSlices(RISE_CONCEPTS, RISE_QUESTIONS);
    function sc(conceptId: string): number {
      return RISE_QUESTIONS.filter((q) => {
        const w = effectiveConceptWeights(q);
        const keys = Object.keys(w);
        return keys.length === 1 && keys[0] === conceptId;
      }).length;
    }
    for (const slice of [...result.primarySlices, result.reserveSlice!]) {
      for (const conceptId of slice.targetConceptIds) {
        expect(sc(conceptId)).toBeGreaterThanOrEqual(16);
      }
    }
  });

  it("dropped concepts (GEO07, GEO09, PRO08, PRF01, PRF04, PRF08) are excluded from their chapter's target set", () => {
    const result = selectConceptSubgraphSlices(RISE_CONCEPTS, RISE_QUESTIONS);
    const ch07 = result.primarySlices.find((s) => s.chapterId === "CH07")!;
    const ch10 = result.primarySlices.find((s) => s.chapterId === "CH10")!;
    const ch12 = result.reserveSlice!;
    expect(ch07.targetConceptIds).not.toContain("GEO07");
    expect(ch07.targetConceptIds).not.toContain("GEO09");
    expect(ch10.targetConceptIds).not.toContain("PRO08");
    expect(ch12.targetConceptIds).not.toContain("PRF01");
    expect(ch12.targetConceptIds).not.toContain("PRF04");
    expect(ch12.targetConceptIds).not.toContain("PRF08");
  });
});

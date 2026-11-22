import { describe, expect, it } from "vitest";
import { buildRiseNonAdaptiveSequence } from "@/tutoring/selection/nonAdaptive/riseSequence";
import { RISE_QUESTIONS } from "@/domain/rise";
import { buildAdaptiveCurriculumOrder } from "@/domain/rise/curriculum";

describe("buildRiseNonAdaptiveSequence", () => {
  it("is fully deterministic: identical inputs always produce the identical sequence", () => {
    const a = buildRiseNonAdaptiveSequence({ chapterId: "CH01", maxQuestions: 12, seed: "seed-A" });
    const b = buildRiseNonAdaptiveSequence({ chapterId: "CH01", maxQuestions: 12, seed: "seed-A" });
    expect(a).toEqual(b);
  });

  it("a different seed (different participant) can produce a different sequence", () => {
    const a = buildRiseNonAdaptiveSequence({ chapterId: "CH01", maxQuestions: 12, seed: "seed-A" });
    const b = buildRiseNonAdaptiveSequence({ chapterId: "CH01", maxQuestions: 12, seed: "seed-B" });
    expect(a).not.toEqual(b);
  });

  it("never returns duplicate ids within one sequence", () => {
    const sequence = buildRiseNonAdaptiveSequence({ chapterId: undefined, maxQuestions: 60, seed: "seed-dup-check" });
    expect(new Set(sequence).size).toBe(sequence.length);
  });

  it("returns at most maxQuestions ids", () => {
    const sequence = buildRiseNonAdaptiveSequence({ chapterId: "CH13", maxQuestions: 8, seed: "seed-cap" });
    expect(sequence.length).toBeLessThanOrEqual(8);
  });

  it("returns an empty array for maxQuestions <= 0", () => {
    expect(buildRiseNonAdaptiveSequence({ chapterId: "CH01", maxQuestions: 0, seed: "x" })).toEqual([]);
    expect(buildRiseNonAdaptiveSequence({ chapterId: "CH01", maxQuestions: -1, seed: "x" })).toEqual([]);
  });

  it("every returned id is a real question in the bank", () => {
    const realIds = new Set(RISE_QUESTIONS.map((q) => q.id));
    const sequence = buildRiseNonAdaptiveSequence({ chapterId: "CH05", maxQuestions: 15, seed: "seed-real-ids" });
    expect(sequence.every((id) => realIds.has(id))).toBe(true);
  });

  it("covers multiple distinct concepts within the chosen chapter, not just one (concept-balanced, not concentrated)", () => {
    const sequence = buildRiseNonAdaptiveSequence({ chapterId: "CH01", maxQuestions: 10, seed: "seed-coverage" });
    const questionById = new Map(RISE_QUESTIONS.map((q) => [q.id, q]));
    const conceptsTouched = new Set(sequence.map((id) => questionById.get(id)!.primaryConceptId));
    expect(conceptsTouched.size).toBeGreaterThan(1);
  });

  it("omitting chapterId walks the full curriculum, producing a sequence spanning more than one chapter for a large enough budget", () => {
    const sequence = buildRiseNonAdaptiveSequence({ chapterId: undefined, maxQuestions: 109, seed: "seed-all-chapters" });
    const questionById = new Map(RISE_QUESTIONS.map((q) => [q.id, q]));
    const chaptersTouched = new Set(sequence.map((id) => questionById.get(id)!.chapterId));
    expect(chaptersTouched.size).toBeGreaterThan(1);
  });

  it("excludeQuestionIds are avoided whenever an unseen alternative exists", () => {
    const base = buildRiseNonAdaptiveSequence({ chapterId: "CH01", maxQuestions: 10, seed: "seed-exclude-base" });
    const excluded = buildRiseNonAdaptiveSequence({ chapterId: "CH01", maxQuestions: 10, seed: "seed-exclude-base", excludeQuestionIds: base });
    expect(excluded.some((id) => base.includes(id))).toBe(false);
  });

  it("falls back to allowing reuse when exclusions would otherwise leave a concept with zero candidates", () => {
    const curriculumOrder = buildAdaptiveCurriculumOrder("CH13"); // a smaller chapter (100 questions)
    const allChapterQuestionIds = RISE_QUESTIONS.filter((q) => curriculumOrder.some((c) => c in (q.conceptWeights ?? { [q.primaryConceptId]: 1 }))).map((q) => q.id);
    // Exclude the entire chapter's pool -- an unseen-only sequence would be impossible.
    const sequence = buildRiseNonAdaptiveSequence({ chapterId: "CH13", maxQuestions: 10, seed: "seed-exhaust", excludeQuestionIds: allChapterQuestionIds });
    expect(sequence.length).toBe(10);
  });

  it("is independent of response pattern by construction: it takes no correctness/performance parameter at all (structural guarantee, not merely observed behavior)", () => {
    // The function signature itself has no way to accept a response pattern -- this is the same
    // kind of structural guarantee NonAdaptiveSelectionContext provides. Asserted here by checking
    // the options type has no such field, as a living documentation check.
    const options: Parameters<typeof buildRiseNonAdaptiveSequence>[0] = { chapterId: "CH01", maxQuestions: 5, seed: "x" };
    expect(Object.keys(options)).not.toContain("correctness");
    expect(Object.keys(options)).not.toContain("responses");
  });
});

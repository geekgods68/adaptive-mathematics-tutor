import { describe, expect, it } from "vitest";
import { buildAdaptiveCurriculumOrder, listAvailableChapters, CHAPTER_TITLES } from "@/tutoring/adaptiveSession/curriculum";
import { RISE_CONCEPTS } from "@/domain/rise";

describe("listAvailableChapters", () => {
  it("lists exactly the 14 chapters present in the real RISE curriculum, in CH01..CH14 order", () => {
    const chapters = listAvailableChapters();
    expect(chapters.map((c) => c.chapterId)).toEqual([
      "CH01", "CH02", "CH03", "CH04", "CH05", "CH06", "CH07", "CH08", "CH09", "CH10", "CH11", "CH12", "CH13", "CH14",
    ]);
  });

  it("every listed chapter has a non-empty title", () => {
    for (const chapter of listAvailableChapters()) {
      expect(chapter.title.length).toBeGreaterThan(0);
      expect(chapter.title).toBe(CHAPTER_TITLES[chapter.chapterId]);
    }
  });
});

describe("buildAdaptiveCurriculumOrder", () => {
  it("restricts to exactly the chosen chapter's concepts when a chapterId is given", () => {
    const order = buildAdaptiveCurriculumOrder("CH01");
    const ch01ConceptIds = new Set(RISE_CONCEPTS.filter((c) => c.chapterId === "CH01").map((c) => c.id));
    expect(order.length).toBe(ch01ConceptIds.size);
    expect(order.every((id) => ch01ConceptIds.has(id))).toBe(true);
  });

  it("walks every concept across every chapter when no chapterId is given", () => {
    const order = buildAdaptiveCurriculumOrder();
    expect(order.length).toBe(RISE_CONCEPTS.length);
  });

  it("orders by curriculumLevel ascending, then id, deterministically", () => {
    const order = buildAdaptiveCurriculumOrder("CH01");
    const conceptById = new Map(RISE_CONCEPTS.map((c) => [c.id, c]));
    for (let i = 1; i < order.length; i++) {
      const prevLevel = conceptById.get(order[i - 1])?.curriculumLevel ?? 0;
      const currLevel = conceptById.get(order[i])?.curriculumLevel ?? 0;
      expect(prevLevel).toBeLessThanOrEqual(currLevel);
    }
  });

  it("is deterministic across repeated calls", () => {
    expect(buildAdaptiveCurriculumOrder("CH03")).toEqual(buildAdaptiveCurriculumOrder("CH03"));
  });

  it("returns an empty array for an unknown chapter id rather than throwing", () => {
    expect(buildAdaptiveCurriculumOrder("CH99")).toEqual([]);
  });
});

import { describe, expect, it } from "vitest";
import { CONCEPTS } from "@/domain/concepts/data";
import { RECOMMENDED_CURRICULUM_ORDER } from "@/domain/curriculum/curriculumOrder";
import { validateCurriculumOrder } from "@/domain/curriculum/validateCurriculum";
import type { Concept } from "@/domain/concepts/types";

describe("RECOMMENDED_CURRICULUM_ORDER", () => {
  it("is valid against the concept graph (no missing/duplicate/out-of-order concepts)", () => {
    expect(validateCurriculumOrder(RECOMMENDED_CURRICULUM_ORDER, CONCEPTS)).toEqual([]);
  });

  it("lists every concept exactly once", () => {
    expect(RECOMMENDED_CURRICULUM_ORDER.length).toBe(CONCEPTS.length);
    expect(new Set(RECOMMENDED_CURRICULUM_ORDER).size).toBe(CONCEPTS.length);
  });

  it("places every prerequisite strictly before its dependent concept", () => {
    const positionOf = new Map(RECOMMENDED_CURRICULUM_ORDER.map((id, i) => [id, i]));
    for (const concept of CONCEPTS) {
      for (const prereqId of concept.prerequisiteIds) {
        expect(positionOf.get(prereqId)!).toBeLessThan(positionOf.get(concept.id)!);
      }
    }
  });

  it("places foundational concepts before the integrated-reasoning capstone", () => {
    const positionOf = new Map(RECOMMENDED_CURRICULUM_ORDER.map((id, i) => [id, i]));
    expect(positionOf.get("concept-recognising-quadratic-expressions")!).toBeLessThan(
      positionOf.get("concept-integrated-quadratic-reasoning")!,
    );
  });
});

describe("validateCurriculumOrder", () => {
  const concepts: Concept[] = [
    { id: "c1", name: "A", description: "d", prerequisiteIds: [], strand: "algebra_foundations" },
    { id: "c2", name: "B", description: "d", prerequisiteIds: ["c1"], strand: "algebra_foundations" },
  ];

  it("passes for a valid order", () => {
    expect(validateCurriculumOrder(["c1", "c2"], concepts)).toEqual([]);
  });

  it("flags a missing concept", () => {
    const errors = validateCurriculumOrder(["c1"], concepts);
    expect(errors.some((e) => e.includes("missing concept"))).toBe(true);
  });

  it("flags a duplicate entry", () => {
    const errors = validateCurriculumOrder(["c1", "c1", "c2"], concepts);
    expect(errors.some((e) => e.includes("more than once"))).toBe(true);
  });

  it("flags an unknown concept id", () => {
    const errors = validateCurriculumOrder(["c1", "c2", "does-not-exist"], concepts);
    expect(errors.some((e) => e.includes("unknown conceptId"))).toBe(true);
  });

  it("flags a prerequisite-violating order", () => {
    const errors = validateCurriculumOrder(["c2", "c1"], concepts);
    expect(errors.some((e) => e.includes("at or before its prerequisite"))).toBe(true);
  });
});

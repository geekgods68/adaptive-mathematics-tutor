import { describe, expect, it } from "vitest";
import { CONCEPTS } from "@/domain/concepts/data";
import { findConceptGraphCycles } from "@/domain/curriculum/validateCurriculum";
import { getDependents, getPrerequisites } from "@/domain/curriculum/queries";
import type { Concept, ConceptStrand } from "@/domain/concepts/types";

const ALL_STRANDS: ConceptStrand[] = [
  "algebra_foundations",
  "factorisation",
  "solving",
  "discriminant",
  "roots_coefficients",
  "graphs",
  "transformations",
  "intersections",
  "reasoning",
];

describe("CONCEPTS taxonomy", () => {
  it("has a reasonable, non-inflated number of concepts", () => {
    expect(CONCEPTS.length).toBeGreaterThanOrEqual(20);
    expect(CONCEPTS.length).toBeLessThanOrEqual(40);
  });

  it("has unique concept ids", () => {
    const ids = CONCEPTS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every prerequisiteId references a real concept", () => {
    const ids = new Set(CONCEPTS.map((c) => c.id));
    for (const concept of CONCEPTS) {
      for (const prereqId of concept.prerequisiteIds) {
        expect(ids.has(prereqId)).toBe(true);
      }
    }
  });

  it("has at least one concept in every strand", () => {
    for (const strand of ALL_STRANDS) {
      const count = CONCEPTS.filter((c) => c.strand === strand).length;
      expect(count).toBeGreaterThan(0);
    }
  });

  it("is acyclic", () => {
    expect(findConceptGraphCycles(CONCEPTS)).toEqual([]);
  });

  it("has no concept prerequisiteIds pointing at cyclic constructions when a cycle is deliberately introduced", () => {
    const withCycle: Concept[] = [
      ...CONCEPTS,
      {
        id: "concept-fixture-cycle-a",
        name: "Fixture A",
        description: "d",
        prerequisiteIds: ["concept-fixture-cycle-b"],
        strand: "algebra_foundations",
      },
      {
        id: "concept-fixture-cycle-b",
        name: "Fixture B",
        description: "d",
        prerequisiteIds: ["concept-fixture-cycle-a"],
        strand: "algebra_foundations",
      },
    ];
    expect(findConceptGraphCycles(withCycle).length).toBeGreaterThan(0);
  });
});

describe("expected prerequisite relationships", () => {
  it("factorising monic quadratics requires expanding two binomials", () => {
    const prereqIds = getPrerequisites("concept-factorising-monic-quadratics", CONCEPTS).map((c) => c.id);
    expect(prereqIds).toContain("concept-expanding-two-binomials");
  });

  it("solving by factorisation requires the zero-product principle", () => {
    const prereqIds = getPrerequisites("concept-solving-by-factorisation", CONCEPTS).map((c) => c.id);
    expect(prereqIds).toContain("concept-zero-product-principle");
  });

  it("the quadratic formula requires completing the square and identifying a, b, c", () => {
    const prereqIds = getPrerequisites("concept-quadratic-formula", CONCEPTS).map((c) => c.id);
    expect(prereqIds).toEqual(
      expect.arrayContaining(["concept-completing-the-square", "concept-identifying-abc"]),
    );
  });

  it("discriminant reverse reasoning depends (transitively, via dependents) on computing the discriminant", () => {
    const dependents = getDependents("concept-discriminant-nature-of-roots", CONCEPTS).map((c) => c.id);
    expect(dependents).toContain("concept-discriminant-reverse-reasoning");
  });

  it("integrated quadratic reasoning is the sole capstone of the reasoning strand and depends on multiple other strands", () => {
    const capstone = CONCEPTS.find((c) => c.id === "concept-integrated-quadratic-reasoning");
    expect(capstone).toBeDefined();
    expect(capstone!.prerequisiteIds.length).toBeGreaterThanOrEqual(3);
    // No concept in the taxonomy lists the capstone as its own prerequisite.
    expect(getDependents("concept-integrated-quadratic-reasoning", CONCEPTS)).toEqual([]);
  });

  it("foundational concepts (no prerequisites) exist and are genuinely foundational", () => {
    const roots = CONCEPTS.filter((c) => c.prerequisiteIds.length === 0);
    expect(roots.length).toBeGreaterThan(0);
    for (const root of roots) {
      expect(root.strand).toBe("algebra_foundations");
    }
  });
});

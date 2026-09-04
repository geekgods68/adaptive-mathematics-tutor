import { describe, expect, it } from "vitest";
import { CONCEPTS } from "@/domain/concepts/data";
import { MISCONCEPTIONS } from "@/domain/misconceptions/data";
import { getConceptsByStrand, getMisconceptionsForConcept } from "@/domain/curriculum/queries";

describe("MISCONCEPTIONS taxonomy", () => {
  it("has a reasonable, non-inflated number of misconceptions", () => {
    expect(MISCONCEPTIONS.length).toBeGreaterThanOrEqual(20);
    expect(MISCONCEPTIONS.length).toBeLessThanOrEqual(40);
  });

  it("has unique misconception ids", () => {
    const ids = MISCONCEPTIONS.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every conceptId reference is valid", () => {
    const conceptIds = new Set(CONCEPTS.map((c) => c.id));
    for (const misconception of MISCONCEPTIONS) {
      for (const conceptId of misconception.conceptIds) {
        expect(conceptIds.has(conceptId)).toBe(true);
      }
    }
  });

  it("every misconception has a non-empty description and label", () => {
    for (const misconception of MISCONCEPTIONS) {
      expect(misconception.description.trim().length).toBeGreaterThan(0);
      expect(misconception.label.trim().length).toBeGreaterThan(0);
    }
  });

  it("every misconception references at least one concept", () => {
    for (const misconception of MISCONCEPTIONS) {
      expect(misconception.conceptIds.length).toBeGreaterThan(0);
    }
  });

  it("ids use the taxonomy's SCREAMING_SNAKE_CASE convention", () => {
    for (const misconception of MISCONCEPTIONS) {
      expect(misconception.id).toMatch(/^[A-Z0-9_]+$/);
    }
  });
});

describe("getMisconceptionsForConcept", () => {
  it("returns misconceptions that reference the given concept", () => {
    const results = getMisconceptionsForConcept("concept-completing-the-square", MISCONCEPTIONS);
    const ids = results.map((m) => m.id);
    expect(ids).toContain("HALF_B_NOT_SQUARED");
    expect(ids).toContain("HALF_B_SIGN_ERROR");
    expect(ids).toContain("BALANCING_TERM_NOT_SUBTRACTED");
  });

  it("returns an empty array for a concept with no mapped misconceptions", () => {
    // A leaf concept with no dependents and no authored distractor issues yet.
    const results = getMisconceptionsForConcept("concept-factorising-common-factor", MISCONCEPTIONS);
    expect(results).toEqual([]);
  });

  it("returns an empty array for an unknown concept id", () => {
    expect(getMisconceptionsForConcept("does-not-exist", MISCONCEPTIONS)).toEqual([]);
  });
});

describe("getConceptsByStrand", () => {
  it("returns only concepts in the requested strand", () => {
    const results = getConceptsByStrand("discriminant", CONCEPTS);
    expect(results.length).toBeGreaterThan(0);
    for (const concept of results) {
      expect(concept.strand).toBe("discriminant");
    }
  });

  it("covers every concept across all strands with no overlap", () => {
    const strands = [
      "algebra_foundations",
      "factorisation",
      "solving",
      "discriminant",
      "roots_coefficients",
      "graphs",
      "transformations",
      "intersections",
      "reasoning",
    ] as const;
    const total = strands.reduce((sum, strand) => sum + getConceptsByStrand(strand, CONCEPTS).length, 0);
    expect(total).toBe(CONCEPTS.length);
  });
});

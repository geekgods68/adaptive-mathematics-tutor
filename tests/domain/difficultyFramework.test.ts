import { describe, expect, it } from "vitest";
import { CONCEPTS } from "@/domain/concepts/data";
import { DIFFICULTY_DESCRIPTORS } from "@/domain/curriculum/difficultyFramework";
import { CONCEPT_DIFFICULTY_GUIDANCE } from "@/domain/curriculum/conceptDifficultyGuidance";
import {
  validateConceptDifficultyGuidance,
  validateDifficultyFramework,
} from "@/domain/curriculum/validateCurriculum";

describe("DIFFICULTY_DESCRIPTORS", () => {
  it("defines exactly levels 1 through 5, each once", () => {
    expect(validateDifficultyFramework(DIFFICULTY_DESCRIPTORS)).toEqual([]);
    expect(DIFFICULTY_DESCRIPTORS.map((d) => d.level).sort()).toEqual([1, 2, 3, 4, 5]);
  });

  it("has a non-empty label, description, and characteristics for every level", () => {
    for (const descriptor of DIFFICULTY_DESCRIPTORS) {
      expect(descriptor.label.trim().length).toBeGreaterThan(0);
      expect(descriptor.description.trim().length).toBeGreaterThan(0);
      expect(descriptor.characteristics.length).toBeGreaterThan(0);
    }
  });

  it("rejects a framework missing a level", () => {
    const incomplete = DIFFICULTY_DESCRIPTORS.filter((d) => d.level !== 3);
    const errors = validateDifficultyFramework(incomplete);
    expect(errors.some((e) => e.includes("level 3"))).toBe(true);
  });

  it("rejects a framework with a duplicated level", () => {
    const duplicated = [...DIFFICULTY_DESCRIPTORS, DIFFICULTY_DESCRIPTORS[0]];
    const errors = validateDifficultyFramework(duplicated);
    expect(errors.some((e) => e.includes("level 1"))).toBe(true);
  });
});

describe("CONCEPT_DIFFICULTY_GUIDANCE", () => {
  it("is valid: every entry references a real concept with min <= max within 1-5", () => {
    expect(validateConceptDifficultyGuidance(CONCEPT_DIFFICULTY_GUIDANCE, CONCEPTS)).toEqual([]);
  });

  it("covers every concept in the taxonomy", () => {
    const guidedIds = new Set(CONCEPT_DIFFICULTY_GUIDANCE.map((g) => g.conceptId));
    for (const concept of CONCEPTS) {
      expect(guidedIds.has(concept.id)).toBe(true);
    }
  });

  it("does not force every concept across the full 1-5 range", () => {
    const fullRangeCount = CONCEPT_DIFFICULTY_GUIDANCE.filter(
      (g) => g.minDifficulty === 1 && g.maxDifficulty === 5,
    ).length;
    expect(fullRangeCount).toBe(0);
  });

  it("rejects an out-of-range difficulty", () => {
    // @ts-expect-error deliberately invalid for the test
    const errors = validateConceptDifficultyGuidance([{ conceptId: CONCEPTS[0].id, minDifficulty: 0, maxDifficulty: 5 }], CONCEPTS);
    expect(errors.some((e) => e.includes("out-of-range"))).toBe(true);
  });

  it("rejects minDifficulty greater than maxDifficulty", () => {
    const errors = validateConceptDifficultyGuidance(
      [{ conceptId: CONCEPTS[0].id, minDifficulty: 4, maxDifficulty: 2 }],
      CONCEPTS,
    );
    expect(errors.some((e) => e.includes("greater than maxDifficulty"))).toBe(true);
  });

  it("rejects a guidance entry referencing an unknown concept", () => {
    const errors = validateConceptDifficultyGuidance(
      [{ conceptId: "does-not-exist", minDifficulty: 1, maxDifficulty: 2 }],
      CONCEPTS,
    );
    expect(errors.some((e) => e.includes("unknown conceptId"))).toBe(true);
  });
});

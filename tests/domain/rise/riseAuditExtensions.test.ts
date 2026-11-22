import { describe, expect, it } from "vitest";
import { RISE_QUESTIONS, RISE_CONCEPTS } from "@/domain/rise";
import { validateConceptWeights, validateChapterConsistency } from "../../../scripts/audit-rise-questions";
import type { Question } from "@/domain/questions/types";
import type { Concept } from "@/domain/concepts/types";

/**
 * Stage 1 (Finding F-10 remediation): tests for the RISE-specific
 * additions in scripts/audit-rise-questions.ts. The generic checks it
 * also runs (validateDomainModel, validateQuestionBank, cycle detection)
 * are already covered by tests/domain/rise/riseImportIntegrity.test.ts —
 * not duplicated here.
 */
describe("audit-rise-questions: RISE-specific extensions", () => {
  it("validateConceptWeights finds zero errors against the real bank", () => {
    const conceptIds = new Set(RISE_CONCEPTS.map((c) => c.id));
    expect(validateConceptWeights(RISE_QUESTIONS, conceptIds)).toEqual([]);
  });

  it("validateChapterConsistency finds zero errors against the real bank", () => {
    expect(validateChapterConsistency(RISE_QUESTIONS, RISE_CONCEPTS)).toEqual([]);
  });

  it("validateConceptWeights catches a weight referencing an unknown concept", () => {
    const bogus: Question = { ...RISE_QUESTIONS[0], conceptWeights: { "not-a-real-concept": 1 } };
    const errors = validateConceptWeights([bogus], new Set(RISE_CONCEPTS.map((c) => c.id)));
    expect(errors.some((e) => e.includes("unknown conceptId"))).toBe(true);
  });

  it("validateConceptWeights catches a weight not listed in the question's own conceptIds", () => {
    const realOtherConceptId = RISE_CONCEPTS.find((c) => !RISE_QUESTIONS[0].conceptIds.includes(c.id))!.id;
    const bogus: Question = { ...RISE_QUESTIONS[0], conceptWeights: { [realOtherConceptId]: 1 } };
    const errors = validateConceptWeights([bogus], new Set(RISE_CONCEPTS.map((c) => c.id)));
    expect(errors.some((e) => e.includes("not in the question's own conceptIds"))).toBe(true);
  });

  it("validateConceptWeights catches a non-positive weight", () => {
    const bogus: Question = { ...RISE_QUESTIONS[0], conceptWeights: { [RISE_QUESTIONS[0].primaryConceptId]: 0 } };
    const errors = validateConceptWeights([bogus], new Set(RISE_CONCEPTS.map((c) => c.id)));
    expect(errors.some((e) => e.includes("positive finite number"))).toBe(true);
  });

  it("validateChapterConsistency catches a question with an unknown chapterId", () => {
    const bogus: Question = { ...RISE_QUESTIONS[0], chapterId: "CH99" };
    const errors = validateChapterConsistency([bogus], RISE_CONCEPTS);
    expect(errors.some((e) => e.includes("unknown chapterId"))).toBe(true);
  });

  it("validateChapterConsistency catches a concept missing its chapterId", () => {
    const bogus: Concept = { ...RISE_CONCEPTS[0], chapterId: undefined };
    const errors = validateChapterConsistency(RISE_QUESTIONS, [bogus, ...RISE_CONCEPTS.slice(1)]);
    expect(errors.some((e) => e.includes("has no chapterId"))).toBe(true);
  });
});

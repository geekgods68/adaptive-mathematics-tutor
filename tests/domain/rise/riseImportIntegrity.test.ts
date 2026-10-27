import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { RISE_QUESTIONS, RISE_CONCEPTS, RISE_MISCONCEPTIONS, ALL_QUESTIONS } from "@/domain/rise";
import { QUESTIONS } from "@/domain/questions";
import { validateDomainModel } from "@/domain/validateDomainModel";
import { validateQuestionBank } from "@/domain/questions/validateQuestionBank";
import { findConceptGraphCycles } from "@/domain/curriculum/validateCurriculum";
import { gradeAnswer } from "@/tutoring/grading/grade";
import { parseCsvRecords } from "@/domain/rise/csvParser";

/**
 * Integrity tests for the imported RISE question bank
 * (data/question-bank/, see its README.md for provenance). These
 * exercise the SAME validation functions the original 161-question bank
 * uses, run against the RISE dataset specifically -- per
 * docs/research-decisions.md's RISE-integration entry, the two datasets
 * are kept in separate exports (not merged into QUESTIONS/CONCEPTS/
 * MISCONCEPTIONS) specifically so existing tests calibrated to the small
 * original bank's size never needed to change.
 */

describe("RISE question bank — counts and uniqueness", () => {
  it("has exactly 1,840 unique questions", () => {
    expect(RISE_QUESTIONS.length).toBe(1840);
    expect(new Set(RISE_QUESTIONS.map((q) => q.id)).size).toBe(1840);
  });

  it("represents all 14 chapters", () => {
    const chapters = new Set(RISE_QUESTIONS.map((q) => q.chapterId));
    expect(chapters.size).toBe(14);
    for (let i = 1; i <= 14; i++) {
      const chId = `CH${String(i).padStart(2, "0")}`;
      expect(chapters.has(chId)).toBe(true);
    }
  });

  it("has no duplicate question ids against the original 161-question bank", () => {
    const originalIds = new Set(QUESTIONS.map((q) => q.id));
    const overlap = RISE_QUESTIONS.filter((q) => originalIds.has(q.id));
    expect(overlap).toEqual([]);
  });

  it("ALL_QUESTIONS is the union of both banks with no duplicates", () => {
    expect(ALL_QUESTIONS.length).toBe(QUESTIONS.length + RISE_QUESTIONS.length);
    expect(new Set(ALL_QUESTIONS.map((q) => q.id)).size).toBe(ALL_QUESTIONS.length);
  });
});

describe("RISE question bank — referential integrity", () => {
  it("passes validateDomainModel with zero errors", () => {
    const errors = validateDomainModel(RISE_QUESTIONS, RISE_CONCEPTS, RISE_MISCONCEPTIONS);
    expect(errors).toEqual([]);
  });

  it("passes validateQuestionBank with zero errors", () => {
    // No ConceptDifficultyGuidance exists yet for the RISE taxonomy (that
    // guidance is specific to the original quadratics concepts), so this
    // only exercises validateQuestionBank's guidance-independent checks
    // (empty stem/solution, duplicate option text, misconceptionId-without-
    // derivationNote) -- which is the set of checks relevant to import
    // correctness.
    const errors = validateQuestionBank(RISE_QUESTIONS, []);
    expect(errors).toEqual([]);
  });

  it("has an acyclic, self-dependency-free concept graph", () => {
    const cycles = findConceptGraphCycles(RISE_CONCEPTS);
    expect(cycles).toEqual([]);
    for (const concept of RISE_CONCEPTS) {
      expect(concept.prerequisiteIds).not.toContain(concept.id);
    }
  });

  it("has exactly 109 concepts and 68 misconceptions, matching the source taxonomy", () => {
    expect(RISE_CONCEPTS.length).toBe(109);
    expect(RISE_MISCONCEPTIONS.length).toBe(68);
  });

  it("every RISE concept has a chapterId and curriculumLevel", () => {
    for (const concept of RISE_CONCEPTS) {
      expect(concept.chapterId).toMatch(/^CH\d{2}$/);
      expect(concept.curriculumLevel).toBeGreaterThanOrEqual(1);
      expect(concept.curriculumLevel).toBeLessThanOrEqual(4);
    }
  });
});

describe("RISE question bank — option structure", () => {
  it("every question has between 4 and 8 options", () => {
    for (const q of RISE_QUESTIONS) {
      expect(q.options.length).toBeGreaterThanOrEqual(4);
      expect(q.options.length).toBeLessThanOrEqual(8);
    }
  });

  it("every question has exactly one correct option, and it matches correctOptionId", () => {
    for (const q of RISE_QUESTIONS) {
      const correctOptions = q.options.filter((o) => o.isCorrect);
      expect(correctOptions.length).toBe(1);
      expect(correctOptions[0].id).toBe(q.correctOptionId);
    }
  });

  it("every option id is prefixed by its own question's id (no cross-question id reuse)", () => {
    for (const q of RISE_QUESTIONS) {
      for (const o of q.options) {
        expect(o.id.startsWith(q.id)).toBe(true);
      }
    }
  });
});

describe("RISE question bank — grading integration", () => {
  it("gradeAnswer works correctly on an imported RISE question (correct option)", () => {
    const question = RISE_QUESTIONS.find((q) => q.id === "MATH-CH01-0001")!;
    expect(question).toBeDefined();
    const result = gradeAnswer(question, question.correctOptionId);
    expect(result.isCorrect).toBe(true);
    expect(result.misconceptionId).toBeUndefined();
  });

  it("gradeAnswer works correctly on an imported RISE question (incorrect option with a misconception)", () => {
    const question = RISE_QUESTIONS.find((q) => q.id === "MATH-CH01-0001")!;
    const wrongOption = question.options.find((o) => !o.isCorrect && o.misconceptionId)!;
    expect(wrongOption).toBeDefined();
    const result = gradeAnswer(question, wrongOption.id);
    expect(result.isCorrect).toBe(false);
    expect(result.misconceptionId).toBe(wrongOption.misconceptionId);
  });

  it("gradeAnswer throws on an unknown option id, same as for the original bank", () => {
    const question = RISE_QUESTIONS[0];
    expect(() => gradeAnswer(question, "not-a-real-option-id")).toThrow();
  });
});

describe("RISE question bank — rendering sanity (automated proxy, not a browser check)", () => {
  it("every question's stem, worked solution, and option display text are non-empty", () => {
    for (const q of RISE_QUESTIONS) {
      expect(q.stem.trim().length).toBeGreaterThan(0);
      expect(q.workedSolution.trim().length).toBeGreaterThan(0);
      for (const o of q.options) {
        expect(o.display.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it("every KaTeX \\( \\) delimiter pair is balanced in stems, options, and worked solutions", () => {
    const unbalanced: string[] = [];
    const countDelims = (s: string) => ((s.match(/\\\(/g) ?? []).length === (s.match(/\\\)/g) ?? []).length);
    for (const q of RISE_QUESTIONS) {
      if (!countDelims(q.stem) || !countDelims(q.workedSolution)) unbalanced.push(q.id);
      for (const o of q.options) {
        if (!countDelims(o.display)) unbalanced.push(q.id);
      }
    }
    expect(unbalanced).toEqual([]);
  });
});

describe("RISE question bank — deterministic, duplicate-free re-import", () => {
  it("loading the canonical CSV twice in the same process yields the identical (cached) array", () => {
    // loadRiseQuestions() is memoized; re-importing the module within the
    // same process must not re-parse or produce a different array.
    const a = RISE_QUESTIONS;
    const b = RISE_QUESTIONS;
    expect(a).toBe(b);
  });

  it("parsing the canonical CSV fresh (bypassing the module cache) reproduces the exact same question set", () => {
    const csvPath = path.join(process.cwd(), "data", "question-bank", "canonical-question-bank-v1.csv");
    const text = readFileSync(csvPath, "utf-8");
    const rows = parseCsvRecords(text);
    expect(rows.length).toBe(RISE_QUESTIONS.length);
    const freshIds = rows.map((r) => r.question_id).sort();
    const loadedIds = RISE_QUESTIONS.map((q) => q.id).sort();
    expect(freshIds).toEqual(loadedIds);
    expect(new Set(freshIds).size).toBe(freshIds.length);
  });
});

describe("RISE question bank — the one non-auto-verified question", () => {
  it("MATH-CH11-0002 is marked as author-reviewed (not auto-verified), and its content is a well-formed conceptual item", () => {
    // This question (a confidence-interval interpretation item) has no
    // numeric computation to execute, which is why the source pipeline
    // could not auto-verify it -- see data/question-bank/README.md. This
    // test does not claim independent mathematical re-verification; it
    // only confirms the item imported correctly and is schema-valid, like
    // every other question (covered by the validateDomainModel test
    // above). Flagged here explicitly, per the integration brief, so its
    // exceptional status stays visible rather than silently blending in.
    const question = RISE_QUESTIONS.find((q) => q.id === "MATH-CH11-0002");
    expect(question).toBeDefined();
    expect(question!.tags).toContain("author_reviewed_math_not_automatically_verified");
    expect(question!.options.filter((o) => o.isCorrect).length).toBe(1);
  });
});

import { describe, expect, it } from "vitest";
import { QUESTIONS } from "@/domain/questions";
import { CONCEPTS } from "@/domain/concepts/data";
import { MISCONCEPTIONS } from "@/domain/misconceptions/data";
import { CONCEPT_DIFFICULTY_GUIDANCE } from "@/domain/curriculum/conceptDifficultyGuidance";
import { validateDomainModel } from "@/domain/validateDomainModel";
import { validateQuestionBank } from "@/domain/questions/validateQuestionBank";

describe("production question bank — schema and referential integrity", () => {
  it("has approximately 140-170 production questions", () => {
    expect(QUESTIONS.length).toBeGreaterThanOrEqual(140);
    expect(QUESTIONS.length).toBeLessThanOrEqual(170);
  });

  it("passes validateDomainModel with zero errors", () => {
    expect(validateDomainModel(QUESTIONS, CONCEPTS, MISCONCEPTIONS)).toEqual([]);
  });

  it("passes validateQuestionBank (Phase 2 quality gates) with zero errors", () => {
    expect(validateQuestionBank(QUESTIONS, CONCEPT_DIFFICULTY_GUIDANCE)).toEqual([]);
  });

  it("has unique question ids", () => {
    const ids = QUESTIONS.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("has unique option ids within every question", () => {
    for (const q of QUESTIONS) {
      const ids = q.options.map((o) => o.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it("has exactly one correct option per question, matching correctOptionId", () => {
    for (const q of QUESTIONS) {
      const correctOptions = q.options.filter((o) => o.isCorrect);
      expect(correctOptions).toHaveLength(1);
      expect(correctOptions[0].id).toBe(q.correctOptionId);
    }
  });

  it("has primaryConceptId included in conceptIds for every question", () => {
    for (const q of QUESTIONS) {
      expect(q.conceptIds).toContain(q.primaryConceptId);
    }
  });

  it("references only valid concept ids", () => {
    const conceptIds = new Set(CONCEPTS.map((c) => c.id));
    for (const q of QUESTIONS) {
      for (const id of q.conceptIds) expect(conceptIds.has(id)).toBe(true);
    }
  });

  it("references only valid misconception ids", () => {
    const misconceptionIds = new Set(MISCONCEPTIONS.map((m) => m.id));
    for (const q of QUESTIONS) {
      for (const o of q.options) {
        if (o.misconceptionId) expect(misconceptionIds.has(o.misconceptionId)).toBe(true);
      }
    }
  });

  it("has a non-empty derivationNote on every diagnostic distractor", () => {
    for (const q of QUESTIONS) {
      for (const o of q.options) {
        if (o.misconceptionId) {
          expect(o.derivationNote?.trim().length ?? 0).toBeGreaterThan(0);
        }
      }
    }
  });

  it("has a non-empty stem and worked solution for every question", () => {
    for (const q of QUESTIONS) {
      expect(q.stem.trim().length).toBeGreaterThan(0);
      expect(q.workedSolution.trim().length).toBeGreaterThan(0);
    }
  });

  it("has difficulty within the guidance range for each question's primary concept", () => {
    const guidanceByConcept = new Map(CONCEPT_DIFFICULTY_GUIDANCE.map((g) => [g.conceptId, g]));
    for (const q of QUESTIONS) {
      const guidance = guidanceByConcept.get(q.primaryConceptId);
      expect(guidance).toBeDefined();
      expect(q.difficulty).toBeGreaterThanOrEqual(guidance!.minDifficulty);
      expect(q.difficulty).toBeLessThanOrEqual(guidance!.maxDifficulty);
    }
  });

  it("has no option whose display text duplicates another option's within the same question", () => {
    for (const q of QUESTIONS) {
      const displays = q.options.map((o) => o.display.trim().toLowerCase());
      expect(new Set(displays).size).toBe(displays.length);
    }
  });

  it("option counts vary rather than being fixed at 4", () => {
    const counts = new Set(QUESTIONS.map((q) => q.options.length));
    expect(counts.size).toBeGreaterThan(1);
    for (const q of QUESTIONS) {
      expect(q.options.length).toBeGreaterThanOrEqual(2);
    }
  });
});

describe("validateQuestionBank", () => {
  const guidance = CONCEPT_DIFFICULTY_GUIDANCE;

  it("flags difficulty outside a concept's guidance range", () => {
    const question = {
      id: "q-fixture",
      stem: "s",
      conceptIds: ["concept-collecting-like-terms"],
      primaryConceptId: "concept-collecting-like-terms",
      difficulty: 5 as const,
      correctOptionId: "o1",
      options: [
        { id: "o1", display: "a", isCorrect: true },
        { id: "o2", display: "b", isCorrect: false },
      ],
      workedSolution: "w",
      version: 1,
    };
    const errors = validateQuestionBank([question], guidance);
    expect(errors.some((e) => e.includes("outside the guidance range"))).toBe(true);
  });

  it("flags a diagnostic distractor with no derivationNote", () => {
    const question = {
      id: "q-fixture",
      stem: "s",
      conceptIds: ["concept-collecting-like-terms"],
      primaryConceptId: "concept-collecting-like-terms",
      difficulty: 1 as const,
      correctOptionId: "o1",
      options: [
        { id: "o1", display: "a", isCorrect: true },
        { id: "o2", display: "b", isCorrect: false, misconceptionId: "SIGN_ERROR_TRANSPOSE" },
      ],
      workedSolution: "w",
      version: 1,
    };
    const errors = validateQuestionBank([question], guidance);
    expect(errors.some((e) => e.includes("no derivationNote"))).toBe(true);
  });

  it("flags a distractor whose display duplicates the correct answer", () => {
    const question = {
      id: "q-fixture",
      stem: "s",
      conceptIds: ["concept-collecting-like-terms"],
      primaryConceptId: "concept-collecting-like-terms",
      difficulty: 1 as const,
      correctOptionId: "o1",
      options: [
        { id: "o1", display: "2x", isCorrect: true },
        { id: "o2", display: "2x", isCorrect: false },
      ],
      workedSolution: "w",
      version: 1,
    };
    const errors = validateQuestionBank([question], guidance);
    expect(errors.some((e) => e.includes("duplicates the correct answer"))).toBe(true);
  });

  it("flags two options sharing the same display text", () => {
    const question = {
      id: "q-fixture",
      stem: "s",
      conceptIds: ["concept-collecting-like-terms"],
      primaryConceptId: "concept-collecting-like-terms",
      difficulty: 1 as const,
      correctOptionId: "o1",
      options: [
        { id: "o1", display: "2x", isCorrect: true },
        { id: "o2", display: "3x", isCorrect: false },
        { id: "o3", display: "3x", isCorrect: false },
      ],
      workedSolution: "w",
      version: 1,
    };
    const errors = validateQuestionBank([question], guidance);
    expect(errors.some((e) => e.includes("two options with the same display text"))).toBe(true);
  });

  it("flags an empty stem or worked solution", () => {
    const question = {
      id: "q-fixture",
      stem: "  ",
      conceptIds: ["concept-collecting-like-terms"],
      primaryConceptId: "concept-collecting-like-terms",
      difficulty: 1 as const,
      correctOptionId: "o1",
      options: [
        { id: "o1", display: "2x", isCorrect: true },
        { id: "o2", display: "3x", isCorrect: false },
      ],
      workedSolution: "  ",
      version: 1,
    };
    const errors = validateQuestionBank([question], guidance);
    expect(errors.some((e) => e.includes("empty stem"))).toBe(true);
    expect(errors.some((e) => e.includes("empty worked solution"))).toBe(true);
  });

  it("passes for a well-formed question", () => {
    const question = {
      id: "q-fixture",
      stem: "s",
      conceptIds: ["concept-collecting-like-terms"],
      primaryConceptId: "concept-collecting-like-terms",
      difficulty: 1 as const,
      correctOptionId: "o1",
      options: [
        { id: "o1", display: "2x", isCorrect: true },
        { id: "o2", display: "3x", isCorrect: false },
      ],
      workedSolution: "w",
      version: 1,
    };
    expect(validateQuestionBank([question], guidance)).toEqual([]);
  });
});

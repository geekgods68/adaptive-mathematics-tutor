import type { Concept } from "@/domain/concepts/types";
import type { Misconception } from "@/domain/misconceptions/types";
import type { DifficultyLevel, Question } from "@/domain/questions/types";

export type BankStatistics = {
  totalQuestions: number;
  byStrand: Record<string, number>;
  byConcept: Record<string, number>;
  byDifficulty: Record<DifficultyLevel, number>;
  byMisconception: Record<string, number>;
  averageOptionsPerQuestion: number;
  optionCountHistogram: Record<number, number>;
  questionsWithDiagnosticDistractors: number;
  questionsWithMultipleConcepts: number;
  conceptsWithNoQuestions: string[];
  conceptsWithLowCoverage: string[];
  misconceptionsNeverRepresented: string[];
  questionsWithZeroDiagnosticDistractors: string[];
};

/** Concepts with fewer than this many questions (as primaryConceptId) are flagged as low-coverage. */
const LOW_COVERAGE_THRESHOLD = 2;

export function computeBankStatistics(
  questions: Question[],
  concepts: Concept[],
  misconceptions: Misconception[],
): BankStatistics {
  const byStrand: Record<string, number> = {};
  const byConcept: Record<string, number> = {};
  const byDifficulty: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  const byMisconception: Record<string, number> = {};
  const optionCountHistogram: Record<number, number> = {};

  const conceptById = new Map(concepts.map((c) => [c.id, c]));

  let totalOptions = 0;
  let questionsWithDiagnosticDistractors = 0;
  let questionsWithMultipleConcepts = 0;
  const questionsWithZeroDiagnosticDistractors: string[] = [];

  for (const question of questions) {
    const strand = conceptById.get(question.primaryConceptId)?.strand ?? "UNKNOWN";
    byStrand[strand] = (byStrand[strand] ?? 0) + 1;
    byConcept[question.primaryConceptId] = (byConcept[question.primaryConceptId] ?? 0) + 1;
    byDifficulty[question.difficulty] = (byDifficulty[question.difficulty] ?? 0) + 1;

    totalOptions += question.options.length;
    optionCountHistogram[question.options.length] = (optionCountHistogram[question.options.length] ?? 0) + 1;

    if (question.conceptIds.length > 1) questionsWithMultipleConcepts += 1;

    const hasDiagnostic = question.options.some((o) => o.misconceptionId);
    if (hasDiagnostic) {
      questionsWithDiagnosticDistractors += 1;
    } else {
      questionsWithZeroDiagnosticDistractors.push(question.id);
    }

    for (const option of question.options) {
      if (option.misconceptionId) {
        byMisconception[option.misconceptionId] = (byMisconception[option.misconceptionId] ?? 0) + 1;
      }
    }
  }

  const conceptsWithNoQuestions = concepts.filter((c) => !byConcept[c.id]).map((c) => c.id);
  const conceptsWithLowCoverage = concepts
    .filter((c) => (byConcept[c.id] ?? 0) > 0 && (byConcept[c.id] ?? 0) < LOW_COVERAGE_THRESHOLD)
    .map((c) => c.id);
  const misconceptionsNeverRepresented = misconceptions.filter((m) => !byMisconception[m.id]).map((m) => m.id);

  return {
    totalQuestions: questions.length,
    byStrand,
    byConcept,
    byDifficulty: byDifficulty as Record<DifficultyLevel, number>,
    byMisconception,
    averageOptionsPerQuestion: questions.length === 0 ? 0 : totalOptions / questions.length,
    optionCountHistogram,
    questionsWithDiagnosticDistractors,
    questionsWithMultipleConcepts,
    conceptsWithNoQuestions,
    conceptsWithLowCoverage,
    misconceptionsNeverRepresented,
    questionsWithZeroDiagnosticDistractors,
  };
}

/** Question ids sharing the same id — should always be empty; validateDomainModel also checks this. */
export function findDuplicateQuestionIds(questions: Question[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const q of questions) {
    if (seen.has(q.id)) duplicates.add(q.id);
    seen.add(q.id);
  }
  return [...duplicates];
}

function normalizeText(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Groups of question ids that share an identical (whitespace/case-normalized) stem. */
export function findDuplicateStemGroups(questions: Question[]): string[][] {
  const byStem = new Map<string, string[]>();
  for (const q of questions) {
    const key = normalizeText(q.stem);
    const group = byStem.get(key) ?? [];
    group.push(q.id);
    byStem.set(key, group);
  }
  return [...byStem.values()].filter((group) => group.length > 1);
}

/** Groups of question ids that share an identical (normalized) set of option display strings. */
export function findDuplicateOptionSetGroups(questions: Question[]): string[][] {
  const byOptionSet = new Map<string, string[]>();
  for (const q of questions) {
    const key = q.options
      .map((o) => normalizeText(o.display))
      .sort()
      .join("|");
    const group = byOptionSet.get(key) ?? [];
    group.push(q.id);
    byOptionSet.set(key, group);
  }
  return [...byOptionSet.values()].filter((group) => group.length > 1);
}

/** Groups of question ids that share an identical (normalized) worked solution — often a sign of accidental duplication. */
export function findDuplicateWorkedSolutionGroups(questions: Question[]): string[][] {
  const bySolution = new Map<string, string[]>();
  for (const q of questions) {
    const key = normalizeText(q.workedSolution);
    const group = bySolution.get(key) ?? [];
    group.push(q.id);
    bySolution.set(key, group);
  }
  return [...bySolution.values()].filter((group) => group.length > 1);
}

import type { Concept } from "@/domain/concepts/types";
import type { DifficultyLevel, Question } from "@/domain/questions/types";

export type StudySequenceStatistics = {
  length: number;
  byDifficulty: Record<DifficultyLevel, number>;
  byStrand: Record<string, number>;
  duplicateIds: string[];
  invalidIds: string[];
};

export function computeStudySequenceStatistics(
  sequence: string[],
  questions: Question[],
  concepts: Concept[],
): StudySequenceStatistics {
  const questionById = new Map(questions.map((q) => [q.id, q]));
  const conceptById = new Map(concepts.map((c) => [c.id, c]));

  const byDifficulty: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  const byStrand: Record<string, number> = {};
  const invalidIds: string[] = [];

  const seen = new Set<string>();
  const duplicateIds = new Set<string>();

  for (const id of sequence) {
    if (seen.has(id)) duplicateIds.add(id);
    seen.add(id);

    const question = questionById.get(id);
    if (!question) {
      invalidIds.push(id);
      continue;
    }
    byDifficulty[question.difficulty] += 1;
    const strand = conceptById.get(question.primaryConceptId)?.strand ?? "UNKNOWN";
    byStrand[strand] = (byStrand[strand] ?? 0) + 1;
  }

  return {
    length: sequence.length,
    byDifficulty: byDifficulty as Record<DifficultyLevel, number>,
    byStrand,
    duplicateIds: [...duplicateIds],
    invalidIds,
  };
}

/** Structural/referential errors only — difficulty-target compliance is a design goal checked by tests, not a hard error here. */
export function validateStudySequence(sequence: string[], questions: Question[]): string[] {
  const errors: string[] = [];
  const questionById = new Map(questions.map((q) => [q.id, q]));

  const seen = new Set<string>();
  for (const id of sequence) {
    if (!questionById.has(id)) errors.push(`Study sequence references unknown question id "${id}"`);
    if (seen.has(id)) errors.push(`Study sequence lists "${id}" more than once`);
    seen.add(id);
  }

  return errors;
}

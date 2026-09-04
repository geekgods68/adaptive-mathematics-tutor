import type { Concept } from "@/domain/concepts/types";
import type { Misconception } from "@/domain/misconceptions/types";
import type { Question } from "@/domain/questions/types";
import { findConceptGraphCycles } from "@/domain/curriculum/validateCurriculum";

/**
 * Referential-integrity and shape checks across the question bank, concept
 * graph, and misconception bank. Returns a list of human-readable error
 * strings; an empty array means the dataset is internally consistent.
 *
 * This is deliberately plain TypeScript (no schema library) — the checks
 * are simple enough that a validation library would add a dependency
 * without adding clarity.
 */
export function validateDomainModel(
  questions: Question[],
  concepts: Concept[],
  misconceptions: Misconception[],
): string[] {
  const errors: string[] = [];

  const conceptIds = new Set(concepts.map((c) => c.id));
  const misconceptionIds = new Set(misconceptions.map((m) => m.id));

  // --- Concept integrity ---
  const seenConceptIds = new Set<string>();
  for (const concept of concepts) {
    if (seenConceptIds.has(concept.id)) {
      errors.push(`Duplicate concept id: "${concept.id}"`);
    }
    seenConceptIds.add(concept.id);

    if (!concept.name.trim()) {
      errors.push(`Concept "${concept.id}" has an empty name`);
    }
    if (!concept.description.trim()) {
      errors.push(`Concept "${concept.id}" has an empty description`);
    }

    if (concept.prerequisiteIds.includes(concept.id)) {
      errors.push(`Concept "${concept.id}" lists itself as its own prerequisite`);
    }

    const seenPrereqIds = new Set<string>();
    for (const prereqId of concept.prerequisiteIds) {
      if (!conceptIds.has(prereqId)) {
        errors.push(`Concept "${concept.id}" has unknown prerequisiteId "${prereqId}"`);
      }
      if (seenPrereqIds.has(prereqId)) {
        errors.push(`Concept "${concept.id}" lists duplicate prerequisiteId "${prereqId}"`);
      }
      seenPrereqIds.add(prereqId);
    }
  }

  for (const cycle of findConceptGraphCycles(concepts)) {
    errors.push(`Concept graph contains a cycle: ${cycle.join(" -> ")}`);
  }

  // --- Misconception integrity ---
  const seenMisconceptionIds = new Set<string>();
  for (const misconception of misconceptions) {
    if (seenMisconceptionIds.has(misconception.id)) {
      errors.push(`Duplicate misconception id: "${misconception.id}"`);
    }
    seenMisconceptionIds.add(misconception.id);

    if (!misconception.description.trim()) {
      errors.push(`Misconception "${misconception.id}" has an empty description`);
    }

    const seenConceptRefs = new Set<string>();
    for (const conceptId of misconception.conceptIds) {
      if (!conceptIds.has(conceptId)) {
        errors.push(`Misconception "${misconception.id}" references unknown conceptId "${conceptId}"`);
      }
      if (seenConceptRefs.has(conceptId)) {
        errors.push(`Misconception "${misconception.id}" lists duplicate conceptId "${conceptId}"`);
      }
      seenConceptRefs.add(conceptId);
    }
  }

  // --- Question integrity ---
  const seenQuestionIds = new Set<string>();
  for (const question of questions) {
    if (seenQuestionIds.has(question.id)) {
      errors.push(`Duplicate question id: "${question.id}"`);
    }
    seenQuestionIds.add(question.id);

    if (question.difficulty < 1 || question.difficulty > 5) {
      errors.push(`Question "${question.id}" has out-of-range difficulty ${question.difficulty}`);
    }

    if (!question.conceptIds.includes(question.primaryConceptId)) {
      errors.push(
        `Question "${question.id}" primaryConceptId "${question.primaryConceptId}" is not in its own conceptIds`,
      );
    }

    for (const conceptId of question.conceptIds) {
      if (!conceptIds.has(conceptId)) {
        errors.push(`Question "${question.id}" references unknown conceptId "${conceptId}"`);
      }
    }

    const seenOptionIds = new Set<string>();
    let correctOptionCount = 0;
    for (const option of question.options) {
      if (seenOptionIds.has(option.id)) {
        errors.push(`Question "${question.id}" has duplicate option id "${option.id}"`);
      }
      seenOptionIds.add(option.id);

      if (option.isCorrect) {
        correctOptionCount += 1;
      }

      if (option.misconceptionId && !misconceptionIds.has(option.misconceptionId)) {
        errors.push(
          `Question "${question.id}" option "${option.id}" references unknown misconceptionId "${option.misconceptionId}"`,
        );
      }
    }

    if (correctOptionCount !== 1) {
      errors.push(
        `Question "${question.id}" has ${correctOptionCount} correct options (must have exactly 1)`,
      );
    }

    const correctOption = question.options.find((o) => o.id === question.correctOptionId);
    if (!correctOption) {
      errors.push(
        `Question "${question.id}" correctOptionId "${question.correctOptionId}" does not match any option id`,
      );
    } else if (!correctOption.isCorrect) {
      errors.push(
        `Question "${question.id}" correctOptionId "${question.correctOptionId}" points to an option where isCorrect is false`,
      );
    }
  }

  return errors;
}

import type { Question } from "@/domain/questions/types";
import type { ConceptDifficultyGuidance } from "@/domain/curriculum/conceptDifficultyGuidance";

/**
 * Production-bank quality gates, layered on top of the general schema
 * checks in validateDomainModel.ts. These are specific to authoring a
 * large production bank (Phase 2) rather than validating the domain
 * schema in general (Phase 0/1): every diagnostic distractor must be
 * properly annotated, options must be textually distinct, difficulty
 * must respect the concept's guidance range, and so on.
 */
export function validateQuestionBank(
  questions: Question[],
  difficultyGuidance: ConceptDifficultyGuidance[],
): string[] {
  const errors: string[] = [];
  const guidanceByConceptId = new Map(difficultyGuidance.map((g) => [g.conceptId, g]));

  for (const question of questions) {
    if (!question.stem.trim()) {
      errors.push(`Question "${question.id}" has an empty stem`);
    }
    if (!question.workedSolution.trim()) {
      errors.push(`Question "${question.id}" has an empty worked solution`);
    }

    const guidance = guidanceByConceptId.get(question.primaryConceptId);
    if (guidance && (question.difficulty < guidance.minDifficulty || question.difficulty > guidance.maxDifficulty)) {
      errors.push(
        `Question "${question.id}" has difficulty ${question.difficulty}, outside the guidance range ${guidance.minDifficulty}-${guidance.maxDifficulty} for its primary concept "${question.primaryConceptId}"`,
      );
    }

    const correctOption = question.options.find((o) => o.id === question.correctOptionId);

    const seenDisplays = new Set<string>();
    for (const option of question.options) {
      const normalizedDisplay = option.display.trim().toLowerCase();
      if (seenDisplays.has(normalizedDisplay)) {
        errors.push(`Question "${question.id}" has two options with the same display text: "${option.display}"`);
      }
      seenDisplays.add(normalizedDisplay);

      if (option.misconceptionId && !option.derivationNote?.trim()) {
        errors.push(
          `Question "${question.id}" option "${option.id}" has misconceptionId "${option.misconceptionId}" but no derivationNote`,
        );
      }

      if (
        !option.isCorrect &&
        correctOption &&
        normalizedDisplay === correctOption.display.trim().toLowerCase()
      ) {
        errors.push(
          `Question "${question.id}" option "${option.id}" is a distractor whose display text duplicates the correct answer`,
        );
      }
    }
  }

  return errors;
}

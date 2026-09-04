import type { QuestionSelectionPolicy, QuestionSelectionResult } from "@/tutoring/selection/types";
import type { NonAdaptiveSelectionContext } from "@/tutoring/selection/nonAdaptive/types";

/**
 * Selects the next question by index into a predetermined sequence, full
 * stop. It never inspects correctness, mastery, or timing — it cannot,
 * because NonAdaptiveSelectionContext doesn't carry that data. Every
 * participant in this condition walks the same fixed sequence.
 */
export class NonAdaptiveSelectionPolicy
  implements QuestionSelectionPolicy<NonAdaptiveSelectionContext>
{
  readonly condition = "non_adaptive" as const;

  selectNextQuestion(context: NonAdaptiveSelectionContext): QuestionSelectionResult {
    const { predeterminedSequence, positionIndex } = context;

    if (positionIndex >= predeterminedSequence.length) {
      return { questionId: null, rationale: "Predetermined sequence exhausted." };
    }

    return {
      questionId: predeterminedSequence[positionIndex],
      rationale: `Fixed sequence position ${positionIndex}; independent of prior responses.`,
    };
  }
}

import type { AnswerOption, Question } from "@/domain/questions/types";

export type GradingResult = {
  questionId: string;
  selectedOptionId: string;
  isCorrect: boolean;
  selectedOption: AnswerOption;
  /** Set only when the selected option is incorrect AND carries a misconceptionId. */
  misconceptionId?: string;
};

/**
 * Deterministic MCQ grading. Correctness is a direct id comparison against
 * `question.correctOptionId` — no LLM, no fuzzy/semantic matching, ever.
 */
export function gradeAnswer(question: Question, selectedOptionId: string): GradingResult {
  const selectedOption = question.options.find((option) => option.id === selectedOptionId);

  if (!selectedOption) {
    throw new Error(
      `Unknown option id "${selectedOptionId}" for question "${question.id}".`,
    );
  }

  const isCorrect = selectedOption.id === question.correctOptionId;

  return {
    questionId: question.id,
    selectedOptionId,
    isCorrect,
    selectedOption,
    misconceptionId: isCorrect ? undefined : selectedOption.misconceptionId,
  };
}

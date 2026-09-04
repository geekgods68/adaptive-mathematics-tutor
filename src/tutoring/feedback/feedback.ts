import type { Question } from "@/domain/questions/types";
import type { GradingResult } from "@/tutoring/grading/grade";

export type FeedbackPayload = {
  isCorrect: boolean;
  explanation: string;
  workedSolution: string;
};

/**
 * Shared between both conditions: feedback content depends only on the
 * question and the grading result, never on the experimental condition.
 */
export function buildFeedback(question: Question, gradingResult: GradingResult): FeedbackPayload {
  return {
    isCorrect: gradingResult.isCorrect,
    explanation:
      question.explanation ??
      (gradingResult.isCorrect ? "Correct." : "Not quite — review the worked solution below."),
    workedSolution: question.workedSolution,
  };
}

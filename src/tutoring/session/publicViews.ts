import type { Question } from "@/domain/questions/types";
import type { GradingResult } from "@/tutoring/grading/grade";
import { buildFeedback, type FeedbackPayload } from "@/tutoring/feedback/feedback";
import type { TutorResponse } from "@/tutoring/session/types";
import { seededShuffle } from "@/tutoring/session/optionOrder";

/**
 * What the student sees BEFORE submitting: the stem and the options'
 * display text and ids only. No `isCorrect`, `misconceptionId`,
 * `derivationNote`, `correctOptionId`, `difficulty`, `conceptIds`,
 * `workedSolution`, or `explanation` — none of that should reach the
 * client (even unrendered) before an answer is recorded, since anything
 * sent to the browser is inspectable. See docs/tutor-flow.md.
 */
export type PublicQuestionView = {
  questionId: string;
  stem: string;
  options: Array<{ id: string; display: string }>;
};

export function toPublicQuestionView(question: Question): PublicQuestionView {
  const displayOrder = seededShuffle(question.options, question.id);
  return {
    questionId: question.id,
    stem: question.stem,
    options: displayOrder.map((o) => ({ id: o.id, display: o.display })),
  };
}

/**
 * What the student sees AFTER submitting: correctness, the correct
 * option's display text, the worked solution, and the explanation. Still
 * never `misconceptionId` or `derivationNote` — those remain research
 * metadata (see docs/misconception-taxonomy.md, "Evidence vs. persistent
 * misconception").
 */
export type PublicFeedbackView = {
  isCorrect: boolean;
  selectedOptionId: string;
  correctOptionId: string;
  correctOptionDisplay: string;
  explanation: string;
  workedSolution: string;
};

export function toPublicFeedbackView(question: Question, grading: GradingResult, feedback: FeedbackPayload): PublicFeedbackView {
  const correctOption = question.options.find((o) => o.id === question.correctOptionId)!;
  return {
    isCorrect: grading.isCorrect,
    selectedOptionId: grading.selectedOptionId,
    correctOptionId: question.correctOptionId,
    correctOptionDisplay: correctOption.display,
    explanation: feedback.explanation,
    workedSolution: feedback.workedSolution,
  };
}

/**
 * Rebuilds the feedback view from an already-recorded response, for
 * restoring the feedback UI after a page refresh mid-question (see
 * docs/tutor-flow.md, "Resume behaviour"). Reuses `buildFeedback` rather
 * than duplicating its explanation-selection logic.
 */
export function toPublicFeedbackViewFromResponse(question: Question, response: TutorResponse): PublicFeedbackView {
  const selectedOption = question.options.find((o) => o.id === response.selectedOptionId)!;
  const grading: GradingResult = {
    questionId: question.id,
    selectedOptionId: response.selectedOptionId,
    isCorrect: response.isCorrect,
    selectedOption,
    misconceptionId: response.misconceptionId,
  };
  return toPublicFeedbackView(question, grading, buildFeedback(question, grading));
}

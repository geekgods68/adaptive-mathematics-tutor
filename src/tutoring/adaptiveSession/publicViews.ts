import type { Question } from "@/domain/questions/types";
import type { GradingResult } from "@/tutoring/grading/grade";
import { buildFeedback, type FeedbackPayload } from "@/tutoring/feedback/feedback";
import { seededShuffle } from "@/tutoring/session/optionOrder";
import type { AdaptiveSelectionTrace } from "@/tutoring/selection/adaptive/types";
import { explainSelection } from "@/tutoring/adaptiveSession/explanations";

/**
 * What the student sees BEFORE submitting — same non-negotiable
 * boundary as the non-adaptive condition's `PublicQuestionView`
 * (src/tutoring/session/publicViews.ts): no `isCorrect`,
 * `misconceptionId`, `derivationNote`, `correctOptionId`, `difficulty`,
 * or `conceptIds`.
 *
 * `selectionExplanation` is deliberately the only addition over the
 * non-adaptive view, and deliberately does NOT include a raw concept
 * name or id: a concept name is 1:1 derived from `conceptIds` and would
 * leak the same information the hard constraint names explicitly (which
 * concept/prerequisite the policy is targeting) just spelled out in
 * words instead of an id. The plain-language explanation
 * (`explainSelection`) describes the SELECTION PROCESS ("revisiting an
 * earlier concept," "moving to a harder question") without naming which
 * concept — which is exactly what section 8 of the Phase 7 brief asked
 * for, and no more.
 */
export type PublicAdaptiveQuestionView = {
  questionId: string;
  stem: string;
  options: Array<{ id: string; display: string }>;
  selectionExplanation: string;
};

export function toPublicAdaptiveQuestionView(question: Question, trace: AdaptiveSelectionTrace): PublicAdaptiveQuestionView {
  const displayOrder = seededShuffle(question.options, question.id);
  return {
    questionId: question.id,
    stem: question.stem,
    options: displayOrder.map((o) => ({ id: o.id, display: o.display })),
    selectionExplanation: explainSelection(trace),
  };
}

/**
 * What the student sees AFTER submitting. `misconceptionNote` is a
 * fixed, generic, non-diagnostic sentence — never the misconception's
 * own research-taxonomy description text (that wording was authored for
 * research categorization, not vetted as pedagogical copy, and
 * presenting it verbatim risks reading as "you have misconception X,"
 * which CLAUDE.md principle 7 explicitly forbids: a selected distractor
 * is evidence consistent with a misconception, never a confirmed
 * diagnosis).
 */
export type PublicAdaptiveFeedbackView = {
  isCorrect: boolean;
  selectedOptionId: string;
  correctOptionId: string;
  correctOptionDisplay: string;
  explanation: string;
  workedSolution: string;
  misconceptionNote?: string;
};

const MISCONCEPTION_NOTE = "This is a common point of confusion — review the worked solution carefully.";

export function toPublicAdaptiveFeedbackView(question: Question, grading: GradingResult, feedback: FeedbackPayload): PublicAdaptiveFeedbackView {
  const correctOption = question.options.find((o) => o.id === question.correctOptionId)!;
  return {
    isCorrect: grading.isCorrect,
    selectedOptionId: grading.selectedOptionId,
    correctOptionId: question.correctOptionId,
    correctOptionDisplay: correctOption.display,
    explanation: feedback.explanation,
    workedSolution: feedback.workedSolution,
    misconceptionNote: grading.misconceptionId ? MISCONCEPTION_NOTE : undefined,
  };
}

export function buildAdaptiveFeedback(question: Question, grading: GradingResult): PublicAdaptiveFeedbackView {
  return toPublicAdaptiveFeedbackView(question, grading, buildFeedback(question, grading));
}

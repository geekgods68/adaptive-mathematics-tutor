/**
 * The independent variable of the study. A session belongs to exactly one
 * condition for its whole duration — this is decided once, at session
 * creation, and never inferred from URL state or component-local logic
 * scattered through the UI.
 */
export type ExperimentalCondition = "adaptive" | "non_adaptive";

export type TutorSession = {
  id: string;
  participantId: string;
  condition: ExperimentalCondition;
  startedAt: string; // ISO 8601
  completedAt?: string;
  /** Question ids in the order they were actually presented, appended as the session progresses. */
  presentedQuestionIds: string[];
};

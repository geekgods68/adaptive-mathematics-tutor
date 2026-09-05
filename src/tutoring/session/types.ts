import type { TutorSession } from "@/domain/sessions/types";

export type SessionStatus = "active" | "completed";

/**
 * One recorded, graded answer. `misconceptionId` being present means
 * "this response is consistent with misconception X" — evidence, not a
 * diagnosis (see docs/misconception-taxonomy.md).
 */
export type TutorResponse = {
  questionId: string;
  selectedOptionId: string;
  correctOptionId: string;
  isCorrect: boolean;
  misconceptionId?: string;

  /** When the question this response answers was first shown. */
  presentedAt: string;
  submittedAt: string;
  /** submittedAt - presentedAt, in milliseconds. Excludes any time spent after submission reading feedback. */
  responseTimeMs: number;
};

/**
 * A live, in-progress (or just-completed) non-adaptive tutoring session.
 * Extends the Phase 0 architecture-only `TutorSession` with the state
 * needed to actually run one: a fixed `sequence` (never recomputed from
 * performance — see docs/experimental-conditions.md), where the
 * participant currently is in it, and what they've answered so far.
 */
export type ActiveTutorSession = TutorSession & {
  /** Fixed question-id order for this session, decided before it started. Never mutated. */
  sequence: string[];
  /** Index into `sequence` of the question currently being presented (or last presented, if completed). */
  currentPosition: number;
  /** When the question at `currentPosition` was first shown — the responseTimeMs baseline. */
  currentQuestionPresentedAt: string;
  responses: TutorResponse[];
  status: SessionStatus;
};

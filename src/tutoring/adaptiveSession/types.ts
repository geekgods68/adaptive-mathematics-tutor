import type { ExperimentSessionState } from "@/research/experiment/types";

/**
 * A live adaptive tutoring session — thin wrapper around a Phase 5
 * `ExperimentSessionState`, which already carries everything about the
 * session's progress (current question, responses, estimator states,
 * misconception tallies, traces, termination status). This type adds
 * only what Phase 5's generic engine has no notion of: the
 * participant-facing session identity and the chapter the student chose
 * at setup (used to rebuild the exact same `ExperimentScenario` on every
 * subsequent call — see service.ts).
 */
export interface ActiveAdaptiveSession {
  id: string;
  participantId: string;
  /** Undefined means "walk every chapter," per buildAdaptiveCurriculumOrder. */
  chapterId?: string;
  startedAt: string;
  completedAt?: string;
  experimentState: ExperimentSessionState;
  /**
   * Cross-session "already seen" question ids (oldest-first), supplied by
   * the student-facing orchestration layer at session start and carried
   * unchanged for the session's lifetime. Rebuilt into the same
   * studentSelectionAdapter.ts wrapper on every `buildAdaptiveConfig()`
   * call (start/submit/advance/summary) so the cross-session preference
   * is consistent throughout. Never read or written by Phase 5's engine
   * itself — purely a student-facing addition.
   */
  seenQuestionIdsOldestFirst: readonly string[];
}

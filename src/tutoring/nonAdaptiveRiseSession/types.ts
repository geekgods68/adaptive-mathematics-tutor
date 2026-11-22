import type { ExperimentSessionState } from "@/research/experiment/types";

/**
 * A live non-adaptive-on-RISE tutoring session — Stage 1's shared-bank
 * counterpart to `src/tutoring/adaptiveSession/types.ts`'s
 * `ActiveAdaptiveSession`, deliberately shaped the same way: a thin
 * wrapper around a Phase 5 `ExperimentSessionState` (condition C0 — null
 * estimator, non-adaptive selection, see
 * `src/research/experiment/conditions.ts`), plus only what Phase 5's
 * generic engine has no notion of.
 */
export interface ActiveNonAdaptiveRiseSession {
  id: string;
  participantId: string;
  /** Undefined means "walk every chapter." */
  chapterId?: string;
  startedAt: string;
  completedAt?: string;
  /** The fixed sequence this session is walking — stored so later calls (submit/advance) can rebuild an identical `ExperimentScenario` without recomputing the sequence (which must never change mid-session). */
  predeterminedSequence: readonly string[];
  /** The session-length budget requested at start — stored explicitly (not re-derived from `predeterminedSequence.length`, which may be shorter if the eligible pool ran out) so every later `ExperimentScenario` rebuild uses the exact same value the session started with. */
  maxQuestions: number;
  experimentState: ExperimentSessionState;
}

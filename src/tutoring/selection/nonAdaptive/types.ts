/**
 * Deliberately minimal. This type CANNOT carry mastery, misconception
 * history, recent correctness, response time, difficulty performance, or
 * concept weakness — those fields simply do not exist on it. That is the
 * enforcement mechanism: NonAdaptiveSelectionPolicy has no way to read
 * performance data even if a future edit tried to make it, short of
 * widening this type (which would be a visible, reviewable change).
 */
export type NonAdaptiveSelectionContext = {
  participantId: string;
  /** Fixed question-id order for this session, decided before the session started. */
  predeterminedSequence: string[];
  /** How many questions have already been presented in this session. */
  positionIndex: number;
};

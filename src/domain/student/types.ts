/**
 * ARCHITECTURE ONLY — Phase 0 defines this shape so later phases have
 * somewhere to store per-concept mastery evidence. Nothing in this
 * repository computes or updates a StudentModel yet, and the non-adaptive
 * condition must never read one to choose a question (see
 * docs/experimental-conditions.md).
 */
export type ConceptMastery = {
  conceptId: string;
  /** 0 (no evidence of mastery) to 1 (strong evidence of mastery). */
  mastery: number;
  attempts: number;
  correctAttempts: number;
  /** Count of times each misconceptionId was evidenced on this concept. */
  misconceptionEvidence: Record<string, number>;
};

export type StudentModel = {
  participantId: string;
  conceptMastery: Record<string, ConceptMastery>;
};

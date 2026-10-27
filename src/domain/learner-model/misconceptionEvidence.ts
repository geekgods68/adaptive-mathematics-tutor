import type { DifficultyLevel } from "@/domain/questions/types";

/**
 * Structured pass-through of one incorrect response's diagnostic
 * metadata, for a FUTURE misconception-diagnosis component (Phase 4) to
 * consume. This module does NOT classify, diagnose, or decide anything —
 * it only preserves and tallies raw evidence, per CLAUDE.md principle 7
 * ("a misconceptionId is evidence, not a diagnosis") and this phase's
 * explicit instruction not to classify a learner as possessing a
 * misconception after a single incorrect response.
 */
export interface MisconceptionEvidenceRecord {
  questionId: string;
  conceptId: string;
  selectedOptionId: string;
  /** Absent when the selected distractor doesn't map to a named misconception (see CLAUDE.md's errorType-vs-misconceptionId distinction in the sibling repo's question bank). */
  misconceptionId?: string;
  /** The RISE bank's free-text local error mechanism for this option, when present and no misconceptionId applies (see data/question-bank/README.md) — carried through unmodified as context for a future diagnostic policy, not interpreted here. */
  localErrorMechanism?: string;
  difficulty: DifficultyLevel;
  /** The question's `questionFamily` (see Question.questionFamily), when present — lets a future policy distinguish "wrong on this family repeatedly" from "wrong once." */
  questionFamily?: string;
  sequenceIndex: number;
  timestamp: string;
}

/** Per-concept tally of how many times each misconceptionId has been evidenced — a count, not a classification. Mirrors ConceptMasteryState's shape so the two can be read together. */
export type MisconceptionEvidenceTally = Record<string /* misconceptionId */, number>;

/**
 * Appends one evidence record to a running per-concept tally. Pure,
 * returns a new object. Does nothing (returns the tally unchanged,
 * ===-identical) when the record carries no misconceptionId — an
 * incorrect answer with no named-misconception distractor is still
 * evidence for the mastery update, but contributes nothing to this
 * specific tally.
 */
export function accumulateMisconceptionEvidence(
  tally: MisconceptionEvidenceTally,
  record: MisconceptionEvidenceRecord,
): MisconceptionEvidenceTally {
  if (!record.misconceptionId) return tally;
  return {
    ...tally,
    [record.misconceptionId]: (tally[record.misconceptionId] ?? 0) + 1,
  };
}

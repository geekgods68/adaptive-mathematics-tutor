import type { ConceptMasteryState } from "@/domain/learner-model/types";

/**
 * The CLIENT-SAFE subset of ConceptMasteryState -- everything needed for
 * correct continuation (mastery, initialMastery, numObservations,
 * correctCount, incorrectCount, consecutiveCorrect, consecutiveIncorrect,
 * modelVersion, timestamps), but NEVER `recentEvidence`.
 *
 * `recentEvidence: ResponseEvidenceRecord[]` carries `misconceptionId`
 * and `difficulty` per entry (src/domain/learner-model/types.ts) --
 * hard constraint 11 (CLAUDE.md) forbids sending either to the browser,
 * "because anything sent is inspectable regardless of what the UI
 * chooses to render." Dropping it costs nothing functionally:
 * `recentEvidence` is write-only audit trail inside
 * src/domain/learner-model/updateMastery.ts (appended to, never read
 * back for the mastery computation itself), and the adaptive selection
 * policy's own misconception-aware scoring reads a SEPARATE accumulator
 * (`ExperimentSessionState.misconceptionTallies`, built by
 * accumulateMisconceptionEvidence) which this module does not touch or
 * carry across sessions either, for the identical reason -- a tally
 * keyed by misconceptionId is just as forbidden to transmit.
 */
export interface PersistableConceptMasteryState {
  conceptId: string;
  mastery: number;
  initialMastery: number;
  numObservations: number;
  correctCount: number;
  incorrectCount: number;
  consecutiveCorrect: number;
  consecutiveIncorrect: number;
  modelVersion: string;
  createdAt: string;
  lastUpdatedAt: string;
}

/** Strips every field that must never cross the server/client boundary. Called once, on a completed session, before the result is returned to the client. */
export function sanitizeMasteryStatesForClient(states: Record<string, ConceptMasteryState>): Record<string, PersistableConceptMasteryState> {
  const out: Record<string, PersistableConceptMasteryState> = {};
  for (const [conceptId, state] of Object.entries(states)) {
    out[conceptId] = {
      conceptId: state.conceptId,
      mastery: state.mastery,
      initialMastery: state.initialMastery,
      numObservations: state.numObservations,
      correctCount: state.correctCount,
      incorrectCount: state.incorrectCount,
      consecutiveCorrect: state.consecutiveCorrect,
      consecutiveIncorrect: state.consecutiveIncorrect,
      modelVersion: state.modelVersion,
      createdAt: state.createdAt,
      lastUpdatedAt: state.lastUpdatedAt,
    };
  }
  return out;
}

function isFiniteInRange(value: unknown, min: number, max: number): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= min && value <= max;
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

/** Defensive, per-concept validation of a client-supplied record -- malformed, out-of-range, or wrong-version data for ONE concept is skipped (that concept falls back to cold start) rather than corrupting the formula or failing the whole session start. Never trusts the client's data as-is. */
function isValidPersistedEntry(value: unknown, expectedModelVersion: string): value is PersistableConceptMasteryState {
  if (!value || typeof value !== "object") return false;
  const v = value as Partial<PersistableConceptMasteryState>;
  return (
    typeof v.conceptId === "string" &&
    v.conceptId.length > 0 &&
    isFiniteInRange(v.mastery, 0, 1) &&
    isFiniteInRange(v.initialMastery, 0, 1) &&
    isNonNegativeInteger(v.numObservations) &&
    isNonNegativeInteger(v.correctCount) &&
    isNonNegativeInteger(v.incorrectCount) &&
    isNonNegativeInteger(v.consecutiveCorrect) &&
    isNonNegativeInteger(v.consecutiveIncorrect) &&
    v.correctCount + v.incorrectCount <= v.numObservations * 1.0001 && // allow for float safety; should be exactly equal in practice
    v.modelVersion === expectedModelVersion &&
    typeof v.createdAt === "string" &&
    typeof v.lastUpdatedAt === "string"
  );
}

export interface ReconstructResult {
  states: Record<string, ConceptMasteryState>;
  /** Concept ids present in the input but rejected (malformed, out of range, or a mismatched modelVersion) -- reported, never silently blended into the formula. */
  rejectedConceptIds: string[];
}

/**
 * Rebuilds full `ConceptMasteryState` objects for session seeding from a
 * client-supplied record of `PersistableConceptMasteryState`. Every
 * reconstructed state gets `recentEvidence: []` (never received from the
 * client, and not needed for correct continuation -- see the module
 * comment) and `lastSequenceIndex: -1` (the same cold-start sentinel
 * `createInitialConceptState` uses, src/domain/learner-model/initialize.ts) --
 * this session's own `sequenceIndex` starts at 0 independently of any
 * prior session's length, so carrying forward an old absolute sequence
 * index would make the diagnostic-backtracking staleness gap
 * (currentSequenceIndex - lastSequenceIndex) negative and never fire;
 * -1 restarts that bookkeeping cleanly within this session's own index
 * space without touching the protected staleness formula itself.
 * `learnerId` is re-stamped to the CURRENT session's participant id
 * (never validated/trusted from the client -- it is pure metadata the
 * formula never branches on, see updateMastery.ts).
 */
export function reconstructMasteryStatesForSession(
  input: unknown,
  participantId: string,
  expectedModelVersion: string,
): ReconstructResult {
  const states: Record<string, ConceptMasteryState> = {};
  const rejectedConceptIds: string[] = [];

  if (!input || typeof input !== "object") {
    return { states, rejectedConceptIds };
  }

  for (const [conceptId, entry] of Object.entries(input as Record<string, unknown>)) {
    if (!isValidPersistedEntry(entry, expectedModelVersion) || entry.conceptId !== conceptId) {
      rejectedConceptIds.push(conceptId);
      continue;
    }
    states[conceptId] = {
      learnerId: participantId,
      conceptId: entry.conceptId,
      mastery: entry.mastery,
      initialMastery: entry.initialMastery,
      numObservations: entry.numObservations,
      correctCount: entry.correctCount,
      incorrectCount: entry.incorrectCount,
      consecutiveCorrect: entry.consecutiveCorrect,
      consecutiveIncorrect: entry.consecutiveIncorrect,
      recentEvidence: [],
      modelVersion: entry.modelVersion,
      lastSequenceIndex: -1,
      createdAt: entry.createdAt,
      lastUpdatedAt: entry.lastUpdatedAt,
    } as ConceptMasteryState;
  }

  return { states, rejectedConceptIds };
}

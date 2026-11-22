/**
 * Stage 2 Layer A/B shared types — see
 * docs/stage2-research-persistence-report.md "Session persistence" and
 * "Research-event model."
 */

export type StoredSessionKind = "c0" | "c2";

/** The minimal shape every stored session envelope must have for the durable store to index and query it, without the store needing to know anything about `ExperimentSessionState`'s internals. Both `ActiveNonAdaptiveRiseSession` and `ActiveAdaptiveSession` satisfy this structurally. */
export interface StorableSessionEnvelope {
  id: string;
  participantId: string;
  startedAt: string;
  completedAt?: string;
  experimentState: {
    conditionId: string;
    status: "active" | "terminated";
    sequenceIndex: number;
    currentQuestionId: string | null;
    presentedQuestionIds: readonly string[];
    responses: readonly { sequenceIndex: number; questionId: string; isCorrect: boolean; misconceptionId?: string; timestamp: string }[];
    estimatorStates: Record<string, unknown>;
    selectionTraces: readonly unknown[];
    estimatorTraces: readonly unknown[];
  };
}

export const RESEARCH_EVENT_SCHEMA_VERSION = 1;

/** Only real, observed lifecycle transitions ever produce one of these -- see eventDerivation.ts. Nothing here is ever fabricated for a transition that didn't happen (Part 7.1: "only emit events corresponding to real state transitions"). */
export type ResearchEventType =
  | "session_created"
  | "question_selected"
  | "question_presented"
  | "answer_submitted"
  | "answer_graded"
  | "estimator_updated"
  | "selection_decision_recorded"
  | "session_advanced"
  | "session_completed"
  | "session_aborted";

export interface ResearchEvent {
  schemaVersion: number;
  eventId: string;
  sessionId: string;
  conditionId: string;
  kind: StoredSessionKind;
  /** Monotonic, unique per session -- enforced at the DB layer via UNIQUE(session_id, event_seq). */
  eventSeq: number;
  eventType: ResearchEventType;
  questionId?: string;
  /** Type-safe only informally (payload shape varies per eventType) -- kept as a loosely-typed record here so this module has no dependency on either condition's internal types; callers narrow by `eventType`. */
  payload: Record<string, unknown>;
  /** The run id this event's session corresponds to in Phase 6's `ExperimentRunArtifact`/`ExperimentProvenance` -- lets a researcher join an event-log row back to its eventual artifact export. */
  provenanceRef: string;
  createdAt: string;
}

export interface StoredSessionRow<T> {
  sessionId: string;
  kind: StoredSessionKind;
  conditionId: string;
  participantId: string;
  status: "active" | "terminated";
  startedAt: string;
  completedAt?: string;
  revision: number;
  data: T;
  createdAt: string;
  updatedAt: string;
}

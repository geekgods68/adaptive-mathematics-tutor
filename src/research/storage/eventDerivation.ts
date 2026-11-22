import { generateId } from "@/lib/id";
import { RESEARCH_EVENT_SCHEMA_VERSION } from "@/research/storage/types";
import type { ResearchEvent, StorableSessionEnvelope, StoredSessionKind } from "@/research/storage/types";

/**
 * Derives the research events implied by moving from `prev` (the
 * previously stored envelope, or `undefined` for a brand-new session) to
 * `next` (the envelope about to be saved) -- see
 * docs/stage2-research-persistence-report.md "Research-event model."
 *
 * This is a pure diff over fields the two services (nonAdaptiveRiseSession
 * and adaptiveSession) already compute via the real, unmodified Phase 5
 * engine (`startExperimentSession`/`recordExperimentResponse`/
 * `advanceExperimentSession`) -- it never invents a transition that isn't
 * visible in the data, and it requires NO changes to either service.ts
 * file's call sites (both already call `store.save(updatedSession)` at
 * exactly the moments these diffs fire).
 *
 * `eventSeq` starts at `(prev's last seq) + 1` -- the caller (durableSessionStore.ts)
 * passes in the starting sequence number already read from the DB, so this
 * function stays a pure function of its two envelope arguments.
 */
export function deriveSessionEvents(
  prev: StorableSessionEnvelope | undefined,
  next: StorableSessionEnvelope,
  kind: StoredSessionKind,
  startingSeq: number,
): Omit<ResearchEvent, "eventId" | "createdAt">[] {
  const events: Omit<ResearchEvent, "eventId" | "createdAt">[] = [];
  let seq = startingSeq;
  const conditionId = next.experimentState.conditionId;
  const runId = next.id;

  const base = (eventType: ResearchEvent["eventType"], payload: Record<string, unknown>, questionId?: string) => {
    events.push({ schemaVersion: RESEARCH_EVENT_SCHEMA_VERSION, sessionId: next.id, conditionId, kind, eventSeq: seq++, eventType, questionId, payload, provenanceRef: runId });
  };

  if (!prev) {
    base("session_created", {
      participantId: next.participantId,
      startedAt: next.startedAt,
      conditionId,
      maxConfigured: next.experimentState.presentedQuestionIds.length,
    });
    if (next.experimentState.currentQuestionId) {
      base(
        "question_selected",
        { sequenceIndex: next.experimentState.sequenceIndex, selectionTrace: next.experimentState.selectionTraces.at(-1) ?? null },
        next.experimentState.currentQuestionId,
      );
      base("question_presented", { sequenceIndex: next.experimentState.sequenceIndex }, next.experimentState.currentQuestionId);
    }
    return events;
  }

  // A new response was recorded (grading + estimator update are a single atomic
  // Phase 5 transition -- recordExperimentResponse -- so they are reported together
  // rather than split into two events we cannot actually distinguish the boundary of).
  if (next.experimentState.responses.length > prev.experimentState.responses.length) {
    const newResponses = next.experimentState.responses.slice(prev.experimentState.responses.length);
    for (const response of newResponses) {
      base(
        "answer_submitted",
        { sequenceIndex: response.sequenceIndex, selectedOptionId: (response as unknown as { selectedOptionId?: string }).selectedOptionId, timestamp: response.timestamp },
        response.questionId,
      );
      base("answer_graded", { isCorrect: response.isCorrect, misconceptionId: response.misconceptionId }, response.questionId);
    }
    const estimatorChanged = JSON.stringify(next.experimentState.estimatorStates) !== JSON.stringify(prev.experimentState.estimatorStates);
    if (estimatorChanged) {
      const newTraces = next.experimentState.estimatorTraces.slice(prev.experimentState.estimatorTraces.length);
      base("estimator_updated", { estimatorStates: next.experimentState.estimatorStates, newTraces });
    }
  }

  // A new question was selected/presented (sequenceIndex advanced and/or presentedQuestionIds grew).
  if (next.experimentState.presentedQuestionIds.length > prev.experimentState.presentedQuestionIds.length) {
    const newTrace = next.experimentState.selectionTraces.at(-1) ?? null;
    const newQuestionId = next.experimentState.presentedQuestionIds.at(-1);
    base("selection_decision_recorded", { sequenceIndex: next.experimentState.sequenceIndex, trace: newTrace }, newQuestionId);
    base("session_advanced", { sequenceIndex: next.experimentState.sequenceIndex }, newQuestionId);
    if (newQuestionId) base("question_presented", { sequenceIndex: next.experimentState.sequenceIndex }, newQuestionId);
  }

  // Termination.
  if (next.experimentState.status === "terminated" && prev.experimentState.status !== "terminated") {
    const reason = (next.experimentState as unknown as { terminationReason?: string }).terminationReason;
    if (reason === "unrecoverable_error" || reason === "invalid_configuration") {
      base("session_aborted", { reason, errorMessage: (next.experimentState as unknown as { errorMessage?: string }).errorMessage });
    } else {
      base("session_completed", { reason, totalQuestions: next.experimentState.presentedQuestionIds.length, totalResponses: next.experimentState.responses.length });
    }
  }

  return events;
}

export function withGeneratedIds(events: Omit<ResearchEvent, "eventId" | "createdAt">[], timestamp: string): ResearchEvent[] {
  return events.map((e) => ({ ...e, eventId: generateId("evt"), createdAt: timestamp }));
}

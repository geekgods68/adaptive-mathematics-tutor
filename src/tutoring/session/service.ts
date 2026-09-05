import { generateId } from "@/lib/id";
import { QUESTIONS } from "@/domain/questions";
import type { Question } from "@/domain/questions/types";
import type { ResearchEvent } from "@/research/events/types";
import { gradeAnswer, type GradingResult } from "@/tutoring/grading/grade";
import { buildFeedback, type FeedbackPayload } from "@/tutoring/feedback/feedback";
import { NonAdaptiveSelectionPolicy } from "@/tutoring/selection/nonAdaptive/nonAdaptiveSelectionPolicy";
import type { NonAdaptiveSelectionContext } from "@/tutoring/selection/nonAdaptive/types";
import { NON_ADAPTIVE_STUDY_SEQUENCE } from "@/tutoring/selection/nonAdaptive/studySequence";
import { sessionResearchLogger, sessionStore } from "@/tutoring/session/store";
import type { ActiveTutorSession, TutorResponse } from "@/tutoring/session/types";
import {
  AnswerAlreadySubmittedError,
  InvalidOptionIdError,
  NoAnswerSubmittedError,
  SessionAlreadyCompletedError,
  SessionNotFoundError,
  SequencePositionOutOfRangeError,
} from "@/tutoring/session/errors";
import {
  computeResearchSessionSummary,
  computeStudentFacingSummary,
  type ResearchSessionSummary,
  type StudentFacingSummary,
} from "@/tutoring/session/summary";

/**
 * The only place in the application that decides what question comes
 * next. It is a stateless policy instance — sharing it across sessions is
 * safe. Every call goes through `NonAdaptiveSelectionContext`, which
 * structurally cannot carry performance data (see
 * src/tutoring/selection/nonAdaptive/types.ts) — this is what makes
 * "next question depends only on position" a compile-time guarantee
 * rather than a convention this service happens to follow.
 */
const selectionPolicy = new NonAdaptiveSelectionPolicy();

function nowIso(): string {
  return new Date().toISOString();
}

function getQuestionOrThrow(questionId: string): Question {
  const question = QUESTIONS.find((q) => q.id === questionId);
  if (!question) {
    throw new Error(`Question "${questionId}" from the study sequence was not found in the production bank.`);
  }
  return question;
}

function requireSession(sessionId: string): ActiveTutorSession {
  const session = sessionStore.get(sessionId);
  if (!session) throw new SessionNotFoundError(sessionId);
  return session;
}

function selectQuestionIdAtPosition(session: ActiveTutorSession, position: number): string | null {
  const context: NonAdaptiveSelectionContext = {
    participantId: session.participantId,
    predeterminedSequence: session.sequence,
    positionIndex: position,
  };
  return selectionPolicy.selectNextQuestion(context).questionId;
}

function baseEventFields(session: ActiveTutorSession) {
  return {
    eventId: generateId("event"),
    timestamp: nowIso(),
    participantId: session.participantId,
    sessionId: session.id,
    condition: session.condition,
  };
}

function logEvent(event: ResearchEvent): void {
  sessionResearchLogger.log(event);
}

function presentQuestion(session: ActiveTutorSession, questionId: string): ActiveTutorSession {
  const question = getQuestionOrThrow(questionId);
  const presentedAt = nowIso();
  const updated: ActiveTutorSession = {
    ...session,
    presentedQuestionIds: [...session.presentedQuestionIds, questionId],
    currentQuestionPresentedAt: presentedAt,
  };
  logEvent({
    ...baseEventFields(updated),
    eventType: "QUESTION_PRESENTED",
    questionId: question.id,
    conceptIds: question.conceptIds,
    difficulty: question.difficulty,
  });
  return updated;
}

function completeSessionInternal(session: ActiveTutorSession): ActiveTutorSession {
  const completed: ActiveTutorSession = { ...session, status: "completed", completedAt: nowIso() };
  const totalCorrect = completed.responses.filter((r) => r.isCorrect).length;
  logEvent({
    ...baseEventFields(completed),
    eventType: "SESSION_COMPLETED",
    totalQuestions: completed.responses.length,
    totalCorrect,
  });
  return completed;
}

/** Starts a new non-adaptive session using the fixed study sequence, and presents the first question. */
export function startSession(participantId?: string): ActiveTutorSession {
  const startedAt = nowIso();
  let session: ActiveTutorSession = {
    id: generateId("session"),
    participantId: participantId ?? generateId("participant"),
    condition: "non_adaptive",
    startedAt,
    presentedQuestionIds: [],
    sequence: [...NON_ADAPTIVE_STUDY_SEQUENCE],
    currentPosition: 0,
    currentQuestionPresentedAt: startedAt,
    responses: [],
    status: "active",
  };

  logEvent({ ...baseEventFields(session), eventType: "SESSION_STARTED" });

  const firstQuestionId = selectQuestionIdAtPosition(session, 0);
  if (!firstQuestionId) {
    throw new Error("NON_ADAPTIVE_STUDY_SEQUENCE is empty — cannot start a session.");
  }
  session = presentQuestion(session, firstQuestionId);

  sessionStore.save(session);
  return session;
}

/** Read-only: does not log anything, safe to call repeatedly (e.g. on page refresh). */
export function getSession(sessionId: string): ActiveTutorSession {
  return requireSession(sessionId);
}

/** The question currently being presented (or last presented, if the session has completed). */
export function getCurrentQuestion(sessionId: string): Question {
  const session = requireSession(sessionId);
  const questionId = session.sequence[session.currentPosition];
  if (!questionId) {
    throw new SequencePositionOutOfRangeError(sessionId, session.currentPosition, session.sequence.length);
  }
  return getQuestionOrThrow(questionId);
}

export type SubmitAnswerResult = {
  session: ActiveTutorSession;
  grading: GradingResult;
  feedback: FeedbackPayload;
};

/** Grades the answer, records the response, and logs the resulting events. Does not advance the session. */
export function submitAnswer(sessionId: string, selectedOptionId: string): SubmitAnswerResult {
  const session = requireSession(sessionId);
  if (session.status === "completed") throw new SessionAlreadyCompletedError(sessionId);

  const questionId = session.sequence[session.currentPosition];
  if (!questionId) {
    throw new SequencePositionOutOfRangeError(sessionId, session.currentPosition, session.sequence.length);
  }
  if (session.responses.length > session.currentPosition) {
    throw new AnswerAlreadySubmittedError(sessionId, questionId);
  }

  const question = getQuestionOrThrow(questionId);
  if (!question.options.some((o) => o.id === selectedOptionId)) {
    throw new InvalidOptionIdError(questionId, selectedOptionId);
  }

  const submittedAt = nowIso();
  const responseTimeMs = Math.max(0, Date.parse(submittedAt) - Date.parse(session.currentQuestionPresentedAt));

  const grading = gradeAnswer(question, selectedOptionId);
  const feedback = buildFeedback(question, grading);

  const response: TutorResponse = {
    questionId,
    selectedOptionId,
    correctOptionId: question.correctOptionId,
    isCorrect: grading.isCorrect,
    misconceptionId: grading.misconceptionId,
    presentedAt: session.currentQuestionPresentedAt,
    submittedAt,
    responseTimeMs,
  };

  const updatedSession: ActiveTutorSession = { ...session, responses: [...session.responses, response] };

  logEvent({ ...baseEventFields(updatedSession), eventType: "ANSWER_SUBMITTED", questionId, selectedOptionId, responseTimeMs });
  logEvent(
    grading.isCorrect
      ? { ...baseEventFields(updatedSession), eventType: "ANSWER_CORRECT", questionId, selectedOptionId, correctOptionId: question.correctOptionId }
      : {
          ...baseEventFields(updatedSession),
          eventType: "ANSWER_INCORRECT",
          questionId,
          selectedOptionId,
          correctOptionId: question.correctOptionId,
          misconceptionId: grading.misconceptionId,
        },
  );
  if (grading.misconceptionId) {
    logEvent({ ...baseEventFields(updatedSession), eventType: "MISCONCEPTION_FLAGGED", questionId, misconceptionId: grading.misconceptionId });
  }
  logEvent({ ...baseEventFields(updatedSession), eventType: "FEEDBACK_PRESENTED", questionId });

  sessionStore.save(updatedSession);
  return { session: updatedSession, grading, feedback };
}

export type AdvanceResult = {
  session: ActiveTutorSession;
  nextQuestion: Question | null;
};

/**
 * Moves to the next question — chosen by asking `NonAdaptiveSelectionPolicy`
 * for the question at the next position, never by inspecting `responses`.
 * If the sequence is exhausted, completes the session instead.
 */
export function advanceSession(sessionId: string): AdvanceResult {
  const session = requireSession(sessionId);
  if (session.status === "completed") throw new SessionAlreadyCompletedError(sessionId);

  const currentQuestionId = session.sequence[session.currentPosition];
  if (session.responses.length <= session.currentPosition) {
    throw new NoAnswerSubmittedError(sessionId, currentQuestionId);
  }

  const nextPosition = session.currentPosition + 1;
  const nextQuestionId = nextPosition < session.sequence.length ? selectQuestionIdAtPosition(session, nextPosition) : null;

  if (!nextQuestionId) {
    const completed = completeSessionInternal(session);
    sessionStore.save(completed);
    return { session: completed, nextQuestion: null };
  }

  logEvent({ ...baseEventFields(session), eventType: "QUESTION_ADVANCED", fromQuestionId: currentQuestionId, toQuestionId: nextQuestionId });

  let updated: ActiveTutorSession = { ...session, currentPosition: nextPosition };
  updated = presentQuestion(updated, nextQuestionId);
  sessionStore.save(updated);
  return { session: updated, nextQuestion: getQuestionOrThrow(nextQuestionId) };
}

export function getStudentFacingSummary(sessionId: string): StudentFacingSummary {
  return computeStudentFacingSummary(requireSession(sessionId));
}

export function getResearchSummary(sessionId: string): ResearchSessionSummary {
  return computeResearchSessionSummary(requireSession(sessionId), QUESTIONS);
}

export type SessionExport = {
  session: {
    id: string;
    participantId: string;
    condition: ActiveTutorSession["condition"];
    startedAt: string;
    completedAt?: string;
    status: ActiveTutorSession["status"];
    sequence: string[];
    currentPosition: number;
  };
  responses: TutorResponse[];
  events: ResearchEvent[];
  summary: ResearchSessionSummary;
};

/** Everything needed to analyse this session later — see docs/session-data-schema.md. */
export function exportSession(sessionId: string): SessionExport {
  const session = requireSession(sessionId);
  const events = sessionResearchLogger.getEvents().filter((e) => e.sessionId === sessionId);
  return {
    session: {
      id: session.id,
      participantId: session.participantId,
      condition: session.condition,
      startedAt: session.startedAt,
      completedAt: session.completedAt,
      status: session.status,
      sequence: session.sequence,
      currentPosition: session.currentPosition,
    },
    responses: session.responses,
    events,
    summary: computeResearchSessionSummary(session, QUESTIONS),
  };
}

/** Development-only: discard a session's state so a fresh one can be started. */
export function resetSession(sessionId: string): void {
  sessionStore.delete(sessionId);
}

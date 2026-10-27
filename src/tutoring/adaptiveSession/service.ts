import { generateId } from "@/lib/id";
import { RISE_CONCEPTS, RISE_QUESTIONS } from "@/domain/rise";
import type { Question } from "@/domain/questions/types";
import { gradeAnswer, type GradingResult } from "@/tutoring/grading/grade";
import { EXPERIMENT_CONDITIONS } from "@/research/experiment/conditions";
import { startExperimentSession, recordExperimentResponse, advanceExperimentSession } from "@/research/experiment/sessionEngine";
import type { ExperimentConfig, ExperimentScenario } from "@/research/experiment/types";
import type { AdaptiveSelectionConfig } from "@/tutoring/selection/adaptive/config";
import type { AdaptiveSelectionTrace } from "@/tutoring/selection/adaptive/types";
import { buildAdaptiveCurriculumOrder } from "@/tutoring/adaptiveSession/curriculum";
import { adaptiveSessionStore } from "@/tutoring/adaptiveSession/store";
import type { ActiveAdaptiveSession } from "@/tutoring/adaptiveSession/types";
import { buildAdaptiveFeedback, toPublicAdaptiveQuestionView, type PublicAdaptiveFeedbackView, type PublicAdaptiveQuestionView } from "@/tutoring/adaptiveSession/publicViews";
import { buildAdaptiveSessionSummary, type AdaptiveSessionSummary } from "@/tutoring/adaptiveSession/summary";
import {
  AdaptiveAnswerAlreadySubmittedError,
  AdaptiveInvalidOptionIdError,
  AdaptiveNoAnswerSubmittedError,
  AdaptiveNoQuestionAvailableError,
  AdaptiveSessionAlreadyCompletedError,
  AdaptiveSessionNotFoundError,
} from "@/tutoring/adaptiveSession/errors";

/**
 * A UI-level session-length choice, NOT a Phase 3/4 model parameter —
 * changing this never touches the approved mastery formula or selection
 * thresholds. 20 questions is a researcher-chosen default for a
 * reasonably complete demonstration session; it has no mathematical
 * significance.
 */
export const ADAPTIVE_SESSION_MAX_QUESTIONS = 20;

/**
 * Condition C2 — deterministic mastery Variant B (inverse difficulty
 * weighting) + prerequisite-aware adaptive selection — is the approved
 * PROVISIONAL default per docs/research-decisions.md RD-0004/RD-0006 and
 * this phase's own instruction ("default to the currently-configured
 * inverse difficulty-weighted variant"). Built fresh per call rather
 * than once at module scope so each session's config is an independent,
 * immutable snapshot — cheap, since `EXPERIMENT_CONDITIONS.C2.build()`
 * only constructs plain adapter objects, no I/O.
 */
function buildAdaptiveConfig(): ExperimentConfig {
  return EXPERIMENT_CONDITIONS.C2.build();
}

function getAdaptiveSelectionConfig(config: ExperimentConfig): AdaptiveSelectionConfig {
  return config.selection.parameters as unknown as AdaptiveSelectionConfig;
}

function buildAdaptiveScenario(session: Pick<ActiveAdaptiveSession, "participantId" | "chapterId" | "startedAt">): ExperimentScenario {
  const adaptiveConfig = getAdaptiveSelectionConfig(buildAdaptiveConfig());
  return {
    learnerId: session.participantId,
    availableQuestions: RISE_QUESTIONS,
    concepts: RISE_CONCEPTS,
    curriculumOrder: buildAdaptiveCurriculumOrder(session.chapterId),
    maxQuestions: ADAPTIVE_SESSION_MAX_QUESTIONS,
    completionCheck: { masteryThreshold: adaptiveConfig.masteryProgressionThreshold, minEvidenceCount: adaptiveConfig.minEvidenceCount },
    startTimestamp: session.startedAt,
  };
}

function getQuestionOrThrow(questionId: string): Question {
  const question = RISE_QUESTIONS.find((q) => q.id === questionId);
  if (!question) {
    throw new Error(`Question "${questionId}" from the adaptive session was not found in the RISE question bank.`);
  }
  return question;
}

function requireSession(sessionId: string): ActiveAdaptiveSession {
  const session = adaptiveSessionStore.get(sessionId);
  if (!session) throw new AdaptiveSessionNotFoundError(sessionId);
  return session;
}

function latestSelectionTrace(session: ActiveAdaptiveSession): AdaptiveSelectionTrace | undefined {
  const trace = session.experimentState.selectionTraces.at(-1);
  return trace as AdaptiveSelectionTrace | undefined;
}

/** Starts a brand-new adaptive session for an optional chosen chapter (undefined walks every chapter). */
export function startAdaptiveSession(chapterId?: string, participantId?: string): ActiveAdaptiveSession {
  const startedAt = new Date().toISOString();
  const id = generateId("adaptive-session");
  const resolvedParticipantId = participantId ?? generateId("participant");

  const config = buildAdaptiveConfig();
  const scenario = buildAdaptiveScenario({ participantId: resolvedParticipantId, chapterId, startedAt });
  const experimentState = startExperimentSession(config, scenario, id);

  const session: ActiveAdaptiveSession = { id, participantId: resolvedParticipantId, chapterId, startedAt, experimentState };
  adaptiveSessionStore.save(session);
  return session;
}

/** Read-only: safe to call repeatedly (e.g. on page refresh). */
export function getSession(sessionId: string): ActiveAdaptiveSession {
  return requireSession(sessionId);
}

export function getCurrentQuestion(sessionId: string): Question {
  const session = requireSession(sessionId);
  const questionId = session.experimentState.currentQuestionId;
  if (!questionId) throw new AdaptiveNoQuestionAvailableError(sessionId);
  return getQuestionOrThrow(questionId);
}

/** The sanitized, student-facing view of the current question plus the real selection explanation — see publicViews.ts for exactly what is and is not included. */
export function getCurrentPublicQuestion(sessionId: string): PublicAdaptiveQuestionView {
  const session = requireSession(sessionId);
  const question = getCurrentQuestion(sessionId);
  const trace = latestSelectionTrace(session);
  if (!trace) {
    throw new Error(`Adaptive session "${sessionId}" has a current question but no selection trace — this should never happen.`);
  }
  return toPublicAdaptiveQuestionView(question, trace);
}

export type SubmitAdaptiveAnswerResult = {
  session: ActiveAdaptiveSession;
  grading: GradingResult;
  feedback: PublicAdaptiveFeedbackView;
};

/**
 * Grades the answer and applies the Phase 3 mastery update + Phase 4
 * misconception-evidence recording by calling Phase 5's
 * `recordExperimentResponse` directly — this function does not
 * recompute, duplicate, or approximate any of that logic itself. Does
 * not advance the session (mirrors the non-adaptive
 * submitAnswer/advanceSession split in src/tutoring/session/service.ts).
 */
export function submitAdaptiveAnswer(sessionId: string, selectedOptionId: string): SubmitAdaptiveAnswerResult {
  const session = requireSession(sessionId);
  if (session.experimentState.status === "terminated") throw new AdaptiveSessionAlreadyCompletedError(sessionId);

  const questionId = session.experimentState.currentQuestionId;
  if (!questionId) throw new AdaptiveNoQuestionAvailableError(sessionId);

  // A response must not be applied more than once — same guard pattern
  // (and same underlying invariant) as the non-adaptive service.
  if (session.experimentState.responses.length > session.experimentState.sequenceIndex) {
    throw new AdaptiveAnswerAlreadySubmittedError(sessionId, questionId);
  }

  const question = getQuestionOrThrow(questionId);
  if (!question.options.some((o) => o.id === selectedOptionId)) {
    throw new AdaptiveInvalidOptionIdError(questionId, selectedOptionId);
  }

  const config = buildAdaptiveConfig();
  const scenario = buildAdaptiveScenario(session);
  const timestamp = new Date().toISOString();

  const updatedState = recordExperimentResponse(config, scenario, session.experimentState, {
    selectedOptionId,
    timestamp,
    usedHint: false, // hints are not exposed in this UI — see docs/development-log.md Phase 7 entry
  });

  const updatedSession: ActiveAdaptiveSession = { ...session, experimentState: updatedState };
  adaptiveSessionStore.save(updatedSession);

  const grading = gradeAnswer(question, selectedOptionId);
  const feedback = buildAdaptiveFeedback(question, grading);
  return { session: updatedSession, grading, feedback };
}

export type AdvanceAdaptiveResult = {
  session: ActiveAdaptiveSession;
  nextQuestion: Question | null;
};

/**
 * Moves to the next question by asking the REAL Phase 4
 * `AdaptiveSelectionPolicy` (via Phase 5's `advanceExperimentSession`)
 * for what comes next — never a simplified frontend substitute. If the
 * session's termination rules fire (question limit, mastery-based
 * completion, or an exhausted candidate pool), completes the session
 * instead.
 */
export function advanceAdaptiveSession(sessionId: string): AdvanceAdaptiveResult {
  const session = requireSession(sessionId);
  if (session.experimentState.status === "terminated") throw new AdaptiveSessionAlreadyCompletedError(sessionId);

  const currentQuestionId = session.experimentState.currentQuestionId;
  if (session.experimentState.responses.length <= session.experimentState.sequenceIndex) {
    throw new AdaptiveNoAnswerSubmittedError(sessionId, currentQuestionId ?? "unknown");
  }

  const config = buildAdaptiveConfig();
  const scenario = buildAdaptiveScenario(session);
  const updatedState = advanceExperimentSession(config, scenario, session.experimentState);

  const updatedSession: ActiveAdaptiveSession = {
    ...session,
    experimentState: updatedState,
    completedAt: updatedState.status === "terminated" ? new Date().toISOString() : undefined,
  };
  adaptiveSessionStore.save(updatedSession);

  const nextQuestion = updatedState.currentQuestionId ? getQuestionOrThrow(updatedState.currentQuestionId) : null;
  return { session: updatedSession, nextQuestion };
}

export function getAdaptiveSessionSummary(sessionId: string): AdaptiveSessionSummary {
  const session = requireSession(sessionId);
  const config = getAdaptiveSelectionConfig(buildAdaptiveConfig());
  return buildAdaptiveSessionSummary(session.experimentState, RISE_CONCEPTS, config.masteryProgressionThreshold, config.minEvidenceCount);
}

/** Development-only: discard a session's state so a fresh one can be started. */
export function resetAdaptiveSession(sessionId: string): void {
  adaptiveSessionStore.delete(sessionId);
}

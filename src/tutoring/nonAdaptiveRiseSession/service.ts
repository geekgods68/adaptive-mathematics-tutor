import { generateId } from "@/lib/id";
import { RISE_QUESTIONS, RISE_CONCEPTS } from "@/domain/rise";
import type { Question } from "@/domain/questions/types";
import { gradeAnswer, type GradingResult } from "@/tutoring/grading/grade";
import { buildFeedback } from "@/tutoring/feedback/feedback";
import { toPublicFeedbackView, toPublicQuestionView, type PublicFeedbackView, type PublicQuestionView } from "@/tutoring/session/publicViews";
import { EXPERIMENT_CONDITIONS } from "@/research/experiment/conditions";
import { startExperimentSession, recordExperimentResponse, advanceExperimentSession } from "@/research/experiment/sessionEngine";
import { buildExperimentProvenance, type ExperimentProvenance } from "@/research/experiment/provenance";
import type { ExperimentConfig, ExperimentScenario } from "@/research/experiment/types";
import { buildRiseNonAdaptiveSequence } from "@/tutoring/selection/nonAdaptive/riseSequence";
import { buildAdaptiveCurriculumOrder } from "@/domain/rise/curriculum";
import { nonAdaptiveRiseSessionStore } from "@/tutoring/nonAdaptiveRiseSession/store";
import { persistCompletedSessionArtifact } from "@/research/storage/completedSessionArtifacts";
import type { ActiveNonAdaptiveRiseSession } from "@/tutoring/nonAdaptiveRiseSession/types";
import {
  NonAdaptiveRiseAnswerAlreadySubmittedError,
  NonAdaptiveRiseInvalidOptionIdError,
  NonAdaptiveRiseNoAnswerSubmittedError,
  NonAdaptiveRiseNoQuestionAvailableError,
  NonAdaptiveRiseSessionAlreadyCompletedError,
  NonAdaptiveRiseSessionNotFoundError,
} from "@/tutoring/nonAdaptiveRiseSession/errors";

/**
 * Stage 1 (docs/research-decisions.md RD-0010): the non-adaptive
 * counterpart to `src/tutoring/adaptiveSession/service.ts`, built on the
 * SAME canonical RISE question bank, the SAME shared curriculum
 * ordering, the SAME `gradeAnswer`/feedback pipeline, and the SAME Phase
 * 5 experiment engine (`startExperimentSession`/
 * `recordExperimentResponse`/`advanceExperimentSession`) — only the
 * condition differs: `EXPERIMENT_CONDITIONS.C0` (null estimator,
 * `NonAdaptiveSelectionPolicy` walking a predetermined sequence),
 * completely unmodified, versus `C2` for the adaptive condition. This is
 * the fix for Finding F-02: the live product's adaptive and non-adaptive
 * modes now draw from one shared bank/curriculum, with question-selection
 * policy as the only experimental difference, exactly as
 * docs/research-design.md always specified.
 *
 * Session length matches the adaptive condition's own UI-level default
 * (see `ADAPTIVE_SESSION_MAX_QUESTIONS`) unless the caller requests a
 * different budget — kept as a parameter here, not a re-import of that
 * constant, so this module has no dependency on
 * `src/tutoring/adaptiveSession/` at all (two independent conditions,
 * sharing only genuinely-shared infrastructure).
 */
export const NON_ADAPTIVE_RISE_DEFAULT_MAX_QUESTIONS = 20;

function buildCondition(): ExperimentConfig {
  return EXPERIMENT_CONDITIONS.C0.build();
}

function buildScenario(
  session: Pick<ActiveNonAdaptiveRiseSession, "participantId" | "chapterId" | "startedAt" | "predeterminedSequence" | "maxQuestions">,
): ExperimentScenario {
  return {
    learnerId: session.participantId,
    availableQuestions: RISE_QUESTIONS,
    // Populated with the full concept taxonomy — same as the adaptive condition — purely so both
    // conditions' ExperimentProvenance.curriculumVersion hashes are comparable (Part 4.2/Part 8).
    // This is SAFE: createNonAdaptiveSelectionAdapter's selectNext never reads
    // SelectionAdapterInput.concepts at all (it builds a NonAdaptiveSelectionContext, which has no
    // concepts field whatsoever) — hard constraint 4 is enforced by that structural absence, not by
    // withholding data the policy never looks at in the first place.
    concepts: RISE_CONCEPTS,
    curriculumOrder: buildAdaptiveCurriculumOrder(session.chapterId),
    predeterminedSequence: [...session.predeterminedSequence],
    maxQuestions: session.maxQuestions,
    startTimestamp: session.startedAt,
    // No completionCheck: this condition's stopping rule is purely the fixed sequence length
    // (Part 5.3's "fixed-question-budget comparison"), never a mastery threshold — there is no
    // mastery to threshold against (condition C0 uses the null estimator).
  };
}

function getQuestionOrThrow(questionId: string): Question {
  const question = RISE_QUESTIONS.find((q) => q.id === questionId);
  if (!question) {
    throw new Error(`Question "${questionId}" from the non-adaptive RISE session was not found in the RISE question bank.`);
  }
  return question;
}

function requireSession(sessionId: string): ActiveNonAdaptiveRiseSession {
  const session = nonAdaptiveRiseSessionStore.get(sessionId);
  if (!session) throw new NonAdaptiveRiseSessionNotFoundError(sessionId);
  return session;
}

/**
 * Starts a brand-new non-adaptive session over the RISE bank.
 *
 * `seed` fixes the predetermined sequence deterministically (same seed +
 * chapter + exclusions + length always yields the same sequence — see
 * riseSequence.ts and Part 4.1's critical reproducibility test); callers
 * should pass something stable per participant (e.g. the participant id
 * itself) rather than a fresh random value, so a resumed/matched session
 * is reproducible. `priorSeenQuestionIds` is the SAME kind of
 * cross-session continuity input already implemented for the adaptive
 * condition (`src/lib/studentQuestionHistory.ts`) — explicitly permitted
 * for a non-adaptive control by Part 4.1 ("previously presented question
 * IDs for repetition prevention"); it is consulted ONLY when building the
 * fixed sequence, never again afterward, so it cannot make the sequence
 * depend on how the student answers.
 */
export function startNonAdaptiveRiseSession(
  chapterId: string | undefined,
  participantId: string | undefined,
  maxQuestions: number = NON_ADAPTIVE_RISE_DEFAULT_MAX_QUESTIONS,
  priorSeenQuestionIds: readonly string[] = [],
): ActiveNonAdaptiveRiseSession {
  const startedAt = new Date().toISOString();
  const id = generateId("non-adaptive-rise-session");
  const resolvedParticipantId = participantId ?? generateId("participant");

  const predeterminedSequence = buildRiseNonAdaptiveSequence({
    chapterId,
    maxQuestions,
    seed: resolvedParticipantId,
    excludeQuestionIds: priorSeenQuestionIds,
  });

  const config = buildCondition();
  const scenario = buildScenario({ participantId: resolvedParticipantId, chapterId, startedAt, predeterminedSequence, maxQuestions });
  const experimentState = startExperimentSession(config, scenario, id);

  const session: ActiveNonAdaptiveRiseSession = {
    id,
    participantId: resolvedParticipantId,
    chapterId,
    startedAt,
    predeterminedSequence,
    maxQuestions,
    experimentState,
  };
  nonAdaptiveRiseSessionStore.save(session);
  return session;
}

/** Read-only: safe to call repeatedly (e.g. on page refresh). */
export function getSession(sessionId: string): ActiveNonAdaptiveRiseSession {
  return requireSession(sessionId);
}

export function getCurrentQuestion(sessionId: string): Question {
  const session = requireSession(sessionId);
  const questionId = session.experimentState.currentQuestionId;
  if (!questionId) throw new NonAdaptiveRiseNoQuestionAvailableError(sessionId);
  return getQuestionOrThrow(questionId);
}

/** Sanitized, student-facing view — reuses the SAME `toPublicQuestionView` the legacy non-adaptive condition uses (src/tutoring/session/publicViews.ts), confirming both conditions present questions identically (Part 5.1). No selection-rationale field: unlike the adaptive condition, there is no concept/difficulty-targeting decision to explain — the sequence was fixed before the session began. */
export function getCurrentPublicQuestion(sessionId: string): PublicQuestionView {
  const question = getCurrentQuestion(sessionId);
  return toPublicQuestionView(question);
}

export type SubmitNonAdaptiveRiseAnswerResult = {
  session: ActiveNonAdaptiveRiseSession;
  grading: GradingResult;
  feedback: PublicFeedbackView;
};

/** Grades via the SAME `gradeAnswer` the legacy non-adaptive and adaptive conditions both use (Part 5.2) — this function never recomputes or approximates grading itself. Does not advance the session. */
export function submitNonAdaptiveRiseAnswer(sessionId: string, selectedOptionId: string): SubmitNonAdaptiveRiseAnswerResult {
  const session = requireSession(sessionId);
  if (session.experimentState.status === "terminated") throw new NonAdaptiveRiseSessionAlreadyCompletedError(sessionId);

  const questionId = session.experimentState.currentQuestionId;
  if (!questionId) throw new NonAdaptiveRiseNoQuestionAvailableError(sessionId);

  if (session.experimentState.responses.length > session.experimentState.sequenceIndex) {
    throw new NonAdaptiveRiseAnswerAlreadySubmittedError(sessionId, questionId);
  }

  const question = getQuestionOrThrow(questionId);
  if (!question.options.some((o) => o.id === selectedOptionId)) {
    throw new NonAdaptiveRiseInvalidOptionIdError(questionId, selectedOptionId);
  }

  const config = buildCondition();
  const scenario = buildScenario(session);
  const timestamp = new Date().toISOString();

  const updatedState = recordExperimentResponse(config, scenario, session.experimentState, {
    selectedOptionId,
    timestamp,
    usedHint: false,
  });

  const updatedSession: ActiveNonAdaptiveRiseSession = { ...session, experimentState: updatedState };
  nonAdaptiveRiseSessionStore.save(updatedSession);

  const grading = gradeAnswer(question, selectedOptionId);
  const feedback = toPublicFeedbackView(question, grading, buildFeedback(question, grading));
  return { session: updatedSession, grading, feedback };
}

export type AdvanceNonAdaptiveRiseResult = {
  session: ActiveNonAdaptiveRiseSession;
  nextQuestion: Question | null;
};

/** Moves to the next question by index into the fixed sequence (via the unmodified `NonAdaptiveSelectionPolicy`, through `createNonAdaptiveSelectionAdapter`) — never influenced by the response just submitted. */
export function advanceNonAdaptiveRiseSession(sessionId: string): AdvanceNonAdaptiveRiseResult {
  const session = requireSession(sessionId);
  if (session.experimentState.status === "terminated") throw new NonAdaptiveRiseSessionAlreadyCompletedError(sessionId);

  const currentQuestionId = session.experimentState.currentQuestionId;
  if (session.experimentState.responses.length <= session.experimentState.sequenceIndex) {
    throw new NonAdaptiveRiseNoAnswerSubmittedError(sessionId, currentQuestionId ?? "unknown");
  }

  const config = buildCondition();
  const scenario = buildScenario(session);
  const updatedState = advanceExperimentSession(config, scenario, session.experimentState);

  const updatedSession: ActiveNonAdaptiveRiseSession = {
    ...session,
    experimentState: updatedState,
    completedAt: updatedState.status === "terminated" ? new Date().toISOString() : undefined,
  };
  nonAdaptiveRiseSessionStore.save(updatedSession);

  // Stage 2 Layer C (docs/stage2-research-persistence-report.md): the instant this
  // condition's session completes, turn it into an immutable Phase 6 artifact. A
  // no-op for a still-active session (persistCompletedSessionArtifact checks status).
  persistCompletedSessionArtifact("c0", config, scenario, updatedState);

  const nextQuestion = updatedState.currentQuestionId ? getQuestionOrThrow(updatedState.currentQuestionId) : null;
  return { session: updatedSession, nextQuestion };
}

export type NonAdaptiveRiseSummary = {
  totalQuestions: number;
  correctAnswers: number;
  accuracy: number;
};

/** Student-facing summary — same shape as the legacy condition's `StudentFacingSummary` (src/tutoring/session/summary.ts), computed directly from the real recorded responses, never from an estimate. */
export function getNonAdaptiveRiseSessionSummary(sessionId: string): NonAdaptiveRiseSummary {
  const session = requireSession(sessionId);
  const responses = session.experimentState.responses;
  const total = responses.length;
  const correct = responses.filter((r) => r.isCorrect).length;
  return { totalQuestions: total, correctAnswers: correct, accuracy: total === 0 ? 0 : correct / total };
}

/** The question ids actually presented this session, in presentation order — for the client to merge into its cross-session seen-question history (the same `src/lib/studentQuestionHistory.ts` store the adaptive condition uses), so "already seen" is tracked consistently regardless of which condition a student practices in. */
export function getPresentedQuestionIds(sessionId: string): string[] {
  const session = requireSession(sessionId);
  return [...session.experimentState.presentedQuestionIds];
}

/** Development-only: discard a session's state so a fresh one can be started. */
export function resetNonAdaptiveRiseSession(sessionId: string): void {
  nonAdaptiveRiseSessionStore.delete(sessionId);
}

/**
 * Stage 1 Part 8 (shared research-data contract): the SAME canonical
 * `ExperimentProvenance` shape the adaptive condition exposes
 * (`src/tutoring/adaptiveSession/service.ts`'s `getExperimentProvenance`),
 * built by the SAME unmodified Phase 6 `buildExperimentProvenance`
 * function. Comparing the two conditions' provenance records directly
 * demonstrates shared-bank equality: both conditions'
 * `questionBankVersion.contentHash` are computed from the identical
 * `RISE_QUESTIONS` array, so they are byte-for-byte equal whenever
 * nothing about the bank has changed between the two calls — see
 * tests/tutoring/stage1/sharedBank.test.ts. `estimator`/`selectionPolicy`
 * honestly reflect condition C0 (null estimator, no probability output;
 * empty selection parameters) — nothing here is fabricated for a
 * condition that didn't run.
 */
export function getExperimentProvenance(sessionId: string): ExperimentProvenance {
  const session = requireSession(sessionId);
  const config = buildCondition();
  const scenario = buildScenario(session);
  return buildExperimentProvenance(config, scenario, session.experimentState);
}

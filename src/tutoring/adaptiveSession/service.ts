import { generateId } from "@/lib/id";
import { RISE_CONCEPTS, RISE_QUESTIONS } from "@/domain/rise";
import type { Question } from "@/domain/questions/types";
import type { ConceptMasteryState } from "@/domain/learner-model/types";
import { gradeAnswer, type GradingResult } from "@/tutoring/grading/grade";
import { EXPERIMENT_CONDITIONS } from "@/research/experiment/conditions";
import { startExperimentSession, recordExperimentResponse, advanceExperimentSession } from "@/research/experiment/sessionEngine";
import type { ExperimentConfig, ExperimentScenario } from "@/research/experiment/types";
import type { AdaptiveSelectionConfig } from "@/tutoring/selection/adaptive/config";
import type { AdaptiveSelectionTrace } from "@/tutoring/selection/adaptive/types";
import { buildAdaptiveCurriculumOrder } from "@/tutoring/adaptiveSession/curriculum";
import { adaptiveSessionStore } from "@/tutoring/adaptiveSession/store";
import { persistCompletedSessionArtifact } from "@/research/storage/completedSessionArtifacts";
import type { ActiveAdaptiveSession } from "@/tutoring/adaptiveSession/types";
import { buildAdaptiveFeedback, toPublicAdaptiveQuestionView, type PublicAdaptiveFeedbackView, type PublicAdaptiveQuestionView } from "@/tutoring/adaptiveSession/publicViews";
import { buildAdaptiveSessionSummary, type AdaptiveSessionSummary } from "@/tutoring/adaptiveSession/summary";
import { buildExperimentProvenance, type ExperimentProvenance } from "@/research/experiment/provenance";
import { createCrossSessionAwareSelectionAdapter } from "@/tutoring/adaptiveSession/studentSelectionAdapter";
import {
  reconstructMasteryStatesForSession,
  sanitizeMasteryStatesForClient,
  type PersistableConceptMasteryState,
} from "@/tutoring/adaptiveSession/masteryStateTransfer";
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
 *
 * `priorSeenQuestionIds` (oldest-first) wraps the REGISTERED C2 selection
 * adapter with a student-facing-only cross-session preference layer
 * (studentSelectionAdapter.ts) — `EXPERIMENT_CONDITIONS.C2.build()`
 * itself is called completely unmodified, so Phase 8's own use of
 * condition C2 is entirely unaffected; this wrapping happens only here,
 * for this student-facing orchestration path.
 */
function buildAdaptiveConfig(priorSeenQuestionIds: readonly string[] = []): ExperimentConfig {
  const base = EXPERIMENT_CONDITIONS.C2.build();
  if (priorSeenQuestionIds.length === 0) return base;
  return {
    ...base,
    selection: createCrossSessionAwareSelectionAdapter(base.selection, RISE_QUESTIONS, priorSeenQuestionIds),
  };
}

function getAdaptiveSelectionConfig(config: ExperimentConfig): AdaptiveSelectionConfig {
  return config.selection.parameters as unknown as AdaptiveSelectionConfig;
}

function buildAdaptiveScenario(
  session: Pick<ActiveAdaptiveSession, "participantId" | "chapterId" | "startedAt">,
  initialEstimatorStates?: Record<string, ConceptMasteryState>,
): ExperimentScenario {
  const adaptiveConfig = getAdaptiveSelectionConfig(buildAdaptiveConfig());
  return {
    learnerId: session.participantId,
    availableQuestions: RISE_QUESTIONS,
    concepts: RISE_CONCEPTS,
    curriculumOrder: buildAdaptiveCurriculumOrder(session.chapterId),
    maxQuestions: ADAPTIVE_SESSION_MAX_QUESTIONS,
    completionCheck: { masteryThreshold: adaptiveConfig.masteryProgressionThreshold, minEvidenceCount: adaptiveConfig.minEvidenceCount },
    startTimestamp: session.startedAt,
    ...(initialEstimatorStates && Object.keys(initialEstimatorStates).length > 0 ? { initialEstimatorStates } : {}),
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

/**
 * The model version reconstructed persisted states are checked against.
 * Read from a fresh, unwrapped condition-C2 build rather than hardcoded,
 * so this never drifts from whatever estimator version C2 is actually
 * configured with.
 */
function currentEstimatorModelVersion(): string {
  return EXPERIMENT_CONDITIONS.C2.build().estimator.version;
}

/**
 * Starts a brand-new adaptive session for an optional chosen chapter
 * (undefined walks every chapter).
 *
 * `priorEstimatorStates` and `seenQuestionIdsOldestFirst` are the
 * student-facing continuity seam: when supplied (from a prior completed
 * session's persisted, client-safe state), the session starts from that
 * real prior mastery state and prefers not to re-present already-seen
 * questions — both via the Phase 5 `ExperimentScenario.initialEstimatorStates`
 * integration point and the studentSelectionAdapter.ts preprocessing
 * layer, never by modifying the protected mastery/selection algorithms
 * themselves. Omitting both (or passing none) is a pure cold start,
 * identical to this function's pre-existing behavior.
 */
export function startAdaptiveSession(
  chapterId?: string,
  participantId?: string,
  priorEstimatorStates?: unknown,
  seenQuestionIdsOldestFirst: readonly string[] = [],
): ActiveAdaptiveSession {
  const startedAt = new Date().toISOString();
  const id = generateId("adaptive-session");
  const resolvedParticipantId = participantId ?? generateId("participant");

  const { states: initialEstimatorStates } = reconstructMasteryStatesForSession(
    priorEstimatorStates,
    resolvedParticipantId,
    currentEstimatorModelVersion(),
  );

  const config = buildAdaptiveConfig(seenQuestionIdsOldestFirst);
  const scenario = buildAdaptiveScenario({ participantId: resolvedParticipantId, chapterId, startedAt }, initialEstimatorStates);
  const experimentState = startExperimentSession(config, scenario, id);

  const session: ActiveAdaptiveSession = {
    id,
    participantId: resolvedParticipantId,
    chapterId,
    startedAt,
    experimentState,
    seenQuestionIdsOldestFirst,
  };
  adaptiveSessionStore.save(session);
  return session;
}

/** The client-safe mastery-state snapshot for a session, suitable for persisting and later passing back into `startAdaptiveSession`'s `priorEstimatorStates`. Safe to call at any point in a session's lifetime, not just on completion. */
export function getPersistableMasteryStates(sessionId: string): Record<string, PersistableConceptMasteryState> {
  const session = requireSession(sessionId);
  return sanitizeMasteryStatesForClient(session.experimentState.estimatorStates as Record<string, ConceptMasteryState>);
}

export interface AuthoritativeMasterySnapshot {
  modelVersion: string;
  /** Client-safe; suitable both for display (via buildProgressView) and for seeding the next session's `priorEstimatorStates`. */
  persistableStates: Record<string, PersistableConceptMasteryState>;
  fromSessionId: string;
  fromCompletedAt: string;
}

/**
 * Stage 3 Priority 2 (mastery-state duplication fix): the ONE
 * server-authoritative source for "this participant's current estimated
 * mastery" — Stage 2's own durable record of their most recently
 * COMPLETED adaptive session, never a client-side-derived or
 * independently-recomputed value. `undefined` means this participant id
 * has no durably completed adaptive session yet (a genuinely new
 * participant id, or one that has only ever done non-adaptive practice),
 * which the caller should treat as "nothing authoritative exists yet" —
 * never as "mastery is zero."
 *
 * `listCompleted` sorts ascending by `completedAt`, so `.at(-1)` is the
 * most recent; `completedAt` is set by `advanceAdaptiveSession` at the
 * exact moment `status` becomes `"terminated"`, so this can never pick up
 * a still-active session's in-progress state.
 */
export function getAuthoritativeMasteryForParticipant(participantId: string): AuthoritativeMasterySnapshot | undefined {
  const completed = adaptiveSessionStore.listCompleted({ participantId });
  const latest = completed.at(-1);
  if (!latest || !latest.completedAt) return undefined;
  const states = latest.data.experimentState.estimatorStates as Record<string, ConceptMasteryState>;
  return {
    modelVersion: currentEstimatorModelVersion(),
    persistableStates: sanitizeMasteryStatesForClient(states),
    fromSessionId: latest.sessionId,
    fromCompletedAt: latest.completedAt,
  };
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
  // Stage 3: the immediately preceding REAL trace for this session (if any), so the student-facing
  // explanation can compare two actual recorded difficulty values instead of judging the current
  // question in isolation — see explanations.ts's doc comment for why this replaced an absolute check.
  const traces = session.experimentState.selectionTraces;
  const previousTrace = traces.length >= 2 ? (traces[traces.length - 2] as AdaptiveSelectionTrace) : undefined;
  return toPublicAdaptiveQuestionView(question, trace, previousTrace?.targetDifficulty.difficulty);
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

  const config = buildAdaptiveConfig(session.seenQuestionIdsOldestFirst);
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

  const config = buildAdaptiveConfig(session.seenQuestionIdsOldestFirst);
  const scenario = buildAdaptiveScenario(session);
  const updatedState = advanceExperimentSession(config, scenario, session.experimentState);

  const updatedSession: ActiveAdaptiveSession = {
    ...session,
    experimentState: updatedState,
    completedAt: updatedState.status === "terminated" ? new Date().toISOString() : undefined,
  };
  adaptiveSessionStore.save(updatedSession);

  // Stage 2 Layer C (docs/stage2-research-persistence-report.md): the instant this
  // condition's session completes, turn it into an immutable Phase 6 artifact. A
  // no-op for a still-active session (persistCompletedSessionArtifact checks status).
  persistCompletedSessionArtifact("c2", config, scenario, updatedState);

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

/**
 * Stage 1 Part 8 (shared research-data contract, docs/research-decisions.md
 * RD-0010): the canonical `ExperimentProvenance` record for this session,
 * via the SAME unmodified Phase 6 `buildExperimentProvenance` the
 * non-adaptive-on-RISE condition now also exposes
 * (`src/tutoring/nonAdaptiveRiseSession/service.ts`'s identically-named
 * export) — both conditions' records share one schema, one bank-hash
 * definition, and one curriculum-hash definition, so they can be compared
 * directly without inventing or normalizing missing fields on either
 * side. This does not persist anything (Stage 2's job) — it is a
 * read-only snapshot of the live in-memory session, same lifetime as the
 * session itself.
 */
export function getExperimentProvenance(sessionId: string): ExperimentProvenance {
  const session = requireSession(sessionId);
  const config = buildAdaptiveConfig(session.seenQuestionIdsOldestFirst);
  const scenario = buildAdaptiveScenario(session);
  return buildExperimentProvenance(config, scenario, session.experimentState);
}

import type { Question } from "@/domain/questions/types";
import { gradeAnswer } from "@/tutoring/grading/grade";
import { accumulateMisconceptionEvidence } from "@/domain/learner-model/misconceptionEvidence";
import { validateExperimentConfig } from "@/research/experiment/validation";
import type {
  ExperimentConfig,
  ExperimentScenario,
  ExperimentSessionState,
  ExternalResponse,
  RecordedExperimentResponse,
  SelectionAdapterInput,
} from "@/research/experiment/types";

function resolveConceptWeights(question: Question): Record<string, number> {
  return question.conceptWeights ?? { [question.primaryConceptId]: 1 };
}

function getQuestionOrThrow(scenario: ExperimentScenario, questionId: string): Question {
  const question = scenario.availableQuestions.find((q) => q.id === questionId);
  if (!question) {
    throw new Error(`Question "${questionId}" is not present in this scenario's availableQuestions.`);
  }
  return question;
}

/** Duck-typed so the engine stays estimator-agnostic — works for any state shaped like { mastery, numObservations }, ConceptMasteryState included, without importing that type here. */
function isGenericallyMastered(state: unknown, masteryThreshold: number, minEvidenceCount: number): boolean {
  if (!state || typeof state !== "object") return false;
  const s = state as { mastery?: unknown; numObservations?: unknown };
  return typeof s.mastery === "number" && typeof s.numObservations === "number" && s.mastery >= masteryThreshold && s.numObservations >= minEvidenceCount;
}

function allConceptsCompleted(scenario: ExperimentScenario, estimatorStates: Record<string, unknown>): boolean {
  if (!scenario.completionCheck || scenario.curriculumOrder.length === 0) return false;
  const { masteryThreshold, minEvidenceCount } = scenario.completionCheck;
  return scenario.curriculumOrder.every((id) => isGenericallyMastered(estimatorStates[id], masteryThreshold, minEvidenceCount));
}

/**
 * Question ids that have reached `maxExposurePerQuestion` and so must be
 * hard-excluded from the next selection. Both existing selection
 * adapters already hard-exclude ANY id appearing in
 * `presentedQuestionIds` at all (an exposure cap of exactly 1) — this
 * generalizes that to a configurable cap WITHOUT changing either
 * adapter: the engine simply only forwards an id once it has actually
 * reached the cap, so a question presented fewer times than the cap
 * still looks "unseen" to the adapter.
 */
function exhaustedQuestionIds(presentedQuestionIds: string[], maxExposurePerQuestion: number): string[] {
  if (maxExposurePerQuestion <= 1) return [...new Set(presentedQuestionIds)];
  const counts = new Map<string, number>();
  for (const id of presentedQuestionIds) counts.set(id, (counts.get(id) ?? 0) + 1);
  return [...counts.entries()].filter(([, count]) => count >= maxExposurePerQuestion).map(([id]) => id);
}

function runSelection(config: ExperimentConfig, scenario: ExperimentScenario, state: ExperimentSessionState, sequenceIndex: number) {
  const input: SelectionAdapterInput = {
    learnerId: scenario.learnerId,
    sessionId: state.runId,
    sequenceIndex,
    availableQuestions: scenario.availableQuestions,
    concepts: scenario.concepts,
    curriculumOrder: scenario.curriculumOrder,
    predeterminedSequence: scenario.predeterminedSequence,
    conceptMasteryStates: state.estimatorStates,
    misconceptionTallies: state.misconceptionTallies,
    presentedQuestionIds: exhaustedQuestionIds(state.presentedQuestionIds, scenario.maxExposurePerQuestion ?? 1),
  };
  return config.selection.selectNext(input);
}

/**
 * Step 1-4 of the Phase 5 workflow: validate the configuration, cold-
 * start session state, and select the first question. Returns an
 * already-`terminated` state (reason `"invalid_configuration"`) rather
 * than throwing if `config`/`scenario` fail validation — "reject invalid
 * combinations before starting a session," as a structured outcome, not
 * an exception the caller must know to catch.
 */
export function startExperimentSession(config: ExperimentConfig, scenario: ExperimentScenario, runId: string): ExperimentSessionState {
  const base: ExperimentSessionState = {
    runId,
    conditionId: config.conditionId,
    scenarioId: scenario.scenarioId,
    learnerId: scenario.learnerId,
    sequenceIndex: 0,
    status: "active",
    currentQuestionId: null,
    estimatorStates: scenario.initialEstimatorStates ? { ...scenario.initialEstimatorStates } : {},
    misconceptionTallies: {},
    presentedQuestionIds: [],
    responses: [],
    selectionTraces: [],
    estimatorTraces: [],
  };

  const validation = validateExperimentConfig(config, scenario);
  if (!validation.valid) {
    return { ...base, status: "terminated", terminationReason: "invalid_configuration", configurationErrors: validation.errors };
  }

  const { result, trace } = runSelection(config, scenario, base, 0);
  if (result.questionId === null) {
    return { ...base, status: "terminated", terminationReason: "candidate_pool_exhausted", selectionTraces: [trace] };
  }
  return { ...base, currentQuestionId: result.questionId, presentedQuestionIds: [result.questionId], selectionTraces: [trace] };
}

/**
 * Steps 5-9: grade an EXTERNALLY supplied response (never generated by
 * this engine — see CLAUDE.md-aligned principle "no fabricated
 * learner"), update the configured estimator, update misconception
 * evidence, and record the response. Does not advance — mirrors the
 * existing non-adaptive `submitAnswer`/`advanceSession` split in
 * src/tutoring/session/service.ts.
 */
export function recordExperimentResponse(
  config: ExperimentConfig,
  scenario: ExperimentScenario,
  state: ExperimentSessionState,
  response: ExternalResponse,
): ExperimentSessionState {
  if (state.status !== "active") {
    throw new Error(`recordExperimentResponse: session "${state.runId}" is not active (status: ${state.status}).`);
  }
  if (state.currentQuestionId === null) {
    throw new Error(`recordExperimentResponse: session "${state.runId}" has no current question to respond to.`);
  }

  const question = getQuestionOrThrow(scenario, state.currentQuestionId);
  // gradeAnswer throws on an unknown selectedOptionId — this IS this
  // layer's "invalid response handling": propagate rather than silently
  // accept a response that cannot be graded.
  const grading = gradeAnswer(question, response.selectedOptionId);

  const conceptWeights = resolveConceptWeights(question);
  const { updatedStates, traces } = config.estimator.applyResponse(
    state.estimatorStates,
    {
      questionId: question.id,
      conceptWeights,
      difficulty: question.difficulty,
      correct: grading.isCorrect,
      selectedOptionId: response.selectedOptionId,
      misconceptionId: grading.misconceptionId,
      usedHint: response.usedHint ?? false,
      sequenceIndex: state.sequenceIndex,
      timestamp: response.timestamp,
    },
    scenario.learnerId,
  );

  let misconceptionTallies = state.misconceptionTallies;
  if (!grading.isCorrect) {
    for (const conceptId of Object.keys(conceptWeights)) {
      const existingTally = misconceptionTallies[conceptId] ?? {};
      const updatedTally = accumulateMisconceptionEvidence(existingTally, {
        questionId: question.id,
        conceptId,
        selectedOptionId: response.selectedOptionId,
        misconceptionId: grading.misconceptionId,
        difficulty: question.difficulty,
        questionFamily: question.questionFamily,
        sequenceIndex: state.sequenceIndex,
        timestamp: response.timestamp,
      });
      if (updatedTally !== existingTally) {
        misconceptionTallies = { ...misconceptionTallies, [conceptId]: updatedTally };
      }
    }
  }

  const recorded: RecordedExperimentResponse = {
    sequenceIndex: state.sequenceIndex,
    questionId: question.id,
    selectedOptionId: response.selectedOptionId,
    isCorrect: grading.isCorrect,
    misconceptionId: grading.misconceptionId,
    timestamp: response.timestamp,
  };

  return {
    ...state,
    estimatorStates: updatedStates,
    misconceptionTallies,
    responses: [...state.responses, recorded],
    estimatorTraces: [...state.estimatorTraces, ...traces],
  };
}

/**
 * Step 10: checks the session's termination rules in a fixed priority
 * order (question limit, then mastery-based natural completion, then
 * the selection policy's own exhaustion signal), else selects and
 * presents the next question. Deterministic given the same
 * `(config, scenario, state)` — no hidden randomness, no wall-clock
 * dependence in the decision itself (only `response.timestamp`, always
 * caller-supplied).
 */
export function advanceExperimentSession(
  config: ExperimentConfig,
  scenario: ExperimentScenario,
  state: ExperimentSessionState,
): ExperimentSessionState {
  if (state.status !== "active") {
    throw new Error(`advanceExperimentSession: session "${state.runId}" is not active.`);
  }
  if (state.responses.length <= state.sequenceIndex) {
    throw new Error(`advanceExperimentSession: no response recorded yet for question "${state.currentQuestionId}".`);
  }

  if (state.presentedQuestionIds.length >= scenario.maxQuestions) {
    return { ...state, status: "terminated", terminationReason: "question_limit_reached", currentQuestionId: null };
  }

  if (allConceptsCompleted(scenario, state.estimatorStates)) {
    return { ...state, status: "terminated", terminationReason: "completed_normally", currentQuestionId: null };
  }

  const nextSequenceIndex = state.sequenceIndex + 1;
  const { result, trace } = runSelection(config, scenario, state, nextSequenceIndex);

  if (result.questionId === null) {
    return {
      ...state,
      status: "terminated",
      terminationReason: "candidate_pool_exhausted",
      currentQuestionId: null,
      selectionTraces: [...state.selectionTraces, trace],
    };
  }

  return {
    ...state,
    sequenceIndex: nextSequenceIndex,
    currentQuestionId: result.questionId,
    presentedQuestionIds: [...state.presentedQuestionIds, result.questionId],
    selectionTraces: [...state.selectionTraces, trace],
  };
}

/**
 * A REPLACEABLE response source — the session engine never generates a
 * response itself (Phase 8 builds the real simulated-learner models).
 * Given the current state and the question about to be answered, return
 * the response to record, or `null` to stop driving the loop (the
 * caller's response supply ran out — this is NOT a termination reason;
 * the session simply stays "active" at whatever point the loop stopped).
 */
export type ExperimentResponseProvider = (state: ExperimentSessionState, question: Question) => ExternalResponse | null;

/** The simplest possible provider — plays back a fixed, pre-recorded sequence of responses in order. This is the "externally supplied sequence" the task describes, as opposed to a future simulated-learner-driven provider. */
export function createFixedResponseSequenceProvider(responses: readonly ExternalResponse[]): ExperimentResponseProvider {
  let index = 0;
  return () => {
    if (index >= responses.length) return null;
    return responses[index++];
  };
}

/**
 * Convenience driver looping select -> respond -> advance until the
 * session terminates or the response provider runs out. Not part of the
 * core pure engine (startExperimentSession/recordExperimentResponse/
 * advanceExperimentSession are the actual building blocks a caller may
 * use directly, e.g. for replay) — this exists so a test or a future
 * Phase 8 driver doesn't have to hand-write the loop. Converts any
 * thrown error into a structured `"unrecoverable_error"` termination
 * rather than propagating it, per "do not silently treat unsuccessful
 * sessions as valid completed experiments."
 */
export function runExperimentToCompletion(
  config: ExperimentConfig,
  scenario: ExperimentScenario,
  runId: string,
  provideResponse: ExperimentResponseProvider,
): ExperimentSessionState {
  let state = startExperimentSession(config, scenario, runId);
  try {
    while (state.status === "active" && state.currentQuestionId !== null) {
      const question = getQuestionOrThrow(scenario, state.currentQuestionId);
      const response = provideResponse(state, question);
      if (response === null) break;
      state = recordExperimentResponse(config, scenario, state, response);
      state = advanceExperimentSession(config, scenario, state);
    }
    return state;
  } catch (error) {
    return {
      ...state,
      status: "terminated",
      terminationReason: "unrecoverable_error",
      currentQuestionId: null,
      errorMessage: error instanceof Error ? error.message : String(error),
    };
  }
}

import { advanceExperimentSession, recordExperimentResponse, startExperimentSession } from "@/research/experiment/sessionEngine";
import type { ExperimentConfig, ExperimentScenario, ExperimentSessionState, ExternalResponse } from "@/research/experiment/types";

export interface ReplayDivergence {
  /** A dot/bracket path into ExperimentSessionState, e.g. "$.responses[2].isCorrect". */
  field: string;
  expected: unknown;
  actual: unknown;
}

export interface ReplayResult {
  replayedState: ExperimentSessionState;
  matches: boolean;
  /** The first point of disagreement, or null if the replay matched exactly. Only the FIRST divergence is reported — once one field differs, everything downstream usually differs too, so reporting more would just be noise (see requirement 10: "produce an explicit diagnostic report identifying the first divergence"). */
  firstDivergence: ReplayDivergence | null;
}

/** The only field allowed to differ between an original run and its replay by construction — every timestamp in `ExperimentSessionState` originates from a caller-supplied `ExternalResponse.timestamp` (the engine never calls Date.now() internally), so replaying the ORIGINAL response sequence reproduces every timestamp exactly; only the run identifier itself is expected to differ (a fresh replay run should not silently overwrite the original). */
function normalizeForComparison(state: ExperimentSessionState): ExperimentSessionState {
  return { ...state, runId: "" };
}

function findFirstDivergence(expected: unknown, actual: unknown, path: string): ReplayDivergence | null {
  if (expected === actual) return null;

  if (Array.isArray(expected) && Array.isArray(actual)) {
    const length = Math.max(expected.length, actual.length);
    for (let i = 0; i < length; i++) {
      const divergence = findFirstDivergence(expected[i], actual[i], `${path}[${i}]`);
      if (divergence) return divergence;
    }
    return null;
  }

  if (expected && actual && typeof expected === "object" && typeof actual === "object") {
    const keys = new Set([...Object.keys(expected as object), ...Object.keys(actual as object)]);
    for (const key of keys) {
      const divergence = findFirstDivergence((expected as Record<string, unknown>)[key], (actual as Record<string, unknown>)[key], `${path}.${key}`);
      if (divergence) return divergence;
    }
    return null;
  }

  return { field: path, expected, actual };
}

/**
 * Re-runs an experiment from the SAME initial state, dataset/curriculum,
 * configuration, and externally-supplied response sequence, and checks
 * that every question selection, grading outcome, estimator state,
 * misconception evidence, decision trace, and termination state matches
 * the original exactly (requirement 10). Never overwrites
 * `originalState` — returns a separate result for the caller to inspect.
 *
 * `replayRunId` defaults to the ORIGINAL run's id, not a relabeled one:
 * decision traces embed `sessionId` (derived from the run id) inside
 * them, so replaying under a genuinely different id is expected to
 * surface as a (correctly detected) divergence in every trace, not a
 * silently-ignored cosmetic difference. Pass an explicit `replayRunId`
 * only when deliberately checking that weaker, relabeled-reproduction
 * property instead of strict replay.
 */
export function replayExperimentSession(
  config: ExperimentConfig,
  scenario: ExperimentScenario,
  originalState: ExperimentSessionState,
  responses: readonly ExternalResponse[],
  replayRunId: string = originalState.runId,
): ReplayResult {
  let state = startExperimentSession(config, scenario, replayRunId);

  for (const response of responses) {
    if (state.status !== "active" || state.currentQuestionId === null) break;
    state = recordExperimentResponse(config, scenario, state, response);
    state = advanceExperimentSession(config, scenario, state);
  }

  const divergence = findFirstDivergence(normalizeForComparison(originalState), normalizeForComparison(state), "$");
  return { replayedState: state, matches: divergence === null, firstDivergence: divergence };
}

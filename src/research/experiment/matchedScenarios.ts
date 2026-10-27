import type { ExperimentScenario } from "@/research/experiment/types";

/**
 * Stamps the SAME `scenarioId` onto an identical starting scenario for
 * each of several condition ids — the infrastructure "matched scenario"
 * concept docs/research-decisions.md RD-0006 describes (fairness means
 * identical starting conditions, not identical question sequences; see
 * ExperimentScenario.scenarioId's own doc comment). This function makes
 * NO decision about which conditions to compare or what counts as a
 * fair comparison beyond "give them byte-identical inputs" — it is pure
 * plumbing: a shallow copy of the same scenario object per condition id,
 * all carrying the one `scenarioId`, so later grouping/export code
 * (e.g. a Phase 6 manifest, or Phase 8's own analysis) can find every
 * run that started from the same place.
 *
 * `baseScenario` must not itself carry a `scenarioId` — this function
 * is what assigns one, deliberately, so a caller can't accidentally
 * reuse a scenario object whose id was set for a different matched set.
 */
export function createMatchedScenarioSet<TConditionId extends string>(
  baseScenario: Omit<ExperimentScenario, "scenarioId">,
  conditionIds: readonly TConditionId[],
  scenarioId: string,
): Record<TConditionId, ExperimentScenario> {
  if (conditionIds.length === 0) {
    throw new Error("createMatchedScenarioSet: conditionIds must be non-empty.");
  }
  const result = {} as Record<TConditionId, ExperimentScenario>;
  for (const conditionId of conditionIds) {
    result[conditionId] = { ...baseScenario, scenarioId };
  }
  return result;
}

/** True if every given scenario shares the same `scenarioId` and the same question-bank/curriculum/limit identity — a structural check that a "matched set" is actually matched, independent of which conditions produced it. Does NOT compare response sequences or selected questions (those are expected to differ — see RD-0006). */
export function isMatchedScenarioSet(scenarios: readonly ExperimentScenario[]): boolean {
  if (scenarios.length === 0) return false;
  const [first, ...rest] = scenarios;
  return rest.every(
    (s) =>
      s.scenarioId !== undefined &&
      s.scenarioId === first.scenarioId &&
      s.availableQuestions === first.availableQuestions &&
      s.concepts === first.concepts &&
      s.curriculumOrder.length === first.curriculumOrder.length &&
      s.maxQuestions === first.maxQuestions,
  );
}

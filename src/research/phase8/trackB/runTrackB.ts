/**
 * C8 (protocol/phase8-protocol-v2.md): the Track B runner. Runs one
 * simulated learner, under one of the four Tier 1 policies (C0-C3),
 * for one (world, slice) context, over the real Phase 5 engine
 * (`runExperimentToCompletion`) -- never a second implementation of
 * selection or grading. B6.3's common-random-number matching falls out
 * automatically: calling this with the SAME (masterSeed, world, slice,
 * learnerId, family) identity across all four conditions reuses the
 * identical underlying draws, because `derive()` addresses by
 * (concept, opportunity index), never by wall-clock session position.
 */

import type { Concept } from "@/domain/concepts/types";
import type { Question } from "@/domain/questions/types";
import { EXPERIMENT_CONDITIONS } from "@/research/experiment/conditions";
import { createNullEstimatorAdapter } from "@/research/experiment/estimatorAdapter";
import { createNonAdaptiveSelectionAdapter } from "@/research/experiment/selectionAdapter";
import { buildExperimentCondition } from "@/research/experiment/conditions";
import { runExperimentToCompletion, type ExperimentResponseProvider } from "@/research/experiment/sessionEngine";
import type { ExperimentConfig, ExperimentScenario, ExternalResponse } from "@/research/experiment/types";
import type { AdaptiveSelectionTrace } from "@/tutoring/selection/adaptive/types";
import { buildC0SliceSequence } from "@/research/phase8/trackB/c0Slice";
import { effectiveConceptWeights, type SliceCandidate } from "@/research/phase8/slices/selectSlices";
import { createSimulatedLearner, type SimFamily, type DispatchQuestion, type S4Setup } from "@/research/phase8/simulator/dispatch";
import type { ConceptId, TruthRow } from "@/research/phase8/simulator/shared";
import type { SimulatorConfig } from "@/research/phase8/config/load";

export type TrackBConditionId = "C0" | "C1" | "C2" | "C3";

export interface TrackBIdentity {
  masterSeed: string;
  world: number;
  sliceId: string;
  learnerId: string;
}

/** The FULL (not single-concept-restricted) question pool for Track B: every question whose every concept lies in T_c union X_c (B6.1: "Question pool: Q_slice for every policy", with no single-concept restriction -- that is a Track-A-only rule, B5.5). */
export function trackBQuestionPool(slice: SliceCandidate, allQuestions: readonly Question[]): Question[] {
  const universe = new Set([...slice.targetConceptIds, ...slice.externalPrereqConceptIds]);
  return allQuestions.filter((q) => Object.keys(effectiveConceptWeights(q)).every((k) => universe.has(k)));
}

function curriculumOrderOf(targetConceptIds: readonly string[], concepts: readonly Concept[]): string[] {
  const byId = new Map(concepts.map((c) => [c.id, c]));
  return [...targetConceptIds].sort((a, b) => {
    const diff = (byId.get(a)?.curriculumLevel ?? 0) - (byId.get(b)?.curriculumLevel ?? 0);
    return diff !== 0 ? diff : a.localeCompare(b);
  });
}

function buildConditionConfig(conditionId: TrackBConditionId): ExperimentConfig {
  if (conditionId === "C0") {
    return buildExperimentCondition("C0", createNullEstimatorAdapter(), createNonAdaptiveSelectionAdapter());
  }
  return EXPERIMENT_CONDITIONS[conditionId].build();
}

export interface TrackBSessionResult {
  conditionId: TrackBConditionId;
  learnerId: string;
  world: number;
  sliceChapterId: string;
  terminationReason: string | undefined;
  earlyTerminated: boolean;
  stepsAdministered: number;
  kStart: number;
  kT: number;
  kX: number;
  itemsToCriterion: number | null;
  itemsToCriterionCensored: boolean;
  divertedShare: number;
  activated: boolean;
  countsByReason: Record<string, number>;
  backtrackPrecision: number | null;
  distinctItems: number;
  maxReuse: number;
}

export interface RunTrackBSessionOptions {
  conditionId: TrackBConditionId;
  identity: TrackBIdentity;
  family: SimFamily;
  slice: SliceCandidate;
  concepts: readonly Concept[];
  allQuestions: readonly Question[];
  simulatorConfig: SimulatorConfig;
  budget: number;
  s4Setup?: S4Setup;
}

/** Runs one simulated learner through one Track B condition, returning the C8.4/C8.5 outcome row. */
export function runTrackBSession(options: RunTrackBSessionOptions): TrackBSessionResult {
  const { conditionId, identity, family, slice, concepts, allQuestions, simulatorConfig, budget, s4Setup } = options;

  const pool = trackBQuestionPool(slice, allQuestions);
  const curriculumOrder = curriculumOrderOf(slice.targetConceptIds, concepts);
  const targetSet = new Set(slice.targetConceptIds);

  const learnerIdentity = { masterSeed: identity.masterSeed, family, cell: conditionId, world: identity.world, sliceId: identity.sliceId, split: "test" as const, learnerId: identity.learnerId };
  const worldCacheKey = {}; // only affects memoization, never values (derive() is pure)
  const simulatedLearner = createSimulatedLearner(family, learnerIdentity, simulatorConfig, worldCacheKey, s4Setup);

  // kStart: truth of every T_c concept BEFORE any response (cold start).
  const startTruth = new Map<ConceptId, TruthRow>();
  for (const c of slice.targetConceptIds) startTruth.set(c, simulatedLearner.truth(c));
  const kStart = mean([...startTruth.values()].map((t) => t.m));

  const truthLogByStep: Array<Map<ConceptId, TruthRow>> = [];

  const provideResponse: ExperimentResponseProvider = (_state, question) => {
    const dq: DispatchQuestion = { id: question.id, level: question.difficulty, options: question.options.length, conceptWeights: effectiveConceptWeights(question) };
    const { correct, truthByConcept } = simulatedLearner.respondAndLearn(dq);
    truthLogByStep.push(truthByConcept);
    const selectedOptionId = correct ? question.correctOptionId : (question.options.find((o) => !o.isCorrect)?.id ?? question.correctOptionId);
    const response: ExternalResponse = { selectedOptionId, timestamp: new Date(truthLogByStep.length * 1000).toISOString(), usedHint: false };
    return response;
  };

  let c0Sequence: string[] = [];
  if (conditionId === "C0") {
    c0Sequence = buildC0SliceSequence(curriculumOrder, pool, budget, { masterSeed: identity.masterSeed, world: identity.world, sliceId: identity.sliceId, learnerId: identity.learnerId });
  }
  const config = buildConditionConfig(conditionId);

  const scenario: ExperimentScenario = {
    scenarioId: `phase8b-trackB-${identity.sliceId}-${identity.world}`,
    learnerId: identity.learnerId,
    availableQuestions: pool,
    concepts: [...concepts],
    curriculumOrder,
    predeterminedSequence: conditionId === "C0" ? c0Sequence : undefined,
    maxQuestions: budget,
    maxExposurePerQuestion: 1,
    // Deliberately unset: K(T) must be measured at exactly T=budget, not at an early
    // "mastery achieved" stop (preflight finding, C8 Track B config note).
    completionCheck: undefined,
    startTimestamp: new Date(0).toISOString(),
  };

  const runId = `${conditionId}-w${identity.world}-${identity.sliceId}-${identity.learnerId}`;
  const finalState = runExperimentToCompletion(config, scenario, runId, provideResponse);

  // kT/kX: truth of T_c / X_c at the end of the session (whatever step it ended on -- intention-to-treat, B6.1).
  const endTruthT = slice.targetConceptIds.map((c) => simulatedLearner.truth(c));
  const kT = mean(endTruthT.map((t) => t.m));
  const endTruthX = slice.externalPrereqConceptIds.map((c) => simulatedLearner.truth(c));
  const kX = slice.externalPrereqConceptIds.length > 0 ? mean(endTruthX.map((t) => t.m)) : 0;

  // itemsToCriterion: first step at which every T_c concept is truly mastered; censored at budget if never reached.
  let itemsToCriterion: number | null = null;
  for (let i = 0; i < truthLogByStep.length; i++) {
    const allMastered = slice.targetConceptIds.every((c) => {
      // Use the most recent truth recorded for this concept up to step i (concepts not touched at step i keep their last known value).
      for (let j = i; j >= 0; j--) {
        const t = truthLogByStep[j].get(c);
        if (t) return t.mastered;
      }
      return startTruth.get(c)?.mastered ?? false;
    });
    if (allMastered) {
      itemsToCriterion = i + 1;
      break;
    }
  }
  const itemsToCriterionCensored = itemsToCriterion === null;

  // Selection traces (adaptive conditions only; C0/null estimator never has prerequisite/diagnostic reasons).
  const traces = (finalState.selectionTraces ?? []) as unknown as AdaptiveSelectionTrace[];
  const countsByReason: Record<string, number> = {};
  let divertedCount = 0;
  let activated = false;
  let backtrackAttempts = 0;
  let backtrackCorrect = 0;

  traces.forEach((trace, stepIndex) => {
    const reason = trace?.targetConcept?.reason;
    if (!reason) return;
    countsByReason[reason] = (countsByReason[reason] ?? 0) + 1;
    const targetConceptId = trace.targetConcept.conceptId;
    if (targetConceptId && !targetSet.has(targetConceptId)) divertedCount++;
    if ((reason === "prerequisite_backtrack" || reason === "diagnostic_probe") && targetConceptId) {
      activated = true;
      backtrackAttempts++;
      // "truly unknown/unmastered at that moment" -- look up the most recent truth for the target concept strictly BEFORE this step.
      let trulyUnmastered: boolean | null = null;
      for (let j = stepIndex - 1; j >= 0; j--) {
        const t = truthLogByStep[j]?.get(targetConceptId);
        if (t) {
          trulyUnmastered = !t.mastered;
          break;
        }
      }
      if (trulyUnmastered === null) trulyUnmastered = !(startTruth.get(targetConceptId)?.mastered ?? false);
      if (trulyUnmastered) backtrackCorrect++;
    }
  });

  const stepsAdministered = finalState.presentedQuestionIds.length;
  const divertedShare = stepsAdministered > 0 ? divertedCount / stepsAdministered : 0;
  const backtrackPrecision = backtrackAttempts > 0 ? backtrackCorrect / backtrackAttempts : null;
  const distinctItems = new Set(finalState.presentedQuestionIds).size;
  const counts = new Map<string, number>();
  for (const id of finalState.presentedQuestionIds) counts.set(id, (counts.get(id) ?? 0) + 1);
  const maxReuse = counts.size > 0 ? Math.max(...counts.values()) : 0;

  return {
    conditionId,
    learnerId: identity.learnerId,
    world: identity.world,
    sliceChapterId: identity.sliceId,
    terminationReason: finalState.terminationReason,
    earlyTerminated: stepsAdministered < budget,
    stepsAdministered,
    kStart,
    kT,
    kX,
    itemsToCriterion,
    itemsToCriterionCensored,
    divertedShare,
    activated,
    countsByReason,
    backtrackPrecision,
    distinctItems,
    maxReuse,
  };
}

function mean(values: readonly number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

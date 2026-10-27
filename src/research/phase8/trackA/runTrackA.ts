/**
 * C7.3 (protocol/phase8-protocol-v2.md): the Track A runner. For one
 * (family configuration, world, slice): generates calibration and test
 * learners, fits BKT/B0/links on calibration data only, then replays
 * every test learner's IDENTICAL response sequence through all seven
 * Tier 1 estimators with frozen fits (B4.4's fairness audit).
 */

import type { Concept } from "@/domain/concepts/types";
import type { Question } from "@/domain/questions/types";
import type { EstimatorAdapter } from "@/research/experiment/types";
import { createDeterministicEstimatorAdapter } from "@/research/experiment/estimatorAdapter";
import { DEFAULT_MODEL_PARAMETERS, DEFAULT_MODEL_PARAMETERS_V2_INVERSE_DIFFICULTY } from "@/domain/learner-model/parameters";
import type { SimulatorConfig, EstimatorConfig } from "@/research/phase8/config/load";
import type { SliceCandidate } from "@/research/phase8/slices/selectSlices";
import { generateHistorySchedule, type ScheduleIdentity } from "@/research/phase8/trackA/schedule";
import { createSimulatedLearner, type SimFamily, type DispatchQuestion } from "@/research/phase8/simulator/dispatch";
import { createBktEstimatorAdapter, type BktParams } from "@/research/phase8/estimators/bkt";
import { fitBktEm } from "@/research/phase8/estimators/bktEm";
import { createRunPropEstimatorAdapter } from "@/research/phase8/estimators/runProp";
import { createEmaEstimatorAdapter } from "@/research/phase8/estimators/ema";
import { buildBaseRateTable, type BaseRateTable } from "@/research/phase8/estimators/baseRate";
import { fitLink, type FittedLink } from "@/research/phase8/estimators/link";

export type TrackAFamilyConfig = "S1" | "S2" | "S3" | "S4-ref";

function familyOf(config: TrackAFamilyConfig): SimFamily {
  return config === "S4-ref" ? "S4" : config;
}

export interface SimulatedObservation {
  questionId: string;
  conceptId: string;
  level: number;
  optionCount: number;
  correct: boolean;
  pStarTrue: number;
  mTrue: number;
  masteredTrue: boolean;
}

export interface SimulatedLearnerHistory {
  learnerId: string;
  split: "calibration" | "test";
  observations: SimulatedObservation[];
}

const DET_A_ID = "det-a";
const DET_B_ID = "det-b";
const BKT_FIT_ID = "bkt-fit";
const BKT_DEFAULT_ID = "bkt-default";
const RUN_PROP_ID = "run-prop";
const EMA_ID = "ema";
const B0_ID = "b0";

export const TIER1_ESTIMATOR_IDS = [DET_A_ID, DET_B_ID, BKT_FIT_ID, BKT_DEFAULT_ID, RUN_PROP_ID, EMA_ID, B0_ID] as const;
export type Tier1EstimatorId = (typeof TIER1_ESTIMATOR_IDS)[number];

export interface PredictionRow {
  learnerId: string;
  step: number;
  questionId: string;
  level: number;
  conceptId: string;
  correct: boolean;
  estimator: Tier1EstimatorId;
  rawScore: number;
  pIdentity: number;
  pLink1: number | null;
  pLinkD: number | null;
  pStarHat: number;
  pStarTrue: number;
  mTrue: number;
  masteredTrue: boolean;
}

export interface LearnerMetricRow {
  learnerId: string;
  estimator: Tier1EstimatorId;
  link: "identity" | "link1" | "linkD";
  meanLogLoss: number;
  meanBrier: number;
  maeLatent: number;
  n: number;
}

export interface TrackARunResult {
  familyConfig: TrackAFamilyConfig;
  world: number;
  sliceChapterId: string;
  predictions: PredictionRow[];
  learnerMetrics: LearnerMetricRow[];
  bktFits: Record<string, ReturnType<typeof fitBktEm>>;
  links: Record<string, FittedLink>;
}

function syntheticEvidence(obs: SimulatedObservation, sequenceIndex: number) {
  return {
    questionId: obs.questionId,
    conceptWeights: { [obs.conceptId]: 1 },
    difficulty: obs.level as Question["difficulty"],
    correct: obs.correct,
    selectedOptionId: obs.correct ? "sim-correct" : "sim-incorrect",
    usedHint: false,
    sequenceIndex,
    timestamp: new Date(sequenceIndex * 1000).toISOString(),
  };
}

/** Simulates one learner's full history by replaying `schedule` through a fresh simulated learner, recording the PRE-response truth and correctness at every step (B5.3 point 4). */
function simulateLearnerHistory(
  family: SimFamily,
  id: ScheduleIdentity,
  schedule: ReturnType<typeof generateHistorySchedule>["items"],
  qSliceById: ReadonlyMap<string, Question>,
  simCfg: SimulatorConfig,
  worldCacheKey: object,
  s4Setup?: Parameters<typeof createSimulatedLearner>[4],
): SimulatedObservation[] {
  const learner = createSimulatedLearner(family, id, simCfg, worldCacheKey, s4Setup);
  const observations: SimulatedObservation[] = [];
  for (const item of schedule) {
    const question = qSliceById.get(item.questionId);
    if (!question) throw new Error(`Track A: question "${item.questionId}" not found in Q_slice.`);
    const dq: DispatchQuestion = { id: item.questionId, level: item.level, options: question.options.length, conceptWeights: { [item.conceptId]: 1 } };
    const { correct, truthByConcept } = learner.respondAndLearn(dq);
    const truth = truthByConcept.get(item.conceptId)!;
    observations.push({
      questionId: item.questionId,
      conceptId: item.conceptId,
      level: item.level,
      optionCount: question.options.length,
      correct,
      pStarTrue: truth.pStar,
      mTrue: truth.m,
      masteredTrue: truth.mastered,
    });
  }
  return observations;
}

function buildEstimatorInstances(estimatorConfig: EstimatorConfig, bktFitParamsByConcept: Map<string, BktParams>): Map<Tier1EstimatorId, EstimatorAdapter<unknown>> {
  const detA = createDeterministicEstimatorAdapter(DEFAULT_MODEL_PARAMETERS);
  const detB = createDeterministicEstimatorAdapter(DEFAULT_MODEL_PARAMETERS_V2_INVERSE_DIFFICULTY);
  const bktFit = createBktEstimatorAdapter("bkt-fit", "phase8-bkt-fit-v1", (conceptId) => {
    const p = bktFitParamsByConcept.get(conceptId);
    if (!p) throw new Error(`Track A: no BKT-fit parameters for concept "${conceptId}" -- calibration fit must run before test replay.`);
    return p;
  });
  const bktDefault = createBktEstimatorAdapter("bkt-default", "phase8-bkt-default-v1", () => estimatorConfig.bktDefault);
  return new Map<Tier1EstimatorId, EstimatorAdapter<unknown>>([
    [DET_A_ID, detA as EstimatorAdapter<unknown>],
    [DET_B_ID, detB as EstimatorAdapter<unknown>],
    [BKT_FIT_ID, bktFit as EstimatorAdapter<unknown>],
    [BKT_DEFAULT_ID, bktDefault as EstimatorAdapter<unknown>],
    [RUN_PROP_ID, createRunPropEstimatorAdapter() as EstimatorAdapter<unknown>],
    [EMA_ID, createEmaEstimatorAdapter(estimatorConfig.ema) as EstimatorAdapter<unknown>],
  ]);
}

/** Runs one estimator across one learner's full history, returning the pre-update raw score at every step (B5.3: "record... the estimator's pre-update raw score"). */
function replayEstimator(adapter: EstimatorAdapter<unknown>, learnerId: string, observations: readonly SimulatedObservation[]): number[] {
  let states: Record<string, unknown> = {};
  const rawScores: number[] = [];
  for (let i = 0; i < observations.length; i++) {
    const obs = observations[i];
    if (!(obs.conceptId in states)) {
      states = { ...states, [obs.conceptId]: adapter.initConcept(learnerId, obs.conceptId, new Date(i * 1000).toISOString()) };
    }
    const preUpdateScore = adapter.readMastery(states[obs.conceptId]);
    rawScores.push(preUpdateScore ?? 0.5);
    const { updatedStates } = adapter.applyResponse(states, syntheticEvidence(obs, i), learnerId);
    states = updatedStates;
  }
  return rawScores;
}

export interface RunTrackAOptions {
  familyConfig: TrackAFamilyConfig;
  world: number;
  slice: SliceCandidate;
  concepts: readonly Concept[];
  simulatorConfig: SimulatorConfig;
  estimatorConfig: EstimatorConfig;
  masterSeed: string;
  calLearners: number;
  testLearners: number;
  phase1PerX: number;
  phase2PerT: number;
  reviewEvery: number;
}

export function runTrackA(options: RunTrackAOptions): TrackARunResult {
  const {
    familyConfig, world, slice, concepts, simulatorConfig, estimatorConfig, masterSeed,
    calLearners, testLearners, phase1PerX, phase2PerT, reviewEvery,
  } = options;
  const family = familyOf(familyConfig);
  const qSliceById = new Map(slice.qSlice.map((q) => [q.id, q]));
  const worldCacheKey = {};
  const s4Setup = family === "S4" ? {
    concepts: concepts.map((c) => ({ id: c.id, curriculumLevel: c.curriculumLevel ?? 0, prerequisiteIds: c.prerequisiteIds })),
    lambda: simulatorConfig.S4.cells["S4-ref"].lambda,
    phi: simulatorConfig.S4.cells["S4-ref"].phi,
    isTargetConcept: (conceptId: string) => slice.targetConceptIds.includes(conceptId),
  } : undefined;

  function buildHistories(split: "calibration" | "test", count: number): SimulatedLearnerHistory[] {
    const histories: SimulatedLearnerHistory[] = [];
    for (let i = 0; i < count; i++) {
      const learnerId = `${split}-${String(i).padStart(3, "0")}`;
      const scheduleId: ScheduleIdentity = { masterSeed, family, cell: familyConfig, world, sliceId: slice.chapterId, split, learnerId };
      const { items } = generateHistorySchedule(scheduleId, slice.targetConceptIds, slice.externalPrereqConceptIds, concepts, slice.qSlice, phase1PerX, phase2PerT, reviewEvery);
      const observations = simulateLearnerHistory(family, scheduleId, items, qSliceById, simulatorConfig, worldCacheKey, s4Setup);
      histories.push({ learnerId, split, observations });
    }
    return histories;
  }

  const calibrationHistories = buildHistories("calibration", calLearners);
  const testHistories = buildHistories("test", testLearners);

  // --- Calibration: fit BKT per concept ---
  const sequencesByConceptForBkt = new Map<string, boolean[][]>();
  for (const h of calibrationHistories) {
    const byConcept = new Map<string, boolean[]>();
    for (const obs of h.observations) {
      const list = byConcept.get(obs.conceptId) ?? [];
      list.push(obs.correct);
      byConcept.set(obs.conceptId, list);
    }
    for (const [conceptId, seq] of byConcept) {
      const all = sequencesByConceptForBkt.get(conceptId) ?? [];
      all.push(seq);
      sequencesByConceptForBkt.set(conceptId, all);
    }
  }
  const bktFits: Record<string, ReturnType<typeof fitBktEm>> = {};
  const bktFitParamsByConcept = new Map<string, BktParams>();
  for (const [conceptId, sequences] of sequencesByConceptForBkt) {
    const fit = fitBktEm(sequences, estimatorConfig.bktEm, estimatorConfig.bktDefault);
    bktFits[conceptId] = fit;
    bktFitParamsByConcept.set(conceptId, fit.params);
  }

  // --- Calibration: B0 ---
  const b0Observations = calibrationHistories.flatMap((h) => h.observations.map((o) => ({ conceptId: o.conceptId, level: o.level, correct: o.correct })));
  const b0Table: BaseRateTable = buildBaseRateTable(b0Observations, estimatorConfig.baseRate.addOne);

  // --- Calibration: pre-update raw scores for the 6 updating estimators, for link fitting ---
  const estimators = buildEstimatorInstances(estimatorConfig, bktFitParamsByConcept);
  const linkTrainingRows = new Map<Tier1EstimatorId, { rawScore: number; level: number; optionCount: number; correct: boolean }[]>();
  for (const [estId, adapter] of estimators) {
    const rows: { rawScore: number; level: number; optionCount: number; correct: boolean }[] = [];
    for (const h of calibrationHistories) {
      const rawScores = replayEstimator(adapter, h.learnerId, h.observations);
      for (let i = 0; i < h.observations.length; i++) {
        rows.push({ rawScore: rawScores[i], level: h.observations[i].level, optionCount: h.observations[i].optionCount, correct: h.observations[i].correct });
      }
    }
    linkTrainingRows.set(estId, rows);
  }

  const links: Record<string, FittedLink> = {};
  for (const [estId, rows] of linkTrainingRows) {
    links[`${estId}:link-d`] = fitLink(rows, estimatorConfig.link, "link-d");
    links[`${estId}:link-1`] = fitLink(rows, estimatorConfig.link, "link-1");
  }

  // --- Test: replay every estimator over every test learner's identical history ---
  const predictions: PredictionRow[] = [];
  const learnerMetrics: LearnerMetricRow[] = [];

  for (const h of testHistories) {
    for (const [estId, adapter] of estimators) {
      const rawScores = replayEstimator(adapter, h.learnerId, h.observations);
      const linkD = links[`${estId}:link-d`];
      const link1 = links[`${estId}:link-1`];
      const rowsForMetrics: { logLoss: number; brier: number; latentError: number }[] = [];
      for (let i = 0; i < h.observations.length; i++) {
        const obs = h.observations[i];
        const rawScore = rawScores[i];
        const pLinkD = linkD.predict(rawScore, obs.level, obs.optionCount);
        const pLink1 = link1.predict(rawScore, obs.level, obs.optionCount);
        const pStarHat = linkD.predictReference(rawScore);
        predictions.push({
          learnerId: h.learnerId, step: i, questionId: obs.questionId, level: obs.level, conceptId: obs.conceptId,
          correct: obs.correct, estimator: estId, rawScore, pIdentity: rawScore, pLink1, pLinkD, pStarHat,
          pStarTrue: obs.pStarTrue, mTrue: obs.mTrue, masteredTrue: obs.masteredTrue,
        });
        const o = obs.correct ? 1 : 0;
        const pClip = Math.min(1 - 1e-4, Math.max(1e-4, pLinkD));
        const logLoss = -(o * Math.log(pClip) + (1 - o) * Math.log(1 - pClip));
        const brier = (pLinkD - o) ** 2;
        const latentError = Math.abs(pStarHat - obs.pStarTrue);
        rowsForMetrics.push({ logLoss, brier, latentError });
      }
      const n = rowsForMetrics.length;
      learnerMetrics.push({
        learnerId: h.learnerId, estimator: estId, link: "linkD", n,
        meanLogLoss: rowsForMetrics.reduce((s, r) => s + r.logLoss, 0) / n,
        meanBrier: rowsForMetrics.reduce((s, r) => s + r.brier, 0) / n,
        maeLatent: rowsForMetrics.reduce((s, r) => s + r.latentError, 0) / n,
      });
    }

    // B0: static, no link, scored directly as a probability (B4.4).
    const b0Rows: { logLoss: number; brier: number; latentError: number }[] = [];
    for (let i = 0; i < h.observations.length; i++) {
      const obs = h.observations[i];
      const pIdentity = b0Table.predict(obs.conceptId, obs.level);
      predictions.push({
        learnerId: h.learnerId, step: i, questionId: obs.questionId, level: obs.level, conceptId: obs.conceptId,
        correct: obs.correct, estimator: B0_ID, rawScore: pIdentity, pIdentity, pLink1: null, pLinkD: null,
        pStarHat: pIdentity, pStarTrue: obs.pStarTrue, mTrue: obs.mTrue, masteredTrue: obs.masteredTrue,
      });
      const o = obs.correct ? 1 : 0;
      const pClip = Math.min(1 - 1e-4, Math.max(1e-4, pIdentity));
      b0Rows.push({ logLoss: -(o * Math.log(pClip) + (1 - o) * Math.log(1 - pClip)), brier: (pIdentity - o) ** 2, latentError: Math.abs(pIdentity - obs.pStarTrue) });
    }
    const n = b0Rows.length;
    learnerMetrics.push({
      learnerId: h.learnerId, estimator: B0_ID, link: "identity", n,
      meanLogLoss: b0Rows.reduce((s, r) => s + r.logLoss, 0) / n,
      meanBrier: b0Rows.reduce((s, r) => s + r.brier, 0) / n,
      maeLatent: b0Rows.reduce((s, r) => s + r.latentError, 0) / n,
    });
  }

  return { familyConfig, world, sliceChapterId: slice.chapterId, predictions, learnerMetrics, bktFits, links };
}

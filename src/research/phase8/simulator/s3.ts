/**
 * C5/B3.3 S3 -- Practice-driven continuous learners. Precedent: the
 * Additive Factors Model (Cen, Koedinger & Junker, 2006), used here as
 * a generator. Same response mechanism as S1, but theta grows linearly
 * with counted practice opportunities, independent of correctness or
 * item difficulty.
 */

import { uniformAt, type DeriveKey } from "@/research/phase8/rng/derive";
import type { SimulatorConfig } from "@/research/phase8/config/load";
import {
  clipProb,
  conceptEasiness,
  itemDifficulty,
  itemNoiseFor,
  learnerConceptOffset,
  learnerDraws,
  learnerGuess,
  learnerNu,
  normalizedWeights,
  opportunityCounted,
  referenceGuess,
  sigma,
  type ConceptId,
  type LearnerIdentity,
  type QuestionId,
  type SimIdentity,
  type TruthRow,
} from "@/research/phase8/simulator/shared";

export interface S3Question {
  id: QuestionId;
  level: number;
  options: number;
  conceptWeights: Readonly<Record<ConceptId, number>>;
}

function etaKey(id: SimIdentity, conceptId: ConceptId): DeriveKey {
  return {
    track: "-",
    familyGroup: id.family,
    world: id.world,
    slice: id.sliceId,
    split: "-",
    learner: "-",
    stream: "conceptParams",
    concept: conceptId,
    // index 2, not 0: conceptEasiness() draws c_k via normalAt at this same
    // (family, world, slice, stream, concept) key space with its OWN index
    // 0, which internally consumes raw indices 0 and 1 (Box-Muller doubles
    // the index). Using 2 here keeps eta_k's uniform draw independent of c_k.
    index: 2,
  };
}

const etaCache = new WeakMap<object, Map<ConceptId, number>>();

/** World-level eta_k, drawn uniformly from S3.eta. */
export function s3EtaK(id: SimIdentity, conceptId: ConceptId, cfg: SimulatorConfig, worldCacheKey: object): number {
  let cache = etaCache.get(worldCacheKey);
  if (!cache) {
    cache = new Map();
    etaCache.set(worldCacheKey, cache);
  }
  const existing = cache.get(conceptId);
  if (existing !== undefined) return existing;
  const u = uniformAt(id.masterSeed, etaKey(id, conceptId));
  const [lo, hi] = cfg.S3.eta;
  const eta = lo + u * (hi - lo);
  cache.set(conceptId, eta);
  return eta;
}

export interface S3LatentState {
  /** theta_lk(0), fixed per concept once drawn. */
  theta0: Map<ConceptId, number>;
  /** Accumulated growth eta_lk * n_lk(t), starts at 0. */
  growth: Map<ConceptId, number>;
  opp: Map<ConceptId, number>;
}

export function createS3LatentState(): S3LatentState {
  return { theta0: new Map(), growth: new Map(), opp: new Map() };
}

function s3Theta0(id: LearnerIdentity, conceptId: ConceptId, cfg: SimulatorConfig, state: S3LatentState): number {
  const existing = state.theta0.get(conceptId);
  if (existing !== undefined) return existing;
  const { mu } = learnerDraws(id, cfg);
  const u = learnerConceptOffset(id, conceptId, cfg.shared.uSd);
  const c = conceptEasiness(id, conceptId, cfg.shared.cSd);
  const theta0 = mu + u + c + cfg.shared.thetaOffset;
  state.theta0.set(conceptId, theta0);
  return theta0;
}

function s3EtaLk(id: LearnerIdentity, conceptId: ConceptId, cfg: SimulatorConfig, worldCacheKey: object): number {
  const nu = learnerNu(id, cfg.S3.nuSd);
  const etaK = s3EtaK(id, conceptId, cfg, worldCacheKey);
  return etaK * Math.exp(nu);
}

function s3Theta(id: LearnerIdentity, conceptId: ConceptId, cfg: SimulatorConfig, state: S3LatentState): number {
  return s3Theta0(id, conceptId, cfg, state) + (state.growth.get(conceptId) ?? 0);
}

function thetaQ(id: LearnerIdentity, question: S3Question, cfg: SimulatorConfig, state: S3LatentState): number {
  const weights = normalizedWeights(question.conceptWeights);
  let sum = 0;
  for (const [conceptId, w] of weights) {
    sum += w * s3Theta(id, conceptId, cfg, state);
  }
  return sum;
}

export function s3Respond(
  id: LearnerIdentity,
  question: S3Question,
  cfg: SimulatorConfig,
  state: S3LatentState,
  uResponse: number,
): { correct: boolean; pCorrect: number } {
  const { gamma, s } = learnerDraws(id, cfg);
  const b = itemDifficulty(question.level, itemNoiseFor(id, question.id, cfg.shared.sigmaB), cfg.shared.delta);
  const g = learnerGuess(question.options, gamma, cfg.shared.guessClip);
  const theta = thetaQ(id, question, cfg, state);
  const pCorrect = clipProb(g + (1 - g - s) * sigma(theta - b), cfg.shared.probClip);
  return { correct: uResponse < pCorrect, pCorrect };
}

/** Pure: each counted opportunity adds eta_lk to theta, independent of correctness/difficulty (B3.3 item 6). */
export function s3Learn(
  id: LearnerIdentity,
  question: S3Question,
  cfg: SimulatorConfig,
  state: S3LatentState,
  worldCacheKey: object,
): S3LatentState {
  const weights = normalizedWeights(question.conceptWeights);
  const nextTheta0 = new Map(state.theta0);
  const nextGrowth = new Map(state.growth);
  const nextOpp = new Map(state.opp);
  for (const [conceptId, w] of weights) {
    if (w <= 0) continue;
    s3Theta0(id, conceptId, cfg, { theta0: nextTheta0, growth: nextGrowth, opp: nextOpp });
    // o_k increments unconditionally on every presentation (C4); the "counted
    // opportunity" draw uses the pre-increment index.
    const index = nextOpp.get(conceptId) ?? 0;
    nextOpp.set(conceptId, index + 1);
    if (!opportunityCounted(id, conceptId, w, index)) continue;
    const etaLk = s3EtaLk(id, conceptId, cfg, worldCacheKey);
    nextGrowth.set(conceptId, (nextGrowth.get(conceptId) ?? 0) + etaLk);
  }
  return { theta0: nextTheta0, growth: nextGrowth, opp: nextOpp };
}

export function s3Truth(id: LearnerIdentity, conceptId: ConceptId, cfg: SimulatorConfig, state: S3LatentState): TruthRow {
  const { gamma, s } = learnerDraws(id, cfg);
  const theta = s3Theta(id, conceptId, cfg, state);
  const gRef = referenceGuess(gamma, cfg.shared.guessClip);
  const pStar = clipProb(gRef + (1 - gRef - s) * sigma(theta), cfg.shared.probClip);
  const m = sigma(theta);
  return { conceptId, pStar, m, mastered: m >= cfg.shared.masteredM };
}

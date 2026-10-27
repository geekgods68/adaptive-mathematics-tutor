/**
 * C5/B3.3 S2 -- BKT-generative learners. Precedent: Corbett & Anderson
 * (1994). Binary latent state, standard 4-parameter BKT as the GROUND
 * TRUTH generator (not an estimator -- BKT-fit/BKT-default in C6 try to
 * recover these parameters from behaviour alone).
 */

import { uniformAt, type DeriveKey } from "@/research/phase8/rng/derive";
import type { SimulatorConfig } from "@/research/phase8/config/load";
import {
  normalizedWeights,
  opportunityCounted,
  opportunityKey,
  pickMixtureConcept,
  type ConceptId,
  type LearnerIdentity,
  type QuestionId,
  type SimIdentity,
  type TruthRow,
} from "@/research/phase8/simulator/shared";

export interface S2Question {
  id: QuestionId;
  conceptWeights: Readonly<Record<ConceptId, number>>;
}

export interface BktParams {
  pL0: number;
  T: number;
  G: number;
  S: number;
}

function conceptParamKey(id: SimIdentity, conceptId: ConceptId, index: number): DeriveKey {
  return {
    track: "-",
    familyGroup: id.family,
    world: id.world,
    slice: id.sliceId,
    split: "-",
    learner: "-",
    stream: "conceptParams",
    concept: conceptId,
    index,
  };
}

function lerp(u: number, [lo, hi]: [number, number]): number {
  return lo + u * (hi - lo);
}

const conceptParamsCache = new WeakMap<object, Map<ConceptId, BktParams>>();

/** World-level per-concept BKT ground-truth parameters, drawn uniformly from config ranges S2.{pL0,T,G,S}. Shared by every learner in the world. */
export function s2ConceptParams(id: SimIdentity, conceptId: ConceptId, cfg: SimulatorConfig, cacheKey: object): BktParams {
  let cache = conceptParamsCache.get(cacheKey);
  if (!cache) {
    cache = new Map();
    conceptParamsCache.set(cacheKey, cache);
  }
  const existing = cache.get(conceptId);
  if (existing) return existing;
  const pL0 = lerp(uniformAt(id.masterSeed, conceptParamKey(id, conceptId, 0)), cfg.S2.pL0);
  const T = lerp(uniformAt(id.masterSeed, conceptParamKey(id, conceptId, 1)), cfg.S2.T);
  const G = lerp(uniformAt(id.masterSeed, conceptParamKey(id, conceptId, 2)), cfg.S2.G);
  const S = lerp(uniformAt(id.masterSeed, conceptParamKey(id, conceptId, 3)), cfg.S2.S);
  const params: BktParams = { pL0, T, G, S };
  cache.set(conceptId, params);
  return params;
}

export interface S2LatentState {
  /** L_lk in {0, 1}, lazily initialised per concept on first access. */
  L: Map<ConceptId, number>;
  opp: Map<ConceptId, number>;
}

export function createS2LatentState(): S2LatentState {
  return { L: new Map(), opp: new Map() };
}

function s2InitialL(id: LearnerIdentity, conceptId: ConceptId, cfg: SimulatorConfig, worldCacheKey: object, state: S2LatentState): number {
  const existing = state.L.get(conceptId);
  if (existing !== undefined) return existing;
  const { pL0 } = s2ConceptParams(id, conceptId, cfg, worldCacheKey);
  const u = uniformAt(id.masterSeed, opportunityKey(id, "init", conceptId, 0));
  const L = u < pL0 ? 1 : 0;
  state.L.set(conceptId, L);
  return L;
}

export function s2Respond(
  id: LearnerIdentity,
  question: S2Question,
  cfg: SimulatorConfig,
  state: S2LatentState,
  worldCacheKey: object,
  uResponse: number,
): { correct: boolean; pCorrect: number; respondingConcept: ConceptId } {
  const weights = normalizedWeights(question.conceptWeights);
  const entries = [...weights.entries()];
  const primaryConceptId = entries[0][0];
  const opIndexForMixture = state.opp.get(primaryConceptId) ?? 0;
  const respondingConcept = entries.length === 1 ? primaryConceptId : pickMixtureConcept(id, weights, primaryConceptId, opIndexForMixture);
  const L = s2InitialL(id, respondingConcept, cfg, worldCacheKey, state);
  const { G, S } = s2ConceptParams(id, respondingConcept, cfg, worldCacheKey);
  const pCorrect = L * (1 - S) + (1 - L) * G;
  return { correct: uResponse < pCorrect, pCorrect, respondingConcept };
}

/** Pure: on each counted opportunity for a concept with w_qk > 0, L=0 becomes 1 with probability T_k. No forgetting. */
export function s2Learn(
  id: LearnerIdentity,
  question: S2Question,
  cfg: SimulatorConfig,
  state: S2LatentState,
  worldCacheKey: object,
): S2LatentState {
  const weights = normalizedWeights(question.conceptWeights);
  const nextL = new Map(state.L);
  const nextOpp = new Map(state.opp);
  for (const [conceptId, w] of weights) {
    if (w <= 0) continue;
    s2InitialL(id, conceptId, cfg, worldCacheKey, { L: nextL, opp: nextOpp });
    const index = nextOpp.get(conceptId) ?? 0;
    if (!opportunityCounted(id, conceptId, w, index)) continue;
    nextOpp.set(conceptId, index + 1);
    if (nextL.get(conceptId) === 0) {
      const { T } = s2ConceptParams(id, conceptId, cfg, worldCacheKey);
      const uLearn = uniformAt(id.masterSeed, opportunityKey(id, "learn", conceptId, index));
      if (uLearn < T) nextL.set(conceptId, 1);
    }
  }
  return { L: nextL, opp: nextOpp };
}

export function s2Truth(id: LearnerIdentity, conceptId: ConceptId, cfg: SimulatorConfig, state: S2LatentState, worldCacheKey: object): TruthRow {
  const L = s2InitialL(id, conceptId, cfg, worldCacheKey, state);
  const { G, S } = s2ConceptParams(id, conceptId, cfg, worldCacheKey);
  const pStar = L * (1 - S) + (1 - L) * G;
  return { conceptId, pStar, m: L, mastered: L === 1 };
}

/**
 * C5/B3.3 S4 -- Prerequisite-gated binary learners. Precedents:
 * conjunctive prerequisite structure (Doignon & Falmagne, 1985);
 * prerequisite relations in dynamic Bayesian networks (Kaser et al.,
 * 2014). The gating rule itself is [Researcher-defined]. This is the
 * only family where a true graph G* (trueGraph.ts), distinct from the
 * tutor-visible curriculum graph G, drives learning.
 */

import { uniformAt, type DeriveKey } from "@/research/phase8/rng/derive";
import type { SimulatorConfig } from "@/research/phase8/config/load";
import type { TrueGraph } from "@/research/phase8/simulator/trueGraph";
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

export interface S4Question {
  id: QuestionId;
  level: number;
  conceptWeights: Readonly<Record<ConceptId, number>>;
}

export interface S4GatedParams {
  piK: number;
  Gk: number;
  Sk: number;
  tauK: number;
}

const ZETA = 0.25;

function paramKey(id: SimIdentity, conceptId: ConceptId, index: number): DeriveKey {
  return {
    track: "-",
    familyGroup: "S4",
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

const paramsCache = new WeakMap<object, Map<ConceptId, S4GatedParams>>();

/** World-level (shared across all S4 cells) per-concept parameters: pi_k, G_k, S_k, tau_k. */
export function s4ConceptParams(
  id: SimIdentity,
  conceptId: ConceptId,
  cfg: SimulatorConfig,
  isTargetConcept: boolean,
  worldCacheKey: object,
): S4GatedParams {
  let cache = paramsCache.get(worldCacheKey);
  if (!cache) {
    cache = new Map();
    paramsCache.set(worldCacheKey, cache);
  }
  const existing = cache.get(conceptId);
  if (existing) return existing;
  const piRange = isTargetConcept ? cfg.S4.piTarget : cfg.S4.piOther;
  const piK = lerp(uniformAt(id.masterSeed, paramKey(id, conceptId, 0)), piRange);
  const Gk = lerp(uniformAt(id.masterSeed, paramKey(id, conceptId, 1)), cfg.S4.G);
  const Sk = lerp(uniformAt(id.masterSeed, paramKey(id, conceptId, 2)), cfg.S4.S);
  const tauK = lerp(uniformAt(id.masterSeed, paramKey(id, conceptId, 3)), cfg.S4.tau);
  const params: S4GatedParams = { piK, Gk, Sk, tauK };
  cache.set(conceptId, params);
  return params;
}

export interface S4LatentState {
  L: Map<ConceptId, number>;
  opp: Map<ConceptId, number>;
}

export function createS4LatentState(): S4LatentState {
  return { L: new Map(), opp: new Map() };
}

function gatingFactor(graph: TrueGraph, conceptId: ConceptId, L: ReadonlyMap<ConceptId, number>, lambda: number): number {
  const parents = graph.parentsOf.get(conceptId) ?? [];
  const allKnown = parents.every((p) => L.get(p) === 1);
  return allKnown ? 1 : lambda;
}

/**
 * Initialises L_lk(0) for every concept in `graph.topoOrder`, in that
 * order, so every concept's G*-parents already have their initial state
 * set before it is needed (valid because G*'s edges respect the same
 * topological order as G, see trueGraph.ts).
 */
export function s4InitializeAll(
  id: LearnerIdentity,
  graph: TrueGraph,
  cfg: SimulatorConfig,
  lambda: number,
  isTargetConcept: (conceptId: ConceptId) => boolean,
  worldCacheKey: object,
): S4LatentState {
  const L = new Map<ConceptId, number>();
  const opp = new Map<ConceptId, number>();
  for (const conceptId of graph.topoOrder) {
    const { piK } = s4ConceptParams(id, conceptId, cfg, isTargetConcept(conceptId), worldCacheKey);
    const kappa = gatingFactor(graph, conceptId, L, lambda);
    const u0 = uniformAt(id.masterSeed, opportunityKey(id, "init", conceptId, 0));
    L.set(conceptId, u0 < kappa * piK ? 1 : 0);
  }
  return { L, opp };
}

function slipAtLevel(Sk: number, level: number): number {
  return Sk * Math.exp(ZETA * (level - 3));
}

function guessAtLevel(Gk: number, level: number): number {
  return Gk * Math.exp(-ZETA * (level - 3));
}

export function s4Respond(
  id: LearnerIdentity,
  question: S4Question,
  cfg: SimulatorConfig,
  state: S4LatentState,
  isTargetConcept: (conceptId: ConceptId) => boolean,
  worldCacheKey: object,
  uResponse: number,
): { correct: boolean; pCorrect: number; respondingConcept: ConceptId } {
  const weights = normalizedWeights(question.conceptWeights);
  const entries = [...weights.entries()];
  const primaryConceptId = entries[0][0];
  const opIndexForMixture = state.opp.get(primaryConceptId) ?? 0;
  const respondingConcept = entries.length === 1 ? primaryConceptId : pickMixtureConcept(id, weights, primaryConceptId, opIndexForMixture);
  const L = state.L.get(respondingConcept) ?? 0;
  const { Gk, Sk } = s4ConceptParams(id, respondingConcept, cfg, isTargetConcept(respondingConcept), worldCacheKey);
  const slip = slipAtLevel(Sk, question.level);
  const guess = guessAtLevel(Gk, question.level);
  const pCorrect = L * (1 - slip) + (1 - L) * guess;
  return { correct: uResponse < pCorrect, pCorrect, respondingConcept };
}

/** Pure: on a counted opportunity, L=0 becomes 1 with probability kappa(t) * tau_k, kappa computed from the CURRENT state of G*-parents. No forgetting. */
export function s4Learn(
  id: LearnerIdentity,
  question: S4Question,
  cfg: SimulatorConfig,
  state: S4LatentState,
  graph: TrueGraph,
  lambda: number,
  isTargetConcept: (conceptId: ConceptId) => boolean,
  worldCacheKey: object,
): S4LatentState {
  const weights = normalizedWeights(question.conceptWeights);
  const nextL = new Map(state.L);
  const nextOpp = new Map(state.opp);
  for (const [conceptId, w] of weights) {
    if (w <= 0) continue;
    // o_k increments unconditionally on every presentation (C4); the "counted
    // opportunity" draw and the (conditional) transition draw both use the
    // SAME pre-increment index.
    const index = nextOpp.get(conceptId) ?? 0;
    nextOpp.set(conceptId, index + 1);
    if (!opportunityCounted(id, conceptId, w, index)) continue;
    if ((nextL.get(conceptId) ?? 0) === 0) {
      const { tauK } = s4ConceptParams(id, conceptId, cfg, isTargetConcept(conceptId), worldCacheKey);
      const kappa = gatingFactor(graph, conceptId, nextL, lambda);
      const uLearn = uniformAt(id.masterSeed, opportunityKey(id, "learn", conceptId, index));
      if (uLearn < kappa * tauK) nextL.set(conceptId, 1);
    }
  }
  return { L: nextL, opp: nextOpp };
}

export function s4Truth(
  conceptId: ConceptId,
  cfg: SimulatorConfig,
  state: S4LatentState,
  isTargetConcept: (conceptId: ConceptId) => boolean,
  id: SimIdentity,
  worldCacheKey: object,
): TruthRow {
  const L = state.L.get(conceptId) ?? 0;
  const { Gk, Sk } = s4ConceptParams(id, conceptId, cfg, isTargetConcept(conceptId), worldCacheKey);
  // Reference item is level 3, so the zeta term is e^0 = 1 (B3.2/C5).
  const pStar = L * (1 - Sk) + (1 - L) * Gk;
  return { conceptId, pStar, m: L, mastered: L === 1 };
}

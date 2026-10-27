/**
 * C5 (protocol/phase8-protocol-v2.md): shared notation and helpers for
 * all four simulator families. None of this imports from
 * `src/domain/learner-model/` or `src/tutoring/selection/` (C0.1) --
 * the simulator provides ground truth that the estimators and policies
 * under test must never see (G-13).
 */

import { derive, normalAt, uniformAt, type DeriveKey, type FamilyGroup, type Split } from "@/research/phase8/rng/derive";
import type { SimulatorConfig } from "@/research/phase8/config/load";

export type ConceptId = string;
export type QuestionId = string;

export function sigma(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

export function clip(value: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, value));
}

export function clipProb(value: number, probClip: [number, number]): number {
  return clip(value, probClip[0], probClip[1]);
}

/** Normalised concept weights w̃_qk = w_qk / Σ_j w_qj over a question's concept-weight map. */
export function normalizedWeights(weights: Readonly<Record<ConceptId, number>>): Map<ConceptId, number> {
  const total = Object.values(weights).reduce((sum, w) => sum + w, 0);
  const result = new Map<ConceptId, number>();
  for (const [k, w] of Object.entries(weights)) {
    result.set(k, total > 0 ? w / total : 0);
  }
  return result;
}

export interface SimIdentity {
  masterSeed: string;
  family: FamilyGroup;
  /** All S4 cells share the family-group "S4" for RNG purposes (B10.3); `cell` additionally names which S4 cell (S4-ref/S4-GF/S4-N/S4-GW) this world instance represents. */
  cell: string;
  sliceId: string;
  world: number;
}

function keyOf(id: SimIdentity, overrides: Partial<DeriveKey>): DeriveKey {
  return {
    track: "-",
    familyGroup: id.family,
    world: id.world,
    slice: id.sliceId,
    split: "-",
    learner: "-",
    stream: "conceptParams",
    concept: "-",
    index: 0,
    ...overrides,
  } as DeriveKey;
}

/** World-level draw: item noise ε_q ~ N(0, 0.5^2), one per question id, memoized. */
export function itemNoiseFor(id: SimIdentity, questionId: QuestionId, sigmaB: number): number {
  const z = normalAt(id.masterSeed, keyOf(id, { stream: "itemNoise", concept: questionId, index: 0 }));
  return z * sigmaB;
}

/** World-level draw: concept easiness c_k ~ N(0, 0.5^2). */
export function conceptEasiness(id: SimIdentity, conceptId: ConceptId, cSd: number): number {
  const z = normalAt(id.masterSeed, keyOf(id, { stream: "conceptParams", concept: conceptId, index: 0 }));
  return z * cSd;
}

export interface LearnerIdentity extends SimIdentity {
  split: Split;
  learnerId: string;
}

function learnerKey(id: LearnerIdentity, overrides: Partial<DeriveKey>): DeriveKey {
  return {
    track: "-",
    familyGroup: id.family,
    world: id.world,
    slice: id.sliceId,
    split: id.split,
    learner: id.learnerId,
    stream: "profile",
    concept: "-",
    index: 0,
    ...overrides,
  } as DeriveKey;
}

export interface LearnerDraws {
  mu: number;
  gamma: number;
  s: number;
}

/**
 * Learner-level draws shared across all continuous families: mu_l ~
 * N(0,1), gamma_l ~ N(0,0.05^2), s_l ~ U(0.02,0.12). nu_l (S3 only, ~
 * N(0, S3.nuSd^2)) is NOT included here -- it lives under the S3
 * config block, not `shared`, so it is drawn in s3.ts instead.
 */
export function learnerDraws(id: LearnerIdentity, cfg: SimulatorConfig): LearnerDraws {
  const mu = normalAt(id.masterSeed, learnerKey(id, { stream: "profile", concept: "mu", index: 0 })) * cfg.shared.muSd;
  const gamma = normalAt(id.masterSeed, learnerKey(id, { stream: "profile", concept: "gamma", index: 0 })) * cfg.shared.gammaSd;
  const sUniform = uniformAt(id.masterSeed, learnerKey(id, { stream: "profile", concept: "s", index: 0 }));
  const [sLo, sHi] = cfg.shared.slip;
  const s = sLo + sUniform * (sHi - sLo);
  return { mu, gamma, s };
}

/** Learner-level draw nu_l ~ N(0, nuSd^2) (S3 only; nuSd comes from S3.nuSd, not `shared`). */
export function learnerNu(id: LearnerIdentity, nuSd: number): number {
  return normalAt(id.masterSeed, learnerKey(id, { stream: "profile", concept: "nu", index: 0 })) * nuSd;
}

/** Learner-level, per-concept draw u_lk ~ N(0, 0.6^2). */
export function learnerConceptOffset(id: LearnerIdentity, conceptId: ConceptId, uSd: number): number {
  return normalAt(id.masterSeed, learnerKey(id, { stream: "profile", concept: conceptId, index: 1 })) * uSd;
}

/** Learner guess on item q: g_lq = clip(1/n_q + γ_l, 0.05, 0.45). */
export function learnerGuess(nOptions: number, gammaL: number, guessClip: [number, number]): number {
  return clip(1 / nOptions + gammaL, guessClip[0], guessClip[1]);
}

/** g_ref = clip(0.25 + γ_l, 0.05, 0.45) -- the reference item's 4-option guess rate. */
export function referenceGuess(gammaL: number, guessClip: [number, number]): number {
  return clip(0.25 + gammaL, guessClip[0], guessClip[1]);
}

/** Continuous-family item difficulty in logits: b_q = 0.6(L_q - 3) + ε_q. */
export function itemDifficulty(level: number, epsilon: number, delta: number): number {
  return delta * (level - 3) + epsilon;
}

/** Opportunity-indexed derive key for the `opp`/`learn`/`response`/`mixture` streams, keyed by (concept, index read BEFORE increment). */
export function opportunityKey(id: LearnerIdentity, stream: DeriveKey["stream"], conceptId: ConceptId, opportunityIndex: number): DeriveKey {
  return {
    track: "-",
    familyGroup: id.family,
    world: id.world,
    slice: id.sliceId,
    split: id.split,
    learner: id.learnerId,
    stream,
    concept: conceptId,
    index: opportunityIndex,
  };
}

/** Whether an opportunity on concept k is counted for this presentation: a Bernoulli(w̃_qk) draw on the `opp` stream. */
export function opportunityCounted(id: LearnerIdentity, conceptId: ConceptId, weight: number, drawIndex: number): boolean {
  const u = uniformAt(id.masterSeed, opportunityKey(id, "opp", conceptId, drawIndex));
  return u < weight;
}

/** Picks the responding concept j with probability w̃_qj (stream `mixture`) for a multi-concept item. */
export function pickMixtureConcept(id: LearnerIdentity, weights: Map<ConceptId, number>, primaryConceptId: ConceptId, opportunityIndex: number): ConceptId {
  const entries = [...weights.entries()];
  if (entries.length === 0) return primaryConceptId;
  const u = uniformAt(id.masterSeed, opportunityKey(id, "mixture", primaryConceptId, opportunityIndex));
  let cumulative = 0;
  for (const [conceptId, weight] of entries) {
    cumulative += weight;
    if (u < cumulative) return conceptId;
  }
  return entries[entries.length - 1][0];
}

export interface TruthRow {
  conceptId: ConceptId;
  pStar: number;
  m: number;
  mastered: boolean;
}

/**
 * The "response" stream draw (C4): keyed by the item's PRIMARY concept,
 * at that concept's current o_k value (read BEFORE `learn()`'s
 * unconditional increment). Every family's `*Respond` function takes
 * this as an external `uResponse` parameter rather than deriving it
 * itself, so the pure response-probability math stays independent of
 * RNG-keying concerns; this is the one place that keying happens.
 */
export function responseUniform(id: LearnerIdentity, opp: ReadonlyMap<ConceptId, number>, primaryConceptId: ConceptId): number {
  const index = opp.get(primaryConceptId) ?? 0;
  return uniformAt(id.masterSeed, opportunityKey(id, "response", primaryConceptId, index));
}

export function sha256OfKey(masterSeed: string, key: DeriveKey): string {
  return derive(masterSeed, key).toString(16);
}

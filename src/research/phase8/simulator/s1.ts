/**
 * C5/B3.3 S1 -- Stationary logistic learners. Fixed latent state (no
 * transition); a logistic-IRT response model with a guessing floor and
 * a slip ceiling.
 */

import type { SimulatorConfig } from "@/research/phase8/config/load";
import {
  clipProb,
  conceptEasiness,
  itemDifficulty,
  itemNoiseFor,
  learnerConceptOffset,
  learnerDraws,
  learnerGuess,
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

export interface S1Question {
  id: QuestionId;
  level: number;
  options: number;
  conceptWeights: Readonly<Record<ConceptId, number>>;
}

export interface S1LatentState {
  /** theta_lk per concept, fixed at creation -- S1 has no transition. */
  theta: Map<ConceptId, number>;
  /** Opportunity counts per concept (bookkeeping only; S1's latent state does not depend on it). */
  opp: Map<ConceptId, number>;
}

function worldEasiness(id: SimIdentity, conceptId: ConceptId, cfg: SimulatorConfig): number {
  return conceptEasiness(id, conceptId, cfg.shared.cSd);
}

/** theta_lk(0) = mu_l + u_lk + c_k - 1.0, memoized per concept the first time it's needed. */
export function s1Theta(id: LearnerIdentity, conceptId: ConceptId, cfg: SimulatorConfig, state: S1LatentState): number {
  const existing = state.theta.get(conceptId);
  if (existing !== undefined) return existing;
  const { mu } = learnerDraws(id, cfg);
  const u = learnerConceptOffset(id, conceptId, cfg.shared.uSd);
  const c = worldEasiness(id, conceptId, cfg);
  const theta = mu + u + c + cfg.shared.thetaOffset;
  state.theta.set(conceptId, theta);
  return theta;
}

export function createS1LatentState(): S1LatentState {
  return { theta: new Map(), opp: new Map() };
}

function thetaQ(id: LearnerIdentity, question: S1Question, cfg: SimulatorConfig, state: S1LatentState): number {
  const weights = normalizedWeights(question.conceptWeights);
  let sum = 0;
  for (const [conceptId, w] of weights) {
    sum += w * s1Theta(id, conceptId, cfg, state);
  }
  return sum;
}

export function s1Respond(
  id: LearnerIdentity,
  question: S1Question,
  cfg: SimulatorConfig,
  state: S1LatentState,
  uResponse: number,
): { correct: boolean; pCorrect: number } {
  const { gamma, s } = learnerDraws(id, cfg);
  const b = itemDifficulty(question.level, itemNoiseFor(id, question.id, cfg.shared.sigmaB), cfg.shared.delta);
  const g = learnerGuess(question.options, gamma, cfg.shared.guessClip);
  const theta = thetaQ(id, question, cfg, state);
  const pCorrect = clipProb(g + (1 - g - s) * sigma(theta - b), cfg.shared.probClip);
  return { correct: uResponse < pCorrect, pCorrect };
}

/** S1 has no transition: learn() only advances opportunity counts, latent state is unchanged. Pure: returns a new state object. */
export function s1Learn(
  id: LearnerIdentity,
  question: S1Question,
  cfg: SimulatorConfig,
  state: S1LatentState,
  opportunityDrawProvider: (conceptId: ConceptId, weight: number, index: number) => boolean,
): S1LatentState {
  const weights = normalizedWeights(question.conceptWeights);
  const nextTheta = new Map(state.theta);
  const nextOpp = new Map(state.opp);
  for (const [conceptId, w] of weights) {
    if (w <= 0) continue;
    // Ensure theta exists for every touched concept before counting.
    s1Theta(id, conceptId, cfg, { theta: nextTheta, opp: nextOpp });
    const index = nextOpp.get(conceptId) ?? 0;
    if (opportunityDrawProvider(conceptId, w, index)) {
      nextOpp.set(conceptId, index + 1);
    }
  }
  return { theta: nextTheta, opp: nextOpp };
}

export function s1DefaultOpportunityDraw(id: LearnerIdentity) {
  return (conceptId: ConceptId, weight: number, index: number) => opportunityCounted(id, conceptId, weight, index);
}

export function s1Truth(id: LearnerIdentity, conceptId: ConceptId, cfg: SimulatorConfig, state: S1LatentState): TruthRow {
  const { gamma, s } = learnerDraws(id, cfg);
  const theta = s1Theta(id, conceptId, cfg, state);
  const gRef = referenceGuess(gamma, cfg.shared.guessClip);
  const pStar = clipProb(gRef + (1 - gRef - s) * sigma(theta), cfg.shared.probClip);
  const m = sigma(theta);
  return { conceptId, pStar, m, mastered: m >= cfg.shared.masteredM };
}

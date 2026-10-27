/**
 * A single family-dispatching entry point over S1-S4 (C5), used by both
 * Track A (replaying a fixed schedule, trackA/runTrackA.ts) and Track B
 * (an ExperimentResponseProvider over live policy-selected questions,
 * trackB/*). Keeping the dispatch in one place means the per-family
 * respond/learn/truth calls and their RNG-keying (uResponse via
 * `responseUniform`, the `opp` map) are never duplicated between the
 * two tracks.
 */

import type { SimulatorConfig } from "@/research/phase8/config/load";
import { responseUniform, type ConceptId, type LearnerIdentity, type TruthRow } from "@/research/phase8/simulator/shared";
import { buildTrueGraph, type TrueGraph, type CurriculumConcept } from "@/research/phase8/simulator/trueGraph";
import { createS1LatentState, s1Respond, s1Learn, s1Truth, s1DefaultOpportunityDraw, type S1LatentState, type S1Question } from "@/research/phase8/simulator/s1";
import { createS2LatentState, s2Respond, s2Learn, s2Truth, type S2LatentState, type S2Question } from "@/research/phase8/simulator/s2";
import { createS3LatentState, s3Respond, s3Learn, s3Truth, type S3LatentState, type S3Question } from "@/research/phase8/simulator/s3";
import { s4InitializeAll, s4Respond, s4Learn, s4Truth, type S4LatentState, type S4Question } from "@/research/phase8/simulator/s4";

export type SimFamily = "S1" | "S2" | "S3" | "S4";

/**
 * The union of fields any family might need. `level` is required by S1,
 * S3, S4 (ignored by S2); `options` is required by S1, S3 only (S2/S4
 * have no option-count-dependent guess mechanism). The caller is
 * responsible for supplying a question shape valid for the family it
 * passed to `createSimulatedLearner` -- this dispatcher does not
 * re-validate that per-family precondition.
 */
export interface DispatchQuestion {
  id: string;
  level?: number;
  options?: number;
  conceptWeights: Readonly<Record<ConceptId, number>>;
}

export interface DispatchStepResult {
  correct: boolean;
  truthByConcept: Map<ConceptId, TruthRow>;
}

/** Opaque per-learner simulated state, one instance per (family, world, slice, split, learner). */
export interface SimulatedLearner {
  readonly family: SimFamily;
  respondAndLearn(question: DispatchQuestion): DispatchStepResult;
  truth(conceptId: ConceptId): TruthRow;
}

export interface S4Setup {
  concepts: readonly CurriculumConcept[];
  lambda: number;
  phi: number;
  isTargetConcept: (conceptId: ConceptId) => boolean;
}

/** Creates a fresh simulated learner for the given family. `worldCacheKey` should be a stable object shared by every learner in the same (family, world, slice) -- it only affects internal memoization, never the simulated values themselves (derive() is a pure function of its key). `s4Setup` is required (and only used) when `family === "S4"`. */
export function createSimulatedLearner(
  family: SimFamily,
  id: LearnerIdentity,
  cfg: SimulatorConfig,
  worldCacheKey: object,
  s4Setup?: S4Setup,
): SimulatedLearner {
  const primaryOf = (q: DispatchQuestion): ConceptId => Object.keys(q.conceptWeights)[0];

  switch (family) {
    case "S1": {
      let state: S1LatentState = createS1LatentState();
      return {
        family,
        respondAndLearn(question) {
          const q = question as S1Question;
          const u = responseUniform(id, state.opp, primaryOf(q));
          const { correct } = s1Respond(id, q, cfg, state, u);
          const truthByConcept = new Map<ConceptId, TruthRow>();
          for (const conceptId of Object.keys(q.conceptWeights)) truthByConcept.set(conceptId, s1Truth(id, conceptId, cfg, state));
          state = s1Learn(id, q, cfg, state, s1DefaultOpportunityDraw(id));
          return { correct, truthByConcept };
        },
        truth: (conceptId) => s1Truth(id, conceptId, cfg, state),
      };
    }
    case "S2": {
      let state: S2LatentState = createS2LatentState();
      return {
        family,
        respondAndLearn(question) {
          const q = question as S2Question;
          const u = responseUniform(id, state.opp, primaryOf(q));
          const { correct } = s2Respond(id, q, cfg, state, worldCacheKey, u);
          const truthByConcept = new Map<ConceptId, TruthRow>();
          for (const conceptId of Object.keys(q.conceptWeights)) truthByConcept.set(conceptId, s2Truth(id, conceptId, cfg, state, worldCacheKey));
          state = s2Learn(id, q, cfg, state, worldCacheKey);
          return { correct, truthByConcept };
        },
        truth: (conceptId) => s2Truth(id, conceptId, cfg, state, worldCacheKey),
      };
    }
    case "S3": {
      let state: S3LatentState = createS3LatentState();
      return {
        family,
        respondAndLearn(question) {
          const q = question as S3Question;
          const u = responseUniform(id, state.opp, primaryOf(q));
          const { correct } = s3Respond(id, q, cfg, state, u);
          const truthByConcept = new Map<ConceptId, TruthRow>();
          for (const conceptId of Object.keys(q.conceptWeights)) truthByConcept.set(conceptId, s3Truth(id, conceptId, cfg, state));
          state = s3Learn(id, q, cfg, state, worldCacheKey);
          return { correct, truthByConcept };
        },
        truth: (conceptId) => s3Truth(id, conceptId, cfg, state),
      };
    }
    case "S4": {
      if (!s4Setup) throw new Error("createSimulatedLearner: s4Setup is required for family S4.");
      const graph: TrueGraph = buildTrueGraph({ masterSeed: id.masterSeed, family: "S4", cell: "dispatch", sliceId: id.sliceId, world: id.world }, s4Setup.concepts, s4Setup.phi);
      let state: S4LatentState = s4InitializeAll(id, graph, cfg, s4Setup.lambda, s4Setup.isTargetConcept, worldCacheKey);
      return {
        family,
        respondAndLearn(question) {
          const q = question as S4Question;
          const u = responseUniform(id, state.opp, primaryOf(q));
          const { correct } = s4Respond(id, q, cfg, state, s4Setup.isTargetConcept, worldCacheKey, u);
          const truthByConcept = new Map<ConceptId, TruthRow>();
          for (const conceptId of Object.keys(q.conceptWeights)) {
            truthByConcept.set(conceptId, s4Truth(conceptId, cfg, state, s4Setup.isTargetConcept, id, worldCacheKey));
          }
          state = s4Learn(id, q, cfg, state, graph, s4Setup.lambda, s4Setup.isTargetConcept, worldCacheKey);
          return { correct, truthByConcept };
        },
        truth: (conceptId) => s4Truth(conceptId, cfg, state, s4Setup.isTargetConcept, id, worldCacheKey),
      };
    }
  }
}

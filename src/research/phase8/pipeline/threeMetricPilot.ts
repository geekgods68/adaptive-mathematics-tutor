/**
 * Three-metric diagnostic pilot (coordinator directive, 2026-11-05).
 *
 * A NEW, additive diagnostic/pilot-scale runner -- it does NOT modify
 * src/research/phase8/pipeline/pilot.ts (the frozen 8C-Pilot orchestrator
 * that produced the historical, untouched
 * research-output/phase8/pilot/pilot-report.json), and it does NOT
 * change any simulator, estimator, selection-policy, or slice-selection
 * code. It calls the SAME real, unmodified `runTrackA` and
 * `runTrackBSession` functions pilot.ts calls, with the SAME masterSeed,
 * world/slice/learnerId identity scheme (so results are directly
 * comparable to the historical pilot), and the SAME pilot-scale sample
 * sizes from config/phase8/experiment-plan-v2.json's `pilot` block.
 *
 * What it does differently: it RETAINS three quantities the historical
 * pilot computed internally but discarded before persisting --
 *   - Track A per-learner `meanBrier` (already computed in
 *     src/research/phase8/trackA/runTrackA.ts, LearnerMetricRow) and a
 *     newly-computed per-learner latent-mastery RMSE (same aligned
 *     pStarHat/pStarTrue pairs runTrackA.ts already produces in
 *     `predictions`, just scored with RMSE's sqrt-of-mean-of-squares
 *     instead of MAE's mean-of-abs);
 *   - Track B per-session `itemsToCriterion`/`itemsToCriterionCensored`
 *     (already computed in src/research/phase8/trackB/runTrackB.ts from
 *     the simulator's own ground-truth mastery process, per B6.6/B3.3's
 *     mastered-threshold definitions -- never an estimator's own
 *     self-declared threshold).
 *
 * This is explicitly PILOT/EXPLORATORY, matching the authorization tier
 * of the existing 8C-Pilot (no protocol/APPROVAL.md exists -- see
 * docs/COMPLETE_RESEARCH_PAPER_EVIDENCE_DOSSIER.md Section 23). Its
 * purpose is to prove the full Brier/QTM/RMSE pipeline works end to end
 * on real (newly generated) simulated data, and to produce real,
 * honestly-labeled exploratory numbers for the three intended paper
 * metrics -- never a confirmatory result.
 */

import { RISE_CONCEPTS, RISE_QUESTIONS } from "@/domain/rise";
import { selectConceptSubgraphSlices } from "@/research/phase8/slices/selectSlices";
import { loadPhase8Config } from "@/research/phase8/config/load";
import { runTrackA, type TrackAFamilyConfig } from "@/research/phase8/trackA/runTrackA";
import { runTrackBSession, type TrackBConditionId } from "@/research/phase8/trackB/runTrackB";
import type { SimFamily, S4Setup } from "@/research/phase8/simulator/dispatch";
import { latentRmseAndMae, mean, type QtmRow } from "@/research/phase8/metrics/threeMetrics";

export interface ThreeMetricPilotReport {
  generatedAt: string;
  pilotWorlds: number;
  slicesUsed: string[];
  label: string;
  trackA: {
    perFamily: Record<
      string,
      {
        detABrierByWorld: number[];
        bktFitBrierByWorld: number[];
        detARmseByWorld: number[];
        bktFitRmseByWorld: number[];
      }
    >;
  };
  trackB: {
    perFamilyConfig: Record<
      string,
      {
        /** Pooled across the 3 slices within each world -- one QtmRow per (learner, slice). */
        qtmRowsByWorld_C0: QtmRow[][];
        qtmRowsByWorld_C2: QtmRow[][];
        qtmRowsByWorld_C3: QtmRow[][];
      }
    >;
  };
  failureCount: number;
  totalRuns: number;
  wallClockMs: number;
}

export interface ThreeMetricPilotOptions {
  pilotWorlds?: number;
  trackACalLearners?: number;
  trackATestLearners?: number;
  trackBLearners?: number;
}

export function runThreeMetricPilot(options: ThreeMetricPilotOptions = {}): ThreeMetricPilotReport {
  const startedAt = Date.now();
  const cfg = loadPhase8Config();
  const plan = cfg.plan.value;
  const pilotWorlds = options.pilotWorlds ?? plan.pilot.worlds;
  const [calLearners, testLearners] = options.trackACalLearners && options.trackATestLearners
    ? [options.trackACalLearners, options.trackATestLearners]
    : (plan.pilot.trackALearners as [number, number]);
  const trackBLearners = options.trackBLearners ?? plan.pilot.trackBLearners;

  const sliceResult = selectConceptSubgraphSlices(RISE_CONCEPTS, RISE_QUESTIONS);
  const slices = sliceResult.primarySlices; // identical to pilot.ts: the 3 author-approved slices (Amendment A1)

  let failureCount = 0;
  let totalRuns = 0;

  // ---------------- Track A: Brier + RMSE ----------------
  const trackAFamilyConfigs = plan.trackA.configs as TrackAFamilyConfig[];
  const perFamily: ThreeMetricPilotReport["trackA"]["perFamily"] = {};

  for (const familyConfig of trackAFamilyConfigs) {
    const detABrierByWorld: number[] = [];
    const bktFitBrierByWorld: number[] = [];
    const detARmseByWorld: number[] = [];
    const bktFitRmseByWorld: number[] = [];

    for (let world = 1; world <= pilotWorlds; world++) {
      const perSliceDetABrier: number[] = [];
      const perSliceBktBrier: number[] = [];
      const perSliceDetARmse: number[] = [];
      const perSliceBktRmse: number[] = [];

      for (const slice of slices) {
        totalRuns++;
        try {
          const result = runTrackA({
            familyConfig,
            world,
            slice,
            concepts: RISE_CONCEPTS,
            simulatorConfig: cfg.simulator.value,
            estimatorConfig: cfg.estimator.value,
            masterSeed: plan.masterSeed,
            calLearners,
            testLearners,
            phase1PerX: plan.trackA.phase1PerX,
            phase2PerT: plan.trackA.phase2PerT,
            reviewEvery: plan.trackA.reviewEvery,
          });

          const detARows = result.learnerMetrics.filter((m) => m.estimator === "det-a");
          const bktRows = result.learnerMetrics.filter((m) => m.estimator === "bkt-fit");
          perSliceDetABrier.push(mean(detARows.map((r) => r.meanBrier)));
          perSliceBktBrier.push(mean(bktRows.map((r) => r.meanBrier)));

          // RMSE: per-learner, from the SAME aligned (pStarHat, pStarTrue) pairs runTrackA.ts
          // already produced in `predictions` -- never a new/independent simulation.
          const detALearnerIds = Array.from(new Set(detARows.map((r) => r.learnerId)));
          const bktLearnerIds = Array.from(new Set(bktRows.map((r) => r.learnerId)));
          const detARmsePerLearner = detALearnerIds.map((lid) => {
            const rows = result.predictions.filter((p) => p.learnerId === lid && p.estimator === "det-a");
            return latentRmseAndMae(rows.map((p) => ({ estimated: p.pStarHat, truth: p.pStarTrue }))).rmse;
          });
          const bktRmsePerLearner = bktLearnerIds.map((lid) => {
            const rows = result.predictions.filter((p) => p.learnerId === lid && p.estimator === "bkt-fit");
            return latentRmseAndMae(rows.map((p) => ({ estimated: p.pStarHat, truth: p.pStarTrue }))).rmse;
          });
          perSliceDetARmse.push(mean(detARmsePerLearner));
          perSliceBktRmse.push(mean(bktRmsePerLearner));
        } catch {
          failureCount++;
        }
      }

      if (perSliceDetABrier.length === slices.length) {
        detABrierByWorld.push(mean(perSliceDetABrier));
        bktFitBrierByWorld.push(mean(perSliceBktBrier));
        detARmseByWorld.push(mean(perSliceDetARmse));
        bktFitRmseByWorld.push(mean(perSliceBktRmse));
      }
    }

    perFamily[familyConfig] = { detABrierByWorld, bktFitBrierByWorld, detARmseByWorld, bktFitRmseByWorld };
  }

  // ---------------- Track B: Questions-to-Mastery (censored, ground-truth) ----------------
  const trackBFamilyConfigs = plan.trackB.configs as string[];
  const perFamilyConfigB: ThreeMetricPilotReport["trackB"]["perFamilyConfig"] = {};

  for (const familyConfigLabel of trackBFamilyConfigs) {
    const isS4 = familyConfigLabel.startsWith("S4-");
    const family: SimFamily = isS4 ? "S4" : (familyConfigLabel as SimFamily);
    const cellName = isS4 ? familyConfigLabel : undefined;

    const qtmRowsByWorld_C0: QtmRow[][] = [];
    const qtmRowsByWorld_C2: QtmRow[][] = [];
    const qtmRowsByWorld_C3: QtmRow[][] = [];

    for (let world = 1; world <= pilotWorlds; world++) {
      const worldRows: Record<TrackBConditionId, QtmRow[]> = { C0: [], C1: [], C2: [], C3: [] };

      for (const slice of slices) {
        const s4Setup: S4Setup | undefined = isS4
          ? {
              concepts: RISE_CONCEPTS.map((c) => ({ id: c.id, curriculumLevel: c.curriculumLevel ?? 0, prerequisiteIds: c.prerequisiteIds })),
              lambda: cfg.simulator.value.S4.cells[cellName!].lambda,
              phi: cfg.simulator.value.S4.cells[cellName!].phi,
              isTargetConcept: (conceptId: string) => slice.targetConceptIds.includes(conceptId),
            }
          : undefined;

        for (let l = 0; l < trackBLearners; l++) {
          const learnerId = `pilot-${String(l).padStart(3, "0")}`;
          for (const conditionId of ["C0", "C2", "C3"] as const) {
            totalRuns++;
            try {
              const result = runTrackBSession({
                conditionId,
                identity: { masterSeed: plan.masterSeed, world, sliceId: slice.chapterId, learnerId },
                family,
                slice,
                concepts: RISE_CONCEPTS,
                allQuestions: RISE_QUESTIONS,
                simulatorConfig: cfg.simulator.value,
                budget: plan.trackB.budget,
                s4Setup,
              });
              worldRows[conditionId].push({
                itemsToCriterion: result.itemsToCriterion,
                censored: result.itemsToCriterionCensored,
                budget: plan.trackB.budget,
              });
            } catch {
              failureCount++;
            }
          }
        }
      }

      qtmRowsByWorld_C0.push(worldRows.C0);
      qtmRowsByWorld_C2.push(worldRows.C2);
      qtmRowsByWorld_C3.push(worldRows.C3);
    }

    perFamilyConfigB[familyConfigLabel] = { qtmRowsByWorld_C0, qtmRowsByWorld_C2, qtmRowsByWorld_C3 };
  }

  return {
    generatedAt: new Date().toISOString(),
    pilotWorlds,
    slicesUsed: slices.map((s) => s.chapterId),
    label: "EXPLORATORY / PILOT-SCALE -- NOT a confirmatory analysis. See docs/COMPLETE_RESEARCH_PAPER_EVIDENCE_DOSSIER.md Section 24.",
    trackA: { perFamily },
    trackB: { perFamilyConfig: perFamilyConfigB },
    failureCount,
    totalRuns,
    wallClockMs: Date.now() - startedAt,
  };
}

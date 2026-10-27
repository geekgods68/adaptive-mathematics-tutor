/**
 * C12/B9.2/B9.3 (protocol/phase8-protocol-v2.md): the 8C-Pilot. Uses
 * PILOT SEEDS ONLY (split "pilot" in every derived key, via the
 * `pilot` identity fields below). Per C12's own acceptance criteria,
 * this prints ONLY: failure counts, runtime/storage projection,
 * required W from per-condition (never cross-condition) variances, and
 * activation rates. It deliberately computes NO contrast between
 * estimators or policies, and makes no confirmatory claim.
 */

import { RISE_CONCEPTS, RISE_QUESTIONS } from "@/domain/rise";
import { selectConceptSubgraphSlices } from "@/research/phase8/slices/selectSlices";
import { loadPhase8Config } from "@/research/phase8/config/load";
import { runTrackA, type TrackAFamilyConfig } from "@/research/phase8/trackA/runTrackA";
import { runTrackBSession, type TrackBConditionId } from "@/research/phase8/trackB/runTrackB";
import type { SimFamily, S4Setup } from "@/research/phase8/simulator/dispatch";

const T_CRIT_975_DF4 = 2.776; // t_{0.975, df=4}, fixed because the pilot always uses exactly 5 worlds (B9.2).

function mean(values: readonly number[]): number {
  return values.reduce((s, v) => s + v, 0) / values.length;
}
function sampleVariance(values: readonly number[]): number {
  const m = mean(values);
  return values.reduce((s, v) => s + (v - m) ** 2, 0) / (values.length - 1);
}
function requiredW(sdA: number, sdB: number, h: number): number {
  const sdD = Math.sqrt(sdA ** 2 + sdB ** 2);
  if (sdD === 0) return 20;
  const w = Math.pow((T_CRIT_975_DF4 * sdD) / h, 2);
  return Math.max(20, Math.ceil(w));
}

export interface PilotReport {
  generatedAt: string;
  pilotWorlds: number;
  slicesUsed: string[];
  trackA: {
    perFamily: Record<string, { detALogLossByWorld: number[]; bktFitLogLossByWorld: number[]; detAMaeByWorld: number[]; bktFitMaeByWorld: number[] }>;
    requiredW: Record<string, { logLoss_detA_vs_bktFit: number; mae_detA_vs_bktFit: number }>;
    runtimeMsPerContext: number[];
    bktFitFlags: { nearBound: number; multimodal: number; capHit: number; total: number };
  };
  trackB: {
    perFamilyConfig: Record<string, { kT_C0: number[]; kT_C2: number[]; kT_C3: number[]; activationRateC2: number; failureCount: number }>;
    requiredW: Record<string, { hB1_c2_vs_c0: number; hB2_c2_vs_c3: number }>;
    runtimeMsPerSession: number[];
  };
  s1Check: { policyKDifferences: number[]; pass: boolean };
  failureCount: number;
  totalRuns: number;
}

export interface PilotOptions {
  pilotWorlds?: number;
  trackACalLearners?: number;
  trackATestLearners?: number;
  trackBLearners?: number;
}

export function runPilot(options: PilotOptions = {}): PilotReport {
  const cfg = loadPhase8Config();
  const plan = cfg.plan.value;
  const pilotWorlds = options.pilotWorlds ?? plan.pilot.worlds;
  const [calLearners, testLearners] = options.trackACalLearners && options.trackATestLearners
    ? [options.trackACalLearners, options.trackATestLearners]
    : (plan.pilot.trackALearners as [number, number]);
  const trackBLearners = options.trackBLearners ?? plan.pilot.trackBLearners;

  const sliceResult = selectConceptSubgraphSlices(RISE_CONCEPTS, RISE_QUESTIONS);
  const slices = sliceResult.primarySlices; // the 3 author-approved slices (Amendment A1): CH07, CH03, CH10

  let failureCount = 0;
  let totalRuns = 0;

  // ---------------- Track A ----------------
  const trackAFamilyConfigs = plan.trackA.configs as TrackAFamilyConfig[];
  const perFamily: PilotReport["trackA"]["perFamily"] = {};
  const trackARuntimes: number[] = [];
  let nearBound = 0, multimodal = 0, capHit = 0, bktFitTotal = 0;

  for (const familyConfig of trackAFamilyConfigs) {
    const detALogLossByWorld: number[] = [];
    const bktFitLogLossByWorld: number[] = [];
    const detAMaeByWorld: number[] = [];
    const bktFitMaeByWorld: number[] = [];

    for (let world = 1; world <= pilotWorlds; world++) {
      const perSliceDetALL: number[] = [];
      const perSliceBktLL: number[] = [];
      const perSliceDetAMae: number[] = [];
      const perSliceBktMae: number[] = [];

      for (const slice of slices) {
        totalRuns++;
        const t0 = Date.now();
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
          trackARuntimes.push(Date.now() - t0);

          const detARows = result.learnerMetrics.filter((m) => m.estimator === "det-a");
          const bktRows = result.learnerMetrics.filter((m) => m.estimator === "bkt-fit");
          perSliceDetALL.push(mean(detARows.map((r) => r.meanLogLoss)));
          perSliceBktLL.push(mean(bktRows.map((r) => r.meanLogLoss)));
          perSliceDetAMae.push(mean(detARows.map((r) => r.maeLatent)));
          perSliceBktMae.push(mean(bktRows.map((r) => r.maeLatent)));

          for (const fit of Object.values(result.bktFits)) {
            bktFitTotal++;
            if (fit.nearBoundParams.length > 0) nearBound++;
            if (fit.multimodalFlag) multimodal++;
            if (fit.capHit) capHit++;
          }
        } catch {
          failureCount++;
        }
      }

      if (perSliceDetALL.length === slices.length) {
        detALogLossByWorld.push(mean(perSliceDetALL));
        bktFitLogLossByWorld.push(mean(perSliceBktLL));
        detAMaeByWorld.push(mean(perSliceDetAMae));
        bktFitMaeByWorld.push(mean(perSliceBktMae));
      }
    }

    perFamily[familyConfig] = { detALogLossByWorld, bktFitLogLossByWorld, detAMaeByWorld, bktFitMaeByWorld };
  }

  const trackARequiredW: PilotReport["trackA"]["requiredW"] = {};
  for (const [family, data] of Object.entries(perFamily)) {
    if (data.detALogLossByWorld.length < 2) continue;
    trackARequiredW[family] = {
      logLoss_detA_vs_bktFit: requiredW(
        Math.sqrt(sampleVariance(data.detALogLossByWorld)),
        Math.sqrt(sampleVariance(data.bktFitLogLossByWorld)),
        plan.margins.logloss * plan.precision.trackAHalfWidthFraction,
      ),
      mae_detA_vs_bktFit: requiredW(
        Math.sqrt(sampleVariance(data.detAMaeByWorld)),
        Math.sqrt(sampleVariance(data.bktFitMaeByWorld)),
        plan.margins.mae * plan.precision.trackAHalfWidthFraction,
      ),
    };
  }

  // ---------------- Track B ----------------
  const trackBFamilyConfigs = plan.trackB.configs as string[]; // S1, S2, S3, S4-GF, S4-N, S4-GW
  const perFamilyConfigB: PilotReport["trackB"]["perFamilyConfig"] = {};
  const trackBRuntimes: number[] = [];
  const s1KDifferences: number[] = [];

  for (const familyConfigLabel of trackBFamilyConfigs) {
    const isS4 = familyConfigLabel.startsWith("S4-");
    const family: SimFamily = isS4 ? "S4" : (familyConfigLabel as SimFamily);
    const cellName = isS4 ? familyConfigLabel : undefined;

    const kT_C0_byWorld: number[] = [];
    const kT_C2_byWorld: number[] = [];
    const kT_C3_byWorld: number[] = [];
    let activatedC2 = 0;
    let totalC2 = 0;
    let localFailures = 0;

    for (let world = 1; world <= pilotWorlds; world++) {
      const perSliceK0: number[] = [];
      const perSliceK2: number[] = [];
      const perSliceK3: number[] = [];

      for (const slice of slices) {
        const s4Setup: S4Setup | undefined = isS4
          ? {
              concepts: RISE_CONCEPTS.map((c) => ({ id: c.id, curriculumLevel: c.curriculumLevel ?? 0, prerequisiteIds: c.prerequisiteIds })),
              lambda: cfg.simulator.value.S4.cells[cellName!].lambda,
              phi: cfg.simulator.value.S4.cells[cellName!].phi,
              isTargetConcept: (conceptId: string) => slice.targetConceptIds.includes(conceptId),
            }
          : undefined;

        const conditionResults: Record<TrackBConditionId, number[]> = { C0: [], C1: [], C2: [], C3: [] };
        const kTByLearnerAndCondition = new Map<string, Partial<Record<TrackBConditionId, number>>>();
        for (let l = 0; l < trackBLearners; l++) {
          const learnerId = `pilot-${String(l).padStart(3, "0")}`;
          for (const conditionId of ["C0", "C2", "C3"] as const) {
            totalRuns++;
            const t0 = Date.now();
            try {
              const result = runTrackBSession({
                conditionId,
                // sliceId is intentionally just the chapter id, NOT combined with the family-config
                // label: S4-GF/S4-N/S4-GW all share familyGroup "S4" in the RNG tuple and must share
                // worlds/learner draws across cells (B3.3/B10.3) -- only `family` discriminates S1
                // from S2/S3/S4 (already a distinct derive() field), and `s4Setup.lambda/phi` (not
                // the RNG key) is what actually differentiates the three S4 cells from each other.
                identity: { masterSeed: plan.masterSeed, world, sliceId: slice.chapterId, learnerId },
                family,
                slice,
                concepts: RISE_CONCEPTS,
                allQuestions: RISE_QUESTIONS,
                simulatorConfig: cfg.simulator.value,
                budget: plan.trackB.budget,
                s4Setup,
              });
              trackBRuntimes.push(Date.now() - t0);
              conditionResults[conditionId].push(result.kT);
              const perLearner = kTByLearnerAndCondition.get(learnerId) ?? {};
              perLearner[conditionId] = result.kT;
              kTByLearnerAndCondition.set(learnerId, perLearner);
              if (conditionId === "C2") {
                totalC2++;
                if (result.activated) activatedC2++;
              }
            } catch {
              failureCount++;
              localFailures++;
            }
          }
        }
        perSliceK0.push(mean(conditionResults.C0));
        perSliceK2.push(mean(conditionResults.C2));
        perSliceK3.push(mean(conditionResults.C3));

        if (familyConfigLabel === "S1") {
          // G-11/B8.6's S1 implementation check: for the SAME learner, every policy must produce an
          // IDENTICAL K(T), since S1 has no transition at all (theta is fixed from initialization,
          // independent of which items were presented or in what order). Computed per learner, never
          // pooled across learners (different learners legitimately have different fixed theta).
          for (const perLearner of kTByLearnerAndCondition.values()) {
            const values = [perLearner.C0, perLearner.C2, perLearner.C3].filter((v): v is number => v !== undefined);
            if (values.length < 2) continue;
            s1KDifferences.push(Math.max(...values) - Math.min(...values));
          }
        }
      }

      kT_C0_byWorld.push(mean(perSliceK0));
      kT_C2_byWorld.push(mean(perSliceK2));
      kT_C3_byWorld.push(mean(perSliceK3));
    }

    perFamilyConfigB[familyConfigLabel] = {
      kT_C0: kT_C0_byWorld,
      kT_C2: kT_C2_byWorld,
      kT_C3: kT_C3_byWorld,
      activationRateC2: totalC2 > 0 ? activatedC2 / totalC2 : 0,
      failureCount: localFailures,
    };
  }

  const trackBRequiredW: PilotReport["trackB"]["requiredW"] = {};
  for (const [family, data] of Object.entries(perFamilyConfigB)) {
    if (data.kT_C0.length < 2) continue;
    trackBRequiredW[family] = {
      hB1_c2_vs_c0: requiredW(Math.sqrt(sampleVariance(data.kT_C2)), Math.sqrt(sampleVariance(data.kT_C0)), plan.precision.trackBHalfWidth),
      hB2_c2_vs_c3: requiredW(Math.sqrt(sampleVariance(data.kT_C2)), Math.sqrt(sampleVariance(data.kT_C3)), plan.precision.trackBHalfWidth),
    };
  }

  return {
    generatedAt: new Date().toISOString(),
    pilotWorlds,
    slicesUsed: slices.map((s) => s.chapterId),
    trackA: { perFamily, requiredW: trackARequiredW, runtimeMsPerContext: trackARuntimes, bktFitFlags: { nearBound, multimodal, capHit, total: bktFitTotal } },
    trackB: { perFamilyConfig: perFamilyConfigB, requiredW: trackBRequiredW, runtimeMsPerSession: trackBRuntimes },
    s1Check: { policyKDifferences: s1KDifferences, pass: s1KDifferences.every((d) => d < 1e-9) },
    failureCount,
    totalRuns,
  };
}

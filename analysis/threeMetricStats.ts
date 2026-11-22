/**
 * Statistical analysis pipeline for the three-metric reconciliation
 * (coordinator directive, 2026-11-05): Brier Score, Questions-to-Mastery
 * (QTM), and Latent-Mastery RMSE.
 *
 * Reads ONLY the real, newly-generated
 * research-output/phase8/pilot/three-metric-pilot-report.json (produced
 * by src/research/phase8/pipeline/threeMetricPilot.ts, which itself
 * calls the real, unmodified runTrackA/runTrackBSession). Fabricates
 * nothing. Writes its output under research-output/phase8/final/,
 * never overwriting the pilot report itself.
 *
 * IMPORTANT: every number this script produces is EXPLORATORY /
 * PILOT-SCALE (5 worlds; the protocol's own precision rule for the
 * ORIGINAL metrics required 20-92 worlds, and no dedicated precision run
 * has been done yet for these three metrics specifically -- see
 * protocol/PROPOSED-AMENDMENT-A2-metric-reconciliation.md Section 7).
 * Never confirmatory. World is the unit of analysis throughout,
 * consistent with protocol/phase8-protocol-v2.md B8.1.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { mean, sd, pairedTTest, questionsToMasteryAnalysis, type QtmRow } from "@/research/phase8/metrics/threeMetrics";

interface ThreeMetricPilotReport {
  generatedAt: string;
  pilotWorlds: number;
  slicesUsed: string[];
  trackA: {
    perFamily: Record<string, { detABrierByWorld: number[]; bktFitBrierByWorld: number[]; detARmseByWorld: number[]; bktFitRmseByWorld: number[] }>;
  };
  trackB: {
    perFamilyConfig: Record<string, { qtmRowsByWorld_C0: QtmRow[][]; qtmRowsByWorld_C2: QtmRow[][]; qtmRowsByWorld_C3: QtmRow[][] }>;
  };
  totalRuns: number;
  failureCount: number;
  wallClockMs: number;
}

function main(): void {
  const reportPath = path.join(process.cwd(), "research-output", "phase8", "pilot", "three-metric-pilot-report.json");
  const report: ThreeMetricPilotReport = JSON.parse(fs.readFileSync(reportPath, "utf-8"));

  const outDir = path.join(process.cwd(), "research-output", "phase8", "final");
  fs.mkdirSync(outDir, { recursive: true });

  // ---------------- Brier Score (Track A) ----------------
  const brier: Record<string, unknown> = {};
  for (const [fam, d] of Object.entries(report.trackA.perFamily)) {
    const diff = d.detABrierByWorld.map((v, i) => v - d.bktFitBrierByWorld[i]);
    brier[fam] = {
      detA: { mean: mean(d.detABrierByWorld), sd: d.detABrierByWorld.length > 1 ? sd(d.detABrierByWorld) : 0 },
      bktFit: { mean: mean(d.bktFitBrierByWorld), sd: d.bktFitBrierByWorld.length > 1 ? sd(d.bktFitBrierByWorld) : 0 },
      diff_detA_minus_bktFit: diff.length >= 2 ? pairedTTest(diff) : { note: "insufficient worlds for a t-test" },
    };
  }

  // ---------------- Latent-Mastery RMSE (Track A) ----------------
  const rmse: Record<string, unknown> = {};
  for (const [fam, d] of Object.entries(report.trackA.perFamily)) {
    const diff = d.detARmseByWorld.map((v, i) => v - d.bktFitRmseByWorld[i]);
    rmse[fam] = {
      detA: { mean: mean(d.detARmseByWorld), sd: d.detARmseByWorld.length > 1 ? sd(d.detARmseByWorld) : 0 },
      bktFit: { mean: mean(d.bktFitRmseByWorld), sd: d.bktFitRmseByWorld.length > 1 ? sd(d.bktFitRmseByWorld) : 0 },
      diff_detA_minus_bktFit: diff.length >= 2 ? pairedTTest(diff) : { note: "insufficient worlds for a t-test" },
    };
  }

  // ---------------- Questions-to-Mastery (Track B) ----------------
  const qtm: Record<string, unknown> = {};
  for (const [cfg, d] of Object.entries(report.trackB.perFamilyConfig)) {
    // Per-world QTM analyses (pooling the 3 slices' learners within each world -- the same
    // pooling level the original pilot used for K(T): per-slice mean, then per-world mean;
    // here, since QTM needs raw event/censoring rows rather than a mean, we pool the raw rows
    // generated within one world across its 3 slices, which is the finest grain that still
    // respects "world" as the unit used for cross-world inference below).
    const perWorldC0 = d.qtmRowsByWorld_C0.map((rows) => questionsToMasteryAnalysis(rows));
    const perWorldC2 = d.qtmRowsByWorld_C2.map((rows) => questionsToMasteryAnalysis(rows));
    const perWorldC3 = d.qtmRowsByWorld_C3.map((rows) => questionsToMasteryAnalysis(rows));

    const attainC0 = perWorldC0.map((a) => a.attainmentProbability);
    const attainC2 = perWorldC2.map((a) => a.attainmentProbability);
    const attainC3 = perWorldC3.map((a) => a.attainmentProbability);
    const rmstC0 = perWorldC0.map((a) => a.restrictedMeanQtm);
    const rmstC2 = perWorldC2.map((a) => a.restrictedMeanQtm);
    const rmstC3 = perWorldC3.map((a) => a.restrictedMeanQtm);

    const diffAttainC2C0 = attainC2.map((v, i) => v - attainC0[i]);
    const diffAttainC2C3 = attainC2.map((v, i) => v - attainC3[i]);
    const diffRmstC2C0 = rmstC2.map((v, i) => v - rmstC0[i]);
    const diffRmstC2C3 = rmstC2.map((v, i) => v - rmstC3[i]);

    // Pooled (all worlds combined) QTM analysis too, for the cumulative-attainment curve figure --
    // descriptive only, not used for the paired world-level inference above.
    const pooledC0 = questionsToMasteryAnalysis(d.qtmRowsByWorld_C0.flat());
    const pooledC2 = questionsToMasteryAnalysis(d.qtmRowsByWorld_C2.flat());
    const pooledC3 = questionsToMasteryAnalysis(d.qtmRowsByWorld_C3.flat());

    qtm[cfg] = {
      perWorld: {
        attainmentProbability: { C0: attainC0, C2: attainC2, C3: attainC3 },
        restrictedMeanQtm: { C0: rmstC0, C2: rmstC2, C3: rmstC3 },
      },
      diff_attainment_C2_minus_C0: diffAttainC2C0.length >= 2 ? pairedTTest(diffAttainC2C0) : { note: "insufficient worlds" },
      diff_attainment_C2_minus_C3: diffAttainC2C3.length >= 2 ? pairedTTest(diffAttainC2C3) : { note: "insufficient worlds" },
      diff_rmst_C2_minus_C0: diffRmstC2C0.length >= 2 ? pairedTTest(diffRmstC2C0) : { note: "insufficient worlds" },
      diff_rmst_C2_minus_C3: diffRmstC2C3.length >= 2 ? pairedTTest(diffRmstC2C3) : { note: "insufficient worlds" },
      pooled: {
        C0: { attainmentProbability: pooledC0.attainmentProbability, medianQtm: pooledC0.medianQtm, restrictedMeanQtm: pooledC0.restrictedMeanQtm, n: pooledC0.n, nAttained: pooledC0.nAttained, cumulativeAttainmentCurve: pooledC0.cumulativeAttainmentCurve },
        C2: { attainmentProbability: pooledC2.attainmentProbability, medianQtm: pooledC2.medianQtm, restrictedMeanQtm: pooledC2.restrictedMeanQtm, n: pooledC2.n, nAttained: pooledC2.nAttained, cumulativeAttainmentCurve: pooledC2.cumulativeAttainmentCurve },
        C3: { attainmentProbability: pooledC3.attainmentProbability, medianQtm: pooledC3.medianQtm, restrictedMeanQtm: pooledC3.restrictedMeanQtm, n: pooledC3.n, nAttained: pooledC3.nAttained, cumulativeAttainmentCurve: pooledC3.cumulativeAttainmentCurve },
      },
    };
  }

  const out = {
    _label: "EXPLORATORY / PILOT-SCALE / UNDERPOWERED -- NOT a confirmatory analysis. See analysis/threeMetricStats.ts header comment and protocol/PROPOSED-AMENDMENT-A2-metric-reconciliation.md.",
    sourceArtifact: reportPath,
    sourceGeneratedAt: report.generatedAt,
    pilotWorlds: report.pilotWorlds,
    slicesUsed: report.slicesUsed,
    totalRuns: report.totalRuns,
    failureCount: report.failureCount,
    wallClockMs: report.wallClockMs,
    brierScore: brier,
    latentMasteryRmse: rmse,
    questionsToMastery: qtm,
  };

  const outPath = path.join(outDir, "three_metric_pilot_stats.json");
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
  console.log(`Wrote ${outPath}`);
}

main();

/**
 * DETERMINISTIC REPLAY -- NOT a new experiment. Re-runs the exact same
 * Track-A contexts (familyConfig x world x slice) the 8C-Pilot already
 * executed, using the identical masterSeed/worlds/slices/calLearners/
 * testLearners, and retains det-B ("Variant B") learnerMetrics rows that
 * pilot.ts computes internally but discards before persistence (see
 * 01_RESULTS_AND_ANALYSIS.md Part 2/6). Also re-aggregates det-a and
 * bkt-fit so they can be cross-checked against the ALREADY-STORED
 * pilot-report.json numbers -- if those do not match, this script's
 * det-b numbers must not be trusted (per the task's own instruction).
 *
 * Run with: npx tsx research_evidence/phase2_results_and_appendix/verification_scripts/runDetBReplay.ts
 */
import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { RISE_CONCEPTS, RISE_QUESTIONS } from "@/domain/rise";
import { selectConceptSubgraphSlices } from "@/research/phase8/slices/selectSlices";
import { loadPhase8Config } from "@/research/phase8/config/load";
import { runTrackA, type TrackAFamilyConfig } from "@/research/phase8/trackA/runTrackA";

function mean(values: readonly number[]): number {
  return values.length === 0 ? 0 : values.reduce((s, v) => s + v, 0) / values.length;
}
function gitHeadSafe(): string {
  try { return execSync("git rev-parse HEAD").toString().trim(); } catch { return "UNKNOWN"; }
}

const cfg = loadPhase8Config();
const plan = cfg.plan.value;
const pilotWorlds = plan.pilot.worlds;
const [calLearners, testLearners] = plan.pilot.trackALearners as [number, number];
const sliceResult = selectConceptSubgraphSlices(RISE_CONCEPTS, RISE_QUESTIONS);
const slices = sliceResult.primarySlices;
const trackAFamilyConfigs = plan.trackA.configs as TrackAFamilyConfig[];

type Metric = "meanLogLoss" | "meanBrier" | "maeLatent";
const ESTIMATORS = ["det-a", "det-b", "bkt-fit"] as const;

const perFamily: Record<string, Record<(typeof ESTIMATORS)[number], Record<Metric, number[]>>> = {};

let totalRuns = 0;
let failureCount = 0;
const t0All = Date.now();

for (const familyConfig of trackAFamilyConfigs) {
  const byEstimator: Record<(typeof ESTIMATORS)[number], Record<Metric, number[]>> = {
    "det-a": { meanLogLoss: [], meanBrier: [], maeLatent: [] },
    "det-b": { meanLogLoss: [], meanBrier: [], maeLatent: [] },
    "bkt-fit": { meanLogLoss: [], meanBrier: [], maeLatent: [] },
  };

  for (let world = 1; world <= pilotWorlds; world++) {
    const perSlice: Record<(typeof ESTIMATORS)[number], Record<Metric, number[]>> = {
      "det-a": { meanLogLoss: [], meanBrier: [], maeLatent: [] },
      "det-b": { meanLogLoss: [], meanBrier: [], maeLatent: [] },
      "bkt-fit": { meanLogLoss: [], meanBrier: [], maeLatent: [] },
    };
    for (const slice of slices) {
      totalRuns++;
      try {
        const result = runTrackA({
          familyConfig, world, slice,
          concepts: RISE_CONCEPTS,
          simulatorConfig: cfg.simulator.value,
          estimatorConfig: cfg.estimator.value,
          masterSeed: plan.masterSeed,
          calLearners, testLearners,
          phase1PerX: plan.trackA.phase1PerX,
          phase2PerT: plan.trackA.phase2PerT,
          reviewEvery: plan.trackA.reviewEvery,
        });
        for (const est of ESTIMATORS) {
          const rows = result.learnerMetrics.filter((m) => m.estimator === est);
          perSlice[est].meanLogLoss.push(mean(rows.map((r) => r.meanLogLoss)));
          perSlice[est].meanBrier.push(mean(rows.map((r) => r.meanBrier)));
          perSlice[est].maeLatent.push(mean(rows.map((r) => r.maeLatent)));
        }
      } catch (e) {
        failureCount++;
        console.error(`det-B replay FAILURE: family=${familyConfig} world=${world} slice=${slice.chapterId}:`, e);
      }
    }
    for (const est of ESTIMATORS) {
      for (const metric of ["meanLogLoss", "meanBrier", "maeLatent"] as Metric[]) {
        byEstimator[est][metric].push(mean(perSlice[est][metric]));
      }
    }
  }
  perFamily[familyConfig] = byEstimator;
  console.error(`done: ${familyConfig}`);
}

const wallClockMs = Date.now() - t0All;

const report = {
  LABEL: "DETERMINISTIC REPLAY -- reproduction of already-executed 8C-Pilot Track-A contexts; retains det-b rows the original pipeline discarded. NOT a new experiment (same masterSeed/worlds/slices/learners).",
  generatedAt: new Date().toISOString(),
  sourceCommit: gitHeadSafe(),
  pilotWorlds,
  slicesUsed: slices.map((s) => s.chapterId),
  calLearners, testLearners,
  masterSeed: plan.masterSeed,
  perFamily,
  totalRuns,
  failureCount,
  wallClockMs,
  crossCheckNote:
    "perFamily.<family>['det-a'].meanLogLoss and ['bkt-fit'].meanLogLoss MUST match research-output/phase8/pilot/pilot-report.json's trackA.perFamily.<family>.{detALogLossByWorld,bktFitLogLossByWorld} to within floating-point tolerance -- see verification_scripts/crossCheckDetBReplay.py.",
};

const outDir = join(process.cwd(), "research_evidence/phase2_results_and_appendix/retrospective_artifacts");
mkdirSync(outDir, { recursive: true });
const outPath = join(outDir, `detB_trackA_replay_${report.generatedAt.replace(/[:.]/g, "-")}.json`);
const json = JSON.stringify(report, null, 2);
writeFileSync(outPath, json);
const sha256 = createHash("sha256").update(json).digest("hex");
writeFileSync(outPath + ".sha256.txt", `${sha256}  ${outPath}\n`);
console.log(JSON.stringify({ outPath, sha256, totalRuns, failureCount, wallClockMs }, null, 2));

/**
 * RETROSPECTIVE EXPLORATORY COMPLETION -- NOT CONFIRMATORY.
 *
 * Executes ONLY the condition-C1 Track-B sessions that were never run in
 * either the 8C-Pilot or the three-metric pilot (see
 * research_evidence/phase2_results_and_appendix/01_RESULTS_AND_ANALYSIS.md
 * Part 2/3). Uses the EXACT SAME masterSeed, world range (1-5), slice set
 * (CH07/CH03/CH10), 50 learner ids ("pilot-000".."pilot-049"), and budget
 * (60) that pilot.ts/threeMetricPilot.ts already used for C0/C2/C3 -- this
 * is a deterministic reconstruction of the missing cell of an existing
 * design, NOT a new independent simulation draw (no new world indices, no
 * new masterSeed, no new RNG draws for anything the existing pilots already
 * touched; C1's own draws are new only because conditionId was never run
 * before -- its identity's `cell` field is `"C1"` instead of `"C0"/"C2"/"C3"`,
 * but `cell` is NOT part of any derive() key in shared.ts -- see the ledger
 * entry this script's output is cited from -- so C1's underlying learner
 * profiles/item-noise/concept-easiness draws are IDENTICAL to C0/C2/C3's;
 * only the SEQUENCE of items actually presented differs, because C1 runs
 * its own (correct, adaptive, prerequisite-aware) selection policy).
 *
 * Does NOT touch, read-modify, or overwrite pilot-report.json or
 * three-metric-pilot-report.json. Writes ONLY to a new, separately named,
 * timestamped file under research_evidence/phase2_results_and_appendix/.
 *
 * Run with: npx tsx research_evidence/phase2_results_and_appendix/verification_scripts/runC1Retrospective.ts
 */
import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { RISE_CONCEPTS, RISE_QUESTIONS } from "@/domain/rise";
import { selectConceptSubgraphSlices } from "@/research/phase8/slices/selectSlices";
import { loadPhase8Config } from "@/research/phase8/config/load";
import { runTrackBSession } from "@/research/phase8/trackB/runTrackB";
import type { SimFamily, S4Setup } from "@/research/phase8/simulator/dispatch";

function mean(values: readonly number[]): number {
  return values.length === 0 ? 0 : values.reduce((s, v) => s + v, 0) / values.length;
}

function gitHeadSafe(): string {
  try {
    return execSync("git rev-parse HEAD", { cwd: process.cwd() }).toString().trim();
  } catch {
    return "UNKNOWN";
  }
}
function gitDirtySafe(): boolean {
  try {
    return execSync("git status --short", { cwd: process.cwd() }).toString().trim().length > 0;
  } catch {
    return true;
  }
}

const cfg = loadPhase8Config();
const plan = cfg.plan.value;
const pilotWorlds = plan.pilot.worlds; // 5 -- SAME as both existing pilots
const trackBLearners = plan.pilot.trackBLearners; // 50 -- SAME as both existing pilots
const budget = plan.trackB.budget; // 60 -- SAME

const sliceResult = selectConceptSubgraphSlices(RISE_CONCEPTS, RISE_QUESTIONS);
const slices = sliceResult.primarySlices; // same 3 slices (CH07/CH03/CH10)

const trackBFamilyConfigs = plan.trackB.configs as string[]; // S1, S2, S3, S4-GF, S4-N, S4-GW

interface QtmRow {
  itemsToCriterion: number | null;
  censored: boolean;
  budget: number;
}

const perFamilyConfig: Record<
  string,
  {
    kT_C1: number[]; // world-level means, 5 entries
    qtmRowsByWorld_C1: QtmRow[][]; // 5 worlds, each an array of (50 learners x 3 slices = 150) rows
    activationRateC1: number;
    failureCount: number;
  }
> = {};

let totalRuns = 0;
let failureCount = 0;
const t0All = Date.now();

for (const familyConfigLabel of trackBFamilyConfigs) {
  const isS4 = familyConfigLabel.startsWith("S4-");
  const family: SimFamily = isS4 ? "S4" : (familyConfigLabel as SimFamily);
  const cellName = isS4 ? familyConfigLabel : undefined;

  const kT_C1_byWorld: number[] = [];
  const qtmRowsByWorld_C1: QtmRow[][] = [];
  let activatedC1 = 0;
  let totalC1 = 0;
  let localFailures = 0;

  for (let world = 1; world <= pilotWorlds; world++) {
    const perSliceK1: number[] = [];
    const worldQtmRows: QtmRow[] = [];

    for (const slice of slices) {
      const s4Setup: S4Setup | undefined = isS4
        ? {
            concepts: RISE_CONCEPTS.map((c) => ({ id: c.id, curriculumLevel: c.curriculumLevel ?? 0, prerequisiteIds: c.prerequisiteIds })),
            lambda: cfg.simulator.value.S4.cells[cellName!].lambda,
            phi: cfg.simulator.value.S4.cells[cellName!].phi,
            isTargetConcept: (conceptId: string) => slice.targetConceptIds.includes(conceptId),
          }
        : undefined;

      const kT_C1_perLearner: number[] = [];

      for (let l = 0; l < trackBLearners; l++) {
        const learnerId = `pilot-${String(l).padStart(3, "0")}`;
        totalRuns++;
        try {
          const result = runTrackBSession({
            conditionId: "C1",
            identity: { masterSeed: plan.masterSeed, world, sliceId: slice.chapterId, learnerId },
            family,
            slice,
            concepts: RISE_CONCEPTS,
            allQuestions: RISE_QUESTIONS,
            simulatorConfig: cfg.simulator.value,
            budget,
            s4Setup,
          });
          kT_C1_perLearner.push(result.kT);
          worldQtmRows.push({ itemsToCriterion: result.itemsToCriterion, censored: result.itemsToCriterionCensored, budget });
          totalC1++;
          if (result.activated) activatedC1++;
        } catch (e) {
          failureCount++;
          localFailures++;
          // eslint-disable-next-line no-console
          console.error(`C1 retrospective FAILURE: family=${familyConfigLabel} world=${world} slice=${slice.chapterId} learner=${learnerId}:`, e);
        }
      }
      perSliceK1.push(mean(kT_C1_perLearner));
    }

    kT_C1_byWorld.push(mean(perSliceK1));
    qtmRowsByWorld_C1.push(worldQtmRows);
  }

  perFamilyConfig[familyConfigLabel] = {
    kT_C1: kT_C1_byWorld,
    qtmRowsByWorld_C1,
    activationRateC1: totalC1 > 0 ? activatedC1 / totalC1 : 0,
    failureCount: localFailures,
  };
  // eslint-disable-next-line no-console
  console.error(`done: ${familyConfigLabel} (${kT_C1_byWorld.length} world means, failures=${localFailures})`);
}

const wallClockMs = Date.now() - t0All;

const report = {
  LABEL: "RETROSPECTIVE EXPLORATORY COMPLETION -- NOT CONFIRMATORY",
  purpose:
    "Deterministic reconstruction of the C1 Track-B cell that was never executed in either the 8C-Pilot (2026-10-27) or the three-metric pilot (2026-11-04). Reuses the identical masterSeed/worlds/slices/learner-id/budget as both. Does not replace, modify, or invalidate either prior pilot report.",
  generatedAt: new Date().toISOString(),
  sourceCommit: gitHeadSafe(),
  workingTreeDirtyAtGenerationTime: gitDirtySafe(),
  pilotWorlds,
  slicesUsed: slices.map((s) => s.chapterId),
  trackBLearnersPerSlice: trackBLearners,
  budget,
  masterSeed: plan.masterSeed,
  perFamilyConfig,
  totalRuns,
  failureCount,
  wallClockMs,
};

const outDir = join(process.cwd(), "research_evidence/phase2_results_and_appendix/retrospective_artifacts");
mkdirSync(outDir, { recursive: true });
const outPath = join(outDir, `c1_trackB_retrospective_${report.generatedAt.replace(/[:.]/g, "-")}.json`);
const json = JSON.stringify(report, null, 2);
writeFileSync(outPath, json);
const sha256 = createHash("sha256").update(json).digest("hex");
writeFileSync(outPath + ".sha256.txt", `${sha256}  ${outPath}\n`);

// eslint-disable-next-line no-console
console.log(JSON.stringify({ outPath, sha256, totalRuns, failureCount, wallClockMs }, null, 2));

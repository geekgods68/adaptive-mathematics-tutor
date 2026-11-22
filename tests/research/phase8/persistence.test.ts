import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { RISE_CONCEPTS, RISE_QUESTIONS } from "@/domain/rise";
import { selectConceptSubgraphSlices } from "@/research/phase8/slices/selectSlices";
import { loadPhase8Config } from "@/research/phase8/config/load";
import { runTrackA } from "@/research/phase8/trackA/runTrackA";
import { runTrackBSession } from "@/research/phase8/trackB/runTrackB";
import {
  saveTrackARunRecord,
  loadTrackARunRecord,
  listTrackARunRecords,
  saveTrackBRunArtifact,
  trackBRunsDir,
  createBatchManifest,
  loadBatchManifest,
  recordBatchRunOutcome,
  runStatus,
} from "@/research/phase8/persistence";
import { loadExperimentRunArtifact, listRunMetadata } from "@/research/artifact/persistence";
import { verifyArtifactContentDigest } from "@/research/artifact/buildArtifact";

const cfg = loadPhase8Config();
const sliceResult = selectConceptSubgraphSlices(RISE_CONCEPTS, RISE_QUESTIONS);
const ch03 = sliceResult.primarySlices.find((s) => s.chapterId === "CH03")!;

function tempRoot(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "stage2-phase8-persistence-"));
}

describe("Phase 8 per-run persistence (Group H) -- diagnostic scale only, never the frozen 13,560-run pilot", () => {
  let root: string;
  const originalRoot = process.env.PHASE8_RUNS_ROOT;

  beforeEach(() => {
    root = tempRoot();
    process.env.PHASE8_RUNS_ROOT = root;
  });

  afterEach(() => {
    process.env.PHASE8_RUNS_ROOT = originalRoot;
  });

  it("Track A: one run can be saved, reloaded byte-identically, and listed", () => {
    const options = {
      familyConfig: "S1" as const,
      world: 1,
      masterSeed: cfg.plan.value.masterSeed,
      calLearners: 2,
      testLearners: 2,
      sliceChapterId: ch03.chapterId,
    };
    const result = runTrackA({
      familyConfig: options.familyConfig,
      world: options.world,
      slice: ch03,
      concepts: RISE_CONCEPTS,
      simulatorConfig: cfg.simulator.value,
      estimatorConfig: cfg.estimator.value,
      masterSeed: options.masterSeed,
      calLearners: options.calLearners,
      testLearners: options.testLearners,
      phase1PerX: cfg.plan.value.trackA.phase1PerX,
      phase2PerT: cfg.plan.value.trackA.phase2PerT,
      reviewEvery: cfg.plan.value.trackA.reviewEvery,
    });

    const filePath = saveTrackARunRecord(options, result, "diag-batch-1");
    expect(fs.existsSync(filePath)).toBe(true);

    const runId = `diag-batch-1-trackA-S1-w1-${ch03.chapterId}`;
    const loaded = loadTrackARunRecord(runId, "diag-batch-1");
    expect(loaded.predictions.length).toBe(result.predictions.length);
    expect(loaded.learnerMetrics.length).toBe(result.learnerMetrics.length);
    expect(loaded.contentDigest).toHaveLength(64);

    const listed = listTrackARunRecords("diag-batch-1");
    expect(listed.map((r) => r.runId)).toEqual([runId]);
  });

  it("Track A: refuses to silently overwrite an existing run id (immutability, Part 8.3)", () => {
    const options = { familyConfig: "S1" as const, world: 1, masterSeed: cfg.plan.value.masterSeed, calLearners: 1, testLearners: 1, sliceChapterId: ch03.chapterId };
    const result = runTrackA({
      familyConfig: options.familyConfig,
      world: options.world,
      slice: ch03,
      concepts: RISE_CONCEPTS,
      simulatorConfig: cfg.simulator.value,
      estimatorConfig: cfg.estimator.value,
      masterSeed: options.masterSeed,
      calLearners: options.calLearners,
      testLearners: options.testLearners,
      phase1PerX: cfg.plan.value.trackA.phase1PerX,
      phase2PerT: cfg.plan.value.trackA.phase2PerT,
      reviewEvery: cfg.plan.value.trackA.reviewEvery,
    });
    saveTrackARunRecord(options, result, "diag-batch-dup");
    expect(() => saveTrackARunRecord(options, result, "diag-batch-dup")).toThrow(/already exists/);
  });

  it("Track B: one session's run, persisted via the onRunComplete hook, round-trips as a valid ExperimentRunArtifact with a correct content digest", () => {
    let savedPath: string | undefined;
    const result = runTrackBSession({
      conditionId: "C2",
      identity: { masterSeed: cfg.plan.value.masterSeed, world: 1, sliceId: ch03.chapterId, learnerId: "diag-001" },
      family: "S2",
      slice: ch03,
      concepts: RISE_CONCEPTS,
      allQuestions: RISE_QUESTIONS,
      simulatorConfig: cfg.simulator.value,
      budget: 10,
      onRunComplete: (config, scenario, finalState) => {
        savedPath = saveTrackBRunArtifact(config, scenario, finalState, "diag-batch-b1");
      },
    });

    expect(result.stepsAdministered).toBeGreaterThan(0);
    expect(savedPath).toBeDefined();
    const artifact = loadExperimentRunArtifact(path.basename(savedPath!).replace(/\.json$/, ""), trackBRunsDir("diag-batch-b1"));
    expect(artifact.track).toBe("B");
    expect(verifyArtifactContentDigest(artifact)).toBe(true);
    expect(artifact.provenance.conditionId).toBe("C2");

    const metas = listRunMetadata(trackBRunsDir("diag-batch-b1"));
    expect(metas.length).toBe(1);
  });

  it("the onRunComplete hook does not change runTrackBSession's own return value or computation (observational only, Part 9.1)", () => {
    const baseOptions = {
      conditionId: "C2" as const,
      identity: { masterSeed: cfg.plan.value.masterSeed, world: 1, sliceId: ch03.chapterId, learnerId: "diag-parity" },
      family: "S2" as const,
      slice: ch03,
      concepts: RISE_CONCEPTS,
      allQuestions: RISE_QUESTIONS,
      simulatorConfig: cfg.simulator.value,
      budget: 10,
    };
    const withoutHook = runTrackBSession(baseOptions);
    const withHook = runTrackBSession({ ...baseOptions, onRunComplete: () => {} });
    expect(withHook).toEqual(withoutHook);
  });

  it("batch manifest tracks planned/completed/failed runs and is idempotent against a retried outcome", () => {
    const batchId = "diag-batch-manifest";
    const manifest = createBatchManifest(batchId, "B", ["run-1", "run-2", "run-3"]);
    expect(manifest.plannedRunIds).toHaveLength(3);
    expect(runStatus(manifest, "run-1")).toBe("not_started");

    recordBatchRunOutcome(batchId, "run-1", "completed");
    recordBatchRunOutcome(batchId, "run-2", "failed");
    // Retry of run-1 with the same outcome must not duplicate it.
    recordBatchRunOutcome(batchId, "run-1", "completed");

    const updated = loadBatchManifest(batchId)!;
    expect(updated.completedRunIds).toEqual(["run-1"]);
    expect(updated.failedRunIds).toEqual(["run-2"]);
    expect(runStatus(updated, "run-3")).toBe("not_started");

    // A run that later succeeds after a prior failure moves from failed to completed, not both.
    recordBatchRunOutcome(batchId, "run-2", "completed");
    const final = loadBatchManifest(batchId)!;
    expect(final.completedRunIds.sort()).toEqual(["run-1", "run-2"]);
    expect(final.failedRunIds).toEqual([]);
  });
});

describe("Phase 8 simulation invariance (Group I): persistence does not change simulated results", () => {
  it("Track A: identical options produce an identical result whether or not the caller subsequently persists it", () => {
    const options = {
      familyConfig: "S2" as const,
      world: 3,
      slice: ch03,
      concepts: RISE_CONCEPTS,
      simulatorConfig: cfg.simulator.value,
      estimatorConfig: cfg.estimator.value,
      masterSeed: cfg.plan.value.masterSeed,
      calLearners: 2,
      testLearners: 2,
      phase1PerX: cfg.plan.value.trackA.phase1PerX,
      phase2PerT: cfg.plan.value.trackA.phase2PerT,
      reviewEvery: cfg.plan.value.trackA.reviewEvery,
    };
    const a = runTrackA(options);
    const b = runTrackA(options);
    // Compare the persisted fields only -- `bktFits`/`links` legitimately contain fresh
    // closures (FittedLink.predict etc.) each call, which are never reference-equal even
    // when behaviorally identical, so a whole-object toEqual would fail for a reason
    // unrelated to this test's actual claim.
    expect(a.predictions).toEqual(b.predictions);
    expect(a.learnerMetrics).toEqual(b.learnerMetrics);
  });
});

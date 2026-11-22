import * as fs from "node:fs";
import * as path from "node:path";
import { createHash } from "node:crypto";
import { buildExperimentRunArtifact } from "@/research/artifact/buildArtifact";
import { saveExperimentRunArtifact, assertSafeArtifactId } from "@/research/artifact/persistence";
import { canonicalize } from "@/research/artifact/canonicalize";
import type { ExperimentConfig, ExperimentScenario, ExperimentSessionState } from "@/research/experiment/types";
import type { TrackARunResult, RunTrackAOptions } from "@/research/phase8/trackA/runTrackA";

/**
 * Stage 2 Part 9 (docs/stage2-research-persistence-report.md "Phase 6/8
 * integration"): per-run durable persistence for Phase 8 Track A and
 * Track B, kept STRICTLY separate from the existing frozen 13,560-run
 * pilot artifacts (which recorded only aggregate `PilotReport` output --
 * see pipeline/pilot.ts). Nothing here touches, rewrites, or retroactively
 * fills in records for that historical pilot (Part 9.6).
 *
 * Track B runs already execute through the real Phase 5 engine
 * (`runExperimentToCompletion`, see runTrackB.ts), so a Track B run is
 * persisted as a genuine `ExperimentRunArtifact` -- same type, same
 * content-digest/manifest/replay machinery Phase 6 and the modern C0/C2
 * sessions use (src/research/storage/completedSessionArtifacts.ts).
 *
 * Track A has no Phase 5 engine involvement at all (runTrackA.ts replays
 * raw estimator adapters directly) -- there is no `ExperimentSessionState`
 * to wrap, so Track A gets its OWN versioned envelope
 * (`TrackARunRecord`) rather than being forced into the Phase 5 artifact
 * shape (Part 9.2: "do not force unrelated data into one oversized
 * schema").
 */
/** Resolved on every call (not cached) so a caller/test can repoint output by changing `process.env.PHASE8_RUNS_ROOT` without needing to re-import this module. */
export function phase8RunsRoot(): string {
  return process.env.PHASE8_RUNS_ROOT ?? path.join(process.cwd(), "research-output", "phase8", "runs");
}
export const TRACK_A_RUN_SCHEMA_VERSION = "phase8-track-a-run-v1";

export interface TrackARunRecord {
  schemaVersion: string;
  runId: string;
  batchId?: string;
  createdAt: string;
  familyConfig: RunTrackAOptions["familyConfig"];
  world: number;
  sliceChapterId: string;
  masterSeed: string;
  calLearners: number;
  testLearners: number;
  /** Full per-step predictions and per-learner metrics -- bounded here because diagnostic batches are intentionally tiny (Part 9.4/15 Scenario C: "a small, permitted diagnostic batch," never a full-scale run). A full-scale Track A run would need to stream/chunk this field rather than hold it all in memory before one write, exactly as pipeline/pilot.ts already avoids doing for its own aggregate statistics. */
  predictions: TrackARunResult["predictions"];
  learnerMetrics: TrackARunResult["learnerMetrics"];
  contentDigest: string;
}

function atomicWriteJson(finalPath: string, value: unknown): void {
  const dir = path.dirname(finalPath);
  fs.mkdirSync(dir, { recursive: true });
  const tempPath = path.join(dir, `.${path.basename(finalPath)}.${process.pid}.${Date.now()}.tmp`);
  fs.writeFileSync(tempPath, JSON.stringify(value, null, 2), "utf8");
  fs.renameSync(tempPath, finalPath);
}

export function trackARunId(familyConfig: string, world: number, sliceChapterId: string, batchId?: string): string {
  const base = `trackA-${familyConfig}-w${world}-${sliceChapterId}`;
  return batchId ? `${batchId}-${base}` : base;
}

export function trackARunsDir(batchId?: string): string {
  return path.join(phase8RunsRoot(), "trackA", batchId ?? "ad-hoc");
}

export function trackBRunsDir(batchId?: string): string {
  return path.join(phase8RunsRoot(), "trackB", batchId ?? "ad-hoc");
}

/** Persists one Track A run's full result. Refuses to overwrite an existing run id, same immutability guarantee as Phase 6's `saveExperimentRunArtifact` (Part 8.3). */
export function saveTrackARunRecord(
  options: Pick<RunTrackAOptions, "familyConfig" | "world" | "masterSeed" | "calLearners" | "testLearners"> & { sliceChapterId: string },
  result: Pick<TrackARunResult, "predictions" | "learnerMetrics">,
  batchId?: string,
): string {
  const runId = trackARunId(options.familyConfig, options.world, options.sliceChapterId, batchId);
  assertSafeArtifactId(runId);
  const dir = trackARunsDir(batchId);
  const finalPath = path.join(dir, `${runId}.json`);
  if (fs.existsSync(finalPath)) {
    throw new Error(`A Track A run record for "${runId}" already exists at ${finalPath} -- refusing to overwrite a completed run.`);
  }

  const withoutDigest: Omit<TrackARunRecord, "contentDigest"> = {
    schemaVersion: TRACK_A_RUN_SCHEMA_VERSION,
    runId,
    batchId,
    createdAt: new Date().toISOString(),
    familyConfig: options.familyConfig,
    world: options.world,
    sliceChapterId: options.sliceChapterId,
    masterSeed: options.masterSeed,
    calLearners: options.calLearners,
    testLearners: options.testLearners,
    predictions: result.predictions,
    learnerMetrics: result.learnerMetrics,
  };
  const contentDigest = createHash("sha256").update(canonicalize(withoutDigest)).digest("hex");
  const record: TrackARunRecord = { ...withoutDigest, contentDigest };
  atomicWriteJson(finalPath, record);
  return finalPath;
}

export function loadTrackARunRecord(runId: string, batchId?: string): TrackARunRecord {
  const dir = trackARunsDir(batchId);
  const finalPath = path.join(dir, `${runId}.json`);
  const raw = fs.readFileSync(finalPath, "utf8");
  return JSON.parse(raw) as TrackARunRecord;
}

export function listTrackARunRecords(batchId?: string): TrackARunRecord[] {
  const dir = trackARunsDir(batchId);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")) as TrackARunRecord);
}

/** Persists one Track B run via the SAME Phase 6 `ExperimentRunArtifact` machinery every other modern session/run uses -- reused, not reimplemented. Intended to be called from `RunTrackBSessionOptions.onRunComplete`. */
export function saveTrackBRunArtifact(config: ExperimentConfig, scenario: ExperimentScenario, finalState: ExperimentSessionState, batchId?: string): string {
  const artifact = buildExperimentRunArtifact(config, scenario, finalState, { track: "B", experimentId: batchId });
  return saveExperimentRunArtifact(artifact, { dir: trackBRunsDir(batchId) });
}

// ---------------- Batch bookkeeping (Part 9.5: identify completed / incomplete / failed / not-yet-started runs) ----------------

export type Phase8RunStatus = "completed" | "failed" | "not_started";

export interface Phase8BatchManifest {
  schemaVersion: string;
  batchId: string;
  track: "A" | "B";
  createdAt: string;
  updatedAt: string;
  /** Every run id this batch intends to produce, known up front -- lets a resumer tell "not yet started" apart from "failed." */
  plannedRunIds: string[];
  completedRunIds: string[];
  failedRunIds: string[];
}

export const PHASE8_BATCH_SCHEMA_VERSION = "phase8-batch-manifest-v1";

function batchManifestPath(batchId: string): string {
  assertSafeArtifactId(batchId, "batch id");
  return path.join(phase8RunsRoot(), "batches", `${batchId}.json`);
}

export function createBatchManifest(batchId: string, track: "A" | "B", plannedRunIds: string[]): Phase8BatchManifest {
  const now = new Date().toISOString();
  const manifest: Phase8BatchManifest = { schemaVersion: PHASE8_BATCH_SCHEMA_VERSION, batchId, track, createdAt: now, updatedAt: now, plannedRunIds, completedRunIds: [], failedRunIds: [] };
  atomicWriteJson(batchManifestPath(batchId), manifest);
  return manifest;
}

export function loadBatchManifest(batchId: string): Phase8BatchManifest | undefined {
  const p = batchManifestPath(batchId);
  if (!fs.existsSync(p)) return undefined;
  return JSON.parse(fs.readFileSync(p, "utf8")) as Phase8BatchManifest;
}

/** Marks one planned run id as completed or failed, idempotently -- calling this twice for the same run id with the same outcome is a no-op, never a duplicate entry (Part 9.5: "must not silently duplicate completed runs"). */
export function recordBatchRunOutcome(batchId: string, runId: string, outcome: "completed" | "failed"): Phase8BatchManifest {
  const manifest = loadBatchManifest(batchId);
  if (!manifest) throw new Error(`No batch manifest found for "${batchId}" -- call createBatchManifest first.`);
  const completedRunIds = new Set(manifest.completedRunIds);
  const failedRunIds = new Set(manifest.failedRunIds);
  if (outcome === "completed") {
    completedRunIds.add(runId);
    failedRunIds.delete(runId);
  } else {
    failedRunIds.add(runId);
  }
  const updated: Phase8BatchManifest = { ...manifest, completedRunIds: [...completedRunIds], failedRunIds: [...failedRunIds], updatedAt: new Date().toISOString() };
  atomicWriteJson(batchManifestPath(batchId), updated);
  return updated;
}

export function runStatus(manifest: Phase8BatchManifest, runId: string): Phase8RunStatus {
  if (manifest.completedRunIds.includes(runId)) return "completed";
  if (manifest.failedRunIds.includes(runId)) return "failed";
  return "not_started";
}

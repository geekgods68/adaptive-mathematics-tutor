import * as fs from "node:fs";
import * as path from "node:path";
import { ARTIFACT_SCHEMA_VERSION } from "@/research/artifact/types";
import type { ExperimentRunArtifact } from "@/research/artifact/types";

// Server/Node-only module (requirement 4: "restricted to server-side or
// Node.js execution, not browser bundles"). `node:fs`/`node:path` already
// fail to resolve in a browser bundle, which is the primary guard; this
// explicit check gives a clear, early error instead of a confusing
// bundler failure if something ever tries to import this module into
// client code.
if (typeof window !== "undefined") {
  throw new Error("src/research/artifact/persistence.ts is a server/Node-only module and must not be imported into client-side code.");
}

/**
 * Default research-output location — a NEW top-level directory, kept
 * strictly separate from `data/question-bank/` (source data) per
 * requirement 4.10. Not committed to git (see .gitignore) — generated
 * artifacts are reproducible from the experiment engine, the same
 * reasoning already applied to `/research-data/` for the RISE import
 * (see docs/research-decisions.md RD-0001).
 */
export const DEFAULT_RESEARCH_OUTPUT_DIR = path.join(process.cwd(), "research-output", "runs");

const SAFE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_.-]{0,127}$/;

/** Rejects empty, overlong, or path-traversal-capable ids (e.g. "../x", "/etc/passwd", ids containing path separators) before they ever reach the filesystem. */
export function assertSafeArtifactId(id: string, kind: "run id" | "batch id" = "run id"): void {
  if (typeof id !== "string" || !SAFE_ID_PATTERN.test(id) || id.includes("..") || id.includes("/") || id.includes("\\")) {
    throw new Error(`Unsafe or invalid ${kind} "${id}" — must match ${SAFE_ID_PATTERN} with no path separators.`);
  }
}

function artifactFilePath(runId: string, dir: string): string {
  assertSafeArtifactId(runId);
  return path.join(dir, `${runId}.json`);
}

function metadataFilePath(runId: string, dir: string): string {
  assertSafeArtifactId(runId);
  return path.join(dir, `${runId}.meta.json`);
}

/** Lightweight per-run summary written alongside the full artifact, so listing/filtering stored runs (requirement 7) never needs to parse every full artifact's complete traces. */
export interface RunMetadata {
  runId: string;
  experimentId?: string;
  conditionId: string;
  scenarioId?: string;
  track?: "A" | "B";
  createdAt: string;
  schemaVersion: string;
  terminationStatus: string;
  terminationReason?: string;
  questionCount: number;
  correctCount: number;
  estimatorVersion: string;
  selectionPolicyVersion: string;
  contentDigest: string;
}

export function extractRunMetadata(artifact: ExperimentRunArtifact): RunMetadata {
  const correctCount = artifact.provenance.responseSequence.filter((r) => r.isCorrect).length;
  return {
    runId: artifact.runId,
    experimentId: artifact.experimentId,
    conditionId: artifact.conditionId,
    scenarioId: artifact.scenarioId,
    track: artifact.track,
    createdAt: artifact.createdAt,
    schemaVersion: artifact.schemaVersion,
    terminationStatus: artifact.provenance.finalStatus,
    terminationReason: artifact.provenance.terminationReason,
    questionCount: artifact.provenance.responseSequence.length,
    correctCount,
    estimatorVersion: artifact.provenance.estimator.version,
    selectionPolicyVersion: artifact.provenance.selectionPolicy.version,
    contentDigest: artifact.contentDigest,
  };
}

/** Writes `content` to `finalPath` via a temp-file-then-rename so a crash mid-write never leaves a partially-written file at the real path (requirement 4.9). */
function atomicWrite(finalPath: string, content: string): void {
  const dir = path.dirname(finalPath);
  const tempPath = path.join(dir, `.${path.basename(finalPath)}.${process.pid}.${Date.now()}.tmp`);
  fs.writeFileSync(tempPath, content, "utf8");
  fs.renameSync(tempPath, finalPath);
}

export interface SaveArtifactOptions {
  dir?: string;
  /** Explicit, rarely-used escape hatch — persistence refuses to overwrite an existing run by default (requirement 4.3: "never silently overwrite a completed run"). */
  overwrite?: boolean;
}

/**
 * Persists a completed (or terminated) run artifact. Refuses to
 * overwrite an existing artifact for the same `runId` unless
 * `options.overwrite` is explicitly `true`. Both the full artifact and
 * its lightweight metadata sidecar are written atomically.
 */
export function saveExperimentRunArtifact(artifact: ExperimentRunArtifact, options: SaveArtifactOptions = {}): string {
  assertSafeArtifactId(artifact.runId);
  const dir = options.dir ?? DEFAULT_RESEARCH_OUTPUT_DIR;
  fs.mkdirSync(dir, { recursive: true });

  const finalPath = artifactFilePath(artifact.runId, dir);
  if (fs.existsSync(finalPath) && !options.overwrite) {
    throw new Error(
      `An artifact for run "${artifact.runId}" already exists at ${finalPath} — refusing to silently overwrite a completed run. Pass { overwrite: true } to replace it deliberately.`,
    );
  }

  const metaPath = metadataFilePath(artifact.runId, dir);
  atomicWrite(metaPath, JSON.stringify(extractRunMetadata(artifact), null, 2));
  atomicWrite(finalPath, JSON.stringify(artifact, null, 2));
  return finalPath;
}

export class ArtifactNotFoundError extends Error {
  constructor(runId: string, filePath: string) {
    super(`No artifact found for run "${runId}" at ${filePath}.`);
    this.name = "ArtifactNotFoundError";
  }
}

export class ArtifactCorruptError extends Error {
  constructor(runId: string, reason: string) {
    super(`Artifact for run "${runId}" is corrupt or unreadable: ${reason}`);
    this.name = "ArtifactCorruptError";
  }
}

/** Loads and JSON-parses the full artifact for `runId`. Throws `ArtifactNotFoundError`/`ArtifactCorruptError` rather than returning a sentinel — a missing or corrupt run should never be silently treated as "no data." */
export function loadExperimentRunArtifact(runId: string, dir: string = DEFAULT_RESEARCH_OUTPUT_DIR): ExperimentRunArtifact {
  const filePath = artifactFilePath(runId, dir);
  if (!fs.existsSync(filePath)) throw new ArtifactNotFoundError(runId, filePath);

  const raw = fs.readFileSync(filePath, "utf8");
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new ArtifactCorruptError(runId, `not valid JSON (${error instanceof Error ? error.message : String(error)})`);
  }

  if (typeof parsed !== "object" || parsed === null || !("schemaVersion" in parsed) || !("contentDigest" in parsed)) {
    throw new ArtifactCorruptError(runId, "parsed JSON is missing required top-level artifact fields.");
  }
  return parsed as ExperimentRunArtifact;
}

/** Lists every stored run's lightweight metadata — reads only the small `.meta.json` sidecars, never the full artifacts (requirement 7's "inspect stored metadata without loading every detailed trace"). */
export function listRunMetadata(dir: string = DEFAULT_RESEARCH_OUTPUT_DIR): RunMetadata[] {
  if (!fs.existsSync(dir)) return [];
  const metaFiles = fs.readdirSync(dir).filter((f) => f.endsWith(".meta.json"));
  return metaFiles.map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")) as RunMetadata);
}

/** True if a run id has no stored artifact yet under `dir`. */
export function runExists(runId: string, dir: string = DEFAULT_RESEARCH_OUTPUT_DIR): boolean {
  assertSafeArtifactId(runId);
  return fs.existsSync(artifactFilePath(runId, dir));
}

/** Supported-schema-version check, separate from content-integrity checks — see integrity.ts for why these are NOT treated interchangeably. */
export function isSupportedSchemaVersion(artifact: ExperimentRunArtifact): boolean {
  return artifact.schemaVersion === ARTIFACT_SCHEMA_VERSION;
}

import type { MisconceptionEvidenceTally } from "@/domain/learner-model/misconceptionEvidence";
import type { ExperimentProvenance } from "@/research/experiment/provenance";

/** Bumped whenever the ARTIFACT envelope shape changes (not when a run's own data changes) — distinct from any individual run's estimator/policy version. */
export const ARTIFACT_SCHEMA_VERSION = "experiment-run-artifact-v1";

export interface SoftwareVersionInfo {
  packageVersion: string;
  /** Best-effort; absent if `git` is unavailable or this isn't a git checkout (e.g. a packaged deployment) — never treated as a hard requirement. */
  gitCommit?: string;
}

/**
 * The canonical, versioned, serializable record of one completed (or
 * terminated) Phase 5 experiment run — see
 * docs/research-decisions.md RD-0007. Deliberately built AROUND the
 * existing Phase 5 `ExperimentProvenance` (reused verbatim, not
 * duplicated or re-derived) rather than replacing it: `provenance`
 * already carries the question-selection sequence, response sequence,
 * estimator traces, selection traces, and session limits in full
 * precision. This envelope adds only what `ExperimentProvenance` does
 * not: schema/versioning metadata, the final estimator-state snapshot
 * (needed to resume or inspect concept-level mastery, not just the
 * trace history), final misconception tallies, and the content digest.
 *
 * Fields required to REPLAY this run: `provenance` (selection/response
 * sequences), `finalEstimatorStates`/`initialEstimatorStates` (to
 * reconstruct the estimator's state trajectory), and the identity fields
 * (`conditionId`, `provenance.estimator`/`selectionPolicy`). Fields
 * included only for convenience/presentation: `createdAt`,
 * `sessionStartTimestamp`, `softwareVersion`, `experimentId`, `track`.
 */
export interface ExperimentRunArtifact {
  schemaVersion: string;
  runId: string;
  /** Optional higher-level grouping (e.g. a batch of runs sharing a research protocol) — see manifest.ts. */
  experimentId?: string;
  conditionId: string;
  scenarioId?: string;
  /** Track A = estimator comparison (shared selection, varying estimator); Track B = sequencing comparison (shared estimator, varying selection) — see docs/research-decisions.md RD-0006. Caller-supplied; the engine itself has no notion of "track." Optional — a run need not declare one. */
  track?: "A" | "B";
  /** When this ARTIFACT was built (not when the session ran — see sessionStartTimestamp and provenance.responseSequence[].timestamp for that). */
  createdAt: string;
  /** scenario.startTimestamp, carried through for date/time provenance without needing to re-derive it from the first response. */
  sessionStartTimestamp: string;
  softwareVersion: SoftwareVersionInfo;
  /** The complete Phase 5 provenance record — reused, not duplicated. */
  provenance: ExperimentProvenance;
  /** The estimator states the run actually STARTED from (ExperimentScenario.initialEstimatorStates, or {} for an ordinary cold start). */
  initialEstimatorStates: Record<string, unknown>;
  /** The final estimator-state snapshot at termination — not reconstructable from `provenance.estimatorTraces` alone for a concept that only ever had ONE update whose trace doesn't survive flattening, so recorded explicitly. */
  finalEstimatorStates: Record<string, unknown>;
  finalMisconceptionTallies: Record<string, MisconceptionEvidenceTally>;
  /** Preserved so a persisted `invalid_configuration` run still records WHY, rather than just that it failed (see requirement 4's "define whether partially completed or failed experiment runs can be retained and how they are labelled" — the answer here is: retained in full, including the diagnostic detail that explains the failure). */
  configurationErrors?: { field: string; message: string }[];
  /** Preserved for the same reason, for an `unrecoverable_error` termination. */
  errorMessage?: string;
  /** SHA-256 over the canonical serialization of every field above — see canonicalize.ts. Always the LAST field computed, and always excluded from its own input. */
  contentDigest: string;
}

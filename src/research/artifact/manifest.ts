import type { ExperimentRunArtifact } from "@/research/artifact/types";

/** Versioned separately from `ARTIFACT_SCHEMA_VERSION` (requirement 10: "version the manifest schema separately from individual run artifacts"). */
export const MANIFEST_SCHEMA_VERSION = "experiment-batch-manifest-v1";

export interface ManifestRunEntry {
  runId: string;
  scenarioId?: string;
  conditionId: string;
  estimatorVersion: string;
  selectionPolicyVersion: string;
  terminationStatus: string;
  terminationReason?: string;
  /** True only if an integrity check was actually run against this specific artifact and passed — never inferred from the artifact merely existing (requirement 10: "a manifest must not falsely label missing or unverified runs as completed"). */
  verified: boolean;
  contentDigest: string;
}

export interface ExperimentBatchManifest {
  manifestSchemaVersion: string;
  batchId: string;
  /** Caller-supplied label for the research protocol/configuration this batch followed — not interpreted by this module. */
  protocolVersion: string;
  questionBankVersion: { questionCount: number; contentHash: string };
  curriculumVersion: { contentHash: string };
  softwareVersion: { packageVersion: string; gitCommit?: string };
  conditions: string[];
  runs: ManifestRunEntry[];
}

/**
 * Builds a manifest from a set of ALREADY-BUILT artifacts (requirement
 * 10: "support regenerating a manifest deterministically from verified
 * stored runs"). Deliberately carries no generation timestamp — the
 * manifest's content is a pure function of the artifacts it describes,
 * so regenerating it from the same artifacts always reproduces the
 * identical manifest, with no incidental field to exclude from an
 * equality check.
 *
 * Requires every artifact to reference the SAME question-bank and
 * curriculum content hash — a manifest describes one consistent
 * dataset, not a mixture; throws (naming the first mismatching run)
 * rather than silently producing a manifest that misrepresents its own
 * dataset identity.
 */
export function buildManifestFromArtifacts(
  batchId: string,
  protocolVersion: string,
  artifacts: readonly ExperimentRunArtifact[],
  verifyFn: (artifact: ExperimentRunArtifact) => boolean,
): ExperimentBatchManifest {
  if (artifacts.length === 0) {
    throw new Error(`buildManifestFromArtifacts: batch "${batchId}" has no artifacts — a manifest must describe at least one run.`);
  }

  const [first, ...rest] = artifacts;
  for (const artifact of rest) {
    if (artifact.provenance.questionBankVersion.contentHash !== first.provenance.questionBankVersion.contentHash) {
      throw new Error(
        `buildManifestFromArtifacts: batch "${batchId}" mixes runs from different question-bank versions ("${first.runId}" vs "${artifact.runId}") — a manifest must describe one consistent dataset.`,
      );
    }
    if (artifact.provenance.curriculumVersion.contentHash !== first.provenance.curriculumVersion.contentHash) {
      throw new Error(
        `buildManifestFromArtifacts: batch "${batchId}" mixes runs from different curriculum versions ("${first.runId}" vs "${artifact.runId}").`,
      );
    }
  }

  return {
    manifestSchemaVersion: MANIFEST_SCHEMA_VERSION,
    batchId,
    protocolVersion,
    questionBankVersion: first.provenance.questionBankVersion,
    curriculumVersion: { contentHash: first.provenance.curriculumVersion.contentHash },
    softwareVersion: first.softwareVersion,
    conditions: [...new Set(artifacts.map((a) => a.conditionId))].sort(),
    runs: artifacts
      .map((a) => ({
        runId: a.runId,
        scenarioId: a.scenarioId,
        conditionId: a.conditionId,
        estimatorVersion: a.provenance.estimator.version,
        selectionPolicyVersion: a.provenance.selectionPolicy.version,
        terminationStatus: a.provenance.finalStatus,
        terminationReason: a.provenance.terminationReason,
        verified: verifyFn(a),
        contentDigest: a.contentDigest,
      }))
      .sort((x, y) => (x.runId < y.runId ? -1 : x.runId > y.runId ? 1 : 0)),
  };
}

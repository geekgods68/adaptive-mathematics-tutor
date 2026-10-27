export { ARTIFACT_SCHEMA_VERSION, type ExperimentRunArtifact, type SoftwareVersionInfo } from "@/research/artifact/types";
export { canonicalize, computeContentDigest } from "@/research/artifact/canonicalize";
export {
  buildExperimentRunArtifact,
  verifyArtifactContentDigest,
  getCurrentSoftwareVersion,
  type BuildArtifactOptions,
} from "@/research/artifact/buildArtifact";
export {
  DEFAULT_RESEARCH_OUTPUT_DIR,
  assertSafeArtifactId,
  saveExperimentRunArtifact,
  loadExperimentRunArtifact,
  listRunMetadata,
  runExists,
  isSupportedSchemaVersion,
  extractRunMetadata,
  ArtifactNotFoundError,
  ArtifactCorruptError,
  type RunMetadata,
  type SaveArtifactOptions,
} from "@/research/artifact/persistence";
export { verifyArtifactIntegrity, type IntegrityCheckOptions, type IntegrityCheckResult, type TriStateCheck } from "@/research/artifact/integrity";
export { replayFromArtifact, resolveConfigFromRegistry, type ArtifactReplayVerification } from "@/research/artifact/replayArtifact";
export { buildManifestFromArtifacts, MANIFEST_SCHEMA_VERSION, type ExperimentBatchManifest, type ManifestRunEntry } from "@/research/artifact/manifest";
export { listRuns, getRun, verifyRun, summarizeRun, compareRunProvenance, type RunFilter, type ProvenanceComparison } from "@/research/artifact/inspect";
export { toCsv, toJsonl } from "@/research/artifact/export/csv";
export {
  buildRunSummaryRow,
  buildQuestionResponseRows,
  buildMasteryTrajectoryRows,
  buildSelectionDecisionRows,
  buildMisconceptionEvidenceRows,
  RUN_SUMMARY_COLUMNS,
  QUESTION_RESPONSE_COLUMNS,
  MASTERY_TRAJECTORY_COLUMNS,
  SELECTION_DECISION_COLUMNS,
  MISCONCEPTION_EVIDENCE_COLUMNS,
  type RunSummaryRow,
  type QuestionResponseRow,
  type MasteryTrajectoryRow,
  type SelectionDecisionRow,
  type MisconceptionEvidenceRow,
} from "@/research/artifact/export/datasets";

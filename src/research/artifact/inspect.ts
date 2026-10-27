import {
  DEFAULT_RESEARCH_OUTPUT_DIR,
  listRunMetadata,
  loadExperimentRunArtifact,
  type RunMetadata,
} from "@/research/artifact/persistence";
import { verifyArtifactIntegrity, type IntegrityCheckOptions, type IntegrityCheckResult } from "@/research/artifact/integrity";
import { buildRunSummaryRow, type RunSummaryRow } from "@/research/artifact/export/datasets";
import type { ExperimentRunArtifact } from "@/research/artifact/types";

/**
 * Headless, read-only researcher-facing API over stored runs (requirement
 * 7). Every function here only READS persisted artifacts — none of them
 * modify a stored record (requirement 7: "should not modify stored
 * experimental records during inspection"). See scripts/research-cli.ts
 * for a thin command-line wrapper over this same API.
 */

export interface RunFilter {
  conditionId?: string;
  scenarioId?: string;
  terminationStatus?: string;
}

function matchesFilter(metadata: RunMetadata, filter: RunFilter): boolean {
  if (filter.conditionId && metadata.conditionId !== filter.conditionId) return false;
  if (filter.scenarioId && metadata.scenarioId !== filter.scenarioId) return false;
  if (filter.terminationStatus && metadata.terminationStatus !== filter.terminationStatus) return false;
  return true;
}

/** Lists stored runs' lightweight metadata, optionally filtered by condition/scenario/termination status. Reads only `.meta.json` sidecars (see persistence.ts). */
export function listRuns(filter: RunFilter = {}, dir = DEFAULT_RESEARCH_OUTPUT_DIR): RunMetadata[] {
  return listRunMetadata(dir).filter((m) => matchesFilter(m, filter));
}

/** Loads one run's full artifact by id. */
export function getRun(runId: string, dir = DEFAULT_RESEARCH_OUTPUT_DIR): ExperimentRunArtifact {
  return loadExperimentRunArtifact(runId, dir);
}

/** Loads a run and verifies its integrity in one call. */
export function verifyRun(runId: string, options?: IntegrityCheckOptions, dir = DEFAULT_RESEARCH_OUTPUT_DIR): IntegrityCheckResult {
  return verifyArtifactIntegrity(loadExperimentRunArtifact(runId, dir), options);
}

/** The run-level summary row for one stored run, for a quick look without manually composing the export dataset builder. */
export function summarizeRun(runId: string, dir = DEFAULT_RESEARCH_OUTPUT_DIR): RunSummaryRow {
  return buildRunSummaryRow(loadExperimentRunArtifact(runId, dir));
}

export interface ProvenanceComparison {
  runIdA: string;
  runIdB: string;
  sameConditionId: boolean;
  sameScenarioId: boolean;
  sameEstimatorVersion: boolean;
  sameSelectionPolicyVersion: boolean;
  sameQuestionBankHash: boolean;
  sameCurriculumHash: boolean;
  sameSoftwareVersion: boolean;
  /** True only if every field above matches — the two runs are directly, fairly comparable (same matched-scenario starting conditions and software identity; they may still have selected different questions, which is expected and not a mismatch — see docs/research-decisions.md RD-0006 on fairness). */
  matchedScenario: boolean;
}

/** Compares two stored runs' provenance for fairness/matched-scenario auditing — never compares their question sequences or responses themselves (those are EXPECTED to differ between conditions; see RD-0006). */
export function compareRunProvenance(runIdA: string, runIdB: string, dir = DEFAULT_RESEARCH_OUTPUT_DIR): ProvenanceComparison {
  const a = loadExperimentRunArtifact(runIdA, dir);
  const b = loadExperimentRunArtifact(runIdB, dir);

  const sameConditionId = a.conditionId === b.conditionId;
  const sameScenarioId = a.scenarioId !== undefined && a.scenarioId === b.scenarioId;
  const sameEstimatorVersion = a.provenance.estimator.version === b.provenance.estimator.version;
  const sameSelectionPolicyVersion = a.provenance.selectionPolicy.version === b.provenance.selectionPolicy.version;
  const sameQuestionBankHash = a.provenance.questionBankVersion.contentHash === b.provenance.questionBankVersion.contentHash;
  const sameCurriculumHash = a.provenance.curriculumVersion.contentHash === b.provenance.curriculumVersion.contentHash;
  const sameSoftwareVersion = a.softwareVersion.packageVersion === b.softwareVersion.packageVersion;

  return {
    runIdA,
    runIdB,
    sameConditionId,
    sameScenarioId,
    sameEstimatorVersion,
    sameSelectionPolicyVersion,
    sameQuestionBankHash,
    sameCurriculumHash,
    sameSoftwareVersion,
    matchedScenario: sameScenarioId && sameQuestionBankHash && sameCurriculumHash && sameSoftwareVersion,
  };
}

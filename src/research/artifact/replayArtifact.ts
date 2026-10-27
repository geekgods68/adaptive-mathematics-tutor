import { EXPERIMENT_CONDITIONS } from "@/research/experiment/conditions";
import { replayExperimentSession, type ReplayResult } from "@/research/experiment/replay";
import { verifyArtifactIntegrity, type IntegrityCheckOptions, type IntegrityCheckResult } from "@/research/artifact/integrity";
import type { ExperimentConfig, ExperimentScenario, ExperimentSessionState, ExternalResponse } from "@/research/experiment/types";
import type { ExperimentRunArtifact } from "@/research/artifact/types";

/**
 * Rebuilds an `ExperimentSessionState` shape identical to what the
 * original run's final state would have been, purely from data already
 * stored in the artifact (requirement 8.6: "restore or reconstruct the
 * initial experiment state" — read here as reconstructing the recorded
 * trajectory's endpoint, which is what `replayExperimentSession` needs
 * to diff against).
 *
 * Only meaningful for a TERMINATED run: an artifact does not separately
 * record the exact "currently active, not yet answered" cursor for a
 * deliberately-retained in-progress run, so `replayFromArtifact` refuses
 * to attempt computational replay for a non-terminated artifact (see
 * its own doc comment) rather than guess.
 */
function reconstructStateFromArtifact(artifact: ExperimentRunArtifact, learnerId: string): ExperimentSessionState {
  return {
    runId: artifact.runId,
    conditionId: artifact.conditionId,
    scenarioId: artifact.scenarioId,
    learnerId,
    sequenceIndex: artifact.provenance.responseSequence.at(-1)?.sequenceIndex ?? 0,
    status: artifact.provenance.finalStatus,
    terminationReason: artifact.provenance.terminationReason,
    configurationErrors: artifact.configurationErrors,
    errorMessage: artifact.errorMessage,
    currentQuestionId: null,
    estimatorStates: artifact.finalEstimatorStates,
    misconceptionTallies: artifact.finalMisconceptionTallies,
    presentedQuestionIds: artifact.provenance.questionSelectionSequence,
    responses: artifact.provenance.responseSequence,
    selectionTraces: artifact.provenance.selectionTraces,
    estimatorTraces: artifact.provenance.estimatorTraces,
  };
}

/**
 * Resolves an `ExperimentConfig` from an artifact's recorded condition
 * id via the SAME C0-C3 registry Phase 5 defines
 * (`EXPERIMENT_CONDITIONS`) — returns `null` for any condition id the
 * current build doesn't recognize (a custom/C4 condition, or a condition
 * id from a future or incompatible software version), so the caller can
 * tell "we don't know how to replay this" apart from "we tried and it
 * diverged." A caller using a custom condition should pass their own
 * resolver instead of this default.
 */
export function resolveConfigFromRegistry(artifact: ExperimentRunArtifact): ExperimentConfig | null {
  const entry = (EXPERIMENT_CONDITIONS as Record<string, { build: () => ExperimentConfig } | undefined>)[artifact.conditionId];
  return entry ? entry.build() : null;
}

export type ArtifactReplayVerification =
  | { kind: "integrity_only"; reason: string; integrity: IntegrityCheckResult }
  | { kind: "computational_replay"; integrity: IntegrityCheckResult; replay: ReplayResult };

/**
 * The Phase 6 counterpart to Phase 5's `replayExperimentSession` for a
 * PERSISTED artifact (requirement 8) — reuses that function directly
 * rather than duplicating its comparison logic. Always runs an integrity
 * check first; only attempts computational replay if integrity passes
 * AND the original condition/estimator/policy implementation can be
 * resolved, explicitly distinguishing the two outcomes per requirement
 * 8's "if the original software implementation is unavailable,
 * distinguish 'artifact integrity verified' from 'computational replay
 * verified.'" Never claims replay success from a JSON file parsing
 * alone.
 */
export function replayFromArtifact(
  artifact: ExperimentRunArtifact,
  scenario: ExperimentScenario,
  options: {
    integrity?: IntegrityCheckOptions;
    resolveConfig?: (artifact: ExperimentRunArtifact) => ExperimentConfig | null;
  } = {},
): ArtifactReplayVerification {
  const integrity = verifyArtifactIntegrity(artifact, options.integrity);

  if (!integrity.schemaVersionSupported) {
    return { kind: "integrity_only", reason: "Unsupported schema version — cannot safely reconstruct a session state from this artifact shape.", integrity };
  }
  if (!integrity.contentDigestValid) {
    return { kind: "integrity_only", reason: "Content digest invalid — computational replay would be meaningless against possibly-modified data.", integrity };
  }
  if (artifact.provenance.finalStatus !== "terminated") {
    return { kind: "integrity_only", reason: "Artifact records a non-terminated (in-progress/partial) run — its exact pre-termination cursor is not reconstructable from stored data alone.", integrity };
  }

  const resolveConfig = options.resolveConfig ?? resolveConfigFromRegistry;
  const config = resolveConfig(artifact);
  if (!config) {
    return {
      kind: "integrity_only",
      reason: `Condition "${artifact.conditionId}" could not be resolved to a runnable configuration in this build (the original software implementation may be unavailable) — only artifact integrity was verified, not computational replay.`,
      integrity,
    };
  }

  const originalState = reconstructStateFromArtifact(artifact, scenario.learnerId);
  const responses: ExternalResponse[] = artifact.provenance.responseSequence.map((r) => ({ selectedOptionId: r.selectedOptionId, timestamp: r.timestamp }));

  const replay = replayExperimentSession(config, scenario, originalState, responses, artifact.runId);
  return { kind: "computational_replay", integrity, replay };
}

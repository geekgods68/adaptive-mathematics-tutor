import { execSync } from "node:child_process";
import packageJson from "../../../package.json";
import { buildExperimentProvenance } from "@/research/experiment/provenance";
import { computeContentDigest } from "@/research/artifact/canonicalize";
import { ARTIFACT_SCHEMA_VERSION } from "@/research/artifact/types";
import type { ExperimentRunArtifact, SoftwareVersionInfo } from "@/research/artifact/types";
import type { ExperimentConfig, ExperimentScenario, ExperimentSessionState } from "@/research/experiment/types";

let cachedSoftwareVersion: SoftwareVersionInfo | null = null;

/**
 * Best-effort software identity for provenance (requirement 2: "relevant
 * software implementation version or Git commit identifier"). `gitCommit`
 * is omitted, not faked, when `git` isn't available (a non-git checkout,
 * a packaged deployment, or a sandboxed test environment) — see
 * requirement 8's "if the original software implementation is
 * unavailable, distinguish artifact integrity verified from
 * computational replay verified," which relies on this being an honest
 * absence rather than a placeholder value.
 */
export function getCurrentSoftwareVersion(): SoftwareVersionInfo {
  if (cachedSoftwareVersion) return cachedSoftwareVersion;
  let gitCommit: string | undefined;
  try {
    gitCommit = execSync("git rev-parse HEAD", { stdio: ["ignore", "pipe", "ignore"] }).toString().trim() || undefined;
  } catch {
    gitCommit = undefined;
  }
  cachedSoftwareVersion = { packageVersion: (packageJson as { version: string }).version, gitCommit };
  return cachedSoftwareVersion;
}

export interface BuildArtifactOptions {
  experimentId?: string;
  track?: "A" | "B";
  createdAt?: string;
}

/**
 * Converts a completed (or terminated) Phase 5 session into a canonical
 * `ExperimentRunArtifact` — see docs/research-decisions.md RD-0007.
 * Every field comes directly from the already-executed run (`state`) or
 * its already-validated inputs (`config`/`scenario`); nothing here
 * recomputes or reinterprets what happened.
 */
export function buildExperimentRunArtifact(
  config: ExperimentConfig,
  scenario: ExperimentScenario,
  state: ExperimentSessionState,
  options: BuildArtifactOptions = {},
): ExperimentRunArtifact {
  const provenance = buildExperimentProvenance(config, scenario, state);

  const withoutDigest: Omit<ExperimentRunArtifact, "contentDigest"> = {
    schemaVersion: ARTIFACT_SCHEMA_VERSION,
    runId: state.runId,
    experimentId: options.experimentId,
    conditionId: config.conditionId,
    scenarioId: scenario.scenarioId,
    track: options.track,
    createdAt: options.createdAt ?? new Date().toISOString(),
    sessionStartTimestamp: scenario.startTimestamp,
    softwareVersion: getCurrentSoftwareVersion(),
    provenance,
    initialEstimatorStates: scenario.initialEstimatorStates ?? {},
    finalEstimatorStates: state.estimatorStates,
    finalMisconceptionTallies: state.misconceptionTallies,
    configurationErrors: state.configurationErrors,
    errorMessage: state.errorMessage,
  };

  return { ...withoutDigest, contentDigest: computeContentDigest(withoutDigest) };
}

/** Recomputes the digest over every field except `contentDigest` itself and compares. */
export function verifyArtifactContentDigest(artifact: ExperimentRunArtifact): boolean {
  const { contentDigest, ...rest } = artifact;
  return computeContentDigest(rest) === contentDigest;
}

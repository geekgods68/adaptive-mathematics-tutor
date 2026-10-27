export type {
  EstimatorAdapter,
  EstimatorResponseEvidence,
  SelectionAdapter,
  SelectionAdapterInput,
  ExperimentConfig,
  ExperimentScenario,
  ExperimentSessionState,
  ExperimentTerminationReason,
  ExternalResponse,
  RecordedExperimentResponse,
} from "@/research/experiment/types";

export { createNullEstimatorAdapter, createDeterministicEstimatorAdapter } from "@/research/experiment/estimatorAdapter";
export { createNonAdaptiveSelectionAdapter, createAdaptiveSelectionAdapter } from "@/research/experiment/selectionAdapter";
export { EXPERIMENT_CONDITIONS, buildExperimentCondition, buildC4PluggableEstimatorCondition } from "@/research/experiment/conditions";
export { validateExperimentConfig, type ExperimentValidationError, type ExperimentValidationResult } from "@/research/experiment/validation";
export {
  startExperimentSession,
  recordExperimentResponse,
  advanceExperimentSession,
  runExperimentToCompletion,
  createFixedResponseSequenceProvider,
  type ExperimentResponseProvider,
} from "@/research/experiment/sessionEngine";
export { buildExperimentProvenance, type ExperimentProvenance } from "@/research/experiment/provenance";
export { replayExperimentSession, type ReplayResult, type ReplayDivergence } from "@/research/experiment/replay";

// Phase 8 Task B — protocol-independent infrastructure. See
// docs/PHASE8_TECHNICAL_BRIEFING.md and docs/research-decisions.md
// RD-0009. None of this chooses a simulator, a metric, or BKT.
export { createSeededRandom, type SeededRandom } from "@/research/experiment/rng";
export {
  createResponseProviderFromSimulator,
  type LearnerSimulator,
  type LearnerSimulatorContext,
} from "@/research/experiment/simulator";
export { runExperimentBatch, type BatchRunSpec, type BatchRunResult } from "@/research/experiment/batch";
export { createMatchedScenarioSet, isMatchedScenarioSet } from "@/research/experiment/matchedScenarios";
export { computeMetric, computeMetrics, type MetricDefinition } from "@/research/experiment/metrics";
export { estimatorRegistry, EstimatorRegistry, type EstimatorRegistryEntry } from "@/research/experiment/estimatorRegistry";

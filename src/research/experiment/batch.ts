import { runExperimentToCompletion, type ExperimentResponseProvider } from "@/research/experiment/sessionEngine";
import type { ExperimentConfig, ExperimentScenario, ExperimentSessionState } from "@/research/experiment/types";

/**
 * One run to execute as part of a batch. Deliberately just a tuple of
 * already-existing Phase 5 inputs — this module adds NO new run
 * semantics, only sequencing/isolation guarantees around calling
 * `runExperimentToCompletion` (already Phase 5) repeatedly.
 */
export interface BatchRunSpec {
  runId: string;
  config: ExperimentConfig;
  scenario: ExperimentScenario;
  responseProvider: ExperimentResponseProvider;
}

export interface BatchRunResult {
  runId: string;
  state: ExperimentSessionState;
}

/**
 * Runs every spec to completion, in array order, and returns results in
 * that SAME order (deterministic — requirement for Phase 8's "support
 * deterministic ordering of exported records"). Each run is fully
 * isolated: `runExperimentToCompletion` builds a fresh
 * `ExperimentSessionState` per call and no run's config/scenario/
 * provider is shared or mutated by another's execution (every argument
 * here is a plain, already-immutable-by-convention Phase 5 value — this
 * function holds no cross-run mutable state of its own beyond the
 * results array it returns).
 *
 * Does NOT accumulate an entire batch's full traces in a structure
 * beyond what the caller already asked for — each result is exactly one
 * `ExperimentSessionState`, the same thing a single run already
 * produces; this function adds no additional in-memory duplication.
 *
 * Chooses no metric, no scientific comparison, no simulated learner —
 * `responseProvider` is supplied by the caller (a fixed sequence, an
 * arbitrary function, or a `LearnerSimulator` bridged via
 * `createResponseProviderFromSimulator`, see simulator.ts).
 */
export function runExperimentBatch(specs: readonly BatchRunSpec[]): BatchRunResult[] {
  const results: BatchRunResult[] = [];
  for (const spec of specs) {
    const state = runExperimentToCompletion(spec.config, spec.scenario, spec.runId, spec.responseProvider);
    results.push({ runId: spec.runId, state });
  }
  return results;
}

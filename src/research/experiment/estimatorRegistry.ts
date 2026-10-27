import { createDeterministicEstimatorAdapter, createNullEstimatorAdapter } from "@/research/experiment/estimatorAdapter";
import { DEFAULT_MODEL_PARAMETERS, DEFAULT_MODEL_PARAMETERS_V2_INVERSE_DIFFICULTY } from "@/domain/learner-model/parameters";
import type { EstimatorAdapter } from "@/research/experiment/types";

/**
 * A generic, named lookup for `EstimatorAdapter` factories — the
 * mechanism a future baseline estimator (e.g. BKT) registers itself
 * under, so experiment code can reference an estimator by a stable
 * string id instead of importing its constructor directly. This module
 * pre-registers only the estimators that ALREADY EXIST and are already
 * tested (the null estimator and both deterministic-mastery variants) —
 * it does not register a placeholder or stub for anything unimplemented
 * (e.g. no "bkt-v1" entry exists), since that would misrepresent what
 * this build can actually run.
 */
export interface EstimatorRegistryEntry {
  readonly estimatorId: string;
  readonly description: string;
  readonly build: () => EstimatorAdapter;
}

export class EstimatorRegistry {
  private readonly entries = new Map<string, EstimatorRegistryEntry>();

  register(entry: EstimatorRegistryEntry): void {
    if (this.entries.has(entry.estimatorId)) {
      throw new Error(`EstimatorRegistry: "${entry.estimatorId}" is already registered.`);
    }
    this.entries.set(entry.estimatorId, entry);
  }

  get(estimatorId: string): EstimatorRegistryEntry | undefined {
    return this.entries.get(estimatorId);
  }

  list(): EstimatorRegistryEntry[] {
    return [...this.entries.values()];
  }
}

/** The process-wide registry, pre-populated with every estimator this build actually implements. A future BKT/IRT estimator registers itself here via `estimatorRegistry.register(...)` — no change to this file is required to do so. */
export const estimatorRegistry = new EstimatorRegistry();

estimatorRegistry.register({
  estimatorId: "none",
  description: "No mastery estimation (condition C0's null estimator) — a true no-op.",
  build: () => createNullEstimatorAdapter(),
});

estimatorRegistry.register({
  estimatorId: "deterministic-mastery-v1",
  description: "Deterministic mastery, Variant A: symmetric difficulty weighting on the incorrect branch.",
  build: () => createDeterministicEstimatorAdapter(DEFAULT_MODEL_PARAMETERS),
});

estimatorRegistry.register({
  estimatorId: "deterministic-mastery-v2-inverse-difficulty",
  description: "Deterministic mastery, Variant B: inverse difficulty weighting on the incorrect branch (the provisional default).",
  build: () => createDeterministicEstimatorAdapter(DEFAULT_MODEL_PARAMETERS_V2_INVERSE_DIFFICULTY),
});

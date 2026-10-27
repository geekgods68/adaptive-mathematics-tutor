import type { ExperimentRunArtifact } from "@/research/artifact/types";

/**
 * A generic contract for a RESEARCHER-SUPPLIED metric over a set of
 * run artifacts — this module defines the SHAPE a metric takes and a
 * trivial invocation wrapper; it does not choose, implement, or suggest
 * any specific scientific metric (accuracy, calibration, estimation
 * error against simulated ground truth, etc.). Those are Phase 8A
 * protocol decisions. See docs/PHASE8_TECHNICAL_BRIEFING.md §11.
 */
export interface MetricDefinition<TResult> {
  readonly metricId: string;
  readonly version: string;
  /** Pure function of the supplied artifacts — must not mutate them. */
  compute(artifacts: readonly ExperimentRunArtifact[]): TResult;
}

/** Runs a caller-supplied metric against a set of artifacts. Exists only so calling code has one place to invoke "some metric" without needing to know metrics are plain objects — this adds no behavior beyond calling `metric.compute`. */
export function computeMetric<TResult>(metric: MetricDefinition<TResult>, artifacts: readonly ExperimentRunArtifact[]): TResult {
  return metric.compute(artifacts);
}

/** Runs several metrics against the same artifact set, returning a map keyed by `metricId` — convenience only, no aggregation or interpretation of the results. */
export function computeMetrics(metrics: readonly MetricDefinition<unknown>[], artifacts: readonly ExperimentRunArtifact[]): Record<string, unknown> {
  const results: Record<string, unknown> = {};
  for (const metric of metrics) {
    results[metric.metricId] = metric.compute(artifacts);
  }
  return results;
}

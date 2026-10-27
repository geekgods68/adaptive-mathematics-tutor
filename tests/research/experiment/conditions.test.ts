import { describe, expect, it } from "vitest";
import { EXPERIMENT_CONDITIONS, buildC4PluggableEstimatorCondition, buildExperimentCondition } from "@/research/experiment/conditions";
import { createNullEstimatorAdapter } from "@/research/experiment/estimatorAdapter";
import { createNonAdaptiveSelectionAdapter } from "@/research/experiment/selectionAdapter";

describe("EXPERIMENT_CONDITIONS registry — C0-C3", () => {
  it("registers exactly C0, C1, C2, C3", () => {
    expect(Object.keys(EXPERIMENT_CONDITIONS).sort()).toEqual(["C0", "C1", "C2", "C3"]);
  });

  it("C0 pairs the null estimator with the non-adaptive policy", () => {
    const config = EXPERIMENT_CONDITIONS.C0.build();
    expect(config.estimator.estimatorType).toBe("none");
    expect(config.selection.policyType).toBe("non_adaptive");
  });

  it("C1 and C2 both use prerequisite-aware adaptive selection but different mastery variants", () => {
    const c1 = EXPERIMENT_CONDITIONS.C1.build();
    const c2 = EXPERIMENT_CONDITIONS.C2.build();
    expect(c1.estimator.version).toBe("deterministic-mastery-v1");
    expect(c2.estimator.version).toBe("deterministic-mastery-v2-inverse-difficulty");
    expect((c1.selection.parameters as { prerequisiteAware: boolean }).prerequisiteAware).toBe(true);
    expect((c2.selection.parameters as { prerequisiteAware: boolean }).prerequisiteAware).toBe(true);
  });

  it("C3 uses the SAME estimator as C2 but the prerequisite-unaware ablation", () => {
    const c2 = EXPERIMENT_CONDITIONS.C2.build();
    const c3 = EXPERIMENT_CONDITIONS.C3.build();
    expect(c3.estimator.version).toBe(c2.estimator.version);
    expect((c3.selection.parameters as { prerequisiteAware: boolean }).prerequisiteAware).toBe(false);
    expect(c3.selection.version).not.toBe(c2.selection.version);
  });

  it("every registered condition's conditionId matches its registry key", () => {
    for (const [key, entry] of Object.entries(EXPERIMENT_CONDITIONS)) {
      expect(entry.build().conditionId).toBe(key);
    }
  });

  it("building the same condition twice produces independently-usable (non-shared-mutable) configs", () => {
    const first = EXPERIMENT_CONDITIONS.C1.build();
    const second = EXPERIMENT_CONDITIONS.C1.build();
    expect(first).not.toBe(second);
    expect(first.estimator.version).toBe(second.estimator.version);
  });
});

describe("buildC4PluggableEstimatorCondition — the pluggable extension point", () => {
  it("accepts any conforming EstimatorAdapter without a hardcoded BKT implementation", () => {
    // Using the null adapter here only to prove the SHAPE is pluggable —
    // a real future estimator (e.g. BKT) would pass its own adapter.
    const config = buildC4PluggableEstimatorCondition(createNullEstimatorAdapter());
    expect(config.conditionId).toBe("C4");
    expect(config.estimator.estimatorType).toBe("none");
    expect(config.selection.policyType).toBe("adaptive");
  });
});

describe("buildExperimentCondition — generic factory for Track A's estimator-comparison combination", () => {
  it("permits a non-adaptive selection policy running alongside a real mastery estimator (comparing estimators under a fixed, non-confounding sequence)", () => {
    const config = buildExperimentCondition("estimator-comparison", createNullEstimatorAdapter(), createNonAdaptiveSelectionAdapter());
    expect(config.selection.policyType).toBe("non_adaptive");
    expect(config.estimator.estimatorType).toBe("none");
  });
});

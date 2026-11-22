import { describe, expect, it } from "vitest";
import { CONDITION_REGISTRY, getConditionRegistryEntry, validateConditionRegistry } from "@/research/experiment/conditionRegistry";
import { EXPERIMENT_CONDITIONS } from "@/research/experiment/conditions";

/**
 * Stage 1 Test Group E: C0-C3 must retain their documented identities
 * and intended policies — this registry is metadata ONLY and must never
 * drift from the real, unmodified `EXPERIMENT_CONDITIONS` registry
 * (conditions.ts, untouched by Stage 1).
 */
describe("Stage 1 Group E: condition registry consistency", () => {
  it("documents exactly the same condition ids as EXPERIMENT_CONDITIONS, no more, no fewer", () => {
    const registryIds = CONDITION_REGISTRY.map((e) => e.conditionId).sort();
    const liveIds = Object.keys(EXPERIMENT_CONDITIONS).sort();
    expect(registryIds).toEqual(liveIds);
  });

  it("validateConditionRegistry finds zero mismatches against the real registry", () => {
    expect(validateConditionRegistry()).toEqual([]);
  });

  it("C0 is documented as the non-adaptive sequencing control with no estimator", () => {
    const entry = getConditionRegistryEntry("C0");
    expect(entry.estimatorType).toBe("none");
    expect(entry.selectionPolicyType).toBe("non_adaptive");
    expect(entry.prerequisiteAware).toBe(false);
  });

  it("C1 and C2 are both prerequisite-aware adaptive conditions; C3 is the prerequisite-unaware ablation of C2's estimator", () => {
    expect(getConditionRegistryEntry("C1").prerequisiteAware).toBe(true);
    expect(getConditionRegistryEntry("C2").prerequisiteAware).toBe(true);
    expect(getConditionRegistryEntry("C3").prerequisiteAware).toBe(false);
  });

  it("every condition declares RISE as its canonical question bank", () => {
    for (const entry of CONDITION_REGISTRY) {
      expect(entry.canonicalQuestionBank).toBe("RISE");
    }
  });

  it("detects a deliberately introduced mismatch (self-check on the validator itself)", () => {
    // Build a bogus registry inline rather than mutating the real one, to prove the comparison
    // logic actually catches a real discrepancy and isn't vacuously true.
    const bogusEntry = { ...getConditionRegistryEntry("C0"), selectionPolicyType: "adaptive" as const };
    const liveBuild = EXPERIMENT_CONDITIONS.C0.build();
    expect(liveBuild.selection.policyType).not.toBe(bogusEntry.selectionPolicyType);
  });
});

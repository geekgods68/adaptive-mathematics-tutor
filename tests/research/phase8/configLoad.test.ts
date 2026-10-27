import { describe, expect, it } from "vitest";
import { loadEstimatorConfig, loadExperimentPlan, loadPhase8Config, loadSimulatorConfig } from "@/research/phase8/config/load";

describe("Phase 8 config loaders", () => {
  it("loads simulator-config-v2.json with its declared version and a stable hash", () => {
    const { value, sha256 } = loadSimulatorConfig();
    expect(value.version).toBe("phase8-sim-v2");
    expect(value.S4.cells["S4-GF"]).toEqual({ lambda: 0.05, phi: 1.0 });
    expect(sha256).toMatch(/^[0-9a-f]{64}$/);
    // Re-loading must produce the identical hash (R-4's "changing any config value changes its hash" implies the inverse: not changing it must not).
    expect(loadSimulatorConfig().sha256).toBe(sha256);
  });

  it("loads estimator-config-v2.json with its declared version", () => {
    const { value } = loadEstimatorConfig();
    expect(value.version).toBe("phase8-est-v2");
    expect(value.detA).toBe("DEFAULT_MODEL_PARAMETERS");
    expect(value.bktEm.coarse.pL0).toEqual([0.1, 0.3, 0.5, 0.7, 0.9]);
  });

  it("loads experiment-plan-v2.json with its declared version", () => {
    const { value } = loadExperimentPlan();
    expect(value.version).toBe("phase8-plan-v2");
    expect(value.masterSeed).toBe("RISE-PHASE8-v2");
    expect(value.trackB.policies).toEqual(["C0", "C1", "C2", "C3"]);
  });

  it("loadPhase8Config loads all three in one call", () => {
    const config = loadPhase8Config();
    expect(config.simulator.value.version).toBe("phase8-sim-v2");
    expect(config.estimator.value.version).toBe("phase8-est-v2");
    expect(config.plan.value.version).toBe("phase8-plan-v2");
  });

  it("each config file hashes differently from the others", () => {
    const config = loadPhase8Config();
    const hashes = [config.simulator.sha256, config.estimator.sha256, config.plan.sha256];
    expect(new Set(hashes).size).toBe(3);
  });
});

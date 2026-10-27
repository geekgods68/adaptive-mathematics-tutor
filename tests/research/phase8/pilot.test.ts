import { beforeAll, describe, expect, it } from "vitest";
import { runPilot, type PilotReport } from "@/research/phase8/pipeline/pilot";

const PILOT_OPTIONS = { pilotWorlds: 2, trackACalLearners: 5, trackATestLearners: 5, trackBLearners: 5 } as const;

describe("runPilot (reduced scale for test speed -- see the real 8C-Pilot run for official-scale numbers)", () => {
  let report: PilotReport;
  let reportAgain: PilotReport;

  beforeAll(() => {
    report = runPilot(PILOT_OPTIONS);
    reportAgain = runPilot(PILOT_OPTIONS);
  }, 60000);

  it("completes with zero failures and produces well-formed Track A/B reports over the 3 approved slices", () => {
    expect(report.failureCount).toBe(0);
    expect(report.totalRuns).toBeGreaterThan(0);
    expect(report.slicesUsed).toEqual(["CH07", "CH03", "CH10"]);
  });

  it("S1 implementation check passes: every policy produces an identical K(T) for the SAME learner (no transition in S1)", () => {
    expect(report.s1Check.pass).toBe(true);
    expect(report.s1Check.policyKDifferences.every((d) => d < 1e-9)).toBe(true);
  });

  it("computes a non-negative required W for every family where variance could be estimated", () => {
    for (const w of Object.values(report.trackA.requiredW)) {
      expect(w.logLoss_detA_vs_bktFit).toBeGreaterThanOrEqual(20); // clipped to minimum 20 (B9.2)
      expect(w.mae_detA_vs_bktFit).toBeGreaterThanOrEqual(20);
    }
    for (const w of Object.values(report.trackB.requiredW)) {
      expect(w.hB1_c2_vs_c0).toBeGreaterThanOrEqual(20);
      expect(w.hB2_c2_vs_c3).toBeGreaterThanOrEqual(20);
    }
  });

  it("reports no cross-condition contrast values (B9.2: 'the pilot prints no estimator or policy contrast') -- only per-condition series and the derived required-W", () => {
    // Structural check: the report type itself only exposes per-family/per-condition series
    // (detALogLossByWorld, kT_C0, etc.) and requiredW -- never a precomputed difference field.
    const trackAKeys = Object.keys(Object.values(report.trackA.perFamily)[0] ?? {});
    expect(trackAKeys).toEqual(["detALogLossByWorld", "bktFitLogLossByWorld", "detAMaeByWorld", "bktFitMaeByWorld"]);
    const trackBKeys = Object.keys(Object.values(report.trackB.perFamilyConfig)[0] ?? {});
    expect(trackBKeys).toEqual(["kT_C0", "kT_C2", "kT_C3", "activationRateC2", "failureCount"]);
  });

  it("is deterministic given the same options", () => {
    expect(report.trackA.perFamily).toEqual(reportAgain.trackA.perFamily);
    expect(report.trackB.perFamilyConfig).toEqual(reportAgain.trackB.perFamilyConfig);
  });
});

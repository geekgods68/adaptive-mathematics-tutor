import { describe, expect, it } from "vitest";
import { runTrackA, TIER1_ESTIMATOR_IDS } from "@/research/phase8/trackA/runTrackA";
import { RISE_CONCEPTS, RISE_QUESTIONS } from "@/domain/rise";
import { selectConceptSubgraphSlices } from "@/research/phase8/slices/selectSlices";
import { loadPhase8Config } from "@/research/phase8/config/load";

const cfg = loadPhase8Config();
const sliceResult = selectConceptSubgraphSlices(RISE_CONCEPTS, RISE_QUESTIONS);
const ch03 = sliceResult.primarySlices.find((s) => s.chapterId === "CH03")!;

function run(familyConfig: "S1" | "S2" | "S3" | "S4-ref", calLearners = 5, testLearners = 5) {
  return runTrackA({
    familyConfig,
    world: 1,
    slice: ch03,
    concepts: RISE_CONCEPTS,
    simulatorConfig: cfg.simulator.value,
    estimatorConfig: cfg.estimator.value,
    masterSeed: cfg.plan.value.masterSeed,
    calLearners,
    testLearners,
    phase1PerX: cfg.plan.value.trackA.phase1PerX,
    phase2PerT: cfg.plan.value.trackA.phase2PerT,
    reviewEvery: cfg.plan.value.trackA.reviewEvery,
  });
}

describe("runTrackA", () => {
  it("produces a prediction row for every (test learner, step, estimator) combination, for all four families", () => {
    for (const familyConfig of ["S1", "S2", "S3", "S4-ref"] as const) {
      const result = run(familyConfig);
      const perLearnerSteps = result.predictions.filter((p) => p.learnerId === "test-000" && p.estimator === "det-a").length;
      expect(perLearnerSteps).toBeGreaterThan(0);
      const expectedTotal = perLearnerSteps * 5 /* test learners */ * TIER1_ESTIMATOR_IDS.length;
      expect(result.predictions.length).toBe(expectedTotal);
    }
  });

  it("fits BKT for every target and external concept in the slice", () => {
    const result = run("S2");
    const allConceptIds = new Set([...ch03.targetConceptIds, ...ch03.externalPrereqConceptIds]);
    for (const conceptId of allConceptIds) {
      expect(result.bktFits[conceptId]).toBeDefined();
      expect(result.bktFits[conceptId].params.pL0).toBeGreaterThanOrEqual(0);
    }
  });

  it("fits Link-D and Link-1 for every updating estimator (not B0, which is identity-only)", () => {
    const result = run("S1");
    for (const estId of ["det-a", "det-b", "bkt-fit", "bkt-default", "run-prop", "ema"]) {
      expect(result.links[`${estId}:link-d`]).toBeDefined();
      expect(result.links[`${estId}:link-1`]).toBeDefined();
    }
    expect(result.links["b0:link-d"]).toBeUndefined();
  });

  it("every prediction is a well-formed probability/score, and B0's predictions have no link scores", () => {
    const result = run("S1");
    for (const row of result.predictions) {
      expect(row.pIdentity).toBeGreaterThanOrEqual(0);
      expect(row.pIdentity).toBeLessThanOrEqual(1);
      if (row.estimator === "b0") {
        expect(row.pLink1).toBeNull();
        expect(row.pLinkD).toBeNull();
      } else {
        expect(row.pLink1).toBeGreaterThan(0);
        expect(row.pLink1).toBeLessThan(1);
        expect(row.pLinkD).toBeGreaterThan(0);
        expect(row.pLinkD).toBeLessThan(1);
      }
    }
  });

  it("learner metrics are finite, non-negative (log loss/Brier/MAE) for every estimator", () => {
    const result = run("S4-ref");
    for (const m of result.learnerMetrics) {
      expect(Number.isFinite(m.meanLogLoss)).toBe(true);
      expect(Number.isFinite(m.meanBrier)).toBe(true);
      expect(Number.isFinite(m.maeLatent)).toBe(true);
      expect(m.meanLogLoss).toBeGreaterThanOrEqual(0);
      expect(m.meanBrier).toBeGreaterThanOrEqual(0);
      expect(m.maeLatent).toBeGreaterThanOrEqual(0);
    }
  });

  it("is deterministic: identical options produce identical predictions and metrics", () => {
    const first = run("S1");
    const second = run("S1");
    expect(first.predictions).toEqual(second.predictions);
    expect(first.learnerMetrics).toEqual(second.learnerMetrics);
  });

  it("every estimator replays the IDENTICAL response (correctness) sequence for a given test learner (B4.4 fairness)", () => {
    const result = run("S1");
    const byEstimator = new Map<string, boolean[]>();
    for (const row of result.predictions) {
      if (row.learnerId !== "test-000") continue;
      const list = byEstimator.get(row.estimator) ?? [];
      list[row.step] = row.correct;
      byEstimator.set(row.estimator, list);
    }
    const sequences = [...byEstimator.values()];
    for (const seq of sequences.slice(1)) {
      expect(seq).toEqual(sequences[0]);
    }
  });
});

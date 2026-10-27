import { describe, expect, it } from "vitest";
import { createRunPropEstimatorAdapter } from "@/research/phase8/estimators/runProp";
import { createEmaEstimatorAdapter } from "@/research/phase8/estimators/ema";
import { buildBaseRateTable } from "@/research/phase8/estimators/baseRate";
import { fitLink } from "@/research/phase8/estimators/link";
import { loadEstimatorConfig } from "@/research/phase8/config/load";
import { createSeededRandom } from "@/research/experiment/rng";

const estimatorConfig = loadEstimatorConfig().value;

function evidence(conceptId: string, correct: boolean) {
  return {
    questionId: "q1",
    conceptWeights: { [conceptId]: 1 },
    difficulty: 3 as never,
    correct,
    selectedOptionId: "opt-1",
    usedHint: false,
    sequenceIndex: 0,
    timestamp: "t",
  };
}

describe("RunProp", () => {
  it("is Laplace-smoothed: (c+1)/(n+2), starting at 0.5 with no observations", () => {
    const adapter = createRunPropEstimatorAdapter();
    let states: Record<string, { c: number; n: number }> = { "c-1": adapter.initConcept("L1", "c-1", "t0") };
    expect(adapter.readMastery(states["c-1"])).toBeCloseTo(0.5, 12);

    const r1 = adapter.applyResponse(states, evidence("c-1", true), "L1");
    states = r1.updatedStates;
    expect(adapter.readMastery(states["c-1"])).toBeCloseTo(2 / 3, 12);

    const r2 = adapter.applyResponse(states, evidence("c-1", false), "L1");
    states = r2.updatedStates;
    expect(adapter.readMastery(states["c-1"])).toBeCloseTo(2 / 4, 12);
  });
});

describe("EMA", () => {
  it("updates as M <- M + lambda(o - M) from M0 = 0.5", () => {
    const adapter = createEmaEstimatorAdapter(estimatorConfig.ema);
    const states = { "c-1": adapter.initConcept("L1", "c-1", "t0") };
    expect(adapter.readMastery(states["c-1"])).toBeCloseTo(0.5, 12);

    const { updatedStates } = adapter.applyResponse(states, evidence("c-1", true), "L1");
    const expected = 0.5 + estimatorConfig.ema.lambda * (1 - 0.5);
    expect(adapter.readMastery(updatedStates["c-1"])).toBeCloseTo(expected, 12);
  });
});

describe("B0 (static per-concept-level calibration rate)", () => {
  it("is add-one smoothed and falls back to the concept rate, then 0.5, when a cell is empty", () => {
    const table = buildBaseRateTable(
      [
        { conceptId: "c-1", level: 2, correct: true },
        { conceptId: "c-1", level: 2, correct: true },
        { conceptId: "c-1", level: 2, correct: false },
        { conceptId: "c-1", level: 4, correct: true },
      ],
      true,
    );
    expect(table.predict("c-1", 2)).toBeCloseTo((2 + 1) / (3 + 2), 12);
    // Level 3 has no direct data for c-1 -- falls back to the concept-wide rate.
    const conceptWideRate = (3 + 1) / (4 + 2);
    expect(table.predict("c-1", 3)).toBeCloseTo(conceptWideRate, 12);
    // Entirely unseen concept falls back to 0.5.
    expect(table.predict("c-unseen", 1)).toBe(0.5);
  });

  it("never updates (no learn step) -- it is purely a function of the calibration data passed in at construction", () => {
    const table = buildBaseRateTable([{ conceptId: "c-1", level: 1, correct: true }], true);
    const first = table.predict("c-1", 1);
    const second = table.predict("c-1", 1);
    expect(first).toBe(second);
  });
});

describe("Link-D / Link-1 (Newton-Raphson logistic calibration)", () => {
  it("L-1-style: recovers known logistic coefficients on synthetic data generated from that exact model", () => {
    const rng = createSeededRandom("link-recovery");
    const trueA = -0.3;
    const trueB = 1.4;
    const rows = Array.from({ length: 4000 }, () => {
      // z is the feature AFTER the logit transform of a raw score; construct it directly
      // by choosing a raw score r = sigma(z) so that logit(clip(r)) recovers z exactly.
      const z = (rng.next() - 0.5) * 4;
      const r = 1 / (1 + Math.exp(-z));
      const pCorrect = 1 / (1 + Math.exp(-(trueA + trueB * z)));
      return { rawScore: r, level: 3, optionCount: 4, correct: rng.next() < pCorrect };
    });
    const fitted = fitLink(rows, estimatorConfig.link, "link-1");
    expect(fitted.featureNames).toEqual(["intercept", "z"]);
    // Loose tolerance: finite-sample noise plus the (tiny, 1e-4) ridge penalty mean this
    // recovers the generating coefficients approximately, not to high precision.
    expect(Math.abs(fitted.coefficients[0] - trueA)).toBeLessThan(0.1);
    expect(Math.abs(fitted.coefficients[1] - trueB)).toBeLessThan(0.1);
    expect(fitted.converged).toBe(true);
  });

  it("Link-D includes level dummies (L3 reference) and option-count dummies when counts other than 4 are present", () => {
    const rng = createSeededRandom("link-d-features");
    const rows = Array.from({ length: 500 }, () => ({
      rawScore: 0.3 + rng.next() * 0.4,
      level: 1 + Math.floor(rng.next() * 5),
      optionCount: [3, 4, 5][Math.floor(rng.next() * 3)],
      correct: rng.next() < 0.5,
    }));
    const fitted = fitLink(rows, estimatorConfig.link, "link-d");
    expect(fitted.featureNames).toEqual(["intercept", "z", "level_1", "level_2", "level_4", "level_5", "options_3", "options_5"]);
  });

  it("predictReference evaluates at level 3, 4 options regardless of the input level/option args", () => {
    const rng = createSeededRandom("link-ref");
    const rows = Array.from({ length: 1000 }, () => ({
      rawScore: 0.2 + rng.next() * 0.6,
      level: 1 + Math.floor(rng.next() * 5),
      optionCount: [3, 4, 5][Math.floor(rng.next() * 3)],
      correct: rng.next() < 0.5,
    }));
    const fitted = fitLink(rows, estimatorConfig.link, "link-d");
    const r = 0.5;
    expect(fitted.predictReference(r)).toBeCloseTo(fitted.predict(r, 3, 4), 12);
  });
});

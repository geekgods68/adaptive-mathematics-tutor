import { describe, expect, it } from "vitest";
import {
  brierScore,
  calibrationBins,
  latentRmseAndMae,
  questionsToMasteryAnalysis,
  pairedTTest,
  studentTTwoSidedP,
  mean,
  sd,
  type BrierRow,
  type QtmRow,
} from "@/research/phase8/metrics/threeMetrics";

describe("brierScore", () => {
  it("is 0 for perfect predictions (independently derived reference case)", () => {
    const rows: BrierRow[] = [
      { pPredicted: 1, observedCorrect: true },
      { pPredicted: 0, observedCorrect: false },
    ];
    expect(brierScore(rows).meanBrier).toBe(0);
  });

  it("is 1 for maximally-confident-wrong predictions on both outcomes", () => {
    const rows: BrierRow[] = [
      { pPredicted: 1, observedCorrect: false },
      { pPredicted: 0, observedCorrect: true },
    ];
    expect(brierScore(rows).meanBrier).toBe(1);
  });

  it("all-correct outcomes: a p=0.5 forecaster scores exactly 0.25 (reference computed by hand)", () => {
    const rows: BrierRow[] = Array.from({ length: 10 }, () => ({ pPredicted: 0.5, observedCorrect: true }));
    expect(brierScore(rows).meanBrier).toBeCloseTo(0.25, 10);
  });

  it("all-incorrect outcomes: a p=0.5 forecaster still scores exactly 0.25", () => {
    const rows: BrierRow[] = Array.from({ length: 10 }, () => ({ pPredicted: 0.5, observedCorrect: false }));
    expect(brierScore(rows).meanBrier).toBeCloseTo(0.25, 10);
  });

  it("a confident-wrong prediction (p=0.99, observed incorrect) scores close to the theoretical max for that p", () => {
    const rows: BrierRow[] = [{ pPredicted: 0.99, observedCorrect: false }];
    // (0.99 - 0)^2 = 0.9801, computed independently of the implementation.
    expect(brierScore(rows).meanBrier).toBeCloseTo(0.9801, 10);
  });

  it("rejects a predicted probability outside [0,1] rather than silently clamping", () => {
    expect(() => brierScore([{ pPredicted: 1.2, observedCorrect: true }])).toThrow(/out of \[0,1\]/);
    expect(() => brierScore([{ pPredicted: -0.1, observedCorrect: true }])).toThrow(/out of \[0,1\]/);
  });

  it("rejects empty input rather than returning NaN or 0", () => {
    expect(() => brierScore([])).toThrow(/non-empty/);
  });

  it("mean Brier of a mixed set matches an independently hand-computed value", () => {
    // (0.2-0)^2=0.04, (0.8-1)^2=0.04, (0.5-1)^2=0.25, (0.5-0)^2=0.25 -> mean = 0.58/4 = 0.145
    const rows: BrierRow[] = [
      { pPredicted: 0.2, observedCorrect: false },
      { pPredicted: 0.8, observedCorrect: true },
      { pPredicted: 0.5, observedCorrect: true },
      { pPredicted: 0.5, observedCorrect: false },
    ];
    expect(brierScore(rows).meanBrier).toBeCloseTo(0.145, 10);
  });
});

describe("calibrationBins", () => {
  it("never fabricates a point for an empty bin", () => {
    const rows: BrierRow[] = [
      { pPredicted: 0.05, observedCorrect: true },
      { pPredicted: 0.95, observedCorrect: true },
    ];
    const bins = calibrationBins(rows, 10);
    // Only bins [0,0.1) and [0.9,1.0) should appear -- not all 10.
    expect(bins.length).toBe(2);
    expect(bins.every((b) => b.n > 0)).toBe(true);
  });

  it("meanPredicted/meanObserved match a hand-computed reference for one populated bin", () => {
    const rows: BrierRow[] = [
      { pPredicted: 0.42, observedCorrect: true },
      { pPredicted: 0.48, observedCorrect: false },
    ];
    const bins = calibrationBins(rows, 10);
    expect(bins.length).toBe(1);
    expect(bins[0].meanPredicted).toBeCloseTo(0.45, 10);
    expect(bins[0].meanObserved).toBeCloseTo(0.5, 10);
  });
});

describe("latentRmseAndMae", () => {
  it("is 0/0 for perfect latent recovery", () => {
    const r = latentRmseAndMae([
      { estimated: 0.5, truth: 0.5 },
      { estimated: 0.8, truth: 0.8 },
    ]);
    expect(r.rmse).toBe(0);
    expect(r.mae).toBe(0);
  });

  it("RMSE is strictly more sensitive to a single large outlier than MAE (the stated outlier-sensitivity property)", () => {
    // Reference set: three small errors of 0.1 and one large error of 0.9.
    const rows = [
      { estimated: 0.1, truth: 0 },
      { estimated: 0.1, truth: 0 },
      { estimated: 0.1, truth: 0 },
      { estimated: 0.9, truth: 0 },
    ];
    const r = latentRmseAndMae(rows);
    // MAE = (0.1*3 + 0.9)/4 = 0.3 ; RMSE = sqrt((0.01*3 + 0.81)/4) = sqrt(0.84/4) = sqrt(0.21) ~= 0.4583
    expect(r.mae).toBeCloseTo(0.3, 10);
    expect(r.rmse).toBeCloseTo(Math.sqrt(0.21), 10);
    expect(r.rmse).toBeGreaterThan(r.mae);
  });

  it("rejects non-finite inputs", () => {
    expect(() => latentRmseAndMae([{ estimated: NaN, truth: 0.5 }])).toThrow(/non-finite/);
  });

  it("rejects empty input", () => {
    expect(() => latentRmseAndMae([])).toThrow(/non-empty/);
  });
});

describe("questionsToMasteryAnalysis", () => {
  it("immediate mastery for every learner: median QTM = 1, attainment probability = 1, RMST = 1", () => {
    const rows: QtmRow[] = Array.from({ length: 5 }, () => ({ itemsToCriterion: 1, censored: false, budget: 60 }));
    const a = questionsToMasteryAnalysis(rows);
    expect(a.attainmentProbability).toBe(1);
    expect(a.medianQtm).toBe(1);
    expect(a.restrictedMeanQtm).toBe(1);
    expect(a.nAttained).toBe(5);
  });

  it("no mastery ever attained (all censored): attainment probability 0, median null (never approximated as the budget), RMST = budget", () => {
    const rows: QtmRow[] = Array.from({ length: 5 }, () => ({ itemsToCriterion: null, censored: true, budget: 60 }));
    const a = questionsToMasteryAnalysis(rows);
    expect(a.attainmentProbability).toBe(0);
    expect(a.medianQtm).toBeNull();
    expect(a.restrictedMeanQtm).toBe(60);
    expect(a.cumulativeAttainmentCurve).toEqual([]);
  });

  it("a mix below 50% attainment: median remains null (not estimable), never silently reported as the max observed time", () => {
    const rows: QtmRow[] = [
      { itemsToCriterion: 10, censored: false, budget: 60 },
      { itemsToCriterion: 20, censored: false, budget: 60 },
      { itemsToCriterion: null, censored: true, budget: 60 },
      { itemsToCriterion: null, censored: true, budget: 60 },
      { itemsToCriterion: null, censored: true, budget: 60 },
    ];
    const a = questionsToMasteryAnalysis(rows);
    expect(a.attainmentProbability).toBeCloseTo(0.4, 10);
    expect(a.medianQtm).toBeNull();
  });

  it("exactly-50%-plus attainment: median is the step at which cumulative probability first reaches 0.5", () => {
    const rows: QtmRow[] = [
      { itemsToCriterion: 5, censored: false, budget: 60 },
      { itemsToCriterion: 5, censored: false, budget: 60 },
      { itemsToCriterion: 5, censored: false, budget: 60 },
      { itemsToCriterion: null, censored: true, budget: 60 },
      { itemsToCriterion: null, censored: true, budget: 60 },
    ];
    const a = questionsToMasteryAnalysis(rows);
    expect(a.attainmentProbability).toBeCloseTo(0.6, 10);
    expect(a.medianQtm).toBe(5);
  });

  it("restricted-mean (type-I censoring at a single fixed horizon) equals the naive min(T,budget) mean by construction -- cross-check against an independent brute-force computation", () => {
    const rows: QtmRow[] = [
      { itemsToCriterion: 3, censored: false, budget: 20 },
      { itemsToCriterion: 7, censored: false, budget: 20 },
      { itemsToCriterion: null, censored: true, budget: 20 },
      { itemsToCriterion: 15, censored: false, budget: 20 },
      { itemsToCriterion: null, censored: true, budget: 20 },
    ];
    const a = questionsToMasteryAnalysis(rows);
    const bruteForce = (3 + 7 + 20 + 15 + 20) / 5;
    expect(a.restrictedMeanQtm).toBeCloseTo(bruteForce, 10);
  });

  it("rejects mismatched budgets across rows (a matched-condition requirement)", () => {
    const rows: QtmRow[] = [
      { itemsToCriterion: 5, censored: false, budget: 60 },
      { itemsToCriterion: 5, censored: false, budget: 30 },
    ];
    expect(() => questionsToMasteryAnalysis(rows)).toThrow(/same budget/);
  });

  it("rejects an internally inconsistent row (censored but carrying an itemsToCriterion value)", () => {
    const rows: QtmRow[] = [{ itemsToCriterion: 5, censored: true, budget: 60 }];
    expect(() => questionsToMasteryAnalysis(rows)).toThrow(/must not carry/);
  });

  it("rejects an internally inconsistent row (not censored but missing an itemsToCriterion value)", () => {
    const rows: QtmRow[] = [{ itemsToCriterion: null, censored: false, budget: 60 }];
    expect(() => questionsToMasteryAnalysis(rows)).toThrow(/must carry/);
  });

  it("rejects an itemsToCriterion value outside [1, budget]", () => {
    expect(() => questionsToMasteryAnalysis([{ itemsToCriterion: 0, censored: false, budget: 60 }])).toThrow(/out of \[1, budget/);
    expect(() => questionsToMasteryAnalysis([{ itemsToCriterion: 61, censored: false, budget: 60 }])).toThrow(/out of \[1, budget/);
  });

  it("cumulative attainment curve is monotonically non-decreasing and bounded by [0,1] (a general invariant, checked on a larger synthetic set)", () => {
    const rows: QtmRow[] = [1, 2, 2, 5, 8, 8, 8, 20, null, null].map((v) => ({
      itemsToCriterion: v,
      censored: v === null,
      budget: 60,
    })) as QtmRow[];
    const a = questionsToMasteryAnalysis(rows);
    let prev = 0;
    for (const p of a.cumulativeAttainmentCurve) {
      expect(p.cumulativeProbability).toBeGreaterThanOrEqual(prev - 1e-12);
      expect(p.cumulativeProbability).toBeLessThanOrEqual(1 + 1e-12);
      prev = p.cumulativeProbability;
    }
    // Final cumulative probability must equal the overall attainment probability.
    expect(a.cumulativeAttainmentCurve.at(-1)!.cumulativeProbability).toBeCloseTo(a.attainmentProbability, 10);
  });
});

describe("pairedTTest / studentTTwoSidedP (independent verification against known textbook critical values)", () => {
  it("t=2.776, df=4 -> p ~= 0.0500 (standard two-sided critical value table)", () => {
    expect(studentTTwoSidedP(2.776, 4)).toBeCloseTo(0.05, 3);
  });

  it("t=4.604, df=4 -> p ~= 0.0100", () => {
    expect(studentTTwoSidedP(4.604, 4)).toBeCloseTo(0.01, 3);
  });

  it("t=0, any df -> p = 1 (no evidence against the null)", () => {
    expect(studentTTwoSidedP(0, 4)).toBeCloseTo(1, 6);
  });

  it("zero-variance differences produce p=1 and a zero-width CI, never a divide-by-zero NaN", () => {
    const r = pairedTTest([0.1, 0.1, 0.1, 0.1]);
    expect(r.p).toBe(1);
    expect(r.ci95[0]).toBeCloseTo(0.1, 10);
    expect(r.ci95[1]).toBeCloseTo(0.1, 10);
  });

  it("mean/sd match an independently hand-computed reference", () => {
    expect(mean([1, 2, 3, 4, 5])).toBe(3);
    expect(sd([2, 4, 4, 4, 5, 5, 7, 9])).toBeCloseTo(2.138, 2); // textbook example, population variance adjusted for sample sd
  });

  it("rejects fewer than 2 paired differences", () => {
    expect(() => pairedTTest([0.1])).toThrow(/at least 2/);
  });
});

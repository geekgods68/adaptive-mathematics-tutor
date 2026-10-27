import { describe, expect, it } from "vitest";
import { bktPredict, bktStep, createBktEstimatorAdapter, type BktParams } from "@/research/phase8/estimators/bkt";
import { fitBktEm, forwardBackward, forwardLogLikelihood, mStep } from "@/research/phase8/estimators/bktEm";
import { loadEstimatorConfig } from "@/research/phase8/config/load";
import { createSeededRandom } from "@/research/experiment/rng";

const estimatorConfig = loadEstimatorConfig().value;

/** Brute-force likelihood by summing over the n+1 monotonic (no-forgetting) hidden paths, for B-1. */
function bruteForceLikelihood(sequence: boolean[], params: BktParams): number {
  const n = sequence.length;
  const { pL0, T } = params;
  let total = 0;
  for (let m = 0; m <= n; m++) {
    // m leading "unknown" steps, then "known" for the rest (no-forgetting, so this is
    // exhaustive). m===n (unknown throughout the observed window) has NO trailing
    // transition-to-known factor, since that transition (if it ever happens) occurs
    // strictly after the last observed opportunity.
    let pathProb: number;
    if (m === 0) {
      pathProb = pL0;
    } else if (m === n) {
      pathProb = (1 - pL0) * Math.pow(1 - T, n - 1);
    } else {
      pathProb = (1 - pL0) * Math.pow(1 - T, m - 1) * T;
    }
    let emissionProduct = 1;
    for (let k = 0; k < n; k++) {
      const known = k >= m;
      const correct = sequence[k];
      const lik = known ? (correct ? 1 - params.S : params.S) : (correct ? params.G : 1 - params.G);
      emissionProduct *= lik;
    }
    total += pathProb * emissionProduct;
  }
  return total;
}

const params: BktParams = { pL0: 0.3, T: 0.15, G: 0.2, S: 0.1 };

describe("B-1: forward likelihood equals brute-force enumeration over hidden paths", () => {
  it("matches to within 1e-12 for all-false/all-true/mixed sequences up to length 10", () => {
    const rng = createSeededRandom("bkt-b1");
    for (let n = 1; n <= 10; n++) {
      for (let trial = 0; trial < 5; trial++) {
        const sequence = Array.from({ length: n }, () => rng.next() < 0.5);
        const expected = bruteForceLikelihood(sequence, params);
        const actual = Math.exp(forwardBackward(sequence, params).loglik);
        expect(actual).toBeCloseTo(expected, 10);
      }
    }
  });
});

describe("B-2: EM log-likelihood is non-decreasing every iteration", () => {
  it("holds across many M-steps from several starting points on synthetic data", () => {
    const rng = createSeededRandom("bkt-b2");
    const trueParams: BktParams = { pL0: 0.2, T: 0.2, G: 0.25, S: 0.1 };
    const sequences: boolean[][] = [];
    for (let l = 0; l < 50; l++) {
      let known = rng.next() < trueParams.pL0;
      const seq: boolean[] = [];
      for (let t = 0; t < 20; t++) {
        const pCorrect = known ? 1 - trueParams.S : trueParams.G;
        seq.push(rng.next() < pCorrect);
        if (!known && rng.next() < trueParams.T) known = true;
      }
      sequences.push(seq);
    }

    const starts: BktParams[] = [
      { pL0: 0.5, T: 0.1, G: 0.25, S: 0.1 },
      { pL0: 0.1, T: 0.4, G: 0.1, S: 0.3 },
      { pL0: 0.9, T: 0.02, G: 0.4, S: 0.05 },
    ];

    for (const start of starts) {
      let current = start;
      let prevLoglik = forwardLogLikelihood(sequences, current);
      for (let iter = 0; iter < 30; iter++) {
        const next = mStep(sequences, current, estimatorConfig.bktEm.bounds);
        const nextLoglik = forwardLogLikelihood(sequences, next);
        expect(nextLoglik).toBeGreaterThanOrEqual(prevLoglik - 1e-9);
        current = next;
        prevLoglik = nextLoglik;
      }
    }
  });
});

describe("B-3-style (reduced scale): large-sample parameter recovery", () => {
  it("recovers parameters within a loose tolerance from 2,000 synthetic learners x 20 observations (smoke-scale, not the official B-3 20,000-learner run)", () => {
    const rng = createSeededRandom("bkt-b3-smoke");
    const trueParams: BktParams = { pL0: 0.3, T: 0.15, G: 0.2, S: 0.08 };
    const sequences: boolean[][] = [];
    for (let l = 0; l < 2000; l++) {
      let known = rng.next() < trueParams.pL0;
      const seq: boolean[] = [];
      for (let t = 0; t < 20; t++) {
        const pCorrect = known ? 1 - trueParams.S : trueParams.G;
        seq.push(rng.next() < pCorrect);
        if (!known && rng.next() < trueParams.T) known = true;
      }
      sequences.push(seq);
    }

    const fit = fitBktEm(sequences, estimatorConfig.bktEm, estimatorConfig.bktDefault);
    expect(fit.params.pL0).toBeCloseTo(trueParams.pL0, 1);
    expect(fit.params.G).toBeCloseTo(trueParams.G, 1);
    expect(fit.params.S).toBeCloseTo(trueParams.S, 1);
    expect(fit.params.T).toBeGreaterThan(0);
  }, 20000);
});

describe("bktStep / bktPredict", () => {
  it("matches the exact C6 posterior-then-transition formula", () => {
    const pL = 0.4;
    const p: BktParams = { pL0: 0.4, T: 0.1, G: 0.25, S: 0.1 };
    const correctResult = bktStep(pL, true, p);
    const expectedPosteriorCorrect = (pL * (1 - p.S)) / (pL * (1 - p.S) + (1 - pL) * p.G);
    expect(correctResult.posterior).toBeCloseTo(expectedPosteriorCorrect, 12);
    expect(correctResult.postTransition).toBeCloseTo(expectedPosteriorCorrect + (1 - expectedPosteriorCorrect) * p.T, 12);

    const incorrectResult = bktStep(pL, false, p);
    const expectedPosteriorIncorrect = (pL * p.S) / (pL * p.S + (1 - pL) * (1 - p.G));
    expect(incorrectResult.posterior).toBeCloseTo(expectedPosteriorIncorrect, 12);
  });

  it("bktPredict is the standard mixture P(correct) = pL(1-S) + (1-pL)G", () => {
    expect(bktPredict(0.6, { G: 0.2, S: 0.1 })).toBeCloseTo(0.6 * 0.9 + 0.4 * 0.2, 12);
  });
});

describe("createBktEstimatorAdapter", () => {
  it("initialises at pL0 and updates per-concept state via applyResponse", () => {
    const getParams = () => ({ pL0: 0.4, T: 0.1, G: 0.25, S: 0.1 });
    const adapter = createBktEstimatorAdapter("bkt-default", "bkt-default-v1", getParams);
    const initial = { "c-1": adapter.initConcept("L1", "c-1", "t0") };
    expect(adapter.readMastery(initial["c-1"])).toBeCloseTo(0.4, 12);

    const { updatedStates, traces } = adapter.applyResponse(
      initial,
      {
        questionId: "q1",
        conceptWeights: { "c-1": 1 },
        difficulty: 3 as never,
        correct: true,
        selectedOptionId: "opt-1",
        usedHint: false,
        sequenceIndex: 0,
        timestamp: "t1",
      },
      "L1",
    );
    expect(traces).toHaveLength(1);
    expect(updatedStates["c-1"].pL).toBeGreaterThan(0.4);
  });
});

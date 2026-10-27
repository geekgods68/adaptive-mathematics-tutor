/**
 * C6 (protocol/phase8-protocol-v2.md), B4.2: BKT-fit by bounded
 * multi-start expectation-maximisation (scaled forward-backward E-step,
 * closed-form M-step per parameter, clipped to its bound). Replaces
 * v1's exhaustive 106,875-point grid (see Deliverable A, change 3).
 */

import type { BktParams } from "@/research/phase8/estimators/bkt";
import { emissionProb } from "@/research/phase8/estimators/bkt";
import type { EstimatorConfig } from "@/research/phase8/config/load";

function clip(value: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, value));
}

/**
 * Scaled forward-backward over one observation sequence, returning the
 * per-opportunity posterior marginals (gamma, indices 0..n-1 for the
 * PRE-response state of opportunity k+1), the transition posteriors
 * (xi, indices 0..n-2, unknown-at-k -> known-at-k+1), and the sequence
 * log-likelihood at `params`.
 */
export function forwardBackward(sequence: readonly boolean[], params: BktParams) {
  const n = sequence.length;
  if (n === 0) {
    return { gammaKnown: [] as number[], xiUnknownToKnown: [] as number[], loglik: 0 };
  }
  const { T } = params;

  // Scaled forward pass. alphaHat[k] = [P(unknown), P(known)] normalised to sum 1 at step k (0-indexed, k=0..n-1).
  const alphaHat: Array<[number, number]> = [];
  const scale: number[] = [];

  const likKnown0 = emissionProb(true, sequence[0], params);
  const likUnknown0 = emissionProb(false, sequence[0], params);
  const a0Unknown = (1 - params.pL0) * likUnknown0;
  const a0Known = params.pL0 * likKnown0;
  const sum0 = a0Unknown + a0Known;
  const c0 = sum0 > 0 ? 1 / sum0 : 1;
  alphaHat.push([a0Unknown * c0, a0Known * c0]);
  scale.push(c0);

  for (let k = 1; k < n; k++) {
    const [prevUnknown, prevKnown] = alphaHat[k - 1];
    // Transition: known stays known (prob 1); unknown -> known with prob T, stays unknown with prob 1-T.
    const predUnknown = prevUnknown * (1 - T);
    const predKnown = prevKnown * 1 + prevUnknown * T;
    const likKnown = emissionProb(true, sequence[k], params);
    const likUnknown = emissionProb(false, sequence[k], params);
    const aUnknown = predUnknown * likUnknown;
    const aKnown = predKnown * likKnown;
    const sum = aUnknown + aKnown;
    const ck = sum > 0 ? 1 / sum : 1;
    alphaHat.push([aUnknown * ck, aKnown * ck]);
    scale.push(ck);
  }

  const loglik = scale.reduce((acc, ck) => acc - Math.log(ck > 0 ? ck : 1e-300), 0);

  // Scaled backward pass. betaHat[n-1] = [1, 1].
  const betaHat: Array<[number, number]> = new Array(n);
  betaHat[n - 1] = [1, 1];
  for (let k = n - 2; k >= 0; k--) {
    const [, nextKnownBeta] = betaHat[k + 1];
    const [nextUnknownBeta] = betaHat[k + 1];
    const likKnownNext = emissionProb(true, sequence[k + 1], params);
    const likUnknownNext = emissionProb(false, sequence[k + 1], params);
    // betaBar_k(unknown) = T * likKnown(o_{k+1}) * betaHat_{k+1}(known) + (1-T) * likUnknown(o_{k+1}) * betaHat_{k+1}(unknown)
    const barUnknown = T * likKnownNext * nextKnownBeta + (1 - T) * likUnknownNext * nextUnknownBeta;
    // betaBar_k(known) = 1 * likKnown(o_{k+1}) * betaHat_{k+1}(known) (known -> known with prob 1)
    const barKnown = likKnownNext * nextKnownBeta;
    const ckPlus1 = scale[k + 1];
    betaHat[k] = [barUnknown * ckPlus1, barKnown * ckPlus1];
  }

  const gammaKnown: number[] = new Array(n);
  for (let k = 0; k < n; k++) {
    const [aUnknown, aKnown] = alphaHat[k];
    const [bUnknown, bKnown] = betaHat[k];
    const unnormUnknown = aUnknown * bUnknown;
    const unnormKnown = aKnown * bKnown;
    const total = unnormUnknown + unnormKnown;
    gammaKnown[k] = total > 0 ? unnormKnown / total : aKnown;
  }

  const xiUnknownToKnown: number[] = new Array(Math.max(0, n - 1));
  for (let k = 0; k < n - 1; k++) {
    const [aUnknown] = alphaHat[k];
    const [, bKnownNext] = betaHat[k + 1];
    const likKnownNext = emissionProb(true, sequence[k + 1], params);
    // xiRaw(unknown_k -> known_{k+1}) = alphaHat_k(unknown) * T * likKnown(o_{k+1}) * betaHat_{k+1}(known)
    const xiRawUnknownToKnown = aUnknown * T * likKnownNext * bKnownNext;
    // Full normaliser: sum over all four (s, s') transitions at this step.
    const [, aKnown] = alphaHat[k];
    const [bUnknownNext] = betaHat[k + 1];
    const likUnknownNext = emissionProb(false, sequence[k + 1], params);
    const xiRawUnknownToUnknown = aUnknown * (1 - T) * likUnknownNext * bUnknownNext;
    const xiRawKnownToKnown = aKnown * 1 * likKnownNext * bKnownNext;
    const normalizer = xiRawUnknownToKnown + xiRawUnknownToUnknown + xiRawKnownToKnown;
    xiUnknownToKnown[k] = normalizer > 0 ? xiRawUnknownToKnown / normalizer : 0;
  }

  return { gammaKnown, xiUnknownToKnown, loglik };
}

export function forwardLogLikelihood(sequences: readonly (readonly boolean[])[], params: BktParams): number {
  let total = 0;
  for (const seq of sequences) {
    total += forwardBackward(seq, params).loglik;
  }
  return total;
}

export function mStep(sequences: readonly (readonly boolean[])[], params: BktParams, bounds: EstimatorConfig["bktEm"]["bounds"]): BktParams {
  let sumGamma1Known = 0;
  let sumGammaUnknownAll = 0;
  let sumGammaUnknownTimesCorrect = 0;
  let sumGammaKnownAll = 0;
  let sumGammaKnownTimesIncorrect = 0;
  let sumXiUnknownToKnown = 0;
  let sumGammaUnknownExceptLast = 0;

  for (const seq of sequences) {
    const { gammaKnown, xiUnknownToKnown } = forwardBackward(seq, params);
    if (gammaKnown.length === 0) continue;
    sumGamma1Known += gammaKnown[0];
    for (let k = 0; k < gammaKnown.length; k++) {
      const gKnown = gammaKnown[k];
      const gUnknown = 1 - gKnown;
      const correct = seq[k] ? 1 : 0;
      sumGammaUnknownAll += gUnknown;
      sumGammaUnknownTimesCorrect += gUnknown * correct;
      sumGammaKnownAll += gKnown;
      sumGammaKnownTimesIncorrect += gKnown * (1 - correct);
      if (k < gammaKnown.length - 1) {
        sumGammaUnknownExceptLast += gUnknown;
      }
    }
    for (const xi of xiUnknownToKnown) {
      sumXiUnknownToKnown += xi;
    }
  }

  const numSequences = sequences.length || 1;
  const pL0 = clip(sumGamma1Known / numSequences, bounds.pL0[0], bounds.pL0[1]);
  const T = clip(sumGammaUnknownExceptLast > 0 ? sumXiUnknownToKnown / sumGammaUnknownExceptLast : params.T, bounds.T[0], bounds.T[1]);
  const G = clip(sumGammaUnknownAll > 0 ? sumGammaUnknownTimesCorrect / sumGammaUnknownAll : params.G, bounds.G[0], bounds.G[1]);
  const S = clip(sumGammaKnownAll > 0 ? sumGammaKnownTimesIncorrect / sumGammaKnownAll : params.S, bounds.S[0], bounds.S[1]);
  return { pL0, T, G, S };
}

export interface BktEmFitResult {
  params: BktParams;
  loglik: number;
  iterationsUsed: number;
  capHit: boolean;
  nearBoundParams: Array<keyof BktParams>;
  multimodalFlag: boolean;
  startsTried: number;
}

function paramDistance(a: BktParams, b: BktParams): number {
  return Math.max(Math.abs(a.pL0 - b.pL0), Math.abs(a.T - b.T), Math.abs(a.G - b.G), Math.abs(a.S - b.S));
}

function runEmFromStart(
  sequences: readonly (readonly boolean[])[],
  start: BktParams,
  emCfg: EstimatorConfig["bktEm"],
): { params: BktParams; loglik: number; iterations: number; capHit: boolean } {
  let params = start;
  let prevLoglik = forwardLogLikelihood(sequences, params);
  let relTolStreak = 0;
  let iterations = 0;
  let capHit = true;

  for (let iter = 1; iter <= emCfg.maxIter; iter++) {
    iterations = iter;
    const nextParams = mStep(sequences, params, emCfg.bounds);
    const nextLoglik = forwardLogLikelihood(sequences, nextParams);
    const maxParamChange = paramDistance(params, nextParams);
    const relChange = Math.abs(prevLoglik) > 0 ? Math.abs(nextLoglik - prevLoglik) / Math.abs(prevLoglik) : Math.abs(nextLoglik - prevLoglik);

    params = nextParams;
    prevLoglik = nextLoglik;

    if (relChange < emCfg.relTol) {
      relTolStreak += 1;
    } else {
      relTolStreak = 0;
    }

    if (relTolStreak >= emCfg.tolStreak || maxParamChange < emCfg.paramTol) {
      capHit = false;
      break;
    }
    if (iter === emCfg.maxIter) {
      capHit = true;
    }
  }

  return { params, loglik: prevLoglik, iterations, capHit };
}

/**
 * Coarse grid (225 points) -> top 5 distinct points by log-likelihood,
 * plus the BKT-default point (6 starts, deterministic) -> bounded
 * multi-start EM from each -> select the highest final log-likelihood,
 * ties broken by the lexicographically smallest (pL0, T, G, S).
 */
export function fitBktEm(
  sequences: readonly (readonly boolean[])[],
  emCfg: EstimatorConfig["bktEm"],
  defaultParams: BktParams,
): BktEmFitResult {
  const grid: BktParams[] = [];
  for (const pL0 of emCfg.coarse.pL0) {
    for (const T of emCfg.coarse.T) {
      for (const G of emCfg.coarse.G) {
        for (const S of emCfg.coarse.S) {
          grid.push({ pL0, T, G, S });
        }
      }
    }
  }

  const gridScored = grid
    .map((params) => ({ params, loglik: forwardLogLikelihood(sequences, params) }))
    .sort((a, b) => b.loglik - a.loglik);

  const topStarts = gridScored.slice(0, emCfg.topStarts).map((g) => g.params);
  const starts = emCfg.includeDefaultStart ? [...topStarts, defaultParams] : topStarts;

  const results = starts.map((start) => runEmFromStart(sequences, start, emCfg));

  results.sort((a, b) => {
    if (b.loglik !== a.loglik) return b.loglik - a.loglik;
    // Tie-break: lexicographically smallest (pL0, T, G, S).
    const keys: Array<keyof BktParams> = ["pL0", "T", "G", "S"];
    for (const key of keys) {
      if (a.params[key] !== b.params[key]) return a.params[key] - b.params[key];
    }
    return 0;
  });

  const best = results[0];
  const secondBest = results[1];
  const multimodalFlag =
    secondBest !== undefined &&
    Math.abs(best.loglik - secondBest.loglik) < emCfg.multimodal.llGap &&
    paramDistance(best.params, secondBest.params) > emCfg.multimodal.paramGap;

  const nearBoundParams: Array<keyof BktParams> = [];
  const boundChecks: Array<[keyof BktParams, [number, number]]> = [
    ["pL0", emCfg.bounds.pL0],
    ["T", emCfg.bounds.T],
    ["G", emCfg.bounds.G],
    ["S", emCfg.bounds.S],
  ];
  for (const [key, [lo, hi]] of boundChecks) {
    const value = best.params[key];
    if (Math.abs(value - lo) < emCfg.boundFlagEps || Math.abs(value - hi) < emCfg.boundFlagEps) {
      nearBoundParams.push(key);
    }
  }

  return {
    params: best.params,
    loglik: best.loglik,
    iterationsUsed: best.iterations,
    capHit: best.capHit,
    nearBoundParams,
    multimodalFlag,
    startsTried: starts.length,
  };
}

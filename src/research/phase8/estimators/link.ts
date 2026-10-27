/**
 * C6/B4.5: the calibration link applied after every Tier 1 estimator's
 * raw score, fitted by Newton-Raphson maximum-likelihood logistic
 * regression with an L2 penalty, per estimator per (family
 * configuration, world, slice), on calibration learners' pre-update
 * scores. Link-D includes level dummies (L3 reference) and, since the
 * C1 pre-flight (P-2) found option counts other than 4 in both question
 * banks, option-count dummies (n=4 reference) as the protocol's own
 * fallback requires. Link-1 is [1, z] only.
 */

import type { EstimatorConfig } from "@/research/phase8/config/load";

export interface LinkTrainingRow {
  rawScore: number;
  level: number;
  optionCount: number;
  correct: boolean;
}

export interface FittedLink {
  featureNames: readonly string[];
  coefficients: readonly number[];
  iterations: number;
  converged: boolean;
  /** p-hat = sigma(a + b*z + level/option dummies) for an arbitrary (rawScore, level, optionCount). */
  predict(rawScore: number, level: number, optionCount: number): number;
  /** The latent estimate: the link evaluated at the reference item (level 3, 4 options, so only [1, z] contribute). p-hat* = sigma(a + b*z). */
  predictReference(rawScore: number): number;
}

const REFERENCE_LEVEL = 3;
const REFERENCE_OPTION_COUNT = 4;
const LEVELS_WITH_DUMMIES = [1, 2, 4, 5];

function logit(p: number, clipEps: number): number {
  const clipped = Math.min(1 - clipEps, Math.max(clipEps, p));
  return Math.log(clipped / (1 - clipped));
}

function sigma(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

function buildFeatureNames(optionCountsPresent: readonly number[], levelDummies: boolean): string[] {
  const names = ["intercept", "z"];
  if (levelDummies) {
    for (const level of LEVELS_WITH_DUMMIES) names.push(`level_${level}`);
    const nonReferenceCounts = [...new Set(optionCountsPresent)].filter((n) => n !== REFERENCE_OPTION_COUNT).sort((a, b) => a - b);
    for (const n of nonReferenceCounts) names.push(`options_${n}`);
  }
  return names;
}

function buildFeatureRow(z: number, level: number, optionCount: number, featureNames: readonly string[]): number[] {
  return featureNames.map((name) => {
    if (name === "intercept") return 1;
    if (name === "z") return z;
    if (name.startsWith("level_")) return Number(name.slice("level_".length)) === level ? 1 : 0;
    if (name.startsWith("options_")) return Number(name.slice("options_".length)) === optionCount ? 1 : 0;
    return 0;
  });
}

/** Solves A·x = b for a small dense symmetric matrix A via Gauss-Jordan elimination with partial pivoting. */
function solveLinearSystem(A: number[][], b: number[]): number[] {
  const n = A.length;
  const M = A.map((row, i) => [...row, b[i]]);
  for (let col = 0; col < n; col++) {
    let pivotRow = col;
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(M[r][col]) > Math.abs(M[pivotRow][col])) pivotRow = r;
    }
    [M[col], M[pivotRow]] = [M[pivotRow], M[col]];
    const pivot = M[col][col];
    if (Math.abs(pivot) < 1e-300) continue; // singular direction; leave as-is (ridge penalty should prevent this in practice)
    for (let c = col; c <= n; c++) M[col][c] /= pivot;
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const factor = M[r][col];
      for (let c = col; c <= n; c++) M[r][c] -= factor * M[col][c];
    }
  }
  return M.map((row) => row[n]);
}

function fitWithFeatures(
  rows: readonly LinkTrainingRow[],
  featureNames: readonly string[],
  cfg: EstimatorConfig["link"],
): { coefficients: number[]; iterations: number; converged: boolean } {
  const p = featureNames.length;
  const X = rows.map((row) => buildFeatureRow(logit(row.rawScore, cfg.clip), row.level, row.optionCount, featureNames));
  const y = rows.map((row) => (row.correct ? 1 : 0));

  let beta = new Array(p).fill(0);
  let converged = false;
  let iterations = 0;

  for (let iter = 1; iter <= cfg.maxIter; iter++) {
    iterations = iter;
    const eta = X.map((xi) => xi.reduce((sum, xij, j) => sum + xij * beta[j], 0));
    const mu = eta.map(sigma);

    // gradient_j = sum_i x_ij (y_i - mu_i) - l2 * beta_j
    const gradient = new Array(p).fill(0);
    for (let j = 0; j < p; j++) {
      let g = 0;
      for (let i = 0; i < rows.length; i++) g += X[i][j] * (y[i] - mu[i]);
      gradient[j] = g - cfg.l2 * beta[j];
    }

    // Hessian (negative definite) of the penalized log-likelihood: -(X^T W X + l2 I).
    // We solve (X^T W X + l2 I) * delta = gradient for the Newton step delta, then beta += delta.
    const XtWX: number[][] = Array.from({ length: p }, () => new Array(p).fill(0));
    for (let i = 0; i < rows.length; i++) {
      const w = mu[i] * (1 - mu[i]);
      for (let j = 0; j < p; j++) {
        for (let k = 0; k < p; k++) {
          XtWX[j][k] += X[i][j] * w * X[i][k];
        }
      }
    }
    for (let j = 0; j < p; j++) XtWX[j][j] += cfg.l2;

    const delta = solveLinearSystem(XtWX, gradient);
    const nextBeta = beta.map((b, j) => b + delta[j]);
    const maxChange = Math.max(...nextBeta.map((b, j) => Math.abs(b - beta[j])));
    beta = nextBeta;
    if (maxChange < cfg.newtonTol) {
      converged = true;
      break;
    }
  }

  return { coefficients: beta, iterations, converged };
}

export function fitLink(rows: readonly LinkTrainingRow[], cfg: EstimatorConfig["link"], variant: "link-d" | "link-1"): FittedLink {
  const optionCountsPresent = rows.map((r) => r.optionCount);
  const featureNames = variant === "link-1" ? ["intercept", "z"] : buildFeatureNames(optionCountsPresent, true);
  const { coefficients, iterations, converged } = fitWithFeatures(rows, featureNames, cfg);

  function predict(rawScore: number, level: number, optionCount: number): number {
    const z = logit(rawScore, cfg.clip);
    const features = buildFeatureRow(z, level, optionCount, featureNames);
    const eta = features.reduce((sum, f, j) => sum + f * coefficients[j], 0);
    return sigma(eta);
  }

  function predictReference(rawScore: number): number {
    return predict(rawScore, REFERENCE_LEVEL, REFERENCE_OPTION_COUNT);
  }

  return { featureNames, coefficients, iterations, converged, predict, predictReference };
}

/**
 * Three-metric reconciliation (coordinator directive, 2026-11-05):
 * Brier Score, Questions-to-Mastery (QTM), and Latent-Mastery RMSE —
 * the three metrics the paper was always intended to report, distinct
 * from protocol/phase8-protocol-v2.md's registered primary metrics
 * (log loss, items-to-criterion as secondary, and MAE). See
 * docs/COMPLETE_RESEARCH_PAPER_EVIDENCE_DOSSIER.md Section 4 for the
 * full provenance/reconciliation record.
 *
 * Pure, independently-testable functions only. Every function:
 *  - operates ONLY on caller-supplied, already-generated rows (never
 *    invents, adjusts, or smooths a prediction or a truth value);
 *  - validates its inputs and throws rather than silently coercing bad
 *    data (e.g. a predicted probability outside [0,1]);
 *  - treats the WORLD, not the response or the learner, as the unit of
 *    statistical independence when aggregating for inference, matching
 *    protocol/phase8-protocol-v2.md B8.1's own justification (learners
 *    sharing a world share item noise / concept parameters / true graph).
 *
 * Nothing here recalibrates a prediction to improve its own score.
 */

// ---------------------------------------------------------------------------
// 1. Brier Score
// ---------------------------------------------------------------------------

export interface BrierRow {
  /** Predicted P(correct), RECORDED BEFORE the response was observed. Never derived from a posterior that has already seen this outcome. */
  pPredicted: number;
  observedCorrect: boolean;
}

export interface BrierResult {
  n: number;
  meanBrier: number;
}

/** Brier = (1/N) * Sum[(p_i - y_i)^2]. Throws on empty input or any pPredicted outside [0,1] rather than silently clamping. */
export function brierScore(rows: readonly BrierRow[]): BrierResult {
  if (rows.length === 0) throw new Error("brierScore: rows must be non-empty");
  for (const r of rows) {
    if (!Number.isFinite(r.pPredicted) || r.pPredicted < 0 || r.pPredicted > 1) {
      throw new Error(`brierScore: pPredicted out of [0,1]: ${r.pPredicted}`);
    }
  }
  const sum = rows.reduce((s, r) => s + (r.pPredicted - (r.observedCorrect ? 1 : 0)) ** 2, 0);
  return { n: rows.length, meanBrier: sum / rows.length };
}

export interface CalibrationBin {
  binLow: number;
  binHigh: number;
  n: number;
  meanPredicted: number;
  meanObserved: number;
}

/** Equal-width reliability-diagram bins over [0,1]. Returns only bins with n>0 (never fabricates a point for an empty bin). */
export function calibrationBins(rows: readonly BrierRow[], nBins = 10): CalibrationBin[] {
  if (rows.length === 0) throw new Error("calibrationBins: rows must be non-empty");
  const bins: { sumP: number; sumY: number; n: number }[] = Array.from({ length: nBins }, () => ({ sumP: 0, sumY: 0, n: 0 }));
  for (const r of rows) {
    const idx = Math.min(nBins - 1, Math.floor(r.pPredicted * nBins));
    bins[idx].sumP += r.pPredicted;
    bins[idx].sumY += r.observedCorrect ? 1 : 0;
    bins[idx].n += 1;
  }
  const out: CalibrationBin[] = [];
  bins.forEach((b, i) => {
    if (b.n === 0) return;
    out.push({ binLow: i / nBins, binHigh: (i + 1) / nBins, n: b.n, meanPredicted: b.sumP / b.n, meanObserved: b.sumY / b.n });
  });
  return out;
}

// ---------------------------------------------------------------------------
// 2. Latent-Mastery RMSE (and, as a secondary robustness check only, MAE)
// ---------------------------------------------------------------------------

export interface LatentRow {
  /** Estimated mastery, M-hat, from the estimator under test. */
  estimated: number;
  /** Simulator ground truth, M-true, at the SAME learner/concept/step. */
  truth: number;
}

export interface LatentErrorResult {
  n: number;
  rmse: number;
  /** Computed from the SAME aligned residuals as rmse, never a separately-sourced value. Secondary only (task directive: never substitute MAE for RMSE). */
  mae: number;
}

/** RMSE = sqrt((1/N) * Sum[(Mhat_i - Mtrue_i)^2]). Caller is responsible for alignment (same learner/concept/step/condition/family/slice) before calling this. */
export function latentRmseAndMae(rows: readonly LatentRow[]): LatentErrorResult {
  if (rows.length === 0) throw new Error("latentRmseAndMae: rows must be non-empty");
  let sumSq = 0;
  let sumAbs = 0;
  for (const r of rows) {
    if (!Number.isFinite(r.estimated) || !Number.isFinite(r.truth)) {
      throw new Error(`latentRmseAndMae: non-finite value (estimated=${r.estimated}, truth=${r.truth})`);
    }
    const d = r.estimated - r.truth;
    sumSq += d * d;
    sumAbs += Math.abs(d);
  }
  return { n: rows.length, rmse: Math.sqrt(sumSq / rows.length), mae: sumAbs / rows.length };
}

// ---------------------------------------------------------------------------
// 3. Questions-to-Mastery (censored, ground-truth-based)
// ---------------------------------------------------------------------------

export interface QtmRow {
  /** Null iff censored (the fixed question budget was exhausted without every target concept reaching the simulator's OWN ground-truth mastered threshold). Never set to the budget value for a censored case. */
  itemsToCriterion: number | null;
  censored: boolean;
  /** The fixed question budget this learner/condition ran under. All rows passed to one call must share the same budget (a matched-condition requirement -- see questionsToMasteryAnalysis). */
  budget: number;
}

export interface QtmCurvePoint {
  step: number;
  /** Kaplan-Meier-style cumulative attainment probability, i.e. 1 - S(step). */
  cumulativeProbability: number;
}

export interface QtmAnalysis {
  n: number;
  nAttained: number;
  attainmentProbability: number;
  /** First step at which cumulative attainment probability reaches >=0.5, or null if fewer than half of learners ever attained mastery within the budget (median is not estimable -- never approximated as the budget value). */
  medianQtm: number | null;
  /**
   * Restricted mean QTM, i.e. mean of min(itemsToCriterion, budget) -- censored
   * rows contribute exactly `budget`. Because ALL censoring in this design
   * occurs at a single fixed horizon (the budget itself, type-I censoring,
   * never earlier), this exactly equals the standard RMST (area under the
   * Kaplan-Meier survival curve from 0 to budget): with no censoring before
   * the horizon, at-risk counts are never reduced by anything except
   * attainment events, so integrating the KM step function reduces
   * algebraically to the sample mean of min(T_i, budget). Cross-checked by
   * a dedicated test (see tests/research/phase8/threeMetrics.test.ts).
   */
  restrictedMeanQtm: number;
  cumulativeAttainmentCurve: QtmCurvePoint[];
}

/**
 * Censored, ground-truth time-to-event analysis of Questions-to-Mastery.
 * "Attainment" must already be defined by the CALLER from the simulator's
 * own ground-truth mastery process (see
 * src/research/phase8/trackB/runTrackB.ts's itemsToCriterion: "first step
 * at which every T_c concept is TRULY mastered", never an estimator's own
 * self-declared threshold) -- this function performs no mastery
 * determination of its own, only the survival-analysis aggregation over
 * already-determined event/censoring rows.
 */
export function questionsToMasteryAnalysis(rows: readonly QtmRow[]): QtmAnalysis {
  if (rows.length === 0) throw new Error("questionsToMasteryAnalysis: rows must be non-empty");
  const budget = rows[0].budget;
  if (!rows.every((r) => r.budget === budget)) {
    throw new Error("questionsToMasteryAnalysis: all rows must share the same budget (matched-condition requirement)");
  }
  for (const r of rows) {
    if (r.censored && r.itemsToCriterion !== null) {
      throw new Error("questionsToMasteryAnalysis: a censored row must not carry an itemsToCriterion value");
    }
    if (!r.censored && r.itemsToCriterion === null) {
      throw new Error("questionsToMasteryAnalysis: a non-censored row must carry an itemsToCriterion value");
    }
    if (!r.censored && (r.itemsToCriterion! < 1 || r.itemsToCriterion! > budget)) {
      throw new Error(`questionsToMasteryAnalysis: itemsToCriterion ${r.itemsToCriterion} out of [1, budget=${budget}]`);
    }
  }

  const n = rows.length;
  const attained = rows.filter((r): r is QtmRow & { itemsToCriterion: number } => !r.censored && r.itemsToCriterion !== null);
  const nAttained = attained.length;
  const attainmentProbability = nAttained / n;

  const eventTimes = Array.from(new Set(attained.map((r) => r.itemsToCriterion))).sort((a, b) => a - b);
  let atRisk = n;
  let survival = 1;
  const curve: QtmCurvePoint[] = [];
  for (const t of eventTimes) {
    const events = attained.filter((r) => r.itemsToCriterion === t).length;
    survival *= 1 - events / atRisk;
    curve.push({ step: t, cumulativeProbability: 1 - survival });
    atRisk -= events;
  }

  const medianQtm = attainmentProbability >= 0.5 ? (curve.find((p) => p.cumulativeProbability >= 0.5)?.step ?? null) : null;

  const restrictedMeanQtm = rows.reduce((s, r) => s + (r.censored ? budget : r.itemsToCriterion!), 0) / n;

  return { n, nAttained, attainmentProbability, medianQtm, restrictedMeanQtm, cumulativeAttainmentCurve: curve };
}

// ---------------------------------------------------------------------------
// Shared: world-level paired-difference inference (same arithmetic as
// analysis/stats.ts's pairedTTest -- duplicated intentionally so this
// module has no dependency on a top-level script, and independently
// re-verified here against the same known t-distribution critical values).
// ---------------------------------------------------------------------------

export function mean(values: readonly number[]): number {
  if (values.length === 0) throw new Error("mean: values must be non-empty");
  return values.reduce((s, v) => s + v, 0) / values.length;
}

export function sd(values: readonly number[]): number {
  if (values.length < 2) throw new Error("sd: at least 2 values required");
  const m = mean(values);
  return Math.sqrt(values.reduce((s, v) => s + (v - m) ** 2, 0) / (values.length - 1));
}

function lgamma(z: number): number {
  const g = 7;
  const c = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059, 12.507343278686905,
    -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
  ];
  if (z < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * z)) - lgamma(1 - z);
  z -= 1;
  let x = c[0];
  for (let i = 1; i < g + 2; i++) x += c[i] / (z + i);
  const t = z + g + 0.5;
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
}

function betacf(x: number, a: number, b: number): number {
  const MAXIT = 200;
  const EPS = 3e-9;
  const FPMIN = 1e-30;
  const qab = a + b, qap = a + 1, qam = a - 1;
  let c = 1, d = 1 - (qab * x) / qap;
  if (Math.abs(d) < FPMIN) d = FPMIN;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= MAXIT; m++) {
    const m2 = 2 * m;
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    h *= d * c;
    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < EPS) break;
  }
  return h;
}

function betai(x: number, a: number, b: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const lbeta = lgamma(a + b) - lgamma(a) - lgamma(b) + a * Math.log(x) + b * Math.log(1 - x);
  const bt = Math.exp(lbeta);
  if (x < (a + 1) / (a + b + 2)) return (bt * betacf(x, a, b)) / a;
  return 1 - (bt * betacf(1 - x, b, a)) / b;
}

/** Two-sided Student-t p-value. Validated against known critical values: t=2.776,df=4 -> p~=0.0500; t=4.604,df=4 -> p~=0.0100. */
export function studentTTwoSidedP(t: number, df: number): number {
  const x = df / (df + t * t);
  return betai(x, df / 2, 0.5);
}

export interface PairedTTestResult {
  mean: number;
  sd: number;
  n: number;
  t: number;
  df: number;
  p: number;
  ci95: [number, number];
}

const T_CRIT_975: Record<number, number> = { 2: 4.303, 3: 3.182, 4: 2.776, 19: 2.093, 29: 2.045 };

/** One-sample (paired-difference) t-test with a 95% CI, world-level by convention (caller passes one value per world). */
export function pairedTTest(diffs: readonly number[]): PairedTTestResult {
  if (diffs.length < 2) throw new Error("pairedTTest: at least 2 paired differences required");
  const n = diffs.length;
  const m = mean(diffs);
  const s = sd(diffs);
  const se = s / Math.sqrt(n);
  const df = n - 1;
  const t = se > 0 ? m / se : 0;
  const p = se > 0 ? studentTTwoSidedP(t, df) : 1;
  const crit = T_CRIT_975[df] ?? 2.776;
  return { mean: m, sd: s, n, t, df, p, ci95: [m - crit * se, m + crit * se] };
}

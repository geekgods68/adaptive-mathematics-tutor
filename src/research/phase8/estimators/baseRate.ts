/**
 * C6/B4.1: B0 -- a STATIC per-(concept, level) calibration correct
 * rate, add-one smoothed, built once from calibration learners' raw
 * responses. Unlike the other six Tier 1 estimators, B0 has no update
 * rule (B4.1: "None") -- it is a fixed lookup table used as a reference
 * for reporting skill (B4.4 notes it is scored directly as a
 * probability, without a calibration link).
 */

export interface BaseRateObservation {
  conceptId: string;
  level: number;
  correct: boolean;
}

interface Counts {
  c: number;
  n: number;
}

export interface BaseRateTable {
  /** Add-one-smoothed P(correct) for (conceptId, level); falls back to the overall concept rate, then 0.5, if that exact (concept, level) cell has no calibration data. */
  predict(conceptId: string, level: number): number;
  readonly cellCounts: ReadonlyMap<string, Counts>;
}

function cellKey(conceptId: string, level: number): string {
  return `${conceptId}::${level}`;
}

export function buildBaseRateTable(observations: readonly BaseRateObservation[], addOne: boolean): BaseRateTable {
  const cellCounts = new Map<string, Counts>();
  const conceptCounts = new Map<string, Counts>();

  for (const obs of observations) {
    const key = cellKey(obs.conceptId, obs.level);
    const cell = cellCounts.get(key) ?? { c: 0, n: 0 };
    cell.n += 1;
    if (obs.correct) cell.c += 1;
    cellCounts.set(key, cell);

    const concept = conceptCounts.get(obs.conceptId) ?? { c: 0, n: 0 };
    concept.n += 1;
    if (obs.correct) concept.c += 1;
    conceptCounts.set(obs.conceptId, concept);
  }

  function rate(counts: Counts | undefined): number | undefined {
    if (!counts || counts.n === 0) return undefined;
    return addOne ? (counts.c + 1) / (counts.n + 2) : counts.c / counts.n;
  }

  return {
    cellCounts,
    predict(conceptId, level) {
      const cellRate = rate(cellCounts.get(cellKey(conceptId, level)));
      if (cellRate !== undefined) return cellRate;
      const conceptRate = rate(conceptCounts.get(conceptId));
      if (conceptRate !== undefined) return conceptRate;
      return 0.5;
    },
  };
}

/**
 * Deterministic random-number generation and seed management for Phase 8
 * infrastructure. This module makes NO decision about what any future
 * simulated learner does with the numbers it produces — it is a pure,
 * generic utility, mirroring the same deterministic approach already
 * used for option-display shuffling
 * (src/tutoring/session/optionOrder.ts's `seededShuffle`) rather than
 * silently diverging on a different algorithm. Deliberately NOT
 * importing from that module: it is non-adaptive-session-specific and
 * this is a general-purpose research utility — duplicating a ~15-line
 * algorithm here is cheaper and less coupling than reaching into an
 * unrelated module for it.
 */

export interface SeededRandom {
  readonly seed: string;
  /** Next value in [0, 1). */
  next(): number;
  /** Next integer in [0, maxExclusive). */
  nextInt(maxExclusive: number): number;
  /** Deterministic Fisher-Yates shuffle of `items`, consuming this generator's state (so sequential calls on the same instance produce a deterministic SEQUENCE of shuffles, not independently-reproducible ones — construct a fresh `createSeededRandom(seed)` per shuffle if independent reproducibility from the same seed is required). */
  shuffle<T>(items: readonly T[]): T[];
}

/** FNV-1a string hash — the seed-to-integer step, matching the convention already established in src/tutoring/session/optionOrder.ts. */
function hashSeed(seed: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** mulberry32 — a small, fast, dependency-free deterministic PRNG. Same seed always produces the same sequence. */
export function createSeededRandom(seed: string): SeededRandom {
  let state = hashSeed(seed);

  function next(): number {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  function nextInt(maxExclusive: number): number {
    if (!Number.isInteger(maxExclusive) || maxExclusive <= 0) {
      throw new Error(`createSeededRandom.nextInt: maxExclusive must be a positive integer, got ${maxExclusive}.`);
    }
    return Math.floor(next() * maxExclusive);
  }

  function shuffle<T>(items: readonly T[]): T[] {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i--) {
      const j = nextInt(i + 1);
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  return { seed, next, nextInt, shuffle };
}

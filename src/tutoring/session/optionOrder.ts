/**
 * Deterministic, seeded option-display order.
 *
 * Discovered during Phase 3 end-to-end testing: every question in the
 * production bank (src/domain/questions/bank/) was authored with its
 * correct option listed first (`{questionId}-o1`) — a byproduct of how
 * the bank was written, not a deliberate choice. Left unshuffled, that
 * makes "always pick the first option" a 100%-accuracy strategy across
 * the entire 161-question bank, which would silently invalidate the
 * tutor as a measurement instrument. This is exactly the situation
 * anticipated in docs/non-adaptive-sequence.md's option-shuffling
 * discussion: a deterministic, seeded shuffle, used because it is now
 * genuinely needed, not introduced speculatively.
 *
 * The shuffle is seeded ONLY by `questionId` (never by participant,
 * session, or any performance signal) — so the exact same question
 * always renders in the exact same option order for every participant,
 * every time (including across a page refresh, since the question object
 * is re-shuffled identically on every call). This preserves the
 * reproducibility default from docs/non-adaptive-sequence.md while
 * removing the positional exploit. Correctness is unaffected either way
 * — grading is always by option id (src/tutoring/grading/grade.ts), never
 * by position.
 */

/** A small, dependency-free deterministic PRNG (mulberry32) seeded from a string hash (FNV-1a). */
function createSeededRandom(seed: string): () => number {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  let state = h >>> 0;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher-Yates shuffle using a PRNG seeded deterministically from `seed`. Same seed -> same order, always. */
export function seededShuffle<T>(items: T[], seed: string): T[] {
  const random = createSeededRandom(seed);
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

import { describe, expect, it } from "vitest";
import { createSeededRandom } from "@/research/experiment/rng";

describe("createSeededRandom — determinism", () => {
  it("the same seed produces the exact same sequence of next() values", () => {
    const a = createSeededRandom("seed-1");
    const b = createSeededRandom("seed-1");
    const seqA = Array.from({ length: 10 }, () => a.next());
    const seqB = Array.from({ length: 10 }, () => b.next());
    expect(seqA).toEqual(seqB);
  });

  it("different seeds produce different sequences", () => {
    const a = createSeededRandom("seed-1");
    const b = createSeededRandom("seed-2");
    expect(a.next()).not.toBe(b.next());
  });

  it("next() always returns a value in [0, 1)", () => {
    const rng = createSeededRandom("bounds-check");
    for (let i = 0; i < 1000; i++) {
      const v = rng.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it("nextInt(n) always returns an integer in [0, n)", () => {
    const rng = createSeededRandom("int-bounds");
    for (let i = 0; i < 1000; i++) {
      const v = rng.nextInt(7);
      expect(Number.isInteger(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(7);
    }
  });

  it("nextInt rejects a non-positive or non-integer bound", () => {
    const rng = createSeededRandom("s");
    expect(() => rng.nextInt(0)).toThrow();
    expect(() => rng.nextInt(-1)).toThrow();
    expect(() => rng.nextInt(1.5)).toThrow();
  });

  it("shuffle is a permutation of the input (same elements, same length)", () => {
    const rng = createSeededRandom("shuffle-seed");
    const items = [1, 2, 3, 4, 5];
    const shuffled = rng.shuffle(items);
    expect(shuffled).toHaveLength(items.length);
    expect([...shuffled].sort()).toEqual([...items].sort());
  });

  it("shuffle does not mutate the input array", () => {
    const rng = createSeededRandom("no-mutate");
    const items = [1, 2, 3];
    const snapshot = [...items];
    rng.shuffle(items);
    expect(items).toEqual(snapshot);
  });

  it("two independently-constructed generators from the same seed produce the same shuffle", () => {
    const items = ["a", "b", "c", "d", "e"];
    const shuffledA = createSeededRandom("shuffle-match").shuffle(items);
    const shuffledB = createSeededRandom("shuffle-match").shuffle(items);
    expect(shuffledA).toEqual(shuffledB);
  });

  it("exposes its own seed for provenance/debugging", () => {
    expect(createSeededRandom("my-seed").seed).toBe("my-seed");
  });

  it("sequential calls on ONE instance advance its internal state (not idempotent per-call)", () => {
    const rng = createSeededRandom("stateful");
    const first = rng.next();
    const second = rng.next();
    expect(first).not.toBe(second);
  });
});

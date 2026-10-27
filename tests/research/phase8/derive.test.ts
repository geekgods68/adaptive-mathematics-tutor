import { describe, expect, it } from "vitest";
import { derive, deriveKeyString, keyedRandom, normalAt, uniformAt, type DeriveKey } from "@/research/phase8/rng/derive";

const MASTER_SEED = "RISE-PHASE8-v2";

function baseKey(overrides: Partial<DeriveKey> = {}): DeriveKey {
  return {
    track: "B",
    familyGroup: "S2",
    world: 3,
    slice: 1,
    split: "test",
    learner: "L007",
    stream: "response",
    concept: "c-quadratic-roots",
    index: 0,
    ...overrides,
  };
}

describe("deriveKeyString", () => {
  it("joins fields in the exact C4/B10.3 order with '|'", () => {
    const key = baseKey();
    expect(deriveKeyString(MASTER_SEED, key)).toBe(
      "RISE-PHASE8-v2|B|S2|3|1|test|L007|response|c-quadratic-roots|0",
    );
  });

  it("renders unused fields as the literal '-'", () => {
    const key: DeriveKey = {
      track: "-",
      familyGroup: "S1",
      world: 1,
      slice: "-",
      split: "-",
      learner: "-",
      stream: "itemNoise",
      concept: "-",
      index: 5,
    };
    expect(deriveKeyString(MASTER_SEED, key)).toBe("RISE-PHASE8-v2|-|S1|1|-|-|-|itemNoise|-|5");
  });
});

describe("derive", () => {
  it("is a pure function of (masterSeed, key) -- identical keys give identical output regardless of call order", () => {
    const keyA = baseKey({ index: 1 });
    const keyB = baseKey({ index: 2 });
    const first = derive(MASTER_SEED, keyA);
    const second = derive(MASTER_SEED, keyB);
    // Call again in reversed order -- results must be unchanged (no hidden shared state).
    const secondAgain = derive(MASTER_SEED, keyB);
    const firstAgain = derive(MASTER_SEED, keyA);
    expect(secondAgain).toBe(second);
    expect(firstAgain).toBe(first);
  });

  it("produces different values for keys differing only in index (O(1) addressability, not a replayed sequence)", () => {
    const values = new Set<string>();
    for (let i = 0; i < 50; i++) {
      values.add(derive(MASTER_SEED, baseKey({ index: i })).toString());
    }
    expect(values.size).toBe(50);
  });

  it("produces different values for keys differing only in one other field", () => {
    const a = derive(MASTER_SEED, baseKey({ learner: "L007" }));
    const b = derive(MASTER_SEED, baseKey({ learner: "L008" }));
    expect(a).not.toBe(b);
  });

  it("different master seeds (e.g. a pilot vs confirmatory split by seed, or any future protocol version) never collide for the same key", () => {
    const a = derive("RISE-PHASE8-v2", baseKey());
    const b = derive("RISE-PHASE8-v2-OTHER", baseKey());
    expect(a).not.toBe(b);
  });

  it("returns an unsigned 64-bit value (never negative when read as a BigInt)", () => {
    for (let i = 0; i < 20; i++) {
      const x = derive(MASTER_SEED, baseKey({ index: i }));
      expect(x >= BigInt(0)).toBe(true);
      expect(x < BigInt(2) ** BigInt(64)).toBe(true);
    }
  });
});

describe("uniformAt", () => {
  it("always returns a value in [0, 1)", () => {
    for (let i = 0; i < 2000; i++) {
      const u = uniformAt(MASTER_SEED, baseKey({ index: i }));
      expect(u).toBeGreaterThanOrEqual(0);
      expect(u).toBeLessThan(1);
    }
  });

  it("is well-distributed across the unit interval over many draws (coarse sanity check, not a full uniformity test)", () => {
    const n = 5000;
    let sum = 0;
    const buckets = new Array(10).fill(0);
    for (let i = 0; i < n; i++) {
      const u = uniformAt(MASTER_SEED, baseKey({ index: i }));
      sum += u;
      buckets[Math.min(9, Math.floor(u * 10))]++;
    }
    const mean = sum / n;
    expect(mean).toBeGreaterThan(0.47);
    expect(mean).toBeLessThan(0.53);
    // No bucket should be wildly over/under-represented for a uniform source.
    for (const count of buckets) {
      expect(count).toBeGreaterThan(n / 10 - n * 0.04);
      expect(count).toBeLessThan(n / 10 + n * 0.04);
    }
  });

  it("is deterministic -- same key, same value, called many times", () => {
    const key = baseKey({ index: 42 });
    const first = uniformAt(MASTER_SEED, key);
    for (let i = 0; i < 5; i++) {
      expect(uniformAt(MASTER_SEED, key)).toBe(first);
    }
  });
});

describe("normalAt", () => {
  it("has approximately zero mean and unit variance over many draws", () => {
    const n = 20000;
    let sum = 0;
    let sumSq = 0;
    for (let i = 0; i < n; i++) {
      const z = normalAt(MASTER_SEED, baseKey({ index: i }));
      sum += z;
      sumSq += z * z;
    }
    const mean = sum / n;
    const variance = sumSq / n - mean * mean;
    expect(mean).toBeGreaterThan(-0.05);
    expect(mean).toBeLessThan(0.05);
    expect(variance).toBeGreaterThan(0.9);
    expect(variance).toBeLessThan(1.1);
  });

  it("consumes index slots 2i and 2i+1, so normal index i does not collide with uniform draws at raw indices 2i/2i+1 under a DIFFERENT stream", () => {
    const streamA = baseKey({ stream: "itemNoise", index: 7 });
    const normalValue = normalAt(MASTER_SEED, streamA);
    const rawAt14 = uniformAt(MASTER_SEED, { ...streamA, index: 14 });
    const rawAt15 = uniformAt(MASTER_SEED, { ...streamA, index: 15 });
    // The normal draw is a deterministic function of exactly those two uniforms.
    const u1 = Math.max(rawAt14, Number.EPSILON);
    const expected = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * rawAt15);
    expect(normalValue).toBeCloseTo(expected, 12);
  });

  it("is deterministic", () => {
    const key = baseKey({ index: 3 });
    const first = normalAt(MASTER_SEED, key);
    expect(normalAt(MASTER_SEED, key)).toBe(first);
  });
});

describe("keyedRandom", () => {
  it("returns an independent, deterministic SeededRandom instance per key", () => {
    const keyA = baseKey({ stream: "schedule", index: 0 });
    const keyB = baseKey({ stream: "schedule", index: 1 });
    const rngA1 = keyedRandom(MASTER_SEED, keyA);
    const rngB = keyedRandom(MASTER_SEED, keyB);
    const sequenceA1 = [rngA1.next(), rngA1.next(), rngA1.next()];
    const rngA2 = keyedRandom(MASTER_SEED, keyA);
    const sequenceA2 = [rngA2.next(), rngA2.next(), rngA2.next()];
    expect(sequenceA1).toEqual(sequenceA2);
    expect(sequenceA1).not.toEqual([rngB.next(), rngB.next(), rngB.next()]);
  });
});

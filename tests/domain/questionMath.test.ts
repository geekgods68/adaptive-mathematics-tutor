import { describe, expect, it } from "vitest";

const EPSILON = 1e-9;

function approxEqual(a: number, b: number): boolean {
  return Math.abs(a - b) < EPSILON;
}

describe("q-solve-factorisation-01: x² − 5x + 6 = 0", () => {
  const f = (x: number) => x * x - 5 * x + 6;

  it("x = 2 and x = 3 (the correct answer) are roots", () => {
    expect(approxEqual(f(2), 0)).toBe(true);
    expect(approxEqual(f(3), 0)).toBe(true);
  });

  it("the distractor roots are NOT roots", () => {
    expect(approxEqual(f(-2), 0)).toBe(false);
    expect(approxEqual(f(-3), 0)).toBe(false);
    expect(approxEqual(f(-6), 0)).toBe(false);
  });
});

describe("q-expand-brackets-01: (x + 3)(x − 4)", () => {
  const expand = (x: number) => (x + 3) * (x - 4);
  const correctForm = (x: number) => x * x - x - 12;

  it("the correct expansion matches the product for arbitrary x", () => {
    for (const x of [-5, -1, 0, 2.5, 10]) {
      expect(approxEqual(expand(x), correctForm(x))).toBe(true);
    }
  });

  it("each distractor's form does NOT match the product", () => {
    const distractors = [
      (x: number) => x * x + x - 12,
      (x: number) => x * x - x + 12,
      (x: number) => x * x - 7 * x - 12,
      (x: number) => x * x - 12,
    ];
    for (const distractor of distractors) {
      // A generic x (not a root of the difference) is enough to disprove equivalence.
      expect(approxEqual(distractor(2.5), expand(2.5))).toBe(false);
    }
  });
});

describe("q-quadratic-formula-01: x² + 4x − 1 = 0", () => {
  const f = (x: number) => x * x + 4 * x - 1;

  it("x = −2 + √5 and x = −2 − √5 (the correct answer) are roots", () => {
    expect(approxEqual(f(-2 + Math.sqrt(5)), 0)).toBe(true);
    expect(approxEqual(f(-2 - Math.sqrt(5)), 0)).toBe(true);
  });

  it("the distractor root sets are NOT roots", () => {
    expect(approxEqual(f(2 + Math.sqrt(5)), 0)).toBe(false);
    expect(approxEqual(f(-2 + Math.sqrt(3)), 0)).toBe(false);
  });
});

describe("q-discriminant-nature-01: 2x² − 4x + 5 = 0", () => {
  it("the discriminant is negative (no real roots)", () => {
    const discriminant = (-4) ** 2 - 4 * 2 * 5;
    expect(discriminant).toBe(-24);
    expect(discriminant < 0).toBe(true);
  });

  it("the B2_PLUS_4AC distractor value (b² + 4ac) is positive, explaining the wrong conclusion", () => {
    const wrongDiscriminant = (-4) ** 2 + 4 * 2 * 5;
    expect(wrongDiscriminant).toBe(56);
    expect(wrongDiscriminant > 0).toBe(true);
  });

  it("the guessed factorisation (2x − 5)(x + 1) does NOT expand to 2x² − 4x + 5", () => {
    const guessedExpansion = (x: number) => (2 * x - 5) * (x + 1);
    const original = (x: number) => 2 * x * x - 4 * x + 5;
    expect(approxEqual(guessedExpansion(1), original(1))).toBe(false);
  });
});

describe("q-factorise-identify-01: x² + 2x − 15", () => {
  const original = (x: number) => x * x + 2 * x - 15;

  it("the correct factorisation (x + 5)(x − 3) matches the original for arbitrary x", () => {
    const correct = (x: number) => (x + 5) * (x - 3);
    for (const x of [-4, 0, 1, 6]) {
      expect(approxEqual(correct(x), original(x))).toBe(true);
    }
  });

  it("each distractor factorisation does NOT match the original", () => {
    const distractors = [
      (x: number) => (x - 5) * (x + 3),
      (x: number) => (x + 15) * (x - 1),
      (x: number) => (x - 3) * (x - 5),
    ];
    for (const distractor of distractors) {
      expect(approxEqual(distractor(1), original(1))).toBe(false);
    }
  });
});

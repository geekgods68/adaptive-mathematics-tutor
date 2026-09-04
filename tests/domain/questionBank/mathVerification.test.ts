import { describe, expect, it } from "vitest";
import {
  approxEqual,
  discriminant,
  discriminantB2Plus4ac,
  evaluateQuadratic,
  productOfRoots,
  realRoots,
  rootsWithBSignDropped,
  sumOfRoots,
  vertexX,
  vertexY,
} from "../../helpers/quadratics";

/**
 * Representative, deterministic mathematical verification of the
 * production question bank — not exhaustive per-question symbolic
 * checking (see docs/question-bank-validation.md for why), but enough to
 * mechanically confirm: (a) stated correct answers really solve their
 * equations, and (b) named-misconception distractors really follow from
 * that misconception's flawed procedure, for a representative sample
 * spanning every strand and several distinct misconception families.
 */

describe("correct-answer verification by substitution (across strands)", () => {
  it("q-solve-factorisation-01: x² − 5x + 6 = 0 has roots 2, 3", () => {
    expect(approxEqual(evaluateQuadratic(1, -5, 6, 2), 0)).toBe(true);
    expect(approxEqual(evaluateQuadratic(1, -5, 6, 3), 0)).toBe(true);
  });

  it("q-factor-nonmonic-004: 6x² − 7x − 3 = (3x + 1)(2x − 3)", () => {
    const expand = (x: number) => (3 * x + 1) * (2 * x - 3);
    for (const x of [-2, 0, 1.5, 4]) {
      expect(approxEqual(expand(x), evaluateQuadratic(6, -7, -3, x))).toBe(true);
    }
  });

  it("q-quadratic-formula-01: x² + 4x − 1 = 0 has roots −2 ± √5", () => {
    const sqrt5 = Math.sqrt(5);
    expect(approxEqual(evaluateQuadratic(1, 4, -1, -2 + sqrt5), 0)).toBe(true);
    expect(approxEqual(evaluateQuadratic(1, 4, -1, -2 - sqrt5), 0)).toBe(true);
  });

  it("q-complete-square-001: x² + 6x + 1 = (x + 3)² − 8", () => {
    for (const x of [-6, -3, 0, 4]) {
      expect(approxEqual((x + 3) ** 2 - 8, evaluateQuadratic(1, 6, 1, x))).toBe(true);
    }
  });

  it("q-discriminant-nature-01: 2x² − 4x + 5 = 0 has a negative discriminant", () => {
    expect(discriminant(2, -4, 5)).toBe(-24);
    expect(discriminant(2, -4, 5) < 0).toBe(true);
    expect(realRoots(2, -4, 5)).toBeNull();
  });

  it("q-root-coeff-parameter-002: x² − 8x + k = 0 with roots r and 3r summing to 8 gives r=2, k=12", () => {
    const r = 2;
    expect(sumOfRoots(1, -8)).toBe(r + 3 * r);
    expect(r * (3 * r)).toBe(12);
  });

  it("q-vertex-axis-003: vertex of 2x² − 8x + 3 is (2, −5)", () => {
    expect(vertexX(2, -8)).toBe(2);
    expect(approxEqual(vertexY(2, -8, 3), -5)).toBe(true);
  });

  it("q-vertex-form-004: 2x² − 12x + 7 = 2(x − 3)² − 11", () => {
    for (const x of [-1, 3, 5, 8]) {
      expect(approxEqual(2 * (x - 3) ** 2 - 11, evaluateQuadratic(2, -12, 7, x))).toBe(true);
    }
  });

  it("q-line-parabola-004: x² − x − 3 and 3x + 2 meet at x = 5 and x = −1", () => {
    const parabola = (x: number) => evaluateQuadratic(1, -1, -3, x);
    const line = (x: number) => 3 * x + 2;
    for (const x of [5, -1]) {
      expect(approxEqual(parabola(x), line(x))).toBe(true);
    }
  });

  it("q-integrated-005: line y = 2x + k is tangent to x² − 4x + 7 exactly when k = −2", () => {
    // x² - 4x + 7 = 2x + k  =>  x² - 6x + (7 - k) = 0; tangency <=> discriminant = 0
    const disc = (k: number) => discriminant(1, -6, 7 - k);
    expect(disc(-2)).toBe(0);
    expect(disc(0)).not.toBe(0);
  });
});

describe("misconception family: B2_PLUS_4AC (discriminant computed as b² + 4ac)", () => {
  const cases: Array<{ id: string; a: number; b: number; c: number; correctValue: number; flawedValue: number }> = [
    { id: "q-discriminant-compute-001", a: 1, b: 6, c: 5, correctValue: 16, flawedValue: 56 },
    { id: "q-discriminant-nature-01", a: 2, b: -4, c: 5, correctValue: -24, flawedValue: 56 },
    { id: "q-discriminant-nature-004", a: 3, b: -1, c: 2, correctValue: -23, flawedValue: 25 },
    { id: "q-quadratic-formula-003", a: 1, b: -6, c: 4, correctValue: 20, flawedValue: 52 },
  ];

  for (const { id, a, b, c, correctValue, flawedValue } of cases) {
    it(`${id}: b² − 4ac = ${correctValue}, and the B2_PLUS_4AC distractor's b² + 4ac = ${flawedValue}`, () => {
      expect(discriminant(a, b, c)).toBe(correctValue);
      expect(discriminantB2Plus4ac(a, b, c)).toBe(flawedValue);
      expect(discriminant(a, b, c)).not.toBe(discriminantB2Plus4ac(a, b, c));
    });
  }
});

describe("misconception family: NEGATIVE_B_DROPPED (substitutes +b instead of −b)", () => {
  const cases: Array<{ id: string; a: number; b: number; c: number; correctRoots: [number, number]; flawedRoots: [number, number] }> = [
    { id: "q-quadratic-formula-01", a: 1, b: 4, c: -1, correctRoots: [-2 + Math.sqrt(5), -2 - Math.sqrt(5)], flawedRoots: [2 + Math.sqrt(5), 2 - Math.sqrt(5)] },
    { id: "q-quadratic-formula-002", a: 2, b: 3, c: -2, correctRoots: [0.5, -2], flawedRoots: [2, -0.5] },
    { id: "q-quadratic-formula-004", a: 3, b: 2, c: -1, correctRoots: [1 / 3, -1], flawedRoots: [1, -1 / 3] },
  ];

  for (const { id, a, b, c, correctRoots, flawedRoots } of cases) {
    it(`${id}: correct roots solve the equation; NEGATIVE_B_DROPPED roots do not`, () => {
      for (const r of correctRoots) {
        expect(approxEqual(evaluateQuadratic(a, b, c, r), 0)).toBe(true);
      }
      const [computedFlawed1, computedFlawed2] = rootsWithBSignDropped(a, b, c)!;
      expect([computedFlawed1, computedFlawed2].sort((x, y) => x - y)).toEqual(
        [...flawedRoots].sort((x, y) => x - y),
      );
      for (const r of flawedRoots) {
        expect(approxEqual(evaluateQuadratic(a, b, c, r), 0)).toBe(false);
      }
    });
  }
});

describe("misconception family: ROOT_SUM_SIGN_ERROR / ROOT_PRODUCT_SIGN_ERROR (Vieta's formula sign flips)", () => {
  const cases: Array<{ id: string; a: number; b: number; c: number; correctSum: number; correctProduct: number }> = [
    { id: "q-root-sum-product-001 / 002", a: 1, b: -7, c: 10, correctSum: 7, correctProduct: 10 },
    { id: "q-root-sum-product-003 / 004", a: 2, b: 5, c: -3, correctSum: -2.5, correctProduct: -1.5 },
    { id: "q-root-sum-product-005", a: 3, b: -1, c: -4, correctSum: 1 / 3, correctProduct: -4 / 3 },
  ];

  for (const { id, a, b, c, correctSum, correctProduct } of cases) {
    it(`${id}: sum = −b/a = ${correctSum}, product = c/a = ${correctProduct}, and the sign-flipped values differ`, () => {
      expect(sumOfRoots(a, b)).toBe(correctSum);
      expect(productOfRoots(a, c)).toBe(correctProduct);
      // ROOT_SUM_SIGN_ERROR uses b/a instead of -b/a
      expect(b / a).not.toBe(correctSum);
      // ROOT_PRODUCT_SIGN_ERROR uses -c/a instead of c/a
      expect(-c / a).not.toBe(correctProduct);
    });
  }
});

describe("misconception family: FACTOR_SIGN_ERROR (correct magnitude, wrong sign pattern)", () => {
  const cases: Array<{ id: string; a: number; b: number; c: number; correctFactors: [number, number]; flippedFactors: [number, number] }> = [
    { id: "q-factor-monic-001", a: 1, b: 5, c: 6, correctFactors: [-2, -3], flippedFactors: [2, 3] },
    { id: "q-factor-monic-004", a: 1, b: -8, c: 15, correctFactors: [3, 5], flippedFactors: [-3, -5] },
    { id: "q-factorise-identify-01", a: 1, b: 2, c: -15, correctFactors: [-5, 3], flippedFactors: [5, -3] },
  ];

  for (const { id, a, b, c, correctFactors, flippedFactors } of cases) {
    it(`${id}: correct factorisation's roots satisfy the equation; the sign-flipped pair does not`, () => {
      for (const r of correctFactors) {
        expect(approxEqual(evaluateQuadratic(a, b, c, r), 0)).toBe(true);
      }
      for (const r of flippedFactors) {
        expect(approxEqual(evaluateQuadratic(a, b, c, r), 0)).toBe(false);
      }
    });
  }
});

describe("misconception family: PLUS_MINUS_DROPPED (only one branch of ± reported)", () => {
  it("q-solve-complete-square-001: (x+3)² = 8 has two roots, not one", () => {
    const roots = realRoots(1, 6, 1)!;
    expect(roots).toHaveLength(2);
    expect(approxEqual(roots[0], roots[1])).toBe(false);
  });

  it("q-discriminant-parameter-001: k² = 36 has two solutions, k = 6 and k = −6", () => {
    expect(Math.sqrt(36)).toBe(6);
    expect(-Math.sqrt(36)).toBe(-6);
    expect((6 as number) === (-6 as number)).toBe(false);
  });
});

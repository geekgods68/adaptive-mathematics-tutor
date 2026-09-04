/**
 * Small numeric helpers for verifying question-bank mathematics by
 * substitution — not a symbolic algebra system. Used by tests (and, while
 * authoring, via ad-hoc scripts) to check that a stored answer or
 * distractor actually follows from the stated computation.
 */

export const EPSILON = 1e-9;

export function approxEqual(a: number, b: number, eps = EPSILON): boolean {
  return Math.abs(a - b) < eps;
}

/** Evaluate ax² + bx + c at x. */
export function evaluateQuadratic(a: number, b: number, c: number, x: number): number {
  return a * x * x + b * x + c;
}

export function discriminant(a: number, b: number, c: number): number {
  return b * b - 4 * a * c;
}

/** The flawed discriminant produced by the B2_PLUS_4AC misconception. */
export function discriminantB2Plus4ac(a: number, b: number, c: number): number {
  return b * b + 4 * a * c;
}

/** The real roots of ax² + bx + c = 0, or null if the discriminant is negative. */
export function realRoots(a: number, b: number, c: number): [number, number] | null {
  const d = discriminant(a, b, c);
  if (d < 0) return null;
  const sqrtD = Math.sqrt(d);
  return [(-b + sqrtD) / (2 * a), (-b - sqrtD) / (2 * a)];
}

/** The roots produced by the NEGATIVE_B_DROPPED misconception (uses +b instead of −b). */
export function rootsWithBSignDropped(a: number, b: number, c: number): [number, number] | null {
  const d = discriminant(a, b, c);
  if (d < 0) return null;
  const sqrtD = Math.sqrt(d);
  return [(b + sqrtD) / (2 * a), (b - sqrtD) / (2 * a)];
}

/** Sum of roots via Vieta's formula, −b/a. */
export function sumOfRoots(a: number, b: number): number {
  return -b / a;
}

/** Product of roots via Vieta's formula, c/a. */
export function productOfRoots(a: number, c: number): number {
  return c / a;
}

/** Vertex x-coordinate, −b/2a. */
export function vertexX(a: number, b: number): number {
  return -b / (2 * a);
}

export function vertexY(a: number, b: number, c: number): number {
  return evaluateQuadratic(a, b, c, vertexX(a, b));
}

/** Expand (x + p)(x + q) into [b, c] for x² + bx + c. */
export function expandMonicBinomials(p: number, q: number): { b: number; c: number } {
  return { b: p + q, c: p * q };
}

/** Expand (mx + p)(nx + q) into [a, b, c] for ax² + bx + c. */
export function expandBinomials(
  m: number,
  p: number,
  n: number,
  q: number,
): { a: number; b: number; c: number } {
  return { a: m * n, b: m * q + n * p, c: p * q };
}

/** Reduce a fraction to lowest terms with a positive denominator. */
export function reduceFraction(numerator: number, denominator: number): { numerator: number; denominator: number } {
  if (denominator < 0) {
    numerator = -numerator;
    denominator = -denominator;
  }
  const gcd = (x: number, y: number): number => (y === 0 ? x : gcd(y, x % y));
  const divisor = gcd(Math.abs(numerator), Math.abs(denominator)) || 1;
  return { numerator: numerator / divisor, denominator: denominator / divisor };
}

import { describe, expect, it } from "vitest";
import { canonicalize, computeContentDigest } from "@/research/artifact/canonicalize";

describe("canonicalize", () => {
  it("produces the identical string regardless of object key insertion order", () => {
    const a = { z: 1, a: 2, m: { y: 1, x: 2 } };
    const b = { a: 2, m: { x: 2, y: 1 }, z: 1 };
    expect(canonicalize(a)).toBe(canonicalize(b));
  });

  it("preserves array order (order is meaningful data, not sorted)", () => {
    expect(canonicalize([3, 1, 2])).toBe(JSON.stringify([3, 1, 2]));
    expect(canonicalize([3, 1, 2])).not.toBe(canonicalize([1, 2, 3]));
  });

  it("preserves exact floating-point precision — no rounding", () => {
    const value = { mastery: 0.123456789012345 };
    expect(canonicalize(value)).toContain("0.123456789012345");
  });

  it("distinguishes objects that differ only in a deeply nested field", () => {
    const a = { outer: { inner: { value: 0.5 } } };
    const b = { outer: { inner: { value: 0.50000001 } } };
    expect(canonicalize(a)).not.toBe(canonicalize(b));
  });

  it("drops undefined properties, consistently with JSON.stringify's own behavior", () => {
    const value = { a: 1, b: undefined };
    expect(canonicalize(value)).toBe(canonicalize({ a: 1 }));
  });
});

describe("computeContentDigest", () => {
  it("is deterministic for identical input", () => {
    const value = { a: 1, nested: { b: [1, 2, 3] } };
    expect(computeContentDigest(value)).toBe(computeContentDigest(value));
  });

  it("is insensitive to key order", () => {
    expect(computeContentDigest({ a: 1, b: 2 })).toBe(computeContentDigest({ b: 2, a: 1 }));
  });

  it("changes when any nested value changes, however small", () => {
    const original = computeContentDigest({ mastery: 0.5600000000001 });
    const changed = computeContentDigest({ mastery: 0.5600000000002 });
    expect(original).not.toBe(changed);
  });

  it("produces a 64-character lowercase hex string (SHA-256)", () => {
    expect(computeContentDigest({ a: 1 })).toMatch(/^[0-9a-f]{64}$/);
  });
});

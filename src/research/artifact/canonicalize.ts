import { createHash } from "node:crypto";

/**
 * Deterministic canonicalization for content hashing (requirement 5:
 * "do not rely on raw JSON object insertion order without a documented
 * canonicalization strategy"). Rules, applied recursively:
 * - Object keys are sorted lexicographically before serialization.
 * - Arrays preserve their original order (order is meaningful data).
 * - `undefined` values are dropped (matches `JSON.stringify`'s own
 *   behavior for object properties, applied consistently here too).
 * - Numbers are serialized via their native `JSON.stringify` double
 *   representation — the same IEEE-754 value always produces the same
 *   string, which is what "preserve exact mathematical values" requires;
 *   this function never rounds or reformats a number.
 */
function sortKeysDeep(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortKeysDeep);
  }
  if (value !== null && typeof value === "object") {
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      sorted[key] = sortKeysDeep((value as Record<string, unknown>)[key]);
    }
    return sorted;
  }
  return value;
}

/** The canonical string form of `value` — stable regardless of the original key insertion order. */
export function canonicalize(value: unknown): string {
  return JSON.stringify(sortKeysDeep(value));
}

/** SHA-256 of `canonicalize(value)`, as a lowercase hex string. */
export function computeContentDigest(value: unknown): string {
  return createHash("sha256").update(canonicalize(value)).digest("hex");
}

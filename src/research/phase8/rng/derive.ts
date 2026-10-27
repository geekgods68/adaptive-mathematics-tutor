/**
 * C4 (protocol/phase8-protocol-v2.md). Counter-based, address-only
 * randomness: every draw is keyed by an explicit 9-field tuple, so any
 * draw can be recomputed independently of execution order or
 * parallelism, and the same key always yields the same value. This is
 * NEW infrastructure, not a reuse of `src/research/experiment/rng.ts`'s
 * `createSeededRandom` -- that generator is sequential (confirmed in
 * the C1 pre-flight, P-8), so it cannot give O(1) access to the k-th
 * draw of a given key without replaying every prior draw. `keyedRandom`
 * below is the fallback the protocol itself specifies for that case:
 * seed one `createSeededRandom` instance per derived key.
 */

import { createHash } from "crypto";
import { createSeededRandom, type SeededRandom } from "@/research/experiment/rng";

export type FamilyGroup = "S1" | "S2" | "S3" | "S4";
export type Split = "calibration" | "test" | "pilot";
export type Stream =
  | "itemNoise"
  | "conceptParams"
  | "edgeKeep"
  | "edgeAdd"
  | "profile"
  | "init"
  | "response"
  | "mixture"
  | "opp"
  | "learn"
  | "schedule"
  | "c0slice"
  | "artifactSample"
  | "bootstrap";

/** `-` is the literal placeholder for a field that does not apply to a given key (B10.3, C4). */
export const UNUSED = "-" as const;
export type Unused = typeof UNUSED;

export interface DeriveKey {
  track: string | Unused;
  familyGroup: FamilyGroup | Unused;
  world: number | Unused;
  /** A slice is identified by a chapterId (string) or a numeric slice index, depending on caller convention. */
  slice: string | number | Unused;
  split: Split | Unused;
  learner: string | Unused;
  stream: Stream | Unused;
  concept: string | Unused;
  index: number | Unused;
}

function fieldToString(value: string | number | Unused): string {
  return typeof value === "number" ? String(value) : value;
}

/** The exact string SHA-256 is computed over: `masterSeed|f1|f2|...|f9` in the field order fixed by C4/B10.3. */
export function deriveKeyString(masterSeed: string, key: DeriveKey): string {
  return [
    masterSeed,
    fieldToString(key.track),
    fieldToString(key.familyGroup),
    fieldToString(key.world),
    fieldToString(key.slice),
    fieldToString(key.split),
    fieldToString(key.learner),
    fieldToString(key.stream),
    fieldToString(key.concept),
    fieldToString(key.index),
  ].join("|");
}

/** The first 8 bytes (big-endian) of SHA-256(deriveKeyString(...)), as an unsigned 64-bit BigInt. */
export function derive(masterSeed: string, key: DeriveKey): bigint {
  const digest = createHash("sha256").update(deriveKeyString(masterSeed, key), "utf-8").digest();
  return digest.readBigUInt64BE(0);
}

const TWO_POW_53 = 2 ** 53;

const ELEVEN = BigInt(11);

/** Uniform in [0, 1): u = (x >>> 11) / 2^53, the standard top-53-bits mantissa trick applied to the derived uint64. */
export function uniformAt(masterSeed: string, key: DeriveKey): number {
  const x = derive(masterSeed, key);
  const top53 = x >> ELEVEN;
  return Number(top53) / TWO_POW_53;
}

/**
 * Standard normal draw via Box-Muller, consuming index slots 2i and 2i+1
 * of `key` (C4: "Normal: Box-Muller from indices 2i and 2i+1"). `key.index`
 * must be a number (the normal draw's own index i, not already doubled) --
 * enforced at runtime since `DeriveKey.index` is typed as `number | "-"`.
 */
export function normalAt(masterSeed: string, key: DeriveKey): number {
  if (typeof key.index !== "number") {
    throw new Error(`normalAt: key.index must be a number, got "${String(key.index)}".`);
  }
  const i = key.index;
  const u1Key: DeriveKey = { ...key, index: 2 * i };
  const u2Key: DeriveKey = { ...key, index: 2 * i + 1 };
  // Guard against the astronomically unlikely u1 = 0 (ln(0) = -Infinity); the
  // smallest representable positive value from this scheme is 2^-53.
  const u1 = Math.max(uniformAt(masterSeed, u1Key), Number.EPSILON);
  const u2 = uniformAt(masterSeed, u2Key);
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

/**
 * Fallback for when a whole deterministic sub-sequence is needed from a
 * single key (rather than one addressable value) -- seeds one
 * `createSeededRandom` instance from that key's derived value, per C4's
 * own disposition for the existing sequential RNG (P-8). Each returned
 * instance is independent and never shared across keys.
 */
export function keyedRandom(masterSeed: string, key: DeriveKey): SeededRandom {
  const seedValue = derive(masterSeed, key).toString(16);
  return createSeededRandom(`${deriveKeyString(masterSeed, key)}#${seedValue}`);
}

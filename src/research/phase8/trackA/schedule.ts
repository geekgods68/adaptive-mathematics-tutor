/**
 * C7.2/B5.2 (protocol/phase8-protocol-v2.md): the "blocked-with-review"
 * Track A history schedule. Generated from its OWN seed stream
 * (`schedule`) -- it cannot be influenced by any estimator, and is
 * identical regardless of which estimator later replays it (B5.3).
 */

import { uniformAt, type DeriveKey, type FamilyGroup, type Split } from "@/research/phase8/rng/derive";
import type { Concept } from "@/domain/concepts/types";
import type { Question } from "@/domain/questions/types";
import { effectiveConceptWeights } from "@/research/phase8/slices/selectSlices";

export type SchedulePhase = "phase1" | "phase2" | "review";

export interface ScheduleItem {
  questionId: string;
  conceptId: string;
  level: number;
  phase: SchedulePhase;
  /** True if this item had to be reused (the concept's unused single-concept pool was exhausted). Logged, never silently hidden (B5.2). */
  reused: boolean;
}

export interface ScheduleIdentity {
  masterSeed: string;
  family: FamilyGroup;
  /** Which family CELL this identity belongs to (e.g. "S4-ref") -- distinct from `family` for S4, which shares its RNG family-group across all cells (C4/B10.3); matches LearnerIdentity's "cell" field so a ScheduleIdentity can be used directly wherever a LearnerIdentity is required. */
  cell: string;
  world: number;
  sliceId: string;
  split: Split;
  learnerId: string;
}

function scheduleKey(id: ScheduleIdentity, concept: string, index: number): DeriveKey {
  return {
    track: "A",
    familyGroup: id.family,
    world: id.world,
    slice: id.sliceId,
    split: id.split,
    learner: id.learnerId,
    stream: "schedule",
    concept,
    index,
  };
}

/** Curriculum topological order: concepts sorted by (curriculumLevel, conceptId) ascending -- the same fixed order used throughout C5/C7 (trueGraph.ts's own ordering, duplicated here to avoid a simulator->trackA dependency). */
function topoOrder(conceptIds: readonly string[], byId: ReadonlyMap<string, Concept>): string[] {
  return [...conceptIds].sort((a, b) => {
    const ca = byId.get(a);
    const cb = byId.get(b);
    const levelDiff = (ca?.curriculumLevel ?? 0) - (cb?.curriculumLevel ?? 0);
    if (levelDiff !== 0) return levelDiff;
    return a.localeCompare(b);
  });
}

interface ConceptItemPool {
  /** Remaining (unused) single-concept question ids per level, in a fixed deterministic order (by question id) so draws are reproducible. */
  remainingByLevel: Map<number, string[]>;
  /** All single-concept items for this concept (for the reuse fallback once every level is exhausted). */
  all: Question[];
}

function buildItemPools(targetAndExternalIds: readonly string[], qSlice: readonly Question[]): Map<string, ConceptItemPool> {
  const pools = new Map<string, ConceptItemPool>();
  for (const conceptId of targetAndExternalIds) {
    const items = qSlice
      .filter((q) => {
        const w = effectiveConceptWeights(q);
        const keys = Object.keys(w);
        return keys.length === 1 && keys[0] === conceptId;
      })
      .sort((a, b) => a.id.localeCompare(b.id));
    const remainingByLevel = new Map<number, string[]>();
    for (const item of items) {
      const list = remainingByLevel.get(item.difficulty) ?? [];
      list.push(item.id);
      remainingByLevel.set(item.difficulty, list);
    }
    pools.set(conceptId, { remainingByLevel, all: items });
  }
  return pools;
}

/** Draws one item for `conceptId`: level uniform among levels with unused items, then item uniform within that level, without replacement. Falls back to reuse (logged) once the concept's pool is exhausted. */
function drawItem(
  id: ScheduleIdentity,
  conceptId: string,
  pool: ConceptItemPool,
  qSliceById: ReadonlyMap<string, Question>,
  drawCounterRef: { n: number },
): { questionId: string; level: number; reused: boolean } {
  const levelsWithStock = [...pool.remainingByLevel.entries()].filter(([, items]) => items.length > 0);
  if (levelsWithStock.length > 0) {
    const levelKeys = levelsWithStock.map(([level]) => level).sort((a, b) => a - b);
    const uLevel = uniformAt(id.masterSeed, scheduleKey(id, `${conceptId}:level`, drawCounterRef.n++));
    const level = levelKeys[Math.min(levelKeys.length - 1, Math.floor(uLevel * levelKeys.length))];
    const itemsAtLevel = pool.remainingByLevel.get(level)!;
    const uItem = uniformAt(id.masterSeed, scheduleKey(id, `${conceptId}:item`, drawCounterRef.n++));
    const itemIndex = Math.min(itemsAtLevel.length - 1, Math.floor(uItem * itemsAtLevel.length));
    const questionId = itemsAtLevel[itemIndex];
    itemsAtLevel.splice(itemIndex, 1); // without replacement
    return { questionId, level, reused: false };
  }
  // Exhausted: reuse allowed, logged. Draw uniformly among ALL of this concept's single-concept items.
  if (pool.all.length === 0) {
    throw new Error(`Track A schedule: concept "${conceptId}" has zero single-concept items in this Q_slice -- cannot generate a schedule item for it.`);
  }
  const uReuse = uniformAt(id.masterSeed, scheduleKey(id, `${conceptId}:reuse`, drawCounterRef.n++));
  const reuseIndex = Math.min(pool.all.length - 1, Math.floor(uReuse * pool.all.length));
  const reused = pool.all[reuseIndex];
  return { questionId: reused.id, level: reused.difficulty, reused: true };
}

export interface GenerateScheduleResult {
  items: ScheduleItem[];
  reuseCount: number;
}

/**
 * Generates the full "blocked-with-review" schedule for one Track A
 * test or calibration learner (B5.2/C7.2):
 * Phase 1: `phase1PerX` items per X_c concept, X_c in topological order.
 * Phase 2: `phase2PerT` items per T_c concept, T_c in curriculum order;
 * after every `reviewEvery`-th Phase 2 item, one review item from a
 * concept chosen uniformly among concepts already practised.
 */
export function generateHistorySchedule(
  id: ScheduleIdentity,
  targetConceptIds: readonly string[],
  externalConceptIds: readonly string[],
  concepts: readonly Concept[],
  qSlice: readonly Question[],
  phase1PerX: number,
  phase2PerT: number,
  reviewEvery: number,
): GenerateScheduleResult {
  const byId = new Map(concepts.map((c) => [c.id, c]));
  const xOrder = topoOrder(externalConceptIds, byId);
  const tOrder = topoOrder(targetConceptIds, byId);
  const pools = buildItemPools([...xOrder, ...tOrder], qSlice);
  const qSliceById = new Map(qSlice.map((q) => [q.id, q]));
  const drawCounterRef = { n: 0 };

  const items: ScheduleItem[] = [];
  let reuseCount = 0;
  const practisedConcepts: string[] = [];

  function pushItem(conceptId: string, phase: SchedulePhase): void {
    const pool = pools.get(conceptId);
    if (!pool) throw new Error(`Track A schedule: no item pool for concept "${conceptId}".`);
    const { questionId, level, reused } = drawItem(id, conceptId, pool, qSliceById, drawCounterRef);
    if (reused) reuseCount++;
    items.push({ questionId, conceptId, level, phase, reused });
    if (!practisedConcepts.includes(conceptId)) practisedConcepts.push(conceptId);
  }

  // Phase 1: X_c, topological order.
  for (const conceptId of xOrder) {
    for (let i = 0; i < phase1PerX; i++) pushItem(conceptId, "phase1");
  }

  // Phase 2: T_c, curriculum order, with a review item after every reviewEvery-th Phase 2 item.
  let phase2Count = 0;
  let reviewDrawIndex = 0;
  for (const conceptId of tOrder) {
    for (let i = 0; i < phase2PerT; i++) {
      pushItem(conceptId, "phase2");
      phase2Count++;
      if (phase2Count % reviewEvery === 0) {
        const uReview = uniformAt(id.masterSeed, scheduleKey(id, "review", reviewDrawIndex++));
        const reviewConceptIndex = Math.min(practisedConcepts.length - 1, Math.floor(uReview * practisedConcepts.length));
        pushItem(practisedConcepts[reviewConceptIndex], "review");
      }
    }
  }

  return { items, reuseCount };
}

/** Expected schedule length: 6|X_c| + 15|T_c| under the protocol's own default phase1PerX=6/phase2PerT=12/reviewEvery=4 (12 items per T_c concept contributes 3 review items -> 12+3=15 per target concept). Exposed for tests/validation, not used internally. */
export function expectedScheduleLength(xCount: number, tCount: number, phase1PerX: number, phase2PerT: number, reviewEvery: number): number {
  const reviewsPerTarget = Math.floor(phase2PerT / reviewEvery);
  return phase1PerX * xCount + (phase2PerT + reviewsPerTarget) * tCount;
}

/**
 * C8.2 (protocol/phase8-protocol-v2.md): C0-slice, the fallback
 * non-adaptive Track B policy -- used because the C1 pre-flight (P-5)
 * found the implemented `NonAdaptiveSelectionPolicy` walks a caller-
 * supplied sequence but does not itself compute curriculum order, so it
 * cannot alone satisfy B6.2's "can present T_c in curriculum order"
 * criterion. This module builds that sequence; WALKING it reuses the
 * existing, unmodified `createNonAdaptiveSelectionAdapter` (Phase 5,
 * not a protected module) exactly as-is, via
 * `ExperimentScenario.predeterminedSequence` -- C0-slice changes only
 * how the sequence is constructed, never how it is read.
 */

import { uniformAt, type DeriveKey } from "@/research/phase8/rng/derive";
import type { Question } from "@/domain/questions/types";
import { effectiveConceptWeights } from "@/research/phase8/slices/selectSlices";

export interface C0SliceIdentity {
  masterSeed: string;
  world: number;
  sliceId: string;
  learnerId: string;
}

function c0SliceKey(id: C0SliceIdentity, concept: string, index: number): DeriveKey {
  return {
    track: "B",
    familyGroup: "-",
    world: id.world,
    slice: id.sliceId,
    split: "-",
    learner: id.learnerId,
    stream: "c0slice",
    concept,
    index,
  };
}

/**
 * Builds the C0-slice question sequence: `T_c` in curriculum order,
 * floor(budget/|T_c|) questions per concept (remainder distributed to
 * the earliest concepts in that order), levels cycling L1->L5 within
 * each concept's block, items chosen uniformly within level without
 * replacement.
 */
export function buildC0SliceSequence(
  targetConceptIdsInCurriculumOrder: readonly string[],
  qSlice: readonly Question[],
  budget: number,
  identity: C0SliceIdentity,
): string[] {
  const tCount = targetConceptIdsInCurriculumOrder.length;
  if (tCount === 0) return [];
  const perConcept = Math.floor(budget / tCount);
  const remainder = budget - perConcept * tCount;

  // Pool of candidate items per (concept, level): any item whose concept weights include this concept.
  const poolByConceptLevel = new Map<string, Map<number, string[]>>();
  for (const conceptId of targetConceptIdsInCurriculumOrder) {
    const byLevel = new Map<number, string[]>();
    for (const q of qSlice) {
      if (conceptId in effectiveConceptWeights(q)) {
        const list = byLevel.get(q.difficulty) ?? [];
        list.push(q.id);
        byLevel.set(q.difficulty, list);
      }
    }
    for (const list of byLevel.values()) list.sort(); // deterministic order before shuffling by draw
    poolByConceptLevel.set(conceptId, byLevel);
  }

  const sequence: string[] = [];
  const drawCounters = new Map<string, number>();

  for (let i = 0; i < tCount; i++) {
    const conceptId = targetConceptIdsInCurriculumOrder[i];
    const blockLength = perConcept + (i < remainder ? 1 : 0);
    const byLevel = poolByConceptLevel.get(conceptId)!;
    for (let j = 0; j < blockLength; j++) {
      const level = (j % 5) + 1;
      const candidates = byLevel.get(level);
      if (!candidates || candidates.length === 0) {
        // No unused item at this level for this concept -- fall back to any remaining item for this concept at any level (logged by omission from the primary path; Tier 1 does not require reuse logging for C0-slice specifically, unlike Track A's schedule).
        const anyLevel = [...byLevel.entries()].find(([, items]) => items.length > 0);
        if (!anyLevel) {
          throw new Error(`C0-slice: concept "${conceptId}" has no remaining items in Q_slice to fill its block (requested ${blockLength} items).`);
        }
        const [, items] = anyLevel;
        const index = drawCounters.get(conceptId) ?? 0;
        drawCounters.set(conceptId, index + 1);
        const u = uniformAt(identity.masterSeed, c0SliceKey(identity, conceptId, index));
        const pick = Math.min(items.length - 1, Math.floor(u * items.length));
        sequence.push(items[pick]);
        items.splice(pick, 1);
        continue;
      }
      const index = drawCounters.get(conceptId) ?? 0;
      drawCounters.set(conceptId, index + 1);
      const u = uniformAt(identity.masterSeed, c0SliceKey(identity, conceptId, index));
      const pick = Math.min(candidates.length - 1, Math.floor(u * candidates.length));
      sequence.push(candidates[pick]);
      candidates.splice(pick, 1);
    }
  }

  return sequence;
}

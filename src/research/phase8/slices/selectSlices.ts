/**
 * C7.1/B5.1 (protocol/phase8-protocol-v2.md): chapter-based curriculum
 * slice selection, shared by Track A and Track B. A fixed, deterministic
 * rule applied to bank and curriculum structure only, before any
 * outcome exists -- no estimator or policy result can influence which
 * slices are chosen.
 */

import type { Concept } from "@/domain/concepts/types";
import type { Question } from "@/domain/questions/types";

export type RelaxationLevel = "none" | "a" | "b" | "c";

export interface SliceCandidate {
  chapterId: string;
  targetConceptIds: string[];
  externalPrereqConceptIds: string[];
  edgesInsideTargets: number;
  edgesFromExternalIntoTargets: number;
  qSlice: Question[];
  /** Whether every q in qSlice is single-concept (false only under relaxation (c)). */
  singleConceptOnly: boolean;
}

export interface SliceSelectionResult {
  slices: SliceCandidate[];
  relaxationApplied: RelaxationLevel;
  eligibleChapterCount: number;
  itemCountsByChapter: Record<string, { tCount: number; xCount: number; qSliceSize: number }>;
}

export function effectiveConceptWeights(question: Question): Record<string, number> {
  return question.conceptWeights ?? { [question.primaryConceptId]: 1 };
}

function isSingleConcept(question: Question, conceptId: string): boolean {
  const weights = effectiveConceptWeights(question);
  const keys = Object.keys(weights);
  return keys.length === 1 && keys[0] === conceptId;
}

function buildPrereqIndex(concepts: readonly Concept[]): Map<string, Concept> {
  return new Map(concepts.map((c) => [c.id, c]));
}

/** External prerequisites of `targetIds` within `maxHops`, excluding anything already in `targetIds`. */
function externalPrereqsWithinHops(targetIds: ReadonlySet<string>, byId: ReadonlyMap<string, Concept>, maxHops: number): Set<string> {
  const visited = new Set<string>();
  let frontier = new Set<string>(targetIds);
  for (let hop = 0; hop < maxHops; hop++) {
    const next = new Set<string>();
    for (const conceptId of frontier) {
      const concept = byId.get(conceptId);
      if (!concept) continue;
      for (const prereqId of concept.prerequisiteIds) {
        if (!visited.has(prereqId) && !targetIds.has(prereqId)) {
          visited.add(prereqId);
        }
        if (!frontier.has(prereqId)) next.add(prereqId);
      }
    }
    if (next.size === 0) break;
    frontier = next;
  }
  return visited;
}

/** For each target concept, does it have an external-prerequisite concept within maxHops? (B5.1 condition 2 / C7.1) */
function targetsWithExternalPrereqWithinHops(
  targetIds: readonly string[],
  externalIds: ReadonlySet<string>,
  byId: ReadonlyMap<string, Concept>,
  maxHops: number,
): number {
  let count = 0;
  for (const targetId of targetIds) {
    const reached = externalPrereqsWithinHops(new Set([targetId]), byId, maxHops);
    let hasExternal = false;
    for (const r of reached) {
      if (externalIds.has(r)) {
        hasExternal = true;
        break;
      }
    }
    if (hasExternal) count++;
  }
  return count;
}

function countEdgesInside(targetIds: ReadonlySet<string>, byId: ReadonlyMap<string, Concept>): number {
  let count = 0;
  for (const id of targetIds) {
    const concept = byId.get(id);
    if (!concept) continue;
    for (const prereqId of concept.prerequisiteIds) {
      if (targetIds.has(prereqId)) count++;
    }
  }
  return count;
}

function countEdgesFromExternal(targetIds: ReadonlySet<string>, externalIds: ReadonlySet<string>, byId: ReadonlyMap<string, Concept>): number {
  let count = 0;
  for (const id of targetIds) {
    const concept = byId.get(id);
    if (!concept) continue;
    for (const prereqId of concept.prerequisiteIds) {
      if (externalIds.has(prereqId)) count++;
    }
  }
  return count;
}

interface ChapterStats {
  chapterId: string;
  targetIds: string[];
  externalIds: string[];
  edgesInside: number;
  edgesFromExternal: number;
  targetsWithExternal: number;
  scTargets: Map<string, number>;
  scExternal: Map<string, number>;
  qSliceAllItems: Question[];
  qSliceSingleConceptOnly: Question[];
}

function computeChapterStats(
  chapterId: string,
  concepts: readonly Concept[],
  questions: readonly Question[],
  byId: ReadonlyMap<string, Concept>,
  maxHops: number,
): ChapterStats {
  const targets = concepts.filter((c) => c.chapterId === chapterId);
  const targetIds = targets.map((c) => c.id);
  const targetIdSet = new Set(targetIds);
  const externalIdSet = externalPrereqsWithinHops(targetIdSet, byId, maxHops);
  const externalIds = [...externalIdSet];

  const edgesInside = countEdgesInside(targetIdSet, byId);
  const edgesFromExternal = countEdgesFromExternal(targetIdSet, externalIdSet, byId);
  const targetsWithExternal = targetsWithExternalPrereqWithinHops(targetIds, externalIdSet, byId, maxHops);

  const scTargets = new Map<string, number>();
  const scExternal = new Map<string, number>();
  for (const id of targetIds) {
    scTargets.set(id, questions.filter((q) => isSingleConcept(q, id)).length);
  }
  for (const id of externalIds) {
    scExternal.set(id, questions.filter((q) => isSingleConcept(q, id)).length);
  }

  const universe = new Set([...targetIdSet, ...externalIdSet]);
  const qSliceAllItems = questions.filter((q) => {
    const weights = effectiveConceptWeights(q);
    return Object.keys(weights).every((k) => universe.has(k));
  });
  const qSliceSingleConceptOnly = qSliceAllItems.filter((q) => Object.keys(effectiveConceptWeights(q)).length === 1);

  return {
    chapterId,
    targetIds,
    externalIds,
    edgesInside,
    edgesFromExternal,
    targetsWithExternal,
    scTargets,
    scExternal,
    qSliceAllItems,
    qSliceSingleConceptOnly,
  };
}

const RELAXATION_ORDER: RelaxationLevel[] = ["none", "a", "b", "c"];

/**
 * Relaxations (a), (b), (c) are CUMULATIVE and applied in order (C7.1/B5.1):
 * (a) loosens only the |T_c| range; (b) additionally loosens the X_c
 * condition; (c) additionally switches item counting from single-concept
 * items to all items. The "at least 3 internal edges" sub-condition of
 * rule 1 is never listed as relaxed, so it applies at every level.
 */
function isEligible(stats: ChapterStats, relax: RelaxationLevel): boolean {
  const level = RELAXATION_ORDER.indexOf(relax);
  const tSize = stats.targetIds.length;
  const xSize = stats.externalIds.length;

  const tRange = level >= 1 ? [4, 16] : [5, 12];
  if (tSize < tRange[0] || tSize > tRange[1]) return false;
  if (stats.edgesInside < 3) return false;

  if (level >= 2) {
    // relaxation (b): |X_c| >= 1 and at least one target with an external prerequisite.
    if (xSize < 1) return false;
    if (stats.targetsWithExternal < 1) return false;
  } else {
    if (xSize < 2 || xSize > 10) return false;
    if (stats.targetsWithExternal < Math.ceil(tSize / 2)) return false;
  }

  const useAllItems = level >= 3;
  const qSlice = useAllItems ? stats.qSliceAllItems : stats.qSliceSingleConceptOnly;
  for (const id of stats.targetIds) {
    const count = useAllItems ? qSlice.filter((q) => id in effectiveConceptWeights(q)).length : (stats.scTargets.get(id) ?? 0);
    if (count < 16) return false;
  }
  for (const id of stats.externalIds) {
    const count = useAllItems ? qSlice.filter((q) => id in effectiveConceptWeights(q)).length : (stats.scExternal.get(id) ?? 0);
    if (count < 8) return false;
  }

  if (qSlice.length < 120) return false;
  return true;
}

function toCandidate(stats: ChapterStats, relax: RelaxationLevel): SliceCandidate {
  const singleConceptOnly = relax !== "c";
  return {
    chapterId: stats.chapterId,
    targetConceptIds: stats.targetIds,
    externalPrereqConceptIds: stats.externalIds,
    edgesInsideTargets: stats.edgesInside,
    edgesFromExternalIntoTargets: stats.edgesFromExternal,
    qSlice: singleConceptOnly ? stats.qSliceSingleConceptOnly : stats.qSliceAllItems,
    singleConceptOnly,
  };
}

const MAX_HOPS = 5;

/**
 * Selects the top 3 eligible chapters as Track A/B's curriculum slices,
 * applying the protocol's relaxation order (a) -> (b) -> (c) only if
 * fewer than 3 chapters are eligible under the base rule.
 */
export function selectSlices(concepts: readonly Concept[], questions: readonly Question[]): SliceSelectionResult {
  const byId = buildPrereqIndex(concepts);
  const chapterIds = [...new Set(concepts.map((c) => c.chapterId).filter((id): id is string => Boolean(id)))].sort();

  const allStats = chapterIds.map((chapterId) => computeChapterStats(chapterId, concepts, questions, byId, MAX_HOPS));
  const itemCountsByChapter: Record<string, { tCount: number; xCount: number; qSliceSize: number }> = {};
  for (const stats of allStats) {
    itemCountsByChapter[stats.chapterId] = {
      tCount: stats.targetIds.length,
      xCount: stats.externalIds.length,
      qSliceSize: stats.qSliceSingleConceptOnly.length,
    };
  }

  function rank(eligible: ChapterStats[]): ChapterStats[] {
    return [...eligible].sort((a, b) => {
      const scoreDiff = b.edgesInside + b.edgesFromExternal - (a.edgesInside + a.edgesFromExternal);
      if (scoreDiff !== 0) return scoreDiff;
      return a.chapterId.localeCompare(b.chapterId);
    });
  }

  for (const relax of ["none", "a", "b", "c"] as const) {
    const eligible = allStats.filter((stats) => isEligible(stats, relax));
    if (eligible.length >= 3) {
      const top3 = rank(eligible).slice(0, 3);
      return {
        slices: top3.map((stats) => toCandidate(stats, relax)),
        relaxationApplied: relax,
        eligibleChapterCount: eligible.length,
        itemCountsByChapter,
      };
    }
  }

  // Fewer than 3 qualify even after every relaxation (C13 stop condition).
  const bestEffort = allStats.filter((stats) => isEligible(stats, "c"));
  return {
    slices: rank(bestEffort).map((stats) => toCandidate(stats, "c")),
    relaxationApplied: "c",
    eligibleChapterCount: bestEffort.length,
    itemCountsByChapter,
  };
}

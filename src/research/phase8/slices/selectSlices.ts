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
  targetIds: readonly string[];
  externalIds: string[];
  edgesInside: number;
  edgesFromExternal: number;
  targetsWithExternal: number;
  scTargets: Map<string, number>;
  scExternal: Map<string, number>;
  qSliceAllItems: Question[];
  qSliceSingleConceptOnly: Question[];
}

/**
 * Computes the full eligibility-relevant statistics for an ARBITRARY
 * target-concept set (not necessarily "every concept in a chapter") --
 * the shared core both the original whole-chapter rule and the
 * Amendment A1 concept-subgraph rule (selectConceptSubgraphSlices)
 * build on, so the eligibility/ranking/candidate logic is never
 * duplicated between them.
 */
function computeTargetSetStats(
  chapterId: string,
  targetIds: readonly string[],
  questions: readonly Question[],
  byId: ReadonlyMap<string, Concept>,
  maxHops: number,
): ChapterStats {
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
 *
 * Shared by the original whole-chapter rule (always scTargetThreshold=16,
 * scExternalThreshold=8) and Amendment A1's concept-subgraph rule (same
 * thresholds, always relax="none" -- the amendment preserves every
 * original numeric threshold, see protocol/AMENDMENTS.md).
 */
function evaluateEligibility(
  stats: ChapterStats,
  relax: RelaxationLevel,
  scTargetThreshold: number,
  scExternalThreshold: number,
): { pass: boolean; failedCriteria: string[] } {
  const level = RELAXATION_ORDER.indexOf(relax);
  const tSize = stats.targetIds.length;
  const xSize = stats.externalIds.length;
  const failedCriteria: string[] = [];

  const tRange = level >= 1 ? [4, 16] : [5, 12];
  if (tSize < tRange[0] || tSize > tRange[1]) failedCriteria.push(`|T_c|=${tSize} outside [${tRange[0]},${tRange[1]}]`);
  if (stats.edgesInside < 3) failedCriteria.push(`internal edges=${stats.edgesInside} < 3`);

  const required = level >= 2 ? 1 : Math.ceil(tSize / 2);
  if (level >= 2) {
    // relaxation (b): |X_c| >= 1 and at least one target with an external prerequisite.
    if (xSize < 1) failedCriteria.push(`|X_c|=${xSize} < 1`);
  } else {
    if (xSize < 2 || xSize > 10) failedCriteria.push(`|X_c|=${xSize} outside [2,10]`);
  }
  if (stats.targetsWithExternal < required) failedCriteria.push(`targetsWithExternal=${stats.targetsWithExternal} < ${required}`);

  const useAllItems = level >= 3;
  const qSlice = useAllItems ? stats.qSliceAllItems : stats.qSliceSingleConceptOnly;
  let minTargetCoverage = Infinity;
  for (const id of stats.targetIds) {
    const count = useAllItems ? qSlice.filter((q) => id in effectiveConceptWeights(q)).length : (stats.scTargets.get(id) ?? 0);
    minTargetCoverage = Math.min(minTargetCoverage, count);
  }
  if (minTargetCoverage < scTargetThreshold) failedCriteria.push(`minSC(target)=${minTargetCoverage} < ${scTargetThreshold}`);

  let minExternalCoverage = stats.externalIds.length ? Infinity : null;
  for (const id of stats.externalIds) {
    const count = useAllItems ? qSlice.filter((q) => id in effectiveConceptWeights(q)).length : (stats.scExternal.get(id) ?? 0);
    minExternalCoverage = Math.min(minExternalCoverage ?? Infinity, count);
  }
  if (minExternalCoverage !== null && minExternalCoverage < scExternalThreshold) {
    failedCriteria.push(`minSC(external)=${minExternalCoverage} < ${scExternalThreshold}`);
  }

  if (qSlice.length < 120) failedCriteria.push(`|Q_slice|=${qSlice.length} < 120`);

  return { pass: failedCriteria.length === 0, failedCriteria };
}

function isEligible(stats: ChapterStats, relax: RelaxationLevel, scTargetThreshold = 16, scExternalThreshold = 8): boolean {
  return evaluateEligibility(stats, relax, scTargetThreshold, scExternalThreshold).pass;
}

function eligibilityFailureReasons(stats: ChapterStats, relax: RelaxationLevel, scTargetThreshold = 16, scExternalThreshold = 8): string[] {
  return evaluateEligibility(stats, relax, scTargetThreshold, scExternalThreshold).failedCriteria;
}

function toCandidate(stats: ChapterStats, relax: RelaxationLevel): SliceCandidate {
  const singleConceptOnly = relax !== "c";
  return {
    chapterId: stats.chapterId,
    targetConceptIds: [...stats.targetIds],
    externalPrereqConceptIds: stats.externalIds,
    edgesInsideTargets: stats.edgesInside,
    edgesFromExternalIntoTargets: stats.edgesFromExternal,
    qSlice: singleConceptOnly ? stats.qSliceSingleConceptOnly : stats.qSliceAllItems,
    singleConceptOnly,
  };
}

const MAX_HOPS = 5;

/** Ranks candidate target sets by (internal edges + edges from external into targets), descending; ties broken by chapterId ascending -- the protocol's own tie-break rule, reused by both the whole-chapter and concept-subgraph selection procedures. */
function rankByEdgeScore(candidates: ChapterStats[]): ChapterStats[] {
  return [...candidates].sort((a, b) => {
    const scoreDiff = b.edgesInside + b.edgesFromExternal - (a.edgesInside + a.edgesFromExternal);
    if (scoreDiff !== 0) return scoreDiff;
    return a.chapterId.localeCompare(b.chapterId);
  });
}

/**
 * Selects the top 3 eligible chapters as Track A/B's curriculum slices,
 * applying the protocol's relaxation order (a) -> (b) -> (c) only if
 * fewer than 3 chapters are eligible under the base rule.
 */
export function selectSlices(concepts: readonly Concept[], questions: readonly Question[]): SliceSelectionResult {
  const byId = buildPrereqIndex(concepts);
  const chapterIds = [...new Set(concepts.map((c) => c.chapterId).filter((id): id is string => Boolean(id)))].sort();

  const allStats = chapterIds.map((chapterId) => {
    const targetIds = concepts.filter((c) => c.chapterId === chapterId).map((c) => c.id);
    return computeTargetSetStats(chapterId, targetIds, questions, byId, MAX_HOPS);
  });
  const itemCountsByChapter: Record<string, { tCount: number; xCount: number; qSliceSize: number }> = {};
  for (const stats of allStats) {
    itemCountsByChapter[stats.chapterId] = {
      tCount: stats.targetIds.length,
      xCount: stats.externalIds.length,
      qSliceSize: stats.qSliceSingleConceptOnly.length,
    };
  }

  for (const relax of ["none", "a", "b", "c"] as const) {
    const eligible = allStats.filter((stats) => isEligible(stats, relax));
    if (eligible.length >= 3) {
      const top3 = rankByEdgeScore(eligible).slice(0, 3);
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
    slices: rankByEdgeScore(bestEffort).map((stats) => toCandidate(stats, "c")),
    relaxationApplied: "c",
    eligibleChapterCount: bestEffort.length,
    itemCountsByChapter,
  };
}

// ---------------------------------------------------------------------------
// Amendment A1 (protocol/AMENDMENTS.md): concept-subgraph slice selection.
// Author-approved revision to C7.1/B5.1, replacing the whole-chapter rule
// above for Tier 1. See AMENDMENTS.md for the full rationale; summary: the
// real RISE bank/curriculum yields only 2 whole-chapter-eligible slices
// (CH03, CH04) even after every relaxation in C7.1, below the 3 Track A/B
// requires. Rather than relaxing any numeric threshold (SC(k) stays >= 16
// for targets, >= 8 for external prerequisites; |T_c|, internal-edge,
// |X_c|, and |Q_slice| requirements are all UNCHANGED from the original,
// non-relaxed rule), this procedure narrows a chapter's candidate target
// set to only its individually well-evidenced concepts before checking
// eligibility -- "T_c = a chapter's sufficiently-evidenced concepts"
// rather than "T_c = every concept in the chapter".
// ---------------------------------------------------------------------------

export interface ConceptSubgraphChapterDiagnostic {
  chapterId: string;
  fullChapterTargetIds: string[];
  retainedTargetIds: string[];
  droppedConceptIds: string[];
  eligible: boolean;
  failedCriteria: string[];
  edgesInsideTargets: number;
  edgesFromExternalIntoTargets: number;
}

export interface ConceptSubgraphSliceResult {
  primarySlices: SliceCandidate[];
  reserveSlice: SliceCandidate | null;
  eligibleChapterCount: number;
  /** Every chapter's outcome, eligible or not, for the audit trail (Amendment A1 point 5: "deterministic method ... based only on pre-experimental structural and coverage information"). */
  perChapterDiagnostics: ConceptSubgraphChapterDiagnostic[];
}

/**
 * Amendment A1's revised C7.1 procedure. For each chapter: drop any
 * target concept whose single-concept-item coverage SC(k) falls below
 * `scTargetThreshold` (default 16, UNCHANGED from the original
 * protocol), then evaluate the ORIGINAL, non-relaxed eligibility rule
 * (`|T_c|` in [5,12], >= 3 internal edges, `|X_c|` in [2,10], >=
 * ceil(|T_c|/2) targets with an external prerequisite, `SC(external)
 * >= scExternalThreshold` [default 8], `|Q_slice| >= 120`) against the
 * RETAINED subset. Eligible chapters are ranked by the protocol's own
 * tie-break rule (internal + external edges, descending; chapterId
 * ascending); the top 3 are the primary slices, the 4th (if any) is
 * the predefined reserve. Entirely deterministic: no randomness, no
 * estimator, selection policy, or simulation result is consulted.
 */
export function selectConceptSubgraphSlices(
  concepts: readonly Concept[],
  questions: readonly Question[],
  scTargetThreshold = 16,
  scExternalThreshold = 8,
): ConceptSubgraphSliceResult {
  const byId = buildPrereqIndex(concepts);
  const chapterIds = [...new Set(concepts.map((c) => c.chapterId).filter((id): id is string => Boolean(id)))].sort();

  const scCache = new Map<string, number>();
  function sc(conceptId: string): number {
    const cached = scCache.get(conceptId);
    if (cached !== undefined) return cached;
    const count = questions.filter((q) => isSingleConcept(q, conceptId)).length;
    scCache.set(conceptId, count);
    return count;
  }

  const perChapterDiagnostics: ConceptSubgraphChapterDiagnostic[] = [];
  const eligibleStats: ChapterStats[] = [];

  for (const chapterId of chapterIds) {
    const fullChapterTargetIds = concepts.filter((c) => c.chapterId === chapterId).map((c) => c.id);
    const retainedTargetIds = fullChapterTargetIds.filter((id) => sc(id) >= scTargetThreshold);
    const droppedConceptIds = fullChapterTargetIds.filter((id) => !retainedTargetIds.includes(id));

    if (retainedTargetIds.length === 0) {
      perChapterDiagnostics.push({
        chapterId, fullChapterTargetIds, retainedTargetIds, droppedConceptIds,
        eligible: false, failedCriteria: ["no concept in this chapter meets the coverage threshold"],
        edgesInsideTargets: 0, edgesFromExternalIntoTargets: 0,
      });
      continue;
    }

    const stats = computeTargetSetStats(chapterId, retainedTargetIds, questions, byId, MAX_HOPS);
    const eligible = isEligible(stats, "none", scTargetThreshold, scExternalThreshold);
    const failedCriteria = eligibilityFailureReasons(stats, "none", scTargetThreshold, scExternalThreshold);

    perChapterDiagnostics.push({
      chapterId, fullChapterTargetIds, retainedTargetIds, droppedConceptIds,
      eligible, failedCriteria,
      edgesInsideTargets: stats.edgesInside, edgesFromExternalIntoTargets: stats.edgesFromExternal,
    });

    if (eligible) eligibleStats.push(stats);
  }

  const ranked = rankByEdgeScore(eligibleStats);
  const primarySlices = ranked.slice(0, 3).map((stats) => toCandidate(stats, "none"));
  const reserveSlice = ranked.length > 3 ? toCandidate(ranked[3], "none") : null;

  return {
    primarySlices,
    reserveSlice,
    eligibleChapterCount: eligibleStats.length,
    perChapterDiagnostics,
  };
}

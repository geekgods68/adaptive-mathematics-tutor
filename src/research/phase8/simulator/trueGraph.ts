/**
 * C5/B3.3 S4, item 1 -- the true prerequisite graph G*, built once per
 * world (S4 cells share one G* via the shared `familyGroup: "S4"` key
 * space). The tutor always sees the curriculum graph G; it never sees
 * G*. G* is acyclic by construction: every edge in it respects a FIXED
 * topological order (curriculumLevel, conceptId), so no edge can ever
 * point from a later concept to an earlier one.
 */

import { uniformAt } from "@/research/phase8/rng/derive";
import type { ConceptId, SimIdentity } from "@/research/phase8/simulator/shared";

export interface CurriculumConcept {
  id: ConceptId;
  curriculumLevel: number;
  prerequisiteIds: readonly ConceptId[];
}

export interface TrueGraph {
  /** Edge set as "prereq->dependent" strings. */
  edges: ReadonlySet<string>;
  parentsOf: ReadonlyMap<ConceptId, readonly ConceptId[]>;
  /** Number of dropped curriculum edges for which no free replacement pair existed (G8's "shortfall"). */
  shortfallCount: number;
  topoOrder: readonly ConceptId[];
  orderIndex: ReadonlyMap<ConceptId, number>;
}

function edgeKey(i: ConceptId, j: ConceptId): string {
  return `${i}->${j}`;
}

export function buildTrueGraph(id: SimIdentity, concepts: readonly CurriculumConcept[], phi: number): TrueGraph {
  const topoOrder = [...concepts]
    .sort((a, b) => (a.curriculumLevel - b.curriculumLevel) || a.id.localeCompare(b.id))
    .map((c) => c.id);
  const orderIndex = new Map<ConceptId, number>(topoOrder.map((conceptId, i) => [conceptId, i]));
  const byId = new Map(concepts.map((c) => [c.id, c]));

  const curriculumEdges: Array<[ConceptId, ConceptId]> = [];
  for (const dependentId of topoOrder) {
    const dependent = byId.get(dependentId)!;
    const prereqs = [...dependent.prerequisiteIds].sort(
      (a, b) => (orderIndex.get(a) ?? 0) - (orderIndex.get(b) ?? 0),
    );
    for (const prereqId of prereqs) {
      curriculumEdges.push([prereqId, dependentId]);
    }
  }
  // Deterministic processing order: by (dependent's position, prerequisite's position).
  curriculumEdges.sort((a, b) => {
    const depDiff = (orderIndex.get(a[1]) ?? 0) - (orderIndex.get(b[1]) ?? 0);
    if (depDiff !== 0) return depDiff;
    return (orderIndex.get(a[0]) ?? 0) - (orderIndex.get(b[0]) ?? 0);
  });

  const edges = new Set<string>();
  let shortfallCount = 0;
  let addCounter = 0;

  for (const [i, j] of curriculumEdges) {
    const uKeep = uniformAt(id.masterSeed, {
      track: "-",
      familyGroup: "S4",
      world: id.world,
      slice: id.sliceId,
      split: "-",
      learner: "-",
      stream: "edgeKeep",
      concept: edgeKey(i, j),
      index: 0,
    });
    if (uKeep < phi) {
      edges.add(edgeKey(i, j));
      continue;
    }
    // Dropped: add one replacement edge (i', j'), i' before j', uniformly among pairs not yet in G*.
    const candidates: Array<[ConceptId, ConceptId]> = [];
    for (let a = 0; a < topoOrder.length; a++) {
      for (let b = a + 1; b < topoOrder.length; b++) {
        const candidateKey = edgeKey(topoOrder[a], topoOrder[b]);
        if (!edges.has(candidateKey)) candidates.push([topoOrder[a], topoOrder[b]]);
      }
    }
    if (candidates.length === 0) {
      shortfallCount += 1;
      continue;
    }
    const uAdd = uniformAt(id.masterSeed, {
      track: "-",
      familyGroup: "S4",
      world: id.world,
      slice: id.sliceId,
      split: "-",
      learner: "-",
      stream: "edgeAdd",
      concept: "-",
      index: addCounter++,
    });
    const chosenIndex = Math.min(candidates.length - 1, Math.floor(uAdd * candidates.length));
    const [ci, cj] = candidates[chosenIndex];
    edges.add(edgeKey(ci, cj));
  }

  const parentsOf = new Map<ConceptId, ConceptId[]>();
  for (const edgeStr of edges) {
    const [i, j] = edgeStr.split("->");
    const list = parentsOf.get(j) ?? [];
    list.push(i);
    parentsOf.set(j, list);
  }

  return { edges, parentsOf, shortfallCount, topoOrder, orderIndex };
}

export function isAcyclic(graph: TrueGraph): boolean {
  // By construction every edge i->j satisfies orderIndex(i) < orderIndex(j), so the graph is
  // acyclic iff that invariant holds for every edge actually present -- cheap to verify.
  for (const edgeStr of graph.edges) {
    const [i, j] = edgeStr.split("->");
    if ((graph.orderIndex.get(i) ?? -1) >= (graph.orderIndex.get(j) ?? -1)) return false;
  }
  return true;
}

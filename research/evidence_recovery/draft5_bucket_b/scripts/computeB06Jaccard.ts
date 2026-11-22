/**
 * B06: pure, static graph-structure comparison of G (curriculum prerequisite
 * graph, restricted to each pilot slice's target-concept set) vs G* (the
 * Phase 8 S4 simulator's true graph, built deterministically from the SAME
 * masterSeed/world/slice/phi already used by the historical pilots). This
 * is NOT a new simulation batch -- buildTrueGraph performs no learner
 * simulation, draws no learner-level randomness, and this script runs it
 * read-only against already-frozen config/slice data, purely to compute a
 * static graph comparison (node/edge counts, intersection/union/Jaccard)
 * that neither historical pilot report happened to print.
 */
import { RISE_CONCEPTS, RISE_QUESTIONS } from "@/domain/rise";
import { selectConceptSubgraphSlices } from "@/research/phase8/slices/selectSlices";
import { loadPhase8Config } from "@/research/phase8/config/load";
import { buildTrueGraph, type CurriculumConcept } from "@/research/phase8/simulator/trueGraph";

const cfg = loadPhase8Config();
const slices = selectConceptSubgraphSlices(RISE_CONCEPTS, RISE_QUESTIONS).primarySlices;
const cells = cfg.simulator.value.S4.cells;

const curriculumConcepts: CurriculumConcept[] = RISE_CONCEPTS.map((c) => ({
  id: c.id,
  curriculumLevel: c.curriculumLevel ?? 0,
  prerequisiteIds: c.prerequisiteIds,
}));

function gEdgesForSlice(targetConceptIds: readonly string[]): Set<string> {
  const targetSet = new Set(targetConceptIds);
  const byId = new Map(curriculumConcepts.map((c) => [c.id, c]));
  const edges = new Set<string>();
  for (const id of targetConceptIds) {
    const c = byId.get(id);
    if (!c) continue;
    for (const p of c.prerequisiteIds) {
      if (targetSet.has(p)) edges.add(`${p}->${id}`); // restrict G to edges INSIDE this slice's target set, matching what G* below is comparable against
    }
  }
  return edges;
}

console.log("cell, slice, world, |V_G|, |V_G*|, |E_G|, |E_G*|, intersection, union, precision, recall, jaccard, reversedEdges, shortfallCount");
for (const [cellName, cellParams] of Object.entries(cells)) {
  for (const slice of slices) {
    for (let world = 1; world <= 5; world++) {
      const graph = buildTrueGraph(
        { masterSeed: cfg.plan.value.masterSeed, family: "S4", cell: "dispatch", sliceId: slice.chapterId, world },
        curriculumConcepts,
        cellParams.phi,
      );
      const gEdges = gEdgesForSlice(slice.targetConceptIds);
      const gStarEdgesInSliceUniverse = new Set(
        [...graph.edges].filter((e) => {
          const [i, j] = e.split("->");
          return slice.targetConceptIds.includes(i) && slice.targetConceptIds.includes(j);
        }),
      );
      const intersection = [...gEdges].filter((e) => gStarEdgesInSliceUniverse.has(e)).length;
      const union = new Set([...gEdges, ...gStarEdgesInSliceUniverse]).size;
      const precision = gStarEdgesInSliceUniverse.size > 0 ? intersection / gStarEdgesInSliceUniverse.size : (gEdges.size === 0 ? 1 : 0);
      const recall = gEdges.size > 0 ? intersection / gEdges.size : (gStarEdgesInSliceUniverse.size === 0 ? 1 : 0);
      const jaccard = union > 0 ? intersection / union : 1;
      let reversed = 0;
      for (const e of gEdges) {
        const [i, j] = e.split("->");
        if (gStarEdgesInSliceUniverse.has(`${j}->${i}`)) reversed++;
      }
      console.log(
        `${cellName}, ${slice.chapterId}, ${world}, ${slice.targetConceptIds.length}, ${slice.targetConceptIds.length}, ${gEdges.size}, ${gStarEdgesInSliceUniverse.size}, ${intersection}, ${union}, ${precision.toFixed(4)}, ${recall.toFixed(4)}, ${jaccard.toFixed(4)}, ${reversed}, ${graph.shortfallCount}`,
      );
    }
  }
}

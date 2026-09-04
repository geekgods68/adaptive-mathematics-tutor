import type { Concept, ConceptStrand } from "@/domain/concepts/types";
import type { Misconception } from "@/domain/misconceptions/types";

/** All misconceptions that reference the given concept. */
export function getMisconceptionsForConcept(
  conceptId: string,
  misconceptions: Misconception[],
): Misconception[] {
  return misconceptions.filter((m) => m.conceptIds.includes(conceptId));
}

/** All concepts belonging to the given strand. */
export function getConceptsByStrand(strand: ConceptStrand, concepts: Concept[]): Concept[] {
  return concepts.filter((c) => c.strand === strand);
}

/** The direct prerequisites of a concept (not transitive). */
export function getPrerequisites(conceptId: string, concepts: Concept[]): Concept[] {
  const concept = concepts.find((c) => c.id === conceptId);
  if (!concept) return [];
  const prereqIds = new Set(concept.prerequisiteIds);
  return concepts.filter((c) => prereqIds.has(c.id));
}

/** All concepts that directly list `conceptId` as a prerequisite (not transitive). */
export function getDependents(conceptId: string, concepts: Concept[]): Concept[] {
  return concepts.filter((c) => c.prerequisiteIds.includes(conceptId));
}

import { RISE_CONCEPTS } from "@/domain/rise";
import { CHAPTER_TITLES } from "@/tutoring/adaptiveSession/curriculum";

/**
 * A read-only, lightweight view of the curriculum prerequisite graph for
 * the Student Workspace's Prerequisite Explorer (Part C4) and the
 * Dashboard's "potential prerequisite gaps" diagnostic (Part C1). Reads
 * RISE_CONCEPTS directly — never duplicates or modifies the graph — and
 * is intentionally separate from src/tutoring/selection/adaptive/, which
 * is the protected module that actually USES this graph to make
 * selection decisions; this file only lets the UI look at it.
 */
export interface ConceptNode {
  id: string;
  name: string;
  chapterId?: string;
  chapterTitle?: string;
  prerequisiteIds: string[];
}

function toNode(id: string, name: string, chapterId: string | undefined, prerequisiteIds: readonly string[]): ConceptNode {
  return { id, name, chapterId, chapterTitle: chapterId ? CHAPTER_TITLES[chapterId] : undefined, prerequisiteIds: [...prerequisiteIds] };
}

export function listAllConcepts(): ConceptNode[] {
  return RISE_CONCEPTS.map((c) => toNode(c.id, c.name, c.chapterId, c.prerequisiteIds)).sort((a, b) => a.name.localeCompare(b.name));
}

export function getConcept(conceptId: string): ConceptNode | undefined {
  const c = RISE_CONCEPTS.find((c) => c.id === conceptId);
  return c ? toNode(c.id, c.name, c.chapterId, c.prerequisiteIds) : undefined;
}

export function getPrerequisites(conceptId: string): ConceptNode[] {
  const concept = RISE_CONCEPTS.find((c) => c.id === conceptId);
  if (!concept) return [];
  return concept.prerequisiteIds.map((id) => getConcept(id)).filter((c): c is ConceptNode => Boolean(c));
}

/** Concepts that list `conceptId` as one of their own prerequisites — i.e. what depends on it. */
export function getDependents(conceptId: string): ConceptNode[] {
  return RISE_CONCEPTS.filter((c) => c.prerequisiteIds.includes(conceptId)).map((c) => toNode(c.id, c.name, c.chapterId, c.prerequisiteIds));
}

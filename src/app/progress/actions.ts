"use server";

import { getConcept, getDependents, getPrerequisites, listAllConcepts, type ConceptNode } from "@/tutoring/adaptiveSession/conceptGraph";
import { listAvailableChapters } from "@/tutoring/adaptiveSession/curriculum";
import type { ChapterOption } from "@/tutoring/adaptiveSession/curriculum";

export type { ConceptNode, ChapterOption };

export interface ConceptDetail {
  concept: ConceptNode;
  prerequisites: ConceptNode[];
  dependents: ConceptNode[];
}

/** All concepts and chapters, for the Prerequisite Explorer's concept picker (Part C4) and chapter grouping (Part C1). Read-only — never used to decide anything about selection or mastery. */
export async function listCurriculumAction(): Promise<{ concepts: ConceptNode[]; chapters: ChapterOption[] }> {
  return { concepts: listAllConcepts(), chapters: listAvailableChapters() };
}

export async function getConceptDetailAction(conceptId: string): Promise<ConceptDetail | null> {
  const concept = getConcept(conceptId);
  if (!concept) return null;
  return { concept, prerequisites: getPrerequisites(conceptId), dependents: getDependents(conceptId) };
}

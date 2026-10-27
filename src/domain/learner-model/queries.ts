import type { Concept } from "@/domain/concepts/types";
import type { ConceptMasteryState, MasteryUpdateTrace } from "@/domain/learner-model/types";

/**
 * Read-only interfaces for a FUTURE adaptive-selection engine (Phase 4)
 * to consult. Nothing here selects a question or makes a sequencing
 * decision — see docs/research-decisions.md RD-0003 for why that
 * separation is preserved strictly in this phase.
 */

/** Mastery for one concept, or `undefined` if the learner has no state for it yet (never observed). */
export function getMastery(
  states: Record<string, ConceptMasteryState>,
  conceptId: string,
): number | undefined {
  return states[conceptId]?.mastery;
}

/**
 * Mastery for every prerequisite of `conceptId`, per the concept graph's
 * DIRECT `prerequisiteIds` (not transitive — a caller wanting the full
 * transitive closure should walk the graph itself; this function only
 * reads state, it does not traverse beyond one hop, to keep its contract
 * simple and auditable).
 */
export function getPrerequisiteMastery(
  states: Record<string, ConceptMasteryState>,
  concepts: Concept[],
  conceptId: string,
): Record<string, number | undefined> {
  const concept = concepts.find((c) => c.id === conceptId);
  if (!concept) {
    throw new Error(`getPrerequisiteMastery: unknown conceptId "${conceptId}"`);
  }
  const result: Record<string, number | undefined> = {};
  for (const prereqId of concept.prerequisiteIds) {
    result[prereqId] = states[prereqId]?.mastery;
  }
  return result;
}

/**
 * Concepts (from the given list) with fewer than `minObservations`
 * recorded responses — including concepts with NO state at all (treated
 * as 0 observations). Useful for a future policy deciding whether an
 * estimate is reliable enough to act on.
 */
export function getConceptsWithInsufficientEvidence(
  states: Record<string, ConceptMasteryState>,
  conceptIds: string[],
  minObservations: number,
): string[] {
  return conceptIds.filter((id) => (states[id]?.numObservations ?? 0) < minObservations);
}

/** The full recent-evidence trail backing one concept's current estimate, oldest first. Empty array (not undefined) when the concept has no state yet. */
export function getEvidenceForConcept(
  states: Record<string, ConceptMasteryState>,
  conceptId: string,
): ConceptMasteryState["recentEvidence"] {
  return states[conceptId]?.recentEvidence ?? [];
}

/** Filters a trace list down to the ones for a specific concept, in the order given (callers should pass traces in chronological order to get a chronological result). */
export function getTracesForConcept(traces: MasteryUpdateTrace[], conceptId: string): MasteryUpdateTrace[] {
  return traces.filter((t) => t.conceptId === conceptId);
}

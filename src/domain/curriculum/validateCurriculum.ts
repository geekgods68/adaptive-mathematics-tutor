import type { Concept } from "@/domain/concepts/types";
import type { DifficultyLevel } from "@/domain/questions/types";
import type { DifficultyDescriptor } from "@/domain/curriculum/difficultyFramework";
import type { ConceptDifficultyGuidance } from "@/domain/curriculum/conceptDifficultyGuidance";

const ALL_DIFFICULTY_LEVELS: DifficultyLevel[] = [1, 2, 3, 4, 5];

/**
 * Detects cycles in the concept prerequisite graph via DFS with a
 * recursion-stack colouring (visiting/done). Returns the list of concept
 * ids forming a cycle (in cycle order, first id repeated at the end) for
 * each cycle found, or an empty array if the graph is acyclic.
 * Self-dependency (a concept listing itself as a prerequisite) is
 * reported as the 2-element cycle [id, id].
 */
export function findConceptGraphCycles(concepts: Concept[]): string[][] {
  const byId = new Map(concepts.map((c) => [c.id, c]));
  const state = new Map<string, "visiting" | "done">();
  const cycles: string[][] = [];

  function visit(id: string, path: string[]): void {
    const currentState = state.get(id);
    if (currentState === "done") return;
    if (currentState === "visiting") {
      const cycleStart = path.indexOf(id);
      cycles.push(path.slice(cycleStart).concat(id));
      return;
    }

    const concept = byId.get(id);
    if (!concept) return; // unknown prerequisite ids are reported by validateDomainModel, not here

    state.set(id, "visiting");
    for (const prereqId of concept.prerequisiteIds) {
      visit(prereqId, [...path, id]);
    }
    state.set(id, "done");
  }

  for (const concept of concepts) {
    visit(concept.id, []);
  }

  return cycles;
}

/**
 * Validates the difficulty framework itself: every level 1-5 must have
 * exactly one descriptor, and every descriptor must have non-empty text.
 */
export function validateDifficultyFramework(descriptors: DifficultyDescriptor[]): string[] {
  const errors: string[] = [];

  for (const level of ALL_DIFFICULTY_LEVELS) {
    const matching = descriptors.filter((d) => d.level === level);
    if (matching.length !== 1) {
      errors.push(`Difficulty level ${level} has ${matching.length} descriptor(s) (expected exactly 1)`);
    }
  }

  for (const descriptor of descriptors) {
    if (!descriptor.label.trim()) {
      errors.push(`Difficulty level ${descriptor.level} has an empty label`);
    }
    if (!descriptor.description.trim()) {
      errors.push(`Difficulty level ${descriptor.level} has an empty description`);
    }
    if (descriptor.characteristics.length === 0) {
      errors.push(`Difficulty level ${descriptor.level} has no characteristics listed`);
    }
  }

  return errors;
}

/**
 * Validates per-concept difficulty guidance: each entry must reference a
 * real concept, and its range must be a valid, ordered subset of 1-5.
 */
export function validateConceptDifficultyGuidance(
  guidance: ConceptDifficultyGuidance[],
  concepts: Concept[],
): string[] {
  const errors: string[] = [];
  const conceptIds = new Set(concepts.map((c) => c.id));

  for (const entry of guidance) {
    if (!conceptIds.has(entry.conceptId)) {
      errors.push(`Difficulty guidance references unknown conceptId "${entry.conceptId}"`);
      continue;
    }
    if (entry.minDifficulty < 1 || entry.minDifficulty > 5) {
      errors.push(`Difficulty guidance for "${entry.conceptId}" has out-of-range minDifficulty ${entry.minDifficulty}`);
    }
    if (entry.maxDifficulty < 1 || entry.maxDifficulty > 5) {
      errors.push(`Difficulty guidance for "${entry.conceptId}" has out-of-range maxDifficulty ${entry.maxDifficulty}`);
    }
    if (entry.minDifficulty > entry.maxDifficulty) {
      errors.push(
        `Difficulty guidance for "${entry.conceptId}" has minDifficulty ${entry.minDifficulty} greater than maxDifficulty ${entry.maxDifficulty}`,
      );
    }
  }

  return errors;
}

/**
 * Validates the recommended curriculum order: every concept appears
 * exactly once, and every concept's prerequisites appear earlier in the
 * order than the concept itself.
 */
export function validateCurriculumOrder(order: string[], concepts: Concept[]): string[] {
  const errors: string[] = [];
  const conceptIds = new Set(concepts.map((c) => c.id));

  const seen = new Set<string>();
  for (const id of order) {
    if (!conceptIds.has(id)) {
      errors.push(`Curriculum order references unknown conceptId "${id}"`);
    }
    if (seen.has(id)) {
      errors.push(`Curriculum order lists "${id}" more than once`);
    }
    seen.add(id);
  }

  for (const concept of concepts) {
    if (!seen.has(concept.id)) {
      errors.push(`Curriculum order is missing concept "${concept.id}"`);
    }
  }

  const positionOf = new Map(order.map((id, index) => [id, index]));
  for (const concept of concepts) {
    const conceptPosition = positionOf.get(concept.id);
    if (conceptPosition === undefined) continue;

    for (const prereqId of concept.prerequisiteIds) {
      const prereqPosition = positionOf.get(prereqId);
      if (prereqPosition === undefined) continue; // reported above / by validateDomainModel
      if (prereqPosition >= conceptPosition) {
        errors.push(
          `Curriculum order places "${concept.id}" at or before its prerequisite "${prereqId}"`,
        );
      }
    }
  }

  return errors;
}

/**
 * A grouping of concepts into a curricular area. Used for organisation,
 * documentation, and coverage reporting — not for gating which concepts a
 * question may reference.
 */
export type ConceptStrand =
  | "algebra_foundations"
  | "factorisation"
  | "solving"
  | "discriminant"
  | "roots_coefficients"
  | "graphs"
  | "transformations"
  | "intersections"
  | "reasoning";

/**
 * A node in the quadratics concept graph. `prerequisiteIds` supports
 * curriculum ordering and is validated for referential integrity,
 * self-dependency, duplicates, and cycles — see
 * src/domain/validateDomainModel.ts and src/domain/curriculum/validateCurriculum.ts.
 */
export type Concept = {
  id: string;
  name: string;
  description: string;
  prerequisiteIds: string[];
  strand: ConceptStrand;
  /** What a student who has mastered this concept can do. Optional: not every concept needs one to be useful. */
  learningObjective?: string;
};

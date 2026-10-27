/**
 * A grouping of concepts into a curricular area. Used for organisation,
 * documentation, and coverage reporting — not for gating which concepts a
 * question may reference.
 *
 * The first 9 values are the original quadratics-only curriculum (Phase
 * 0-3, `src/domain/concepts/data.ts`'s `CONCEPTS`). The 14 `ch0X_*` values
 * were added when the imported RISE question bank
 * (`src/domain/rise/`, 109 concepts across a much broader curriculum) was
 * integrated — see `docs/research-decisions.md`'s RISE-integration entry.
 * The two concept sets are kept in separate arrays (`CONCEPTS` vs
 * `RISE_CONCEPTS`), not merged, specifically so this extension could be
 * purely additive: nothing iterates this union exhaustively, so adding
 * members does not risk breaking existing switch/exhaustiveness logic.
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
  | "reasoning"
  | "ch01_algebra"
  | "ch02_functions"
  | "ch03_exponents"
  | "ch04_logarithms"
  | "ch05_differentiation"
  | "ch06_integration"
  | "ch07_geometry"
  | "ch08_trigonometry"
  | "ch09_vectors"
  | "ch10_probability"
  | "ch11_statistics"
  | "ch12_proofs_and_logic"
  | "ch13_permutations_and_combinations"
  | "ch14_complex_numbers";

/**
 * A node in a concept prerequisite graph. `prerequisiteIds` supports
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

  /**
   * RISE-import-only fields (see src/domain/rise/). Absent on the original
   * 9-strand quadratics concepts. `chapterId` is "CH01".."CH14";
   * `curriculumLevel` is 1 (foundation secondary) to 4 (advanced
   * pre-university), independent of any question's `difficulty`.
   */
  chapterId?: string;
  curriculumLevel?: number;
};

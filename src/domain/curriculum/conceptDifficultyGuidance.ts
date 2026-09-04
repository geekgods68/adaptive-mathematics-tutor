import type { DifficultyLevel } from "@/domain/questions/types";

/**
 * Guidance for Phase 2: which difficulty levels are appropriate for
 * questions primarily assessing a given concept. This is guidance, not a
 * hard constraint enforced on Question — a concept's inherent complexity
 * bounds how hard (or easy) a question about it can reasonably be. Not
 * every concept supports the full 1-5 range; forcing one that doesn't
 * (e.g. "collecting like terms" at Difficulty 5) would not produce a
 * meaningful question.
 */
export type ConceptDifficultyGuidance = {
  conceptId: string;
  minDifficulty: DifficultyLevel;
  maxDifficulty: DifficultyLevel;
};

export const CONCEPT_DIFFICULTY_GUIDANCE: ConceptDifficultyGuidance[] = [
  { conceptId: "concept-recognising-quadratic-expressions", minDifficulty: 1, maxDifficulty: 2 },
  { conceptId: "concept-collecting-like-terms", minDifficulty: 1, maxDifficulty: 1 },
  { conceptId: "concept-standard-form", minDifficulty: 1, maxDifficulty: 2 },
  { conceptId: "concept-algebraic-rearrangement", minDifficulty: 1, maxDifficulty: 3 },
  { conceptId: "concept-expanding-two-binomials", minDifficulty: 1, maxDifficulty: 3 },

  { conceptId: "concept-factorising-common-factor", minDifficulty: 1, maxDifficulty: 2 },
  { conceptId: "concept-factorising-monic-quadratics", minDifficulty: 1, maxDifficulty: 3 },
  { conceptId: "concept-factorising-non-monic-quadratics", minDifficulty: 2, maxDifficulty: 4 },
  { conceptId: "concept-difference-of-two-squares", minDifficulty: 1, maxDifficulty: 3 },
  { conceptId: "concept-recognising-non-factorisable", minDifficulty: 2, maxDifficulty: 4 },
  { conceptId: "concept-factorisation-roots-link", minDifficulty: 1, maxDifficulty: 2 },

  { conceptId: "concept-identifying-abc", minDifficulty: 1, maxDifficulty: 2 },
  { conceptId: "concept-zero-product-principle", minDifficulty: 1, maxDifficulty: 2 },
  { conceptId: "concept-solving-by-factorisation", minDifficulty: 1, maxDifficulty: 3 },
  { conceptId: "concept-rearranging-to-standard-form-to-solve", minDifficulty: 2, maxDifficulty: 4 },
  { conceptId: "concept-completing-the-square", minDifficulty: 2, maxDifficulty: 4 },
  { conceptId: "concept-solving-by-completing-the-square", minDifficulty: 2, maxDifficulty: 4 },
  { conceptId: "concept-quadratic-formula", minDifficulty: 2, maxDifficulty: 4 },
  { conceptId: "concept-interpreting-plus-minus", minDifficulty: 2, maxDifficulty: 3 },

  { conceptId: "concept-computing-discriminant", minDifficulty: 1, maxDifficulty: 2 },
  { conceptId: "concept-discriminant-nature-of-roots", minDifficulty: 2, maxDifficulty: 3 },
  { conceptId: "concept-discriminant-reverse-reasoning", minDifficulty: 3, maxDifficulty: 4 },
  { conceptId: "concept-discriminant-parameter-reasoning", minDifficulty: 4, maxDifficulty: 5 },

  { conceptId: "concept-sum-and-product-of-roots", minDifficulty: 2, maxDifficulty: 3 },
  { conceptId: "concept-constructing-quadratic-from-roots", minDifficulty: 3, maxDifficulty: 4 },
  { conceptId: "concept-roots-coefficients-parameter-reasoning", minDifficulty: 4, maxDifficulty: 5 },

  { conceptId: "concept-parabola-shape-and-key-features", minDifficulty: 1, maxDifficulty: 2 },
  { conceptId: "concept-roots-as-x-intercepts", minDifficulty: 2, maxDifficulty: 3 },
  { conceptId: "concept-vertex-and-axis-of-symmetry", minDifficulty: 2, maxDifficulty: 4 },
  { conceptId: "concept-graphical-nature-of-roots", minDifficulty: 3, maxDifficulty: 4 },

  { conceptId: "concept-vertex-form", minDifficulty: 2, maxDifficulty: 3 },
  { conceptId: "concept-graph-transformations", minDifficulty: 3, maxDifficulty: 4 },

  { conceptId: "concept-line-parabola-intersections", minDifficulty: 3, maxDifficulty: 5 },
  { conceptId: "concept-modelling-with-quadratics", minDifficulty: 3, maxDifficulty: 5 },

  { conceptId: "concept-integrated-quadratic-reasoning", minDifficulty: 4, maxDifficulty: 5 },
];

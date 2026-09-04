/**
 * The recommended broad teaching progression through the concept
 * taxonomy — distinct from the prerequisite graph (src/domain/concepts/data.ts).
 * A prerequisite graph says what CAN come before what; this says what a
 * reasonable teaching sequence actually does, given that graph. It is a
 * total order consistent with the graph (every concept's prerequisites
 * appear earlier in this list — validated in
 * src/domain/curriculum/validateCurriculum.ts), not the graph itself.
 *
 * This is NOT the non-adaptive question-presentation sequence — see
 * src/tutoring/selection/nonAdaptive/curriculumSequence.ts for that. This
 * orders concepts; that orders individual seed questions.
 */
export const RECOMMENDED_CURRICULUM_ORDER: string[] = [
  // Foundations
  "concept-recognising-quadratic-expressions",
  "concept-collecting-like-terms",
  "concept-standard-form",
  "concept-algebraic-rearrangement",
  "concept-expanding-two-binomials",

  // Factorisation
  "concept-factorising-common-factor",
  "concept-factorising-monic-quadratics",
  "concept-factorising-non-monic-quadratics",
  "concept-difference-of-two-squares",
  "concept-recognising-non-factorisable",
  "concept-factorisation-roots-link",

  // Solving
  "concept-identifying-abc",
  "concept-zero-product-principle",
  "concept-solving-by-factorisation",
  "concept-rearranging-to-standard-form-to-solve",
  "concept-completing-the-square",
  "concept-solving-by-completing-the-square",
  "concept-quadratic-formula",
  "concept-interpreting-plus-minus",

  // Discriminant
  "concept-computing-discriminant",
  "concept-discriminant-nature-of-roots",
  "concept-discriminant-reverse-reasoning",

  // Roots and coefficients
  "concept-sum-and-product-of-roots",
  "concept-constructing-quadratic-from-roots",
  "concept-roots-coefficients-parameter-reasoning",
  "concept-discriminant-parameter-reasoning",

  // Graphs
  "concept-parabola-shape-and-key-features",
  "concept-roots-as-x-intercepts",
  "concept-vertex-and-axis-of-symmetry",
  "concept-graphical-nature-of-roots",

  // Transformations
  "concept-vertex-form",
  "concept-graph-transformations",

  // Intersections and modelling
  "concept-line-parabola-intersections",
  "concept-modelling-with-quadratics",

  // Integrated reasoning
  "concept-integrated-quadratic-reasoning",
];

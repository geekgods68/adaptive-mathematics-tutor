/**
 * PROVISIONAL — Phase 3 input, not a finished study design.
 *
 * A candidate fixed-order sequence for a single non-adaptive tutoring
 * session, drawn from the full production question bank
 * (src/domain/questions/index.ts, 161 questions). This is NOT the tiny
 * 5-question NON_ADAPTIVE_CURRICULUM_SEQUENCE (src/tutoring/selection/nonAdaptive/curriculumSequence.ts),
 * which remains the Phase 0 architecture-validation demo — this is a
 * separate, much larger candidate for the actual study session.
 *
 * Design: one representative question per concept (35 concepts, 35
 * questions), in RECOMMENDED_CURRICULUM_ORDER
 * (src/domain/curriculum/curriculumOrder.ts), each chosen at a difficulty
 * appropriate to a first pass through that concept — mostly Difficulty
 * 1-2 for foundational/routine concepts, rising to 3-4 for the more
 * advanced discriminant/roots-coefficients/graph/reasoning concepts, with
 * no Difficulty 5 items (reserved for later phases/conditions). Like
 * NON_ADAPTIVE_CURRICULUM_SEQUENCE, this is a fixed order — every
 * participant assigned it sees the same sequence, independent of their
 * performance. See docs/experimental-conditions.md.
 *
 * Whether 35 questions is the right session length, whether this exact
 * question selection is the right one, and how it should be
 * experimentally randomised (if at all) are research-design decisions for
 * whoever runs Phase 3 — this is a starting candidate, not a decision.
 */
export const CANDIDATE_NON_ADAPTIVE_SEQUENCE: string[] = [
  // algebra_foundations
  "q-recognise-quadratic-001",
  "q-collect-terms-001",
  "q-standard-form-001",
  "q-rearrange-001",
  "q-expand-001",

  // factorisation
  "q-factor-common-001",
  "q-factor-monic-001",
  "q-factor-nonmonic-001",
  "q-diff-squares-001",
  "q-non-factorisable-001",
  "q-factor-roots-link-001",

  // solving
  "q-identify-abc-001",
  "q-zero-product-001",
  "q-solve-factorisation-01",
  "q-rearrange-solve-001",
  "q-complete-square-002",
  "q-solve-complete-square-003",
  "q-quadratic-formula-01",
  "q-plus-minus-001",

  // discriminant
  "q-discriminant-compute-001",
  "q-discriminant-nature-01",
  "q-discriminant-reverse-001",

  // roots_coefficients
  "q-root-sum-product-001",
  "q-construct-from-roots-004",
  "q-root-coeff-parameter-002",
  "q-discriminant-parameter-001",

  // graphs
  "q-parabola-shape-002",
  "q-roots-x-intercepts-001",
  "q-vertex-axis-001",
  "q-graph-nature-roots-001",

  // transformations
  "q-vertex-form-001",
  "q-graph-transform-001",

  // intersections
  "q-line-parabola-001",
  "q-modelling-001",

  // reasoning
  "q-integrated-007",
];

/**
 * FINAL — the fixed sequence used by the completed non-adaptive tutor
 * (Phase 3), superseding the Phase 2 `CANDIDATE_NON_ADAPTIVE_SEQUENCE` as
 * the sequence actually wired into the session service. That candidate
 * (one question per concept, no Level 5, lower-difficulty skew) was a
 * curriculum-coverage sanity check, not a deliberate study design; this
 * sequence is the deliberate one — see docs/non-adaptive-sequence.md for
 * full rationale, strand/difficulty tables, and the performance-
 * independence argument.
 *
 * 35 questions, every one drawn from the production bank
 * (src/domain/questions/index.ts). Difficulty distribution:
 * L1=5, L2=9, L3=10, L4=7, L5=4 (target ranges from the Phase 3 brief:
 * L1 4-5, L2 8-9, L3 10-11, L4 7-8, L5 3-4 — all met). Spans all 9
 * strands, weighted toward factorisation/solving/discriminant (the
 * strands with the richest misconception coverage), rising in difficulty
 * overall while varying naturally within that rise (not sorted into
 * flat L1/L2/.../L5 blocks). High-frequency misconceptions
 * (FACTOR_SIGN_ERROR, B2_PLUS_4AC, PLUS_MINUS_DROPPED) each get multiple
 * independent opportunities across different questions.
 *
 * Like NON_ADAPTIVE_CURRICULUM_SEQUENCE and CANDIDATE_NON_ADAPTIVE_SEQUENCE,
 * this is a fixed order — every participant sees the same sequence,
 * regardless of performance. See docs/experimental-conditions.md.
 */
export const NON_ADAPTIVE_STUDY_SEQUENCE: string[] = [
  // algebra_foundations (3)
  "q-recognise-quadratic-001", // L1
  "q-standard-form-002", // L2
  "q-expand-002", // L2

  // factorisation (6)
  "q-factor-common-001", // L1
  "q-factor-monic-001", // L1
  "q-factorise-identify-01", // L2
  "q-factor-nonmonic-002", // L3
  "q-diff-squares-003", // L2
  "q-factor-monic-007", // L3

  // solving (8)
  "q-identify-abc-001", // L1
  "q-zero-product-003", // L2
  "q-solve-factorisation-01", // L2
  "q-solve-factorisation-005", // L3
  "q-complete-square-001", // L3
  "q-solve-complete-square-001", // L3
  "q-quadratic-formula-01", // L3
  "q-quadratic-formula-005", // L4

  // discriminant (5)
  "q-discriminant-compute-001", // L1
  "q-discriminant-nature-01", // L4
  "q-discriminant-nature-004", // L3
  "q-discriminant-reverse-001", // L3
  "q-discriminant-parameter-002", // L5

  // roots_coefficients (3)
  "q-root-sum-product-001", // L2
  "q-construct-from-roots-003", // L4
  "q-root-coeff-parameter-001", // L5

  // graphs (4)
  "q-parabola-shape-002", // L2
  "q-roots-x-intercepts-002", // L3
  "q-vertex-axis-003", // L4
  "q-graph-nature-roots-003", // L4

  // transformations (2)
  "q-vertex-form-001", // L2
  "q-graph-transform-004", // L4

  // intersections (2)
  "q-line-parabola-001", // L3
  "q-modelling-004", // L5

  // reasoning (2)
  "q-integrated-004", // L5
  "q-integrated-007", // L4
];

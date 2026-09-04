# Question Bank Coverage

Both tables below are generated directly from the production bank (see
the generation approach in `docs/question-bank.md`'s "Keep documentation
generated from source" note) — if they ever look stale, re-derive them
from `QUESTIONS`, `CONCEPTS`, and `MISCONCEPTIONS` rather than hand-editing.
Run `npm run audit:questions` for the always-current live version of the
summary numbers.

## Concept coverage

Question count, the difficulty range actually used by this bank's
questions for that concept, and the `CONCEPT_DIFFICULTY_GUIDANCE` range
it's validated against.

| Concept | Strand | Questions | Difficulty range used | Guidance range |
| --- | --- | ---: | --- | --- |
| Recognising Quadratic Expressions | algebra_foundations | 2 | 1-2 | 1-2 |
| Collecting Like Terms | algebra_foundations | 2 | 1 | 1-1 |
| Standard Form | algebra_foundations | 2 | 1-2 | 1-2 |
| Algebraic Rearrangement | algebra_foundations | 2 | 3 | 1-3 |
| Expanding Two Binomials | algebra_foundations | 6 | 1-3 | 1-3 |
| Factorising by Common Factor | factorisation | 3 | 1-2 | 1-2 |
| Factorising Monic Quadratics | factorisation | 9 | 1-3 | 1-3 |
| Factorising Non-Monic Quadratics | factorisation | 6 | 2-4 | 2-4 |
| Difference of Two Squares | factorisation | 5 | 1-3 | 1-3 |
| Recognising Non-Factorisable Expressions | factorisation | 2 | 2-3 | 2-4 |
| Linking Factorisation to Roots | factorisation | 2 | 1-2 | 1-2 |
| Identifying a, b, and c | solving | 4 | 1-3 | 1-3 |
| The Zero-Product Principle | solving | 3 | 1-2 | 1-2 |
| Solving Quadratic Equations by Factorisation | solving | 6 | 1-4 | 1-4 |
| Rearranging Into Standard Form Before Solving | solving | 3 | 2-4 | 2-4 |
| Completing the Square | solving | 5 | 2-4 | 2-4 |
| Solving by Completing the Square | solving | 4 | 2-4 | 2-4 |
| The Quadratic Formula | solving | 5 | 2-4 | 2-4 |
| Correct Interpretation of ± | solving | 3 | 2-3 | 2-3 |
| Computing the Discriminant | discriminant | 5 | 1-2 | 1-2 |
| Nature of Roots From the Discriminant | discriminant | 6 | 2-4 | 2-4 |
| Reasoning Backwards From the Discriminant | discriminant | 5 | 3-4 | 3-4 |
| Parameter Reasoning via the Discriminant | discriminant | 4 | 4-5 | 4-5 |
| Sum and Product of Roots | roots_coefficients | 6 | 2-3 | 2-3 |
| Constructing a Quadratic From Given Roots | roots_coefficients | 4 | 2-4 | 2-4 |
| Parameter Reasoning via Roots and Coefficients | roots_coefficients | 4 | 4-5 | 4-5 |
| Parabola Shape and Key Features | graphs | 5 | 1-2 | 1-2 |
| Roots as x-Intercepts | graphs | 5 | 2-3 | 2-3 |
| Vertex and Axis of Symmetry | graphs | 7 | 2-4 | 2-4 |
| Graphical Interpretation of the Nature of Roots | graphs | 4 | 3-4 | 3-4 |
| Vertex Form | transformations | 5 | 2-3 | 2-3 |
| Graph Transformations | transformations | 7 | 3-4 | 3-4 |
| Line-Parabola Intersections | intersections | 5 | 3-5 | 3-5 |
| Modelling With Quadratics | intersections | 5 | 3-5 | 3-5 |
| Integrated Quadratic Reasoning | reasoning | 10 | 4-5 | 4-5 |

## Misconception coverage

Distractor count (how many options across the whole bank carry this
`misconceptionId`), how many concepts the taxonomy entry itself is
associated with, and which questions use it.

| Misconception | Distractor count | Concepts | Questions |
| --- | ---: | --- | --- |
| SIGN_ERROR_TRANSPOSE | 8 | 2 | q-rearrange-001, q-rearrange-002, q-identify-abc-004, q-rearrange-solve-001, q-rearrange-solve-003, q-line-parabola-005, q-integrated-005 |
| NEGATIVE_COEFFICIENT_MISHANDLED | 2 | 2 | q-identify-abc-001, q-identify-abc-003 |
| NEGATIVE_SQUARE_ERROR | 1 | 2 | q-expand-005 |
| DISTRIBUTION_ERROR | 10 | 1 | q-expand-brackets-01, q-rearrange-002, q-expand-001, q-expand-002, q-expand-003, q-expand-004 |
| FOIL_TERM_OMITTED | 4 | 1 | q-expand-brackets-01, q-expand-001, q-expand-002, q-expand-004 |
| SQUARE_OF_BINOMIAL_ERROR | 2 | 2 | q-expand-003, q-expand-005 |
| FACTOR_SUM_PRODUCT_CONFUSION | 17 | 2 | q-factorise-identify-01, q-factor-monic-001, q-factor-monic-002, q-factor-monic-003, q-factor-monic-004, q-factor-monic-005, q-factor-monic-006, q-factor-monic-007, q-factor-nonmonic-002, q-factor-nonmonic-003, q-factor-nonmonic-004, q-factor-nonmonic-005, q-factor-nonmonic-006, q-diff-squares-001, q-diff-squares-002, q-solve-factorisation-01, q-discriminant-nature-01 |
| FACTOR_SIGN_ERROR | 33 | 3 | q-factorise-identify-01, q-factor-monic-001, q-factor-monic-002, q-factor-monic-003, q-factor-monic-004, q-factor-monic-005, q-factor-monic-006, q-factor-monic-007, q-factor-monic-008, q-factor-nonmonic-001, q-factor-nonmonic-002, q-factor-nonmonic-003, q-factor-nonmonic-004, q-factor-nonmonic-005, q-factor-nonmonic-006, q-factor-roots-link-002, q-solve-factorisation-01, q-solve-factorisation-002, q-solve-factorisation-003, q-solve-factorisation-004, q-solve-factorisation-005, q-solve-factorisation-006, q-rearrange-solve-002, q-discriminant-parameter-002, q-roots-x-intercepts-002, q-roots-x-intercepts-003, q-roots-x-intercepts-004, q-line-parabola-001, q-line-parabola-002, q-line-parabola-003, q-line-parabola-004, q-modelling-001 |
| LEADING_COEFFICIENT_IGNORED | 4 | 1 | q-factor-monic-008, q-factor-nonmonic-001, q-diff-squares-003, q-diff-squares-004 |
| DIFFERENCE_OF_SQUARES_MISAPPLIED | 1 | 2 | q-diff-squares-005 |
| ZERO_PRODUCT_NOT_APPLIED | 4 | 2 | q-zero-product-001, q-zero-product-002, q-solve-factorisation-006, q-rearrange-solve-002 |
| CONSTANT_TREATED_AS_ROOT | 3 | 1 | q-solve-factorisation-01, q-solve-factorisation-003, q-solve-factorisation-004 |
| ONLY_ONE_FACTOR_SOLVED | 8 | 2 | q-zero-product-001, q-zero-product-002, q-solve-factorisation-002, q-solve-factorisation-005, q-rearrange-solve-001, q-rearrange-solve-003, q-line-parabola-004, q-integrated-009 |
| HALF_B_NOT_SQUARED | 5 | 1 | q-complete-square-001, q-complete-square-004, q-complete-square-005, q-solve-complete-square-001, q-vertex-form-003 |
| HALF_B_SIGN_ERROR | 9 | 1 | q-complete-square-001, q-complete-square-002, q-complete-square-003, q-complete-square-004, q-complete-square-005, q-solve-complete-square-002, q-plus-minus-002, q-vertex-form-003, q-vertex-form-004 |
| BALANCING_TERM_NOT_SUBTRACTED | 4 | 1 | q-complete-square-001, q-complete-square-002, q-complete-square-003, q-vertex-form-004 |
| NEGATIVE_B_DROPPED | 4 | 1 | q-quadratic-formula-01, q-quadratic-formula-002, q-quadratic-formula-003, q-quadratic-formula-004 |
| PLUS_MINUS_DROPPED | 10 | 3 | q-solve-complete-square-001, q-solve-complete-square-002, q-solve-complete-square-003, q-solve-complete-square-004, q-quadratic-formula-002, q-quadratic-formula-005, q-plus-minus-001, q-plus-minus-002, q-plus-minus-003, q-discriminant-parameter-001 |
| DENOMINATOR_ONLY_APPLIED_TO_RADICAL | 1 | 1 | q-quadratic-formula-004 |
| FORMULA_COEFFICIENT_SUBSTITUTION_ERROR | 1 | 2 | q-quadratic-formula-005 |
| B_SQUARED_AS_2B | 5 | 1 | q-discriminant-compute-001, q-discriminant-compute-002, q-discriminant-compute-003, q-discriminant-compute-004, q-discriminant-compute-005 |
| B2_PLUS_4AC | 18 | 1 | q-quadratic-formula-01, q-quadratic-formula-003, q-discriminant-compute-001, q-discriminant-compute-002, q-discriminant-compute-003, q-discriminant-compute-004, q-discriminant-compute-005, q-discriminant-nature-01, q-discriminant-nature-004, q-discriminant-nature-006, q-discriminant-reverse-001, q-discriminant-reverse-002, q-discriminant-reverse-005, q-discriminant-parameter-003, q-discriminant-parameter-004, q-graph-nature-roots-003, q-graph-nature-roots-004, q-integrated-005 |
| ROOT_COUNT_INTERPRETATION_REVERSED | 2 | 1 | q-discriminant-nature-003, q-graph-nature-roots-002 |
| ZERO_DISCRIMINANT_TWO_DISTINCT_ROOTS | 4 | 1 | q-zero-product-003, q-discriminant-nature-002, q-discriminant-nature-005, q-integrated-006 |
| ROOT_SUM_SIGN_ERROR | 12 | 1 | q-root-sum-product-001, q-root-sum-product-003, q-root-sum-product-005, q-root-sum-product-006, q-construct-from-roots-001, q-construct-from-roots-002, q-construct-from-roots-003, q-construct-from-roots-004, q-root-coeff-parameter-004, q-roots-x-intercepts-005, q-integrated-001, q-integrated-007 |
| ROOT_PRODUCT_SIGN_ERROR | 4 | 1 | q-root-sum-product-002, q-root-sum-product-004, q-roots-x-intercepts-005, q-integrated-003 |
| ROOT_COEFFICIENT_CONFUSION | 10 | 2 | q-root-sum-product-001, q-root-sum-product-002, q-root-sum-product-005, q-root-sum-product-006, q-construct-from-roots-001, q-construct-from-roots-002, q-construct-from-roots-003, q-construct-from-roots-004, q-root-coeff-parameter-001, q-integrated-007 |
| VERTEX_X_COORDINATE_SIGN_ERROR | 7 | 1 | q-vertex-axis-001, q-vertex-axis-002, q-vertex-axis-003, q-vertex-axis-004, q-vertex-axis-005, q-vertex-axis-006, q-integrated-010 |
| ROOTS_CONFUSED_WITH_Y_INTERCEPT | 4 | 2 | q-roots-x-intercepts-001, q-roots-x-intercepts-002, q-roots-x-intercepts-003, q-roots-x-intercepts-004 |
| AXIS_OF_SYMMETRY_CONFUSED_WITH_ROOT | 1 | 2 | q-vertex-axis-007 |
| PARABOLA_DIRECTION_ERROR | 3 | 1 | q-parabola-shape-001, q-parabola-shape-003, q-parabola-shape-004 |
| HORIZONTAL_TRANSLATION_DIRECTION_ERROR | 9 | 2 | q-vertex-form-001, q-vertex-form-002, q-vertex-form-005, q-graph-transform-001, q-graph-transform-003, q-graph-transform-004, q-graph-transform-006, q-integrated-002, q-integrated-008 |
| VERTICAL_TRANSLATION_SIGN_ERROR | 4 | 2 | q-graph-transform-002, q-graph-transform-003, q-graph-transform-005, q-graph-transform-007 |
| STRETCH_TRANSLATION_CONFUSION | 2 | 1 | q-graph-transform-004, q-graph-transform-005 |
| EXTRANEOUS_SOLUTION_NOT_REJECTED | 3 | 1 | q-modelling-002, q-modelling-003, q-modelling-005 |

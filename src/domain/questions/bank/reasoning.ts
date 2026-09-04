import type { Question } from "@/domain/questions/types";

/**
 * reasoning strand — integrated quadratic reasoning: multi-step problems
 * combining graphical, algebraic, and parameter-based information from
 * across several other strands, choosing an efficient method. The
 * capstone of the curriculum (see docs/curriculum.md); every item here is
 * Difficulty 4 or 5.
 */
export const REASONING_QUESTIONS: Question[] = [
  {
    id: "q-integrated-001",
    stem: "A quadratic has roots x = 2 and x = −5, and its graph passes through (0, −20). Find its equation in the form y = ax² + bx + c.",
    conceptIds: ["concept-integrated-quadratic-reasoning", "concept-constructing-quadratic-from-roots"],
    primaryConceptId: "concept-integrated-quadratic-reasoning",
    difficulty: 5,
    correctOptionId: "q-integrated-001-o1",
    options: [
      { id: "q-integrated-001-o1", display: "y = 2x² + 6x − 20", isCorrect: true },
      {
        id: "q-integrated-001-o2",
        display: "y = x² + 3x − 10",
        isCorrect: false,
        derivationNote: "Builds the monic equation x² − (sum)x + (product) = x² + 3x − 10 directly from the roots, but ignores the given point (0, −20), which requires an additional scale factor a = 2.",
      },
      {
        id: "q-integrated-001-o3",
        display: "y = 2x² − 6x − 20",
        isCorrect: false,
        misconceptionId: "ROOT_SUM_SIGN_ERROR",
        derivationNote: "Builds the scaled equation using +sum instead of −sum for the middle term, before applying the scale factor.",
      },
    ],
    workedSolution:
      "Roots 2 and −5 give y = a(x − 2)(x + 5) for some a. At (0, −20): −20 = a(−2)(5) = −10a, so a = 2.\ny = 2(x − 2)(x + 5) = 2(x² + 3x − 10) = 2x² + 6x − 20.",
    explanation: "Two roots alone only fix the equation up to a scale factor — use the extra point to pin down a.",
    version: 1,
  },
  {
    id: "q-integrated-002",
    stem: "A parabola has vertex (3, −4) and passes through (5, 4). Find its equation in the form y = a(x − h)² + k.",
    conceptIds: ["concept-integrated-quadratic-reasoning", "concept-vertex-form"],
    primaryConceptId: "concept-integrated-quadratic-reasoning",
    difficulty: 5,
    correctOptionId: "q-integrated-002-o1",
    options: [
      { id: "q-integrated-002-o1", display: "y = 2(x − 3)² − 4", isCorrect: true },
      {
        id: "q-integrated-002-o2",
        display: "y = (x − 3)² − 4",
        isCorrect: false,
        derivationNote: "Uses the vertex (3, −4) to write the form correctly but never uses the point (5, 4) to solve for a, defaulting to a = 1.",
      },
      {
        id: "q-integrated-002-o3",
        display: "y = (1/8)(x + 3)² − 4",
        isCorrect: false,
        misconceptionId: "HORIZONTAL_TRANSLATION_DIRECTION_ERROR",
        derivationNote: "Reads the vertex's x-coordinate with the wrong sign, using h = −3 instead of h = 3, which then changes the value of a needed to fit the second point.",
      },
    ],
    workedSolution:
      "Vertex form: y = a(x − 3)² − 4. Substitute (5, 4): 4 = a(5 − 3)² − 4 = 4a − 4, so 4a = 8, a = 2.\ny = 2(x − 3)² − 4.",
    explanation: "The vertex fixes h and k; a second point is needed to solve for a.",
    version: 1,
  },
  {
    id: "q-integrated-003",
    stem: "A quadratic equation has two distinct real roots whose product is negative. What can you conclude about the sign of c/a?",
    conceptIds: ["concept-integrated-quadratic-reasoning", "concept-sum-and-product-of-roots"],
    primaryConceptId: "concept-integrated-quadratic-reasoning",
    difficulty: 4,
    correctOptionId: "q-integrated-003-o1",
    options: [
      { id: "q-integrated-003-o1", display: "c/a is negative (a and c have opposite signs)", isCorrect: true },
      {
        id: "q-integrated-003-o2",
        display: "c/a is positive (a and c have the same sign)",
        isCorrect: false,
        misconceptionId: "ROOT_PRODUCT_SIGN_ERROR",
        derivationNote: "Applies the product-of-roots formula with the wrong sign, treating c/a as −(product) instead of (product).",
      },
      { id: "q-integrated-003-o3", display: "b/a is negative", isCorrect: false, derivationNote: "Confuses the sum-of-roots coefficient (b/a) with the product-of-roots coefficient (c/a), which is what the question is actually about." },
    ],
    workedSolution: "The product of the roots is c/a. If this product is negative, then c/a < 0, meaning a and c have opposite signs.",
    explanation: "Reasoning from a stated property of the roots back to the coefficients uses Vieta's formulas in reverse.",
    version: 1,
  },
  {
    id: "q-integrated-004",
    stem: "For x² + kx + 9 = 0, both roots are real, distinct, and negative. Find the range of possible values of k.",
    conceptIds: ["concept-integrated-quadratic-reasoning", "concept-discriminant-parameter-reasoning", "concept-sum-and-product-of-roots"],
    primaryConceptId: "concept-integrated-quadratic-reasoning",
    difficulty: 5,
    correctOptionId: "q-integrated-004-o1",
    options: [
      { id: "q-integrated-004-o1", display: "k > 6", isCorrect: true },
      {
        id: "q-integrated-004-o2",
        display: "k > 6 or k < −6",
        isCorrect: false,
        derivationNote: "Uses only the discriminant condition (two distinct real roots) and forgets to also require the sum of roots to be negative, which rules out k < −6 (that range gives two distinct positive roots instead).",
      },
      { id: "q-integrated-004-o3", display: "k < −6", isCorrect: false, derivationNote: "Uses the correct discriminant boundary but picks the wrong branch for the 'both negative' condition." },
    ],
    workedSolution:
      "Two distinct real roots: discriminant = k² − 36 > 0, so k > 6 or k < −6.\nBoth roots negative requires their sum to be negative: −k < 0, so k > 0.\nCombining both conditions: k > 6.",
    explanation: "Each stated property of the roots contributes one condition on k — combine all of them, not just the most obvious one (the discriminant).",
    version: 1,
  },
  {
    id: "q-integrated-005",
    stem: "A line y = 2x + k is tangent to the parabola y = x² − 4x + 7. Find k.",
    conceptIds: ["concept-integrated-quadratic-reasoning", "concept-line-parabola-intersections", "concept-discriminant-nature-of-roots"],
    primaryConceptId: "concept-integrated-quadratic-reasoning",
    difficulty: 5,
    correctOptionId: "q-integrated-005-o1",
    options: [
      { id: "q-integrated-005-o1", display: "k = −2", isCorrect: true },
      {
        id: "q-integrated-005-o2",
        display: "k = 16",
        isCorrect: false,
        misconceptionId: "B2_PLUS_4AC",
        derivationNote: "Sets the discriminant condition as 36 + 4(7 − k) = 0 instead of 36 − 4(7 − k) = 0.",
      },
      {
        id: "q-integrated-005-o3",
        display: "k = 2",
        isCorrect: false,
        misconceptionId: "SIGN_ERROR_TRANSPOSE",
        derivationNote: "Rearranges x² − 4x + 7 = 2x + k as x² − 6x + (7 + k) = 0 instead of x² − 6x + (7 − k) = 0, forgetting to flip the sign of k when moving it across.",
      },
    ],
    workedSolution:
      "Set x² − 4x + 7 = 2x + k, so x² − 6x + (7 − k) = 0.\nTangency means discriminant = 0: 36 − 4(7 − k) = 0, so 8 + 4k = 0, giving k = −2.",
    explanation: "'Tangent' translates to exactly one intersection point, i.e. discriminant = 0 for the combined equation.",
    version: 1,
  },
  {
    id: "q-integrated-006",
    stem: "The graph of y = ax² + bx + c has its vertex on the x-axis and opens upward. What must be true about the discriminant and the sign of a?",
    conceptIds: ["concept-integrated-quadratic-reasoning", "concept-graphical-nature-of-roots"],
    primaryConceptId: "concept-integrated-quadratic-reasoning",
    difficulty: 4,
    correctOptionId: "q-integrated-006-o1",
    options: [
      { id: "q-integrated-006-o1", display: "Discriminant = 0 and a > 0", isCorrect: true },
      {
        id: "q-integrated-006-o2",
        display: "Discriminant > 0 and a > 0",
        isCorrect: false,
        misconceptionId: "ZERO_DISCRIMINANT_TWO_DISTINCT_ROOTS",
        derivationNote: "Treats 'vertex touching the x-axis' (a repeated root, discriminant = 0) as if it meant two distinct roots (discriminant > 0).",
      },
      { id: "q-integrated-006-o3", display: "Discriminant = 0 and a < 0", isCorrect: false, derivationNote: "Gets the discriminant condition right but reverses which sign of a corresponds to opening upward." },
    ],
    workedSolution: "A vertex exactly on the x-axis means the parabola touches (but doesn't cross) the x-axis: a repeated root, so discriminant = 0. Opening upward requires a > 0.",
    explanation: "Combine two independent facts about the graph — where the vertex is, and which way it opens — into two separate conditions.",
    version: 1,
  },
  {
    id: "q-integrated-007",
    stem: "A quadratic function f(x) = x² + bx + c satisfies f(2) = 0 and f(−3) = 0. Find b and c.",
    conceptIds: ["concept-integrated-quadratic-reasoning", "concept-sum-and-product-of-roots"],
    primaryConceptId: "concept-integrated-quadratic-reasoning",
    difficulty: 4,
    correctOptionId: "q-integrated-007-o1",
    options: [
      { id: "q-integrated-007-o1", display: "b = 1, c = −6", isCorrect: true },
      {
        id: "q-integrated-007-o2",
        display: "b = −1, c = −6",
        isCorrect: false,
        misconceptionId: "ROOT_SUM_SIGN_ERROR",
        derivationNote: "Uses the sum of the roots directly as b (−1), instead of negating it (b = −(sum) = 1).",
      },
      {
        id: "q-integrated-007-o3",
        display: "b = −6, c = 1",
        isCorrect: false,
        misconceptionId: "ROOT_COEFFICIENT_CONFUSION",
        derivationNote: "Swaps the roles of the sum and product formulas when assigning b and c.",
      },
    ],
    workedSolution:
      "f(2) = 0 and f(−3) = 0 mean 2 and −3 are roots. Sum = 2 + (−3) = −1 = −b, so b = 1. Product = 2×(−3) = −6 = c.",
    explanation: "f(r) = 0 is exactly the statement that r is a root — recognise this before reaching for the sum/product formulas.",
    version: 1,
  },
  {
    id: "q-integrated-008",
    stem: "The parabola y = 2(x − 1)² + 3 is reflected in the x-axis, then translated 4 units left. What is the new equation?",
    conceptIds: ["concept-integrated-quadratic-reasoning", "concept-graph-transformations"],
    primaryConceptId: "concept-integrated-quadratic-reasoning",
    difficulty: 5,
    correctOptionId: "q-integrated-008-o1",
    options: [
      { id: "q-integrated-008-o1", display: "y = −2(x + 3)² − 3", isCorrect: true },
      {
        id: "q-integrated-008-o2",
        display: "y = −2(x + 3)² + 3",
        isCorrect: false,
        derivationNote: "Reflects the leading coefficient (2 → −2) but forgets that reflecting in the x-axis also flips the sign of the vertical shift (+3 → −3).",
      },
      {
        id: "q-integrated-008-o3",
        display: "y = −2(x − 5)² − 3",
        isCorrect: false,
        misconceptionId: "HORIZONTAL_TRANSLATION_DIRECTION_ERROR",
        derivationNote: "Translates 4 units right instead of left, subtracting 4 from h instead of adding it.",
      },
    ],
    workedSolution:
      "Reflecting y = 2(x − 1)² + 3 in the x-axis negates the entire expression: y = −2(x − 1)² − 3.\nTranslating 4 units left replaces x with (x + 4): y = −2((x + 4) − 1)² − 3 = −2(x + 3)² − 3.",
    explanation: "Apply one transformation fully before applying the next — reflecting in the x-axis affects every term, not just the leading coefficient.",
    version: 1,
  },
  {
    id: "q-integrated-009",
    stem: "The parabolas y = x² − 4x + 3 and y = −x² + 2x + 3 intersect at how many points, and where?",
    conceptIds: ["concept-integrated-quadratic-reasoning", "concept-line-parabola-intersections"],
    primaryConceptId: "concept-integrated-quadratic-reasoning",
    difficulty: 5,
    correctOptionId: "q-integrated-009-o1",
    options: [
      { id: "q-integrated-009-o1", display: "Two points: (0, 3) and (3, 0)", isCorrect: true },
      {
        id: "q-integrated-009-o2",
        display: "Two points: (0, 3) and (6, 15)",
        isCorrect: false,
        derivationNote: "Combines the two x² terms incorrectly when rearranging, writing x² − 6x = 0 instead of 2x² − 6x = 0, and so loses the factor of 2 needed for the second root.",
      },
      {
        id: "q-integrated-009-o3",
        display: "One point: (0, 3)",
        isCorrect: false,
        misconceptionId: "ONLY_ONE_FACTOR_SOLVED",
        derivationNote: "Solves one factor of 2x(x − 3) = 0 for x = 0, but never solves the second factor for x = 3.",
      },
    ],
    workedSolution:
      "Set x² − 4x + 3 = −x² + 2x + 3, so 2x² − 6x = 0, i.e. 2x(x − 3) = 0, giving x = 0 or x = 3.\nAt x = 0, y = 3. At x = 3, y = 0.",
    explanation: "Setting two quadratics equal to each other can still leave a quadratic (or, as here, effectively linear after cancellation) — combine like terms carefully.",
    version: 1,
  },
  {
    id: "q-integrated-010",
    stem: "A quadratic y = ax² + bx + c has a repeated root at x = 5, and a = 2. Find b and c.",
    conceptIds: ["concept-integrated-quadratic-reasoning", "concept-vertex-and-axis-of-symmetry"],
    primaryConceptId: "concept-integrated-quadratic-reasoning",
    difficulty: 4,
    correctOptionId: "q-integrated-010-o1",
    options: [
      { id: "q-integrated-010-o1", display: "b = −20, c = 50", isCorrect: true },
      {
        id: "q-integrated-010-o2",
        display: "b = 20, c = 50",
        isCorrect: false,
        misconceptionId: "VERTEX_X_COORDINATE_SIGN_ERROR",
        derivationNote: "Builds b from the repeated root using the wrong sign, computing b = 2ax = 20 instead of b = −2ax = −20.",
      },
      { id: "q-integrated-010-o3", display: "b = −10, c = 25", isCorrect: false, derivationNote: "Expands (x − 5)² = x² − 10x + 25 correctly but forgets to multiply through by the leading coefficient a = 2." },
    ],
    workedSolution: "A repeated root at x = 5 means y = a(x − 5)². With a = 2: y = 2(x − 5)² = 2x² − 20x + 50. So b = −20, c = 50.",
    explanation: "A repeated root fully determines the factorised form up to the leading coefficient, which is given here.",
    version: 1,
  },
];

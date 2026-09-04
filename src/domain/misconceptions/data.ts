import type { Misconception } from "@/domain/misconceptions/types";

/**
 * The Grade 9-10 quadratics misconception taxonomy: 35 entries covering
 * signs/rearrangement, expansion, factorisation, the zero-product
 * principle, completing the square, the quadratic formula, the
 * discriminant, roots/coefficients, graphs, and transformations. See
 * docs/misconception-taxonomy.md for the full write-up of each entry.
 *
 * A `misconceptionId` on a distractor is evidence consistent with that
 * misconception, not proof of a persistent misconception — see
 * docs/misconception-taxonomy.md, "Evidence vs. persistent misconception".
 */
export const MISCONCEPTIONS: Misconception[] = [
  // --- signs and rearrangement ---
  {
    id: "SIGN_ERROR_TRANSPOSE",
    label: "Sign error while transposing a term",
    description: "Moves a term across the equals sign without flipping its sign.",
    conceptIds: ["concept-algebraic-rearrangement", "concept-rearranging-to-standard-form-to-solve"],
    errorPattern: "Transposes a term without negating it.",
    exampleIncorrectReasoning:
      "From x² + 3x = 5, writes the standard form as x² + 3x + 5 = 0 instead of x² + 3x − 5 = 0.",
  },
  {
    id: "NEGATIVE_COEFFICIENT_MISHANDLED",
    label: "Drops the sign of a negative coefficient",
    description: "Mishandles a negative coefficient when identifying a, b, c or substituting into a formula.",
    conceptIds: ["concept-identifying-abc", "concept-quadratic-formula"],
    errorPattern: "Reads off a coefficient's magnitude but drops its negative sign.",
    exampleIncorrectReasoning: "For x² − 5x − 6 = 0, states b = 5 instead of b = −5.",
  },
  {
    id: "NEGATIVE_SQUARE_ERROR",
    label: "Squares a negative value with the wrong sign",
    description: "Treats (−n)² as −n² instead of +n².",
    conceptIds: ["concept-expanding-two-binomials", "concept-completing-the-square"],
    errorPattern: "Carries a negative sign through a squaring operation instead of it cancelling.",
    exampleIncorrectReasoning: "Within expanding (x − 3)², computes (−3)² as −9 instead of 9.",
  },

  // --- expansion ---
  {
    id: "DISTRIBUTION_ERROR",
    label: "General error expanding brackets",
    description:
      "While expanding two brackets, drops, mis-signs, or mis-combines one of the terms, without a more specific pattern applying.",
    conceptIds: ["concept-expanding-two-binomials"],
    errorPattern: "One term of the expansion is dropped, mis-signed, or mis-combined with another.",
    exampleIncorrectReasoning: "Expands (x + 3)(x − 4) as x² − 7x − 12, combining the coefficients 4 and 3 by addition instead of computing −4x + 3x.",
  },
  {
    id: "FOIL_TERM_OMITTED",
    label: "Omits a term when expanding two binomials",
    description: "Omits one of the four terms (typically a cross term) produced when expanding two binomials.",
    conceptIds: ["concept-expanding-two-binomials"],
    errorPattern: "Multiplies only the first and last terms of each bracket, skipping both cross terms.",
    exampleIncorrectReasoning: "Expands (x + 3)(x − 4) as x² − 12, omitting the −4x and 3x cross terms entirely.",
  },
  {
    id: "SQUARE_OF_BINOMIAL_ERROR",
    label: "Treats (a + b)² as a² + b²",
    description: "Squares a binomial by squaring each term separately, omitting the cross term 2ab.",
    conceptIds: ["concept-expanding-two-binomials", "concept-completing-the-square"],
    errorPattern: "Applies '(a+b)² = a² + b²' rather than expanding fully.",
    exampleIncorrectReasoning: "Computes (x + 3)² as x² + 9 instead of x² + 6x + 9.",
  },

  // --- factorisation ---
  {
    id: "FACTOR_SUM_PRODUCT_CONFUSION",
    label: "Confuses the sum and product conditions",
    description:
      "When choosing a factor pair for x² + bx + c, searches for two numbers satisfying the wrong combination of sum and product (or a pair that satisfies neither correctly).",
    conceptIds: ["concept-factorising-monic-quadratics", "concept-factorising-non-monic-quadratics"],
    errorPattern: "Selects a factor pair without correctly checking both the required sum and the required product.",
    exampleIncorrectReasoning:
      "For x² + 7x + 12, searches for two numbers that sum to 12 and multiply to 7, instead of two numbers that multiply to 12 and sum to 7.",
  },
  {
    id: "FACTOR_SIGN_ERROR",
    label: "Wrong sign assigned to a factor or root",
    description:
      "Finds the correct factor magnitudes but assigns the wrong sign to one factor, or copies a factor's internal sign directly as a root's sign instead of negating it.",
    conceptIds: ["concept-factorising-monic-quadratics", "concept-factorising-non-monic-quadratics", "concept-solving-by-factorisation"],
    errorPattern: "The magnitude is right; the sign of a factor, or of the root derived from it, is wrong.",
    exampleIncorrectReasoning:
      "Factorises x² + 2x − 15 as (x − 5)(x + 3) instead of (x + 5)(x − 3); or, having correctly reached (x − 2)(x − 3) = 0, gives the roots as x = −2 and x = −3 instead of x = 2 and x = 3.",
  },
  {
    id: "LEADING_COEFFICIENT_IGNORED",
    label: "Ignores the leading coefficient when factorising",
    description: "Factorises ax² + bx + c as though a = 1, ignoring the leading coefficient's effect on the factor pair.",
    conceptIds: ["concept-factorising-non-monic-quadratics"],
    errorPattern: "Uses only b and c to find a factor pair, never incorporating a.",
    exampleIncorrectReasoning:
      "For 2x² + 7x + 6, treats it as x² + 7x + 6, finds the factor pair 1 and 6 (sum 7, product 6), and writes (x + 1)(x + 6) — which expands to x² + 7x + 6, not 2x² + 7x + 6.",
  },
  {
    id: "DIFFERENCE_OF_SQUARES_MISAPPLIED",
    label: "Applies the difference-of-squares pattern where it doesn't apply",
    description: "Factorises an expression as a difference of two squares when it is not a difference of two squares (e.g. it is a sum).",
    conceptIds: ["concept-difference-of-two-squares", "concept-recognising-non-factorisable"],
    errorPattern: "Pattern-matches on 'two squared terms' without checking that they are subtracted.",
    exampleIncorrectReasoning: "Factorises x² + 9 as (x + 3)(x − 3), which expands to x² − 9, not x² + 9.",
  },

  // --- zero-product principle ---
  {
    id: "ZERO_PRODUCT_NOT_APPLIED",
    label: "Does not apply the zero-product principle",
    description: "Having reached a factorised equation equal to zero, does not set each factor to zero and solve separately.",
    conceptIds: ["concept-zero-product-principle", "concept-solving-by-factorisation"],
    errorPattern: "Manipulates the factorised equation as an ordinary algebraic expression rather than applying the zero-product principle.",
    exampleIncorrectReasoning: "From (x − 2)(x − 3) = 0, adds the two factors' constants together to get a single answer.",
  },
  {
    id: "CONSTANT_TREATED_AS_ROOT",
    label: "Treats the constant term as a root",
    description: "Treats the constant term of the original (unfactorised) equation as if it were itself a root.",
    conceptIds: ["concept-solving-by-factorisation"],
    errorPattern: "Reads the constant term c directly off ax² + bx + c = 0 and reports x = −c (or x = c) as the answer.",
    exampleIncorrectReasoning: "For x² − 5x + 6 = 0, answers x = −6, reading the constant term directly as the root instead of factorising.",
  },
  {
    id: "ONLY_ONE_FACTOR_SOLVED",
    label: "Solves only one factor",
    description: "Sets only one of the two factors to zero and reports a single root, never solving the second factor.",
    conceptIds: ["concept-zero-product-principle", "concept-solving-by-factorisation"],
    errorPattern: "Stops after solving the first factor = 0, without also solving the second.",
    exampleIncorrectReasoning: "From (x − 2)(x − 3) = 0, solves x − 2 = 0 to get x = 2, and reports only x = 2.",
  },

  // --- completing the square ---
  {
    id: "HALF_B_NOT_SQUARED",
    label: "Uses b/2 instead of (b/2)² when completing the square",
    description: "Adds or subtracts b/2 instead of (b/2)² when completing the square.",
    conceptIds: ["concept-completing-the-square"],
    errorPattern: "Uses the half-coefficient itself as the balancing term instead of squaring it.",
    exampleIncorrectReasoning: "For x² + 6x + 1, writes (x + 3)² + 1 − 3 instead of (x + 3)² + 1 − 9.",
  },
  {
    id: "HALF_B_SIGN_ERROR",
    label: "Wrong sign inside the completed-square bracket",
    description: "Uses the wrong sign for the constant inside the completed-square bracket.",
    conceptIds: ["concept-completing-the-square"],
    errorPattern: "Writes (x + b/2)² regardless of the sign of b.",
    exampleIncorrectReasoning: "For x² − 6x + 1, writes (x + 3)² instead of (x − 3)² when completing the square.",
  },
  {
    id: "BALANCING_TERM_NOT_SUBTRACTED",
    label: "Adds the balancing term inside without subtracting it outside",
    description: "Adds (b/2)² inside the bracket but forgets to subtract the equivalent amount outside it, changing the expression's value.",
    conceptIds: ["concept-completing-the-square"],
    errorPattern: "Adds (b/2)² to complete the square but never compensates for the amount added.",
    exampleIncorrectReasoning: "For x² + 6x + 1, writes (x + 3)² + 1 instead of (x + 3)² + 1 − 9 = (x + 3)² − 8.",
  },

  // --- quadratic formula ---
  {
    id: "NEGATIVE_B_DROPPED",
    label: "Substitutes +b instead of −b",
    description: "Substitutes +b instead of −b into the numerator of the quadratic formula.",
    conceptIds: ["concept-quadratic-formula"],
    errorPattern: "Uses (b ± √(b²−4ac)) / 2a instead of (−b ± √(b²−4ac)) / 2a.",
    exampleIncorrectReasoning: "For x² + 4x − 1 = 0 (b = 4), computes x = (4 ± √20) / 2 instead of x = (−4 ± √20) / 2.",
  },
  {
    id: "PLUS_MINUS_DROPPED",
    label: "Drops one branch of ±",
    description: "Interprets ± as producing a single value rather than two possible values, and reports only one root.",
    conceptIds: ["concept-quadratic-formula", "concept-interpreting-plus-minus", "concept-solving-by-completing-the-square"],
    errorPattern: "Keeps only the positive (or only the negative) branch of a ± expression.",
    exampleIncorrectReasoning: "From x = −2 ± √5, records only x = −2 + √5.",
  },
  {
    id: "DENOMINATOR_ONLY_APPLIED_TO_RADICAL",
    label: "Divides only the square root by 2a",
    description: "Divides only the √(b²−4ac) term by 2a, not the whole numerator (−b ± √(b²−4ac)).",
    conceptIds: ["concept-quadratic-formula"],
    errorPattern: "Treats 2a as the denominator of the radical only, not of the full numerator.",
    exampleIncorrectReasoning: "Computes x = −4 ± (√20 / 2) instead of x = (−4 ± √20) / 2.",
  },
  {
    id: "FORMULA_COEFFICIENT_SUBSTITUTION_ERROR",
    label: "Substitutes a, b, c into the wrong position",
    description: "Substitutes a, b, or c into the wrong position in the quadratic formula.",
    conceptIds: ["concept-quadratic-formula", "concept-identifying-abc"],
    errorPattern: "Swaps two of a, b, c when substituting into the formula.",
    exampleIncorrectReasoning: "For 2x² + 3x − 2 = 0, substitutes a = 3 and b = 2 (swapping a and b) instead of a = 2, b = 3.",
  },

  // --- discriminant ---
  {
    id: "B_SQUARED_AS_2B",
    label: "Computes b² as 2b",
    description: "Computes b² as 2 × b instead of b × b.",
    conceptIds: ["concept-computing-discriminant"],
    errorPattern: "Confuses squaring with doubling.",
    exampleIncorrectReasoning: "For b = −4, computes b² as −8 instead of 16.",
  },
  {
    id: "B2_PLUS_4AC",
    label: "Computes the discriminant as b² + 4ac",
    description: "Computes the discriminant as b² + 4ac instead of the correct b² − 4ac.",
    conceptIds: ["concept-computing-discriminant"],
    errorPattern: "Uses + instead of − before the 4ac term.",
    exampleIncorrectReasoning: "For a = 2, b = −4, c = 5, computes 16 + 40 = 56 instead of 16 − 40 = −24.",
  },
  {
    id: "ROOT_COUNT_INTERPRETATION_REVERSED",
    label: "Reverses the discriminant-sign-to-root-count rule",
    description: "Reverses the association between the sign of the discriminant and the number of real roots.",
    conceptIds: ["concept-discriminant-nature-of-roots"],
    errorPattern: "Associates a negative discriminant with real roots and a positive discriminant with no real roots.",
    exampleIncorrectReasoning: "States that a discriminant of −24 means the equation has two real roots.",
  },
  {
    id: "ZERO_DISCRIMINANT_TWO_DISTINCT_ROOTS",
    label: "Believes a zero discriminant gives two distinct roots",
    description: "Believes a discriminant of exactly zero gives two distinct real roots rather than one repeated root.",
    conceptIds: ["concept-discriminant-nature-of-roots"],
    errorPattern: "Treats discriminant = 0 the same as discriminant > 0.",
    exampleIncorrectReasoning: "For x² − 6x + 9 = 0 (discriminant = 0), states 'two distinct real roots' instead of 'one repeated root, x = 3'.",
  },

  // --- roots and coefficients ---
  {
    id: "ROOT_SUM_SIGN_ERROR",
    label: "Computes the sum of roots with the wrong sign",
    description: "Computes the sum of the roots as +b/a instead of −b/a.",
    conceptIds: ["concept-sum-and-product-of-roots"],
    errorPattern: "Omits the negative sign in the sum-of-roots formula −b/a.",
    exampleIncorrectReasoning: "For x² + 5x + 6 = 0, states the sum of the roots is 5 instead of −5.",
  },
  {
    id: "ROOT_PRODUCT_SIGN_ERROR",
    label: "Computes the product of roots with the wrong sign",
    description: "Computes the product of the roots as −c/a instead of c/a.",
    conceptIds: ["concept-sum-and-product-of-roots"],
    errorPattern: "Introduces a spurious negative sign in the product-of-roots formula c/a.",
    exampleIncorrectReasoning: "For x² + 5x + 6 = 0, states the product of the roots is −6 instead of 6.",
  },
  {
    id: "ROOT_COEFFICIENT_CONFUSION",
    label: "Confuses which coefficient relates to sum vs. product",
    description: "Confuses which coefficient relates to the sum of the roots and which relates to the product.",
    conceptIds: ["concept-sum-and-product-of-roots", "concept-constructing-quadratic-from-roots"],
    errorPattern: "Uses the sum of the roots where the product is needed in the formula x² − (sum)x + (product), or vice versa.",
    exampleIncorrectReasoning:
      "To construct a quadratic with roots 2 and 3 (sum 5, product 6), writes x² − 6x + 5 instead of x² − 5x + 6.",
  },

  // --- graphs ---
  {
    id: "VERTEX_X_COORDINATE_SIGN_ERROR",
    label: "Computes the vertex x-coordinate with the wrong sign",
    description: "Computes the x-coordinate of the vertex as b/2a instead of −b/2a.",
    conceptIds: ["concept-vertex-and-axis-of-symmetry"],
    errorPattern: "Omits the negative sign in the vertex formula x = −b/2a.",
    exampleIncorrectReasoning: "For y = x² − 4x + 1, states the axis of symmetry is x = −2 (computing −4/2 without negating b) instead of x = 2.",
  },
  {
    id: "ROOTS_CONFUSED_WITH_Y_INTERCEPT",
    label: "Confuses a root with the y-intercept",
    description: "Reads the y-intercept off the equation and treats its value as if it were a root, or vice versa.",
    conceptIds: ["concept-parabola-shape-and-key-features", "concept-roots-as-x-intercepts"],
    errorPattern: "Uses the constant term c as a root instead of as the y-intercept.",
    exampleIncorrectReasoning: "For y = x² − 5x + 6, states 'x = 6 is a root' by reading off the y-intercept, instead of solving to find the roots x = 2 and x = 3.",
  },
  {
    id: "AXIS_OF_SYMMETRY_CONFUSED_WITH_ROOT",
    label: "Confuses a root with the axis of symmetry",
    description: "Treats one of the roots as if it were the axis of symmetry, instead of their midpoint.",
    conceptIds: ["concept-vertex-and-axis-of-symmetry", "concept-roots-as-x-intercepts"],
    errorPattern: "Reports one root's x-value as the axis of symmetry instead of averaging both roots.",
    exampleIncorrectReasoning: "For roots x = 2 and x = 6, states the axis of symmetry is x = 2 instead of the midpoint x = 4.",
  },
  {
    id: "PARABOLA_DIRECTION_ERROR",
    label: "Confuses the sign of a with the opening direction",
    description: "States the parabola opens downward when a > 0 (or upward when a < 0).",
    conceptIds: ["concept-parabola-shape-and-key-features"],
    errorPattern: "Associates a positive leading coefficient with a downward-opening parabola, or vice versa.",
    exampleIncorrectReasoning: "For y = 2x² − 3x + 1 (a = 2 > 0), states the parabola opens downward.",
  },

  // --- transformations ---
  {
    id: "HORIZONTAL_TRANSLATION_DIRECTION_ERROR",
    label: "Reads the horizontal translation in the wrong direction",
    description: "Reads the horizontal translation of a(x − h)² + k in the wrong direction, confusing the sign inside the bracket.",
    conceptIds: ["concept-vertex-form", "concept-graph-transformations"],
    errorPattern: "Associates (x − h) with a translation of −h rather than +h.",
    exampleIncorrectReasoning: "For y = (x − 3)² + 1, states the graph is y = x² translated 3 units left instead of 3 units right.",
  },
  {
    id: "VERTICAL_TRANSLATION_SIGN_ERROR",
    label: "Misreads the sign of a vertical translation",
    description: "Misreads the sign of k as a vertical translation in a(x − h)² + k.",
    conceptIds: ["concept-vertex-form", "concept-graph-transformations"],
    errorPattern: "Flips the sign of k when describing the vertical translation.",
    exampleIncorrectReasoning: "For y = (x + 2)² − 5, states the graph is translated 5 units up instead of 5 units down.",
  },
  {
    id: "STRETCH_TRANSLATION_CONFUSION",
    label: "Confuses a stretch with a translation",
    description: "Confuses a vertical stretch/compression (from the coefficient a) with a translation.",
    conceptIds: ["concept-graph-transformations"],
    errorPattern: "Describes the leading coefficient a as shifting the graph rather than stretching or compressing it.",
    exampleIncorrectReasoning: "For y = 3(x − 1)² + 2, describes the factor of 3 as a translation rather than a vertical stretch.",
  },

  // --- intersections / modelling ---
  {
    id: "EXTRANEOUS_SOLUTION_NOT_REJECTED",
    label: "Accepts a contextually invalid solution",
    description: "Accepts a mathematically valid root that is not valid in the modelling context (e.g. negative time or length) without checking.",
    conceptIds: ["concept-modelling-with-quadratics"],
    errorPattern: "Reports every algebraic solution without checking whether it makes sense in context.",
    exampleIncorrectReasoning:
      "For a height model h(t) = −5t² + 20t + 2 solved for h = 0, giving t ≈ 4.06 or t ≈ −0.10, reports t ≈ −0.10 as a valid answer despite negative time being physically impossible.",
  },
];

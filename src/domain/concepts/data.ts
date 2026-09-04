import type { Concept } from "@/domain/concepts/types";

/**
 * The Grade 9-10 quadratics concept taxonomy: 35 concepts across 9 strands.
 * See docs/curriculum.md for the strand-by-strand rationale and the full
 * prerequisite graph, and src/domain/curriculum/curriculumOrder.ts for the
 * recommended (distinct from prerequisite-only) teaching order.
 *
 * This is the production concept graph for the study, not placeholder
 * data — Phase 2's question bank is authored against these ids.
 */
export const CONCEPTS: Concept[] = [
  // --- algebra_foundations ---
  {
    id: "concept-recognising-quadratic-expressions",
    name: "Recognising Quadratic Expressions",
    description:
      "Recognising expressions of the form ax² + bx + c (a ≠ 0) and distinguishing them from linear or cubic expressions.",
    prerequisiteIds: [],
    strand: "algebra_foundations",
    learningObjective:
      "Given an expression, decide whether it is quadratic and identify why.",
  },
  {
    id: "concept-collecting-like-terms",
    name: "Collecting Like Terms",
    description: "Combining like terms correctly within a polynomial expression, including tracking sign.",
    prerequisiteIds: [],
    strand: "algebra_foundations",
    learningObjective: "Simplify a polynomial expression by combining like terms with correct signs.",
  },
  {
    id: "concept-standard-form",
    name: "Standard Form",
    description: "Rewriting a quadratic expression or equation into standard form ax² + bx + c (= 0).",
    prerequisiteIds: ["concept-recognising-quadratic-expressions"],
    strand: "algebra_foundations",
    learningObjective: "Rearrange and order terms so a quadratic is in standard form.",
  },
  {
    id: "concept-algebraic-rearrangement",
    name: "Algebraic Rearrangement",
    description: "Rearranging an equation by moving terms across the equals sign while preserving equality.",
    prerequisiteIds: ["concept-collecting-like-terms"],
    strand: "algebra_foundations",
    learningObjective: "Transpose terms across an equals sign correctly, including sign.",
  },
  {
    id: "concept-expanding-two-binomials",
    name: "Expanding Two Binomials",
    description:
      "Expanding a product of two linear binomials, including where coefficients are negative, into ax² + bx + c form.",
    prerequisiteIds: ["concept-collecting-like-terms"],
    strand: "algebra_foundations",
    learningObjective: "Expand (x + p)(x + q)-style products correctly, including with negative coefficients.",
  },

  // --- factorisation ---
  {
    id: "concept-factorising-common-factor",
    name: "Factorising by Common Factor",
    description: "Extracting the highest common factor from a quadratic expression.",
    prerequisiteIds: ["concept-collecting-like-terms"],
    strand: "factorisation",
    learningObjective: "Factor out the highest common factor from a quadratic expression.",
  },
  {
    id: "concept-factorising-monic-quadratics",
    name: "Factorising Monic Quadratics",
    description: "Factorising x² + bx + c by finding two numbers with the required sum and product.",
    prerequisiteIds: ["concept-expanding-two-binomials"],
    strand: "factorisation",
    learningObjective: "Factorise x² + bx + c into two linear factors.",
  },
  {
    id: "concept-factorising-non-monic-quadratics",
    name: "Factorising Non-Monic Quadratics",
    description: "Factorising ax² + bx + c where a ≠ 1, correctly accounting for the leading coefficient.",
    prerequisiteIds: ["concept-factorising-monic-quadratics"],
    strand: "factorisation",
    learningObjective: "Factorise ax² + bx + c (a ≠ 1) into two linear factors.",
  },
  {
    id: "concept-difference-of-two-squares",
    name: "Difference of Two Squares",
    description: "Recognising and factorising a² − b² as (a + b)(a − b).",
    prerequisiteIds: ["concept-factorising-monic-quadratics"],
    strand: "factorisation",
    learningObjective: "Recognise a difference-of-two-squares expression and factorise it directly.",
  },
  {
    id: "concept-recognising-non-factorisable",
    name: "Recognising Non-Factorisable Expressions",
    description: "Recognising when a quadratic expression does not factorise over the integers.",
    prerequisiteIds: ["concept-factorising-non-monic-quadratics"],
    strand: "factorisation",
    learningObjective: "Decide whether a quadratic factorises over the integers before attempting it.",
  },
  {
    id: "concept-factorisation-roots-link",
    name: "Linking Factorisation to Roots",
    description: "Explaining the connection between the factors of a quadratic and the roots of the corresponding equation.",
    prerequisiteIds: ["concept-factorising-monic-quadratics"],
    strand: "factorisation",
    learningObjective: "Explain why each factor of a quadratic corresponds to a root of the equation.",
  },

  // --- solving ---
  {
    id: "concept-identifying-abc",
    name: "Identifying a, b, and c",
    description:
      "Correctly identifying the coefficients a, b, and c from a quadratic in standard form, including sign and missing terms.",
    prerequisiteIds: ["concept-standard-form"],
    strand: "solving",
    learningObjective: "Read off a, b, c from ax² + bx + c = 0 with correct sign, including when a term is absent.",
  },
  {
    id: "concept-zero-product-principle",
    name: "The Zero-Product Principle",
    description: "Applying the zero-product principle: if a product of factors equals zero, at least one factor must equal zero.",
    prerequisiteIds: ["concept-factorisation-roots-link"],
    strand: "solving",
    learningObjective: "State and apply the zero-product principle to a factorised equation.",
  },
  {
    id: "concept-solving-by-factorisation",
    name: "Solving Quadratic Equations by Factorisation",
    description: "Solving a quadratic equation by factorising and applying the zero-product principle.",
    prerequisiteIds: ["concept-zero-product-principle"],
    strand: "solving",
    learningObjective: "Solve a quadratic equation given in or reducible to factorised form.",
  },
  {
    id: "concept-rearranging-to-standard-form-to-solve",
    name: "Rearranging Into Standard Form Before Solving",
    description: "Rearranging a quadratic equation into '= 0' standard form before attempting to solve it.",
    prerequisiteIds: ["concept-standard-form", "concept-solving-by-factorisation"],
    strand: "solving",
    learningObjective: "Recognise that an equation must be in '= 0' form before factorising, and rearrange it there.",
  },
  {
    id: "concept-completing-the-square",
    name: "Completing the Square",
    description: "Rewriting ax² + bx + c in the form a(x + p)² + q by completing the square.",
    prerequisiteIds: ["concept-expanding-two-binomials", "concept-algebraic-rearrangement"],
    strand: "solving",
    learningObjective: "Complete the square on ax² + bx + c, tracking the balancing term correctly.",
  },
  {
    id: "concept-solving-by-completing-the-square",
    name: "Solving by Completing the Square",
    description: "Deriving the solutions of a quadratic equation from its completed-square form.",
    prerequisiteIds: ["concept-completing-the-square"],
    strand: "solving",
    learningObjective: "Solve a quadratic equation by completing the square and taking a square root.",
  },
  {
    id: "concept-quadratic-formula",
    name: "The Quadratic Formula",
    description: "Applying x = (−b ± √(b² − 4ac)) / 2a correctly, substituting a, b, c with correct sign.",
    prerequisiteIds: ["concept-completing-the-square", "concept-identifying-abc"],
    strand: "solving",
    learningObjective: "Solve a quadratic equation using the quadratic formula with correct substitution.",
  },
  {
    id: "concept-interpreting-plus-minus",
    name: "Correct Interpretation of ±",
    description: "Correctly interpreting ± as producing two distinct solutions, not a single value.",
    prerequisiteIds: ["concept-quadratic-formula"],
    strand: "solving",
    learningObjective: "Report both roots produced by a ± in a formula, not just one.",
  },

  // --- discriminant ---
  {
    id: "concept-computing-discriminant",
    name: "Computing the Discriminant",
    description: "Computing the discriminant b² − 4ac correctly from a, b, and c.",
    prerequisiteIds: ["concept-identifying-abc"],
    strand: "discriminant",
    learningObjective: "Compute b² − 4ac correctly, including with negative coefficients.",
  },
  {
    id: "concept-discriminant-nature-of-roots",
    name: "Nature of Roots From the Discriminant",
    description:
      "Determining whether a quadratic equation has two distinct, one repeated, or no real roots from the sign of the discriminant.",
    prerequisiteIds: ["concept-computing-discriminant"],
    strand: "discriminant",
    learningObjective: "State the number and type of real roots from the sign of the discriminant.",
  },
  {
    id: "concept-discriminant-reverse-reasoning",
    name: "Reasoning Backwards From the Discriminant",
    description: "Given a stated number or type of roots, reasoning backwards to constraints on the discriminant.",
    prerequisiteIds: ["concept-discriminant-nature-of-roots"],
    strand: "discriminant",
    learningObjective: "Translate a statement about root type into a condition on the discriminant's sign.",
  },
  {
    id: "concept-discriminant-parameter-reasoning",
    name: "Parameter Reasoning via the Discriminant",
    description: "Finding the value(s) of an unknown parameter that give a specified number or type of roots.",
    prerequisiteIds: ["concept-discriminant-reverse-reasoning"],
    strand: "discriminant",
    learningObjective: "Find parameter values satisfying a discriminant-based root condition.",
  },

  // --- roots_coefficients ---
  {
    id: "concept-sum-and-product-of-roots",
    name: "Sum and Product of Roots",
    description: "Computing the sum (−b/a) and product (c/a) of the roots of a quadratic directly from its coefficients.",
    prerequisiteIds: ["concept-identifying-abc", "concept-solving-by-factorisation"],
    strand: "roots_coefficients",
    learningObjective: "State the sum and product of the roots of ax² + bx + c = 0 without solving it.",
  },
  {
    id: "concept-constructing-quadratic-from-roots",
    name: "Constructing a Quadratic From Given Roots",
    description: "Constructing a quadratic equation with given roots, or a given sum/product of roots.",
    prerequisiteIds: ["concept-sum-and-product-of-roots"],
    strand: "roots_coefficients",
    learningObjective: "Write a quadratic equation whose roots satisfy given conditions.",
  },
  {
    id: "concept-roots-coefficients-parameter-reasoning",
    name: "Parameter Reasoning via Roots and Coefficients",
    description: "Using given relationships between roots to find unknown coefficients or parameters.",
    prerequisiteIds: ["concept-sum-and-product-of-roots"],
    strand: "roots_coefficients",
    learningObjective: "Find an unknown coefficient or parameter from a stated relationship between the roots.",
  },

  // --- graphs ---
  {
    id: "concept-parabola-shape-and-key-features",
    name: "Parabola Shape and Key Features",
    description: "Identifying a parabola's opening direction and y-intercept from its equation.",
    prerequisiteIds: ["concept-recognising-quadratic-expressions", "concept-standard-form"],
    strand: "graphs",
    learningObjective: "State the opening direction and y-intercept of a parabola from its equation.",
  },
  {
    id: "concept-roots-as-x-intercepts",
    name: "Roots as x-Intercepts",
    description: "Identifying the x-intercepts of a quadratic graph as the roots of the corresponding equation.",
    prerequisiteIds: ["concept-solving-by-factorisation", "concept-parabola-shape-and-key-features"],
    strand: "graphs",
    learningObjective: "Connect the roots of an equation to the x-intercepts of its graph, and vice versa.",
  },
  {
    id: "concept-vertex-and-axis-of-symmetry",
    name: "Vertex and Axis of Symmetry",
    description: "Finding the vertex and axis of symmetry of a quadratic, algebraically or from a graph.",
    prerequisiteIds: ["concept-identifying-abc", "concept-completing-the-square"],
    strand: "graphs",
    learningObjective: "Find the vertex and axis of symmetry of a quadratic from its equation.",
  },
  {
    id: "concept-graphical-nature-of-roots",
    name: "Graphical Interpretation of the Nature of Roots",
    description: "Interpreting two, one (tangent), or zero x-intercepts graphically in terms of the discriminant.",
    prerequisiteIds: ["concept-discriminant-nature-of-roots", "concept-roots-as-x-intercepts"],
    strand: "graphs",
    learningObjective: "Relate the number of x-intercepts on a graph to the sign of the discriminant.",
  },

  // --- transformations ---
  {
    id: "concept-vertex-form",
    name: "Vertex Form",
    description: "Rewriting a quadratic in vertex form a(x − h)² + k and identifying what h and k reveal about the graph.",
    prerequisiteIds: ["concept-completing-the-square"],
    strand: "transformations",
    learningObjective: "Convert between standard form and vertex form and identify h and k.",
  },
  {
    id: "concept-graph-transformations",
    name: "Graph Transformations",
    description: "Describing translations, stretches/compressions, and reflections of y = x² arising from a(x − h)² + k.",
    prerequisiteIds: ["concept-vertex-form"],
    strand: "transformations",
    learningObjective: "Describe how a, h, and k transform the graph of y = x² into y = a(x − h)² + k.",
  },

  // --- intersections ---
  {
    id: "concept-line-parabola-intersections",
    name: "Line-Parabola Intersections",
    description: "Finding the intersection point(s) of a line and a parabola by solving the resulting quadratic equation.",
    prerequisiteIds: ["concept-solving-by-factorisation", "concept-quadratic-formula"],
    strand: "intersections",
    learningObjective: "Find where a line and a parabola intersect by solving a quadratic equation.",
  },
  {
    id: "concept-modelling-with-quadratics",
    name: "Modelling With Quadratics",
    description:
      "Interpreting the roots of a quadratic model in context, including rejecting solutions that are not physically valid.",
    prerequisiteIds: ["concept-solving-by-factorisation"],
    strand: "intersections",
    learningObjective: "Interpret a quadratic model's roots in context and reject contextually invalid solutions.",
  },

  // --- reasoning ---
  {
    id: "concept-integrated-quadratic-reasoning",
    name: "Integrated Quadratic Reasoning",
    description:
      "Combining graphical, algebraic, and parameter-based reasoning to solve multi-step quadratic problems, choosing an efficient method.",
    prerequisiteIds: [
      "concept-discriminant-parameter-reasoning",
      "concept-roots-coefficients-parameter-reasoning",
      "concept-graph-transformations",
      "concept-line-parabola-intersections",
    ],
    strand: "reasoning",
    learningObjective:
      "Combine multiple quadratics concepts and choose an efficient method to solve a multi-step reasoning problem.",
  },
];

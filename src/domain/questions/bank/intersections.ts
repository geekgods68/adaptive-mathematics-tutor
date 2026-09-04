import type { Question } from "@/domain/questions/types";

/**
 * intersections strand — line-parabola intersections and modelling with
 * quadratics, including rejecting contextually invalid solutions.
 * See docs/curriculum.md.
 */
export const INTERSECTIONS_QUESTIONS: Question[] = [
  // --- line-parabola-intersections ---
  {
    id: "q-line-parabola-001",
    stem: "Find the point(s) of intersection of y = x² and y = 2x + 3.",
    conceptIds: ["concept-line-parabola-intersections"],
    primaryConceptId: "concept-line-parabola-intersections",
    difficulty: 3,
    correctOptionId: "q-line-parabola-001-o1",
    options: [
      { id: "q-line-parabola-001-o1", display: "(3, 9) and (−1, 1)", isCorrect: true },
      { id: "q-line-parabola-001-o2", display: "x = 3 and x = −1", isCorrect: false, derivationNote: "Finds the x-coordinates correctly but never substitutes back to find the corresponding y-coordinates." },
      {
        id: "q-line-parabola-001-o3",
        display: "(−3, −3) and (1, 5)",
        isCorrect: false,
        misconceptionId: "FACTOR_SIGN_ERROR",
        derivationNote: "Factorises x² − 2x − 3 with the sign pattern flipped, (x + 3)(x − 1) instead of (x − 3)(x + 1).",
      },
    ],
    workedSolution:
      "Set the equations equal: x² = 2x + 3, so x² − 2x − 3 = 0, i.e. (x − 3)(x + 1) = 0, giving x = 3 or x = −1.\nSubstitute back into y = 2x + 3: (3, 9) and (−1, 1).",
    explanation: "Solve for x first, then substitute back into either original equation to find y.",
    version: 1,
  },
  {
    id: "q-line-parabola-002",
    stem: "Find the point(s) of intersection of y = x² − 4x and y = x − 4.",
    conceptIds: ["concept-line-parabola-intersections"],
    primaryConceptId: "concept-line-parabola-intersections",
    difficulty: 3,
    correctOptionId: "q-line-parabola-002-o1",
    options: [
      { id: "q-line-parabola-002-o1", display: "(1, −3) and (4, 0)", isCorrect: true },
      { id: "q-line-parabola-002-o2", display: "x = 1 and x = 4", isCorrect: false, derivationNote: "Finds the x-coordinates correctly but never substitutes back to find the corresponding y-coordinates." },
      {
        id: "q-line-parabola-002-o3",
        display: "(−1, −5) and (−4, −8)",
        isCorrect: false,
        misconceptionId: "FACTOR_SIGN_ERROR",
        derivationNote: "Factorises x² − 5x + 4 with the sign pattern flipped, (x + 1)(x + 4) instead of (x − 1)(x − 4).",
      },
    ],
    workedSolution:
      "Set the equations equal: x² − 4x = x − 4, so x² − 5x + 4 = 0, i.e. (x − 1)(x − 4) = 0, giving x = 1 or x = 4.\nSubstitute back into y = x − 4: (1, −3) and (4, 0).",
    explanation: "Move every term to one side before factorising.",
    version: 1,
  },
  {
    id: "q-line-parabola-003",
    stem: "Find where y = x² − 2x − 1 and y = 2 intersect.",
    conceptIds: ["concept-line-parabola-intersections"],
    primaryConceptId: "concept-line-parabola-intersections",
    difficulty: 4,
    correctOptionId: "q-line-parabola-003-o1",
    options: [
      { id: "q-line-parabola-003-o1", display: "(3, 2) and (−1, 2)", isCorrect: true },
      {
        id: "q-line-parabola-003-o2",
        display: "(1 + √2, 2) and (1 − √2, 2)",
        isCorrect: false,
        derivationNote: "Solves x² − 2x − 1 = 0 (i.e. sets the parabola equal to 0) instead of x² − 2x − 1 = 2, forgetting to move the 2 across first.",
      },
      {
        id: "q-line-parabola-003-o3",
        display: "(−3, 2) and (1, 2)",
        isCorrect: false,
        misconceptionId: "FACTOR_SIGN_ERROR",
        derivationNote: "Factorises x² − 2x − 3 with the sign pattern flipped, (x + 3)(x − 1) instead of (x − 3)(x + 1).",
      },
    ],
    workedSolution:
      "Set x² − 2x − 1 = 2, so x² − 2x − 3 = 0, i.e. (x − 3)(x + 1) = 0, giving x = 3 or x = −1. Both give y = 2.",
    explanation: "y = 2 is a horizontal line — substitute it in and rearrange to '= 0' before solving.",
    version: 1,
  },
  {
    id: "q-line-parabola-004",
    stem: "Find the point(s) of intersection of y = x² − x − 3 and y = 3x + 2.",
    conceptIds: ["concept-line-parabola-intersections"],
    primaryConceptId: "concept-line-parabola-intersections",
    difficulty: 5,
    correctOptionId: "q-line-parabola-004-o1",
    options: [
      { id: "q-line-parabola-004-o1", display: "(5, 17) and (−1, −1)", isCorrect: true },
      {
        id: "q-line-parabola-004-o2",
        display: "(−5, −13) and (1, 5)",
        isCorrect: false,
        misconceptionId: "FACTOR_SIGN_ERROR",
        derivationNote: "Factorises x² − 4x − 5 with the sign pattern flipped, (x + 5)(x − 1) instead of (x − 5)(x + 1).",
      },
      { id: "q-line-parabola-004-o3", display: "(5, 17)", isCorrect: false, misconceptionId: "ONLY_ONE_FACTOR_SOLVED", derivationNote: "Solves one factor of the rearranged equation for x = 5, but never solves the second factor for x = −1." },
    ],
    workedSolution:
      "Set x² − x − 3 = 3x + 2, so x² − 4x − 5 = 0, i.e. (x − 5)(x + 1) = 0, giving x = 5 or x = −1.\nSubstitute into y = 3x + 2: (5, 17) and (−1, −1).",
    explanation: "With two non-trivial expressions, rearrange fully to standard form before factorising, and check both roots.",
    version: 1,
  },
  {
    id: "q-line-parabola-005",
    stem: "For which value of k does the line y = x + k intersect the parabola y = x² at exactly one point (i.e. is tangent to it)?",
    conceptIds: ["concept-line-parabola-intersections", "concept-discriminant-nature-of-roots"],
    primaryConceptId: "concept-line-parabola-intersections",
    difficulty: 4,
    correctOptionId: "q-line-parabola-005-o1",
    options: [
      { id: "q-line-parabola-005-o1", display: "k = −1/4", isCorrect: true },
      {
        id: "q-line-parabola-005-o2",
        display: "k = 1/4",
        isCorrect: false,
        misconceptionId: "SIGN_ERROR_TRANSPOSE",
        derivationNote: "Rearranges x² = x + k as x² − x + k = 0 instead of x² − x − k = 0, forgetting to flip the sign of k when moving it across.",
      },
      { id: "q-line-parabola-005-o3", display: "k = 1", isCorrect: false, derivationNote: "Sets the discriminant condition as 1 − k = 0 instead of 1 + 4k = 0, forgetting the factor of 4." },
    ],
    workedSolution:
      "Set x² = x + k, so x² − x − k = 0. Tangency means exactly one solution: discriminant = 0.\n1 + 4k = 0, so k = −1/4.",
    explanation: "'Exactly one intersection point' translates to discriminant = 0 for the equation formed by setting the two expressions equal.",
    version: 1,
  },

  // --- modelling-with-quadratics ---
  {
    id: "q-modelling-001",
    stem: "A ball's height is h(t) = −5t² + 20t + 2 (metres, t in seconds after being thrown). At what time(s) does the ball reach a height of 17 m?",
    conceptIds: ["concept-modelling-with-quadratics"],
    primaryConceptId: "concept-modelling-with-quadratics",
    difficulty: 3,
    correctOptionId: "q-modelling-001-o1",
    options: [
      { id: "q-modelling-001-o1", display: "t = 1 second and t = 3 seconds", isCorrect: true },
      { id: "q-modelling-001-o2", display: "t = −1 second and t = −3 seconds", isCorrect: false, misconceptionId: "FACTOR_SIGN_ERROR", derivationNote: "Factorises t² − 4t + 3 with the sign pattern flipped, (t + 1)(t + 3) instead of (t − 1)(t − 3)." },
      { id: "q-modelling-001-o3", display: "t = 1 second only", isCorrect: false, derivationNote: "Reports only the first solution found, overlooking that the ball passes through 17 m twice — once on the way up, once on the way down." },
    ],
    workedSolution:
      "−5t² + 20t + 2 = 17\n−5t² + 20t − 15 = 0\nt² − 4t + 3 = 0\n(t − 1)(t − 3) = 0\nt = 1 or t = 3 (both positive, both valid).",
    explanation: "A projectile typically passes through a given height twice — once rising, once falling — so expect two valid positive solutions here.",
    version: 1,
  },
  {
    id: "q-modelling-002",
    stem: "A ball is thrown so its height is h(t) = −5t² + 20t + 2. Find when it hits the ground (h = 0), stating which solution(s) are valid.",
    conceptIds: ["concept-modelling-with-quadratics"],
    primaryConceptId: "concept-modelling-with-quadratics",
    difficulty: 4,
    correctOptionId: "q-modelling-002-o1",
    options: [
      {
        id: "q-modelling-002-o1",
        display: "t ≈ 4.10 seconds (the negative root, t ≈ −0.10, is rejected since time cannot be negative)",
        isCorrect: true,
      },
      {
        id: "q-modelling-002-o2",
        display: "t ≈ 4.10 seconds or t ≈ −0.10 seconds (both are mathematically valid solutions)",
        isCorrect: false,
        misconceptionId: "EXTRANEOUS_SOLUTION_NOT_REJECTED",
        derivationNote: "Reports both algebraic solutions without checking that negative time has no meaning in this context.",
      },
      { id: "q-modelling-002-o3", display: "t ≈ −0.10 seconds (taking the smaller root)", isCorrect: false, derivationNote: "Selects the negative root instead of the positive one, the reverse of the correct rejection." },
    ],
    workedSolution:
      "−5t² + 20t + 2 = 0\n5t² − 20t − 2 = 0\nDiscriminant = 400 + 40 = 440\nt = (20 ± √440) / 10 ≈ 4.10 or ≈ −0.10\nTime cannot be negative, so only t ≈ 4.10 seconds is valid.",
    explanation: "Always check whether every algebraic solution makes sense in the original context before reporting it as an answer.",
    version: 1,
  },
  {
    id: "q-modelling-003",
    stem: "A rectangular garden has length 3 m more than its width, and area 40 m². Find the width.",
    conceptIds: ["concept-modelling-with-quadratics"],
    primaryConceptId: "concept-modelling-with-quadratics",
    difficulty: 3,
    correctOptionId: "q-modelling-003-o1",
    options: [
      { id: "q-modelling-003-o1", display: "5 metres (width cannot be negative, so w = −8 is rejected)", isCorrect: true },
      {
        id: "q-modelling-003-o2",
        display: "5 metres or −8 metres",
        isCorrect: false,
        misconceptionId: "EXTRANEOUS_SOLUTION_NOT_REJECTED",
        derivationNote: "Reports both algebraic solutions without checking that a negative width has no physical meaning.",
      },
      { id: "q-modelling-003-o3", display: "8 metres", isCorrect: false, derivationNote: "Reports the magnitude of the rejected root instead of the valid one." },
    ],
    workedSolution:
      "Let width = w. Then w(w + 3) = 40, so w² + 3w − 40 = 0, i.e. (w + 8)(w − 5) = 0, giving w = 5 or w = −8.\nA width cannot be negative, so w = 5 metres.",
    explanation: "Set up an equation from the context, solve it algebraically, then filter the solutions using the context's constraints.",
    version: 1,
  },
  {
    id: "q-modelling-004",
    stem: "A company's profit (in thousands of dollars) from selling x hundred units is P(x) = −2x² + 20x − 32. For what range of x is the company profitable (P(x) > 0)?",
    conceptIds: ["concept-modelling-with-quadratics"],
    primaryConceptId: "concept-modelling-with-quadratics",
    difficulty: 5,
    correctOptionId: "q-modelling-004-o1",
    options: [
      { id: "q-modelling-004-o1", display: "2 < x < 8 (hundred units)", isCorrect: true },
      {
        id: "q-modelling-004-o2",
        display: "x < 2 or x > 8 (hundred units)",
        isCorrect: false,
        derivationNote: "Divides the inequality −2x² + 20x − 32 > 0 by −2 without flipping its direction, solving x² − 10x + 16 > 0 instead of x² − 10x + 16 < 0.",
      },
      { id: "q-modelling-004-o3", display: "0 < x < 10 (hundred units)", isCorrect: false, derivationNote: "Guesses an interval based on the axis of symmetry (x = 5) without solving the inequality from the actual roots of P(x) = 0." },
    ],
    workedSolution:
      "−2x² + 20x − 32 > 0. Divide by −2 (flip the inequality): x² − 10x + 16 < 0.\nFactorise: (x − 2)(x − 8) < 0, so 2 < x < 8.",
    explanation: "Dividing an inequality by a negative number reverses its direction — a step that's easy to forget.",
    version: 1,
  },
  {
    id: "q-modelling-005",
    stem: "The height of a projectile is h(t) = −4.9t² + 14.7t (metres). At what positive time does it return to the ground (h = 0)?",
    conceptIds: ["concept-modelling-with-quadratics"],
    primaryConceptId: "concept-modelling-with-quadratics",
    difficulty: 4,
    correctOptionId: "q-modelling-005-o1",
    options: [
      { id: "q-modelling-005-o1", display: "t = 3 seconds (t = 0 is the launch time, not a return to the ground)", isCorrect: true },
      {
        id: "q-modelling-005-o2",
        display: "t = 0 seconds or t = 3 seconds",
        isCorrect: false,
        misconceptionId: "EXTRANEOUS_SOLUTION_NOT_REJECTED",
        derivationNote: "Reports both algebraic solutions without recognising that t = 0 is the trivial launch-time solution, not a meaningful 'return to the ground'.",
      },
      { id: "q-modelling-005-o3", display: "t = 0 seconds", isCorrect: false, derivationNote: "Selects the trivial launch-time root instead of the one describing the actual return to the ground." },
    ],
    workedSolution:
      "−4.9t² + 14.7t = 0\nt(−4.9t + 14.7) = 0\nt = 0 or t = 14.7/4.9 = 3\nt = 0 is the launch moment; the ball returns to the ground at t = 3 seconds.",
    explanation: "A factor of t often gives a trivial 'starting point' solution — check whether it answers the question actually being asked.",
    version: 1,
  },
];

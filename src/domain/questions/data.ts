import type { Question } from "@/domain/questions/types";

/**
 * Small placeholder question bank (5 items) sufficient to validate the
 * schema, grading, and selection architecture. The production quadratics
 * question bank is built in a later phase.
 *
 * Every incorrect option's `misconceptionId`/`derivationNote` describes a
 * mathematically real, checkable line of reasoning — not an arbitrary
 * wrong number. See docs/data-model.md for how to author new items this
 * way.
 */
export const QUESTIONS: Question[] = [
  {
    id: "q-solve-factorisation-01",
    stem: "Solve the equation: x² − 5x + 6 = 0",
    conceptIds: ["concept-solving-by-factorisation", "concept-factorisation"],
    primaryConceptId: "concept-solving-by-factorisation",
    difficulty: 2,
    correctOptionId: "q-solve-factorisation-01-o1",
    options: [
      {
        id: "q-solve-factorisation-01-o1",
        display: "x = 2 or x = 3",
        isCorrect: true,
      },
      {
        id: "q-solve-factorisation-01-o2",
        display: "x = −2 or x = −3",
        isCorrect: false,
        misconceptionId: "SIGN_ERROR",
        derivationNote:
          "After correctly factorising to (x − 2)(x − 3) = 0, the student copies the sign inside each bracket as the root itself, instead of negating it, giving −2 and −3.",
      },
      {
        id: "q-solve-factorisation-01-o3",
        display: "x = 2 or x = −3",
        isCorrect: false,
        misconceptionId: "FACTOR_PAIR_ERROR",
        derivationNote:
          "The student looks for two numbers that multiply to −6 and add to −5 instead of two numbers that multiply to +6 and add to −5, factorising (incorrectly) as (x − 2)(x + 3) = 0.",
      },
      {
        id: "q-solve-factorisation-01-o4",
        display: "x = −6",
        isCorrect: false,
        misconceptionId: "ZERO_PRODUCT_ERROR",
        derivationNote:
          "The student treats the constant term as if it were itself the root (x = −6), rather than factorising the expression and applying the zero-product property to two separate linear factors.",
      },
    ],
    workedSolution:
      "x² − 5x + 6 = 0\n(x − 2)(x − 3) = 0\nx − 2 = 0  or  x − 3 = 0\nx = 2  or  x = 3",
    explanation:
      "Factorise the left-hand side, then set each factor equal to zero separately (the zero-product property).",
    version: 1,
  },
  {
    id: "q-expand-brackets-01",
    stem: "Expand and simplify: (x + 3)(x − 4)",
    conceptIds: ["concept-expansion"],
    primaryConceptId: "concept-expansion",
    difficulty: 1,
    correctOptionId: "q-expand-brackets-01-o1",
    options: [
      {
        id: "q-expand-brackets-01-o1",
        display: "x² − x − 12",
        isCorrect: true,
      },
      {
        id: "q-expand-brackets-01-o2",
        display: "x² + x − 12",
        isCorrect: false,
        misconceptionId: "DISTRIBUTION_ERROR",
        derivationNote:
          "The student combines the two middle terms (−4x and +3x) without tracking sign correctly, writing +x instead of −x.",
      },
      {
        id: "q-expand-brackets-01-o3",
        display: "x² − x + 12",
        isCorrect: false,
        misconceptionId: "DISTRIBUTION_ERROR",
        derivationNote:
          "The student multiplies the constants 3 and −4 as though both were positive, giving +12 instead of −12.",
      },
      {
        id: "q-expand-brackets-01-o4",
        display: "x² − 7x − 12",
        isCorrect: false,
        misconceptionId: "DISTRIBUTION_ERROR",
        derivationNote:
          "The student adds the magnitudes of the two middle-term coefficients (4 and 3) directly to form the middle term, instead of computing −4x + 3x, producing −7x.",
      },
      {
        id: "q-expand-brackets-01-o5",
        display: "x² − 12",
        isCorrect: false,
        misconceptionId: "DISTRIBUTION_ERROR",
        derivationNote:
          "The student multiplies only the first and last terms of each bracket (x·x and 3·−4), omitting both cross terms entirely.",
      },
    ],
    workedSolution:
      "(x + 3)(x − 4)\n= x·x + x·(−4) + 3·x + 3·(−4)\n= x² − 4x + 3x − 12\n= x² − x − 12",
    explanation: "Multiply every term in the first bracket by every term in the second, then combine like terms.",
    version: 1,
  },
  {
    id: "q-quadratic-formula-01",
    stem: "Solve using the quadratic formula: x² + 4x − 1 = 0. Give exact (surd) answers.",
    conceptIds: ["concept-quadratic-formula", "concept-quadratic-expressions"],
    primaryConceptId: "concept-quadratic-formula",
    difficulty: 3,
    correctOptionId: "q-quadratic-formula-01-o1",
    options: [
      {
        id: "q-quadratic-formula-01-o1",
        display: "x = −2 + √5 or x = −2 − √5",
        isCorrect: true,
      },
      {
        id: "q-quadratic-formula-01-o2",
        display: "x = 2 + √5 or x = 2 − √5",
        isCorrect: false,
        misconceptionId: "SIGN_ERROR",
        derivationNote:
          "The student substitutes +b instead of −b into the numerator, using (4 ± √20) / 2 instead of (−4 ± √20) / 2, which flips the sign of the integer part of both roots.",
      },
      {
        id: "q-quadratic-formula-01-o3",
        display: "x = −2 + √3 or x = −2 − √3",
        isCorrect: false,
        misconceptionId: "DISCRIMINANT_FORMULA_ERROR",
        derivationNote:
          "The student computes the discriminant as b² + 4ac instead of b² − 4ac: 16 + (4 × 1 × −1) = 12 instead of 16 − (4 × 1 × −1) = 20, giving √3 in place of √5.",
      },
    ],
    workedSolution:
      "a = 1, b = 4, c = −1\nDiscriminant = b² − 4ac = 16 − 4(1)(−1) = 20\nx = (−4 ± √20) / 2 = (−4 ± 2√5) / 2 = −2 ± √5",
    explanation: "This does not factorise over the integers, so apply the quadratic formula directly.",
    version: 1,
  },
  {
    id: "q-discriminant-nature-01",
    stem: "How many real roots does the equation 2x² − 4x + 5 = 0 have?",
    conceptIds: ["concept-quadratic-formula"],
    primaryConceptId: "concept-quadratic-formula",
    difficulty: 4,
    correctOptionId: "q-discriminant-nature-01-o1",
    options: [
      {
        id: "q-discriminant-nature-01-o1",
        display: "No real roots (the discriminant is negative)",
        isCorrect: true,
      },
      {
        id: "q-discriminant-nature-01-o2",
        display: "Two distinct real roots",
        isCorrect: false,
        misconceptionId: "DISCRIMINANT_FORMULA_ERROR",
        derivationNote:
          "The student computes the discriminant as b² + 4ac instead of b² − 4ac: 16 + 40 = 56 (positive), instead of the correct 16 − 40 = −24 (negative).",
      },
      {
        id: "q-discriminant-nature-01-o3",
        display: "x = 5/2 or x = −1",
        isCorrect: false,
        misconceptionId: "FACTOR_PAIR_ERROR",
        derivationNote:
          "The student assumes the expression must factorise over the integers and guesses (2x − 5)(x + 1) = 0 without checking the expansion — it actually expands to 2x² − 3x − 5, not 2x² − 4x + 5.",
      },
    ],
    workedSolution:
      "a = 2, b = −4, c = 5\nDiscriminant = b² − 4ac = 16 − 4(2)(5) = 16 − 40 = −24\nA negative discriminant means the equation has no real roots.",
    explanation:
      "The number of real roots is determined by the sign of the discriminant, b² − 4ac, without needing to solve the equation.",
    version: 1,
  },
  {
    id: "q-factorise-identify-01",
    stem: "Which of the following is the correct factorisation of x² + 2x − 15?",
    conceptIds: ["concept-factorisation"],
    primaryConceptId: "concept-factorisation",
    difficulty: 2,
    correctOptionId: "q-factorise-identify-01-o1",
    options: [
      {
        id: "q-factorise-identify-01-o1",
        display: "(x + 5)(x − 3)",
        isCorrect: true,
      },
      {
        id: "q-factorise-identify-01-o2",
        display: "(x − 5)(x + 3)",
        isCorrect: false,
        misconceptionId: "SIGN_ERROR",
        derivationNote:
          "The student finds the correct factor magnitudes (5 and 3) but assigns the signs to the wrong factor, swapping which one is positive and which is negative.",
      },
      {
        id: "q-factorise-identify-01-o3",
        display: "(x + 15)(x − 1)",
        isCorrect: false,
        misconceptionId: "FACTOR_PAIR_ERROR",
        derivationNote:
          "The student picks the factor pair 15 and 1 (of 15) instead of 5 and 3, without checking that the pair must also produce the +2 middle-term coefficient.",
      },
      {
        id: "q-factorise-identify-01-o4",
        display: "(x − 3)(x − 5)",
        isCorrect: false,
        misconceptionId: "SIGN_ERROR",
        derivationNote:
          "The student assumes both factors must be negative because the constant term is negative, rather than checking which sign pattern reproduces the +2x middle term.",
      },
    ],
    workedSolution:
      "Need two numbers that multiply to −15 and add to +2: 5 and −3.\nx² + 2x − 15 = (x + 5)(x − 3)",
    explanation: "Check by expanding: (x + 5)(x − 3) = x² − 3x + 5x − 15 = x² + 2x − 15.",
    version: 1,
  },
];

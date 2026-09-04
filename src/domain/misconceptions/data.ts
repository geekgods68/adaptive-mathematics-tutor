import type { Misconception } from "@/domain/misconceptions/types";

/**
 * Small placeholder taxonomy sufficient to validate the architecture. The
 * production misconception bank is built in a later phase.
 */
export const MISCONCEPTIONS: Misconception[] = [
  {
    id: "SIGN_ERROR",
    label: "Sign error while rearranging or substituting",
    description:
      "The student drops, flips, or mis-assigns a negative sign while rearranging an equation or substituting into a formula.",
    conceptIds: ["concept-solving-by-factorisation", "concept-quadratic-formula", "concept-factorisation"],
  },
  {
    id: "FACTOR_PAIR_ERROR",
    label: "Incorrect factor pair chosen when factorising",
    description:
      "The student selects a pair of numbers that does not actually satisfy both the product and sum conditions required to factorise the expression.",
    conceptIds: ["concept-factorisation", "concept-solving-by-factorisation"],
  },
  {
    id: "ZERO_PRODUCT_ERROR",
    label: "Misapplying the zero-product property",
    description:
      "Having reached a factorised equation equal to zero, the student does not correctly set each factor to zero and solve independently.",
    conceptIds: ["concept-solving-by-factorisation"],
  },
  {
    id: "DISCRIMINANT_FORMULA_ERROR",
    label: "Discriminant computed as b² + 4ac",
    description:
      "The student computes the discriminant using b² + 4ac instead of the correct b² − 4ac.",
    conceptIds: ["concept-quadratic-formula"],
  },
  {
    id: "DISTRIBUTION_ERROR",
    label: "Error expanding brackets",
    description:
      "While expanding two brackets, the student drops, mis-signs, or mis-combines one of the cross terms.",
    conceptIds: ["concept-expansion"],
  },
];

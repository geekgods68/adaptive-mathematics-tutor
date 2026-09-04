import type { Question } from "@/domain/questions/types";
import { ALGEBRA_FOUNDATIONS_QUESTIONS } from "@/domain/questions/bank/algebraFoundations";
import { FACTORISATION_QUESTIONS } from "@/domain/questions/bank/factorisation";
import { SOLVING_QUESTIONS } from "@/domain/questions/bank/solving";
import { DISCRIMINANT_QUESTIONS } from "@/domain/questions/bank/discriminant";
import { ROOTS_COEFFICIENTS_QUESTIONS } from "@/domain/questions/bank/rootsCoefficients";
import { GRAPHS_QUESTIONS } from "@/domain/questions/bank/graphs";
import { TRANSFORMATIONS_QUESTIONS } from "@/domain/questions/bank/transformations";
import { INTERSECTIONS_QUESTIONS } from "@/domain/questions/bank/intersections";
import { REASONING_QUESTIONS } from "@/domain/questions/bank/reasoning";

/**
 * The full production question bank: every question across all 9
 * curriculum strands, combined. This is what both the non-adaptive and
 * (separately, in the sibling repo) adaptive tutors draw from — the bank
 * itself is condition-neutral. See docs/question-bank.md.
 */
export const QUESTIONS: Question[] = [
  ...ALGEBRA_FOUNDATIONS_QUESTIONS,
  ...FACTORISATION_QUESTIONS,
  ...SOLVING_QUESTIONS,
  ...DISCRIMINANT_QUESTIONS,
  ...ROOTS_COEFFICIENTS_QUESTIONS,
  ...GRAPHS_QUESTIONS,
  ...TRANSFORMATIONS_QUESTIONS,
  ...INTERSECTIONS_QUESTIONS,
  ...REASONING_QUESTIONS,
];

export {
  ALGEBRA_FOUNDATIONS_QUESTIONS,
  FACTORISATION_QUESTIONS,
  SOLVING_QUESTIONS,
  DISCRIMINANT_QUESTIONS,
  ROOTS_COEFFICIENTS_QUESTIONS,
  GRAPHS_QUESTIONS,
  TRANSFORMATIONS_QUESTIONS,
  INTERSECTIONS_QUESTIONS,
  REASONING_QUESTIONS,
};

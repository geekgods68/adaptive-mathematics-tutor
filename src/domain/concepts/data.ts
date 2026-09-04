import type { Concept } from "@/domain/concepts/types";

/**
 * Small placeholder slice of the eventual quadratics concept graph
 * (see docs/architecture.md for the full planned graph). Sufficient to
 * validate the schema and referential integrity; not the production
 * curriculum.
 */
export const CONCEPTS: Concept[] = [
  {
    id: "concept-quadratic-expressions",
    name: "Identifying Quadratic Expressions",
    description: "Recognising expressions of the form ax² + bx + c and identifying a, b, c.",
    prerequisiteIds: [],
  },
  {
    id: "concept-expansion",
    name: "Expanding Quadratic Expressions",
    description: "Expanding products of two linear brackets into ax² + bx + c form.",
    prerequisiteIds: ["concept-quadratic-expressions"],
  },
  {
    id: "concept-factorisation",
    name: "Factorising Quadratic Expressions",
    description: "Rewriting ax² + bx + c as a product of two linear factors.",
    prerequisiteIds: ["concept-expansion"],
  },
  {
    id: "concept-solving-by-factorisation",
    name: "Solving Quadratic Equations by Factorisation",
    description:
      "Using factorisation and the zero-product property to find the roots of a quadratic equation.",
    prerequisiteIds: ["concept-factorisation"],
  },
  {
    id: "concept-quadratic-formula",
    name: "Solving Quadratic Equations Using the Quadratic Formula",
    description:
      "Applying x = (−b ± √(b² − 4ac)) / 2a, including reasoning about the discriminant.",
    prerequisiteIds: ["concept-quadratic-expressions"],
  },
];

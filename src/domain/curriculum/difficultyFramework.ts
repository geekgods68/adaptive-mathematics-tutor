import type { DifficultyLevel } from "@/domain/questions/types";

/**
 * What each DifficultyLevel means, independent of any single question.
 * Difficulty here is a function of reasoning structure — number of steps,
 * whether the method is signposted, how many concepts are combined,
 * whether reasoning must run backwards, whether parameters or irrelevant
 * information are present — NOT of arithmetic size. A question with large
 * numbers but one obvious, signposted step is still Difficulty 1 or 2; a
 * question with small numbers that requires reverse reasoning across two
 * concepts is Difficulty 4 or 5. See docs/difficulty-framework.md for
 * worked examples justifying each level.
 */
export type DifficultyDescriptor = {
  level: DifficultyLevel;
  label: string;
  description: string;
  characteristics: string[];
};

export const DIFFICULTY_DESCRIPTORS: DifficultyDescriptor[] = [
  {
    level: 1,
    label: "Direct Recognition / Single Skill",
    description:
      "A single, explicit operation applied to values that are already presented in the form the operation needs.",
    characteristics: [
      "One concept",
      "One obvious operation",
      "The method to use is explicit, not inferred",
      "No representation conversion required",
      "No parameters, no irrelevant information",
    ],
  },
  {
    level: 2,
    label: "Routine Application",
    description: "A standard procedure applied start-to-finish on a straightforward instance of one primary concept.",
    characteristics: [
      "One primary concept",
      "1-2 reasoning steps",
      "A familiar representation (values already in standard/expected form)",
      "The method to use is strongly implied by the question",
    ],
  },
  {
    level: 3,
    label: "Multi-Step / Representation Conversion",
    description:
      "Several steps, typically including converting between representations (e.g. rearranging before solving, or standard form to completed-square form) before the primary procedure can be applied.",
    characteristics: [
      "Two related concepts",
      "Several reasoning steps",
      "Requires converting between representations",
      "Some choice involved in how to represent the problem",
    ],
  },
  {
    level: 4,
    label: "Integrated Reasoning",
    description:
      "Combines multiple concepts with a non-obvious setup; may require reverse reasoning (working from a stated outcome back to a constraint) rather than forward calculation alone.",
    characteristics: [
      "Multiple concepts combined",
      "Non-obvious problem setup",
      "Some reverse reasoning required",
      "More than one plausible approach exists",
    ],
  },
  {
    level: 5,
    label: "Advanced Reasoning",
    description:
      "Abstract or unfamiliar presentation requiring substantial reasoning with limited procedural signposting; several distractors are plausible unless the student reasons carefully through the whole problem.",
    characteristics: [
      "Several concepts combined",
      "Abstract or unfamiliar presentation",
      "Limited procedural signposting — the student must decide the approach",
      "Reverse reasoning and/or parameter reasoning required",
      "Discriminates strong from weak understanding (TMUA-style)",
    ],
  },
];

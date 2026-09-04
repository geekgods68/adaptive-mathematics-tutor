/**
 * A stable, named entry in the misconception taxonomy. `AnswerOption.misconceptionId`
 * values must reference a Misconception.id that exists here — this is what
 * turns "incorrect" into "response consistent with misconception X" (never
 * "the student definitely has misconception X" — see
 * docs/misconception-taxonomy.md on evidence vs. persistent misconception).
 */
export type Misconception = {
  id: string;
  label: string;
  description: string;
  conceptIds: string[];

  /** The flawed rule/procedure in one sentence, e.g. "Computes b² as 2b instead of b×b." */
  errorPattern?: string;

  /** A concrete worked instance of the flawed reasoning. Developer/research metadata — not student-facing. */
  exampleIncorrectReasoning?: string;
};

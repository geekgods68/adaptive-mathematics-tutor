/**
 * A stable, named entry in the misconception taxonomy. `AnswerOption.misconceptionId`
 * values must reference a Misconception.id that exists here — this is what
 * turns "incorrect" into "incorrect, consistent with misconception X".
 */
export type Misconception = {
  id: string;
  label: string;
  description: string;
  conceptIds: string[];
};

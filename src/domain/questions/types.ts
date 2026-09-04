/**
 * Difficulty is an explicit, ordinal, researcher-assigned property of a
 * question — it is never inferred from student performance.
 */
export type DifficultyLevel = 1 | 2 | 3 | 4 | 5;

/**
 * One selectable answer to a Question.
 *
 * `id` is an immutable, stable identifier. It must never be derived from
 * display position (e.g. "A"/"B"/"C"/"D"), because option order may be
 * randomized per presentation without changing which option is "correct".
 */
export type AnswerOption = {
  id: string;
  display: string;
  isCorrect: boolean;

  /**
   * Stable reference to a Misconception (see src/domain/misconceptions).
   * Present only on distractors that correspond to a specific, plausible
   * incorrect line of reasoning. Absent on the correct option and on
   * distractors that do not map to a modelled misconception.
   */
  misconceptionId?: string;

  /**
   * Developer/research metadata: the incorrect working that would produce
   * this distractor. NOT intended for display to students.
   */
  derivationNote?: string;
};

/**
 * A single multiple-choice mathematics item.
 *
 * Question and option `id`s are immutable and stable across sessions —
 * research analysis joins on them. `version` allows an item to be revised
 * later without breaking that historical join (bump it instead of mutating
 * an id in place).
 */
export type Question = {
  id: string;

  stem: string;

  /** All concepts this question exercises. Must include `primaryConceptId`. */
  conceptIds: string[];

  /** The single concept this question is primarily assessing. */
  primaryConceptId: string;

  difficulty: DifficultyLevel;

  /**
   * Answer options. Length is intentionally NOT fixed — a question may have
   * as few as 2 or as many as is pedagogically reasonable. Do not assume 4.
   */
  options: AnswerOption[];

  /** Must equal exactly one `options[].id`, and that option's `isCorrect` must be true. */
  correctOptionId: string;

  workedSolution: string;

  /** Optional short explanation shown alongside the worked solution as feedback. */
  explanation?: string;

  tags?: string[];

  source?: string;

  /**
   * Groups questions that are genuinely distinct assessment items but share
   * a reasoning structure (e.g. "quadratic-formula-sign-error-family").
   * Used for near-duplicate auditing and, later, for spreading a session
   * across families rather than repeating one reasoning pattern. Optional —
   * most standalone items don't need one.
   */
  questionFamily?: string;

  version: number;
};

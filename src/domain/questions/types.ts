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

  /**
   * RISE-import-only fields (see src/domain/rise/). Absent on the original
   * 161-question bank. Present on every imported RISE question.
   */

  /** "CH01".."CH14" — the chapter this question belongs to, from a curriculum far broader than the original 9 quadratics strands. */
  chapterId?: string;

  /**
   * Relative emphasis across `conceptIds` when a question draws on more
   * than one (positive, sums to 1). A single-concept question's only entry
   * is `{ [primaryConceptId]: 1 }`.
   */
  conceptWeights?: Record<string, number>;

  /**
   * Concepts this question assumes as background but does not itself
   * assess (distinct from `conceptIds`, which lists only directly-assessed
   * concepts).
   */
  prerequisiteConceptIds?: string[];

  /** e.g. "computational" | "conceptual" | "graphical_interpretation" | "error_diagnosis" | "mathematical_reasoning" — the question's leading cognitive demand, not a fixed enum here since this is RISE-import-specific metadata. */
  questionType?: string;
};

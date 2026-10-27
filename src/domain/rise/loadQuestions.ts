import { readFileSync } from "fs";
import path from "path";
import type { AnswerOption, DifficultyLevel, Question } from "@/domain/questions/types";
import { parseCsvRecords } from "@/domain/rise/csvParser";

const CANONICAL_CSV_PATH = path.join(process.cwd(), "data", "question-bank", "canonical-question-bank-v1.csv");

type RawOption = { option_id: string; text: string };

/**
 * Converts one canonical-CSV row into a `Question`. Every nested JSON cell
 * is parsed explicitly (never regex-munged) so a malformed cell throws
 * loudly at load time rather than silently producing wrong data.
 */
function rowToQuestion(row: Record<string, string>): Question {
  const rawOptions: RawOption[] = JSON.parse(row.options);
  const optionExplanations: Record<string, string> = row.option_explanations ? JSON.parse(row.option_explanations) : {};
  const misconceptionIdsByOption: Record<string, string[]> = row.misconception_ids_by_option
    ? JSON.parse(row.misconception_ids_by_option)
    : {};
  const conceptIds: string[] = JSON.parse(row.concept_ids);
  const conceptWeights: Record<string, number> = row.concept_weights ? JSON.parse(row.concept_weights) : {};
  const prerequisiteConceptIds: string[] = row.prerequisite_concept_ids ? JSON.parse(row.prerequisite_concept_ids) : [];

  const options: AnswerOption[] = rawOptions.map((o) => {
    const isCorrect = o.option_id === row.correct_option_id;
    const misconceptionIds = misconceptionIdsByOption[o.option_id] ?? [];
    // The source schema allows a distractor to map to more than one candidate
    // misconception; AnswerOption.misconceptionId is singular (matching the
    // original 161-question bank's shape), so the first is used when present.
    // This is a real, documented narrowing -- see docs/development-log.md's
    // RISE-integration entry for how many options this affected.
    const misconceptionId = !isCorrect && misconceptionIds.length > 0 ? misconceptionIds[0] : undefined;
    const explanation = optionExplanations[o.option_id];
    return {
      id: `${row.question_id}-${o.option_id}`,
      display: o.text,
      isCorrect,
      ...(misconceptionId ? { misconceptionId } : {}),
      // Every option gets its explanation as derivationNote (not just
      // distractors with a misconceptionId) -- validateQuestionBank.ts
      // requires a non-empty derivationNote wherever misconceptionId is
      // set, and the source's option_explanations already describes the
      // flawed reasoning in prose for every distractor.
      ...(explanation ? { derivationNote: explanation } : {}),
    };
  });

  const correctOption = options.find((o) => o.isCorrect);
  if (!correctOption) {
    throw new Error(`RISE import: question ${row.question_id} has no option matching correct_option_id "${row.correct_option_id}"`);
  }

  const difficulty = Number(row.difficulty) as DifficultyLevel;
  if (![1, 2, 3, 4, 5].includes(difficulty)) {
    throw new Error(`RISE import: question ${row.question_id} has invalid difficulty "${row.difficulty}"`);
  }

  return {
    id: row.question_id,
    stem: row.question_text,
    conceptIds,
    primaryConceptId: row.primary_concept_id,
    difficulty,
    options,
    correctOptionId: correctOption.id,
    workedSolution: row.worked_solution,
    explanation: optionExplanations[row.correct_option_id],
    questionFamily: row.question_family_id || undefined,
    version: 1,
    chapterId: row.chapter_id,
    conceptWeights,
    prerequisiteConceptIds,
    questionType: row.question_type || undefined,
    tags: [row.release_stage, row.validation_status].filter(Boolean),
    source: "RISE Adaptive Mathematics Tutor generation pipeline v1.0.0 (see data/question-bank/README.md)",
  };
}

let cached: Question[] | null = null;

/** Loads and parses the canonical RISE question bank CSV. Cached after first call (module-level memoization, not a global singleton hack -- this is the same "load once at module init" pattern every other bank file in this codebase already uses, just reading from CSV instead of a literal TS array). */
export function loadRiseQuestions(): Question[] {
  if (cached) return cached;
  const text = readFileSync(CANONICAL_CSV_PATH, "utf-8");
  const rows = parseCsvRecords(text);
  cached = rows.map(rowToQuestion);
  return cached;
}

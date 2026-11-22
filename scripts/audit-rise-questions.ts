import { RISE_QUESTIONS, RISE_CONCEPTS, RISE_MISCONCEPTIONS } from "@/domain/rise";
import { validateDomainModel } from "@/domain/validateDomainModel";
import { validateQuestionBank } from "@/domain/questions/validateQuestionBank";
import { findConceptGraphCycles } from "@/domain/curriculum/validateCurriculum";
import {
  computeBankStatistics,
  findDuplicateOptionSetGroups,
  findDuplicateStemGroups,
} from "@/domain/questions/bankStatistics";
import type { Question } from "@/domain/questions/types";

/**
 * Stage 1 (docs/research-decisions.md RD-0010, Finding F-10 from the
 * October 29 system audit): a RISE-bank counterpart to
 * `scripts/audit-questions.ts`. The original script covers only the
 * 161-question legacy bank — this covers the 1,840-question bank that
 * actually serves every real adaptive AND (as of Stage 1) non-adaptive
 * session in the live product.
 *
 * Reuses the SAME generic validators the original script uses
 * (`validateDomainModel`, `validateQuestionBank`, `computeBankStatistics`,
 * duplicate-detection) wherever they are bank-agnostic — see each
 * function's own signature, which takes plain `Question[]`/`Concept[]`/
 * `Misconception[]`, not anything specific to the original bank. This is
 * NOT a parallel re-implementation. `validateQuestionBank` is called with
 * an empty difficulty-guidance list: no `ConceptDifficultyGuidance` table
 * exists for the RISE curriculum's 109 concepts, so its guidance-range
 * check is correctly and explicitly disabled (not fabricated), not
 * silently skipped. Chapter/concept-weight checks below are additive,
 * RISE-specific extensions the original bank has no equivalent of
 * (it has no chapters or multi-concept weighting at all).
 *
 * Per Stage 1 Part 3.4: this performs STRUCTURAL and MATHEMATICALLY
 * DETERMINISTIC checks only. It does not and cannot confirm independent
 * human or empirical review of question content — see
 * `data/question-bank/README.md` and CLAUDE.md for that explicitly
 * self-disclosed limitation, which this script does not change or paper
 * over.
 */

function pct(n: number, total: number): string {
  return total === 0 ? "0.0%" : `${((100 * n) / total).toFixed(1)}%`;
}

function effectiveConceptWeights(question: Question): Record<string, number> {
  return question.conceptWeights ?? { [question.primaryConceptId]: 1 };
}

/** RISE-specific: conceptWeights (when present) must reference real, positive-weighted concepts that are also listed in the question's own conceptIds — a weight on a concept the question doesn't otherwise declare would be an internal inconsistency no generic check catches. Exported for tests/domain/rise/riseAuditExtensions.test.ts. */
export function validateConceptWeights(questions: Question[], conceptIds: Set<string>): string[] {
  const errors: string[] = [];
  for (const question of questions) {
    if (!question.conceptWeights) continue;
    const weightKeys = Object.keys(question.conceptWeights);
    if (weightKeys.length === 0) {
      errors.push(`Question "${question.id}" has an empty conceptWeights object (omit the field entirely for a single-concept question)`);
      continue;
    }
    for (const [conceptId, weight] of Object.entries(question.conceptWeights)) {
      if (!conceptIds.has(conceptId)) {
        errors.push(`Question "${question.id}" conceptWeights references unknown conceptId "${conceptId}"`);
      }
      if (!question.conceptIds.includes(conceptId)) {
        errors.push(`Question "${question.id}" conceptWeights references "${conceptId}", which is not in the question's own conceptIds`);
      }
      if (!(typeof weight === "number") || !Number.isFinite(weight) || weight <= 0) {
        errors.push(`Question "${question.id}" conceptWeights["${conceptId}"] is not a positive finite number (${weight})`);
      }
    }
  }
  return errors;
}

/** RISE-specific: every question and concept must reference a real chapter id, and a question's chapter should be consistent with at least one of the chapters its concepts belong to (a question entirely disconnected from its own declared chapter would indicate a data-import defect). Exported for tests/domain/rise/riseAuditExtensions.test.ts. */
export function validateChapterConsistency(questions: Question[], concepts: Concept[]): string[] {
  const errors: string[] = [];
  const chapterByConceptId = new Map(concepts.map((c) => [c.id, c.chapterId]));
  const knownChapterIds = new Set(concepts.map((c) => c.chapterId).filter((id): id is string => Boolean(id)));

  for (const concept of concepts) {
    if (!concept.chapterId) {
      errors.push(`Concept "${concept.id}" has no chapterId`);
    }
  }

  for (const question of questions) {
    if (!question.chapterId) {
      errors.push(`Question "${question.id}" has no chapterId`);
      continue;
    }
    if (!knownChapterIds.has(question.chapterId)) {
      errors.push(`Question "${question.id}" references unknown chapterId "${question.chapterId}"`);
      continue;
    }
    const conceptChapters = new Set(Object.keys(effectiveConceptWeights(question)).map((c) => chapterByConceptId.get(c)).filter(Boolean));
    if (conceptChapters.size > 0 && !conceptChapters.has(question.chapterId)) {
      errors.push(`Question "${question.id}" declares chapterId "${question.chapterId}", but none of its concepts belong to that chapter (concept chapters: ${[...conceptChapters].join(", ")})`);
    }
  }
  return errors;
}

type Concept = (typeof RISE_CONCEPTS)[number];

function main(): void {
  const questions = RISE_QUESTIONS;
  const concepts = RISE_CONCEPTS;
  const misconceptions = RISE_MISCONCEPTIONS;
  const conceptIds = new Set(concepts.map((c) => c.id));

  const stats = computeBankStatistics(questions, concepts, misconceptions);
  const domainErrors = validateDomainModel(questions, concepts, misconceptions);
  const bankErrors = validateQuestionBank(questions, []); // no RISE difficulty-guidance table exists -- see module doc comment
  const cycleErrors = findConceptGraphCycles(concepts).map((cycle) => `Concept graph contains a cycle: ${cycle.join(" -> ")}`);
  const conceptWeightErrors = validateConceptWeights(questions, conceptIds);
  const chapterErrors = validateChapterConsistency(questions, concepts);
  const duplicateStems = findDuplicateStemGroups(questions);
  const duplicateOptionSets = findDuplicateOptionSetGroups(questions);

  console.log(`RISE question bank audit (${questions.length} questions, ${concepts.length} concepts, ${misconceptions.length} misconceptions)\n`);
  console.log("Provenance: externally generated; independent human review and empirical validation both self-reported as NOT performed (data/question-bank/README.md). This audit checks structural and mathematically-deterministic integrity only -- it is NOT a substitute for that review.\n");

  console.log("By strand (chapter):");
  for (const [strand, count] of Object.entries(stats.byStrand).sort()) {
    console.log(`  ${strand}: ${count}`);
  }

  console.log("\nBy difficulty:");
  for (const level of [1, 2, 3, 4, 5] as const) {
    const count = stats.byDifficulty[level] ?? 0;
    console.log(`  L${level}: ${count} (${pct(count, stats.totalQuestions)})`);
  }

  console.log(`\nQuestions with multiple concepts (conceptWeights): ${stats.questionsWithMultipleConcepts}/${stats.totalQuestions}`);
  console.log(`Average options per question: ${stats.averageOptionsPerQuestion.toFixed(2)}`);

  console.log(`\nConcepts covered: ${concepts.length - stats.conceptsWithNoQuestions.length}/${concepts.length}`);
  if (stats.conceptsWithNoQuestions.length > 0) {
    console.log(`  Not covered (CONFIRMED gap -- category 1, structural): ${stats.conceptsWithNoQuestions.length} concepts`);
    console.log(`    ${stats.conceptsWithNoQuestions.slice(0, 20).join(", ")}${stats.conceptsWithNoQuestions.length > 20 ? ", ..." : ""}`);
  }

  console.log(`\nMisconceptions represented: ${misconceptions.length - stats.misconceptionsNeverRepresented.length}/${misconceptions.length}`);
  if (stats.misconceptionsNeverRepresented.length > 0) {
    console.log(`  Never represented: ${stats.misconceptionsNeverRepresented.length} misconceptions`);
  }

  console.log(`\nDuplicate stems (CONFIRMED structural, category 1): ${duplicateStems.length}`);
  for (const group of duplicateStems.slice(0, 20)) console.log(`  ${group.join(", ")}`);
  if (duplicateStems.length > 20) console.log(`  ... and ${duplicateStems.length - 20} more group(s)`);

  console.log(`\nQuestions sharing an option-display set (informational, category 3 -- may be legitimate reuse of category labels): ${duplicateOptionSets.length} group(s)`);

  const categorizedErrors = {
    structural: [...domainErrors.filter((e) => !e.startsWith("Concept graph contains a cycle")), ...cycleErrors, ...chapterErrors],
    mathematical: [] as string[], // see module doc comment: no deterministic per-question arithmetic re-derivation exists for RISE yet (unlike tests/domain/questionBank/mathVerification.test.ts for the original bank) -- a residual limitation, documented rather than silently skipped.
    authoringQuality: [...bankErrors, ...conceptWeightErrors],
  };

  const totalErrors = categorizedErrors.structural.length + categorizedErrors.mathematical.length + categorizedErrors.authoringQuality.length;

  console.log(`\n--- Classified findings (Stage 1 Part 3.4) ---`);
  console.log(`1. Confirmed structural errors: ${categorizedErrors.structural.length}`);
  for (const e of categorizedErrors.structural.slice(0, 30)) console.log(`   [structural] ${e}`);
  if (categorizedErrors.structural.length > 30) console.log(`   ... and ${categorizedErrors.structural.length - 30} more`);

  console.log(`2. Confirmed mathematical errors: ${categorizedErrors.mathematical.length} -- NOT CHECKED (no deterministic per-family arithmetic verifier exists for RISE; see residual-limitations note in docs/stage1-experimental-validity-report.md)`);

  console.log(`3. Suspected issues requiring human review: content correctness itself is entirely unaudited by this or any script -- see provenance note above. Duplicate option-display-set groups (informational, above) are a weak, non-conclusive signal only.`);

  console.log(`4. Validation categories not yet covered: per-family mathematical re-derivation (category 2, ports tests/helpers/quadratics.ts's pattern to RISE's broader domain -- NOT done in Stage 1); malformed-LaTeX/mathematical-notation detection; missing-explanation NATURAL-LANGUAGE quality (only emptiness is checked, not correctness of the prose).`);

  console.log(`\n${categorizedErrors.authoringQuality.length} authoring-quality findings (stem/worked-solution emptiness, duplicate option text, conceptWeights internal consistency):`);
  for (const e of categorizedErrors.authoringQuality.slice(0, 30)) console.log(`   [authoring] ${e}`);
  if (categorizedErrors.authoringQuality.length > 30) console.log(`   ... and ${categorizedErrors.authoringQuality.length - 30} more`);

  console.log(`\nTotal confirmed integrity errors (categories 1 + authoring-quality): ${totalErrors}`);

  if (totalErrors > 0 || duplicateStems.length > 0) {
    process.exitCode = 1;
  }
}

// Only run when executed directly (`npm run audit:rise-questions`), not when imported for its
// exported validators (tests/domain/rise/riseAuditExtensions.test.ts) — importing this module must
// never have the side effect of printing a report or setting process.exitCode.
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

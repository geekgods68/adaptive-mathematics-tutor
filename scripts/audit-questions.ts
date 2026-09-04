import { QUESTIONS } from "@/domain/questions";
import { CONCEPTS } from "@/domain/concepts/data";
import { MISCONCEPTIONS } from "@/domain/misconceptions/data";
import { validateDomainModel } from "@/domain/validateDomainModel";
import { validateQuestionBank } from "@/domain/questions/validateQuestionBank";
import { CONCEPT_DIFFICULTY_GUIDANCE } from "@/domain/curriculum/conceptDifficultyGuidance";
import {
  computeBankStatistics,
  findDuplicateOptionSetGroups,
  findDuplicateStemGroups,
} from "@/domain/questions/bankStatistics";

function pct(n: number, total: number): string {
  return total === 0 ? "0.0%" : `${((100 * n) / total).toFixed(1)}%`;
}

function main(): void {
  const stats = computeBankStatistics(QUESTIONS, CONCEPTS, MISCONCEPTIONS);
  const domainErrors = validateDomainModel(QUESTIONS, CONCEPTS, MISCONCEPTIONS);
  const bankErrors = validateQuestionBank(QUESTIONS, CONCEPT_DIFFICULTY_GUIDANCE);
  const duplicateStems = findDuplicateStemGroups(QUESTIONS);
  const duplicateOptionSets = findDuplicateOptionSetGroups(QUESTIONS);

  console.log(`Total questions: ${stats.totalQuestions}\n`);

  console.log("By strand:");
  for (const [strand, count] of Object.entries(stats.byStrand).sort()) {
    console.log(`  ${strand}: ${count}`);
  }

  console.log("\nBy difficulty:");
  for (const level of [1, 2, 3, 4, 5] as const) {
    const count = stats.byDifficulty[level] ?? 0;
    console.log(`  L${level}: ${count} (${pct(count, stats.totalQuestions)})`);
  }

  console.log(`\nDiagnostic distractors: ${Object.values(stats.byMisconception).reduce((a, b) => a + b, 0)}`);
  console.log(
    `Questions with >=1 diagnostic distractor: ${stats.questionsWithDiagnosticDistractors}/${stats.totalQuestions}`,
  );
  console.log(`Questions with multiple concepts: ${stats.questionsWithMultipleConcepts}/${stats.totalQuestions}`);
  console.log(`Average options per question: ${stats.averageOptionsPerQuestion.toFixed(2)}`);
  console.log(
    "Option count histogram:",
    Object.entries(stats.optionCountHistogram)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([n, count]) => `${n} options: ${count}`)
      .join(", "),
  );

  console.log(`\nConcepts covered: ${CONCEPTS.length - stats.conceptsWithNoQuestions.length}/${CONCEPTS.length}`);
  if (stats.conceptsWithNoQuestions.length > 0) {
    console.log(`  Not covered: ${stats.conceptsWithNoQuestions.join(", ")}`);
  }
  if (stats.conceptsWithLowCoverage.length > 0) {
    console.log(`  Low coverage (< 2 questions): ${stats.conceptsWithLowCoverage.join(", ")}`);
  }

  console.log(
    `\nMisconceptions represented: ${MISCONCEPTIONS.length - stats.misconceptionsNeverRepresented.length}/${MISCONCEPTIONS.length}`,
  );
  if (stats.misconceptionsNeverRepresented.length > 0) {
    console.log(`  Never represented: ${stats.misconceptionsNeverRepresented.join(", ")}`);
  }

  console.log(`\nDuplicate stems: ${duplicateStems.length}`);
  for (const group of duplicateStems) console.log(`  ${group.join(", ")}`);
  console.log(
    `Questions sharing an option-display set with another question: ${duplicateOptionSets.length} group(s)` +
      " (informational — classification-style questions legitimately reuse a fixed set of category labels" +
      " across different underlying equations; only a concern if the stems also match, which is checked separately above)",
  );
  for (const group of duplicateOptionSets) console.log(`  ${group.join(", ")}`);

  const totalErrors = domainErrors.length + bankErrors.length;
  console.log(`\nIntegrity errors: ${totalErrors}`);
  for (const e of domainErrors) console.log(`  [domain] ${e}`);
  for (const e of bankErrors) console.log(`  [bank] ${e}`);

  if (totalErrors > 0 || duplicateStems.length > 0) {
    process.exitCode = 1;
  }
}

main();

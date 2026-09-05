import { NON_ADAPTIVE_STUDY_SEQUENCE } from "@/tutoring/selection/nonAdaptive/studySequence";
import { QUESTIONS } from "@/domain/questions";
import { CONCEPTS } from "@/domain/concepts/data";
import { computeStudySequenceStatistics, validateStudySequence } from "@/tutoring/selection/nonAdaptive/validateStudySequence";

function main(): void {
  const stats = computeStudySequenceStatistics(NON_ADAPTIVE_STUDY_SEQUENCE, QUESTIONS, CONCEPTS);
  const errors = validateStudySequence(NON_ADAPTIVE_STUDY_SEQUENCE, QUESTIONS);

  console.log(`Study sequence length: ${stats.length}\n`);

  console.log("Difficulty composition:");
  for (const level of [1, 2, 3, 4, 5] as const) {
    console.log(`  L${level}: ${stats.byDifficulty[level] ?? 0}`);
  }

  console.log("\nStrand coverage:");
  for (const [strand, count] of Object.entries(stats.byStrand).sort()) {
    console.log(`  ${strand}: ${count}`);
  }
  const strandsCovered = Object.keys(stats.byStrand).length;
  console.log(`  (${strandsCovered}/9 strands represented)`);

  console.log(`\nL5 count: ${stats.byDifficulty[5] ?? 0}`);
  console.log(`Duplicate IDs: ${stats.duplicateIds.length}${stats.duplicateIds.length ? " -> " + stats.duplicateIds.join(", ") : ""}`);
  console.log(`Invalid IDs: ${stats.invalidIds.length}${stats.invalidIds.length ? " -> " + stats.invalidIds.join(", ") : ""}`);

  console.log(`\nIntegrity errors: ${errors.length}`);
  for (const e of errors) console.log(`  ${e}`);

  if (errors.length > 0 || stats.duplicateIds.length > 0 || stats.invalidIds.length > 0 || strandsCovered < 9) {
    process.exitCode = 1;
  }
}

main();

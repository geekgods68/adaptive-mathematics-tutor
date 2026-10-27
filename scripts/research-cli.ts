/**
 * Minimal headless CLI over the Phase 6 researcher-inspection API
 * (src/research/artifact/inspect.ts) — a thin wrapper, not a second
 * implementation of anything. Usage:
 *
 *   npx tsx scripts/research-cli.ts list [--condition=C1] [--scenario=s1] [--status=terminated]
 *   npx tsx scripts/research-cli.ts show <runId>
 *   npx tsx scripts/research-cli.ts verify <runId>
 *   npx tsx scripts/research-cli.ts export <runId> <run-summary|question-responses|mastery-trajectory|selection-decisions|misconception-evidence> [--format=csv|jsonl]
 *   npx tsx scripts/research-cli.ts compare <runIdA> <runIdB>
 */
import { ALL_QUESTIONS } from "@/domain/rise";
import {
  compareRunProvenance,
  getRun,
  listRuns,
  verifyRun,
  summarizeRun,
  toCsv,
  toJsonl,
  buildQuestionResponseRows,
  buildMasteryTrajectoryRows,
  buildSelectionDecisionRows,
  buildMisconceptionEvidenceRows,
  QUESTION_RESPONSE_COLUMNS,
  MASTERY_TRAJECTORY_COLUMNS,
  SELECTION_DECISION_COLUMNS,
  MISCONCEPTION_EVIDENCE_COLUMNS,
  RUN_SUMMARY_COLUMNS,
} from "@/research/artifact";

function parseFlags(args: string[]): Record<string, string> {
  const flags: Record<string, string> = {};
  for (const arg of args) {
    const match = /^--([a-zA-Z-]+)=(.*)$/.exec(arg);
    if (match) flags[match[1]] = match[2];
  }
  return flags;
}

function main(): void {
  const [command, ...rest] = process.argv.slice(2);
  const positional = rest.filter((a) => !a.startsWith("--"));
  const flags = parseFlags(rest);

  switch (command) {
    case "list": {
      const runs = listRuns({ conditionId: flags.condition, scenarioId: flags.scenario, terminationStatus: flags.status });
      console.log(JSON.stringify(runs, null, 2));
      console.log(`\n${runs.length} run(s).`);
      return;
    }
    case "show": {
      const [runId] = positional;
      console.log(JSON.stringify(getRun(runId), null, 2));
      return;
    }
    case "verify": {
      const [runId] = positional;
      const result = verifyRun(runId);
      console.log(JSON.stringify(result, null, 2));
      return;
    }
    case "compare": {
      const [runIdA, runIdB] = positional;
      console.log(JSON.stringify(compareRunProvenance(runIdA, runIdB), null, 2));
      return;
    }
    case "export": {
      const [runId, dataset] = positional;
      const format = flags.format === "jsonl" ? "jsonl" : "csv";
      const artifact = getRun(runId);
      const questionsById = new Map(ALL_QUESTIONS.map((q) => [q.id, q]));

      switch (dataset) {
        case "run-summary":
          process.stdout.write(format === "csv" ? toCsv([summarizeRun(runId)], RUN_SUMMARY_COLUMNS) : toJsonl([summarizeRun(runId)]));
          return;
        case "question-responses": {
          const rows = buildQuestionResponseRows(artifact, questionsById);
          process.stdout.write(format === "csv" ? toCsv(rows, QUESTION_RESPONSE_COLUMNS) : toJsonl(rows));
          return;
        }
        case "mastery-trajectory": {
          const rows = buildMasteryTrajectoryRows(artifact);
          process.stdout.write(format === "csv" ? toCsv(rows, MASTERY_TRAJECTORY_COLUMNS) : toJsonl(rows));
          return;
        }
        case "selection-decisions": {
          const rows = buildSelectionDecisionRows(artifact);
          process.stdout.write(format === "csv" ? toCsv(rows, SELECTION_DECISION_COLUMNS) : toJsonl(rows));
          return;
        }
        case "misconception-evidence": {
          const rows = buildMisconceptionEvidenceRows(artifact);
          process.stdout.write(format === "csv" ? toCsv(rows, MISCONCEPTION_EVIDENCE_COLUMNS) : toJsonl(rows));
          return;
        }
        default:
          console.error(`Unknown export dataset "${dataset}". Expected one of: run-summary, question-responses, mastery-trajectory, selection-decisions, misconception-evidence.`);
          process.exitCode = 1;
      }
      return;
    }
    default:
      console.error(`Unknown command "${command ?? ""}". Expected one of: list, show, verify, export, compare.`);
      process.exitCode = 1;
  }
}

main();

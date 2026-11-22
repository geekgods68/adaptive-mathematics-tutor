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
 *
 * Stage 2 additions (docs/stage2-research-persistence-report.md Part 11)
 * — durable LIVE/completed student sessions and Phase 8 per-run records,
 * reusing every one of the functions above against the appropriate
 * directory/store rather than reimplementing listing/export/verify:
 *
 *   npx tsx scripts/research-cli.ts sessions list --kind=c0|c2 [--status=active|terminated] [--condition=C0]
 *   npx tsx scripts/research-cli.ts sessions show <kind> <sessionId>
 *   npx tsx scripts/research-cli.ts sessions verify <kind> <sessionId>
 *   npx tsx scripts/research-cli.ts sessions export <kind> <sessionId> <dataset> [--format=csv|jsonl]
 *   npx tsx scripts/research-cli.ts phase8 runs trackA [--batch=<id>]
 *   npx tsx scripts/research-cli.ts phase8 runs trackB [--batch=<id>]
 *   npx tsx scripts/research-cli.ts phase8 batch show <batchId>
 *   npx tsx scripts/research-cli.ts integrity report --kind=c0|c2
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
import { sessionArtifactsDir } from "@/research/storage/completedSessionArtifacts";
import { nonAdaptiveRiseSessionStore } from "@/tutoring/nonAdaptiveRiseSession/store";
import { adaptiveSessionStore } from "@/tutoring/adaptiveSession/store";
import { listTrackARunRecords, trackBRunsDir, loadBatchManifest } from "@/research/phase8/persistence";
import { listRunMetadata as listArtifactMetadata } from "@/research/artifact/persistence";

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
    case "sessions": {
      const [subcommand, ...subRest] = rest;
      const subPositional = subRest.filter((a) => !a.startsWith("--"));
      const subFlags = parseFlags(subRest);
      const storeOf = (kind: string) => {
        if (kind === "c0") return nonAdaptiveRiseSessionStore;
        if (kind === "c2") return adaptiveSessionStore;
        throw new Error(`Unknown session kind "${kind}" -- expected "c0" or "c2".`);
      };

      switch (subcommand) {
        case "list": {
          const kind = subFlags.kind ?? "c0";
          const store = storeOf(kind);
          const status = subFlags.status ?? "terminated";
          const rows = status === "active" ? store.listActive() : store.listCompleted({ conditionId: subFlags.condition });
          console.log(JSON.stringify(rows.map((r) => ({ sessionId: r.sessionId, conditionId: r.conditionId, participantId: r.participantId, status: r.status, startedAt: r.startedAt, completedAt: r.completedAt })), null, 2));
          console.log(`\n${rows.length} session(s).`);
          return;
        }
        case "show": {
          const [kind, sessionId] = subPositional;
          const store = storeOf(kind);
          const session = store.get(sessionId);
          if (!session) {
            console.error(`No ${kind} session "${sessionId}" found.`);
            process.exitCode = 1;
            return;
          }
          console.log(JSON.stringify({ session, events: store.getEvents(sessionId) }, null, 2));
          return;
        }
        case "verify": {
          const [kind, sessionId] = subPositional;
          console.log(JSON.stringify(verifyRun(sessionId, undefined, sessionArtifactsDir(kind as "c0" | "c2")), null, 2));
          return;
        }
        case "export": {
          const [kind, sessionId, dataset] = subPositional;
          const format = subFlags.format === "jsonl" ? "jsonl" : "csv";
          const dir = sessionArtifactsDir(kind as "c0" | "c2");
          const artifact = getRun(sessionId, dir);
          const questionsById = new Map(ALL_QUESTIONS.map((q) => [q.id, q]));
          switch (dataset) {
            case "run-summary":
              process.stdout.write(format === "csv" ? toCsv([summarizeRun(sessionId, dir)], RUN_SUMMARY_COLUMNS) : toJsonl([summarizeRun(sessionId, dir)]));
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
            default:
              console.error(`Unknown export dataset "${dataset ?? ""}" for a session export.`);
              process.exitCode = 1;
          }
          return;
        }
        default:
          console.error(`Unknown sessions subcommand "${subcommand ?? ""}". Expected one of: list, show, verify, export.`);
          process.exitCode = 1;
      }
      return;
    }
    case "phase8": {
      const [subcommand, sub2, ...subRest] = rest;
      const subFlags = parseFlags(subRest);
      if (subcommand === "runs" && sub2 === "trackA") {
        const records = listTrackARunRecords(subFlags.batch);
        console.log(JSON.stringify(records.map((r) => ({ runId: r.runId, familyConfig: r.familyConfig, world: r.world, sliceChapterId: r.sliceChapterId, contentDigest: r.contentDigest })), null, 2));
        console.log(`\n${records.length} Track A run(s).`);
        return;
      }
      if (subcommand === "runs" && sub2 === "trackB") {
        const metas = listArtifactMetadata(trackBRunsDir(subFlags.batch));
        console.log(JSON.stringify(metas, null, 2));
        console.log(`\n${metas.length} Track B run(s).`);
        return;
      }
      if (subcommand === "batch" && sub2 === "show") {
        const [batchId] = subRest.filter((a) => !a.startsWith("--"));
        const manifest = loadBatchManifest(batchId);
        if (!manifest) {
          console.error(`No batch manifest found for "${batchId}".`);
          process.exitCode = 1;
          return;
        }
        console.log(JSON.stringify(manifest, null, 2));
        return;
      }
      console.error(`Unknown phase8 subcommand. Expected "runs trackA", "runs trackB", or "batch show <batchId>".`);
      process.exitCode = 1;
      return;
    }
    case "integrity": {
      const [subcommand] = rest;
      const flags = parseFlags(rest);
      if (subcommand === "report") {
        const kind = (flags.kind ?? "c0") as "c0" | "c2";
        const dir = sessionArtifactsDir(kind);
        const metas = listArtifactMetadata(dir);
        const report = metas.map((m) => ({ runId: m.runId, ...verifyRun(m.runId, undefined, dir) }));
        console.log(JSON.stringify(report, null, 2));
        const failing = report.filter((r) => !r.contentDigestValid || !r.schemaVersionSupported);
        console.log(`\n${report.length} artifact(s) checked, ${failing.length} failing.`);
        return;
      }
      console.error(`Unknown integrity subcommand. Expected "report".`);
      process.exitCode = 1;
      return;
    }
    default:
      console.error(`Unknown command "${command ?? ""}". Expected one of: list, show, verify, export, compare, sessions, phase8, integrity.`);
      process.exitCode = 1;
  }
}

main();

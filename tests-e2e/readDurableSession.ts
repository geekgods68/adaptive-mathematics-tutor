/**
 * Stage 3 Part 16 helper: reads back a completed C0/C2 session's durable
 * SQLite record, research events, and Phase 6 artifact, and prints ONE
 * JSON object to stdout. Run via `npx tsx` (which resolves this repo's
 * `@/*` path aliases, unlike Playwright's own Node module loader when a
 * test file dynamically imports deep application source) from
 * researchDataAgreement.spec.ts, with RESEARCH_DB_PATH/
 * RESEARCH_SESSION_ARTIFACTS_ROOT already pointed at the same scratch
 * paths the browser's `next dev` server used.
 *
 * Usage: npx tsx tests-e2e/readDurableSession.ts <c0|c2> <sessionId>
 */
import { nonAdaptiveRiseSessionStore } from "@/tutoring/nonAdaptiveRiseSession/store";
import { adaptiveSessionStore } from "@/tutoring/adaptiveSession/store";
import { loadExperimentRunArtifact } from "@/research/artifact/persistence";
import { verifyArtifactIntegrity } from "@/research/artifact/integrity";
import { sessionArtifactsDir } from "@/research/storage/completedSessionArtifacts";
import { RISE_QUESTIONS } from "@/domain/rise";

const [kind, sessionId] = process.argv.slice(2);
if (kind !== "c0" && kind !== "c2") throw new Error(`Expected "c0" or "c2", got "${kind}"`);
if (!sessionId) throw new Error("Missing sessionId argument.");

const store = kind === "c0" ? nonAdaptiveRiseSessionStore : adaptiveSessionStore;
const stored = store.get(sessionId);
if (!stored) throw new Error(`No durable record found for session "${sessionId}" (kind ${kind}).`);

const events = store.getEvents(sessionId);
const artifact = loadExperimentRunArtifact(sessionId, sessionArtifactsDir(kind));
const integrity = verifyArtifactIntegrity(artifact, { currentQuestions: RISE_QUESTIONS });

console.log(
  JSON.stringify({
    status: stored.experimentState.status,
    conditionId: stored.experimentState.conditionId,
    responses: stored.experimentState.responses.map((r) => ({ questionId: r.questionId, isCorrect: r.isCorrect })),
    presentedQuestionIds: stored.experimentState.presentedQuestionIds,
    estimatorStates: stored.experimentState.estimatorStates,
    eventSeqs: events.map((e) => e.eventSeq),
    eventTypes: events.map((e) => e.eventType),
    eventSessionIdsMatch: events.every((e) => e.sessionId === sessionId),
    artifact: {
      runId: artifact.runId,
      conditionId: artifact.conditionId,
      finalEstimatorStates: artifact.finalEstimatorStates,
    },
    integrity,
  }),
);

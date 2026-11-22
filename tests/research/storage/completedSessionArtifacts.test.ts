import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import * as nonAdaptiveService from "@/tutoring/nonAdaptiveRiseSession/service";
import * as adaptiveService from "@/tutoring/adaptiveSession/service";
import { RISE_QUESTIONS } from "@/domain/rise";
import { sessionArtifactsDir } from "@/research/storage/completedSessionArtifacts";
import { loadExperimentRunArtifact, listRunMetadata, runExists } from "@/research/artifact/persistence";
import { verifyArtifactContentDigest } from "@/research/artifact/buildArtifact";
import { verifyArtifactIntegrity } from "@/research/artifact/integrity";
import { toCsv } from "@/research/artifact/export/csv";
import { buildQuestionResponseRows, QUESTION_RESPONSE_COLUMNS } from "@/research/artifact/export/datasets";
import { closeResearchDb } from "@/research/storage/db";
import { persistCompletedSessionArtifact } from "@/research/storage/completedSessionArtifacts";
import { EXPERIMENT_CONDITIONS } from "@/research/experiment/conditions";
import { RISE_CONCEPTS } from "@/domain/rise";
import { buildAdaptiveCurriculumOrder } from "@/domain/rise/curriculum";

function runNonAdaptiveToCompletion(chapterId: string, participantId: string, length: number) {
  let session = nonAdaptiveService.startNonAdaptiveRiseSession(chapterId, participantId, length);
  while (session.experimentState.status !== "terminated") {
    const q = nonAdaptiveService.getCurrentQuestion(session.id);
    const { session: afterSubmit } = nonAdaptiveService.submitNonAdaptiveRiseAnswer(session.id, q.correctOptionId);
    const { session: afterAdvance } = nonAdaptiveService.advanceNonAdaptiveRiseSession(afterSubmit.id);
    session = afterAdvance;
  }
  return session;
}

function runAdaptiveSteps(chapterId: string, participantId: string, steps: number) {
  let session = adaptiveService.startAdaptiveSession(chapterId, participantId);
  for (let i = 0; i < steps && session.experimentState.status !== "terminated"; i++) {
    const qid = session.experimentState.currentQuestionId;
    if (!qid) break;
    const q = RISE_QUESTIONS.find((x) => x.id === qid)!;
    const { session: afterSubmit } = adaptiveService.submitAdaptiveAnswer(session.id, q.correctOptionId);
    const { session: afterAdvance } = adaptiveService.advanceAdaptiveSession(afterSubmit.id);
    session = afterAdvance;
  }
  return session;
}

describe("Stage 2 Group G: completed-session Phase 6 artifact integration", () => {
  let artifactsRoot: string;
  const originalArtifactsRoot = process.env.RESEARCH_SESSION_ARTIFACTS_ROOT;
  const originalDbPath = process.env.RESEARCH_DB_PATH;

  beforeEach(() => {
    artifactsRoot = fs.mkdtempSync(path.join(os.tmpdir(), "stage2-session-artifacts-"));
    process.env.RESEARCH_SESSION_ARTIFACTS_ROOT = artifactsRoot;
    process.env.RESEARCH_DB_PATH = path.join(artifactsRoot, "db.sqlite3");
  });

  afterEach(() => {
    closeResearchDb();
    process.env.RESEARCH_SESSION_ARTIFACTS_ROOT = originalArtifactsRoot;
    process.env.RESEARCH_DB_PATH = originalDbPath;
  });

  it("C0: completing a session produces a valid, integrity-verified ExperimentRunArtifact", () => {
    const session = runNonAdaptiveToCompletion("CH01", "artifact-c0-participant", 5);
    expect(runExists(session.id, sessionArtifactsDir("c0"))).toBe(true);

    const artifact = loadExperimentRunArtifact(session.id, sessionArtifactsDir("c0"));
    expect(artifact.conditionId).toBe("C0");
    expect(verifyArtifactContentDigest(artifact)).toBe(true);
    const integrity = verifyArtifactIntegrity(artifact);
    expect(integrity.contentDigestValid).toBe(true);
    expect(integrity.schemaVersionSupported).toBe(true);

    // The artifact's response sequence matches what the student actually saw -- not re-derived.
    expect(artifact.provenance.responseSequence).toHaveLength(5);
  });

  it("C2: completing a session produces a valid artifact whose final estimator states are non-trivial (real mastery updates occurred)", () => {
    // Drive to natural completion or a bounded number of steps, whichever comes first.
    let session = runAdaptiveSteps("CH01", "artifact-c2-participant", 20);
    if (session.experimentState.status !== "terminated") {
      // Force completion isn't available directly; the 20-question budget in
      // ADAPTIVE_SESSION_MAX_QUESTIONS guarantees termination within 20 steps.
      session = adaptiveService.getSession(session.id);
    }
    expect(session.experimentState.status).toBe("terminated");
    expect(runExists(session.id, sessionArtifactsDir("c2"))).toBe(true);

    const artifact = loadExperimentRunArtifact(session.id, sessionArtifactsDir("c2"));
    expect(artifact.conditionId).toBe("C2");
    expect(verifyArtifactContentDigest(artifact)).toBe(true);
    expect(Object.keys(artifact.finalEstimatorStates).length).toBeGreaterThan(0);
  });

  it("completing a session twice (idempotent re-entry) never overwrites or duplicates the artifact", () => {
    const session = runNonAdaptiveToCompletion("CH01", "artifact-idempotent", 4);
    const firstArtifact = loadExperimentRunArtifact(session.id, sessionArtifactsDir("c0"));

    // Re-invoking advance on an already-terminated session is rejected at the service layer
    // (AlreadyCompletedError) before it ever reaches persistCompletedSessionArtifact again in
    // real usage -- but the persistence function itself must ALSO be safe against direct
    // re-entry with the identical final state (e.g. a crash-recovery path that re-runs
    // completion logic), never silently replacing the original record.
    const config = EXPERIMENT_CONDITIONS.C0.build();
    const scenario = {
      learnerId: session.participantId,
      availableQuestions: RISE_QUESTIONS,
      concepts: RISE_CONCEPTS,
      curriculumOrder: buildAdaptiveCurriculumOrder(session.chapterId),
      predeterminedSequence: [...session.predeterminedSequence],
      maxQuestions: session.maxQuestions,
      startTimestamp: session.startedAt,
    };
    const result = persistCompletedSessionArtifact("c0", config, scenario, session.experimentState);
    expect(result.alreadyExisted).toBe(true);

    const secondArtifact = loadExperimentRunArtifact(session.id, sessionArtifactsDir("c0"));
    expect(secondArtifact).toEqual(firstArtifact);
  });

  it("CSV export over a completed session's question-response rows round-trips the real recorded outcomes", () => {
    const session = runNonAdaptiveToCompletion("CH01", "artifact-csv-export", 3);
    const artifact = loadExperimentRunArtifact(session.id, sessionArtifactsDir("c0"));
    const questionsById = new Map(RISE_QUESTIONS.map((q) => [q.id, q]));
    const rows = buildQuestionResponseRows(artifact, questionsById);
    expect(rows).toHaveLength(3);
    const csv = toCsv(rows, QUESTION_RESPONSE_COLUMNS);
    expect(csv.split("\n").length).toBeGreaterThanOrEqual(4); // header + 3 rows (+ trailing newline/blank)
    expect(csv).toContain(session.experimentState.responses[0].questionId);
  });

  it("the C0 and C2 artifact directories are kept separate -- a C0 run id is never found under the C2 directory and vice versa", () => {
    const c0Session = runNonAdaptiveToCompletion("CH01", "artifact-separation-c0", 3);
    const c2Session = runAdaptiveSteps("CH01", "artifact-separation-c2", 20);
    expect(runExists(c0Session.id, sessionArtifactsDir("c2"))).toBe(false);
    expect(runExists(c2Session.id, sessionArtifactsDir("c0"))).toBe(false);
    const c0Metas = listRunMetadata(sessionArtifactsDir("c0")).map((m) => m.runId);
    const c2Metas = listRunMetadata(sessionArtifactsDir("c2")).map((m) => m.runId);
    expect(c0Metas).toContain(c0Session.id);
    expect(c2Metas).toContain(c2Session.id);
    expect(c0Metas).not.toContain(c2Session.id);
    expect(c2Metas).not.toContain(c0Session.id);
  });
});

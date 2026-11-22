import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import * as adaptiveService from "@/tutoring/adaptiveSession/service";
import { RISE_QUESTIONS } from "@/domain/rise";
import { closeResearchDb } from "@/research/storage/db";
import { loadExperimentRunArtifact } from "@/research/artifact/persistence";
import { sessionArtifactsDir } from "@/research/storage/completedSessionArtifacts";

/**
 * Stage 2 Part 6.3 ("Cross-session continuity") -- the authority/
 * reconciliation policy this implementation establishes and tests:
 *
 *   - SESSION continuity (resuming the SAME interrupted session id) is
 *     now durably server-authoritative: `adaptiveSessionStore`/
 *     `nonAdaptiveRiseSessionStore` (SQLite) are the single source of
 *     truth for any session that has not yet completed. The client
 *     holds no independent copy of an in-progress session's state.
 *
 *   - CROSS-session continuity (seeding a NEW session id from a prior
 *     COMPLETED session's mastery/exposure history) remains exactly the
 *     client-driven mechanism Phase G built
 *     (`src/lib/studentMasteryState.ts`/`studentQuestionHistory.ts`,
 *     `getPersistableMasteryStates`) -- unchanged by Stage 2. The two
 *     mechanisms never compete for the same role: the durable store
 *     never auto-resumes a prior session's mastery into a brand-new
 *     session id on its own.
 *
 *   - There is no divergence risk between the two because they read the
 *     SAME underlying number: `getPersistableMasteryStates` is a
 *     sanitized view over `session.experimentState.estimatorStates`,
 *     which is exactly what Layer C's completed-session artifact also
 *     records as `finalEstimatorStates`. This test demonstrates that
 *     equality directly, rather than merely asserting it by design.
 */
describe("Stage 2: cross-session continuity authority/reconciliation policy", () => {
  const originalDbPath = process.env.RESEARCH_DB_PATH;
  const originalArtifactsRoot = process.env.RESEARCH_SESSION_ARTIFACTS_ROOT;

  beforeEach(() => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "stage2-reconciliation-"));
    process.env.RESEARCH_DB_PATH = path.join(dir, "db.sqlite3");
    process.env.RESEARCH_SESSION_ARTIFACTS_ROOT = path.join(dir, "sessions");
  });

  afterEach(() => {
    closeResearchDb();
    process.env.RESEARCH_DB_PATH = originalDbPath;
    process.env.RESEARCH_SESSION_ARTIFACTS_ROOT = originalArtifactsRoot;
  });

  it("the client-facing persistable mastery snapshot matches the durably-persisted artifact's finalEstimatorStates, for the SAME completed session", () => {
    let session = adaptiveService.startAdaptiveSession("CH01", "reconciliation-participant");
    for (let i = 0; i < 20 && session.experimentState.status !== "terminated"; i++) {
      const qid = session.experimentState.currentQuestionId;
      if (!qid) break;
      const q = RISE_QUESTIONS.find((x) => x.id === qid)!;
      const { session: afterSubmit } = adaptiveService.submitAdaptiveAnswer(session.id, q.correctOptionId);
      const { session: afterAdvance } = adaptiveService.advanceAdaptiveSession(afterSubmit.id);
      session = afterAdvance;
    }
    expect(session.experimentState.status).toBe("terminated");

    const clientFacingSnapshot = adaptiveService.getPersistableMasteryStates(session.id);
    const artifact = loadExperimentRunArtifact(session.id, sessionArtifactsDir("c2"));

    for (const [conceptId, clientState] of Object.entries(clientFacingSnapshot)) {
      const serverFinal = artifact.finalEstimatorStates[conceptId] as { mastery: number; numObservations: number };
      expect(serverFinal).toBeDefined();
      expect(clientState.mastery).toBe(serverFinal.mastery);
      expect(clientState.numObservations).toBe(serverFinal.numObservations);
    }
  });

  it("starting a brand-new session id never auto-inherits a prior completed session's mastery unless the caller explicitly passes it (cross-session continuity stays an explicit, client-driven action)", () => {
    let priorSession = adaptiveService.startAdaptiveSession("CH01", "reconciliation-prior");
    for (let i = 0; i < 5; i++) {
      const qid = priorSession.experimentState.currentQuestionId;
      if (!qid) break;
      const q = RISE_QUESTIONS.find((x) => x.id === qid)!;
      const { session: afterSubmit } = adaptiveService.submitAdaptiveAnswer(priorSession.id, q.correctOptionId);
      const { session: afterAdvance } = adaptiveService.advanceAdaptiveSession(afterSubmit.id);
      priorSession = afterAdvance;
      if (priorSession.experimentState.status === "terminated") break;
    }
    expect(Object.keys(priorSession.experimentState.estimatorStates).length).toBeGreaterThan(0);

    const freshSession = adaptiveService.startAdaptiveSession("CH01", "reconciliation-fresh-no-continuity");
    expect(freshSession.experimentState.estimatorStates).toEqual({});
  });
});

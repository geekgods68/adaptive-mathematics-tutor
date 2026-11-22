import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import * as adaptiveService from "@/tutoring/adaptiveSession/service";
import { RISE_QUESTIONS } from "@/domain/rise";
import { closeResearchDb } from "@/research/storage/db";

/**
 * Stage 3 Priority 2 (mastery-state duplication fix) — the server-side
 * half of the single-authority design (src/lib/masteryAuthority.ts is the
 * client-side half). `getAuthoritativeMasteryForParticipant` must:
 *   1. Scope strictly to the exact participant id given (no cross-
 *      participant leakage — this is also the security property Priority
 *      2 explicitly required: "do not implement insecure cross-user
 *      access").
 *   2. Pick the MOST RECENTLY completed session when a participant has
 *      more than one.
 *   3. Return undefined (never a fabricated empty/zero mastery) for a
 *      participant with no durably completed adaptive session.
 */
function runToCompletion(chapterId: string, participantId: string) {
  let session = adaptiveService.startAdaptiveSession(chapterId, participantId);
  for (let i = 0; i < 20 && session.experimentState.status !== "terminated"; i++) {
    const qid = session.experimentState.currentQuestionId;
    if (!qid) break;
    const q = RISE_QUESTIONS.find((x) => x.id === qid)!;
    const { session: afterSubmit } = adaptiveService.submitAdaptiveAnswer(session.id, q.correctOptionId);
    const { session: afterAdvance } = adaptiveService.advanceAdaptiveSession(afterSubmit.id);
    session = afterAdvance;
  }
  expect(session.experimentState.status).toBe("terminated");
  return session;
}

describe("getAuthoritativeMasteryForParticipant — Stage 3 Priority 2 server-side authority", () => {
  const originalDbPath = process.env.RESEARCH_DB_PATH;
  const originalArtifactsRoot = process.env.RESEARCH_SESSION_ARTIFACTS_ROOT;

  beforeEach(() => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "stage3-authoritative-mastery-"));
    process.env.RESEARCH_DB_PATH = path.join(dir, "db.sqlite3");
    process.env.RESEARCH_SESSION_ARTIFACTS_ROOT = path.join(dir, "sessions");
  });

  afterEach(() => {
    closeResearchDb();
    process.env.RESEARCH_DB_PATH = originalDbPath;
    process.env.RESEARCH_SESSION_ARTIFACTS_ROOT = originalArtifactsRoot;
  });

  it("returns undefined for a participant with no durably completed session", () => {
    expect(adaptiveService.getAuthoritativeMasteryForParticipant("nobody-ever-completed-anything")).toBeUndefined();
  });

  it("never leaks another participant's completed-session mastery", () => {
    runToCompletion("CH01", "participant-alpha");
    runToCompletion("CH02", "participant-beta");

    const alpha = adaptiveService.getAuthoritativeMasteryForParticipant("participant-alpha");
    const beta = adaptiveService.getAuthoritativeMasteryForParticipant("participant-beta");
    expect(alpha).toBeDefined();
    expect(beta).toBeDefined();
    expect(alpha!.fromSessionId).not.toBe(beta!.fromSessionId);
    // Alpha only ever practised CH01 concepts; beta only CH02 -- confirms no cross-contamination of
    // which concepts even appear, not just which numeric values.
    const alphaConceptIds = new Set(Object.keys(alpha!.persistableStates));
    const betaConceptIds = new Set(Object.keys(beta!.persistableStates));
    for (const id of alphaConceptIds) expect(betaConceptIds.has(id)).toBe(false);
  });

  it("picks the MOST RECENTLY completed session when a participant has completed more than one", () => {
    const participantId = "participant-repeat-practice";
    const first = runToCompletion("CH01", participantId);
    const second = runToCompletion("CH01", participantId);
    expect(first.id).not.toBe(second.id);

    const authoritative = adaptiveService.getAuthoritativeMasteryForParticipant(participantId);
    expect(authoritative).toBeDefined();
    expect(authoritative!.fromSessionId).toBe(second.id);
  });
});

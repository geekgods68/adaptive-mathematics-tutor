import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import * as service from "@/tutoring/nonAdaptiveRiseSession/service";
import { closeResearchDb } from "@/research/storage/db";

/**
 * Stage 2 Part 5 ("Preserve non-adaptive behavior"): the Stage 1
 * performance-independence property (same config/seed, opposite
 * response patterns -> identical sequence) must survive being routed
 * through durable storage AND a genuine process-restart boundary, not
 * just in-memory object reconstruction.
 */
function tempDbPath(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "stage2-nonadaptive-restart-"));
  return path.join(dir, "research.sqlite3");
}

describe("Stage 2: non-adaptive-RISE performance independence survives a durable-storage restart boundary", () => {
  const originalPath = process.env.RESEARCH_DB_PATH;

  beforeEach(() => {
    process.env.RESEARCH_DB_PATH = tempDbPath();
  });

  afterEach(() => {
    closeResearchDb();
    process.env.RESEARCH_DB_PATH = originalPath;
  });

  it("two sessions with the same seed/config but opposite response patterns remain IDENTICAL after a restart partway through", () => {
    const length = 8;
    const a = service.startNonAdaptiveRiseSession("CH01", "restart-participant-allcorrect", length);
    const b = service.startNonAdaptiveRiseSession("CH01", "restart-participant-allcorrect", length);

    function runHalf(id: string, pattern: "correct" | "incorrect", steps: number): string[] {
      const presented: string[] = [];
      let sessionId = id;
      for (let i = 0; i < steps; i++) {
        const session = service.getSession(sessionId);
        if (session.experimentState.status === "terminated") break;
        presented.push(session.experimentState.currentQuestionId!);
        const question = service.getCurrentQuestion(sessionId);
        const wrongOption = question.options.find((o) => !o.isCorrect)!;
        const selected = pattern === "correct" ? question.correctOptionId : wrongOption.id;
        service.submitNonAdaptiveRiseAnswer(sessionId, selected);
        const { session: advanced } = service.advanceNonAdaptiveRiseSession(sessionId);
        sessionId = advanced.id;
      }
      return presented;
    }

    const presentedAFirstHalf = runHalf(a.id, "correct", 4);
    const presentedBFirstHalf = runHalf(b.id, "incorrect", 4);
    expect(presentedAFirstHalf).toEqual(presentedBFirstHalf);

    // Simulate a server restart in the middle of both sessions.
    closeResearchDb();

    const presentedASecondHalf = runHalf(a.id, "correct", 4);
    const presentedBSecondHalf = runHalf(b.id, "incorrect", 4);
    expect(presentedASecondHalf).toEqual(presentedBSecondHalf);
    expect([...presentedAFirstHalf, ...presentedASecondHalf]).toHaveLength(length);
  });

  it("the restored session's underlying predetermined sequence is unchanged by the restart (not recomputed from response history)", () => {
    const a = service.startNonAdaptiveRiseSession("CH01", "restart-sequence-check", 6);
    const question = service.getCurrentQuestion(a.id);
    service.submitNonAdaptiveRiseAnswer(a.id, question.options.find((o) => !o.isCorrect)!.id);
    service.advanceNonAdaptiveRiseSession(a.id);

    closeResearchDb();

    const reloaded = service.getSession(a.id);
    expect(reloaded.predeterminedSequence[0]).toBe(a.experimentState.currentQuestionId);
    expect(reloaded.predeterminedSequence).toEqual(a.predeterminedSequence);
  });
});

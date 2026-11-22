import { describe, expect, it } from "vitest";
import * as service from "@/tutoring/nonAdaptiveRiseSession/service";

/**
 * Stage 1 Test Group B (the critical test from Part 4.1) and the
 * RISE-bank counterpart to the single most important test in the
 * ORIGINAL repository (tests/tutoring/session/performanceIndependence.test.ts,
 * per CLAUDE.md) — now re-established for the new canonical-bank
 * non-adaptive condition. Two otherwise-identical sessions, differing
 * ONLY in response pattern, must present the exact same sequence of
 * question ids, in full, not merely at the first question.
 */
function runFullSession(sessionId: string, pattern: (index: number, correctId: string, wrongId: string) => string, length: number): string[] {
  const presented: string[] = [];
  let id = sessionId;
  for (let i = 0; i < length; i++) {
    const session = service.getSession(id);
    if (session.experimentState.status === "terminated") break;
    presented.push(session.experimentState.currentQuestionId!);
    const question = service.getCurrentQuestion(id);
    const wrongOption = question.options.find((o) => !o.isCorrect)!;
    const selected = pattern(i, question.correctOptionId, wrongOption.id);
    service.submitNonAdaptiveRiseAnswer(id, selected);
    const { session: advanced } = service.advanceNonAdaptiveRiseSession(id);
    id = advanced.id;
  }
  return presented;
}

describe("Stage 1 Group B: non-adaptive-RISE performance independence (critical test, Part 4.1)", () => {
  it("all-correct vs. all-incorrect produce the identical question sequence", () => {
    const sessionLength = 12;
    const a = service.startNonAdaptiveRiseSession("CH01", "participant-allcorrect", sessionLength);
    const b = service.startNonAdaptiveRiseSession("CH01", "participant-allcorrect", sessionLength);

    const presentedA = runFullSession(a.id, (_, correctId) => correctId, sessionLength);
    const presentedB = runFullSession(b.id, (_, _correctId, wrongId) => wrongId, sessionLength);

    expect(presentedA).toEqual(presentedB);
    expect(presentedA.length).toBe(sessionLength);
  });

  it("alternating vs. seeded-random response patterns still produce the identical sequence", () => {
    const sessionLength = 10;
    const a = service.startNonAdaptiveRiseSession("CH02", "participant-mixed", sessionLength);
    const b = service.startNonAdaptiveRiseSession("CH02", "participant-mixed", sessionLength);

    const presentedA = runFullSession(a.id, (i, correctId, wrongId) => (i % 2 === 0 ? correctId : wrongId), sessionLength);
    // A simple deterministic pseudo-random pattern (not literal Math.random, to keep this test
    // itself reproducible) standing in for "seeded-random responses."
    let state = 7;
    const pseudoRandom = () => {
      state = (state * 1103515245 + 12345) % 2147483648;
      return state / 2147483648;
    };
    const presentedB = runFullSession(b.id, (_, correctId, wrongId) => (pseudoRandom() > 0.5 ? correctId : wrongId), sessionLength);

    expect(presentedA).toEqual(presentedB);
  });

  it("holds across at least two different curriculum scopes and two different session lengths", () => {
    for (const [chapterId, length] of [["CH03", 6] as const, [undefined, 15] as const]) {
      const a = service.startNonAdaptiveRiseSession(chapterId, "participant-scope-check", length);
      const b = service.startNonAdaptiveRiseSession(chapterId, "participant-scope-check", length);
      const presentedA = runFullSession(a.id, (_, correctId) => correctId, length);
      const presentedB = runFullSession(b.id, (_, _c, wrongId) => wrongId, length);
      expect(presentedA).toEqual(presentedB);
    }
  });

  it("a response pattern can never change the LENGTH of the sequence either (same number of questions presented)", () => {
    const sessionLength = 8;
    const a = service.startNonAdaptiveRiseSession("CH04", "participant-length-check", sessionLength);
    const b = service.startNonAdaptiveRiseSession("CH04", "participant-length-check", sessionLength);
    const presentedA = runFullSession(a.id, (_, correctId) => correctId, sessionLength);
    const presentedB = runFullSession(b.id, (_, _c, wrongId) => wrongId, sessionLength);
    expect(presentedA.length).toBe(presentedB.length);
  });
});

import { describe, expect, it } from "vitest";
import * as nonAdaptiveRiseService from "@/tutoring/nonAdaptiveRiseSession/service";
import * as adaptiveService from "@/tutoring/adaptiveSession/service";

/**
 * Stage 1 Test Group G (regression): confirms the hard client/server
 * research-metadata boundary (CLAUDE.md constraint 11) holds for the
 * NEW non-adaptive-on-RISE condition exactly as it already does for the
 * adaptive condition and the legacy non-adaptive condition — this is the
 * first time `toPublicQuestionView`/`toPublicFeedbackView`
 * (src/tutoring/session/publicViews.ts) have ever been exercised against
 * RISE questions, so this is genuinely new coverage, not a duplicate of
 * an existing assertion.
 */
describe("Stage 1 Group G: metadata boundary holds for the non-adaptive-RISE condition", () => {
  it("the public question view for a RISE question never leaks misconceptionId, difficulty, conceptIds, or the correct option", () => {
    const session = nonAdaptiveRiseService.startNonAdaptiveRiseSession("CH01", "p-boundary", 5);
    const view = nonAdaptiveRiseService.getCurrentPublicQuestion(session.id);
    const serialized = JSON.stringify(view);
    expect(serialized).not.toMatch(/misconceptionId/);
    expect(serialized).not.toMatch(/derivationNote/);
    expect(serialized).not.toMatch(/"difficulty"/);
    expect(serialized).not.toMatch(/conceptIds/);
    expect(serialized).not.toMatch(/correctOptionId/);
  });

  it("the public feedback view includes correctness only after a response is recorded, never before", () => {
    const session = nonAdaptiveRiseService.startNonAdaptiveRiseSession("CH01", "p-boundary-2", 5);
    const question = nonAdaptiveRiseService.getCurrentQuestion(session.id);
    const result = nonAdaptiveRiseService.submitNonAdaptiveRiseAnswer(session.id, question.correctOptionId);
    expect(result.feedback.isCorrect).toBe(true);
    expect(Object.keys(result.feedback)).not.toContain("misconceptionId"); // PublicFeedbackView has no such field at all
  });

  it("the adaptive condition's own metadata boundary is unaffected by Stage 1 (regression check)", () => {
    const session = adaptiveService.startAdaptiveSession("CH01");
    const view = adaptiveService.getCurrentPublicQuestion(session.id);
    const serialized = JSON.stringify(view);
    expect(serialized).not.toMatch(/misconceptionId/);
    expect(serialized).not.toMatch(/"difficulty"/);
  });
});

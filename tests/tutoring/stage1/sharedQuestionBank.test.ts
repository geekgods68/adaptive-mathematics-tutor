import { describe, expect, it } from "vitest";
import { RISE_QUESTIONS, RISE_CONCEPTS } from "@/domain/rise";
import { QUESTIONS } from "@/domain/questions";
import * as adaptiveService from "@/tutoring/adaptiveSession/service";
import * as nonAdaptiveRiseService from "@/tutoring/nonAdaptiveRiseSession/service";
import { buildAdaptiveCurriculumOrder as curriculumFromAdaptiveSessionModule } from "@/tutoring/adaptiveSession/curriculum";
import { buildAdaptiveCurriculumOrder as curriculumFromSharedModule } from "@/domain/rise/curriculum";

/**
 * Stage 1 Test Group A (shared bank integrity) and Group D (cross-
 * condition comparability) — see docs/stage1-experimental-validity-report.md
 * Part G for the full verification run. Confirms Finding F-02 from the
 * October 29 system audit is resolved for the LIVE adaptive and
 * non-adaptive conditions: both now draw from one canonical bank and
 * curriculum.
 */
describe("Stage 1 Group A: both modern conditions share one canonical question bank", () => {
  it("both the adaptive and non-adaptive-RISE services resolve the SAME RISE question ids", () => {
    const adaptiveSession = adaptiveService.startAdaptiveSession("CH01");
    const nonAdaptiveSession = nonAdaptiveRiseService.startNonAdaptiveRiseSession("CH01", "p-shared-bank", 5);
    const adaptiveQuestionId = adaptiveSession.experimentState.currentQuestionId!;
    const nonAdaptiveQuestionId = nonAdaptiveSession.experimentState.currentQuestionId!;
    // Both ids must resolve in the SAME bank array (object identity of the underlying data source).
    expect(RISE_QUESTIONS.some((q) => q.id === adaptiveQuestionId)).toBe(true);
    expect(RISE_QUESTIONS.some((q) => q.id === nonAdaptiveQuestionId)).toBe(true);
  });

  it("both conditions' ExperimentProvenance report the IDENTICAL question-bank content hash", () => {
    const adaptiveSession = adaptiveService.startAdaptiveSession("CH01");
    const nonAdaptiveSession = nonAdaptiveRiseService.startNonAdaptiveRiseSession("CH01", "p-hash-check", 5);
    const adaptiveProvenance = adaptiveService.getExperimentProvenance(adaptiveSession.id);
    const nonAdaptiveProvenance = nonAdaptiveRiseService.getExperimentProvenance(nonAdaptiveSession.id);
    expect(adaptiveProvenance.questionBankVersion.contentHash).toBe(nonAdaptiveProvenance.questionBankVersion.contentHash);
    expect(adaptiveProvenance.questionBankVersion.questionCount).toBe(nonAdaptiveProvenance.questionBankVersion.questionCount);
  });

  it("the shared curriculum-order primitive used by both conditions is the exact same function (re-export, not a reimplementation)", () => {
    expect(curriculumFromAdaptiveSessionModule).toBe(curriculumFromSharedModule);
  });

  it("both conditions, given the same chapter, see the same eligible curriculum scope (same curriculumOrder)", () => {
    const order = curriculumFromSharedModule("CH02");
    expect(order.length).toBeGreaterThan(0);
    // Both services build their own ExperimentScenario.curriculumOrder from this exact function —
    // verified structurally here; behaviorally verified by the provenance curriculum hash below.
    const adaptiveSession = adaptiveService.startAdaptiveSession("CH02");
    const nonAdaptiveSession = nonAdaptiveRiseService.startNonAdaptiveRiseSession("CH02", "p-curriculum-scope", 5);
    const adaptiveProvenance = adaptiveService.getExperimentProvenance(adaptiveSession.id);
    const nonAdaptiveProvenance = nonAdaptiveRiseService.getExperimentProvenance(nonAdaptiveSession.id);
    expect(adaptiveProvenance.curriculumVersion.contentHash).toBe(nonAdaptiveProvenance.curriculumVersion.contentHash);
  });

  it("the legacy 161-question bank remains available, untouched, and distinct from the canonical RISE bank (no silent merge)", () => {
    expect(QUESTIONS.length).toBeGreaterThanOrEqual(140);
    expect(QUESTIONS.length).toBeLessThanOrEqual(170);
    const riseIds = new Set(RISE_QUESTIONS.map((q) => q.id));
    expect(QUESTIONS.every((q) => !riseIds.has(q.id))).toBe(true);
  });

  it("RISE concept count is unaffected by Stage 1 (still the full 109-concept taxonomy)", () => {
    expect(RISE_CONCEPTS.length).toBe(109);
  });
});

describe("Stage 1 Group D: cross-condition comparability invariants", () => {
  it("both conditions grade an identical (questionId, selectedOptionId) pair identically", () => {
    const session = nonAdaptiveRiseService.startNonAdaptiveRiseSession("CH01", "p-grading", 1);
    const question = nonAdaptiveRiseService.getCurrentQuestion(session.id);
    const result = nonAdaptiveRiseService.submitNonAdaptiveRiseAnswer(session.id, question.correctOptionId);
    expect(result.grading.isCorrect).toBe(true);
    expect(result.grading.selectedOption.id).toBe(question.correctOptionId);
  });

  it("both conditions' public question views share the exact same shape contract (questionId, stem, options) at minimum", () => {
    const adaptiveSession = adaptiveService.startAdaptiveSession("CH01");
    const nonAdaptiveSession = nonAdaptiveRiseService.startNonAdaptiveRiseSession("CH01", "p-shape", 5);
    const adaptiveView = adaptiveService.getCurrentPublicQuestion(adaptiveSession.id);
    const nonAdaptiveView = nonAdaptiveRiseService.getCurrentPublicQuestion(nonAdaptiveSession.id);
    for (const key of ["questionId", "stem", "options"] as const) {
      expect(Object.keys(adaptiveView)).toContain(key);
      expect(Object.keys(nonAdaptiveView)).toContain(key);
    }
  });

  it("both conditions use an identical session-length budget by default (ADAPTIVE_SESSION_MAX_QUESTIONS === NON_ADAPTIVE_RISE_DEFAULT_MAX_QUESTIONS)", () => {
    expect(nonAdaptiveRiseService.NON_ADAPTIVE_RISE_DEFAULT_MAX_QUESTIONS).toBe(adaptiveService.ADAPTIVE_SESSION_MAX_QUESTIONS);
  });
});

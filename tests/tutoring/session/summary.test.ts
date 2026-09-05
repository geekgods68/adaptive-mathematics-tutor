import { describe, expect, it } from "vitest";
import { computeResearchSessionSummary, computeStudentFacingSummary } from "@/tutoring/session/summary";
import type { ActiveTutorSession, TutorResponse } from "@/tutoring/session/types";
import { QUESTIONS } from "@/domain/questions";

function makeResponse(overrides: Partial<TutorResponse>): TutorResponse {
  return {
    questionId: "q-x",
    selectedOptionId: "o1",
    correctOptionId: "o1",
    isCorrect: true,
    presentedAt: "2026-01-01T00:00:00.000Z",
    submittedAt: "2026-01-01T00:00:05.000Z",
    responseTimeMs: 5000,
    ...overrides,
  };
}

function makeSession(responses: TutorResponse[]): ActiveTutorSession {
  return {
    id: "s1",
    participantId: "p1",
    condition: "non_adaptive",
    startedAt: "2026-01-01T00:00:00.000Z",
    presentedQuestionIds: responses.map((r) => r.questionId),
    sequence: responses.map((r) => r.questionId),
    currentPosition: responses.length,
    currentQuestionPresentedAt: "2026-01-01T00:00:00.000Z",
    responses,
    status: "active",
  };
}

describe("computeStudentFacingSummary", () => {
  it("computes total, correct, and accuracy for a mixed session", () => {
    const session = makeSession([
      makeResponse({ isCorrect: true }),
      makeResponse({ isCorrect: false }),
      makeResponse({ isCorrect: true }),
    ]);
    const summary = computeStudentFacingSummary(session);
    expect(summary.totalQuestions).toBe(3);
    expect(summary.correctAnswers).toBe(2);
    expect(summary.accuracy).toBeCloseTo(2 / 3);
  });

  it("returns 0 accuracy for a session with no responses, without dividing by zero", () => {
    const summary = computeStudentFacingSummary(makeSession([]));
    expect(summary.totalQuestions).toBe(0);
    expect(summary.accuracy).toBe(0);
  });

  it("never includes difficulty, concept, or misconception detail", () => {
    const summary = computeStudentFacingSummary(makeSession([makeResponse({})]));
    expect(Object.keys(summary).sort()).toEqual(["accuracy", "correctAnswers", "totalQuestions"]);
  });
});

describe("computeResearchSessionSummary", () => {
  it("does not affect or read session sequencing (pure function over already-recorded responses)", () => {
    const session = makeSession([makeResponse({ questionId: QUESTIONS[0].id, isCorrect: true })]);
    const before = JSON.stringify(session);
    computeResearchSessionSummary(session, QUESTIONS);
    expect(JSON.stringify(session)).toBe(before);
  });

  it("computes average response time correctly", () => {
    const session = makeSession([
      makeResponse({ questionId: QUESTIONS[0].id, responseTimeMs: 1000 }),
      makeResponse({ questionId: QUESTIONS[1].id, responseTimeMs: 3000 }),
    ]);
    const summary = computeResearchSessionSummary(session, QUESTIONS);
    expect(summary.averageResponseTimeMs).toBe(2000);
  });

  it("breaks down performance by concept and by difficulty", () => {
    const q1 = QUESTIONS[0];
    const q2 = QUESTIONS[1];
    const session = makeSession([
      makeResponse({ questionId: q1.id, isCorrect: true }),
      makeResponse({ questionId: q1.id, isCorrect: false }),
      makeResponse({ questionId: q2.id, isCorrect: true }),
    ]);
    const summary = computeResearchSessionSummary(session, QUESTIONS);

    expect(summary.performanceByConcept[q1.primaryConceptId].attempts).toBe(2);
    expect(summary.performanceByConcept[q1.primaryConceptId].correct).toBe(1);
    expect(summary.performanceByDifficulty[q1.difficulty].attempts).toBeGreaterThanOrEqual(1);
  });

  it("counts misconception evidence by id", () => {
    const questionWithMisconception = QUESTIONS.find((q) => q.options.some((o) => o.misconceptionId))!;
    const misconceptionId = questionWithMisconception.options.find((o) => o.misconceptionId)!.misconceptionId!;

    const session = makeSession([
      makeResponse({ questionId: questionWithMisconception.id, isCorrect: false, misconceptionId }),
      makeResponse({ questionId: questionWithMisconception.id, isCorrect: false, misconceptionId }),
    ]);
    const summary = computeResearchSessionSummary(session, QUESTIONS);
    expect(summary.misconceptionEvidenceCounts[misconceptionId]).toBe(2);
  });

  it("returns zeroed fields for a session with no responses", () => {
    const summary = computeResearchSessionSummary(makeSession([]), QUESTIONS);
    expect(summary.totalQuestions).toBe(0);
    expect(summary.accuracy).toBe(0);
    expect(summary.averageResponseTimeMs).toBe(0);
  });
});

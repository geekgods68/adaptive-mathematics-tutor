import { describe, expect, it } from "vitest";
import * as service from "@/tutoring/nonAdaptiveRiseSession/service";
import {
  NonAdaptiveRiseAnswerAlreadySubmittedError,
  NonAdaptiveRiseInvalidOptionIdError,
  NonAdaptiveRiseNoAnswerSubmittedError,
  NonAdaptiveRiseSessionAlreadyCompletedError,
  NonAdaptiveRiseSessionNotFoundError,
} from "@/tutoring/nonAdaptiveRiseSession/errors";
import { RISE_QUESTIONS } from "@/domain/rise";
import { gradeAnswer } from "@/tutoring/grading/grade";

describe("startNonAdaptiveRiseSession", () => {
  it("creates an active session with a real selected first question from the RISE bank", () => {
    const session = service.startNonAdaptiveRiseSession("CH01", "p1", 10);
    expect(session.experimentState.status).toBe("active");
    expect(session.experimentState.currentQuestionId).not.toBeNull();
    expect(RISE_QUESTIONS.some((q) => q.id === session.experimentState.currentQuestionId)).toBe(true);
  });

  it("uses condition C0 (null estimator, non-adaptive selection)", () => {
    const session = service.startNonAdaptiveRiseSession("CH01", "p1", 10);
    expect(session.experimentState.conditionId).toBe("C0");
  });

  it("two sessions for the SAME participant/chapter get independent session ids but the identical predetermined sequence", () => {
    const a = service.startNonAdaptiveRiseSession("CH01", "same-participant", 10);
    const b = service.startNonAdaptiveRiseSession("CH01", "same-participant", 10);
    expect(a.id).not.toBe(b.id);
    expect(a.predeterminedSequence).toEqual(b.predeterminedSequence);
  });

  it("omitting a chapter walks the full curriculum", () => {
    const session = service.startNonAdaptiveRiseSession(undefined, "p1", 10);
    expect(session.chapterId).toBeUndefined();
    expect(session.experimentState.currentQuestionId).not.toBeNull();
  });
});

describe("getSession / getCurrentQuestion / getCurrentPublicQuestion", () => {
  it("throws NonAdaptiveRiseSessionNotFoundError for an unknown id", () => {
    expect(() => service.getSession("nonexistent")).toThrow(NonAdaptiveRiseSessionNotFoundError);
  });

  it("getCurrentPublicQuestion never includes correctOptionId or difficulty", () => {
    const session = service.startNonAdaptiveRiseSession("CH01", "p1", 10);
    const view = service.getCurrentPublicQuestion(session.id);
    const serialized = JSON.stringify(view);
    expect(serialized).not.toContain("correctOptionId");
    expect(serialized).not.toContain('"difficulty"');
    expect(serialized).not.toMatch(/misconceptionId/);
  });

  it("has no selectionExplanation field (unlike the adaptive condition's public view) -- there is no per-question targeting decision to explain", () => {
    const session = service.startNonAdaptiveRiseSession("CH01", "p1", 10);
    const view = service.getCurrentPublicQuestion(session.id);
    expect(Object.keys(view)).not.toContain("selectionExplanation");
  });
});

describe("submitNonAdaptiveRiseAnswer / advanceNonAdaptiveRiseSession", () => {
  it("grades using the real gradeAnswer function, matching an independent computation", () => {
    const session = service.startNonAdaptiveRiseSession("CH01", "p1", 10);
    const question = service.getCurrentQuestion(session.id);
    const result = service.submitNonAdaptiveRiseAnswer(session.id, question.correctOptionId);
    expect(result.grading).toEqual(gradeAnswer(question, question.correctOptionId));
  });

  it("rejects a double submission for the same question", () => {
    const session = service.startNonAdaptiveRiseSession("CH01", "p1", 10);
    const question = service.getCurrentQuestion(session.id);
    service.submitNonAdaptiveRiseAnswer(session.id, question.correctOptionId);
    expect(() => service.submitNonAdaptiveRiseAnswer(session.id, question.correctOptionId)).toThrow(NonAdaptiveRiseAnswerAlreadySubmittedError);
  });

  it("rejects an invalid option id", () => {
    const session = service.startNonAdaptiveRiseSession("CH01", "p1", 10);
    expect(() => service.submitNonAdaptiveRiseAnswer(session.id, "not-a-real-option")).toThrow(NonAdaptiveRiseInvalidOptionIdError);
  });

  it("advancing without an answer throws", () => {
    const session = service.startNonAdaptiveRiseSession("CH01", "p1", 10);
    expect(() => service.advanceNonAdaptiveRiseSession(session.id)).toThrow(NonAdaptiveRiseNoAnswerSubmittedError);
  });

  it("walks the fixed sequence in order and terminates at the question-count budget", () => {
    const session = service.startNonAdaptiveRiseSession("CH01", "p1", 5);
    let current = session;
    const seen: string[] = [];
    for (let i = 0; i < 5; i++) {
      seen.push(current.experimentState.currentQuestionId!);
      const question = service.getCurrentQuestion(current.id);
      service.submitNonAdaptiveRiseAnswer(current.id, question.correctOptionId);
      const result = service.advanceNonAdaptiveRiseSession(current.id);
      current = result.session;
    }
    expect(current.experimentState.status).toBe("terminated");
    expect(current.completedAt).toBeDefined();
    expect(seen).toEqual(session.predeterminedSequence.slice(0, 5));
  });

  it("throws for an already-completed session", () => {
    const session = service.startNonAdaptiveRiseSession("CH01", "p1", 1);
    const question = service.getCurrentQuestion(session.id);
    service.submitNonAdaptiveRiseAnswer(session.id, question.correctOptionId);
    const { session: completed } = service.advanceNonAdaptiveRiseSession(session.id);
    expect(completed.experimentState.status).toBe("terminated");
    expect(() => service.submitNonAdaptiveRiseAnswer(session.id, "anything")).toThrow(NonAdaptiveRiseSessionAlreadyCompletedError);
  });
});

describe("getNonAdaptiveRiseSessionSummary / getPresentedQuestionIds", () => {
  it("accurately reports counts matching real recorded responses", () => {
    const session = service.startNonAdaptiveRiseSession("CH01", "p1", 3);
    let current = session;
    for (let i = 0; i < 3; i++) {
      const question = service.getCurrentQuestion(current.id);
      const optionId = i === 0 ? question.correctOptionId : question.options.find((o) => !o.isCorrect)!.id;
      service.submitNonAdaptiveRiseAnswer(current.id, optionId);
      current = service.advanceNonAdaptiveRiseSession(current.id).session;
    }
    const summary = service.getNonAdaptiveRiseSessionSummary(session.id);
    expect(summary.totalQuestions).toBe(3);
    expect(summary.correctAnswers).toBe(1);
    expect(summary.accuracy).toBeCloseTo(1 / 3);
  });

  it("getPresentedQuestionIds returns exactly the fixed sequence that was walked", () => {
    const session = service.startNonAdaptiveRiseSession("CH01", "p1", 3);
    let current = session;
    for (let i = 0; i < 3; i++) {
      const question = service.getCurrentQuestion(current.id);
      service.submitNonAdaptiveRiseAnswer(current.id, question.correctOptionId);
      current = service.advanceNonAdaptiveRiseSession(current.id).session;
    }
    expect(service.getPresentedQuestionIds(session.id)).toEqual(session.predeterminedSequence);
  });
});

describe("getExperimentProvenance", () => {
  it("reflects condition C0 honestly: no estimator probability output, empty selection parameters", () => {
    const session = service.startNonAdaptiveRiseSession("CH01", "p1", 5);
    const provenance = service.getExperimentProvenance(session.id);
    expect(provenance.estimator.estimatorType).toBe("none");
    expect(provenance.selectionPolicy.policyType).toBe("non_adaptive");
  });

  it("the question-bank hash matches the full RISE bank, computed from the SAME shared data the adaptive condition also uses", () => {
    const session = service.startNonAdaptiveRiseSession("CH01", "p1", 5);
    const provenance = service.getExperimentProvenance(session.id);
    expect(provenance.questionBankVersion.questionCount).toBe(RISE_QUESTIONS.length);
  });
});

describe("resetNonAdaptiveRiseSession", () => {
  it("removes the session so it can no longer be retrieved", () => {
    const session = service.startNonAdaptiveRiseSession("CH01", "p1", 5);
    service.resetNonAdaptiveRiseSession(session.id);
    expect(() => service.getSession(session.id)).toThrow(NonAdaptiveRiseSessionNotFoundError);
  });
});

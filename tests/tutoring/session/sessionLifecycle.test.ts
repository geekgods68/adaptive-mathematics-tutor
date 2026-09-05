import { describe, expect, it } from "vitest";
import {
  advanceSession,
  getCurrentQuestion,
  getSession,
  resetSession,
  startSession,
  submitAnswer,
} from "@/tutoring/session/service";
import {
  AnswerAlreadySubmittedError,
  InvalidOptionIdError,
  NoAnswerSubmittedError,
  SessionAlreadyCompletedError,
  SessionNotFoundError,
} from "@/tutoring/session/errors";
import { NON_ADAPTIVE_STUDY_SEQUENCE } from "@/tutoring/selection/nonAdaptive/studySequence";

describe("session lifecycle: start -> present -> submit -> grade -> feedback -> advance", () => {
  it("starts a session on the fixed study sequence and presents question 1", () => {
    const session = startSession("p1");
    expect(session.status).toBe("active");
    expect(session.condition).toBe("non_adaptive");
    expect(session.sequence).toEqual(NON_ADAPTIVE_STUDY_SEQUENCE);
    expect(session.currentPosition).toBe(0);
    expect(getCurrentQuestion(session.id).id).toBe(NON_ADAPTIVE_STUDY_SEQUENCE[0]);
  });

  it("submitting a correct answer grades it correctly and does not advance the position", () => {
    const session = startSession("p2");
    const question = getCurrentQuestion(session.id);

    const { session: afterSubmit, grading } = submitAnswer(session.id, question.correctOptionId);
    expect(grading.isCorrect).toBe(true);
    expect(afterSubmit.currentPosition).toBe(0);
    expect(afterSubmit.responses).toHaveLength(1);
    expect(afterSubmit.responses[0].isCorrect).toBe(true);
  });

  it("submitting an incorrect answer grades it correctly and surfaces misconceptionId if present", () => {
    const session = startSession("p3");
    const question = getCurrentQuestion(session.id);
    const distractor = question.options.find((o) => !o.isCorrect)!;

    const { grading } = submitAnswer(session.id, distractor.id);
    expect(grading.isCorrect).toBe(false);
    expect(grading.misconceptionId).toBe(distractor.misconceptionId);
  });

  it("advancing after submission moves to the next sequence position", () => {
    const session = startSession("p4");
    const q1 = getCurrentQuestion(session.id);
    submitAnswer(session.id, q1.correctOptionId);
    const { session: advanced, nextQuestion } = advanceSession(session.id);

    expect(advanced.currentPosition).toBe(1);
    expect(nextQuestion?.id).toBe(NON_ADAPTIVE_STUDY_SEQUENCE[1]);
  });

  it("walking the full sequence ends with status completed and no next question", () => {
    const session = startSession("p5");
    const sessionId = session.id;

    for (let i = 0; i < NON_ADAPTIVE_STUDY_SEQUENCE.length; i++) {
      const question = getCurrentQuestion(sessionId);
      submitAnswer(sessionId, question.correctOptionId);
      const { session: updated, nextQuestion } = advanceSession(sessionId);
      if (i === NON_ADAPTIVE_STUDY_SEQUENCE.length - 1) {
        expect(updated.status).toBe("completed");
        expect(nextQuestion).toBeNull();
        expect(updated.completedAt).toBeDefined();
      } else {
        expect(updated.status).toBe("active");
        expect(nextQuestion).not.toBeNull();
      }
    }
  });

  it("getSession is a read-only lookup and does not mutate state", () => {
    const session = startSession("p6");
    const a = getSession(session.id);
    const b = getSession(session.id);
    expect(a).toEqual(b);
  });
});

describe("guards against invalid transitions", () => {
  it("throws SessionNotFoundError for an unknown session id", () => {
    expect(() => getCurrentQuestion("does-not-exist")).toThrow(SessionNotFoundError);
  });

  it("throws AnswerAlreadySubmittedError on a second submission for the same question", () => {
    const session = startSession("g1");
    const question = getCurrentQuestion(session.id);
    submitAnswer(session.id, question.correctOptionId);
    expect(() => submitAnswer(session.id, question.correctOptionId)).toThrow(AnswerAlreadySubmittedError);
  });

  it("throws NoAnswerSubmittedError if Continue is pressed before submitting", () => {
    const session = startSession("g2");
    expect(() => advanceSession(session.id)).toThrow(NoAnswerSubmittedError);
  });

  it("throws InvalidOptionIdError for an option id that doesn't belong to the current question", () => {
    const session = startSession("g3");
    expect(() => submitAnswer(session.id, "not-a-real-option-id")).toThrow(InvalidOptionIdError);
  });

  it("throws SessionAlreadyCompletedError when submitting after the session has completed", () => {
    const session = startSession("g4");
    const sessionId = session.id;
    for (let i = 0; i < NON_ADAPTIVE_STUDY_SEQUENCE.length; i++) {
      const question = getCurrentQuestion(sessionId);
      submitAnswer(sessionId, question.correctOptionId);
      advanceSession(sessionId);
    }
    expect(() => submitAnswer(sessionId, "anything")).toThrow(SessionAlreadyCompletedError);
    expect(() => advanceSession(sessionId)).toThrow(SessionAlreadyCompletedError);
  });

  it("resetSession discards the session so it can no longer be looked up", () => {
    const session = startSession("g5");
    resetSession(session.id);
    expect(() => getCurrentQuestion(session.id)).toThrow(SessionNotFoundError);
  });
});

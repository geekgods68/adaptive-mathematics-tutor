import { describe, expect, it } from "vitest";
import { advanceSession, exportSession, getCurrentQuestion, startSession, submitAnswer } from "@/tutoring/session/service";
import { sessionResearchLogger } from "@/tutoring/session/store";
import { NON_ADAPTIVE_STUDY_SEQUENCE } from "@/tutoring/selection/nonAdaptive/studySequence";

function eventsFor(sessionId: string) {
  return sessionResearchLogger.getEvents().filter((e) => e.sessionId === sessionId);
}

describe("research event logging", () => {
  it("logs SESSION_STARTED and one QUESTION_PRESENTED when a session starts", () => {
    const session = startSession("log-1");
    const events = eventsFor(session.id);

    expect(events.filter((e) => e.eventType === "SESSION_STARTED")).toHaveLength(1);
    const presented = events.filter((e) => e.eventType === "QUESTION_PRESENTED");
    expect(presented).toHaveLength(1);
    expect((presented[0] as { questionId: string }).questionId).toBe(session.sequence[0]);
  });

  it("re-reading the current question does not log another QUESTION_PRESENTED", () => {
    const session = startSession("log-2");
    getCurrentQuestion(session.id);
    getCurrentQuestion(session.id);
    getCurrentQuestion(session.id);

    const presented = eventsFor(session.id).filter((e) => e.eventType === "QUESTION_PRESENTED");
    expect(presented).toHaveLength(1);
  });

  it("a correct submission logs ANSWER_SUBMITTED then ANSWER_CORRECT, and no MISCONCEPTION_FLAGGED", () => {
    const session = startSession("log-3");
    const question = getCurrentQuestion(session.id);
    submitAnswer(session.id, question.correctOptionId);

    const events = eventsFor(session.id);
    expect(events.filter((e) => e.eventType === "ANSWER_SUBMITTED")).toHaveLength(1);
    expect(events.filter((e) => e.eventType === "ANSWER_CORRECT")).toHaveLength(1);
    expect(events.filter((e) => e.eventType === "ANSWER_INCORRECT")).toHaveLength(0);
    expect(events.filter((e) => e.eventType === "MISCONCEPTION_FLAGGED")).toHaveLength(0);
    expect(events.filter((e) => e.eventType === "FEEDBACK_PRESENTED")).toHaveLength(1);
  });

  it("an incorrect diagnostic submission logs ANSWER_INCORRECT and exactly one MISCONCEPTION_FLAGGED", () => {
    const session = startSession("log-4");
    const question = getCurrentQuestion(session.id);
    const diagnosticDistractor = question.options.find((o) => !o.isCorrect && o.misconceptionId);
    const anyDistractor = diagnosticDistractor ?? question.options.find((o) => !o.isCorrect)!;

    submitAnswer(session.id, anyDistractor.id);

    const events = eventsFor(session.id);
    expect(events.filter((e) => e.eventType === "ANSWER_INCORRECT")).toHaveLength(1);
    expect(events.filter((e) => e.eventType === "MISCONCEPTION_FLAGGED")).toHaveLength(
      anyDistractor.misconceptionId ? 1 : 0,
    );
  });

  it("exactly one response is produced per submission", () => {
    const session = startSession("log-5");
    const question = getCurrentQuestion(session.id);
    const { session: updated } = submitAnswer(session.id, question.correctOptionId);
    expect(updated.responses).toHaveLength(1);
  });

  it("response time is non-negative", () => {
    const session = startSession("log-6");
    const question = getCurrentQuestion(session.id);
    const { session: updated } = submitAnswer(session.id, question.correctOptionId);
    expect(updated.responses[0].responseTimeMs).toBeGreaterThanOrEqual(0);
  });

  it("advancing logs QUESTION_ADVANCED with matching from/to ids", () => {
    const session = startSession("log-7");
    const q1 = getCurrentQuestion(session.id);
    submitAnswer(session.id, q1.correctOptionId);
    const { nextQuestion } = advanceSession(session.id);

    const advancedEvents = eventsFor(session.id).filter((e) => e.eventType === "QUESTION_ADVANCED");
    expect(advancedEvents).toHaveLength(1);
    const advancedEvent = advancedEvents[0] as { fromQuestionId?: string; toQuestionId: string };
    expect(advancedEvent.fromQuestionId).toBe(q1.id);
    expect(advancedEvent.toQuestionId).toBe(nextQuestion?.id);
  });

  it("session completion is logged exactly once, at the end of the sequence", () => {
    const session = startSession("log-8");
    const sessionId = session.id;

    for (let i = 0; i < NON_ADAPTIVE_STUDY_SEQUENCE.length; i++) {
      const question = getCurrentQuestion(sessionId);
      submitAnswer(sessionId, question.correctOptionId);
      advanceSession(sessionId);
    }

    const completedEvents = eventsFor(sessionId).filter((e) => e.eventType === "SESSION_COMPLETED");
    expect(completedEvents).toHaveLength(1);
    expect((completedEvents[0] as { totalQuestions: number; totalCorrect: number }).totalQuestions).toBe(
      NON_ADAPTIVE_STUDY_SEQUENCE.length,
    );
  });

  it("every event carries the session's condition", () => {
    const session = startSession("log-9");
    const question = getCurrentQuestion(session.id);
    submitAnswer(session.id, question.correctOptionId);
    advanceSession(session.id);

    for (const event of eventsFor(session.id)) {
      expect(event.condition).toBe("non_adaptive");
    }
  });

  it("exportSession returns exactly this session's events, responses, and a computed summary", () => {
    const session = startSession("log-10");
    const question = getCurrentQuestion(session.id);
    submitAnswer(session.id, question.correctOptionId);

    const exported = exportSession(session.id);
    expect(exported.session.id).toBe(session.id);
    expect(exported.responses).toHaveLength(1);
    expect(exported.events.every((e) => e.sessionId === session.id)).toBe(true);
    expect(exported.summary.totalQuestions).toBe(1);
  });
});

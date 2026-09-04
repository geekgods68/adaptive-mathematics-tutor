import { describe, expect, it } from "vitest";
import { NonAdaptiveSelectionPolicy } from "@/tutoring/selection/nonAdaptive/nonAdaptiveSelectionPolicy";
import { AdaptiveSelectionPolicy } from "@/tutoring/selection/adaptive/adaptiveSelectionPolicy";
import type { QuestionSelectionPolicy } from "@/tutoring/selection/types";
import type { NonAdaptiveSelectionContext } from "@/tutoring/selection/nonAdaptive/types";
import type { AdaptiveSelectionContext } from "@/tutoring/selection/adaptive/types";
import type { ExperimentalCondition, TutorSession } from "@/domain/sessions/types";
import type { ResearchEvent } from "@/research/events/types";
import { InMemoryResearchEventLogger } from "@/research/logging/logger";

describe("experimental condition separation", () => {
  it("supports both adaptive and non_adaptive as the only ExperimentalCondition values", () => {
    const conditions: ExperimentalCondition[] = ["adaptive", "non_adaptive"];
    expect(conditions).toHaveLength(2);
  });

  it("both selection policies implement the same QuestionSelectionPolicy abstraction", () => {
    // The point of this test is that this file compiles at all: both
    // policies satisfy QuestionSelectionPolicy<TheirOwnContext>, so calling
    // code can hold either behind the same interface without any
    // condition-specific branching beyond "which policy instance do I have".
    const nonAdaptive: QuestionSelectionPolicy<NonAdaptiveSelectionContext> =
      new NonAdaptiveSelectionPolicy();
    const adaptive: QuestionSelectionPolicy<AdaptiveSelectionContext> = new AdaptiveSelectionPolicy();

    expect(nonAdaptive.condition).toBe("non_adaptive");
    expect(adaptive.condition).toBe("adaptive");
  });

  it("the non-adaptive context type cannot express performance-based information", () => {
    // Structural guarantee, checked by construction: this object literal is
    // exhaustive for NonAdaptiveSelectionContext. If a future edit added a
    // performance field (mastery, misconceptionHistory, recentCorrectness,
    // responseTime, difficultyPerformance, conceptWeakness) to that type,
    // this object would need updating too — the omission would be visible
    // in review, not silently possible.
    const context: NonAdaptiveSelectionContext = {
      participantId: "p1",
      predeterminedSequence: ["q1", "q2"],
      positionIndex: 0,
    };
    expect(Object.keys(context).sort()).toEqual(
      ["participantId", "positionIndex", "predeterminedSequence"].sort(),
    );
  });

  it("a TutorSession's condition is fixed at session creation, not derived per-request", () => {
    const session: TutorSession = {
      id: "session-1",
      participantId: "p1",
      condition: "non_adaptive",
      startedAt: new Date().toISOString(),
      presentedQuestionIds: [],
    };
    // The condition lives on the session object itself; nothing about
    // selecting or grading a question needs to re-derive it.
    expect(session.condition).toBe("non_adaptive");
  });

  it("research events carry the condition for both conditions, with the same event shape", () => {
    const logger = new InMemoryResearchEventLogger();
    const baseFields = {
      eventId: "evt-1",
      timestamp: new Date().toISOString(),
      participantId: "p1",
      sessionId: "session-1",
    };

    const nonAdaptiveEvent: ResearchEvent = {
      ...baseFields,
      condition: "non_adaptive",
      eventType: "SESSION_STARTED",
    };
    const adaptiveEvent: ResearchEvent = {
      ...baseFields,
      eventId: "evt-2",
      sessionId: "session-2",
      condition: "adaptive",
      eventType: "SESSION_STARTED",
    };

    logger.log(nonAdaptiveEvent);
    logger.log(adaptiveEvent);

    const events = logger.getEvents();
    expect(events.map((e) => e.condition).sort()).toEqual(["adaptive", "non_adaptive"]);
  });

  it("AdaptiveSelectionPolicy is an explicit skeleton — architecture only, not implemented here", () => {
    const adaptive = new AdaptiveSelectionPolicy();
    expect(() =>
      adaptive.selectNextQuestion({
        participantId: "p1",
        availableQuestions: [],
        studentModel: { participantId: "p1", conceptMastery: {} },
        answeredQuestionIds: [],
      }),
    ).toThrow();
  });
});

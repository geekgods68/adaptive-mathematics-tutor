import type { DifficultyLevel } from "@/domain/questions/types";
import type { ExperimentalCondition } from "@/domain/sessions/types";

export type ResearchEventType =
  | "SESSION_STARTED"
  | "QUESTION_PRESENTED"
  | "ANSWER_SUBMITTED"
  | "ANSWER_CORRECT"
  | "ANSWER_INCORRECT"
  | "MISCONCEPTION_FLAGGED"
  | "FEEDBACK_PRESENTED"
  | "QUESTION_ADVANCED"
  | "SESSION_COMPLETED";

type ResearchEventBase = {
  eventId: string;
  timestamp: string; // ISO 8601
  participantId: string;
  sessionId: string;
  condition: ExperimentalCondition;
};

/**
 * A discriminated union, keyed on `eventType`. Every event carries the
 * common fields above; only the fields relevant to that event type are
 * required beyond that, so a caller cannot forget — or misuse — a field
 * that doesn't apply (e.g. `misconceptionId` is not even assignable on a
 * SESSION_STARTED event).
 */
export type ResearchEvent =
  | (ResearchEventBase & {
      eventType: "SESSION_STARTED";
    })
  | (ResearchEventBase & {
      eventType: "QUESTION_PRESENTED";
      questionId: string;
      conceptIds: string[];
      difficulty: DifficultyLevel;
    })
  | (ResearchEventBase & {
      eventType: "ANSWER_SUBMITTED";
      questionId: string;
      selectedOptionId: string;
      responseTimeMs: number;
    })
  | (ResearchEventBase & {
      eventType: "ANSWER_CORRECT";
      questionId: string;
      selectedOptionId: string;
      correctOptionId: string;
    })
  | (ResearchEventBase & {
      eventType: "ANSWER_INCORRECT";
      questionId: string;
      selectedOptionId: string;
      correctOptionId: string;
      misconceptionId?: string;
    })
  | (ResearchEventBase & {
      eventType: "MISCONCEPTION_FLAGGED";
      questionId: string;
      misconceptionId: string;
    })
  | (ResearchEventBase & {
      eventType: "FEEDBACK_PRESENTED";
      questionId: string;
    })
  | (ResearchEventBase & {
      eventType: "QUESTION_ADVANCED";
      fromQuestionId?: string;
      toQuestionId: string;
    })
  | (ResearchEventBase & {
      eventType: "SESSION_COMPLETED";
      totalQuestions: number;
      totalCorrect: number;
    });

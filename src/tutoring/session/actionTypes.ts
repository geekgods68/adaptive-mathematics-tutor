import type { PublicFeedbackView, PublicQuestionView } from "@/tutoring/session/publicViews";
import type { StudentFacingSummary } from "@/tutoring/session/summary";

/**
 * What the tutor Server Actions (src/app/tutor/actions.ts) return to the
 * client. Plain types only — a "use server" file may only export async
 * functions, so these live in their own module.
 */
export type QuestionStateResult =
  | {
      status: "active";
      sessionId: string;
      position: number; // 0-indexed
      totalQuestions: number;
      question: PublicQuestionView;
      /** Whether the current position already has a recorded response (true after refresh mid-feedback). */
      answered: boolean;
      /** Present only when `answered` is true. */
      feedback?: PublicFeedbackView;
    }
  | { status: "completed"; sessionId: string; summary: StudentFacingSummary };

export type ResumeResult = { status: "no_session" } | QuestionStateResult;

export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

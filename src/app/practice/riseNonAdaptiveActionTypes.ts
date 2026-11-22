import type { PublicFeedbackView, PublicQuestionView } from "@/tutoring/session/publicViews";
import type { NonAdaptiveRiseSummary } from "@/tutoring/nonAdaptiveRiseSession/service";

/**
 * What the Stage 1 non-adaptive-on-RISE Server Actions
 * (riseNonAdaptiveActions.ts) return to the client — mirrors
 * src/tutoring/session/actionTypes.ts's shape (the legacy non-adaptive
 * condition) exactly, since both conditions share the same public
 * question/feedback view types.
 */
export type NonAdaptiveRiseQuestionStateResult =
  | {
      status: "active";
      sessionId: string;
      position: number;
      maxQuestions: number;
      chapterId?: string;
      question: PublicQuestionView;
      answered: boolean;
      feedback?: PublicFeedbackView;
    }
  | {
      status: "completed";
      sessionId: string;
      summary: NonAdaptiveRiseSummary;
      /** The question ids actually presented this session, for the client to merge into its cross-session seen-question history — see src/lib/studentQuestionHistory.ts. */
      presentedQuestionIds: string[];
    };

export type NonAdaptiveRiseResumeResult = { status: "no_session" } | NonAdaptiveRiseQuestionStateResult;

export type NonAdaptiveRiseActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

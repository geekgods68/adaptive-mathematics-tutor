import type { PublicAdaptiveFeedbackView, PublicAdaptiveQuestionView } from "@/tutoring/adaptiveSession/publicViews";
import type { AdaptiveSessionSummary } from "@/tutoring/adaptiveSession/summary";
import type { ChapterOption } from "@/tutoring/adaptiveSession/curriculum";

/** What the adaptive tutor Server Actions (actions.ts) return to the client — mirrors src/tutoring/session/actionTypes.ts's shape for the non-adaptive condition. */
export type AdaptiveQuestionStateResult =
  | {
      status: "active";
      sessionId: string;
      position: number; // 0-indexed, how many questions administered so far
      maxQuestions: number;
      chapterId?: string;
      question: PublicAdaptiveQuestionView;
      answered: boolean;
      feedback?: PublicAdaptiveFeedbackView;
    }
  | { status: "completed"; sessionId: string; summary: AdaptiveSessionSummary };

export type AdaptiveResumeResult = { status: "no_session" } | AdaptiveQuestionStateResult;

export type AdaptiveActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

export type ChaptersResult = { chapters: ChapterOption[] };

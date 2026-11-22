import type { PublicAdaptiveFeedbackView, PublicAdaptiveQuestionView } from "@/tutoring/adaptiveSession/publicViews";
import type { AdaptiveSessionSummary } from "@/tutoring/adaptiveSession/summary";
import type { ChapterOption } from "@/tutoring/adaptiveSession/curriculum";
import type { PersistableConceptMasteryState } from "@/tutoring/adaptiveSession/masteryStateTransfer";

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
  | {
      status: "completed";
      sessionId: string;
      summary: AdaptiveSessionSummary;
      /** Client-safe mastery snapshot (see masteryStateTransfer.ts for what's deliberately excluded) — persist this and pass it back into a future `startAdaptiveSessionAction` call to continue from real prior mastery instead of cold-starting. */
      persistableMasteryStates: Record<string, PersistableConceptMasteryState>;
    };

export type AdaptiveResumeResult = { status: "no_session" } | AdaptiveQuestionStateResult;

export type AdaptiveActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

export type ChaptersResult = { chapters: ChapterOption[] };

/**
 * Stage 3 Priority 2 — the ONE authoritative answer to "what is this
 * participant's current estimated mastery, right now, according to the
 * durable server record of their most recently completed adaptive
 * session." `hasRecord: false` means no durable completed adaptive
 * session exists yet for this participant id — the caller decides what
 * to do then (e.g. fall back to a local snapshot, or treat as a cold
 * start), this action never fabricates a value for that case.
 */
export type CurrentMasteryStateResult =
  | { hasRecord: false }
  | {
      hasRecord: true;
      modelVersion: string;
      persistableStates: Record<string, PersistableConceptMasteryState>;
      fromSessionId: string;
      fromCompletedAt: string;
    };

"use server";

import { cookies } from "next/headers";
import * as adaptiveSessionService from "@/tutoring/adaptiveSession/service";
import { AdaptiveSessionError } from "@/tutoring/adaptiveSession/errors";
import { buildAdaptiveFeedback } from "@/tutoring/adaptiveSession/publicViews";
import { listAvailableChapters } from "@/tutoring/adaptiveSession/curriculum";
import { gradeAnswer } from "@/tutoring/grading/grade";
import type { AdaptiveActionResult, AdaptiveQuestionStateResult, AdaptiveResumeResult, ChaptersResult, CurrentMasteryStateResult } from "@/app/adaptive-tutor/actionTypes";

/**
 * Thin transport layer only — identical responsibility split to
 * src/app/tutor/actions.ts: read/write the session-id cookie, call the
 * service, shape the result for the client. No grading, mastery, or
 * selection logic lives here.
 */
const SESSION_COOKIE = "adaptiveTutorSessionId";

function errorMessage(err: unknown): string {
  if (err instanceof AdaptiveSessionError) return err.message;
  console.error("Unexpected adaptive session error:", err);
  return "Something went wrong. Please try refreshing the page.";
}

function buildQuestionState(sessionId: string): AdaptiveQuestionStateResult {
  const session = adaptiveSessionService.getSession(sessionId);

  if (session.experimentState.status === "terminated") {
    return {
      status: "completed",
      sessionId,
      summary: adaptiveSessionService.getAdaptiveSessionSummary(sessionId),
      persistableMasteryStates: adaptiveSessionService.getPersistableMasteryStates(sessionId),
    };
  }

  const question = adaptiveSessionService.getCurrentQuestion(sessionId);
  const publicQuestion = adaptiveSessionService.getCurrentPublicQuestion(sessionId);
  const response = session.experimentState.responses.find((r) => r.sequenceIndex === session.experimentState.sequenceIndex);

  return {
    status: "active",
    sessionId,
    position: session.experimentState.sequenceIndex,
    maxQuestions: adaptiveSessionService.ADAPTIVE_SESSION_MAX_QUESTIONS,
    chapterId: session.chapterId,
    question: publicQuestion,
    answered: Boolean(response),
    feedback: response ? buildAdaptiveFeedback(question, gradeAnswer(question, response.selectedOptionId)) : undefined,
  };
}

/** Called on `/adaptive-tutor` load to see whether a session cookie points at a still-valid session. */
export async function resumeAdaptiveSessionAction(): Promise<AdaptiveActionResult<AdaptiveResumeResult>> {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get(SESSION_COOKIE)?.value;
    if (!sessionId) return { ok: true, data: { status: "no_session" } };

    try {
      return { ok: true, data: buildQuestionState(sessionId) };
    } catch (err) {
      if (err instanceof AdaptiveSessionError) {
        // Stale cookie (e.g. dev server restart lost in-memory state) —
        // clear it and report "no session" rather than an error.
        cookieStore.delete(SESSION_COOKIE);
        return { ok: true, data: { status: "no_session" } };
      }
      throw err;
    }
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}

export async function listChaptersAction(): Promise<AdaptiveActionResult<ChaptersResult>> {
  try {
    return { ok: true, data: { chapters: listAvailableChapters() } };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}

/** Exposes the UI-level session-length constant (service.ts's own doc comment: "NOT a Phase 3/4 model parameter") to client components that can't import service.ts directly (it transitively pulls in the RISE data loader, which uses `fs` and is server-only). */
export async function getMaxQuestionsAction(): Promise<AdaptiveActionResult<{ maxQuestions: number }>> {
  return { ok: true, data: { maxQuestions: adaptiveSessionService.ADAPTIVE_SESSION_MAX_QUESTIONS } };
}

/**
 * Starts a brand-new adaptive session for the chosen chapter (or every
 * chapter, if omitted) and remembers it in a cookie.
 *
 * `priorEstimatorStates` and `seenQuestionIdsOldestFirst` are optional,
 * client-supplied continuity inputs — a student's own persisted mastery
 * snapshot (from a prior session's `persistableMasteryStates`) and
 * previously-encountered question ids. Omitting both is a pure cold
 * start, unchanged from this action's original behavior. Untrusted
 * client input either way: validated defensively in
 * `reconstructMasteryStatesForSession` (service.ts), never trusted as-is.
 */
export async function startAdaptiveSessionAction(
  chapterId?: string,
  priorEstimatorStates?: unknown,
  seenQuestionIdsOldestFirst?: readonly string[],
  participantId?: string,
): Promise<AdaptiveActionResult<AdaptiveQuestionStateResult>> {
  try {
    const session = adaptiveSessionService.startAdaptiveSession(chapterId, participantId, priorEstimatorStates, seenQuestionIdsOldestFirst ?? []);
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE, session.id, { path: "/", httpOnly: true, sameSite: "lax" });
    return { ok: true, data: buildQuestionState(session.id) };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}

/**
 * Stage 3 Priority 2 — the authoritative-mastery lookup. `participantId`
 * is a client-generated, PSEUDONYMOUS, per-browser identifier
 * (`src/lib/studentIdentity.ts`) — not an authenticated account; see that
 * module's doc comment for why this does not introduce a real
 * multi-user identity system. Server-side, this only ever reads this
 * one participant's OWN durably completed sessions
 * (`adaptiveSessionStore.listCompleted({ participantId })` filters by
 * exact match) — it cannot be used to enumerate or read another
 * participant's data, since nothing here lists participants or accepts
 * any filter other than the id the caller already holds.
 */
export async function getCurrentMasteryStateAction(participantId: string): Promise<AdaptiveActionResult<CurrentMasteryStateResult>> {
  try {
    const snapshot = adaptiveSessionService.getAuthoritativeMasteryForParticipant(participantId);
    if (!snapshot) return { ok: true, data: { hasRecord: false } };
    return {
      ok: true,
      data: {
        hasRecord: true,
        modelVersion: snapshot.modelVersion,
        persistableStates: snapshot.persistableStates,
        fromSessionId: snapshot.fromSessionId,
        fromCompletedAt: snapshot.fromCompletedAt,
      },
    };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}

export async function submitAdaptiveAnswerAction(sessionId: string, selectedOptionId: string): Promise<AdaptiveActionResult<AdaptiveQuestionStateResult>> {
  try {
    adaptiveSessionService.submitAdaptiveAnswer(sessionId, selectedOptionId);
    return { ok: true, data: buildQuestionState(sessionId) };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}

export async function advanceAdaptiveSessionAction(sessionId: string): Promise<AdaptiveActionResult<AdaptiveQuestionStateResult>> {
  try {
    adaptiveSessionService.advanceAdaptiveSession(sessionId);
    return { ok: true, data: buildQuestionState(sessionId) };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}

/** Development-only: abandon the current session and clear its cookie so a fresh one can start. */
export async function resetAdaptiveSessionAction(): Promise<AdaptiveActionResult<{ status: "no_session" }>> {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get(SESSION_COOKIE)?.value;
    if (sessionId) adaptiveSessionService.resetAdaptiveSession(sessionId);
    cookieStore.delete(SESSION_COOKIE);
    return { ok: true, data: { status: "no_session" } };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}

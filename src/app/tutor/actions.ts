"use server";

import { cookies } from "next/headers";
import * as sessionService from "@/tutoring/session/service";
import { TutorSessionError } from "@/tutoring/session/errors";
import { toPublicFeedbackViewFromResponse, toPublicQuestionView } from "@/tutoring/session/publicViews";
import type { ActionResult, QuestionStateResult, ResumeResult } from "@/tutoring/session/actionTypes";

/**
 * Thin transport layer only — every rule about grading, sequencing, or
 * logging lives in src/tutoring/session/service.ts and the modules it
 * calls. This file's only jobs are: read/write the session-id cookie,
 * call the service, and shape the result for the client (stripping
 * anything the student shouldn't see — see
 * src/tutoring/session/publicViews.ts).
 */
const SESSION_COOKIE = "tutorSessionId";

function errorMessage(err: unknown): string {
  if (err instanceof TutorSessionError) return err.message;
  console.error("Unexpected tutor session error:", err);
  return "Something went wrong. Please try refreshing the page.";
}

function buildQuestionState(sessionId: string): QuestionStateResult {
  const session = sessionService.getSession(sessionId);

  if (session.status === "completed") {
    return { status: "completed", sessionId, summary: sessionService.getStudentFacingSummary(sessionId) };
  }

  const question = sessionService.getCurrentQuestion(sessionId);
  const response = session.responses.find((r) => r.questionId === question.id);

  return {
    status: "active",
    sessionId,
    position: session.currentPosition,
    totalQuestions: session.sequence.length,
    question: toPublicQuestionView(question),
    answered: Boolean(response),
    feedback: response ? toPublicFeedbackViewFromResponse(question, response) : undefined,
  };
}

/** Called on `/tutor` load to see whether a session cookie points at a still-valid session. */
export async function resumeSessionAction(): Promise<ActionResult<ResumeResult>> {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get(SESSION_COOKIE)?.value;
    if (!sessionId) return { ok: true, data: { status: "no_session" } };

    try {
      return { ok: true, data: buildQuestionState(sessionId) };
    } catch (err) {
      if (err instanceof TutorSessionError) {
        // Stale cookie (e.g. the dev server restarted and lost in-memory
        // state) — clear it and report "no session" rather than an error.
        cookieStore.delete(SESSION_COOKIE);
        return { ok: true, data: { status: "no_session" } };
      }
      throw err;
    }
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}

/** Starts a brand-new session and remembers it in a cookie for this browser. */
export async function startTutorSessionAction(): Promise<ActionResult<QuestionStateResult>> {
  try {
    const session = sessionService.startSession();
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE, session.id, { path: "/", httpOnly: true, sameSite: "lax" });
    return { ok: true, data: buildQuestionState(session.id) };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}

export async function submitAnswerAction(
  sessionId: string,
  selectedOptionId: string,
): Promise<ActionResult<QuestionStateResult>> {
  try {
    sessionService.submitAnswer(sessionId, selectedOptionId);
    return { ok: true, data: buildQuestionState(sessionId) };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}

export async function advanceSessionAction(sessionId: string): Promise<ActionResult<QuestionStateResult>> {
  try {
    sessionService.advanceSession(sessionId);
    return { ok: true, data: buildQuestionState(sessionId) };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}

/** Development-only: abandon the current session and clear its cookie so a fresh one can start. */
export async function resetTutorSessionAction(): Promise<ActionResult<{ status: "no_session" }>> {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get(SESSION_COOKIE)?.value;
    if (sessionId) sessionService.resetSession(sessionId);
    cookieStore.delete(SESSION_COOKIE);
    return { ok: true, data: { status: "no_session" } };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}

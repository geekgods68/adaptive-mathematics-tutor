"use server";

import { cookies } from "next/headers";
import * as nonAdaptiveRiseService from "@/tutoring/nonAdaptiveRiseSession/service";
import { NonAdaptiveRiseSessionError } from "@/tutoring/nonAdaptiveRiseSession/errors";
import { toPublicFeedbackView } from "@/tutoring/session/publicViews";
import { gradeAnswer } from "@/tutoring/grading/grade";
import { buildFeedback } from "@/tutoring/feedback/feedback";
import type { NonAdaptiveRiseActionResult, NonAdaptiveRiseQuestionStateResult, NonAdaptiveRiseResumeResult } from "@/app/practice/riseNonAdaptiveActionTypes";

/**
 * Thin transport layer only, mirroring src/app/tutor/actions.ts and
 * src/app/adaptive-tutor/actions.ts's identical responsibility split —
 * read/write the session-id cookie, call the service, shape the result
 * for the client. No grading, sequencing, or bank logic lives here.
 *
 * A DIFFERENT cookie name from both `tutorSessionId` (legacy, original
 * bank) and `adaptiveTutorSessionId` (adaptive, RISE bank) — this is a
 * third, independent session identity, per Part 9's "do not conflate
 * session records across conditions."
 */
const SESSION_COOKIE = "nonAdaptiveRiseSessionId";

function errorMessage(err: unknown): string {
  if (err instanceof NonAdaptiveRiseSessionError) return err.message;
  console.error("Unexpected non-adaptive RISE session error:", err);
  return "Something went wrong. Please try refreshing the page.";
}

function buildQuestionState(sessionId: string): NonAdaptiveRiseQuestionStateResult {
  const session = nonAdaptiveRiseService.getSession(sessionId);

  if (session.experimentState.status === "terminated") {
    return {
      status: "completed",
      sessionId,
      summary: nonAdaptiveRiseService.getNonAdaptiveRiseSessionSummary(sessionId),
      presentedQuestionIds: nonAdaptiveRiseService.getPresentedQuestionIds(sessionId),
    };
  }

  const question = nonAdaptiveRiseService.getCurrentQuestion(sessionId);
  const publicQuestion = nonAdaptiveRiseService.getCurrentPublicQuestion(sessionId);
  const response = session.experimentState.responses.find((r) => r.sequenceIndex === session.experimentState.sequenceIndex);
  const grading = response ? gradeAnswer(question, response.selectedOptionId) : undefined;

  return {
    status: "active",
    sessionId,
    position: session.experimentState.sequenceIndex,
    maxQuestions: session.maxQuestions,
    chapterId: session.chapterId,
    question: publicQuestion,
    answered: Boolean(response),
    feedback: grading ? toPublicFeedbackView(question, grading, buildFeedback(question, grading)) : undefined,
  };
}

/** Called on `/practice` load to see whether a session cookie points at a still-valid non-adaptive-RISE session. */
export async function resumeNonAdaptiveRiseSessionAction(): Promise<NonAdaptiveRiseActionResult<NonAdaptiveRiseResumeResult>> {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get(SESSION_COOKIE)?.value;
    if (!sessionId) return { ok: true, data: { status: "no_session" } };

    try {
      return { ok: true, data: buildQuestionState(sessionId) };
    } catch (err) {
      if (err instanceof NonAdaptiveRiseSessionError) {
        cookieStore.delete(SESSION_COOKIE);
        return { ok: true, data: { status: "no_session" } };
      }
      throw err;
    }
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}

/**
 * Starts a brand-new non-adaptive session over the shared RISE bank.
 * `priorSeenQuestionIds` is the same optional cross-session continuity
 * input the adaptive condition accepts (see
 * src/lib/studentQuestionHistory.ts) — explicitly permitted for a
 * non-adaptive control (Stage 1 Part 4.1: "previously presented question
 * IDs for repetition prevention"), consulted only once, before the fixed
 * sequence is built.
 */
export async function startNonAdaptiveRiseSessionAction(
  chapterId?: string,
  priorSeenQuestionIds?: readonly string[],
): Promise<NonAdaptiveRiseActionResult<NonAdaptiveRiseQuestionStateResult>> {
  try {
    const session = nonAdaptiveRiseService.startNonAdaptiveRiseSession(
      chapterId,
      undefined,
      nonAdaptiveRiseService.NON_ADAPTIVE_RISE_DEFAULT_MAX_QUESTIONS,
      priorSeenQuestionIds ?? [],
    );
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE, session.id, { path: "/", httpOnly: true, sameSite: "lax" });
    return { ok: true, data: buildQuestionState(session.id) };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}

export async function submitNonAdaptiveRiseAnswerAction(sessionId: string, selectedOptionId: string): Promise<NonAdaptiveRiseActionResult<NonAdaptiveRiseQuestionStateResult>> {
  try {
    nonAdaptiveRiseService.submitNonAdaptiveRiseAnswer(sessionId, selectedOptionId);
    return { ok: true, data: buildQuestionState(sessionId) };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}

export async function advanceNonAdaptiveRiseSessionAction(sessionId: string): Promise<NonAdaptiveRiseActionResult<NonAdaptiveRiseQuestionStateResult>> {
  try {
    nonAdaptiveRiseService.advanceNonAdaptiveRiseSession(sessionId);
    return { ok: true, data: buildQuestionState(sessionId) };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}

/** Development-only: abandon the current session and clear its cookie so a fresh one can start. */
export async function resetNonAdaptiveRiseSessionAction(): Promise<NonAdaptiveRiseActionResult<{ status: "no_session" }>> {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get(SESSION_COOKIE)?.value;
    if (sessionId) nonAdaptiveRiseService.resetNonAdaptiveRiseSession(sessionId);
    cookieStore.delete(SESSION_COOKIE);
    return { ok: true, data: { status: "no_session" } };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}

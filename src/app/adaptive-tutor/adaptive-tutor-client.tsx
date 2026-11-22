"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import {
  advanceAdaptiveSessionAction,
  listChaptersAction,
  resetAdaptiveSessionAction,
  resumeAdaptiveSessionAction,
  startAdaptiveSessionAction,
  submitAdaptiveAnswerAction,
} from "@/app/adaptive-tutor/actions";
import type { AdaptiveQuestionStateResult } from "@/app/adaptive-tutor/actionTypes";
import type { ChapterOption } from "@/tutoring/adaptiveSession/curriculum";
import type { AdaptiveSessionSummary } from "@/tutoring/adaptiveSession/summary";
import MathText from "@/components/MathText";
import { getOrCreateParticipantId } from "@/lib/studentIdentity";
import { resolveAuthoritativeMastery } from "@/lib/masteryAuthority";
import { readSeenQuestionIds, recordSeenQuestionIds } from "@/lib/studentQuestionHistory";

type ViewState =
  | { kind: "loading" }
  | { kind: "start"; chapters: ChapterOption[] }
  | { kind: "question"; data: Extract<AdaptiveQuestionStateResult, { status: "active" }> }
  | { kind: "completed"; data: Extract<AdaptiveQuestionStateResult, { status: "completed" }> }
  | { kind: "error"; message: string };

export default function AdaptiveTutorClient() {
  const [view, setView] = useState<ViewState>({ kind: "loading" });
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [selectedChapterId, setSelectedChapterId] = useState<string | undefined>(undefined);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    Promise.all([resumeAdaptiveSessionAction(), listChaptersAction()]).then(([resumeResult, chaptersResult]) => {
      if (!resumeResult.ok) {
        setView({ kind: "error", message: resumeResult.error });
        return;
      }
      if (resumeResult.data.status !== "no_session") {
        applyQuestionState(resumeResult.data);
        return;
      }
      const chapters = chaptersResult.ok ? chaptersResult.data.chapters : [];
      setView({ kind: "start", chapters });
    });
  }, []);

  function applyQuestionState(data: AdaptiveQuestionStateResult) {
    if (data.status === "completed") {
      setView({ kind: "completed", data });
      return;
    }
    // Stage 3 (F-01 fix): share the SAME cross-session "already seen" tracking /practice uses,
    // via the same shared src/lib/studentQuestionHistory.ts module — not a second implementation.
    recordSeenQuestionIds([data.question.questionId]);
    setSelectedOptionId(null);
    setView({ kind: "question", data });
  }

  function handleStart() {
    startTransition(async () => {
      // Stage 3 Priority 2/F-01: this route shares the exact same underlying session service and
      // cookie as /practice's adaptive mode (@/app/adaptive-tutor/actions) — it must therefore also
      // participate in the SAME single-authority mastery mechanism (src/lib/masteryAuthority.ts),
      // using the SAME participant id (src/lib/studentIdentity.ts), rather than cold-starting every
      // time and never contributing to or benefiting from a student's durable mastery record. This
      // reuses the existing shared modules rather than duplicating the continuity implementation.
      const participantId = getOrCreateParticipantId();
      const mastery = await resolveAuthoritativeMastery();
      const seenQuestionIds = readSeenQuestionIds();
      const result = await startAdaptiveSessionAction(selectedChapterId, mastery.states, seenQuestionIds, participantId);
      if (!result.ok) {
        setView({ kind: "error", message: result.error });
        return;
      }
      applyQuestionState(result.data);
    });
  }

  function handleSubmit() {
    if (view.kind !== "question" || !selectedOptionId || isPending) return;
    const { sessionId } = view.data;
    startTransition(async () => {
      const result = await submitAdaptiveAnswerAction(sessionId, selectedOptionId);
      if (!result.ok) {
        setView({ kind: "error", message: result.error });
        return;
      }
      applyQuestionState(result.data);
    });
  }

  function handleContinue() {
    if (view.kind !== "question" || isPending) return;
    const { sessionId } = view.data;
    startTransition(async () => {
      const result = await advanceAdaptiveSessionAction(sessionId);
      if (!result.ok) {
        setView({ kind: "error", message: result.error });
        return;
      }
      applyQuestionState(result.data);
    });
  }

  /** Explicit, user-initiated reset from the completion screen only — never called automatically, so simply navigating away and back (e.g. via Home) never loses a completed session's results. */
  function handleStartNew() {
    if (isPending) return;
    startTransition(async () => {
      await resetAdaptiveSessionAction();
      const chaptersResult = await listChaptersAction();
      setSelectedChapterId(undefined);
      setView({ kind: "start", chapters: chaptersResult.ok ? chaptersResult.data.chapters : [] });
    });
  }

  if (view.kind === "loading") {
    return <StatusMessage>Loading…</StatusMessage>;
  }

  if (view.kind === "error") {
    return <StatusMessage tone="error">{view.message}</StatusMessage>;
  }

  if (view.kind === "start") {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">Adaptive mathematics practice</h1>
          <p className="text-base leading-7 text-zinc-600 dark:text-zinc-400">
            This session adjusts to your answers: question difficulty follows your estimated mastery of each topic, and if
            you struggle with something, the system may check an earlier concept it depends on before continuing. Mastery is
            estimated by a deterministic formula — it is a model estimate, not a measurement of what you actually know.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="chapter-select" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Choose a starting topic
          </label>
          <select
            id="chapter-select"
            value={selectedChapterId ?? ""}
            onChange={(e) => setSelectedChapterId(e.target.value || undefined)}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-base text-black dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          >
            <option value="">All topics (recommended order)</option>
            {view.chapters.map((c) => (
              <option key={c.chapterId} value={c.chapterId}>
                {c.title}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={handleStart}
          disabled={isPending}
          className="w-full rounded-lg bg-black px-5 py-3 text-base font-medium text-white transition-colors hover:bg-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black disabled:opacity-50 dark:bg-zinc-50 dark:text-black dark:hover:bg-zinc-200 sm:w-auto"
        >
          {isPending ? "Starting…" : "Start adaptive practice"}
        </button>
      </div>
    );
  }

  if (view.kind === "completed") {
    return <CompletedView summary={view.data.summary} onStartNew={handleStartNew} isPending={isPending} />;
  }

  // view.kind === "question"
  const { data } = view;
  return (
    <div className="flex flex-col gap-6">
      <Progress position={data.position} total={data.maxQuestions} />

      <p className="text-sm italic text-zinc-500 dark:text-zinc-400">{data.question.selectionExplanation}</p>

      <p className="text-lg leading-8 text-black dark:text-zinc-50">
        <MathText text={data.question.stem} />
      </p>

      <fieldset className="flex flex-col gap-3" disabled={data.answered || isPending}>
        <legend className="sr-only">Answer options</legend>
        {data.question.options.map((option) => {
          const isSelected = selectedOptionId === option.id;
          const isCorrectOption = data.feedback && option.id === data.feedback.correctOptionId;
          const isSelectedWrongOption = data.feedback && option.id === data.feedback.selectedOptionId && !data.feedback.isCorrect;

          return (
            <label
              key={option.id}
              className={[
                "flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 text-base transition-colors",
                data.answered
                  ? isCorrectOption
                    ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30"
                    : isSelectedWrongOption
                      ? "border-red-400 bg-red-50 dark:bg-red-950/30"
                      : "border-zinc-200 dark:border-zinc-800"
                  : isSelected
                    ? "border-black dark:border-zinc-50"
                    : "border-zinc-200 hover:border-zinc-400 dark:border-zinc-800 dark:hover:border-zinc-600",
              ].join(" ")}
            >
              <input
                type="radio"
                name="answer"
                value={option.id}
                checked={isSelected}
                onChange={() => setSelectedOptionId(option.id)}
                className="h-4 w-4 shrink-0 accent-black dark:accent-zinc-50"
              />
              <span className="text-black dark:text-zinc-50">
                <MathText text={option.display} />
              </span>
              {data.answered && isCorrectOption && (
                <span className="ml-auto text-sm font-medium text-emerald-700 dark:text-emerald-400">Correct answer</span>
              )}
            </label>
          );
        })}
      </fieldset>

      {!data.answered && (
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!selectedOptionId || isPending}
          className="w-full rounded-lg bg-black px-5 py-3 text-base font-medium text-white transition-colors hover:bg-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black disabled:opacity-40 dark:bg-zinc-50 dark:text-black dark:hover:bg-zinc-200 sm:w-auto"
        >
          {isPending ? "Submitting…" : "Submit"}
        </button>
      )}

      {data.answered && data.feedback && (
        <div className="flex flex-col gap-4 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
          <p
            className={["text-lg font-medium", data.feedback.isCorrect ? "text-emerald-700 dark:text-emerald-400" : "text-red-700 dark:text-red-400"].join(
              " ",
            )}
          >
            {data.feedback.isCorrect ? "Correct." : "Not quite."}
          </p>
          {!data.feedback.isCorrect && (
            <p className="text-base text-zinc-700 dark:text-zinc-300">
              Correct answer: <MathText text={data.feedback.correctOptionDisplay} />
            </p>
          )}
          <p className="text-base text-zinc-700 dark:text-zinc-300">
            <MathText text={data.feedback.explanation} />
          </p>
          {data.feedback.misconceptionNote && (
            <p className="text-sm text-amber-700 dark:text-amber-400">{data.feedback.misconceptionNote}</p>
          )}
          <div>
            <p className="mb-1 text-sm font-medium text-zinc-500 dark:text-zinc-400">Worked solution</p>
            <p className="text-base leading-7 text-zinc-700 dark:text-zinc-300">
              <MathText text={data.feedback.workedSolution} />
            </p>
          </div>
          <button
            type="button"
            onClick={handleContinue}
            disabled={isPending}
            className="w-full rounded-lg bg-black px-5 py-3 text-base font-medium text-white transition-colors hover:bg-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black disabled:opacity-50 dark:bg-zinc-50 dark:text-black dark:hover:bg-zinc-200 sm:w-auto"
          >
            {isPending ? "Loading…" : "Continue"}
          </button>
        </div>
      )}
    </div>
  );
}

function CompletedView({
  summary,
  onStartNew,
  isPending,
}: {
  summary: AdaptiveSessionSummary;
  onStartNew: () => void;
  isPending: boolean;
}) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">Session complete</h1>
        <p className="text-lg text-zinc-700 dark:text-zinc-300">
          You answered {summary.correctAnswers} of {summary.totalQuestions} questions correctly.
        </p>
        <p className="text-base text-zinc-500 dark:text-zinc-400">Accuracy: {(summary.accuracy * 100).toFixed(1)}%</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/"
          className="rounded-lg bg-black px-5 py-3 text-base font-medium text-white transition-colors hover:bg-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black dark:bg-zinc-50 dark:text-black dark:hover:bg-zinc-200"
        >
          Return to Home
        </Link>
        <button
          type="button"
          onClick={onStartNew}
          disabled={isPending}
          className="rounded-lg border border-zinc-300 px-5 py-3 text-base font-medium text-black transition-colors hover:border-black disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-50 dark:hover:border-zinc-50"
        >
          {isPending ? "Starting…" : "Start New Assessment"}
        </button>
        <a
          href="#results-summary"
          className="rounded-lg border border-zinc-300 px-5 py-3 text-base font-medium text-black transition-colors hover:border-black dark:border-zinc-700 dark:text-zinc-50 dark:hover:border-zinc-50"
        >
          Review Results
        </a>
      </div>

      <div id="results-summary" className="flex flex-col gap-3 scroll-mt-4">
        <h2 className="text-lg font-semibold text-black dark:text-zinc-50">Estimated mastery by concept</h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          These are model estimates produced by a deterministic formula, not empirically calibrated measurements of what you
          actually know.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                <th className="py-2 pr-4 font-medium">Concept</th>
                <th className="py-2 pr-4 font-medium">Evidence</th>
                <th className="py-2 pr-4 font-medium">Before</th>
                <th className="py-2 font-medium">After</th>
              </tr>
            </thead>
            <tbody>
              {summary.progress.map((row) => (
                <tr key={row.conceptId} className="border-b border-zinc-100 dark:border-zinc-900">
                  <td className="py-2 pr-4 text-black dark:text-zinc-50">{row.conceptName}</td>
                  <td className="py-2 pr-4 text-zinc-600 dark:text-zinc-400">{row.evidenceLevel}</td>
                  <td className="py-2 pr-4 text-zinc-600 dark:text-zinc-400">{row.masteryBeforePercent}%</td>
                  <td className="py-2 text-zinc-600 dark:text-zinc-400">{row.masteryAfterPercent}%</td>
                </tr>
              ))}
              {summary.progress.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-3 text-zinc-500 dark:text-zinc-400">
                    No concepts were observed this session.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {summary.conceptsNeedingPractice.length > 0 && (
        <div className="flex flex-col gap-2 rounded-lg border border-amber-300 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/30">
          <h2 className="text-base font-semibold text-amber-900 dark:text-amber-200">May benefit from further practice</h2>
          <ul className="list-disc space-y-1 pl-5 text-sm text-amber-900 dark:text-amber-200">
            {summary.conceptsNeedingPractice.map((row) => (
              <li key={row.conceptId}>{row.conceptName}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Progress({ position, total }: { position: number; total: number }) {
  const current = position + 1;
  const pct = total === 0 ? 0 : Math.round((Math.min(current, total) / total) * 100);
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
        Question {current} of {total}
      </p>
      <div
        role="progressbar"
        aria-valuenow={current}
        aria-valuemin={1}
        aria-valuemax={total}
        className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800"
      >
        <div className="h-full rounded-full bg-black transition-[width] dark:bg-zinc-50" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function StatusMessage({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "error" }) {
  return (
    <p className={tone === "error" ? "text-base text-red-700 dark:text-red-400" : "text-base text-zinc-500 dark:text-zinc-400"}>
      {children}
    </p>
  );
}

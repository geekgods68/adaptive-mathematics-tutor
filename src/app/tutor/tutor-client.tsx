"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import {
  advanceSessionAction,
  resetTutorSessionAction,
  resumeSessionAction,
  startTutorSessionAction,
  submitAnswerAction,
} from "@/app/tutor/actions";
import type { QuestionStateResult, ResumeResult } from "@/tutoring/session/actionTypes";

type ViewState =
  | { kind: "loading" }
  | { kind: "start" }
  | { kind: "question"; data: Extract<QuestionStateResult, { status: "active" }> }
  | { kind: "completed"; data: Extract<QuestionStateResult, { status: "completed" }> }
  | { kind: "error"; message: string };

export default function TutorClient() {
  const [view, setView] = useState<ViewState>({ kind: "loading" });
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    resumeSessionAction().then((result) => {
      if (!result.ok) {
        setView({ kind: "error", message: result.error });
        return;
      }
      applyResumeResult(result.data);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function applyResumeResult(data: ResumeResult) {
    if (data.status === "no_session") {
      setView({ kind: "start" });
      return;
    }
    applyQuestionState(data);
  }

  function applyQuestionState(data: QuestionStateResult) {
    if (data.status === "completed") {
      setView({ kind: "completed", data });
      return;
    }
    setSelectedOptionId(null);
    setView({ kind: "question", data });
  }

  function handleStart() {
    startTransition(async () => {
      const result = await startTutorSessionAction();
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
      const result = await submitAnswerAction(sessionId, selectedOptionId);
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
      const result = await advanceSessionAction(sessionId);
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
      await resetTutorSessionAction();
      setView({ kind: "start" });
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
          <h1 className="text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">
            Quadratic Equations and Functions
          </h1>
          <p className="text-base leading-7 text-zinc-600 dark:text-zinc-400">
            You will answer a series of multiple-choice mathematics questions. For each question:
          </p>
          <ol className="list-decimal space-y-1 pl-5 text-base leading-7 text-zinc-600 dark:text-zinc-400">
            <li>choose one answer;</li>
            <li>submit it;</li>
            <li>review the explanation;</li>
            <li>continue.</li>
          </ol>
        </div>
        <button
          type="button"
          onClick={handleStart}
          disabled={isPending}
          className="w-full rounded-lg bg-black px-5 py-3 text-base font-medium text-white transition-colors hover:bg-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black disabled:opacity-50 dark:bg-zinc-50 dark:text-black dark:hover:bg-zinc-200 sm:w-auto"
        >
          {isPending ? "Starting…" : "Start"}
        </button>
      </div>
    );
  }

  if (view.kind === "completed") {
    const { summary } = view.data;
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-4">
          <h1 className="text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">Session complete</h1>
          <p className="text-lg text-zinc-700 dark:text-zinc-300">
            You answered {summary.correctAnswers} of {summary.totalQuestions} questions correctly.
          </p>
          <p className="text-base text-zinc-500 dark:text-zinc-400">
            Accuracy: {(summary.accuracy * 100).toFixed(1)}%
          </p>
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
            onClick={handleStartNew}
            disabled={isPending}
            className="rounded-lg border border-zinc-300 px-5 py-3 text-base font-medium text-black transition-colors hover:border-black disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-50 dark:hover:border-zinc-50"
          >
            {isPending ? "Starting…" : "Start New Assessment"}
          </button>
        </div>
      </div>
    );
  }

  // view.kind === "question"
  const { data } = view;
  return (
    <div className="flex flex-col gap-6">
      <Progress position={data.position} total={data.totalQuestions} />

      <p className="whitespace-pre-wrap text-lg leading-8 text-black dark:text-zinc-50">{data.question.stem}</p>

      <fieldset className="flex flex-col gap-3" disabled={data.answered || isPending}>
        <legend className="sr-only">Answer options</legend>
        {data.question.options.map((option) => {
          const isSelected = selectedOptionId === option.id;
          const isCorrectOption = data.feedback && option.id === data.feedback.correctOptionId;
          const isSelectedWrongOption =
            data.feedback && option.id === data.feedback.selectedOptionId && !data.feedback.isCorrect;

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
              <span className="text-black dark:text-zinc-50">{option.display}</span>
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
            className={[
              "text-lg font-medium",
              data.feedback.isCorrect ? "text-emerald-700 dark:text-emerald-400" : "text-red-700 dark:text-red-400",
            ].join(" ")}
          >
            {data.feedback.isCorrect ? "Correct." : "Not quite."}
          </p>
          {!data.feedback.isCorrect && (
            <p className="text-base text-zinc-700 dark:text-zinc-300">
              Correct answer: {data.feedback.correctOptionDisplay}
            </p>
          )}
          <p className="text-base text-zinc-700 dark:text-zinc-300">{data.feedback.explanation}</p>
          <div>
            <p className="mb-1 text-sm font-medium text-zinc-500 dark:text-zinc-400">Worked solution</p>
            <p className="whitespace-pre-wrap text-base leading-7 text-zinc-700 dark:text-zinc-300">
              {data.feedback.workedSolution}
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

function Progress({ position, total }: { position: number; total: number }) {
  const current = position + 1;
  const pct = total === 0 ? 0 : Math.round((current / total) * 100);
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

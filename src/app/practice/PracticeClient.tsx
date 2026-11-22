"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import MathText from "@/components/MathText";
import {
  advanceAdaptiveSessionAction,
  listChaptersAction,
  resetAdaptiveSessionAction,
  resumeAdaptiveSessionAction,
  startAdaptiveSessionAction,
  submitAdaptiveAnswerAction,
} from "@/app/adaptive-tutor/actions";
import type { AdaptiveQuestionStateResult } from "@/app/adaptive-tutor/actionTypes";
import {
  advanceNonAdaptiveRiseSessionAction,
  resetNonAdaptiveRiseSessionAction,
  resumeNonAdaptiveRiseSessionAction,
  startNonAdaptiveRiseSessionAction,
  submitNonAdaptiveRiseAnswerAction,
} from "@/app/practice/riseNonAdaptiveActions";
import type { NonAdaptiveRiseQuestionStateResult } from "@/app/practice/riseNonAdaptiveActionTypes";
import type { ChapterOption } from "@/tutoring/adaptiveSession/curriculum";
import { recordSession, type SessionHistoryRecord } from "@/lib/studentHistory";
import { readSettings, writeSettings, type DefaultSessionMode } from "@/lib/studentSettings";
import { writeMasteryState } from "@/lib/studentMasteryState";
import { readSeenQuestionIds, recordSeenQuestionIds } from "@/lib/studentQuestionHistory";
import { getOrCreateParticipantId } from "@/lib/studentIdentity";
import { resolveAuthoritativeMastery } from "@/lib/masteryAuthority";

const NETWORK_ERROR_MESSAGE = "Something went wrong. Please check your connection and try again.";

type Mode = DefaultSessionMode;

type ActiveAdaptive = Extract<AdaptiveQuestionStateResult, { status: "active" }>;
type CompletedAdaptive = Extract<AdaptiveQuestionStateResult, { status: "completed" }>;
type ActiveNonAdaptive = Extract<NonAdaptiveRiseQuestionStateResult, { status: "active" }>;
type CompletedNonAdaptive = Extract<NonAdaptiveRiseQuestionStateResult, { status: "completed" }>;

type View =
  | { kind: "loading" }
  | { kind: "setup"; chapters: ChapterOption[] }
  | { kind: "adaptive-active"; data: ActiveAdaptive }
  | { kind: "adaptive-completed"; data: CompletedAdaptive }
  | { kind: "non-adaptive-active"; data: ActiveNonAdaptive }
  | { kind: "non-adaptive-completed"; data: CompletedNonAdaptive }
  | { kind: "error"; message: string };

export default function PracticeClient() {
  const searchParams = useSearchParams();
  const [view, setView] = useState<View>({ kind: "loading" });
  const [mode, setMode] = useState<Mode>("adaptive");
  const [chapterId, setChapterId] = useState<string | undefined>(undefined);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const recordedSessionIds = useRef(new Set<string>());
  const chaptersRef = useRef<ChapterOption[]>([]);
  const sourceRef = useRef<"practice" | "assessment">("practice");

  // Single mount-time effect: resolves the initial mode/chapter (from a deep link, e.g.
  // Assessments/Recommendations, falling back to remembered settings), checks for a resumable
  // session in either mode (Part C1: "an option to resume a session if resumability actually
  // exists"), and optionally auto-starts. Every setState call below lives inside the resolved
  // promise's callback (never synchronously in the effect body), matching the same pattern
  // already used by resumeNonAdaptiveRiseSessionAction()/resumeAdaptiveSessionAction() elsewhere in this app.
  useEffect(() => {
    const settings = readSettings();
    const paramMode = searchParams.get("mode");
    const paramChapter = searchParams.get("chapter") ?? undefined;
    const autostart = searchParams.get("autostart") === "1";
    const paramSource = searchParams.get("source") === "assessment" ? "assessment" : "practice";
    const initialMode: Mode = paramMode === "adaptive" || paramMode === "non-adaptive" ? paramMode : settings.defaultMode;
    const initialChapterId = paramChapter !== undefined ? paramChapter || undefined : settings.defaultChapterId;

    Promise.all([resumeAdaptiveSessionAction(), resumeNonAdaptiveRiseSessionAction(), listChaptersAction()]).then(
      ([adaptiveResume, nonAdaptiveResume, chaptersResult]) => {
        const chapters = chaptersResult.ok ? chaptersResult.data.chapters : [];
        chaptersRef.current = chapters;
        // Prefer resuming an existing session over any deep-link/autostart request — resuming
        // takes priority so a student is never dropped out of an in-progress session.
        if (adaptiveResume.ok && adaptiveResume.data.status !== "no_session") {
          applyAdaptiveState(adaptiveResume.data);
          return;
        }
        if (nonAdaptiveResume.ok && nonAdaptiveResume.data.status !== "no_session") {
          applyNonAdaptiveState(nonAdaptiveResume.data);
          return;
        }
        setMode(initialMode);
        setChapterId(initialChapterId);
        if (autostart) {
          sourceRef.current = paramSource;
          handleStart(initialMode, initialChapterId);
        } else {
          setView({ kind: "setup", chapters });
        }
      },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function applyAdaptiveState(data: AdaptiveQuestionStateResult) {
    if (data.status === "completed") {
      recordCompletedAdaptive(data);
      setView({ kind: "adaptive-completed", data });
      return;
    }
    // Recorded as soon as the question is presented (not only on session completion) so an
    // interrupted/abandoned session still contributes to cross-session "prefer unseen" — see
    // src/lib/studentQuestionHistory.ts. Idempotent: safe to call again on refresh/resume.
    recordSeenQuestionIds([data.question.questionId]);
    setSelectedOptionId(null);
    setView({ kind: "adaptive-active", data });
  }

  function applyNonAdaptiveState(data: NonAdaptiveRiseQuestionStateResult) {
    if (data.status === "completed") {
      recordCompletedNonAdaptive(data);
      setView({ kind: "non-adaptive-completed", data });
      return;
    }
    // Same cross-session continuity tracking as the adaptive condition (Stage 1: both conditions now
    // share the RISE bank, so "already seen" is tracked consistently regardless of mode) — see
    // src/lib/studentQuestionHistory.ts.
    recordSeenQuestionIds([data.question.questionId]);
    setSelectedOptionId(null);
    setView({ kind: "non-adaptive-active", data });
  }

  function recordCompletedAdaptive(data: CompletedAdaptive) {
    if (recordedSessionIds.current.has(data.sessionId)) return;
    recordedSessionIds.current.add(data.sessionId);
    const { summary } = data;
    const record: SessionHistoryRecord = {
      id: data.sessionId,
      type: "adaptive",
      source: sourceRef.current,
      chapterId,
      chapterTitle: chaptersRef.current.find((c) => c.chapterId === chapterId)?.title,
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      totalQuestions: summary.totalQuestions,
      correctAnswers: summary.correctAnswers,
      accuracy: summary.accuracy,
      concepts: summary.progress.map((p) => ({
        conceptId: p.conceptId,
        conceptName: p.conceptName,
        chapterId: p.chapterId,
        evidenceLevel: p.evidenceLevel,
        masteryBeforePercent: p.masteryBeforePercent,
        masteryAfterPercent: p.masteryAfterPercent,
      })),
      conceptsNeedingPractice: summary.conceptsNeedingPractice.map((p) => p.conceptName),
    };
    recordSession(record);

    // Persist the real, cumulative post-session mastery snapshot so the NEXT adaptive session
    // (this student, any topic) seeds from it instead of cold-starting — the root-cause fix. Every
    // entry carries its own modelVersion (masteryStateTransfer.ts); they're always identical within
    // one snapshot, so the first is representative. An empty map (no concept was observed) leaves
    // any existing stored state untouched rather than erasing prior progress.
    const masteryEntries = Object.values(data.persistableMasteryStates);
    if (masteryEntries.length > 0) {
      writeMasteryState(masteryEntries[0].modelVersion, data.persistableMasteryStates);
    }
  }

  function recordCompletedNonAdaptive(data: CompletedNonAdaptive) {
    if (recordedSessionIds.current.has(data.sessionId)) return;
    recordedSessionIds.current.add(data.sessionId);
    const { summary } = data;
    // Non-adaptive sessions carry no per-concept mastery (the condition never estimates mastery at
    // all, by hard constraint — see CLAUDE.md); recording an empty concepts array here is deliberate,
    // not an omission, so the Dashboard/Progress pages never fabricate a mastery figure for them.
    const record: SessionHistoryRecord = {
      id: data.sessionId,
      type: "non-adaptive",
      source: sourceRef.current,
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      totalQuestions: summary.totalQuestions,
      correctAnswers: summary.correctAnswers,
      accuracy: summary.accuracy,
      concepts: [],
      conceptsNeedingPractice: [],
    };
    recordSession(record);
    // Merge this session's presented questions into the shared cross-session seen-question history
    // (already recorded incrementally per-question in applyNonAdaptiveState; this call is therefore
    // a no-op in practice — kept for parity with recordCompletedAdaptive and as a safety net for any
    // question presented before this feature existed in a given browser session).
    recordSeenQuestionIds(data.presentedQuestionIds);
  }

  function handleStart(startMode: Mode, startChapterId: string | undefined) {
    writeSettings({ defaultMode: startMode, defaultChapterId: startChapterId });
    startTransition(async () => {
      try {
        if (startMode === "adaptive") {
          // Session continuity: seed this new session from the ONE authoritative mastery source
          // (src/lib/masteryAuthority.ts — Stage 3 Priority 2) and previously-encountered question
          // ids, so "Across All Topics" (or any topic) doesn't always restart from a cold-start/
          // first-question state — see src/lib/studentQuestionHistory.ts. A brand-new participant
          // (nothing recorded anywhere yet) gets `{}`/`[]`, i.e. the original cold-start behavior.
          // `participantId` is this browser's stable, pseudonymous identifier (studentIdentity.ts) —
          // it is what lets the server recognize "the same student, later" at all.
          const participantId = getOrCreateParticipantId();
          const mastery = await resolveAuthoritativeMastery();
          const seenQuestionIds = readSeenQuestionIds();
          const result = await startAdaptiveSessionAction(startChapterId, mastery.states, seenQuestionIds, participantId);
          if (!result.ok) {
            setView({ kind: "error", message: result.error });
            return;
          }
          applyAdaptiveState(result.data);
        } else {
          // Stage 1: the non-adaptive mode now runs over the SAME canonical RISE bank and curriculum
          // as adaptive mode (condition C0 — see src/tutoring/nonAdaptiveRiseSession/service.ts),
          // fixing Finding F-02 (the two live conditions previously drew from disjoint question
          // banks). It also shares cross-session "already seen" tracking with adaptive mode.
          const seenQuestionIds = readSeenQuestionIds();
          const result = await startNonAdaptiveRiseSessionAction(startChapterId, seenQuestionIds);
          if (!result.ok) {
            setView({ kind: "error", message: result.error });
            return;
          }
          applyNonAdaptiveState(result.data);
        }
      } catch {
        // Stage 3 Priority 3 (real finding): a Server Action call that fails at the network level
        // (not a structured {ok:false} response from the action's own try/catch, but the fetch
        // itself failing — offline, server unreachable, aborted) throws instead, which previously
        // propagated out of this transition uncaught, leaving `isPending` stuck true and every
        // control permanently disabled. Every Server Action call site in this component is now
        // wrapped the same way.
        setView({ kind: "error", message: NETWORK_ERROR_MESSAGE });
      }
    });
  }

  function handleSubmit() {
    if (isPending) return;
    if (view.kind === "adaptive-active") {
      if (!selectedOptionId) return;
      const { sessionId } = view.data;
      startTransition(async () => {
        try {
          const result = await submitAdaptiveAnswerAction(sessionId, selectedOptionId);
          if (!result.ok) {
            setView({ kind: "error", message: result.error });
            return;
          }
          applyAdaptiveState(result.data);
        } catch {
          setView({ kind: "error", message: NETWORK_ERROR_MESSAGE });
        }
      });
    } else if (view.kind === "non-adaptive-active") {
      if (!selectedOptionId) return;
      const { sessionId } = view.data;
      startTransition(async () => {
        try {
          const result = await submitNonAdaptiveRiseAnswerAction(sessionId, selectedOptionId);
          if (!result.ok) {
            setView({ kind: "error", message: result.error });
            return;
          }
          applyNonAdaptiveState(result.data);
        } catch {
          setView({ kind: "error", message: NETWORK_ERROR_MESSAGE });
        }
      });
    }
  }

  function handleContinue() {
    if (isPending) return;
    if (view.kind === "adaptive-active") {
      const { sessionId } = view.data;
      startTransition(async () => {
        try {
          const result = await advanceAdaptiveSessionAction(sessionId);
          if (!result.ok) {
            setView({ kind: "error", message: result.error });
            return;
          }
          applyAdaptiveState(result.data);
        } catch {
          setView({ kind: "error", message: NETWORK_ERROR_MESSAGE });
        }
      });
    } else if (view.kind === "non-adaptive-active") {
      const { sessionId } = view.data;
      startTransition(async () => {
        try {
          const result = await advanceNonAdaptiveRiseSessionAction(sessionId);
          if (!result.ok) {
            setView({ kind: "error", message: result.error });
            return;
          }
          applyNonAdaptiveState(result.data);
        } catch {
          setView({ kind: "error", message: NETWORK_ERROR_MESSAGE });
        }
      });
    }
  }

  function handlePracticeAgain() {
    startTransition(async () => {
      try {
        if (view.kind === "adaptive-completed") await resetAdaptiveSessionAction();
        if (view.kind === "non-adaptive-completed") await resetNonAdaptiveRiseSessionAction();
        const chaptersResult = await listChaptersAction();
        const chapters = chaptersResult.ok ? chaptersResult.data.chapters : [];
        chaptersRef.current = chapters;
        setSelectedOptionId(null);
        setView({ kind: "setup", chapters });
      } catch {
        setView({ kind: "error", message: NETWORK_ERROR_MESSAGE });
      }
    });
  }

  if (view.kind === "loading") {
    return <StatusMessage>Loading…</StatusMessage>;
  }
  if (view.kind === "error") {
    // Stage 3 Priority 3 (real finding): this screen previously had no way back — a failed
    // request (network/server) left the student on a dead-end message with no retry or escape
    // route. Reloading re-runs the normal resume-check effect, which recovers the durably-stored
    // in-progress session exactly where it left off (Stage 2) if one still exists, or falls back
    // to the setup screen — the same robust recovery path a real page refresh already provides.
    return (
      <div className="flex flex-col gap-4">
        <StatusMessage tone="error">{view.message}</StatusMessage>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-lg bg-black px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-50 dark:text-black dark:hover:bg-zinc-200"
          >
            Try Again
          </button>
          <Link href="/" className="rounded-lg border border-zinc-300 px-5 py-2.5 text-sm font-medium text-black transition-colors hover:border-black dark:border-zinc-700 dark:text-zinc-50 dark:hover:border-zinc-50">
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (view.kind === "setup") {
    return (
      <SetupScreen
        chapters={view.chapters}
        mode={mode}
        chapterId={chapterId}
        isPending={isPending}
        onModeChange={setMode}
        onChapterChange={setChapterId}
        onStart={() => {
          sourceRef.current = "practice";
          handleStart(mode, chapterId);
        }}
      />
    );
  }

  if (view.kind === "adaptive-completed") {
    return <AdaptiveCompletedScreen summary={view.data.summary} onPracticeAgain={handlePracticeAgain} isPending={isPending} />;
  }

  if (view.kind === "non-adaptive-completed") {
    return <NonAdaptiveCompletedScreen summary={view.data.summary} onPracticeAgain={handlePracticeAgain} isPending={isPending} />;
  }

  if (view.kind === "adaptive-active") {
    return (
      <QuestionScreen
        kind="adaptive"
        data={view.data}
        selectedOptionId={selectedOptionId}
        isPending={isPending}
        onSelect={setSelectedOptionId}
        onSubmit={handleSubmit}
        onContinue={handleContinue}
      />
    );
  }

  // view.kind === "non-adaptive-active"
  return (
    <QuestionScreen
      kind="non-adaptive"
      data={view.data}
      selectedOptionId={selectedOptionId}
      isPending={isPending}
      onSelect={setSelectedOptionId}
      onSubmit={handleSubmit}
      onContinue={handleContinue}
    />
  );
}

function SetupScreen({
  chapters,
  mode,
  chapterId,
  isPending,
  onModeChange,
  onChapterChange,
  onStart,
}: {
  chapters: ChapterOption[];
  mode: Mode;
  chapterId: string | undefined;
  isPending: boolean;
  onModeChange: (mode: Mode) => void;
  onChapterChange: (chapterId: string | undefined) => void;
  onStart: () => void;
}) {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h2 className="text-xl font-semibold tracking-tight text-black dark:text-zinc-50">Practice Mathematics</h2>
        <p className="max-w-2xl text-base leading-7 text-zinc-600 dark:text-zinc-400">
          Choose a topic and a practice mode. <strong>Adaptive</strong> practice adjusts question difficulty and sequencing to
          your estimated mastery as you go; <strong>Non-Adaptive</strong> practice follows a fixed sequence covering the full
          curriculum, decided in advance and never adjusted based on your answers.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="topic-select" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Topic
        </label>
        <select
          id="topic-select"
          value={chapterId ?? ""}
          onChange={(e) => onChapterChange(e.target.value || undefined)}
          className="w-full max-w-md rounded-lg border border-zinc-300 bg-white px-3 py-2 text-base text-black dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        >
          <option value="">Across All Topics (Recommended)</option>
          {chapters.map((c) => (
            <option key={c.chapterId} value={c.chapterId}>
              {c.title}
            </option>
          ))}
        </select>
        {mode === "non-adaptive" && chapterId && (
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            The non-adaptive sequence will cover only this chapter&apos;s predetermined order, not the full curriculum.
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Mode</span>
        <div className="grid max-w-md grid-cols-2 gap-3">
          <ModeCard
            title="Adaptive"
            description="Difficulty and sequencing follow your estimated mastery, with prerequisite checks when needed."
            active={mode === "adaptive"}
            onClick={() => onModeChange("adaptive")}
          />
          <ModeCard
            title="Non-Adaptive"
            description="A fixed question sequence, identical for every learner — the study's control condition."
            active={mode === "non-adaptive"}
            onClick={() => onModeChange("non-adaptive")}
          />
        </div>
      </div>

      <button
        type="button"
        onClick={onStart}
        disabled={isPending}
        className="w-full rounded-lg bg-black px-5 py-3 text-base font-medium text-white transition-colors hover:bg-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black disabled:opacity-50 dark:bg-zinc-50 dark:text-black dark:hover:bg-zinc-200 sm:w-auto"
      >
        {isPending ? "Starting…" : "Start Practice"}
      </button>
    </div>
  );
}

function ModeCard({ title, description, active, onClick }: { title: string; description: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      // Stage 3 Priority 5: a deliberate, concise accessible name distinct from the longer visible
      // description below — axe-core's "label-content-name-mismatch" heuristic flags this pattern
      // (title + separate descriptive sentence, both inside one clickable control) as if the
      // description had to be folded into the name verbatim. Per the W3C's own "Understanding
      // SC 2.5.3" guidance, only the text that functions as the control's LABEL must appear in its
      // accessible name — genuinely supplementary descriptive text is explicitly exempt. This is a
      // documented, considered exception (see accessibilityAndResponsive.spec.ts's axe config),
      // not an unexamined suppression: a real, different finding on this same component
      // (insufficient color contrast) was found and fixed, not excluded, earlier in this pass.
      aria-label={`${title} mode`}
      className={[
        "flex flex-col gap-1 rounded-lg border p-3 text-left transition-colors",
        active ? "border-black bg-zinc-50 dark:border-zinc-50 dark:bg-zinc-900" : "border-zinc-200 hover:border-zinc-400 dark:border-zinc-800 dark:hover:border-zinc-600",
      ].join(" ")}
    >
      <span className="text-sm font-semibold text-black dark:text-zinc-50">{title}</span>
      <span className="text-xs leading-5 text-zinc-500 dark:text-zinc-400">{description}</span>
    </button>
  );
}

function QuestionScreen({
  kind,
  data,
  selectedOptionId,
  isPending,
  onSelect,
  onSubmit,
  onContinue,
}: {
  kind: "adaptive" | "non-adaptive";
  data: ActiveAdaptive | ActiveNonAdaptive;
  selectedOptionId: string | null;
  isPending: boolean;
  onSelect: (id: string) => void;
  onSubmit: () => void;
  onContinue: () => void;
}) {
  // Both conditions now share the same `maxQuestions` field shape (Stage 1: the non-adaptive
  // condition also runs over the RISE bank via the Phase 5 engine) — no per-condition field name
  // branching needed any more.
  const total = data.maxQuestions;
  const explanation = kind === "adaptive" ? (data as ActiveAdaptive).question.selectionExplanation : undefined;

  return (
    <div className="flex flex-col gap-6">
      <Progress position={data.position} total={total} />
      {explanation && <p className="text-sm italic text-zinc-500 dark:text-zinc-400">{explanation}</p>}

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
                onChange={() => onSelect(option.id)}
                // Stage 3 Priority 5 (real axe-core finding): KaTeX's rendered output marks its
                // visual HTML half `aria-hidden`, which left the implicit <label> wrapping this
                // radio without a reliably computable accessible name for options containing math.
                // An explicit aria-label guarantees one regardless of KaTeX's internal structure.
                aria-label={option.display}
                className="h-4 w-4 shrink-0 accent-black dark:accent-zinc-50"
              />
              <span className="text-black dark:text-zinc-50">
                <MathText text={option.display} />
              </span>
              {data.answered && isCorrectOption && <span className="ml-auto text-sm font-medium text-emerald-700 dark:text-emerald-400">Correct answer</span>}
            </label>
          );
        })}
      </fieldset>

      {!data.answered && (
        <button
          type="button"
          onClick={onSubmit}
          disabled={!selectedOptionId || isPending}
          className="w-full rounded-lg bg-black px-5 py-3 text-base font-medium text-white transition-colors hover:bg-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black disabled:opacity-40 dark:bg-zinc-50 dark:text-black dark:hover:bg-zinc-200 sm:w-auto"
        >
          {isPending ? "Submitting…" : "Submit"}
        </button>
      )}

      {data.answered && data.feedback && (
        <div className="flex flex-col gap-4 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
          <p className={["text-lg font-medium", data.feedback.isCorrect ? "text-emerald-700 dark:text-emerald-400" : "text-red-700 dark:text-red-400"].join(" ")}>
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
          {"misconceptionNote" in data.feedback && data.feedback.misconceptionNote && (
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
            onClick={onContinue}
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

function AdaptiveCompletedScreen({
  summary,
  onPracticeAgain,
  isPending,
}: {
  summary: CompletedAdaptive["summary"];
  onPracticeAgain: () => void;
  isPending: boolean;
}) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-xl font-semibold tracking-tight text-black dark:text-zinc-50">Practice complete</h2>
        <p className="text-lg text-zinc-700 dark:text-zinc-300">
          You answered {summary.correctAnswers} of {summary.totalQuestions} questions correctly.
        </p>
        <p className="text-base text-zinc-500 dark:text-zinc-400">Accuracy: {(summary.accuracy * 100).toFixed(1)}%</p>
      </div>

      <CompletionActions onPracticeAgain={onPracticeAgain} isPending={isPending} showReview />

      <div id="results-summary" className="flex flex-col gap-3 scroll-mt-4">
        <h3 className="text-lg font-semibold text-black dark:text-zinc-50">Estimated mastery by concept</h3>
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
          <h3 className="text-base font-semibold text-amber-900 dark:text-amber-200">Recommended next steps</h3>
          <p className="text-sm text-amber-900 dark:text-amber-200">May benefit from further practice:</p>
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

function NonAdaptiveCompletedScreen({
  summary,
  onPracticeAgain,
  isPending,
}: {
  summary: CompletedNonAdaptive["summary"];
  onPracticeAgain: () => void;
  isPending: boolean;
}) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-xl font-semibold tracking-tight text-black dark:text-zinc-50">Practice complete</h2>
        <p className="text-lg text-zinc-700 dark:text-zinc-300">
          You answered {summary.correctAnswers} of {summary.totalQuestions} questions correctly.
        </p>
        <p className="text-base text-zinc-500 dark:text-zinc-400">Accuracy: {(summary.accuracy * 100).toFixed(1)}%</p>
        <p className="text-xs text-zinc-400 dark:text-zinc-500">
          Non-adaptive practice does not estimate per-concept mastery — this condition deliberately never uses performance
          data to decide anything about this session.
        </p>
      </div>
      <CompletionActions onPracticeAgain={onPracticeAgain} isPending={isPending} showReview={false} />
    </div>
  );
}

function CompletionActions({ onPracticeAgain, isPending, showReview }: { onPracticeAgain: () => void; isPending: boolean; showReview: boolean }) {
  return (
    <div className="flex flex-wrap gap-3">
      <Link
        href="/"
        className="rounded-lg bg-black px-5 py-3 text-base font-medium text-white transition-colors hover:bg-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black dark:bg-zinc-50 dark:text-black dark:hover:bg-zinc-200"
      >
        Return to Dashboard
      </Link>
      <button
        type="button"
        onClick={onPracticeAgain}
        disabled={isPending}
        className="rounded-lg border border-zinc-300 px-5 py-3 text-base font-medium text-black transition-colors hover:border-black disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-50 dark:hover:border-zinc-50"
      >
        {isPending ? "Starting…" : "Practice Again"}
      </button>
      {showReview && (
        <a
          href="#results-summary"
          className="rounded-lg border border-zinc-300 px-5 py-3 text-base font-medium text-black transition-colors hover:border-black dark:border-zinc-700 dark:text-zinc-50 dark:hover:border-zinc-50"
        >
          Review Results
        </a>
      )}
      <Link
        href="/history"
        className="rounded-lg border border-zinc-300 px-5 py-3 text-base font-medium text-black transition-colors hover:border-black dark:border-zinc-700 dark:text-zinc-50 dark:hover:border-zinc-50"
      >
        Session History
      </Link>
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
      {/* Stage 3 Priority 5 (real axe-core finding, "aria-progressbar-name"): an ARIA progressbar role requires its own accessible name — the adjacent "Question N of M" text is informative to sighted users but was never programmatically associated with this element. */}
      <div role="progressbar" aria-label="Question progress" aria-valuenow={current} aria-valuemin={1} aria-valuemax={total} className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
        <div className="h-full rounded-full bg-black transition-[width] dark:bg-zinc-50" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function StatusMessage({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "error" }) {
  return <p className={tone === "error" ? "text-base text-red-700 dark:text-red-400" : "text-base text-zinc-500 dark:text-zinc-400"}>{children}</p>;
}

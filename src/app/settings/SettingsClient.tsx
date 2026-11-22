"use client";

import { useEffect, useState } from "react";
import { listChaptersAction, resetAdaptiveSessionAction } from "@/app/adaptive-tutor/actions";
import { resetNonAdaptiveRiseSessionAction } from "@/app/practice/riseNonAdaptiveActions";
import type { ChapterOption } from "@/tutoring/adaptiveSession/curriculum";
import { readSettings, writeSettings, type DefaultSessionMode } from "@/lib/studentSettings";
import { clearHistory, listSessions } from "@/lib/studentHistory";
import { clearMasteryState, readMasteryState } from "@/lib/studentMasteryState";
import { clearSeenQuestionIds, readSeenQuestionIds } from "@/lib/studentQuestionHistory";
import { clearParticipantId } from "@/lib/studentIdentity";

type ResetKind = "history" | "progress" | "all";

export default function SettingsClient() {
  const [chapters, setChapters] = useState<ChapterOption[]>([]);
  const [defaultMode, setDefaultMode] = useState<DefaultSessionMode>("adaptive");
  const [defaultChapterId, setDefaultChapterId] = useState<string | undefined>(undefined);
  const [sessionCount, setSessionCount] = useState(0);
  const [masteredConceptCount, setMasteredConceptCount] = useState(0);
  const [seenQuestionCount, setSeenQuestionCount] = useState(0);
  const [saved, setSaved] = useState(false);
  const [confirming, setConfirming] = useState<ResetKind | null>(null);
  const [justReset, setJustReset] = useState<ResetKind | null>(null);

  function refreshLocalDataCounts() {
    setSessionCount(listSessions().length);
    setMasteredConceptCount(Object.keys(readMasteryState()?.states ?? {}).length);
    setSeenQuestionCount(readSeenQuestionIds().length);
  }

  useEffect(() => {
    listChaptersAction().then((result) => {
      const settings = readSettings();
      setChapters(result.ok ? result.data.chapters : []);
      setDefaultMode(settings.defaultMode);
      setDefaultChapterId(settings.defaultChapterId);
      refreshLocalDataCounts();
    });
  }, []);

  function handleSave() {
    writeSettings({ defaultMode, defaultChapterId });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  /**
   * Three distinct, non-interchangeable operations (Stage 3 fix for audit
   * Finding F-04: "Clear history" previously removed only
   * rise-student-history-v1, silently leaving rise-student-mastery-state-v1
   * and rise-student-question-history-v1 intact — a split-brain state
   * where Dashboard/History looked empty but the next adaptive session
   * still inherited the old mastery and skipped the old questions). Each
   * also ends any currently active session server-side first, so a reset
   * can never leave a stale in-progress session pointing at state the
   * reset just removed. None of this touches Stage 2's durable research
   * event log or Phase 6 artifacts — those are immutable research records,
   * not student-facing display state, and are intentionally unaffected.
   *
   * Stage 3 Priority 2: now that "current mastery" is authoritatively the
   * server's durable record for this browser's participant id
   * (src/lib/masteryAuthority.ts), clearing ONLY the local mastery
   * snapshot would no longer have any visible effect once a durable
   * record exists — `resolveAuthoritativeMastery` would just keep finding
   * the old durable record under the same id. "Reset adaptive progress"
   * and "Reset all" therefore also retire this browser's participant id
   * (`clearParticipantId`), so the NEXT session gets a genuinely fresh
   * id with no durable history to be found under — a true cold start —
   * without deleting the old durable record itself (it remains valid
   * immutable research data under its original, now-abandoned id).
   */
  async function performReset(kind: ResetKind) {
    await Promise.all([resetAdaptiveSessionAction(), resetNonAdaptiveRiseSessionAction()]);
    if (kind === "history" || kind === "all") clearHistory();
    if (kind === "progress" || kind === "all") {
      clearMasteryState();
      clearSeenQuestionIds();
      clearParticipantId();
    }
    refreshLocalDataCounts();
    setConfirming(null);
    setJustReset(kind);
    setTimeout(() => setJustReset(null), 3000);
  }

  return (
    <div className="flex flex-col gap-10">
      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold text-black dark:text-zinc-50">Appearance</h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Use the theme toggle in the top bar (any page) to switch between light and dark. It remembers your choice in this
          browser; with no choice made, it follows your system setting.
        </p>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold text-black dark:text-zinc-50">Practice preferences</h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Remembered defaults for the Practice setup screen — you can always change them there for a single session.</p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex flex-col gap-1">
            <label htmlFor="default-mode" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Default session mode
            </label>
            <select id="default-mode" value={defaultMode} onChange={(e) => setDefaultMode(e.target.value as DefaultSessionMode)} className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-black dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50">
              <option value="adaptive">Adaptive</option>
              <option value="non-adaptive">Non-Adaptive</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="default-topic" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Default topic
            </label>
            <select
              id="default-topic"
              value={defaultChapterId ?? ""}
              onChange={(e) => setDefaultChapterId(e.target.value || undefined)}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-black dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
            >
              <option value="">Across All Topics (Recommended)</option>
              {chapters.map((c) => (
                <option key={c.chapterId} value={c.chapterId}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>
          <button type="button" onClick={handleSave} className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-50 dark:text-black dark:hover:bg-zinc-200">
            {saved ? "Saved" : "Save"}
          </button>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold text-black dark:text-zinc-50">Local data</h2>
        <p className="max-w-xl text-sm text-zinc-500 dark:text-zinc-400">
          Your current in-progress session (if any) is stored durably on the server and survives a page refresh or server
          restart. Everything else shown on the Dashboard, My Progress, and Session History — your completed-session
          history, estimated mastery, and recently-seen questions — is read only from this browser&apos;s local storage, not
          from any account.
        </p>
        <p data-testid="local-data-summary" className="max-w-xl text-sm text-zinc-500 dark:text-zinc-400">
          <strong>{sessionCount}</strong> completed session{sessionCount === 1 ? "" : "s"} recorded,{" "}
          <strong>{masteredConceptCount}</strong> concept{masteredConceptCount === 1 ? "" : "s"} with saved mastery, and{" "}
          <strong>{seenQuestionCount}</strong> previously-seen question{seenQuestionCount === 1 ? "" : "s"} tracked.
        </p>

        <ResetControl
          kind="history"
          title="Clear session history"
          explain="Removes the completed-session list shown on Session History, Dashboard's Recent activity, and the Progress page's from-session links. Does NOT affect your estimated mastery or which questions you've already seen — the next adaptive session still continues from where you left off."
          disabled={sessionCount === 0}
          confirming={confirming === "history"}
          justDone={justReset === "history"}
          onRequestConfirm={() => setConfirming("history")}
          onCancel={() => setConfirming(null)}
          onConfirm={() => performReset("history")}
        />
        <ResetControl
          kind="progress"
          title="Reset adaptive progress"
          explain="Clears your saved estimated mastery per concept and your record of previously-seen questions, so your next adaptive session cold-starts exactly like a brand-new student. Does NOT remove your Session History list — past sessions remain visible, just no longer linked to current mastery."
          disabled={masteredConceptCount === 0 && seenQuestionCount === 0}
          confirming={confirming === "progress"}
          justDone={justReset === "progress"}
          onRequestConfirm={() => setConfirming("progress")}
          onCancel={() => setConfirming(null)}
          onConfirm={() => performReset("progress")}
        />
        <ResetControl
          kind="all"
          title="Reset all student practice data"
          explain="Combines both operations above: clears session history, estimated mastery, and seen-question tracking, and ends any session currently in progress. This cannot be undone from this browser. It does not delete durable research records already saved on the server (Stage 2's research-event log and exported session artifacts are immutable research data, not display state)."
          disabled={sessionCount === 0 && masteredConceptCount === 0 && seenQuestionCount === 0}
          confirming={confirming === "all"}
          justDone={justReset === "all"}
          onRequestConfirm={() => setConfirming("all")}
          onCancel={() => setConfirming(null)}
          onConfirm={() => performReset("all")}
          emphasize
        />
      </section>
    </div>
  );
}

function ResetControl({
  title,
  explain,
  disabled,
  confirming,
  justDone,
  onRequestConfirm,
  onCancel,
  onConfirm,
  emphasize,
}: {
  kind: ResetKind;
  title: string;
  explain: string;
  disabled: boolean;
  confirming: boolean;
  justDone: boolean;
  onRequestConfirm: () => void;
  onCancel: () => void;
  onConfirm: () => void;
  emphasize?: boolean;
}) {
  return (
    <div className={["flex flex-col gap-2 rounded-lg border p-4", emphasize ? "border-red-300 dark:border-red-900" : "border-zinc-200 dark:border-zinc-800"].join(" ")}>
      <h3 className="text-sm font-semibold text-black dark:text-zinc-50">{title}</h3>
      <p className="text-xs leading-5 text-zinc-500 dark:text-zinc-400">{explain}</p>
      {justDone ? (
        <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">Done.</p>
      ) : confirming ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-red-700 dark:text-red-400">Are you sure? This cannot be undone.</span>
          <button type="button" onClick={onConfirm} className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-red-700">
            Yes, {title.toLowerCase()}
          </button>
          <button type="button" onClick={onCancel} className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-black transition-colors hover:border-black dark:border-zinc-700 dark:text-zinc-50 dark:hover:border-zinc-50">
            Cancel
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={onRequestConfirm}
          disabled={disabled}
          className="w-fit rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-700 transition-colors hover:border-red-500 disabled:cursor-not-allowed disabled:opacity-40 dark:border-red-900 dark:text-red-400 dark:hover:border-red-700"
        >
          {title}
        </button>
      )}
    </div>
  );
}

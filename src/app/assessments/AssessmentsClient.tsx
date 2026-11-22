"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getMaxQuestionsAction, listChaptersAction } from "@/app/adaptive-tutor/actions";
import type { ChapterOption } from "@/tutoring/adaptiveSession/curriculum";
import { listSessions } from "@/lib/studentHistory";

export default function AssessmentsClient() {
  const [chapters, setChapters] = useState<ChapterOption[] | null>(null);
  const [selectedChapterId, setSelectedChapterId] = useState<string>("");
  const [hasPriorSessions, setHasPriorSessions] = useState(false);
  const [maxQuestions, setMaxQuestions] = useState(20);

  useEffect(() => {
    Promise.all([listChaptersAction(), getMaxQuestionsAction()]).then(([chaptersResult, maxQuestionsResult]) => {
      setChapters(chaptersResult.ok ? chaptersResult.data.chapters : []);
      setHasPriorSessions(listSessions().length > 0);
      if (maxQuestionsResult.ok) setMaxQuestions(maxQuestionsResult.data.maxQuestions);
    });
  }, []);

  if (!chapters) {
    return <p className="text-base text-zinc-500 dark:text-zinc-400">Loading…</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <p className="max-w-2xl text-sm leading-6 text-zinc-600 dark:text-zinc-400">
        Assessments use the identical adaptive practice engine as Practice — nothing about grading or question selection
        changes. The difference is purely how you get here and what the result is used for: a deliberate check on where you
        stand, rather than open-ended practice.
      </p>

      <div className="grid gap-4 md:grid-cols-2">
        <AssessmentCard
          title={hasPriorSessions ? "Full Diagnostic (All Topics)" : "Initial Diagnostic"}
          description={
            hasPriorSessions
              ? "Re-assess across every topic. Useful after practicing for a while to see the current picture."
              : "A first look at where you stand across the full curriculum, before any topic-specific practice."
          }
          details={[
            "Topics covered: all 14 chapters, recommended order",
            `Question count: up to ${maxQuestions}, adaptive (may end earlier)`,
            "Mode: Adaptive",
            "Updates: Dashboard, My Progress, Session History",
          ]}
          href="/practice?mode=adaptive&autostart=1&source=assessment"
        />
        <AssessmentCard
          title="Chapter-Specific Assessment"
          description="Check your standing on one topic specifically."
          details={[
            "Topics covered: the chapter you choose below",
            `Question count: up to ${maxQuestions}, adaptive (may end earlier)`,
            "Mode: Adaptive",
            "Updates: Dashboard, My Progress, Session History",
          ]}
          extra={
            <select value={selectedChapterId} onChange={(e) => setSelectedChapterId(e.target.value)} className="w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm text-black dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50">
              <option value="">Choose a chapter…</option>
              {chapters.map((c) => (
                <option key={c.chapterId} value={c.chapterId}>
                  {c.title}
                </option>
              ))}
            </select>
          }
          href={selectedChapterId ? `/practice?mode=adaptive&chapter=${selectedChapterId}&autostart=1&source=assessment` : undefined}
        />
      </div>

      <p className="text-xs text-zinc-400 dark:text-zinc-500">
        Non-adaptive assessment is not offered here — the non-adaptive condition is a fixed, identical-for-everyone sequence
        (the study&apos;s control condition), not something meaningfully re-targetable as a diagnostic. It remains available
        from <Link href="/practice" className="underline">Practice</Link>.
      </p>
    </div>
  );
}

function AssessmentCard({ title, description, details, href, extra }: { title: string; description: string; details: string[]; href?: string; extra?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-zinc-200 p-5 dark:border-zinc-800">
      <div>
        <h3 className="text-base font-semibold text-black dark:text-zinc-50">{title}</h3>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{description}</p>
      </div>
      <ul className="flex flex-col gap-0.5 text-xs text-zinc-500 dark:text-zinc-400">
        {details.map((d) => (
          <li key={d}>• {d}</li>
        ))}
      </ul>
      {extra}
      {href ? (
        <Link href={href} className="mt-1 rounded-lg bg-black px-4 py-2 text-center text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-50 dark:text-black dark:hover:bg-zinc-200">
          Start
        </Link>
      ) : (
        <button type="button" disabled className="mt-1 cursor-not-allowed rounded-lg bg-zinc-200 px-4 py-2 text-center text-sm font-medium text-zinc-400 dark:bg-zinc-800 dark:text-zinc-600">
          Choose a chapter first
        </button>
      )}
    </div>
  );
}

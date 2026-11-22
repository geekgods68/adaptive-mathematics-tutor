"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getSessionRecord, type SessionHistoryRecord } from "@/lib/studentHistory";

export default function HistoryDetailClient({ id }: { id: string }) {
  const [record, setRecord] = useState<SessionHistoryRecord | null | undefined>(undefined);

  useEffect(() => {
    Promise.resolve().then(() => setRecord(getSessionRecord(id) ?? null));
  }, [id]);

  if (record === undefined) {
    return <p className="text-base text-zinc-500 dark:text-zinc-400">Loading…</p>;
  }

  if (record === null) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-zinc-200 p-10 text-center dark:border-zinc-800">
        <p className="text-base text-zinc-600 dark:text-zinc-400">No session found with this id in this browser&apos;s history.</p>
        <Link href="/history" className="rounded-lg bg-black px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-black dark:hover:bg-zinc-200">
          Back to Session History
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">{new Date(record.completedAt).toLocaleString()}</p>
        <h2 className="text-xl font-semibold tracking-tight text-black dark:text-zinc-50">
          {record.type === "adaptive" ? "Adaptive" : "Non-Adaptive"} {record.source === "assessment" ? "Assessment" : "Practice"}
          {record.chapterTitle ? ` — ${record.chapterTitle}` : ""}
        </h2>
      </div>

      <div className="grid grid-cols-3 gap-3 sm:grid-cols-3">
        <Stat label="Questions" value={record.totalQuestions} />
        <Stat label="Correct" value={record.correctAnswers} />
        <Stat label="Accuracy" value={`${Math.round(record.accuracy * 100)}%`} />
      </div>

      {record.concepts.length > 0 ? (
        <div className="flex flex-col gap-3">
          <h3 className="text-lg font-semibold text-black dark:text-zinc-50">Mastery changes this session</h3>
          <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50 text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
                  <th className="px-4 py-2 font-medium">Concept</th>
                  <th className="px-4 py-2 font-medium">Evidence</th>
                  <th className="px-4 py-2 font-medium">Before</th>
                  <th className="px-4 py-2 font-medium">After</th>
                </tr>
              </thead>
              <tbody>
                {record.concepts.map((c) => (
                  <tr key={c.conceptId} className="border-b border-zinc-100 last:border-0 dark:border-zinc-900">
                    <td className="px-4 py-2 text-black dark:text-zinc-50">{c.conceptName}</td>
                    <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">{c.evidenceLevel}</td>
                    <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">{c.masteryBeforePercent}%</td>
                    <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">{c.masteryAfterPercent}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          This was a non-adaptive session — it does not estimate per-concept mastery (the condition never uses performance
          data for anything, by design).
        </p>
      )}

      {record.conceptsNeedingPractice.length > 0 && (
        <div className="flex flex-col gap-2 rounded-lg border border-amber-300 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/30">
          <h3 className="text-sm font-semibold text-amber-900 dark:text-amber-200">Flagged for further practice</h3>
          <ul className="list-disc space-y-1 pl-5 text-sm text-amber-900 dark:text-amber-200">
            {record.conceptsNeedingPractice.map((name) => (
              <li key={name}>{name}</li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-xs text-zinc-400 dark:text-zinc-500">
        This is a summary saved in your browser when the session completed — not a question-by-question transcript (none is
        currently recorded for student-facing review).
      </p>

      <div className="flex gap-3">
        <Link href="/history" className="rounded-lg border border-zinc-300 px-5 py-2.5 text-sm font-medium text-black transition-colors hover:border-black dark:border-zinc-700 dark:text-zinc-50 dark:hover:border-zinc-50">
          Back to Session History
        </Link>
        <Link href="/practice" className="rounded-lg bg-black px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-50 dark:text-black dark:hover:bg-zinc-200">
          Practice Again
        </Link>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      <p className="text-2xl font-semibold text-black dark:text-zinc-50">{value}</p>
      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{label}</p>
    </div>
  );
}

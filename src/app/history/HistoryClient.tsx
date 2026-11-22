"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { listSessions, clearHistory, type SessionHistoryRecord } from "@/lib/studentHistory";

export default function HistoryClient() {
  const [sessions, setSessions] = useState<SessionHistoryRecord[] | null>(null);

  useEffect(() => {
    Promise.resolve().then(() => setSessions(listSessions()));
  }, []);

  function handleClear() {
    clearHistory();
    setSessions([]);
  }

  if (!sessions) {
    return <p className="text-base text-zinc-500 dark:text-zinc-400">Loading…</p>;
  }

  if (sessions.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-zinc-200 p-10 text-center dark:border-zinc-800">
        <p className="text-base text-zinc-600 dark:text-zinc-400">No completed sessions yet.</p>
        <Link href="/practice" className="rounded-lg bg-black px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-black dark:hover:bg-zinc-200">
          Start Practice
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">{sessions.length} session{sessions.length === 1 ? "" : "s"} recorded in this browser.</p>
        <button type="button" onClick={handleClear} className="text-sm text-red-600 underline underline-offset-2 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300">
          Clear history
        </button>
      </div>
      <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50 text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
              <th className="px-4 py-2 font-medium">Date</th>
              <th className="px-4 py-2 font-medium">Type</th>
              <th className="px-4 py-2 font-medium">Topic</th>
              <th className="px-4 py-2 font-medium">Questions</th>
              <th className="px-4 py-2 font-medium">Accuracy</th>
              <th className="px-4 py-2 font-medium">Mastery change</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((s) => (
              <tr key={s.id} className="cursor-pointer border-b border-zinc-100 last:border-0 hover:bg-zinc-50 dark:border-zinc-900 dark:hover:bg-zinc-900">
                <td className="px-4 py-2 text-black dark:text-zinc-50">
                  <Link href={`/history/${encodeURIComponent(s.id)}`} className="block">
                    {new Date(s.completedAt).toLocaleString()}
                  </Link>
                </td>
                <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">
                  {s.type === "adaptive" ? "Adaptive" : "Non-Adaptive"} {s.source === "assessment" ? "Assessment" : "Practice"}
                </td>
                <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">{s.chapterTitle ?? "All topics"}</td>
                <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">{s.totalQuestions}</td>
                <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">{Math.round(s.accuracy * 100)}%</td>
                <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">
                  {s.concepts.length === 0 ? "—" : `${s.concepts.length} concept${s.concepts.length === 1 ? "" : "s"} updated`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

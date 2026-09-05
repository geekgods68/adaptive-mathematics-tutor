"use client";

import { useState } from "react";
import { resetTutorSessionAction } from "@/app/tutor/actions";
import type { SessionExport } from "@/tutoring/session/service";

export default function DevSessionClient({ exportData }: { exportData: SessionExport }) {
  const [isResetting, setIsResetting] = useState(false);

  function handleDownload() {
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `tutor-session-${exportData.session.id}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function handleReset() {
    setIsResetting(true);
    resetTutorSessionAction().then(() => {
      window.location.reload();
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex gap-3">
        <button
          type="button"
          onClick={handleDownload}
          className="rounded bg-black px-3 py-1.5 text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-black"
        >
          Download session JSON
        </button>
        <button
          type="button"
          onClick={handleReset}
          disabled={isResetting}
          className="rounded border border-red-400 px-3 py-1.5 text-red-700 hover:bg-red-50 disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-950/30"
        >
          {isResetting ? "Resetting…" : "Reset session"}
        </button>
      </div>

      <Section title="Session">
        <Pre>{JSON.stringify(exportData.session, null, 2)}</Pre>
      </Section>

      <Section title={`Summary (${exportData.summary.totalQuestions} responses)`}>
        <Pre>{JSON.stringify(exportData.summary, null, 2)}</Pre>
      </Section>

      <Section title={`Responses (${exportData.responses.length})`}>
        <Pre>{JSON.stringify(exportData.responses, null, 2)}</Pre>
      </Section>

      <Section title={`Event log (${exportData.events.length})`}>
        <Pre>{JSON.stringify(exportData.events, null, 2)}</Pre>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <details open className="rounded border border-zinc-200 p-3 dark:border-zinc-800">
      <summary className="cursor-pointer font-semibold text-black dark:text-zinc-50">{title}</summary>
      <div className="mt-2">{children}</div>
    </details>
  );
}

function Pre({ children }: { children: string }) {
  return (
    <pre className="max-h-96 overflow-auto rounded bg-zinc-100 p-3 text-xs text-zinc-800 dark:bg-zinc-900 dark:text-zinc-200">
      {children}
    </pre>
  );
}

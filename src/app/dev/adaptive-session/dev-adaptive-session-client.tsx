"use client";

import { useState } from "react";
import { resetAdaptiveSessionAction } from "@/app/adaptive-tutor/actions";
import type { ActiveAdaptiveSession } from "@/tutoring/adaptiveSession/types";

export default function DevAdaptiveSessionClient({ session }: { session: ActiveAdaptiveSession }) {
  const [isResetting, setIsResetting] = useState(false);

  function handleDownload() {
    const blob = new Blob([JSON.stringify(session, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `adaptive-session-${session.id}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function handleReset() {
    setIsResetting(true);
    resetAdaptiveSessionAction().then(() => {
      window.location.reload();
    });
  }

  const { experimentState } = session;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex gap-3">
        <button type="button" onClick={handleDownload} className="rounded bg-black px-3 py-1.5 text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-black">
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

      <Section title="Session identity">
        <Pre>{JSON.stringify({ id: session.id, participantId: session.participantId, chapterId: session.chapterId, startedAt: session.startedAt, completedAt: session.completedAt, status: experimentState.status, terminationReason: experimentState.terminationReason }, null, 2)}</Pre>
      </Section>

      <Section title={`Concept mastery states (${Object.keys(experimentState.estimatorStates).length})`}>
        <Pre>{JSON.stringify(experimentState.estimatorStates, null, 2)}</Pre>
      </Section>

      <Section title={`Misconception tallies (${Object.keys(experimentState.misconceptionTallies).length})`}>
        <Pre>{JSON.stringify(experimentState.misconceptionTallies, null, 2)}</Pre>
      </Section>

      <Section title={`Responses (${experimentState.responses.length})`}>
        <Pre>{JSON.stringify(experimentState.responses, null, 2)}</Pre>
      </Section>

      <Section title={`Selection decision traces (${experimentState.selectionTraces.length})`}>
        <Pre>{JSON.stringify(experimentState.selectionTraces, null, 2)}</Pre>
      </Section>

      <Section title={`Mastery-update traces (${experimentState.estimatorTraces.length})`}>
        <Pre>{JSON.stringify(experimentState.estimatorTraces, null, 2)}</Pre>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <details className="rounded border border-zinc-200 dark:border-zinc-800" open>
      <summary className="cursor-pointer px-3 py-2 font-semibold text-black dark:text-zinc-50">{title}</summary>
      <div className="border-t border-zinc-200 p-3 dark:border-zinc-800">{children}</div>
    </details>
  );
}

function Pre({ children }: { children: string }) {
  return <pre className="max-h-96 overflow-auto whitespace-pre-wrap break-words text-xs text-zinc-700 dark:text-zinc-300">{children}</pre>;
}

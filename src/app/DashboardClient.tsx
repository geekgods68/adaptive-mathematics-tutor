"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { resumeAdaptiveSessionAction } from "@/app/adaptive-tutor/actions";
// Stage 1: /practice's non-adaptive mode now runs over the shared RISE bank (see
// src/tutoring/nonAdaptiveRiseSession/), not the legacy src/app/tutor/actions.ts engine — the
// resumability check below must follow the same engine /practice actually uses, or an in-progress
// non-adaptive session would never be detected here.
import { resumeNonAdaptiveRiseSessionAction } from "@/app/practice/riseNonAdaptiveActions";
import { listCurriculumAction } from "@/app/progress/actions";
import type { ChapterOption, ConceptNode } from "@/app/progress/actions";
import { buildHistorySummary, listSessions, type StudentHistorySummary } from "@/lib/studentHistory";
import { resolveAuthoritativeMastery, type MasteryAuthoritySource } from "@/lib/masteryAuthority";
import { buildProgressView, type ConceptProgressRow } from "@/tutoring/adaptiveSession/progress";
import { DEFAULT_ADAPTIVE_SELECTION_CONFIG } from "@/tutoring/selection/adaptive/config";

const MASTERY_THRESHOLD_PERCENT = Math.round(DEFAULT_ADAPTIVE_SELECTION_CONFIG.masteryProgressionThreshold * 100);
const REMEDIATION_THRESHOLD_PERCENT = Math.round(DEFAULT_ADAPTIVE_SELECTION_CONFIG.masteryRemediationThreshold * 100);

type ResumeState = "checking" | "none" | "adaptive" | "non-adaptive";

export default function DashboardClient() {
  const [summary, setSummary] = useState<StudentHistorySummary | null>(null);
  const [concepts, setConcepts] = useState<ConceptProgressRow[]>([]);
  const [masterySource, setMasterySource] = useState<MasteryAuthoritySource>("none");
  const [chapters, setChapters] = useState<ChapterOption[]>([]);
  const [allConcepts, setAllConcepts] = useState<ConceptNode[]>([]);
  const [resumeState, setResumeState] = useState<ResumeState>("checking");

  useEffect(() => {
    // Reads localStorage (studentHistory.ts) and calls the resume/curriculum/mastery-authority
    // server actions together in one resolved callback, so every setState call here happens
    // asynchronously (never synchronously in the effect body) — the same pattern already used
    // throughout this app's other client components (e.g. PracticeClient, tutor-client.tsx).
    //
    // Stage 3 Priority 2: "current mastery" now comes from ONE authoritative resolver
    // (src/lib/masteryAuthority.ts), never from re-deriving it out of session-history snapshots —
    // see docs/stage3-ui-integration-report.md Priority 2 for the full rationale.
    Promise.all([resumeAdaptiveSessionAction(), resumeNonAdaptiveRiseSessionAction(), listCurriculumAction(), resolveAuthoritativeMastery()]).then(
      ([adaptiveResume, nonAdaptiveResume, curriculum, mastery]) => {
        const rows = buildProgressView(mastery.states, curriculum.concepts, DEFAULT_ADAPTIVE_SELECTION_CONFIG.minEvidenceCount);
        setConcepts(rows);
        setMasterySource(mastery.source);
        setSummary(buildHistorySummary(rows, MASTERY_THRESHOLD_PERCENT));
        setChapters(curriculum.chapters);
        setAllConcepts(curriculum.concepts);
        if (adaptiveResume.ok && adaptiveResume.data.status === "active") {
          setResumeState("adaptive");
        } else if (nonAdaptiveResume.ok && nonAdaptiveResume.data.status === "active") {
          setResumeState("non-adaptive");
        } else {
          setResumeState("none");
        }
      },
    );
  }, []);

  if (!summary) {
    return <p className="text-base text-zinc-500 dark:text-zinc-400">Loading…</p>;
  }

  // A student can have durable mastery with no local session-history entries (e.g. after "Clear
  // session history" in Settings, which deliberately leaves mastery intact — see F-04's fix) —
  // "new student" must reflect BOTH, not session-history count alone, or these sections would
  // wrongly hide real mastery data.
  const hasAnyMasteryData = concepts.some((c) => c.observed);
  const isNewStudent = summary.totalSessions === 0 && !hasAnyMasteryData;
  const chapterTitle = (chapterId?: string) => chapters.find((c) => c.chapterId === chapterId)?.title;

  return (
    <div className="flex flex-col gap-10">
      <WelcomeSection isNewStudent={isNewStudent} resumeState={resumeState} lastSession={summary.lastSession} chapterTitle={chapterTitle} />

      <MetricsSection summary={summary} />

      {!isNewStudent && (
        <>
          {masterySource === "local-fallback" && (
            <p className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
              Showing mastery saved in this browser from before server-side session records existed. It will be replaced by
              the server&apos;s own record as soon as your next adaptive session completes.
            </p>
          )}
          <DiagnosticsSection concepts={concepts} allConcepts={allConcepts} masteryThreshold={MASTERY_THRESHOLD_PERCENT} remediationThreshold={REMEDIATION_THRESHOLD_PERCENT} chapterTitle={chapterTitle} />
          <ConceptMasterySection concepts={concepts} chapters={chapters} />
          <RecentActivitySection />
        </>
      )}
    </div>
  );
}

function WelcomeSection({
  isNewStudent,
  resumeState,
  lastSession,
  chapterTitle,
}: {
  isNewStudent: boolean;
  resumeState: ResumeState;
  lastSession: StudentHistorySummary["lastSession"];
  chapterTitle: (chapterId?: string) => string | undefined;
}) {
  const canResume = resumeState === "adaptive" || resumeState === "non-adaptive";
  return (
    <section className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-zinc-50 p-6 dark:border-zinc-800 dark:bg-zinc-950">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-black dark:text-zinc-50">
          {isNewStudent ? "Welcome" : "Welcome back"}
        </h2>
        <p className="mt-1 max-w-xl text-sm leading-6 text-zinc-600 dark:text-zinc-400">
          {canResume
            ? `You have a practice session in progress (${resumeState === "adaptive" ? "adaptive" : "non-adaptive"}).`
            : isNewStudent
              ? "Start with an initial diagnostic to see what the adaptive tutor estimates about your current mastery."
              : lastSession
                ? `Last session: ${lastSession.type === "adaptive" ? "Adaptive" : "Non-Adaptive"} practice${chapterTitle(lastSession.chapterId) ? ` — ${chapterTitle(lastSession.chapterId)}` : ""}, ${Math.round(lastSession.accuracy * 100)}% accuracy.`
                : "Ready for your next practice session."}
        </p>
      </div>
      <div className="flex flex-wrap gap-3">
        {canResume ? (
          <Link href="/practice" className="rounded-lg bg-black px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-50 dark:text-black dark:hover:bg-zinc-200">
            Resume Session
          </Link>
        ) : isNewStudent ? (
          <Link href="/assessments" className="rounded-lg bg-black px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-50 dark:text-black dark:hover:bg-zinc-200">
            Start Initial Diagnostic
          </Link>
        ) : (
          <Link href="/practice" className="rounded-lg bg-black px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-50 dark:text-black dark:hover:bg-zinc-200">
            Start Practice
          </Link>
        )}
        {!isNewStudent && (
          <Link href="/progress" className="rounded-lg border border-zinc-300 px-5 py-2.5 text-sm font-medium text-black transition-colors hover:border-black dark:border-zinc-700 dark:text-zinc-50 dark:hover:border-zinc-50">
            View My Progress
          </Link>
        )}
      </div>
    </section>
  );
}

function MetricsSection({ summary }: { summary: StudentHistorySummary }) {
  const metrics = [
    { label: "Sessions completed", value: summary.totalSessions },
    { label: "Assessments completed", value: summary.assessmentsCompleted },
    { label: "Questions answered", value: summary.totalQuestionsAnswered },
    { label: "Recent accuracy", value: summary.recentAccuracy === null ? "—" : `${Math.round(summary.recentAccuracy * 100)}%` },
    { label: "Concepts practised", value: summary.conceptsPractised },
    { label: "Concepts meeting mastery criteria", value: summary.conceptsMeetingMasteryCriteria },
  ];
  return (
    <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {metrics.map((m) => (
        <div key={m.label} className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
          <p className="text-2xl font-semibold text-black dark:text-zinc-50">{m.value}</p>
          <p className="mt-1 text-xs leading-4 text-zinc-500 dark:text-zinc-400">{m.label}</p>
        </div>
      ))}
    </section>
  );
}

function DiagnosticsSection({
  concepts,
  allConcepts,
  masteryThreshold,
  remediationThreshold,
  chapterTitle,
}: {
  concepts: ConceptProgressRow[];
  allConcepts: ConceptNode[];
  masteryThreshold: number;
  remediationThreshold: number;
  chapterTitle: (chapterId?: string) => string | undefined;
}) {
  const strongest = [...concepts].sort((a, b) => b.masteryAfterPercent - a.masteryAfterPercent).slice(0, 5);
  const needsPractice = concepts.filter((c) => c.masteryAfterPercent < masteryThreshold).sort((a, b) => a.masteryAfterPercent - b.masteryAfterPercent);
  const limitedEvidence = concepts.filter((c) => c.evidenceLevel.toLowerCase().includes("limited") || c.evidenceLevel.toLowerCase().includes("insufficient"));

  const practisedIds = new Set(concepts.map((c) => c.conceptId));
  const lowMasteryIds = new Set(concepts.filter((c) => c.masteryAfterPercent < remediationThreshold).map((c) => c.conceptId));
  const prerequisiteGaps = concepts
    .filter((c) => lowMasteryIds.has(c.conceptId))
    .flatMap((c) => {
      const node = allConcepts.find((n) => n.id === c.conceptId);
      if (!node) return [];
      const weakOrUnpractisedPrereqs = node.prerequisiteIds.filter((pid) => !practisedIds.has(pid) || lowMasteryIds.has(pid));
      return weakOrUnpractisedPrereqs.map((pid) => ({ conceptId: c.conceptId, conceptName: c.conceptName, prerequisiteId: pid, prerequisiteName: allConcepts.find((n) => n.id === pid)?.name ?? pid }));
    })
    .slice(0, 5);

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold text-black dark:text-zinc-50">Diagnostics</h2>
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        These reflect the deterministic mastery estimator&apos;s recorded evidence, not a confirmed diagnosis of what you do or
        don&apos;t know — a single incorrect answer is evidence consistent with a misconception, never proof of one.
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        <DiagnosticCard title="Strongest evidenced concepts">
          {strongest.length === 0 ? (
            <EmptyNote>No concepts observed yet.</EmptyNote>
          ) : (
            <ul className="flex flex-col gap-1.5 text-sm">
              {strongest.map((c) => (
                <li key={c.conceptId} className="flex items-center justify-between gap-2">
                  <span className="text-black dark:text-zinc-50">{c.conceptName}</span>
                  <span className="shrink-0 text-emerald-700 dark:text-emerald-400">{c.masteryAfterPercent}%</span>
                </li>
              ))}
            </ul>
          )}
        </DiagnosticCard>

        <DiagnosticCard title="Concepts requiring additional practice">
          {needsPractice.length === 0 ? (
            <EmptyNote>None below the mastery criterion right now.</EmptyNote>
          ) : (
            <ul className="flex flex-col gap-1.5 text-sm">
              {needsPractice.slice(0, 5).map((c) => (
                <li key={c.conceptId} className="flex items-center justify-between gap-2">
                  <span className="text-black dark:text-zinc-50">{c.conceptName}</span>
                  <span className="shrink-0 text-amber-700 dark:text-amber-400">{c.masteryAfterPercent}%</span>
                </li>
              ))}
            </ul>
          )}
        </DiagnosticCard>

        <DiagnosticCard title="Concepts with limited evidence">
          {limitedEvidence.length === 0 ? (
            <EmptyNote>No concepts currently flagged with limited evidence.</EmptyNote>
          ) : (
            <ul className="flex flex-col gap-1.5 text-sm">
              {limitedEvidence.slice(0, 5).map((c) => (
                <li key={c.conceptId} className="text-black dark:text-zinc-50">
                  {c.conceptName} <span className="text-zinc-500 dark:text-zinc-400">({c.evidenceLevel})</span>
                </li>
              ))}
            </ul>
          )}
        </DiagnosticCard>

        <DiagnosticCard title="Potential prerequisite gaps">
          {prerequisiteGaps.length === 0 ? (
            <EmptyNote>No low-mastery concept currently points to an unpractised or weak prerequisite.</EmptyNote>
          ) : (
            <ul className="flex flex-col gap-1.5 text-sm">
              {prerequisiteGaps.map((g, i) => (
                <li key={`${g.conceptId}-${g.prerequisiteId}-${i}`} className="text-black dark:text-zinc-50">
                  <span className="font-medium">{g.conceptName}</span> may depend on <span className="font-medium">{g.prerequisiteName}</span>, not yet well-evidenced.
                </li>
              ))}
            </ul>
          )}
        </DiagnosticCard>
      </div>

      <RecommendationsRow needsPractice={needsPractice} chapterTitle={chapterTitle} allConcepts={allConcepts} />
    </section>
  );
}

function RecommendationsRow({
  needsPractice,
  allConcepts,
}: {
  needsPractice: ConceptProgressRow[];
  chapterTitle: (chapterId?: string) => string | undefined;
  allConcepts: ConceptNode[];
}) {
  const recommendations = needsPractice.slice(0, 3).map((c) => ({ ...c, chapterId: allConcepts.find((n) => n.id === c.conceptId)?.chapterId }));
  if (recommendations.length === 0) return null;
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950/30">
      <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-200">Recommended practice</h3>
      <p className="text-xs text-blue-800 dark:text-blue-300">
        Based on the adaptive engine&apos;s own prerequisite-aware targeting and your recorded evidence.
      </p>
      <div className="mt-1 flex flex-wrap gap-2">
        {recommendations.map((r) => (
          <Link
            key={r.conceptId}
            href={r.chapterId ? `/practice?mode=adaptive&chapter=${r.chapterId}&autostart=1` : "/practice?mode=adaptive&autostart=1"}
            className="rounded-md border border-blue-300 bg-white px-3 py-1.5 text-xs font-medium text-blue-900 transition-colors hover:border-blue-500 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200"
          >
            Practice {r.conceptName}
          </Link>
        ))}
      </div>
    </div>
  );
}

function ConceptMasterySection({ concepts, chapters }: { concepts: ConceptProgressRow[]; chapters: ChapterOption[] }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  if (concepts.length === 0) return null;

  const byChapter = new Map<string, ConceptProgressRow[]>();
  const noChapter: ConceptProgressRow[] = [];
  for (const c of concepts) {
    if (!c.chapterId) {
      noChapter.push(c);
      continue;
    }
    const list = byChapter.get(c.chapterId) ?? [];
    list.push(c);
    byChapter.set(c.chapterId, list);
  }

  function toggle(chapterId: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(chapterId)) next.delete(chapterId);
      else next.add(chapterId);
      return next;
    });
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold text-black dark:text-zinc-50">Concept mastery</h2>
      <div className="flex flex-col divide-y divide-zinc-200 rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
        {[...byChapter.entries()].map(([chapterId, rows]) => {
          const title = chapters.find((c) => c.chapterId === chapterId)?.title ?? chapterId;
          const isOpen = expanded.has(chapterId);
          const avg = Math.round(rows.reduce((s, r) => s + r.masteryAfterPercent, 0) / rows.length);
          return (
            <div key={chapterId}>
              <button type="button" onClick={() => toggle(chapterId)} className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-zinc-50 dark:hover:bg-zinc-900">
                <span className="text-sm font-medium text-black dark:text-zinc-50">{title}</span>
                <span className="flex items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400">
                  {rows.length} concept{rows.length === 1 ? "" : "s"} · avg {avg}%
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={`h-3.5 w-3.5 transition-transform ${isOpen ? "rotate-180" : ""}`}>
                    <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              </button>
              {isOpen && (
                <div className="flex flex-col gap-2 px-4 pb-4">
                  {rows.map((r) => (
                    <ConceptMasteryBar key={r.conceptId} row={r} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
        {noChapter.length > 0 && (
          <div className="flex flex-col gap-2 px-4 py-3">
            {noChapter.map((r) => (
              <ConceptMasteryBar key={r.conceptId} row={r} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function ConceptMasteryBar({ row }: { row: ConceptProgressRow }) {
  const statusLabel = row.masteryAfterPercent >= MASTERY_THRESHOLD_PERCENT ? "Mastered" : row.evidenceLevel.toLowerCase().includes("insufficient") || row.evidenceLevel.toLowerCase().includes("limited") ? "Insufficient evidence" : "Developing";
  const statusColor =
    statusLabel === "Mastered"
      ? "text-emerald-700 dark:text-emerald-400"
      : statusLabel === "Insufficient evidence"
        ? "text-zinc-500 dark:text-zinc-400"
        : "text-amber-700 dark:text-amber-400";
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-black dark:text-zinc-50">{row.conceptName}</span>
        <span className={`text-xs font-medium ${statusColor}`}>{statusLabel} · {row.masteryAfterPercent}%</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
        <div className="h-full rounded-full bg-black dark:bg-zinc-50" style={{ width: `${row.masteryAfterPercent}%` }} />
      </div>
    </div>
  );
}

function RecentActivitySection() {
  const sessions = listSessions().slice(0, 5);
  if (sessions.length === 0) return null;
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-black dark:text-zinc-50">Recent activity</h2>
        <Link href="/history" className="text-sm text-zinc-500 underline underline-offset-2 hover:text-black dark:text-zinc-400 dark:hover:text-zinc-50">
          View all
        </Link>
      </div>
      <div className="flex flex-col divide-y divide-zinc-200 rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
        {sessions.map((s) => (
          <Link key={s.id} href={`/history/${encodeURIComponent(s.id)}`} className="flex items-center justify-between gap-3 px-4 py-3 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-900">
            <div className="flex flex-col">
              <span className="font-medium text-black dark:text-zinc-50">
                {s.type === "adaptive" ? "Adaptive" : "Non-Adaptive"} {s.source === "assessment" ? "Assessment" : "Practice"}
                {s.chapterTitle ? ` — ${s.chapterTitle}` : ""}
              </span>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">{new Date(s.completedAt).toLocaleString()}</span>
            </div>
            <span className="shrink-0 text-sm text-zinc-600 dark:text-zinc-400">{Math.round(s.accuracy * 100)}% · {s.totalQuestions}q</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

function DiagnosticCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      <h3 className="mb-2 text-sm font-semibold text-black dark:text-zinc-50">{title}</h3>
      {children}
    </div>
  );
}

function EmptyNote({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-zinc-500 dark:text-zinc-400">{children}</p>;
}

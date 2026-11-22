"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getConceptDetailAction, listCurriculumAction, type ChapterOption, type ConceptNode } from "@/app/progress/actions";
import { listSessions } from "@/lib/studentHistory";
import { resolveAuthoritativeMastery, type MasteryAuthoritySource } from "@/lib/masteryAuthority";
import { buildProgressView, type ConceptProgressRow } from "@/tutoring/adaptiveSession/progress";
import { DEFAULT_ADAPTIVE_SELECTION_CONFIG } from "@/tutoring/selection/adaptive/config";

type SortKey = "name" | "mastery" | "evidence";

export default function ProgressClient() {
  const [concepts, setConcepts] = useState<ConceptProgressRow[] | null>(null);
  const [masterySource, setMasterySource] = useState<MasteryAuthoritySource>("none");
  const [fromSessionId, setFromSessionId] = useState<string | undefined>(undefined);
  const [fromUpdatedAt, setFromUpdatedAt] = useState<string | undefined>(undefined);
  const [chapters, setChapters] = useState<ChapterOption[]>([]);
  const [allConcepts, setAllConcepts] = useState<ConceptNode[]>([]);
  const [chapterFilter, setChapterFilter] = useState<string>("");
  const [sortKey, setSortKey] = useState<SortKey>("mastery");

  useEffect(() => {
    // Stage 3 Priority 2: sourced from the SAME single authoritative resolver the Dashboard uses —
    // see src/lib/masteryAuthority.ts and docs/stage3-ui-integration-report.md Priority 2.
    Promise.all([listCurriculumAction(), resolveAuthoritativeMastery()]).then(([curriculum, mastery]) => {
      setConcepts(buildProgressView(mastery.states, curriculum.concepts, DEFAULT_ADAPTIVE_SELECTION_CONFIG.minEvidenceCount));
      setMasterySource(mastery.source);
      setFromSessionId(mastery.fromSessionId);
      setFromUpdatedAt(mastery.fromUpdatedAt);
      setChapters(curriculum.chapters);
      setAllConcepts(curriculum.concepts);
    });
  }, []);

  if (!concepts) {
    return <p className="text-base text-zinc-500 dark:text-zinc-400">Loading…</p>;
  }

  return (
    <div className="flex flex-col gap-10">
      <MasteryProvenanceNote source={masterySource} fromSessionId={fromSessionId} fromUpdatedAt={fromUpdatedAt} />
      <ConceptExplorer
        concepts={concepts}
        chapters={chapters}
        chapterFilter={chapterFilter}
        sortKey={sortKey}
        onChapterFilterChange={setChapterFilter}
        onSortKeyChange={setSortKey}
      />
      <MasteryProgression />
      <PrerequisiteExplorer allConcepts={allConcepts} concepts={concepts} />
    </div>
  );
}

/**
 * Stage 3 Priority 2: every row below comes from exactly ONE snapshot (the most recently completed
 * adaptive session's durable server record, or — only when no such record exists yet for this
 * browser — a locally saved fallback), so provenance is stated ONCE here rather than per-row, which
 * is also more accurate than the old per-row "from session" column: that column could previously
 * point to a DIFFERENT historical session for each concept, even though every row's CURRENT value
 * has always come from one single, most-recent evaluation.
 */
function MasteryProvenanceNote({ source, fromSessionId, fromUpdatedAt }: { source: MasteryAuthoritySource; fromSessionId?: string; fromUpdatedAt?: string }) {
  if (source === "none") return null;
  const dateLabel = fromUpdatedAt ? new Date(fromUpdatedAt).toLocaleString() : "an earlier session";
  if (source === "durable") {
    return (
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        Current estimates are from your{" "}
        {fromSessionId ? (
          <Link href={`/history/${encodeURIComponent(fromSessionId)}`} className="underline underline-offset-2 hover:text-black dark:hover:text-zinc-50">
            session completed {dateLabel}
          </Link>
        ) : (
          `session completed ${dateLabel}`
        )}
        , the server&apos;s own durable record — not re-derived from any local snapshot.
      </p>
    );
  }
  return (
    <p className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
      Showing mastery saved in this browser (last updated {dateLabel}) from before server-side session records existed. It
      will be replaced by the server&apos;s own record as soon as your next adaptive session completes.
    </p>
  );
}

function ConceptExplorer({
  concepts,
  chapters,
  chapterFilter,
  sortKey,
  onChapterFilterChange,
  onSortKeyChange,
}: {
  concepts: ConceptProgressRow[];
  chapters: ChapterOption[];
  chapterFilter: string;
  sortKey: SortKey;
  onChapterFilterChange: (v: string) => void;
  onSortKeyChange: (v: SortKey) => void;
}) {
  const observed = concepts.filter((c) => c.observed);
  const filtered = chapterFilter ? observed.filter((c) => c.chapterId === chapterFilter) : observed;
  const sorted = [...filtered].sort((a, b) => {
    if (sortKey === "name") return a.conceptName.localeCompare(b.conceptName);
    if (sortKey === "evidence") return a.evidenceLevel.localeCompare(b.evidenceLevel);
    return b.masteryAfterPercent - a.masteryAfterPercent;
  });

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-black dark:text-zinc-50">Concept mastery explorer</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Every value here is the Phase 3 estimator&apos;s own recorded figure, as of your most recently completed adaptive session (see above).</p>
        </div>
        <div className="flex gap-2">
          <select value={chapterFilter} onChange={(e) => onChapterFilterChange(e.target.value)} className="rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm text-black dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50">
            <option value="">All chapters</option>
            {chapters.map((c) => (
              <option key={c.chapterId} value={c.chapterId}>
                {c.title}
              </option>
            ))}
          </select>
          <select value={sortKey} onChange={(e) => onSortKeyChange(e.target.value as SortKey)} className="rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm text-black dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50">
            <option value="mastery">Sort by mastery</option>
            <option value="name">Sort by name</option>
            <option value="evidence">Sort by evidence</option>
          </select>
        </div>
      </div>

      {sorted.length === 0 ? (
        <p className="rounded-lg border border-zinc-200 p-6 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
          No concepts practised yet. <Link href="/practice" className="underline">Start a practice session</Link> to begin building this view.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50 text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
                <th className="px-4 py-2 font-medium">Concept</th>
                <th className="px-4 py-2 font-medium">Evidence</th>
                <th className="px-4 py-2 font-medium">Mastery</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((c) => (
                <tr key={c.conceptId} className="border-b border-zinc-100 last:border-0 dark:border-zinc-900">
                  <td className="px-4 py-2 text-black dark:text-zinc-50">{c.conceptName}</td>
                  <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">{c.evidenceLevel}</td>
                  <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">{c.masteryAfterPercent}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function MasteryProgression() {
  const sessions = useMemo(() => [...listSessions()].reverse(), []); // oldest first, for a left-to-right timeline
  const byConcept = useMemo(() => {
    const map = new Map<string, { conceptName: string; points: { completedAt: string; masteryAfterPercent: number }[] }>();
    for (const session of sessions) {
      for (const c of session.concepts) {
        const entry = map.get(c.conceptId) ?? { conceptName: c.conceptName, points: [] };
        entry.points.push({ completedAt: session.completedAt, masteryAfterPercent: c.masteryAfterPercent });
        map.set(c.conceptId, entry);
      }
    }
    return [...map.entries()].filter(([, v]) => v.points.length > 1); // only concepts with real history to show
  }, [sessions]);

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold text-black dark:text-zinc-50">Mastery progression</h2>
      <p className="text-sm text-zinc-500 dark:text-zinc-400">Concepts practised across more than one session, oldest to most recent. No historical data is invented for a concept seen only once.</p>
      {byConcept.length === 0 ? (
        <p className="rounded-lg border border-zinc-200 p-6 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
          Practise the same topic across two or more sessions to see progression here.
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {byConcept.map(([conceptId, { conceptName, points }]) => (
            <div key={conceptId} className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
              <p className="mb-2 text-sm font-medium text-black dark:text-zinc-50">{conceptName}</p>
              <div className="flex items-end gap-1.5">
                {points.map((p, i) => (
                  <div key={i} className="flex flex-col items-center gap-1" title={`${new Date(p.completedAt).toLocaleDateString()}: ${p.masteryAfterPercent}%`}>
                    <div className="flex h-16 w-6 items-end rounded-sm bg-zinc-100 dark:bg-zinc-900">
                      <div className="w-full rounded-sm bg-black dark:bg-zinc-50" style={{ height: `${p.masteryAfterPercent}%` }} />
                    </div>
                    <span className="text-[10px] text-zinc-400">{p.masteryAfterPercent}%</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function PrerequisiteExplorer({ allConcepts, concepts }: { allConcepts: ConceptNode[]; concepts: ConceptProgressRow[] }) {
  const [selectedId, setSelectedId] = useState<string>("");
  const [detail, setDetail] = useState<Awaited<ReturnType<typeof getConceptDetailAction>> | null>(null);
  const masteryById = new Map(concepts.map((c) => [c.conceptId, c]));

  useEffect(() => {
    if (!selectedId) {
      Promise.resolve().then(() => setDetail(null));
      return;
    }
    getConceptDetailAction(selectedId).then(setDetail);
  }, [selectedId]);

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold text-black dark:text-zinc-50">Prerequisite explorer</h2>
      <p className="text-sm text-zinc-500 dark:text-zinc-400">Select a concept to inspect its prerequisites and dependents from the actual curriculum graph (109 concepts total — shown one at a time, never all at once).</p>
      <select value={selectedId} onChange={(e) => setSelectedId(e.target.value)} className="max-w-md rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-black dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50">
        <option value="">Choose a concept…</option>
        {allConcepts.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
            {c.chapterTitle ? ` (${c.chapterTitle})` : ""}
          </option>
        ))}
      </select>

      {detail && (
        <div className="grid gap-4 md:grid-cols-2">
          <ConceptList title={`Prerequisites of "${detail.concept.name}"`} items={detail.prerequisites} masteryById={masteryById} emptyText="No prerequisites — this is a foundational concept." />
          <ConceptList title={`Concepts that depend on "${detail.concept.name}"`} items={detail.dependents} masteryById={masteryById} emptyText="No other concept currently lists this as a prerequisite." />
        </div>
      )}
    </section>
  );
}

function ConceptList({ title, items, masteryById, emptyText }: { title: string; items: ConceptNode[]; masteryById: Map<string, ConceptProgressRow>; emptyText: string }) {
  return (
    <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      <h3 className="mb-2 text-sm font-semibold text-black dark:text-zinc-50">{title}</h3>
      {items.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">{emptyText}</p>
      ) : (
        <ul className="flex flex-col gap-1.5 text-sm">
          {items.map((item) => {
            const mastery = masteryById.get(item.id);
            return (
              <li key={item.id} className="flex items-center justify-between gap-2">
                <span className="text-black dark:text-zinc-50">{item.name}</span>
                <span className="shrink-0 text-xs text-zinc-500 dark:text-zinc-400">{mastery ? `${mastery.masteryAfterPercent}%` : "not yet practised"}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

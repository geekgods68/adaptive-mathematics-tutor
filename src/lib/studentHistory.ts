/**
 * Client-side persistence for the Student Workspace (Part E1/E2 of the
 * redesign spec). This repository has no database and no existing
 * server-side session persistence (both src/tutoring/session/store.ts
 * and src/tutoring/adaptiveSession/store.ts are explicitly
 * server-process-lifetime, in-memory only — see their own doc
 * comments). A completed session's summary is therefore the thing
 * persisted here, in the browser's localStorage, scoped entirely to
 * "real student practice" data — never synthetic/simulated Phase 8
 * data, which lives in research-output/ on the server and is read by
 * the Researcher Workspace through its own, completely separate code
 * path (src/app/research/**). The two are never merged.
 *
 * This module is the single source of truth the Student Dashboard, My
 * Progress, and Session History pages all read from (Part E1).
 */

export type SessionType = "adaptive" | "non-adaptive";

export interface ConceptMasterySnapshot {
  conceptId: string;
  conceptName: string;
  chapterId?: string;
  evidenceLevel: string;
  masteryBeforePercent: number;
  masteryAfterPercent: number;
}

export interface SessionHistoryRecord {
  /** The backend session id (from the cookie-tracked in-memory session) where available, so a record can be traced back to /dev/* for a researcher-mode deep inspection; falls back to a generated id if unavailable. */
  id: string;
  type: SessionType;
  /** Which part of the Student Workspace started this session — Practice and Assessments both run the identical underlying engine (Part C3: "use existing assessment functionality without inventing new research procedures"), this just tracks where the student entered from, for the Dashboard's separate "Assessments completed" metric. */
  source: "practice" | "assessment";
  chapterId?: string;
  chapterTitle?: string;
  startedAt: string;
  completedAt: string;
  totalQuestions: number;
  correctAnswers: number;
  accuracy: number;
  /** Per-concept mastery before/after, from the Phase 3 estimator's own recorded values (buildAdaptiveSessionSummary) — empty for non-adaptive sessions, which have no per-concept breakdown today. Never recomputed or inferred here. */
  concepts: ConceptMasterySnapshot[];
  conceptsNeedingPractice: string[];
}

const STORAGE_KEY = "rise-student-history-v1";
const MAX_RECORDS = 200; // generous cap so localStorage can't grow unbounded over a long local testing session

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

/** Safe parse: a corrupted or incompatible (E1: "handle corrupted or incompatible records safely") stored value is treated as empty history, never thrown. */
function readAll(): SessionHistoryRecord[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // `source` was added after this schema's first version; default older stored records to
    // "practice" rather than rejecting them outright (E1: "handle ... incompatible records safely").
    return parsed.filter(isValidRecord).map((r) => (r.source === "practice" || r.source === "assessment" ? r : { ...r, source: "practice" as const }));
  } catch {
    return [];
  }
}

function isValidRecord(value: unknown): value is SessionHistoryRecord {
  if (!value || typeof value !== "object") return false;
  const r = value as Partial<SessionHistoryRecord>;
  return (
    typeof r.id === "string" &&
    (r.type === "adaptive" || r.type === "non-adaptive") &&
    typeof r.completedAt === "string" &&
    typeof r.totalQuestions === "number" &&
    typeof r.correctAnswers === "number" &&
    typeof r.accuracy === "number" &&
    Array.isArray(r.concepts)
  );
}

function writeAll(records: SessionHistoryRecord[]): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records.slice(0, MAX_RECORDS)));
  } catch {
    // Storage full or disabled — the in-memory session still completed normally; we just can't persist it.
  }
}

/** All recorded sessions, most recently completed first. */
export function listSessions(): SessionHistoryRecord[] {
  return [...readAll()].sort((a, b) => b.completedAt.localeCompare(a.completedAt));
}

export function getSessionRecord(id: string): SessionHistoryRecord | undefined {
  return readAll().find((r) => r.id === id);
}

/** Appends a completed session. Idempotent on `id` — recording the same session twice (e.g. a React effect re-run) updates rather than duplicates. */
export function recordSession(record: SessionHistoryRecord): void {
  const existing = readAll();
  const withoutDuplicate = existing.filter((r) => r.id !== record.id);
  writeAll([record, ...withoutDuplicate]);
}

export function clearHistory(): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to do if storage is unavailable.
  }
}

export interface StudentHistorySummary {
  totalSessions: number;
  assessmentsCompleted: number;
  totalQuestionsAnswered: number;
  recentAccuracy: number | null;
  conceptsPractised: number;
  conceptsMeetingMasteryCriteria: number;
  lastSession: SessionHistoryRecord | null;
}

/**
 * Aggregate figures for the Dashboard. Everything here is a direct read
 * or simple count over persisted SESSION-HISTORY records only — never an
 * invented or cross-session-averaged "mastery" number.
 *
 * Stage 3 Priority 2 (mastery-state duplication fix): `conceptsPractised`
 * and `conceptsMeetingMasteryCriteria` used to be derived from this same
 * session-history list (`currentMasteryByConcept`, now removed) — a
 * SECOND, independently-written notion of "current mastery" competing
 * with `studentMasteryState.ts`'s own copy. They are now supplied by the
 * caller, which must source them from the single authoritative resolver
 * (`src/lib/masteryAuthority.ts`'s `resolveAuthoritativeMastery` +
 * `buildProgressView`) instead. This function no longer computes or
 * implies any "current mastery" figure on its own.
 */
export function buildHistorySummary(currentMasteryRows: { observed: boolean; masteryAfterPercent: number }[], masteryProgressionThresholdPercent: number): StudentHistorySummary {
  const sessions = listSessions();
  const recentSessions = sessions.slice(0, 5);
  const observedRows = currentMasteryRows.filter((r) => r.observed);
  return {
    totalSessions: sessions.length,
    assessmentsCompleted: sessions.filter((s) => s.source === "assessment").length,
    totalQuestionsAnswered: sessions.reduce((sum, s) => sum + s.totalQuestions, 0),
    recentAccuracy: recentSessions.length > 0 ? recentSessions.reduce((sum, s) => sum + s.accuracy, 0) / recentSessions.length : null,
    conceptsPractised: observedRows.length,
    conceptsMeetingMasteryCriteria: observedRows.filter((r) => r.masteryAfterPercent >= masteryProgressionThresholdPercent).length,
    lastSession: sessions[0] ?? null,
  };
}

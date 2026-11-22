/**
 * Client-side persistence of a student's real, persisted adaptive
 * mastery state — the single source of truth that lets a new adaptive
 * session start from where the student's last one left off, instead of
 * cold-starting every time (see docs/development-log.md's "repeated
 * question" root-cause investigation). Stores exactly the client-safe
 * `PersistableConceptMasteryState` shape the server already sanitized
 * (src/tutoring/adaptiveSession/masteryStateTransfer.ts) — this module
 * never adds, removes, or reinterprets fields, and never derives mastery
 * from aggregate accuracy or any other recomputation.
 *
 * Scoped entirely to real student data (localStorage), never Phase 8
 * synthetic data (server-side research-output/), matching the same
 * student/research separation as studentHistory.ts.
 */

import type { PersistableConceptMasteryState } from "@/tutoring/adaptiveSession/masteryStateTransfer";

const STORAGE_KEY = "rise-student-mastery-state-v1";

export interface StoredMasteryState {
  modelVersion: string;
  updatedAt: string;
  states: Record<string, PersistableConceptMasteryState>;
}

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function isPlausibleEntry(value: unknown): value is PersistableConceptMasteryState {
  if (!value || typeof value !== "object") return false;
  const v = value as Partial<PersistableConceptMasteryState>;
  return (
    typeof v.conceptId === "string" &&
    typeof v.mastery === "number" &&
    typeof v.initialMastery === "number" &&
    typeof v.numObservations === "number" &&
    typeof v.correctCount === "number" &&
    typeof v.incorrectCount === "number" &&
    typeof v.consecutiveCorrect === "number" &&
    typeof v.consecutiveIncorrect === "number" &&
    typeof v.modelVersion === "string" &&
    typeof v.createdAt === "string" &&
    typeof v.lastUpdatedAt === "string"
  );
}

/**
 * Reads the stored snapshot as-is, including whichever `modelVersion` it
 * was written under. This module does NOT gate on a known-good version —
 * the client has no independent way to know the server's current
 * estimator version without an extra round trip, and none is needed:
 * `reconstructMasteryStatesForSession` (service.ts) re-validates every
 * field, including `modelVersion`, per concept, authoritatively, on the
 * server, and silently drops any concept that doesn't match rather than
 * failing the whole session start. This client copy is never trusted as
 * more than a transport vehicle back to that check.
 */
export function readMasteryState(): StoredMasteryState | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const candidate = parsed as Partial<StoredMasteryState>;
    if (typeof candidate.modelVersion !== "string" || !candidate.states || typeof candidate.states !== "object") return null;
    const states: Record<string, PersistableConceptMasteryState> = {};
    for (const [conceptId, entry] of Object.entries(candidate.states)) {
      if (isPlausibleEntry(entry) && entry.conceptId === conceptId) states[conceptId] = entry;
    }
    return { modelVersion: candidate.modelVersion, updatedAt: typeof candidate.updatedAt === "string" ? candidate.updatedAt : new Date().toISOString(), states };
  } catch {
    return null;
  }
}

/** Overwrites the stored snapshot with a completed session's full, cumulative mastery-state map (already a superset of any prior state the session itself was seeded with — see service.ts's `getPersistableMasteryStates`). A full replace, never a partial merge: the server-side snapshot already carries forward every concept the student has ever touched. */
export function writeMasteryState(modelVersion: string, states: Record<string, PersistableConceptMasteryState>): void {
  if (!isBrowser()) return;
  try {
    const payload: StoredMasteryState = { modelVersion, updatedAt: new Date().toISOString(), states };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Storage full or disabled — the completed session still recorded its summary in studentHistory; mastery continuity just won't persist this time.
  }
}

export function clearMasteryState(): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to do if storage is unavailable.
  }
}

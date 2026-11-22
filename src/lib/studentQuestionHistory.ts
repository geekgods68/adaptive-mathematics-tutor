/**
 * Client-side persistence of cross-session "already seen" question ids,
 * oldest-first — the other half of the session-continuity fix alongside
 * studentMasteryState.ts. Fed into `startAdaptiveSessionAction`'s
 * `seenQuestionIdsOldestFirst`, which the server wraps into
 * createCrossSessionAwareSelectionAdapter (studentSelectionAdapter.ts)
 * to prefer unseen questions without touching the protected selection
 * algorithm. Question ids are already client-visible data (part of
 * `PublicAdaptiveQuestionView`), so storing them here introduces no new
 * research-metadata exposure.
 */

const STORAGE_KEY = "rise-student-question-history-v1";
const MAX_TRACKED = 2000; // far larger than the ~1,840-question RISE bank; oldest entries drop first if ever exceeded

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

/** All previously-encountered question ids, oldest-first. Safe to call repeatedly; corrupted or missing storage reads back as "no history" rather than throwing. */
export function readSeenQuestionIds(): string[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id): id is string => typeof id === "string");
  } catch {
    return [];
  }
}

/** Appends newly-encountered question ids (in encounter order) to the stored history, de-duplicating so an id already recorded keeps its ORIGINAL (oldest) position rather than being bumped to "most recently seen" — recency there is only meaningful as a tie-breaker for controlled reuse, and re-seeing a question (e.g. via Review Results) should not make it look freshly novel. */
export function recordSeenQuestionIds(newlySeenOldestFirst: readonly string[]): void {
  if (!isBrowser() || newlySeenOldestFirst.length === 0) return;
  try {
    const existing = readSeenQuestionIds();
    const existingSet = new Set(existing);
    const merged = [...existing, ...newlySeenOldestFirst.filter((id) => !existingSet.has(id))];
    const trimmed = merged.length > MAX_TRACKED ? merged.slice(merged.length - MAX_TRACKED) : merged;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    // Storage full or disabled — the session still completed; cross-session de-duplication just won't persist this time.
  }
}

export function clearSeenQuestionIds(): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to do if storage is unavailable.
  }
}

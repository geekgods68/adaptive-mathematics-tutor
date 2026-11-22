/**
 * Stage 3 Priority 2 (mastery-state duplication fix). A single, stable,
 * PSEUDONYMOUS identifier for "this browser" — not an account, not
 * authentication, not tied to a name/email/IP. It exists purely so the
 * server's durable session store (Stage 2) can answer "what did THIS
 * participant's most recently completed adaptive session estimate their
 * mastery at" — a query that is structurally impossible without SOME
 * stable identifier connecting one browser's sessions to each other,
 * since every prior `startAdaptiveSession` call generated a brand-new
 * random participant id by default.
 *
 * This does NOT create a multi-user system: there is still no login, no
 * server-side account, no way to look up another browser's participant
 * id, and `getCurrentMasteryStateAction` (adaptive-tutor/actions.ts)
 * only ever reads records matching the exact id the caller already
 * holds. This is the same "this browser = this student" model the
 * existing localStorage-only history/settings already assume (see
 * AppShell's "No authentication exists in this prototype" notice) — just
 * extended far enough that the SERVER can recognize "the same browser,
 * later," which it previously could not do at all.
 */

const STORAGE_KEY = "rise-student-participant-id-v1";

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function generateId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `participant-${crypto.randomUUID()}`;
  }
  // Extremely defensive fallback for an environment without crypto.randomUUID (e.g. a very old
  // browser) — never blocks the student from practicing just because this id can't be generated
  // the preferred way. Not cryptographically strong, but this is a pseudonymous convenience id,
  // not a security credential.
  return `participant-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

/**
 * Returns this browser's stable participant id, creating and persisting
 * one on first call. Returns a freshly generated (but NOT persisted) id
 * if localStorage is unavailable (private browsing, storage disabled) —
 * the session still works, it just won't be recognized as "the same
 * participant" on a later visit, which is a strictly safe degradation
 * (falls back to the old cold-start behavior), never an error.
 */
export function getOrCreateParticipantId(): string {
  if (!isBrowser()) return generateId();
  try {
    const existing = window.localStorage.getItem(STORAGE_KEY);
    if (existing) return existing;
    const created = generateId();
    window.localStorage.setItem(STORAGE_KEY, created);
    return created;
  } catch {
    return generateId();
  }
}

/** Used only by "Reset all student practice data" (Settings) — see docs/stage3-ui-integration-report.md section 7/Priority 2. Clearing this means the NEXT session is a genuinely fresh participant id with no durable history to be found under, which is the intended effect of a full reset. */
export function clearParticipantId(): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to do if storage is unavailable.
  }
}

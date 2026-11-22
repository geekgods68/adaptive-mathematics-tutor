/**
 * Lightweight local preferences (Part C6) — deliberately NOT an
 * authentication/cloud-account system, just a few remembered choices
 * for this browser, same localStorage-only approach as
 * studentHistory.ts and for the same reason (no backend persistence
 * exists in this repository to build on).
 */

export type DefaultSessionMode = "adaptive" | "non-adaptive";

export interface StudentSettings {
  defaultMode: DefaultSessionMode;
  /** A chapterId, or undefined for "Across All Topics (Recommended)". */
  defaultChapterId?: string;
}

const STORAGE_KEY = "rise-student-settings-v1";

const DEFAULTS: StudentSettings = {
  defaultMode: "adaptive",
  defaultChapterId: undefined,
};

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function readSettings(): StudentSettings {
  if (!isBrowser()) return DEFAULTS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<StudentSettings>;
    return {
      defaultMode: parsed.defaultMode === "non-adaptive" ? "non-adaptive" : "adaptive",
      defaultChapterId: typeof parsed.defaultChapterId === "string" ? parsed.defaultChapterId : undefined,
    };
  } catch {
    return DEFAULTS;
  }
}

export function writeSettings(settings: StudentSettings): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Storage full or disabled — the current page session still works with the chosen settings, just won't remember them next time.
  }
}

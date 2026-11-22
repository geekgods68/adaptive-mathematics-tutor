"use client";

import { useSyncExternalStore } from "react";
import { THEME_STORAGE_KEY } from "@/components/shell/themeScript";

/**
 * The theme "lives" as a DOM class, not React state (it's set by a
 * blocking inline script before React even mounts, to avoid a flash —
 * see themeScript.ts). useSyncExternalStore is the correct primitive
 * for a value React doesn't own: getServerSnapshot keeps SSR/hydration
 * consistent (no `document` on the server), and the listener set below
 * is how this component's own click handler notifies any other
 * ThemeToggle instance (e.g. on a different page) to re-read the class.
 */
const listeners = new Set<() => void>();

function subscribe(callback: () => void): () => void {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function getSnapshot(): boolean {
  return document.documentElement.classList.contains("dark");
}

function getServerSnapshot(): boolean {
  return false;
}

function setDarkMode(next: boolean): void {
  document.documentElement.classList.toggle("dark", next);
  try {
    localStorage.setItem(THEME_STORAGE_KEY, next ? "dark" : "light");
  } catch {
    // Privacy mode or disabled storage — the toggle still applies to this page view, just won't persist.
  }
  listeners.forEach((listener) => listener());
}

export default function ThemeToggle() {
  const isDark = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  return (
    <button
      type="button"
      onClick={() => setDarkMode(!isDark)}
      aria-pressed={isDark}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-black dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
      title={isDark ? "Switch to light theme" : "Switch to dark theme"}
    >
      {isDark ? (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-4.5 w-4.5">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" strokeLinecap="round" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-4.5 w-4.5">
          <path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5Z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </button>
  );
}

/**
 * Shared navigation header for every top-level page (home, both tutoring
 * interfaces, both /dev diagnostic viewers). Plain links only — no
 * client-side state, so it never risks touching session state (no
 * reset/start action lives here). `current` is passed explicitly by
 * each page rather than derived from the URL, so this stays a server-
 * renderable component.
 */

import Link from "next/link";

export type NavHeaderPage = "home" | "tutor" | "adaptive-tutor" | "dev-session" | "dev-adaptive-session";

const LINKS: Array<{ page: NavHeaderPage; href: string; label: string }> = [
  { page: "home", href: "/", label: "Home" },
  { page: "tutor", href: "/tutor", label: "Non-Adaptive Tutor" },
  { page: "adaptive-tutor", href: "/adaptive-tutor", label: "Adaptive Tutor" },
];

export default function NavHeader({ current }: { current: NavHeaderPage }) {
  return (
    <header className="w-full border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-black">
      <nav aria-label="Main" className="mx-auto flex w-full max-w-2xl flex-wrap items-center gap-x-5 gap-y-1 px-6 py-3 text-sm">
        {LINKS.map((link) => {
          const isActive = link.page === current;
          return (
            <Link
              key={link.page}
              href={link.href}
              aria-current={isActive ? "page" : undefined}
              className={
                isActive
                  ? "font-medium text-black underline underline-offset-4 dark:text-zinc-50"
                  : "text-zinc-500 transition-colors hover:text-black dark:text-zinc-400 dark:hover:text-zinc-50"
              }
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}

"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { RESEARCH_NAV, STUDENT_NAV, isNavItemActive, workspaceForPathname, type Workspace } from "@/components/shell/navConfig";
import ThemeToggle from "@/components/shell/ThemeToggle";

export interface Breadcrumb {
  label: string;
  href?: string;
}

export interface AppShellProps {
  title: string;
  description?: string;
  breadcrumbs?: Breadcrumb[];
  children: ReactNode;
}

/**
 * The shared shell for the new, unified application (Part B2): sidebar
 * with a workspace switcher, active-route highlighting, a top bar with
 * breadcrumbs/title/description, a theme toggle, and a mobile-friendly
 * collapsible sidebar. Only wraps the NEW routes (student + research
 * workspace pages) — the pre-existing /tutor, /adaptive-tutor and
 * /dev/* pages keep their own simple NavHeader (src/components/NavHeader.tsx)
 * rather than being folded in here, to avoid touching working pages
 * unnecessarily.
 */
export default function AppShell({ title, description, breadcrumbs, children }: AppShellProps) {
  const pathname = usePathname();
  const workspace = workspaceForPathname(pathname);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-full flex-1 bg-white dark:bg-black">
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-30 bg-black/30 lg:hidden"
        />
      )}

      <Sidebar workspace={workspace} pathname={pathname} mobileOpen={mobileOpen} onNavigate={() => setMobileOpen(false)} />

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar title={title} description={description} breadcrumbs={breadcrumbs} workspace={workspace} onOpenMenu={() => setMobileOpen(true)} />
        <main className="flex-1 overflow-x-hidden px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="mx-auto w-full max-w-5xl">{children}</div>
        </main>
      </div>
    </div>
  );
}

function Sidebar({
  workspace,
  pathname,
  mobileOpen,
  onNavigate,
}: {
  workspace: Workspace;
  pathname: string;
  mobileOpen: boolean;
  onNavigate: () => void;
}) {
  const items = workspace === "student" ? STUDENT_NAV : RESEARCH_NAV;
  return (
    <aside
      className={[
        "fixed inset-y-0 left-0 z-40 flex w-64 shrink-0 flex-col border-r border-zinc-200 bg-zinc-50 transition-transform dark:border-zinc-800 dark:bg-zinc-950",
        "lg:static lg:translate-x-0",
        mobileOpen ? "translate-x-0" : "-translate-x-full",
      ].join(" ")}
    >
      <div className="flex h-14 items-center gap-2 border-b border-zinc-200 px-4 dark:border-zinc-800">
        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-black text-sm font-semibold text-white dark:bg-zinc-50 dark:text-black">
          R
        </span>
        <span className="text-sm font-semibold text-black dark:text-zinc-50">RISE Mathematics</span>
      </div>

      <WorkspaceSwitcher workspace={workspace} />

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <p className="mb-2 px-2 text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          {workspace === "student" ? "Student Workspace" : "Researcher Workspace"}
        </p>
        <ul className="flex flex-col gap-0.5">
          {items.map((item) => {
            const active = isNavItemActive(item, pathname);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={[
                    "block rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-black text-white dark:bg-zinc-50 dark:text-black"
                      : "text-zinc-600 hover:bg-zinc-200/70 hover:text-black dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50",
                  ].join(" ")}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-zinc-200 px-3 py-3 dark:border-zinc-800">
        <Link
          href="/settings"
          onClick={onNavigate}
          className="block rounded-md px-3 py-2 text-sm text-zinc-500 transition-colors hover:bg-zinc-200/70 hover:text-black dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
        >
          Settings
        </Link>
      </div>
    </aside>
  );
}

function WorkspaceSwitcher({ workspace }: { workspace: Workspace }) {
  return (
    <div className="px-3 pt-3">
      <div className="grid grid-cols-2 gap-1 rounded-lg bg-zinc-200/60 p-1 text-sm dark:bg-zinc-900">
        <Link
          href="/"
          aria-current={workspace === "student" ? "page" : undefined}
          className={[
            "rounded-md px-2 py-1.5 text-center font-medium transition-colors",
            workspace === "student" ? "bg-white text-black shadow-sm dark:bg-zinc-800 dark:text-zinc-50" : "text-zinc-600 hover:text-black dark:text-zinc-400 dark:hover:text-zinc-50",
          ].join(" ")}
        >
          Student
        </Link>
        <Link
          href="/research"
          aria-current={workspace === "research" ? "page" : undefined}
          className={[
            "rounded-md px-2 py-1.5 text-center font-medium transition-colors",
            workspace === "research" ? "bg-white text-black shadow-sm dark:bg-zinc-800 dark:text-zinc-50" : "text-zinc-600 hover:text-black dark:text-zinc-400 dark:hover:text-zinc-50",
          ].join(" ")}
        >
          Researcher
        </Link>
      </div>
      <p className="mt-2 px-1 text-[11px] leading-snug text-amber-800 dark:text-amber-400">
        No authentication exists in this prototype — this switcher is a developer convenience, not access control.
      </p>
    </div>
  );
}

function TopBar({
  title,
  description,
  breadcrumbs,
  workspace,
  onOpenMenu,
}: {
  title: string;
  description?: string;
  breadcrumbs?: Breadcrumb[];
  workspace: Workspace;
  onOpenMenu: () => void;
}) {
  return (
    <header className="sticky top-0 z-20 border-b border-zinc-200 bg-white/90 backdrop-blur dark:border-zinc-800 dark:bg-black/90">
      <div className="flex items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={onOpenMenu}
          aria-label="Open navigation"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100 hover:text-black dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50 lg:hidden"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-5 w-5">
            <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
          </svg>
        </button>

        <div className="min-w-0 flex-1">
          {breadcrumbs && breadcrumbs.length > 0 && (
            <nav aria-label="Breadcrumb" className="mb-0.5 flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400">
              {breadcrumbs.map((crumb, i) => (
                <span key={`${crumb.label}-${i}`} className="flex items-center gap-1">
                  {i > 0 && <span aria-hidden>/</span>}
                  {crumb.href ? (
                    <Link href={crumb.href} className="hover:text-black dark:hover:text-zinc-50">
                      {crumb.label}
                    </Link>
                  ) : (
                    <span>{crumb.label}</span>
                  )}
                </span>
              ))}
            </nav>
          )}
          <div className="flex items-center gap-2">
            <h1 className="truncate text-lg font-semibold tracking-tight text-black dark:text-zinc-50">{title}</h1>
            <span
              className={[
                "hidden shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium sm:inline-block",
                workspace === "student"
                  ? "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300"
                  : "bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300",
              ].join(" ")}
            >
              {workspace === "student" ? "Student" : "Researcher"}
            </span>
          </div>
          {description && <p className="mt-0.5 truncate text-sm text-zinc-500 dark:text-zinc-400">{description}</p>}
        </div>

        <ThemeToggle />
      </div>
    </header>
  );
}

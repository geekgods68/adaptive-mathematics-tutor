import Link from "next/link";
import NavHeader from "@/components/NavHeader";
import AdaptiveTutorClient from "@/app/adaptive-tutor/adaptive-tutor-client";

/**
 * Stage 3 (Part 4): this is the original Phase 7 adaptive-tutor route,
 * kept intact (not removed or redirected — it has its own real,
 * browser-verified session lifecycle). /practice's Adaptive mode is now
 * the canonical student entry point into the same underlying engine
 * (condition C2) plus Stage 2/3's persistence and cross-session
 * continuity integration, which this route does not share. See
 * docs/system-audit/FINDINGS_REGISTER.md F-01 for why these two routes'
 * continuity behavior can differ, and docs/stage3-ui-integration-report.md
 * for the full compatibility-policy rationale.
 */
export default function AdaptiveTutorPage() {
  return (
    <div className="flex flex-1 flex-col items-center bg-zinc-50 font-sans dark:bg-black">
      <NavHeader current="adaptive-tutor" />
      <main className="w-full max-w-2xl px-6 py-16">
        <CompatibilityNotice />
        <AdaptiveTutorClient />
      </main>
    </div>
  );
}

function CompatibilityNotice() {
  return (
    <p className="mb-6 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
      This is a standalone legacy compatibility page for the adaptive engine, kept separate from the Student Workspace&apos;s
      session-continuity and durable-persistence integration. For the current, canonical adaptive practice experience, use{" "}
      <Link href="/practice" className="underline underline-offset-2">
        Practice
      </Link>
      .
    </p>
  );
}

import Link from "next/link";
import NavHeader from "@/components/NavHeader";
import TutorClient from "@/app/tutor/tutor-client";

/**
 * Stage 3 (Part 4): this is the original Phase 3 non-adaptive quadratics
 * tutor (35-question fixed sequence, legacy 161-question bank). It is
 * NOT removed or redirected — doing so would invalidate its own
 * documented contract and tests (docs/tutor-flow.md,
 * docs/non-adaptive-sequence.md) — but it is no longer the canonical
 * student entry point: /practice's non-adaptive mode (condition C0) now
 * covers the same control-condition role on the current canonical RISE
 * bank. This banner is the chosen "explicitly labeled compatibility
 * page" treatment from Stage 3 Part 4, added without touching
 * TutorClient at all.
 */
export default function TutorPage() {
  return (
    <div className="flex flex-1 flex-col items-center bg-zinc-50 font-sans dark:bg-black">
      <NavHeader current="tutor" />
      <main className="w-full max-w-2xl px-6 py-16">
        <CompatibilityNotice />
        <TutorClient />
      </main>
    </div>
  );
}

function CompatibilityNotice() {
  return (
    <p className="mb-6 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
      This is the original quadratics-only tutor, kept as a legacy compatibility page. For the current, canonical
      non-adaptive practice experience (the full RISE question bank), use{" "}
      <Link href="/practice" className="underline underline-offset-2">
        Practice
      </Link>
      .
    </p>
  );
}

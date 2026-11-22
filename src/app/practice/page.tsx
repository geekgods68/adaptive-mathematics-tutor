import { Suspense } from "react";
import AppShell from "@/components/shell/AppShell";
import PracticeClient from "@/app/practice/PracticeClient";

export default function PracticePage() {
  return (
    <AppShell title="Practice" description="Adaptive or non-adaptive mathematics practice, your choice of topic." breadcrumbs={[{ label: "Dashboard", href: "/" }, { label: "Practice" }]}>
      <Suspense fallback={<p className="text-base text-zinc-500 dark:text-zinc-400">Loading…</p>}>
        <PracticeClient />
      </Suspense>
    </AppShell>
  );
}

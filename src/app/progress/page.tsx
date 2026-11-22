import AppShell from "@/components/shell/AppShell";
import ProgressClient from "@/app/progress/ProgressClient";

export default function ProgressPage() {
  return (
    <AppShell title="My Progress" description="Concept mastery, progression over time, and the prerequisite graph." breadcrumbs={[{ label: "Dashboard", href: "/" }, { label: "My Progress" }]}>
      <ProgressClient />
    </AppShell>
  );
}

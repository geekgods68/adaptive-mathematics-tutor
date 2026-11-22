import AppShell from "@/components/shell/AppShell";
import HistoryClient from "@/app/history/HistoryClient";

export default function HistoryPage() {
  return (
    <AppShell title="Session History" description="Every completed practice session recorded in this browser." breadcrumbs={[{ label: "Dashboard", href: "/" }, { label: "Session History" }]}>
      <HistoryClient />
    </AppShell>
  );
}

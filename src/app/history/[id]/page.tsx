import AppShell from "@/components/shell/AppShell";
import HistoryDetailClient from "@/app/history/[id]/HistoryDetailClient";

export default async function HistoryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <AppShell title="Session Details" breadcrumbs={[{ label: "Dashboard", href: "/" }, { label: "Session History", href: "/history" }, { label: "Details" }]}>
      <HistoryDetailClient id={id} />
    </AppShell>
  );
}

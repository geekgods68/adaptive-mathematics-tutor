import AppShell from "@/components/shell/AppShell";
import DashboardClient from "@/app/DashboardClient";

export default function Home() {
  return (
    <AppShell title="Dashboard" description="Your mathematics learning hub.">
      <DashboardClient />
    </AppShell>
  );
}

import AppShell from "@/components/shell/AppShell";
import SettingsClient from "@/app/settings/SettingsClient";

export default function SettingsPage() {
  return (
    <AppShell title="Settings" description="Appearance, practice preferences, and local data." breadcrumbs={[{ label: "Dashboard", href: "/" }, { label: "Settings" }]}>
      <SettingsClient />
    </AppShell>
  );
}

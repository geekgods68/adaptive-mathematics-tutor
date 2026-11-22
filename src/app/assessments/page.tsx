import AppShell from "@/components/shell/AppShell";
import AssessmentsClient from "@/app/assessments/AssessmentsClient";

export default function AssessmentsPage() {
  return (
    <AppShell title="Assessments" description="Deliberate checks on where you stand, using the same engine as Practice." breadcrumbs={[{ label: "Dashboard", href: "/" }, { label: "Assessments" }]}>
      <AssessmentsClient />
    </AppShell>
  );
}

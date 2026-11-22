import AppShell from "@/components/shell/AppShell";
import { EXPERIMENT_CONDITIONS } from "@/research/experiment/conditions";
import { readConfigFileStatuses, readLatestPilotReport, readProtocolStatus } from "@/research/ui/readOnlyData";

function StatusBadge({ status }: { status: "not-implemented" | "ready" | "in-progress" | "completed" | "blocked" | "failed" }) {
  const styles: Record<string, string> = {
    "not-implemented": "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
    ready: "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300",
    "in-progress": "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300",
    completed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300",
    blocked: "bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300",
    failed: "bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300",
  };
  const labels: Record<string, string> = {
    "not-implemented": "Not implemented",
    ready: "Ready",
    "in-progress": "In progress",
    completed: "Completed",
    blocked: "Blocked",
    failed: "Failed",
  };
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status]}`}>{labels[status]}</span>;
}

export default function ResearchOverviewPage() {
  const protocolStatus = readProtocolStatus();
  const configStatus = readConfigFileStatuses();
  const pilot = readLatestPilotReport();

  const statusRows: Array<{ label: string; status: Parameters<typeof StatusBadge>[0]["status"]; note?: string }> = [
    { label: "Phase 8 configuration files", status: configStatus.ok ? "ready" : "blocked", note: configStatus.ok ? `${configStatus.files.length} config files loaded and hashed` : configStatus.error },
    { label: "Simulator (S1-S4 families)", status: "completed", note: "src/research/phase8/simulator/" },
    { label: "Estimators (Det-A/B, BKT, RunProp, EMA, B0, Link)", status: "completed", note: "src/research/phase8/estimators/" },
    { label: "Track A / Track B runners", status: "completed", note: "src/research/phase8/trackA/, trackB/" },
    { label: "Independent verifier (C9.3) and full G/M/B/R/L/S test battery", status: "not-implemented" },
    { label: "analysis/stats.py (C10)", status: "not-implemented" },
    { label: "Full C11 run-record persistence", status: "not-implemented" },
    { label: "8C-Pilot", status: pilot ? "completed" : "ready", note: pilot ? `${pilot.report.totalRuns} runs, ${pilot.report.failureCount} failures (${pilot.source})` : "Not yet run" },
    { label: "8C Confirmatory run", status: "not-implemented", note: "Blocked on protocol/APPROVAL.md, which does not exist" },
    { label: "Protocol approval (protocol/APPROVAL.md)", status: protocolStatus.approvalFileExists ? "completed" : "blocked", note: protocolStatus.approvalFileExists ? undefined : "Not created — author action required" },
  ];

  return (
    <AppShell title="Research Overview" description="Actual implementation and execution status of the Phase 8 research infrastructure." breadcrumbs={[{ label: "Research Overview" }]}>
      <div className="flex flex-col gap-10">
        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold text-black dark:text-zinc-50">Research objective</h2>
          <p className="max-w-3xl text-sm leading-6 text-zinc-600 dark:text-zinc-400">
            This research compares a deterministic, prerequisite-aware mastery-modelling approach (the system powering{" "}
            <code>/practice</code> in Adaptive mode) against computational baselines — Bayesian Knowledge Tracing and simpler
            heuristics — under simulated learners with known ground-truth mastery, across four simulator families and matched
            Track A (predictive accuracy) / Track B (sequencing value) experiments, per{" "}
            <code>protocol/phase8-protocol-v2.md</code>.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold text-black dark:text-zinc-50">Experiment status</h2>
          <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
            <table className="w-full min-w-[560px] text-left text-sm">
              <tbody>
                {statusRows.map((row) => (
                  <tr key={row.label} className="border-b border-zinc-100 last:border-0 dark:border-zinc-900">
                    <td className="px-4 py-2.5 text-black dark:text-zinc-50">{row.label}</td>
                    <td className="px-4 py-2.5">
                      <StatusBadge status={row.status} />
                    </td>
                    <td className="px-4 py-2.5 text-xs text-zinc-500 dark:text-zinc-400">{row.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold text-black dark:text-zinc-50">Experimental conditions (registered)</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {Object.entries(EXPERIMENT_CONDITIONS).map(([id, cond]) => (
              <div key={id} className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
                <p className="text-sm font-semibold text-black dark:text-zinc-50">{id}</p>
                <p className="mt-1 text-xs leading-5 text-zinc-600 dark:text-zinc-400">{cond.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold text-black dark:text-zinc-50">Recent experiment activity</h2>
          {pilot ? (
            <div className="rounded-lg border border-zinc-200 p-4 text-sm dark:border-zinc-800">
              <p className="text-black dark:text-zinc-50">
                8C-Pilot run — {new Date(pilot.report.generatedAt).toLocaleString()} — {pilot.report.totalRuns} runs,{" "}
                {pilot.report.failureCount} failures, S1 check {pilot.report.s1Check.pass ? "passed" : "failed"}.
              </p>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Source: {pilot.source}</p>
              <a href="/research/runs" className="mt-2 inline-block text-sm text-blue-700 underline underline-offset-2 dark:text-blue-400">
                View full pilot results →
              </a>
            </div>
          ) : (
            <p className="rounded-lg border border-zinc-200 p-6 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">No run records found on disk.</p>
          )}
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold text-black dark:text-zinc-50">Research integrity</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <IntegrityStat label="Protocol" value={protocolStatus.protocolFileExists ? protocolStatus.protocolFilename : "Not found"} />
            <IntegrityStat label="Config files" value={configStatus.ok ? `${configStatus.files.length} loaded, hashed` : "Error"} />
            <IntegrityStat label="Approval status" value={protocolStatus.approvalFileExists ? "Approved" : "Not approved"} tone={protocolStatus.approvalFileExists ? "ok" : "warn"} />
            <IntegrityStat label="Code revision" value={protocolStatus.gitCommit ? protocolStatus.gitCommit.slice(0, 12) : "Unknown"} mono />
          </div>
          <p className="text-xs text-zinc-400 dark:text-zinc-500">
            No approval hash, outcome, or confirmatory result is asserted here beyond what is literally present on disk at
            request time.
          </p>
        </section>
      </div>
    </AppShell>
  );
}

function IntegrityStat({ label, value, tone, mono }: { label: string; value: string; tone?: "ok" | "warn"; mono?: boolean }) {
  return (
    <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      <p className="text-xs text-zinc-500 dark:text-zinc-400">{label}</p>
      <p className={`mt-1 text-sm font-medium ${mono ? "font-mono" : ""} ${tone === "warn" ? "text-amber-700 dark:text-amber-400" : tone === "ok" ? "text-emerald-700 dark:text-emerald-400" : "text-black dark:text-zinc-50"}`}>{value}</p>
    </div>
  );
}

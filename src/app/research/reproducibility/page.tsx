import AppShell from "@/components/shell/AppShell";
import { readConfigFileStatuses, readLatestPilotReport, readProtocolStatus } from "@/research/ui/readOnlyData";
import { existsSync, readFileSync } from "fs";
import path from "path";

function readAmendmentTitles(): string[] {
  try {
    const content = readFileSync(path.join(process.cwd(), "protocol", "AMENDMENTS.md"), "utf-8");
    return [...content.matchAll(/^## (Amendment .+)$/gm)].map((m) => m[1]);
  } catch {
    return [];
  }
}

export default function ReproducibilityPage() {
  const protocolStatus = readProtocolStatus();
  const configStatus = readConfigFileStatuses();
  const pilot = readLatestPilotReport();
  const amendments = readAmendmentTitles();
  const approvalTemplateExists = existsSync(path.join(process.cwd(), "protocol", "APPROVAL.template.md"));

  return (
    <AppShell title="Reproducibility" description="Protocol version, configuration integrity, and replay verification." breadcrumbs={[{ label: "Research Overview", href: "/research" }, { label: "Reproducibility" }]}>
      <div className="flex flex-col gap-10">
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold text-black dark:text-zinc-50">Protocol and approval</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Protocol file" value={protocolStatus.protocolFileExists ? protocolStatus.protocolFilename : "Not found"} />
            <Stat label="Protocol SHA-256" value={protocolStatus.protocolSha256 ? `${protocolStatus.protocolSha256.slice(0, 16)}…` : "—"} mono />
            <Stat label="protocol/APPROVAL.md" value={protocolStatus.approvalFileExists ? "Exists" : "Does not exist"} tone={protocolStatus.approvalFileExists ? "ok" : "warn"} />
            <Stat label="protocol/APPROVAL.template.md" value={approvalTemplateExists ? "Exists" : "Not found"} />
          </div>
          <p className="text-xs text-zinc-400 dark:text-zinc-500">
            No confirmatory run can execute without <code>protocol/APPROVAL.md</code>, author-written and hash-verified
            against this exact protocol file and all three config files. This page cannot create that file and does not.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold text-black dark:text-zinc-50">Configuration files and checksums</h2>
          {configStatus.ok ? (
            <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 bg-zinc-50 text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
                    <th className="px-4 py-2 font-medium">File</th>
                    <th className="px-4 py-2 font-medium">Version</th>
                    <th className="px-4 py-2 font-medium">SHA-256</th>
                  </tr>
                </thead>
                <tbody>
                  {configStatus.files.map((f) => (
                    <tr key={f.name} className="border-b border-zinc-100 last:border-0 dark:border-zinc-900">
                      <td className="px-4 py-2 font-mono text-xs text-black dark:text-zinc-50">{f.name}</td>
                      <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">{f.version}</td>
                      <td className="px-4 py-2 font-mono text-xs text-zinc-500 dark:text-zinc-400">{f.sha256}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-red-700 dark:text-red-400">{configStatus.error}</p>
          )}
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold text-black dark:text-zinc-50">Code revision</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <Stat label="Git commit" value={protocolStatus.gitCommit ?? "Unknown"} mono />
            <Stat label="Package version" value={protocolStatus.packageVersion ?? "Unknown"} mono />
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold text-black dark:text-zinc-50">Amendment history</h2>
          {amendments.length === 0 ? (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">No protocol/AMENDMENTS.md found, or it contains no recorded amendments.</p>
          ) : (
            <ul className="list-disc space-y-1 rounded-lg border border-zinc-200 p-4 pl-8 text-sm text-black dark:border-zinc-800 dark:text-zinc-50">
              {amendments.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          )}
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold text-black dark:text-zinc-50">Run manifests and artifact integrity</h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Phase 6 (<code>src/research/artifact/</code>) implements content-addressed artifacts, four-dimension integrity
            verification, and deterministic replay (93 tests) — but it is not yet wired to Phase 8 Track A/B runs (C11).
            Only a single batch-level pilot summary (below) exists today, not per-run persisted artifacts.
          </p>
          {pilot ? (
            <div className="rounded-lg border border-zinc-200 p-4 text-sm dark:border-zinc-800">
              <p className="text-black dark:text-zinc-50">Pilot summary available: {pilot.source}</p>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{pilot.report.totalRuns} runs recorded, {pilot.report.failureCount} failures.</p>
              <a href="/api/research/pilot-report" download="pilot-report.json" className="mt-2 inline-block text-sm text-blue-700 underline underline-offset-2 dark:text-blue-400">
                Download pilot-report.json
              </a>
            </div>
          ) : (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">No pilot summary found on disk.</p>
          )}
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold text-black dark:text-zinc-50">Replay verification</h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Not yet run at Phase 8 scale. Phase 5&apos;s <code>replayExperimentSession</code> and Phase 6&apos;s{" "}
            <code>replayFromArtifact</code> both exist and are independently tested, but C9.1&apos;s R1a/R1b/R2 replay checks
            specifically for Phase 8 Track A/B runs (reusing that infrastructure) have not been executed or recorded. No
            replay success is claimed here.
          </p>
        </section>
      </div>
    </AppShell>
  );
}

function Stat({ label, value, tone, mono }: { label: string; value: string; tone?: "ok" | "warn"; mono?: boolean }) {
  return (
    <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
      <p className="text-xs text-zinc-500 dark:text-zinc-400">{label}</p>
      <p className={`mt-1 text-sm font-medium ${mono ? "font-mono" : ""} ${tone === "warn" ? "text-amber-700 dark:text-amber-400" : tone === "ok" ? "text-emerald-700 dark:text-emerald-400" : "text-black dark:text-zinc-50"}`}>{value}</p>
    </div>
  );
}

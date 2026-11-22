import AppShell from "@/components/shell/AppShell";
import { readLatestPilotReport } from "@/research/ui/readOnlyData";

function stats(values: number[]) {
  if (values.length === 0) return { n: 0, mean: 0, median: 0, p95: 0, max: 0 };
  const sorted = [...values].sort((a, b) => a - b);
  return {
    n: values.length,
    mean: values.reduce((s, v) => s + v, 0) / values.length,
    median: sorted[Math.floor(sorted.length / 2)],
    p95: sorted[Math.floor(sorted.length * 0.95)],
    max: sorted[sorted.length - 1],
  };
}

export default function SimulationRunsPage() {
  const pilot = readLatestPilotReport();

  return (
    <AppShell title="Simulation Runs" description="The operational record of Phase 8 simulation execution." breadcrumbs={[{ label: "Research Overview", href: "/research" }, { label: "Simulation Runs" }]}>
      <div className="flex flex-col gap-10">
        <section className="rounded-lg border border-zinc-200 p-4 text-sm text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">
          Phase 8&apos;s per-run persistence (C11: individual run records, Phase 6 artifact sampling, manifests) is not yet
          built — Track A/B produce correct in-memory results, but only a batch-level pilot summary is currently written to
          disk. This table shows that one batch, not individual per-learner runs.
        </section>

        {!pilot ? (
          <div className="flex flex-col items-center gap-2 rounded-lg border border-zinc-200 p-10 text-center dark:border-zinc-800">
            <p className="text-base text-zinc-600 dark:text-zinc-400">No run records found.</p>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Run the pilot via <code>npx tsx</code> against <code>src/research/phase8/pipeline/pilot.ts</code> to populate this page.</p>
          </div>
        ) : (
          <>
            <section className="flex flex-col gap-3">
              <h2 className="text-lg font-semibold text-black dark:text-zinc-50">Runs</h2>
              <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-zinc-200 bg-zinc-50 text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
                      <th className="px-4 py-2 font-medium">Run type</th>
                      <th className="px-4 py-2 font-medium">Slices</th>
                      <th className="px-4 py-2 font-medium">Worlds</th>
                      <th className="px-4 py-2 font-medium">Total runs</th>
                      <th className="px-4 py-2 font-medium">Failures</th>
                      <th className="px-4 py-2 font-medium">Status</th>
                      <th className="px-4 py-2 font-medium">Completed</th>
                      <th className="px-4 py-2 font-medium">Runtime</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="dark:border-zinc-900">
                      <td className="px-4 py-2 text-black dark:text-zinc-50">8C-Pilot</td>
                      <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">{pilot.report.slicesUsed.join(", ")}</td>
                      <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">{pilot.report.pilotWorlds}</td>
                      <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">{pilot.report.totalRuns}</td>
                      <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">{pilot.report.failureCount}</td>
                      <td className="px-4 py-2">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${pilot.report.failureCount === 0 ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300" : "bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300"}`}>
                          {pilot.report.failureCount === 0 ? "Completed" : "Completed with failures"}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">{new Date(pilot.report.generatedAt).toLocaleString()}</td>
                      <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">{pilot.report.wallClockMs ? `${(pilot.report.wallClockMs / 1000).toFixed(1)}s` : "—"}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-zinc-400 dark:text-zinc-500">Source file: {pilot.source}</p>
            </section>

            <section className="flex flex-col gap-3">
              <h2 className="text-lg font-semibold text-black dark:text-zinc-50">Run details</h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <RunStat label="S1 implementation check" value={pilot.report.s1Check.pass ? "Passed" : "Failed"} tone={pilot.report.s1Check.pass ? "ok" : "bad"} />
                <RunStat label="BKT fits (total)" value={String(pilot.report.trackA.bktFitFlags.total)} />
                <RunStat label="BKT fits near a bound" value={String(pilot.report.trackA.bktFitFlags.nearBound)} />
                <RunStat label="BKT fits multimodal" value={String(pilot.report.trackA.bktFitFlags.multimodal)} />
              </div>

              <h3 className="mt-2 text-sm font-semibold text-black dark:text-zinc-50">Track A per-context runtime (100+100 learners)</h3>
              <RuntimeTable s={stats(pilot.report.trackA.runtimeMsPerContext)} unit="ms" />

              <h3 className="mt-2 text-sm font-semibold text-black dark:text-zinc-50">Track B per-session runtime</h3>
              <RuntimeTable s={stats(pilot.report.trackB.runtimeMsPerSession)} unit="ms" />
            </section>

            <section className="flex flex-col gap-2">
              <h2 className="text-lg font-semibold text-black dark:text-zinc-50">Export artifacts</h2>
              <a href="/api/research/pilot-report" download="pilot-report.json" className="w-fit rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-black transition-colors hover:border-black dark:border-zinc-700 dark:text-zinc-50 dark:hover:border-zinc-50">
                Download pilot-report.json
              </a>
            </section>
          </>
        )}
      </div>
    </AppShell>
  );
}

function RunStat({ label, value, tone }: { label: string; value: string; tone?: "ok" | "bad" }) {
  return (
    <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
      <p className="text-xs text-zinc-500 dark:text-zinc-400">{label}</p>
      <p className={`mt-1 text-sm font-medium ${tone === "ok" ? "text-emerald-700 dark:text-emerald-400" : tone === "bad" ? "text-red-700 dark:text-red-400" : "text-black dark:text-zinc-50"}`}>{value}</p>
    </div>
  );
}

function RuntimeTable({ s, unit }: { s: ReturnType<typeof stats>; unit: string }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
      <table className="w-full min-w-[420px] text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-200 bg-zinc-50 text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
            <th className="px-4 py-2 font-medium">n</th>
            <th className="px-4 py-2 font-medium">Mean</th>
            <th className="px-4 py-2 font-medium">Median</th>
            <th className="px-4 py-2 font-medium">p95</th>
            <th className="px-4 py-2 font-medium">Max</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">{s.n}</td>
            <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">{s.mean.toFixed(1)} {unit}</td>
            <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">{s.median} {unit}</td>
            <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">{s.p95} {unit}</td>
            <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">{s.max} {unit}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

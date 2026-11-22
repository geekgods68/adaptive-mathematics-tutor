import AppShell from "@/components/shell/AppShell";
import { readLatestPilotReport } from "@/research/ui/readOnlyData";

export default function ResultsAnalyticsPage() {
  const pilot = readLatestPilotReport();

  return (
    <AppShell title="Results & Analytics" description="Quantitative results from the Phase 8 pipeline." breadcrumbs={[{ label: "Research Overview", href: "/research" }, { label: "Results & Analytics" }]}>
      <div className="flex flex-col gap-10">
        <section className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm dark:border-amber-900 dark:bg-amber-950/30">
          <p className="font-medium text-amber-900 dark:text-amber-200">Pilot data only — not confirmatory.</p>
          <p className="mt-1 text-amber-800 dark:text-amber-300">
            No confirmatory experiment has been executed. Every number on this page comes from the 8C-Pilot (pilot seeds
            only) and is precision/feasibility data, never a performance comparison. Per the protocol&apos;s own pilot
            acceptance criteria, no estimator-vs-estimator or policy-vs-policy contrast is computed anywhere in this
            pipeline yet.
          </p>
        </section>

        {!pilot ? (
          <div className="flex flex-col items-center gap-2 rounded-lg border border-zinc-200 p-10 text-center dark:border-zinc-800">
            <p className="text-base text-zinc-600 dark:text-zinc-400">No results available — no pilot or confirmatory run has produced output on disk.</p>
          </div>
        ) : (
          <>
            <section className="flex flex-col gap-3">
              <h2 className="text-lg font-semibold text-black dark:text-zinc-50">Metric summary</h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Metric: log loss (nats/response) and latent-recovery MAE (probability units) per simulator family, Track A —
                exactly the protocol&apos;s own estimands (B8.2), aggregated to world-level means, 3 pilot worlds, 3 slices
                (CH07, CH03, CH10), equal weight per B8.1. Population: simulated test learners under each family&apos;s own
                ground-truth process.
              </p>
              <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-zinc-200 bg-zinc-50 text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
                      <th className="px-4 py-2 font-medium">Family</th>
                      <th className="px-4 py-2 font-medium">Det-A mean log loss</th>
                      <th className="px-4 py-2 font-medium">BKT-fit mean log loss</th>
                      <th className="px-4 py-2 font-medium">Det-A mean MAE</th>
                      <th className="px-4 py-2 font-medium">BKT-fit mean MAE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(pilot.report.trackA.perFamily).map(([family, d]) => (
                      <tr key={family} className="border-b border-zinc-100 last:border-0 dark:border-zinc-900">
                        <td className="px-4 py-2 font-medium text-black dark:text-zinc-50">{family}</td>
                        <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">{mean(d.detALogLossByWorld).toFixed(4)}</td>
                        <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">{mean(d.bktFitLogLossByWorld).toFixed(4)}</td>
                        <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">{mean(d.detAMaeByWorld).toFixed(4)}</td>
                        <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">{mean(d.bktFitMaeByWorld).toFixed(4)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-zinc-400 dark:text-zinc-500">
                Sample size: {pilot.report.pilotWorlds} pilot worlds per family. Run provenance: {pilot.source}, generated{" "}
                {new Date(pilot.report.generatedAt).toLocaleString()}. These are descriptive pilot means, not a
                hypothesis-tested comparison — no p-value, interval, or non-inferiority decision is computed at pilot scale.
              </p>
            </section>

            <section className="flex flex-col gap-3">
              <h2 className="text-lg font-semibold text-black dark:text-zinc-50">Track B: K(T) by family and condition</h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Metric: K(T), mean true mastery over target concepts at the T=60 budget boundary — from the simulator&apos;s own ground truth, never from any estimator (B3.4/B6.6).</p>
              <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
                <table className="w-full min-w-[520px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-zinc-200 bg-zinc-50 text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
                      <th className="px-4 py-2 font-medium">Family</th>
                      <th className="px-4 py-2 font-medium">C0 (mean K(T))</th>
                      <th className="px-4 py-2 font-medium">C2 (mean K(T))</th>
                      <th className="px-4 py-2 font-medium">C3 (mean K(T))</th>
                      <th className="px-4 py-2 font-medium">C2 activation rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(pilot.report.trackB.perFamilyConfig).map(([family, d]) => (
                      <tr key={family} className="border-b border-zinc-100 last:border-0 dark:border-zinc-900">
                        <td className="px-4 py-2 font-medium text-black dark:text-zinc-50">{family}</td>
                        <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">{mean(d.kT_C0).toFixed(3)}</td>
                        <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">{mean(d.kT_C2).toFixed(3)}</td>
                        <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">{mean(d.kT_C3).toFixed(3)}</td>
                        <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">{(d.activationRateC2 * 100).toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-zinc-400 dark:text-zinc-500">
                These are raw per-condition pilot means shown for feasibility review, not an H-B1/H-B2 hypothesis test — per
                B9.2, the pilot computes only per-condition variances, never a contrast, and this page does not derive one
                either.
              </p>
            </section>
          </>
        )}
      </div>
    </AppShell>
  );
}

function mean(values: number[]): number {
  if (values.length === 0) return NaN;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

import AppShell from "@/components/shell/AppShell";
import { EXPERIMENT_CONDITIONS } from "@/research/experiment/conditions";
import { readLatestPilotReport } from "@/research/ui/readOnlyData";

interface ModelEntry {
  id: string;
  name: string;
  category: "Estimator" | "Selection policy";
  description: string;
  role: string;
  configSummary: string;
  status: "Implemented" | "Specified, not implemented";
}

// Sourced directly from C6 (src/research/phase8/estimators/) and the Tier 1 estimator table in
// protocol/phase8-protocol-v2.md (B4.1) -- not invented, and not presented as interchangeable with
// the selection policies below (different interfaces, different experimental roles).
const ESTIMATORS: ModelEntry[] = [
  { id: "det-a", name: "Det-A (deterministic, symmetric difficulty weighting)", category: "Estimator", description: "The implemented Phase 3 mastery formula, Variant A — frozen, unchanged.", role: "Confirmatory (Track A)", configSummary: "DEFAULT_MODEL_PARAMETERS", status: "Implemented" },
  { id: "det-b", name: "Det-B (deterministic, inverse difficulty weighting)", category: "Estimator", description: "The implemented Phase 3 mastery formula, Variant B — frozen, unchanged. Also the estimator behind conditions C2/C3.", role: "Confirmatory (Track A); deployed condition (Track B)", configSummary: "DEFAULT_MODEL_PARAMETERS_V2_INVERSE_DIFFICULTY", status: "Implemented" },
  { id: "bkt-fit", name: "BKT-fit", category: "Estimator", description: "Standard 4-parameter Bayesian Knowledge Tracing, fitted per concept by bounded multi-start EM on calibration learners.", role: "Confirmatory comparator (Track A)", configSummary: "estimator-config-v2.json: bktEm", status: "Implemented" },
  { id: "bkt-default", name: "BKT-default", category: "Estimator", description: "The same BKT model with fixed, untuned parameters (matched to Det's own untuned status).", role: "Matched untuned comparator (secondary)", configSummary: "pL0=0.5, T=0.1, G=0.25, S=0.1", status: "Implemented" },
  { id: "run-prop", name: "RunProp", category: "Estimator", description: "Laplace-smoothed proportion correct, (c+1)/(n+2). No tunable parameters.", role: "Simple baseline (secondary)", configSummary: "—", status: "Implemented" },
  { id: "ema", name: "EMA", category: "Estimator", description: "Exponential moving average, lambda = 0.11 (the mean of Det's own alpha and beta), untuned.", role: "Isolates what asymmetric rates + difficulty weights add (secondary)", configSummary: "lambda=0.11, M0=0.5", status: "Implemented" },
  { id: "b0", name: "B0", category: "Estimator", description: "Static per-(concept, level) calibration correct rate, add-one smoothed. No update rule.", role: "Static reference for reporting skill", configSummary: "Built from calibration learners only", status: "Implemented" },
];

export default function ModelComparisonsPage() {
  const pilot = readLatestPilotReport();

  return (
    <AppShell title="Model Comparisons" description="The estimators and selection policies used in this research — their interfaces and roles." breadcrumbs={[{ label: "Research Overview", href: "/research" }, { label: "Model Comparisons" }]}>
      <div className="flex flex-col gap-10">
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold text-black dark:text-zinc-50">Estimators (Track A — mastery/prediction)</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Estimators produce a mastery or predictive-correctness estimate. They are not selection policies and are never compared to one as if interchangeable.</p>
          <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50 text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
                  <th className="px-4 py-2 font-medium">Model</th>
                  <th className="px-4 py-2 font-medium">Description</th>
                  <th className="px-4 py-2 font-medium">Experimental role</th>
                  <th className="px-4 py-2 font-medium">Config</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {ESTIMATORS.map((m) => (
                  <tr key={m.id} className="border-b border-zinc-100 last:border-0 align-top dark:border-zinc-900">
                    <td className="px-4 py-2 font-medium text-black dark:text-zinc-50">{m.name}</td>
                    <td className="px-4 py-2 text-xs text-zinc-600 dark:text-zinc-400">{m.description}</td>
                    <td className="px-4 py-2 text-xs text-zinc-600 dark:text-zinc-400">{m.role}</td>
                    <td className="px-4 py-2 font-mono text-xs text-zinc-500 dark:text-zinc-400">{m.configSummary}</td>
                    <td className="px-4 py-2">
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">{m.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold text-black dark:text-zinc-50">Selection policies (Track B — sequencing)</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Selection policies decide which question to present next. Registered conditions, as defined in src/research/experiment/conditions.ts.</p>
          <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50 text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
                  <th className="px-4 py-2 font-medium">Condition</th>
                  <th className="px-4 py-2 font-medium">Description</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(EXPERIMENT_CONDITIONS).map(([id, cond]) => (
                  <tr key={id} className="border-b border-zinc-100 last:border-0 dark:border-zinc-900">
                    <td className="px-4 py-2 font-medium text-black dark:text-zinc-50">{id}</td>
                    <td className="px-4 py-2 text-xs text-zinc-600 dark:text-zinc-400">{cond.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold text-black dark:text-zinc-50">Interactive inspection (from the stored pilot run)</h2>
          {pilot ? (
            <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 bg-zinc-50 text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
                    <th className="px-4 py-2 font-medium">Simulator family</th>
                    <th className="px-4 py-2 font-medium">Det-A worlds observed</th>
                    <th className="px-4 py-2 font-medium">BKT-fit worlds observed</th>
                    <th className="px-4 py-2 font-medium">Required W (logloss)</th>
                    <th className="px-4 py-2 font-medium">Required W (MAE)</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(pilot.report.trackA.perFamily).map(([family, data]) => (
                    <tr key={family} className="border-b border-zinc-100 last:border-0 dark:border-zinc-900">
                      <td className="px-4 py-2 font-medium text-black dark:text-zinc-50">{family}</td>
                      <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">{data.detALogLossByWorld.length}</td>
                      <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">{data.bktFitLogLossByWorld.length}</td>
                      <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">{pilot.report.trackA.requiredW[family]?.logLoss_detA_vs_bktFit ?? "—"}</td>
                      <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">{pilot.report.trackA.requiredW[family]?.mae_detA_vs_bktFit ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="rounded-lg border border-zinc-200 p-6 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
              No pilot data available. Per B9.2, this is pilot-scale precision data only — never a performance comparison or
              claim of superiority.
            </p>
          )}
          <p className="text-xs text-zinc-400 dark:text-zinc-500">
            These numbers are required-world-counts for statistical precision, computed from pilot-scale per-condition
            variances — not a comparison of which estimator performs better. No confirmatory contrast has been run.
          </p>
        </section>
      </div>
    </AppShell>
  );
}

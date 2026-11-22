import AppShell from "@/components/shell/AppShell";
import { readEstimatorConfig, readExperimentPlanConfig, readProtocolStatus, readSimulatorConfig } from "@/research/ui/readOnlyData";

export default function ExperimentDesignerPage() {
  const plan = readExperimentPlanConfig();
  const simulator = readSimulatorConfig();
  const estimator = readEstimatorConfig();
  const protocolStatus = readProtocolStatus();

  return (
    <AppShell title="Experiment Designer" description="The registered Phase 8 experimental configuration — read-only." breadcrumbs={[{ label: "Research Overview", href: "/research" }, { label: "Experiment Designer" }]}>
      <div className="flex flex-col gap-10">
        <section className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm dark:border-amber-900 dark:bg-amber-950/30">
          <p className="font-medium text-amber-900 dark:text-amber-200">Protocol-controlled configuration is read-only.</p>
          <p className="mt-1 text-amber-800 dark:text-amber-300">
            These values are read directly from <code>config/phase8/*.json</code> at request time — this page maintains no
            separate copy and cannot edit them. Changing a registered value requires an author-approved protocol amendment
            (see Reproducibility), never a form on this page.
          </p>
        </section>

        {!plan || !simulator || !estimator ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Could not load Phase 8 configuration files.</p>
        ) : (
          <>
            <section className="flex flex-col gap-3">
              <h2 className="text-lg font-semibold text-black dark:text-zinc-50">Experimental configuration summary</h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <ConfigStat label="Simulator config version" value={simulator.version} />
                <ConfigStat label="Estimator config version" value={estimator.version} />
                <ConfigStat label="Experiment plan version" value={plan.version} />
                <ConfigStat label="Master seed" value={plan.masterSeed} mono />
                <ConfigStat label="Curriculum slices" value={String(plan.slices)} />
                <ConfigStat label="Worlds (confirmatory / cap)" value={`${plan.worlds} / ${plan.worldsCap}`} />
                <ConfigStat label="Track A configs" value={plan.trackA.configs.join(", ")} />
                <ConfigStat label="Track B configs" value={plan.trackB.configs.join(", ")} />
                <ConfigStat label="Track B policies" value={plan.trackB.policies.join(", ")} />
                <ConfigStat label="Track B session length" value={`${plan.trackB.budget} questions`} />
                <ConfigStat label="Non-inferiority margins" value={`logloss ${plan.margins.logloss}, MAE ${plan.margins.mae}`} />
                <ConfigStat label="Alpha / activation threshold" value={`${plan.alpha} / ${plan.activationThreshold}`} />
              </div>
            </section>

            <section className="flex flex-col gap-3">
              <h2 className="text-lg font-semibold text-black dark:text-zinc-50">Simulator family parameters</h2>
              <ConfigJsonBlock value={simulator} />
            </section>

            <section className="flex flex-col gap-3">
              <h2 className="text-lg font-semibold text-black dark:text-zinc-50">Estimator parameters</h2>
              <ConfigJsonBlock value={estimator} />
            </section>
          </>
        )}

        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold text-black dark:text-zinc-50">Experimental modes</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <ModeCard title="Preview / Development" status="available" statusLabel="Available" description="Small-scale development runs through the real Track A/B runners (reduced learner/world counts), marked non-confirmatory. Exercised extensively during implementation; no dedicated UI trigger in this build." />
            <ModeCard title="Pilot" status="available" statusLabel="Available (already run)" description="The 8C-Pilot — runtime and precision feasibility, pilot seeds only, no cross-condition contrast computed or printed, per the protocol's own pilot acceptance criteria." />
            <ModeCard
              title="Confirmatory"
              status={protocolStatus.approvalFileExists ? "available" : "blocked"}
              statusLabel={protocolStatus.approvalFileExists ? "Available" : "Blocked"}
              description={
                protocolStatus.approvalFileExists
                  ? "protocol/APPROVAL.md exists."
                  : "protocol/APPROVAL.md does not exist. Confirmatory execution is blocked at the execution layer (src/research/phase8/pipeline/), not merely by a disabled button here — see Reproducibility."
              }
            />
          </div>
        </section>

        <section className="flex flex-col gap-2 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
          <h2 className="text-sm font-semibold text-black dark:text-zinc-50">Execution from this page</h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            No experiment-execution control is wired into this page. The pilot and Track A/B runners are real, tested
            TypeScript modules (<code>src/research/phase8/pipeline/pilot.ts</code>, <code>trackA/runTrackA.ts</code>,{" "}
            <code>trackB/runTrackB.ts</code>) invoked from a script — a pilot run takes several minutes of server compute,
            and no job-queue/background-execution infrastructure exists to run that safely from a web request. Rather than
            build that infrastructure (a new engine-adjacent system, out of this task&apos;s scope) or trigger a multi-minute
            blocking request from a button click, this page stays read-only, per the explicit fallback for exactly this
            situation: &quot;show a read-only configuration interface and clearly label execution as unavailable until a
            safe, validated runner integration exists.&quot;
          </p>
        </section>
      </div>
    </AppShell>
  );
}

function ConfigStat({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
      <p className="text-xs text-zinc-500 dark:text-zinc-400">{label}</p>
      <p className={`mt-1 text-sm text-black dark:text-zinc-50 ${mono ? "font-mono" : ""}`}>{value}</p>
    </div>
  );
}

function ModeCard({ title, status, statusLabel, description }: { title: string; status: "available" | "blocked"; statusLabel: string; description: string }) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-black dark:text-zinc-50">{title}</h3>
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${status === "available" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300" : "bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300"}`}>{statusLabel}</span>
      </div>
      <p className="text-xs leading-5 text-zinc-600 dark:text-zinc-400">{description}</p>
    </div>
  );
}

function ConfigJsonBlock({ value }: { value: unknown }) {
  return (
    <pre className="max-h-96 overflow-auto rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-xs text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

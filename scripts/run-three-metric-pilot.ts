/**
 * Runs the three-metric diagnostic pilot (src/research/phase8/pipeline/threeMetricPilot.ts)
 * and writes a NEW artifact, never overwriting the historical 8C-Pilot report.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { runThreeMetricPilot } from "@/research/phase8/pipeline/threeMetricPilot";

function main(): void {
  console.log("Running three-metric diagnostic pilot (EXPLORATORY / PILOT-SCALE)...");
  const report = runThreeMetricPilot();
  const outDir = path.join(process.cwd(), "research-output", "phase8", "pilot");
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, "three-metric-pilot-report.json");
  if (fs.existsSync(outPath)) {
    throw new Error(`Refusing to overwrite existing artifact: ${outPath}`);
  }
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
  console.log(`Wrote ${outPath}`);
  console.log(`totalRuns=${report.totalRuns} failureCount=${report.failureCount} wallClockMs=${report.wallClockMs}`);
}

main();

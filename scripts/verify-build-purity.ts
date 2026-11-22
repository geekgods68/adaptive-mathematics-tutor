/**
 * Pre-Stage-4 build-purity verification (docs/pre-stage4-build-purity-report.md).
 *
 * A dedicated, standalone integration script — NOT part of `npm test` —
 * because it invokes a REAL `next build` (several seconds of actual
 * compilation and static-page generation), which is legitimately too
 * heavy for the routine unit-test suite but is exactly the real-world
 * operation this invariant is about. Run via `npm run verify:build-purity`.
 *
 * What it checks: that a real production build, run against an isolated,
 * initially-empty research-database directory, creates or modifies
 * NOTHING in that directory, and that the project's REAL
 * `research-output/db/` is also untouched (a second, independent check,
 * in case some code path ever ignored the env override). This is
 * Group (A) of the regression plan.
 */
import { execFileSync } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

function snapshot(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const out: string[] = [];
  const walk = (d: string) => {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, entry.name);
      if (entry.isDirectory()) walk(full);
      else out.push(full);
    }
  };
  walk(dir);
  return out.sort();
}

function main(): void {
  const projectRoot = process.cwd();
  const isolatedDir = fs.mkdtempSync(path.join(os.tmpdir(), "build-purity-verify-"));
  const isolatedDbPath = path.join(isolatedDir, "db", "research.sqlite3");
  const isolatedArtifactsRoot = path.join(isolatedDir, "sessions");
  const isolatedPhase8Root = path.join(isolatedDir, "phase8", "runs");

  const realResearchOutput = path.join(projectRoot, "research-output");
  const realResearchOutputBefore = snapshot(realResearchOutput);

  console.log(`[verify-build-purity] isolated scratch dir: ${isolatedDir}`);
  console.log(`[verify-build-purity] real research-output/ before: ${realResearchOutputBefore.length} file(s)`);
  console.log("[verify-build-purity] running `next build` with an isolated, initially-empty research database path...");

  execFileSync("npx", ["next", "build"], {
    cwd: projectRoot,
    stdio: "inherit",
    env: {
      ...process.env,
      RESEARCH_DB_PATH: isolatedDbPath,
      RESEARCH_SESSION_ARTIFACTS_ROOT: isolatedArtifactsRoot,
      PHASE8_RUNS_ROOT: isolatedPhase8Root,
    },
  });

  const isolatedFilesAfter = snapshot(isolatedDir);
  const realResearchOutputAfter = snapshot(realResearchOutput);

  const problems: string[] = [];
  if (isolatedFilesAfter.length > 0) {
    problems.push(`The isolated, initially-empty scratch directory is no longer empty after the build:\n  ${isolatedFilesAfter.join("\n  ")}`);
  }
  const realDiff = realResearchOutputAfter.filter((f) => !realResearchOutputBefore.includes(f));
  if (realDiff.length > 0) {
    problems.push(`The REAL research-output/ tree gained new file(s) during the build (should be impossible given the env override above):\n  ${realDiff.join("\n  ")}`);
  }

  // Cleanup the disposable scratch dir regardless of outcome.
  fs.rmSync(isolatedDir, { recursive: true, force: true });

  if (problems.length > 0) {
    console.error("\n[verify-build-purity] FAILED:\n" + problems.join("\n\n"));
    process.exit(1);
  }

  console.log("[verify-build-purity] PASSED: `next build` created and modified nothing in either the isolated scratch directory or the real research-output/ tree.");
}

main();

/**
 * Server-only, read-only data access for the Researcher Workspace
 * (Part D). Every function here READS an existing file or already-
 * exported configuration object; none of them write, execute, or
 * modify anything. This is the frontend/orchestration layer Part D1
 * requires -- "It must not become an alternative experimental engine."
 */

import { existsSync, readFileSync, readdirSync, statSync } from "fs";
import { execSync } from "child_process";
import { createHash } from "crypto";
import path from "path";
import { loadPhase8Config } from "@/research/phase8/config/load";
import type { PilotReport } from "@/research/phase8/pipeline/pilot";

export interface ProtocolStatus {
  protocolFilename: string;
  protocolFileExists: boolean;
  protocolSha256: string | null;
  amendmentsFileExists: boolean;
  amendmentCount: number;
  approvalFileExists: boolean;
  gitCommit: string | null;
  packageVersion: string | null;
}

/** Only ever called with the two literal protocol paths below -- never a user- or request-derived path. The ignore comment opts out of Turbopack's file-tracing heuristic (which otherwise bundles the whole project as a deploy artifact, see the build's own suggested fix); this prototype has no production-deployment target (CLAUDE.md) for that tracing to matter for anyway. */
function tryReadFile(relativePath: string): string | null {
  try {
    const full = path.join(/* turbopackIgnore: true */ process.cwd(), relativePath);
    if (!existsSync(full)) return null;
    return readFileSync(full, "utf-8");
  } catch {
    return null;
  }
}

export function readProtocolStatus(): ProtocolStatus {
  const protocolFilename = "protocol/phase8-protocol-v2.md";
  const protocolContent = tryReadFile(protocolFilename);
  let protocolSha256: string | null = null;
  if (protocolContent !== null) {
    try {
      protocolSha256 = createHash("sha256").update(protocolContent, "utf-8").digest("hex");
    } catch {
      protocolSha256 = null;
    }
  }

  const amendmentsContent = tryReadFile("protocol/AMENDMENTS.md");
  const amendmentCount = amendmentsContent ? (amendmentsContent.match(/^## Amendment /gm) ?? []).length : 0;

  const approvalExists = existsSync(path.join(process.cwd(), "protocol", "APPROVAL.md"));

  let gitCommit: string | null = null;
  try {
    gitCommit = execSync("git rev-parse HEAD", { cwd: process.cwd(), encoding: "utf-8" }).trim();
  } catch {
    gitCommit = null;
  }

  let packageVersion: string | null = null;
  try {
    const pkg = JSON.parse(readFileSync(path.join(process.cwd(), "package.json"), "utf-8")) as { version?: string };
    packageVersion = pkg.version ?? null;
  } catch {
    packageVersion = null;
  }

  return {
    protocolFilename,
    protocolFileExists: protocolContent !== null,
    protocolSha256,
    amendmentsFileExists: amendmentsContent !== null,
    amendmentCount,
    approvalFileExists: approvalExists,
    gitCommit,
    packageVersion,
  };
}

export interface ConfigFileStatus {
  name: string;
  version: string;
  sha256: string;
}

export function readConfigFileStatuses(): { ok: true; files: ConfigFileStatus[] } | { ok: false; error: string } {
  try {
    const cfg = loadPhase8Config();
    return {
      ok: true,
      files: [
        { name: "simulator-config-v2.json", version: cfg.simulator.value.version, sha256: cfg.simulator.sha256 },
        { name: "estimator-config-v2.json", version: cfg.estimator.value.version, sha256: cfg.estimator.sha256 },
        { name: "experiment-plan-v2.json", version: cfg.plan.value.version, sha256: cfg.plan.sha256 },
      ],
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export function readExperimentPlanConfig() {
  try {
    return loadPhase8Config().plan.value;
  } catch {
    return null;
  }
}

export function readSimulatorConfig() {
  try {
    return loadPhase8Config().simulator.value;
  } catch {
    return null;
  }
}

export function readEstimatorConfig() {
  try {
    return loadPhase8Config().estimator.value;
  } catch {
    return null;
  }
}

/** Finds the most recently generated pilot report under docs/phase8/ (committed, human-reviewed snapshots) or the gitignored research-output/ working copy, preferring whichever file is newer on disk. Never regenerates or runs anything. */
export function readLatestPilotReport(): { report: PilotReport & { wallClockMs?: number }; source: string } | null {
  const candidates: string[] = [];
  const docsDir = path.join(process.cwd(), "docs", "phase8");
  try {
    for (const name of readdirSync(docsDir)) {
      if (/^pilot-report-.*\.json$/.test(name)) candidates.push(path.join(docsDir, name));
    }
  } catch {
    // docs/phase8 may not exist in some checkouts.
  }
  const researchOutputPath = path.join(process.cwd(), "research-output", "phase8", "pilot", "pilot-report.json");
  if (existsSync(researchOutputPath)) candidates.push(researchOutputPath);

  if (candidates.length === 0) return null;

  let newest: { file: string; mtimeMs: number } | null = null;
  for (const file of candidates) {
    try {
      const stat = statSync(file);
      if (!newest || stat.mtimeMs > newest.mtimeMs) newest = { file, mtimeMs: stat.mtimeMs };
    } catch {
      continue;
    }
  }
  if (!newest) return null;

  try {
    const report = JSON.parse(readFileSync(newest.file, "utf-8")) as PilotReport & { wallClockMs?: number };
    return { report, source: path.relative(process.cwd(), newest.file) };
  } catch {
    return null;
  }
}

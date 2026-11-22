import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { describe, expect, it, beforeAll } from "vitest";

/**
 * Pre-Stage-4 build-purity hardening (docs/pre-stage4-build-purity-report.md),
 * regression group (B): merely IMPORTING the modules every static
 * Student-Workspace page and Server Action transitively pulls in must never
 * open or create the research database — only an actual session operation
 * (a function call) may do that. `RESEARCH_DB_PATH` is pointed at a path
 * that does not exist BEFORE any import below runs, in this file's own
 * fresh module registry (vitest isolates each test file into its own
 * worker), so any eager top-level side effect would be caught here.
 */
let dbPath: string;

beforeAll(() => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "import-safety-test-"));
  dbPath = path.join(dir, "research.sqlite3");
  process.env.RESEARCH_DB_PATH = dbPath;
});

describe("research storage: import safety (Group B)", () => {
  it("importing the C0 (non-adaptive RISE) session store does not open the database", async () => {
    await import("@/tutoring/nonAdaptiveRiseSession/store");
    expect(fs.existsSync(dbPath)).toBe(false);
  });

  it("importing the C0 session service (what the Server Actions call) does not open the database", async () => {
    await import("@/tutoring/nonAdaptiveRiseSession/service");
    expect(fs.existsSync(dbPath)).toBe(false);
  });

  it("importing the C2 (adaptive) session store does not open the database", async () => {
    await import("@/tutoring/adaptiveSession/store");
    expect(fs.existsSync(dbPath)).toBe(false);
  });

  it("importing the C2 session service does not open the database", async () => {
    await import("@/tutoring/adaptiveSession/service");
    expect(fs.existsSync(dbPath)).toBe(false);
  });

  it("importing the Phase 6 completed-session-artifact integration does not open the database", async () => {
    await import("@/research/storage/completedSessionArtifacts");
    expect(fs.existsSync(dbPath)).toBe(false);
  });

  it("importing db.ts itself (and node:sqlite transitively) does not open or create a database file", async () => {
    await import("@/research/storage/db");
    expect(fs.existsSync(dbPath)).toBe(false);
  });
});

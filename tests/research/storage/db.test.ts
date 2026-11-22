import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { getResearchDb, closeResearchDb, RESEARCH_DB_SCHEMA_VERSION } from "@/research/storage/db";

function tempDbPath(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "stage2-db-test-"));
  return path.join(dir, "research.sqlite3");
}

describe("research storage: db initialization and migrations (Group A)", () => {
  afterEach(() => {
    closeResearchDb();
  });

  it("fresh initialization creates every required table and records the schema version", () => {
    const dbPath = tempDbPath();
    const db = getResearchDb(dbPath);
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name").all() as { name: string }[];
    const names = tables.map((t) => t.name);
    expect(names).toEqual(expect.arrayContaining(["sessions", "research_events", "phase8_runs", "phase8_batches", "schema_meta"]));

    const meta = db.prepare("SELECT schema_version FROM schema_meta WHERE id = 1").get() as { schema_version: number };
    expect(meta.schema_version).toBe(RESEARCH_DB_SCHEMA_VERSION);
  });

  it("reopening an existing database is idempotent and destroys no existing records", () => {
    const dbPath = tempDbPath();
    let db = getResearchDb(dbPath);
    db.prepare("INSERT INTO sessions (session_id, kind, condition_id, participant_id, status, started_at, revision, data, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)").run(
      "s1",
      "c0",
      "C0",
      "p1",
      "active",
      "2026-01-01T00:00:00.000Z",
      1,
      "{}",
      "2026-01-01T00:00:00.000Z",
      "2026-01-01T00:00:00.000Z",
    );
    closeResearchDb();

    db = getResearchDb(dbPath);
    const row = db.prepare("SELECT session_id FROM sessions WHERE session_id = ?").get("s1") as { session_id: string } | undefined;
    expect(row?.session_id).toBe("s1");

    // Re-running migrations again (a second getResearchDb call against the same path while
    // already open) must not duplicate schema objects or raise.
    const dbAgain = getResearchDb(dbPath);
    expect(dbAgain).toBe(db);
    const tableCountRow = dbAgain.prepare("SELECT COUNT(*) AS c FROM sqlite_master WHERE type = 'table' AND name = 'sessions'").get() as { c: number };
    expect(tableCountRow.c).toBe(1);
  });

  it("an in-memory database starts genuinely empty every time it is freshly opened (simulating a database that was never initialized)", () => {
    closeResearchDb();
    const db = getResearchDb(":memory:");
    const row = db.prepare("SELECT COUNT(*) AS c FROM sessions").get() as { c: number };
    expect(row.c).toBe(0);
  });

  it("switching the configured database path automatically closes the previous connection and opens the new one", () => {
    const pathA = tempDbPath();
    const pathB = tempDbPath();
    const dbA = getResearchDb(pathA);
    dbA.prepare("INSERT INTO sessions (session_id, kind, condition_id, participant_id, status, started_at, revision, data, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)").run(
      "only-in-a",
      "c0",
      "C0",
      "p1",
      "active",
      "2026-01-01T00:00:00.000Z",
      1,
      "{}",
      "2026-01-01T00:00:00.000Z",
      "2026-01-01T00:00:00.000Z",
    );
    const dbB = getResearchDb(pathB);
    const row = dbB.prepare("SELECT session_id FROM sessions WHERE session_id = ?").get("only-in-a") as { session_id: string } | undefined;
    expect(row).toBeUndefined();
  });
});

describe("research storage: build-phase guard (docs/pre-stage4-build-purity-report.md)", () => {
  const originalNextPhase = process.env.NEXT_PHASE;

  afterEach(() => {
    closeResearchDb();
    if (originalNextPhase === undefined) delete process.env.NEXT_PHASE;
    else process.env.NEXT_PHASE = originalNextPhase;
  });

  it("refuses to open the database when NEXT_PHASE is 'phase-production-build' (Next.js's own build-phase signal), without creating any file", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "build-guard-test-"));
    const dbPath = path.join(dir, "research.sqlite3");
    process.env.NEXT_PHASE = "phase-production-build";

    expect(() => getResearchDb(dbPath)).toThrow(/next build/i);
    expect(fs.existsSync(dbPath)).toBe(false);
  });

  it("opens the database normally when NEXT_PHASE is unset (plain `npm test`/`tsx`/CLI usage)", () => {
    delete process.env.NEXT_PHASE;
    const dbPath = tempDbPath();
    expect(() => getResearchDb(dbPath)).not.toThrow();
    expect(fs.existsSync(dbPath)).toBe(true);
  });

  it("opens the database normally under the development-server phase (NEXT_PHASE=phase-development-server), confirming the guard is build-specific, not a blanket block", () => {
    process.env.NEXT_PHASE = "phase-development-server";
    const dbPath = tempDbPath();
    expect(() => getResearchDb(dbPath)).not.toThrow();
    expect(fs.existsSync(dbPath)).toBe(true);
  });

  it("opens the database normally under the production-server runtime phase (NEXT_PHASE=phase-production-server, i.e. `next start`), confirming real deployed runtime behavior is unaffected", () => {
    process.env.NEXT_PHASE = "phase-production-server";
    const dbPath = tempDbPath();
    expect(() => getResearchDb(dbPath)).not.toThrow();
    expect(fs.existsSync(dbPath)).toBe(true);
  });
});

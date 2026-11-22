import * as fs from "node:fs";
import * as path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { PHASE_PRODUCTION_BUILD } from "next/constants";

/**
 * Stage 2 (docs/stage2-research-persistence-report.md "Storage
 * architecture"): durable backend choice rationale.
 *
 * Node's built-in `node:sqlite` (stable as of this repo's pinned Node
 * runtime, flagged experimental by Node itself — see the `WARNED`
 * suppression below) was chosen over an external dependency
 * (better-sqlite3, a managed/cloud database, Redis) because:
 *   - It ships with Node — zero new npm dependencies, no native-module
 *     build step, nothing to install for a local research tool.
 *   - `DatabaseSync` is fully synchronous, which matters here: every
 *     session-lifecycle function in `nonAdaptiveRiseSession/service.ts`
 *     and `adaptiveSession/service.ts` is itself synchronous (no
 *     `await` between reading a session and writing its new state) —
 *     keeping the storage layer synchronous too preserves the
 *     "no in-process interleaving is possible" guarantee those
 *     functions already rely on for correctness (see
 *     docs/stage2-research-persistence-report.md Part 4.3 for the full
 *     argument and its explicit limits).
 *   - A single-file transactional store is exactly what a local,
 *     single-process research/dev server needs; a managed database or
 *     Redis would add operational surface (a server to run, credentials
 *     to manage) this repository has never needed and Part 4 of the
 *     Stage 2 prompt explicitly asks to avoid.
 *
 * KNOWN LIMITATION (documented, not silently assumed away): SQLite
 * serializes writes at the file level. This store supports exactly one
 * writing Node process at a time. It does NOT provide distributed or
 * multi-process exactly-once guarantees — only correctness within one
 * running server process, which is what this application's actual
 * deployment shape (a single local Next.js dev/prod server) requires.
 */
export const RESEARCH_DB_SCHEMA_VERSION = 1;

export const DEFAULT_RESEARCH_DB_PATH = path.join(process.cwd(), "research-output", "db", "research.sqlite3");

function resolveDbPath(explicitPath?: string): string {
  if (explicitPath) return explicitPath;
  return process.env.RESEARCH_DB_PATH ?? DEFAULT_RESEARCH_DB_PATH;
}

let singleton: DatabaseSync | null = null;
let singletonPath: string | null = null;

function applyMigrations(db: DatabaseSync): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_meta (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      schema_version INTEGER NOT NULL
    );
  `);

  const row = db.prepare("SELECT schema_version FROM schema_meta WHERE id = 1").get() as { schema_version: number } | undefined;
  let currentVersion = row?.schema_version ?? 0;

  if (currentVersion < 1) {
    db.exec(`
      -- Layer A: live/completed session envelopes for the two modern conditions (C0, C2).
      -- The full session wrapper (ActiveNonAdaptiveRiseSession / ActiveAdaptiveSession) is
      -- stored as a JSON blob in \`data\` -- both are deliberately plain, JSON-serializable
      -- data (ExperimentSessionState's own doc comment: "no class instances, no closures"),
      -- so round-tripping through JSON loses nothing. The indexed columns exist only for
      -- querying (Part 4.1: list completed, query by condition), never as a second source
      -- of truth -- \`data\` is always authoritative.
      -- PRIMARY KEY is the (session_id, kind) PAIR, deliberately NOT session_id alone --
      -- this is what guarantees the C0/C2 partition isolation the old separate-Map-instance
      -- stores documented: two conditions can never collide or silently overwrite each
      -- other's row even if a session id were ever accidentally reused across them.
      CREATE TABLE IF NOT EXISTS sessions (
        session_id TEXT NOT NULL,
        kind TEXT NOT NULL CHECK (kind IN ('c0', 'c2')),
        condition_id TEXT NOT NULL,
        participant_id TEXT NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('active', 'terminated')),
        started_at TEXT NOT NULL,
        completed_at TEXT,
        revision INTEGER NOT NULL DEFAULT 0,
        data TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        PRIMARY KEY (session_id, kind)
      );
      CREATE INDEX IF NOT EXISTS idx_sessions_kind_status ON sessions(kind, status);
      CREATE INDEX IF NOT EXISTS idx_sessions_condition ON sessions(condition_id);
      CREATE INDEX IF NOT EXISTS idx_sessions_participant ON sessions(participant_id);

      -- Layer B: append-only research-event log. UNIQUE(session_id, event_seq) is the
      -- durable "no duplicate insertion, unambiguous ordering" guarantee (Part 4.1/14.E).
      CREATE TABLE IF NOT EXISTS research_events (
        event_id TEXT PRIMARY KEY,
        schema_version INTEGER NOT NULL,
        session_id TEXT NOT NULL,
        kind TEXT NOT NULL CHECK (kind IN ('c0', 'c2')),
        condition_id TEXT NOT NULL,
        event_seq INTEGER NOT NULL,
        event_type TEXT NOT NULL,
        question_id TEXT,
        payload TEXT NOT NULL,
        provenance_ref TEXT,
        created_at TEXT NOT NULL,
        UNIQUE(session_id, kind, event_seq)
      );
      CREATE INDEX IF NOT EXISTS idx_events_session ON research_events(session_id);
      CREATE INDEX IF NOT EXISTS idx_events_condition ON research_events(condition_id);

      -- Phase 8 per-run / per-batch durable records (Part 9). \`payload\` carries the
      -- track-specific envelope -- see src/research/phase8/persistence.ts.
      CREATE TABLE IF NOT EXISTS phase8_runs (
        run_id TEXT PRIMARY KEY,
        batch_id TEXT,
        track TEXT NOT NULL CHECK (track IN ('A', 'B')),
        condition_id TEXT,
        status TEXT NOT NULL CHECK (status IN ('completed', 'failed', 'incomplete')),
        payload TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_phase8_runs_batch ON phase8_runs(batch_id);
      CREATE INDEX IF NOT EXISTS idx_phase8_runs_track ON phase8_runs(track);

      CREATE TABLE IF NOT EXISTS phase8_batches (
        batch_id TEXT PRIMARY KEY,
        track TEXT NOT NULL CHECK (track IN ('A', 'B')),
        status TEXT NOT NULL CHECK (status IN ('running', 'completed', 'interrupted')),
        total_runs INTEGER NOT NULL DEFAULT 0,
        completed_runs INTEGER NOT NULL DEFAULT 0,
        failed_runs INTEGER NOT NULL DEFAULT 0,
        config TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);
    currentVersion = 1;
  }

  // Future migrations append additional `if (currentVersion < N)` blocks here, each
  // one idempotent and non-destructive of existing rows (Part 4.4: "non-destructive
  // upgrade behavior").

  db.prepare("INSERT INTO schema_meta (id, schema_version) VALUES (1, ?) ON CONFLICT(id) DO UPDATE SET schema_version = excluded.schema_version").run(currentVersion);
}

/**
 * Pre-Stage-4 build-purity hardening (docs/pre-stage4-build-purity-report.md):
 * `next build` sets `process.env.NEXT_PHASE` to this exact, OFFICIAL Next.js
 * constant (`next/constants`'s `PHASE_PRODUCTION_BUILD`, re-exported here
 * rather than hardcoded) for the duration of compilation and static page
 * generation — it is unset for `next dev` and for a started production
 * server (`next start`), so this check affects ONLY the build step, never
 * real runtime session handling. Nothing in this application has a
 * legitimate reason to open the research database at build time (no page
 * reads live durable session data during static generation — everything
 * student-facing goes through a Server Action at REQUEST time), so any call
 * here during a build is necessarily an accidental eager-evaluation
 * regression, not a real feature. This fails loudly and immediately rather
 * than silently creating a stray database file, converting a future
 * regression into a build failure instead of a filesystem side effect
 * someone has to notice separately.
 */
function assertNotBuildPhase(): void {
  if (process.env.NEXT_PHASE === PHASE_PRODUCTION_BUILD) {
    throw new Error(
      "getResearchDb() was called during `next build` (NEXT_PHASE=phase-production-build). " +
        "The research database must never be created or opened as a side effect of compilation " +
        "or static page generation — see docs/pre-stage4-build-purity-report.md. " +
        "If this is a genuine new runtime need, gate it so it only runs when the app is actually serving a request.",
    );
  }
}

/** Opens (creating and migrating if necessary) the singleton research database for this process. Safe to call repeatedly -- returns the same connection for the same resolved path. */
export function getResearchDb(explicitPath?: string): DatabaseSync {
  assertNotBuildPhase();
  const resolvedPath = resolveDbPath(explicitPath);
  if (singleton && singletonPath === resolvedPath) return singleton;
  if (singleton) {
    singleton.close();
    singleton = null;
  }

  if (resolvedPath !== ":memory:") {
    fs.mkdirSync(path.dirname(resolvedPath), { recursive: true });
  }
  const db = new DatabaseSync(resolvedPath);
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA foreign_keys = ON;");
  applyMigrations(db);

  singleton = db;
  singletonPath = resolvedPath;
  return db;
}

/** Closes the current singleton connection, if any -- used by tests simulating a process restart, and by any future graceful-shutdown hook. */
export function closeResearchDb(): void {
  if (singleton) {
    singleton.close();
    singleton = null;
    singletonPath = null;
  }
}

/** Test-only helper: forces a brand-new, isolated in-memory database regardless of what's currently open, so test files never share state unless they explicitly ask to (passing the same `explicitPath`). */
export function openIsolatedTestDb(): DatabaseSync {
  closeResearchDb();
  return getResearchDb(":memory:");
}

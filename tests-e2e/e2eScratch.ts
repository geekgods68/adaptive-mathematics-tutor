import path from "node:path";
import os from "node:os";

/**
 * Shared, fixed (NOT timestamp-based) scratch-storage paths for Stage 3's
 * Playwright suite. Both `playwright.config.ts` (which sets these as the
 * `next dev` webServer's env, in the orchestrator process) and any spec
 * file that needs to read the SAME durable SQLite/artifact data the
 * browser session just wrote (in a separately-forked worker process) import
 * this one module, so there is no need to pass the path between processes
 * at runtime — both sides compute the identical path independently.
 * `playwright.config.ts` wipes this directory at the start of every run
 * for a clean slate; it is always under the OS temp directory, never
 * under this repo, and is never the real `research-output/` tree.
 */
export const E2E_SCRATCH_DIR = path.join(os.tmpdir(), "rise-tutor-e2e-scratch");
export const E2E_DB_PATH = path.join(E2E_SCRATCH_DIR, "db", "research.sqlite");
export const E2E_SESSION_ARTIFACTS_ROOT = path.join(E2E_SCRATCH_DIR, "sessions");
export const E2E_PHASE8_RUNS_ROOT = path.join(E2E_SCRATCH_DIR, "phase8", "runs");

/**
 * A SEPARATE scratch root, used only by the server-restart recovery test
 * (sessionRecovery.spec.ts), which spawns its OWN `next dev` child
 * process on a second port rather than using the shared webServer above.
 * This MUST be a different path from E2E_SCRATCH_DIR: SQLite supports
 * exactly one writing process at a time (see
 * src/research/storage/db.ts), so a test that kills and restarts a
 * server process must never share a database file with the
 * still-running shared webServer the rest of this suite depends on.
 */
export const E2E_RESTART_SCRATCH_DIR = path.join(os.tmpdir(), "rise-tutor-e2e-restart-scratch");
export const E2E_RESTART_DB_PATH = path.join(E2E_RESTART_SCRATCH_DIR, "db", "research.sqlite");
export const E2E_RESTART_SESSION_ARTIFACTS_ROOT = path.join(E2E_RESTART_SCRATCH_DIR, "sessions");

import * as os from "node:os";
import * as path from "node:path";
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

/**
 * Stage 2 (docs/stage2-research-persistence-report.md): the durable
 * research database (src/research/storage/db.ts) defaults to a single
 * on-disk file under `research-output/db/`. Vitest runs different test
 * FILES in parallel across multiple worker processes/threads, and
 * SQLite serializes writes at the file level -- without this, two test
 * files that both exercise `nonAdaptiveRiseSession`/`adaptiveSession`
 * (both of which persist through that shared default path) can collide
 * with a genuine "database is locked" error purely from test-runner
 * parallelism, not from any real application bug. Giving each vitest
 * worker its own isolated temp database file removes that contention
 * with no change to any individual test file: tests within one worker
 * still run sequentially against their worker's file, and different
 * conditions' session ids are always fresh random UUIDs, so sharing one
 * file across test files within a worker is safe.
 */
// Includes the parent test-runner's own PID (stable for every worker spawned by one `npm test`
// invocation, different across separate invocations) so repeated local test runs never read
// stale state left behind by an earlier run, on top of per-worker isolation.
const TEST_WORKER_ID = process.env.VITEST_WORKER_ID ?? process.env.VITEST_POOL_ID ?? String(process.pid);
const TEST_RUN_ID = process.ppid ?? process.pid;
const TEST_RESEARCH_OUTPUT_ROOT = path.join(os.tmpdir(), "non-adaptive-tutor-test-research-output", `run-${TEST_RUN_ID}`, `worker-${TEST_WORKER_ID}`);

if (!process.env.RESEARCH_DB_PATH) {
  process.env.RESEARCH_DB_PATH = path.join(TEST_RESEARCH_OUTPUT_ROOT, "db", "research.sqlite3");
}
// Also redirect Phase 6/Phase 8 filesystem artifact output (src/research/artifact/persistence.ts's
// DEFAULT_RESEARCH_OUTPUT_DIR has no env override of its own) away from the real, gitignored
// `research-output/` tree during tests -- that tree also holds the frozen 13,560-run Phase 8 pilot
// (research-output/phase8/pilot, .../confirmatory), which must never be touched by test churn.
if (!process.env.RESEARCH_SESSION_ARTIFACTS_ROOT) {
  process.env.RESEARCH_SESSION_ARTIFACTS_ROOT = path.join(TEST_RESEARCH_OUTPUT_ROOT, "sessions");
}
if (!process.env.PHASE8_RUNS_ROOT) {
  process.env.PHASE8_RUNS_ROOT = path.join(TEST_RESEARCH_OUTPUT_ROOT, "phase8-runs");
}

afterEach(() => {
  cleanup();
});

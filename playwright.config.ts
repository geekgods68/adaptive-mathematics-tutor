import { defineConfig } from "@playwright/test";
import { E2E_DB_PATH, E2E_SESSION_ARTIFACTS_ROOT, E2E_PHASE8_RUNS_ROOT } from "./tests-e2e/e2eScratch";

/**
 * Stage 3 (Part 15/16): minimal real-browser verification config. Deliberately
 * NOT part of `npm test` (vitest) — a separate `npm run test:e2e` so the
 * unit/integration suite stays fast and this doesn't accidentally run in
 * environments without a browser binary available. The dev server's
 * research/session storage is redirected to a disposable, fixed-path scratch
 * directory (tests-e2e/e2eScratch.ts — shared with spec files that need to
 * read the same durable data back) so these runs NEVER touch the real
 * research-output/ tree or the frozen Phase 8 pilot data. Wiped at the start
 * of every run for a clean slate by `globalSetup.ts` — deliberately NOT a
 * top-level statement in this file, which Playwright re-evaluates inside
 * every worker process too (a real bug found during Stage 3 development:
 * it wiped data an earlier spec file's test had already written, out from
 * under the still-running shared webServer — see globalSetup.ts's doc
 * comment for the full account).
 *
 * `serverRestart.spec.ts` is deliberately EXCLUDED here and run via its own
 * `npm run test:e2e:restart` / `playwright.restart.config.ts` instead — see
 * that spec file's doc comment for why (Next.js 16 refuses to run a second
 * `next dev` instance for the same project directory while this config's
 * webServer is already running one, even on a different port).
 */
export default defineConfig({
  testDir: "./tests-e2e",
  testIgnore: ["**/serverRestart.spec.ts"],
  globalSetup: "./tests-e2e/globalSetup.ts",
  timeout: 30_000,
  retries: 0,
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:3100",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run dev -- --port 3100",
    url: "http://localhost:3100",
    reuseExistingServer: false,
    timeout: 60_000,
    env: {
      RESEARCH_DB_PATH: E2E_DB_PATH,
      RESEARCH_SESSION_ARTIFACTS_ROOT: E2E_SESSION_ARTIFACTS_ROOT,
      PHASE8_RUNS_ROOT: E2E_PHASE8_RUNS_ROOT,
    },
  },
});

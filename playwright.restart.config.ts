import { defineConfig } from "@playwright/test";

/**
 * Stage 3 Priority 3 — the real server-process restart recovery test
 * (tests-e2e/serverRestart.spec.ts) ONLY. Deliberately has NO `webServer`
 * entry: that test spawns and kills its own `next dev` processes itself,
 * and Next.js 16 refuses to run a second `next dev` instance for this
 * project directory while another one (e.g. this repo's main
 * `playwright.config.ts` webServer) is already running — so this must
 * never run at the same time as `npm run test:e2e`. Run sequentially:
 * `npm run test:e2e && npm run test:e2e:restart`, never concurrently.
 */
export default defineConfig({
  testDir: "./tests-e2e",
  testMatch: ["**/serverRestart.spec.ts"],
  globalSetup: "./tests-e2e/globalSetupRestart.ts",
  timeout: 180_000,
  retries: 0,
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
});

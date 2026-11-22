import { test, expect, type BrowserContext } from "@playwright/test";
import { spawn, type ChildProcess } from "node:child_process";
import { E2E_RESTART_DB_PATH, E2E_RESTART_SESSION_ARTIFACTS_ROOT } from "./e2eScratch";

/**
 * Stage 3 Priority 3 — real server-process restart recovery.
 *
 * Deliberately a SEPARATE spec file from sessionRecovery.spec.ts, run via
 * its OWN command (`npm run test:e2e:restart`, `playwright.restart.config.ts`)
 * with NO managed webServer, rather than inside the main `npm run test:e2e`
 * run. Reason, discovered while building this test: Next.js 16's Turbopack
 * dev server refuses to start a second instance for the SAME project
 * directory at all — "Another next dev server is already running" — even
 * on a different port, while the main suite's shared webServer (port
 * 3100) is up. A real kill-and-restart test fundamentally needs to run
 * when no other `next dev` instance for this project is alive, so it
 * cannot share a Playwright run with the rest of this suite. See
 * docs/stage3-ui-integration-report.md Priority 3 for the full account.
 *
 * This also means `npm run test:e2e` and `npm run test:e2e:restart` must
 * be run SEQUENTIALLY, never concurrently, in this environment.
 */

const PORT = 3102;
const BASE_URL = `http://localhost:${PORT}`;

async function spawnServer(): Promise<ChildProcess> {
  const child = spawn("npm", ["run", "dev", "--", "--port", String(PORT)], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      RESEARCH_DB_PATH: E2E_RESTART_DB_PATH,
      RESEARCH_SESSION_ARTIFACTS_ROOT: E2E_RESTART_SESSION_ARTIFACTS_ROOT,
    },
    stdio: "pipe",
  });
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("Restart-test dev server did not become ready in time")), 60_000);
    let ready = false;
    let stderrOutput = "";
    child.stdout?.on("data", (chunk: Buffer) => {
      if (!ready && /Ready in|started server/i.test(chunk.toString())) {
        ready = true;
        clearTimeout(timeout);
        resolve();
      }
    });
    child.stderr?.on("data", (chunk: Buffer) => {
      stderrOutput += chunk.toString();
    });
    child.on("exit", (code) => {
      if (!ready) {
        clearTimeout(timeout);
        reject(new Error(`Restart-test dev server exited before becoming ready (code ${code}). stderr:\n${stderrOutput}`));
      }
    });
    child.on("error", reject);
  });
  // Next.js prints "Ready" slightly before the listener is fully able to accept connections under
  // load in this environment -- poll the real HTTP port instead of guessing a fixed delay, which
  // was observed to be an unreliable, occasionally-too-short wait.
  const deadline = Date.now() + 20_000;
  for (;;) {
    try {
      const res = await fetch(BASE_URL);
      if (res.ok || res.status < 500) break;
    } catch {
      // not accepting connections yet
    }
    if (Date.now() > deadline) throw new Error("Restart-test dev server never became reachable over HTTP after reporting ready.");
    await new Promise((r) => setTimeout(r, 200));
  }
  return child;
}

function killServer(child: ChildProcess): Promise<void> {
  return new Promise((resolve) => {
    child.once("exit", () => resolve());
    child.kill("SIGTERM");
    setTimeout(() => {
      if (!child.killed) child.kill("SIGKILL");
      resolve();
    }, 5000);
  });
}

test.describe("Stage 3 Priority 3 — real server-process restart recovery", () => {
  let context: BrowserContext;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext();
  });

  test.afterAll(async () => {
    await context.close();
  });

  test("a session survives an actual kill-and-restart of the server process, recovering the same question position and committed responses", async () => {
    test.setTimeout(180_000);
    const page = await context.newPage();
    let server = await spawnServer();

    try {
      await page.goto(`${BASE_URL}/practice`);
      await expect(page.getByLabel("Topic")).toBeVisible({ timeout: 30_000 });
      await page.getByRole("button", { name: /^Non-Adaptive / }).click();
      await page.getByRole("button", { name: "Start Practice" }).click();
      await expect(page.getByText("Question 1 of")).toBeVisible({ timeout: 15_000 });
      await page.locator('input[name="answer"]').first().check();
      await page.getByRole("button", { name: "Submit" }).click();
      await expect(page.getByText(/correct\.|not quite\./i)).toBeVisible();
      await page.getByRole("button", { name: "Continue" }).click();
      await expect(page.getByText("Question 2 of")).toBeVisible({ timeout: 15_000 });
      await page.locator('input[name="answer"]').first().check();
      await page.getByRole("button", { name: "Submit" }).click();
      await expect(page.getByText(/correct\.|not quite\./i)).toBeVisible();
      // Deliberately refresh BEFORE restarting too, to prove this isn't just an in-memory React
      // state carry-over -- the browser must re-fetch from the server both before and after the
      // restart and see the identical durable state each time.
      await page.reload();
      await expect(page.getByText(/correct\.|not quite\./i)).toBeVisible({ timeout: 15_000 });

      await killServer(server);
      server = await spawnServer();

      await page.reload();
      // Recovers the SAME question (2) with its SAME recorded feedback, not a fresh question 1.
      await expect(page.getByText("Question 2 of")).toBeVisible({ timeout: 30_000 });
      await expect(page.getByText(/correct\.|not quite\./i)).toBeVisible();

      await page.getByRole("button", { name: "Continue" }).click();
      await expect(page.getByText("Question 3 of")).toBeVisible({ timeout: 15_000 });
    } finally {
      await killServer(server);
      await page.close();
    }
  });
});

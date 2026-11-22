import { test, expect, type Page } from "@playwright/test";

/**
 * Stage 3 Priority 3 — session recovery scenarios beyond the original
 * three smoke tests in practice.spec.ts. Runs against the shared
 * webServer (port 3100, playwright.config.ts). The real server-restart
 * scenario lives separately, in serverRestart.spec.ts, run via its own
 * `npm run test:e2e:restart` command — see that file's doc comment for
 * why (Next.js 16 refuses to run two `next dev` instances for the same
 * project directory at once, even on different ports).
 */

async function answerOneQuestion(page: Page): Promise<void> {
  await expect(page.getByText(/question \d+ of/i)).toBeVisible({ timeout: 15_000 });
  await page.locator('input[name="answer"]').first().check();
  await page.getByRole("button", { name: "Submit" }).click();
  await expect(page.getByText(/correct\.|not quite\./i)).toBeVisible({ timeout: 10_000 });
}

test.describe("Stage 3 Priority 3 — refresh and navigation recovery", () => {
  test("refresh BEFORE submitting: the same question re-appears, nothing is recorded as answered, and the session is not restarted", async ({ page }) => {
    await page.goto("/practice");
    await expect(page.getByLabel("Topic")).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: /^Non-Adaptive / }).click();
    await page.getByRole("button", { name: "Start Practice" }).click();
    await expect(page.getByText("Question 1 of")).toBeVisible({ timeout: 15_000 });
    const sessionCookieBefore = (await page.context().cookies()).find((c) => c.name === "nonAdaptiveRiseSessionId")?.value;

    await page.locator('input[name="answer"]').first().check(); // selected, NOT submitted
    await page.reload();

    await expect(page.getByText("Question 1 of")).toBeVisible({ timeout: 15_000 });
    // An unsubmitted selection is allowed to be lost on refresh (it was never durably recorded) —
    // what matters is the session identity and position are unaffected, and no feedback is shown
    // (nothing was actually submitted).
    expect(await page.getByText(/correct\.|not quite\./i).isVisible().catch(() => false)).toBe(false);
    const sessionCookieAfter = (await page.context().cookies()).find((c) => c.name === "nonAdaptiveRiseSessionId")?.value;
    expect(sessionCookieAfter).toBe(sessionCookieBefore);

    // The session still works normally afterward.
    await page.locator('input[name="answer"]').first().check();
    await page.getByRole("button", { name: "Submit" }).click();
    await expect(page.getByText(/correct\.|not quite\./i)).toBeVisible();
  });

  test("refresh AFTER submitting but BEFORE continuing: feedback is preserved, and continuing afterward does not re-submit or skip a question", async ({ page }) => {
    await page.goto("/practice");
    await expect(page.getByLabel("Topic")).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: /^Adaptive / }).click();
    await page.getByRole("button", { name: "Start Practice" }).click();
    await answerOneQuestion(page);

    await page.reload();
    // The answered question's feedback must still be visible — a submitted answer is durable
    // (Stage 2), so refreshing must never ask the student to answer the same question again.
    await expect(page.getByText(/correct\.|not quite\./i)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("Question 1 of")).toBeVisible();

    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.getByText("Question 2 of")).toBeVisible({ timeout: 15_000 });
  });

  test("navigating away to Dashboard and back to Practice resumes the SAME session rather than starting a new one", async ({ page }) => {
    await page.goto("/practice");
    await expect(page.getByLabel("Topic")).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: "Start Practice" }).click();
    await answerOneQuestion(page);
    const sessionCookieBefore = (await page.context().cookies()).find((c) => c.name === "adaptiveTutorSessionId")?.value;
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.getByText("Question 2 of")).toBeVisible({ timeout: 15_000 });

    await page.locator("aside").getByRole("link", { name: "Dashboard" }).click();
    await expect(page.getByRole("heading", { name: /welcome/i })).toBeVisible();
    await page.locator("aside").getByRole("link", { name: "Practice", exact: true }).click();

    // Resuming must land directly on the active question, never the setup screen, and at the
    // position the student actually left off (question 2), not back at question 1.
    await expect(page.getByText("Question 2 of")).toBeVisible({ timeout: 15_000 });
    const sessionCookieAfter = (await page.context().cookies()).find((c) => c.name === "adaptiveTutorSessionId")?.value;
    expect(sessionCookieAfter).toBe(sessionCookieBefore);
  });

  test("a rapid double-click on Submit records exactly one response for that question, never two", async ({ page }) => {
    await page.goto("/practice");
    await expect(page.getByLabel("Topic")).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: /^Non-Adaptive / }).click();
    await page.getByRole("button", { name: "Start Practice" }).click();
    await expect(page.getByText("Question 1 of")).toBeVisible({ timeout: 15_000 });
    await page.locator('input[name="answer"]').first().check();

    const submitButton = page.getByRole("button", { name: "Submit" });
    await Promise.all([submitButton.click(), submitButton.click({ timeout: 500 }).catch(() => {})]);

    await expect(page.getByText(/correct\.|not quite\./i)).toBeVisible({ timeout: 10_000 });
    // Advancing must move to exactly question 2, not question 3 -- if the double-click had
    // recorded two responses, the engine would have silently skipped a question's worth of state.
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.getByText("Question 2 of")).toBeVisible({ timeout: 15_000 });
  });

  test("an invalid/stale session cookie is handled gracefully: the app shows the normal setup screen, never a crash", async ({ page, context }) => {
    await context.addCookies([{ name: "nonAdaptiveRiseSessionId", value: "this-session-id-does-not-exist-in-the-database", url: "http://localhost:3100" }]);
    await page.goto("/practice");
    // Falls back to the setup screen (the stale cookie is cleared server-side) rather than an
    // error page or a frozen loading state.
    await expect(page.getByLabel("Topic")).toBeVisible({ timeout: 15_000 });
    await expect(page.locator("main")).not.toContainText("Application error");
  });

  test("Settings reset followed by a new session is a genuine cold start, not a resumed or partially-reset session", async ({ page }) => {
    await page.goto("/practice");
    await expect(page.getByLabel("Topic")).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: "Start Practice" }).click();
    await answerOneQuestion(page);
    await page.getByRole("button", { name: "Continue" }).click();

    await page.goto("/settings");
    await expect(page.getByRole("button", { name: "Reset all student practice data" })).toBeEnabled({ timeout: 15_000 });
    await page.getByRole("button", { name: "Reset all student practice data" }).click();
    await page.getByRole("button", { name: /yes, reset all student practice data/i }).click();
    await expect(page.getByText("Done.")).toBeVisible();

    await page.goto("/practice");
    // A genuine cold start lands on the setup screen, never auto-resumes the just-reset session.
    await expect(page.getByLabel("Topic")).toBeVisible({ timeout: 15_000 });
  });

  test("two tabs sharing the same session cookie: submitting from one tab is reflected, not duplicated or corrupted, when the other tab reloads", async ({ context }) => {
    const tabA = await context.newPage();
    const tabB = await context.newPage();

    await tabA.goto("/practice");
    await expect(tabA.getByLabel("Topic")).toBeVisible({ timeout: 15_000 });
    await tabA.getByRole("button", { name: "Start Practice" }).click();
    await answerOneQuestion(tabA);
    await tabA.getByRole("button", { name: "Continue" }).click();
    await expect(tabA.getByText("Question 2 of")).toBeVisible({ timeout: 15_000 });

    // tabB shares the same cookies (same BrowserContext) and loads the SAME in-progress session —
    // it must resume at the exact position tabA already advanced to, not a stale/cold one.
    await tabB.goto("/practice");
    await expect(tabB.getByText("Question 2 of")).toBeVisible({ timeout: 15_000 });

    // Answering from tabB must not corrupt or duplicate the state tabA already committed.
    await answerOneQuestion(tabB);
    await tabB.getByRole("button", { name: "Continue" }).click();
    await expect(tabB.getByText("Question 3 of")).toBeVisible({ timeout: 15_000 });

    // tabA, reloaded, must see the SAME current position tabB just advanced to (one shared durable
    // session, not two independent/diverged copies).
    await tabA.reload();
    await expect(tabA.getByText("Question 3 of")).toBeVisible({ timeout: 15_000 });

    await tabA.close();
    await tabB.close();
  });

  test("a failed server request on submit surfaces an understandable error instead of crashing or silently losing the question", async ({ page }) => {
    await page.goto("/practice");
    await expect(page.getByLabel("Topic")).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: "Start Practice" }).click();
    await expect(page.getByText("Question 1 of")).toBeVisible({ timeout: 15_000 });

    // Simulate a network/server failure for exactly the next Server Action POST (Next.js Server
    // Actions are POSTs to the current page URL carrying a `next-action` request header) — real
    // submissions are GETs/other POSTs too, so this narrows to the actual action request rather
    // than breaking page navigation itself.
    let aborted = false;
    await page.route("**/practice", async (route) => {
      const req = route.request();
      if (!aborted && req.method() === "POST" && req.headers()["next-action"]) {
        aborted = true;
        await route.abort("failed");
        return;
      }
      await route.continue();
    });

    await page.locator('input[name="answer"]').first().check();
    await page.getByRole("button", { name: "Submit" }).click();

    // The app must not crash (no Next.js error overlay) and must not silently show a fabricated
    // "Correct."/"Not quite." result for a request that never reached the server. It must also
    // never leave the student on a dead-end screen with no way to recover.
    await expect(page.locator("main")).not.toContainText("Application error");
    await expect(page.getByText(/correct\.|not quite\./i)).not.toBeVisible();
    await expect(page.getByRole("button", { name: "Try Again" })).toBeVisible({ timeout: 10_000 });

    // Un-block the network and recover via the error screen's own "Try Again" — this must resume
    // the SAME durably-stored session at the SAME question, not lose or duplicate anything, and
    // not silently cold-start a new session.
    await page.unroute("**/practice");
    await page.getByRole("button", { name: "Try Again" }).click();
    await expect(page.getByText("Question 1 of")).toBeVisible({ timeout: 15_000 });
    await page.locator('input[name="answer"]').first().check();
    await page.getByRole("button", { name: "Submit" }).click();
    await expect(page.getByText(/correct\.|not quite\./i)).toBeVisible({ timeout: 10_000 });
  });
});

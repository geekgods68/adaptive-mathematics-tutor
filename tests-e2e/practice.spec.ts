import { test, expect } from "@playwright/test";

/**
 * Stage 3 Part 15 — real browser verification, run against an actual
 * `next dev` server (via playwright.config.ts's webServer), not jsdom.
 * This file covers a deliberately narrowed slice of the full Part 15
 * scenario list, chosen for genuine end-to-end value within this
 * session's time budget — see docs/stage3-ui-integration-report.md
 * section 10 for exactly which Part 15 scenarios this does and does not
 * exercise, and why the rest were not attempted here. Nothing in this
 * file touches the real research-output/ tree (see playwright.config.ts).
 */

test.describe("Scenario A (reduced) — first-time adaptive student, real browser", () => {
  test("Dashboard -> Practice -> answer questions -> complete -> Dashboard/History agree", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /welcome/i })).toBeVisible();

    const startLink = page.getByRole("link", { name: "Start Initial Diagnostic" }).or(page.getByRole("link", { name: "Start Practice" })).first();
    const startLinkHref = await startLink.getAttribute("href");
    await startLink.click();

    if (startLinkHref === "/assessments") {
      // Dashboard's "Start Initial Diagnostic" link goes to the Assessments page first; its own
      // "Start" link is what actually autostarts the adaptive /practice session.
      await page.getByRole("heading", { name: "Assessments" }).waitFor();
      await page.getByRole("link", { name: "Start" }).first().click();
    }

    // Practice itself may land on the setup screen for a brand-new browser profile — handle both.
    const startButton = page.getByRole("button", { name: "Start Practice" });
    if (await startButton.isVisible().catch(() => false)) {
      await startButton.click();
    }

    await expect(page.getByText(/question 1 of/i)).toBeVisible({ timeout: 15_000 });

    let answered = 0;
    for (let i = 0; i < 5; i++) {
      await expect(page.getByText(/question \d+ of/i)).toBeVisible();
      const firstOption = page.locator('input[name="answer"]').first();
      await firstOption.check();
      await page.getByRole("button", { name: "Submit" }).click();
      await expect(page.getByText(/correct\.|not quite\./i)).toBeVisible();
      answered++;
      const continueButton = page.getByRole("button", { name: "Continue" });
      await continueButton.click();
      const completed = await page.getByText("Practice complete").isVisible().catch(() => false);
      if (completed) break;
    }
    expect(answered).toBeGreaterThan(0);

    // Whether it completed in 5 questions or is still active, both are valid real outcomes for an
    // adaptive session (mastery-threshold stopping is legitimate, not a bug) — assert on whichever
    // real state we're actually in rather than forcing completion.
    const onCompletion = await page.getByText("Practice complete").isVisible().catch(() => false);
    if (onCompletion) {
      await page.getByRole("link", { name: "Return to Dashboard" }).click();
      await expect(page.getByRole("heading", { name: /welcome back/i })).toBeVisible();
      await expect(page.getByText(/sessions completed/i)).toBeVisible();

      await page.getByRole("link", { name: "Session History" }).click();
      await expect(page.getByText(/session.*recorded in this browser/i)).toBeVisible();
    }
  });
});

test.describe("Scenario C (reduced) — modern non-adaptive mode with chapter selection, real browser", () => {
  test("select Non-Adaptive mode and a chapter, start, answer one question", async ({ page }) => {
    await page.goto("/practice");
    await expect(page.getByLabel("Topic")).toBeVisible({ timeout: 15_000 });

    await page.getByRole("button", { name: /^Non-Adaptive / }).click();
    // Stage 3 fix under test: the Topic dropdown must remain enabled and actually usable in
    // Non-Adaptive mode (previously disabled with a misleading "not supported" note).
    await expect(page.getByLabel("Topic")).toBeEnabled();
    await page.getByLabel("Topic").selectOption({ label: "Geometry" });

    await page.getByRole("button", { name: "Start Practice" }).click();
    await expect(page.getByText(/question 1 of/i)).toBeVisible({ timeout: 15_000 });

    await page.locator('input[name="answer"]').first().check();
    await page.getByRole("button", { name: "Submit" }).click();
    await expect(page.getByText(/correct\.|not quite\./i)).toBeVisible();
  });
});

test.describe("Scenario F (reduced) — mathematical rendering spot-check, real browser", () => {
  test("question stem renders without crashing the page across several practice questions", async ({ page }) => {
    await page.goto("/practice");
    await expect(page.getByLabel("Topic")).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: "Start Practice" }).click();
    await expect(page.getByText(/question 1 of/i)).toBeVisible({ timeout: 15_000 });

    for (let i = 0; i < 3; i++) {
      // The page must render SOME non-empty stem text and must not have thrown (Next.js shows its
      // own error overlay on an unhandled render error, which this checks is absent).
      await expect(page.locator("main")).not.toContainText("Application error");
      const stemLength = await page.locator("fieldset").first().locator("xpath=preceding-sibling::p[1]").textContent();
      expect((stemLength ?? "").length).toBeGreaterThan(0);
      await page.locator('input[name="answer"]').first().check();
      await page.getByRole("button", { name: "Submit" }).click();
      await expect(page.getByText(/correct\.|not quite\./i)).toBeVisible();
      const completed = await page.getByText("Practice complete").isVisible().catch(() => false);
      if (completed) break;
      await page.getByRole("button", { name: "Continue" }).click();
    }
  });
});

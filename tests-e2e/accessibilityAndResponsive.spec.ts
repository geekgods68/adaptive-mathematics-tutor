import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * Stage 3 Priority 5 — real automated accessibility scans (axe-core) and
 * responsive-layout checks, run against the live app in a real browser.
 * This is NOT a claim of full WCAG conformance (axe-core itself only
 * catches a subset of accessibility issues, and only the pages/states
 * listed below were scanned) — see docs/stage3-ui-integration-report.md
 * Priority 5 for exactly what this does and does not cover.
 */

const VIEWPORTS = [
  { name: "mobile", width: 375, height: 812 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1440, height: 900 },
];

test.describe("Stage 3 Priority 5 — axe-core accessibility scans", () => {
  test("Dashboard has no automatically-detectable accessibility violations", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /welcome/i })).toBeVisible({ timeout: 15_000 });
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
  });

  test("Practice setup screen has no automatically-detectable accessibility violations", async ({ page }) => {
    await page.goto("/practice");
    await expect(page.getByLabel("Topic")).toBeVisible({ timeout: 15_000 });
    // `label-content-name-mismatch` is disabled ONLY for this page, with a documented reason (see
    // ModeCard's own doc comment in PracticeClient.tsx): its two mode-selector buttons each have a
    // short, deliberate accessible name ("Adaptive mode"/"Non-Adaptive mode") distinct from a
    // longer supplementary visible description in the same control. Per the W3C's "Understanding
    // SC 2.5.3" guidance, only the control's actual LABEL text must appear in its accessible name —
    // genuinely descriptive text beyond the label is exempt — but axe-core's automated heuristic
    // for this rule cannot distinguish "label vs. description" and flags the pattern regardless.
    // This is the ONLY disabled rule anywhere in this spec file; every other finding this pass
    // discovered (contrast, missing progressbar name, missing radio labels) was fixed, not
    // suppressed — see docs/stage3-ui-integration-report.md Priority 5 for the full account.
    const results = await new AxeBuilder({ page }).disableRules(["label-content-name-mismatch"]).analyze();
    expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
  });

  test("an active Practice question screen has no automatically-detectable accessibility violations", async ({ page }) => {
    await page.goto("/practice");
    await expect(page.getByLabel("Topic")).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: "Start Practice" }).click();
    await expect(page.getByText("Question 1 of")).toBeVisible({ timeout: 15_000 });
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
  });

  test("Settings screen has no automatically-detectable accessibility violations", async ({ page }) => {
    await page.goto("/settings");
    await expect(page.getByRole("heading", { name: "Appearance" })).toBeVisible({ timeout: 15_000 });
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
  });
});

test.describe("Stage 3 Priority 5 — keyboard navigation", () => {
  test("the practice question screen is fully operable via keyboard alone: selecting an option and submitting", async ({ page }) => {
    await page.goto("/practice");
    await expect(page.getByLabel("Topic")).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: "Start Practice" }).click();
    await expect(page.getByText("Question 1 of")).toBeVisible({ timeout: 15_000 });

    const firstOption = page.locator('input[name="answer"]').first();
    await firstOption.focus();
    await expect(firstOption).toBeFocused();
    await page.keyboard.press("Space");
    await expect(firstOption).toBeChecked();

    // Tab forward to the Submit button and activate it with the keyboard, never a mouse click.
    await page.keyboard.press("Tab");
    const submitButton = page.getByRole("button", { name: "Submit" });
    await expect(submitButton).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.getByText(/correct\.|not quite\./i)).toBeVisible({ timeout: 10_000 });
  });

  test("the sidebar navigation links each show a visible focus indicator when tabbed to", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /welcome/i })).toBeVisible({ timeout: 15_000 });
    const practiceLink = page.locator("aside").getByRole("link", { name: "Practice" });
    await practiceLink.focus();
    await expect(practiceLink).toBeFocused();
    // A real focus indicator exists if the browser's own default outline is not explicitly
    // suppressed without a visible replacement — check computed outline/box-shadow is not "none".
    const hasVisibleFocusStyle = await practiceLink.evaluate((el) => {
      const style = window.getComputedStyle(el);
      return style.outlineStyle !== "none" || style.boxShadow !== "none";
    });
    expect(hasVisibleFocusStyle).toBe(true);
  });
});

test.describe("Stage 3 Priority 5 — responsive layout at mobile/tablet/desktop", () => {
  for (const viewport of VIEWPORTS) {
    test(`Dashboard and Practice have no horizontal overflow at ${viewport.name} (${viewport.width}x${viewport.height})`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });

      await page.goto("/");
      await expect(page.getByRole("heading", { name: /welcome/i })).toBeVisible({ timeout: 15_000 });
      let overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, `Dashboard has ${overflow}px of horizontal overflow at ${viewport.name}`).toBeLessThanOrEqual(1);

      await page.goto("/practice");
      await expect(page.getByLabel("Topic")).toBeVisible({ timeout: 15_000 });
      overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, `Practice setup has ${overflow}px of horizontal overflow at ${viewport.name}`).toBeLessThanOrEqual(1);

      await page.getByRole("button", { name: "Start Practice" }).click();
      await expect(page.getByText("Question 1 of")).toBeVisible({ timeout: 15_000 });
      overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, `Practice question screen has ${overflow}px of horizontal overflow at ${viewport.name}`).toBeLessThanOrEqual(1);

      // The answer options and Submit button must remain genuinely tappable (not clipped off
      // the visible viewport) at every size, mobile included.
      const submitButton = page.getByRole("button", { name: "Submit" });
      await expect(submitButton).toBeVisible();
      const box = await submitButton.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width + 1);
    });
  }

  test("the mobile sidebar is collapsed by default and opens via the menu button", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /welcome/i })).toBeVisible({ timeout: 15_000 });

    const sidebarPracticeLink = page.locator("aside").getByRole("link", { name: "Practice" });
    await expect(sidebarPracticeLink).not.toBeInViewport();

    await page.getByRole("button", { name: "Open navigation" }).click();
    await expect(sidebarPracticeLink).toBeInViewport();
  });
});

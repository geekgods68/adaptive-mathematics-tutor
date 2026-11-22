import { test, expect, type Page } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { E2E_DB_PATH, E2E_SESSION_ARTIFACTS_ROOT } from "./e2eScratch";

/**
 * Stage 3 Part 16 (previously entirely skipped — see
 * docs/stage3-ui-integration-report.md section 11 of the prior pass):
 * drives a REAL completed session through the browser for both modern
 * conditions, then reads Stage 2's durable SQLite record, research
 * events, and Phase 6 artifact back and asserts they agree with what the
 * browser actually showed. This is the test the coordinator's Priority 1
 * explicitly required.
 *
 * The durable read happens in a SEPARATE `tsx` child process
 * (readDurableSession.ts), not via a dynamic `import()` of application
 * source directly in this file: Playwright Test's own module loader does
 * not resolve this repo's `@/*` path aliases for a deep dynamic import
 * chain (only `tsx`/the Next.js build do), so shelling out to `tsx` is
 * the robust way to reuse the real service/store/artifact code unchanged
 * rather than re-implementing any of it here. The child process is given
 * RESEARCH_DB_PATH/RESEARCH_SESSION_ARTIFACTS_ROOT pointing at the exact
 * same fixed scratch paths `playwright.config.ts` already pointed the
 * `next dev` server's webServer at (`e2eScratch.ts`) — SQLite's WAL mode
 * allows this separate process to read the dev server's writes. Nothing
 * here ever touches the real `research-output/` tree.
 */

interface DurableSessionSnapshot {
  status: string;
  conditionId: string;
  responses: { questionId: string; isCorrect: boolean }[];
  presentedQuestionIds: string[];
  estimatorStates: Record<string, { mastery: number }>;
  eventSeqs: number[];
  eventTypes: string[];
  eventSessionIdsMatch: boolean;
  artifact: { runId: string; conditionId: string; finalEstimatorStates: Record<string, { mastery: number }> };
  integrity: { schemaVersionSupported: boolean; contentDigestValid: boolean; questionBankMatchesCurrent: boolean | "not_checked"; issues: string[] };
}

function readDurableSession(kind: "c0" | "c2", sessionId: string): DurableSessionSnapshot {
  const output = execFileSync("npx", ["tsx", "tests-e2e/readDurableSession.ts", kind, sessionId], {
    cwd: process.cwd(),
    env: { ...process.env, RESEARCH_DB_PATH: E2E_DB_PATH, RESEARCH_SESSION_ARTIFACTS_ROOT: E2E_SESSION_ARTIFACTS_ROOT },
    encoding: "utf-8",
  });
  return JSON.parse(output) as DurableSessionSnapshot;
}

async function getCookieValue(page: Page, name: string): Promise<string> {
  const cookies = await page.context().cookies();
  const cookie = cookies.find((c) => c.name === name);
  if (!cookie) throw new Error(`Cookie "${name}" was not set — the session may not have started.`);
  return cookie.value;
}

/**
 * Answers the first option every time until "Practice complete" shows,
 * recording the exact correctness sequence the browser displayed.
 *
 * The LAST question's "Continue" click transitions straight to the
 * completion screen, tearing down the question view in the same React
 * transition — so after every "Continue" click, this explicitly waits
 * for "Submit" to (re)appear (a NEW, unanswered question has loaded) or
 * "Practice complete" to appear, rather than looping back and
 * re-querying immediately. The "Question N of" heading is NOT a
 * reliable signal for this: it updates the SAME DOM node in place
 * between questions, so it stays "visible" throughout the transition
 * and does not actually indicate the next question has loaded.
 */
async function driveSessionToCompletion(page: Page, maxSteps: number): Promise<boolean[]> {
  const observedCorrectness: boolean[] = [];
  const completeLocator = page.getByText("Practice complete");
  const submitButton = page.getByRole("button", { name: "Submit" });

  if (!(await completeLocator.isVisible().catch(() => false))) {
    await expect(submitButton).toBeVisible({ timeout: 15_000 });
  }

  for (let i = 0; i < maxSteps; i++) {
    if (await completeLocator.isVisible().catch(() => false)) break;

    const firstOption = page.locator('input[name="answer"]').first();
    await expect(firstOption).toBeEnabled({ timeout: 15_000 });
    await firstOption.check();
    await submitButton.click();
    // `.isVisible()` alone does NOT wait for an element to appear (it only checks current state),
    // so this explicitly waits for one of the two mutually-exclusive feedback messages before
    // reading which one actually rendered.
    const feedbackMessage = page.getByText(/^(correct\.|not quite\.)$/i);
    await feedbackMessage.waitFor({ state: "visible", timeout: 15_000 });
    const isCorrect = (await feedbackMessage.textContent())?.trim().toLowerCase() === "correct.";
    observedCorrectness.push(isCorrect);

    const continueButton = page.getByRole("button", { name: "Continue" });
    await expect(continueButton).toBeEnabled({ timeout: 10_000 });
    await continueButton.click();
    await Promise.race([completeLocator.waitFor({ state: "visible", timeout: 15_000 }), submitButton.waitFor({ state: "visible", timeout: 15_000 })]);
  }
  return observedCorrectness;
}

function parseCompletionSummary(summaryText: string): { correct: number; total: number } {
  const match = summaryText.match(/You answered (\d+) of (\d+) questions correctly\./);
  expect(match, `Completion summary text didn't match the expected pattern: "${summaryText}"`).not.toBeNull();
  return { correct: Number(match![1]), total: Number(match![2]) };
}

test.describe("Stage 3 Part 16 — browser-visible session agrees with Stage 2's durable record", () => {
  test("C0 (non-adaptive): completion summary, response sequence, and artifact integrity all agree with the durable SQLite record", async ({ page }) => {
    // A full 20-question non-adaptive session is two server round-trips per question (submit +
    // advance) against a `next dev` Turbopack server — slower than the lighter smoke tests
    // elsewhere in this suite, so this test gets its own longer budget rather than inflating the
    // whole file's default.
    test.setTimeout(150_000);
    await page.goto("/practice");
    await expect(page.getByLabel("Topic")).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: /^Non-Adaptive / }).click();
    await page.getByLabel("Topic").selectOption({ label: "Geometry" });
    await page.getByRole("button", { name: "Start Practice" }).click();
    await expect(page.getByText(/question 1 of/i)).toBeVisible({ timeout: 15_000 });

    const sessionId = await getCookieValue(page, "nonAdaptiveRiseSessionId");
    const observedCorrectness = await driveSessionToCompletion(page, 25);
    await expect(page.getByText("Practice complete")).toBeVisible();

    const summaryText = (await page.locator("text=/You answered \\d+ of \\d+ questions correctly\\./").textContent()) ?? "";
    const { correct: domCorrect, total: domTotal } = parseCompletionSummary(summaryText);
    expect(domTotal).toBe(observedCorrectness.length);
    expect(domCorrect).toBe(observedCorrectness.filter(Boolean).length);

    const durable = readDurableSession("c0", sessionId);
    expect(durable.status).toBe("terminated");
    expect(durable.conditionId).toBe("C0");
    expect(durable.responses).toHaveLength(domTotal);
    expect(durable.responses.filter((r) => r.isCorrect)).toHaveLength(domCorrect);
    // Exact per-question correctness sequence agreement, not just the totals.
    expect(durable.responses.map((r) => r.isCorrect)).toEqual(observedCorrectness);
    // Every response's question id is a real id from the durable record's own presented-question
    // list (the browser never displays raw question ids to the student, by CLAUDE.md hard
    // constraint 11 — so "the UI and the DB agree on question IDs" is verified here as "every
    // durably recorded response corresponds to a durably recorded presented question," not as a
    // DOM-to-DB string comparison, which the protected client/server boundary makes impossible to
    // do more literally without leaking research metadata to the browser).
    for (const response of durable.responses) {
      expect(durable.presentedQuestionIds).toContain(response.questionId);
    }

    // Research-event log: no duplicate/missing events for this session.
    expect(durable.eventSeqs.length).toBeGreaterThan(0);
    expect(new Set(durable.eventSeqs).size).toBe(durable.eventSeqs.length); // no duplicate sequence numbers
    expect([...durable.eventSeqs].sort((a, b) => a - b)).toEqual(Array.from({ length: durable.eventSeqs.length }, (_, i) => i + 1)); // contiguous, no gaps
    expect(durable.eventSessionIdsMatch).toBe(true);
    expect(durable.eventTypes.filter((t) => t === "answer_submitted")).toHaveLength(domTotal);
    expect(durable.eventTypes.filter((t) => t === "session_completed")).toHaveLength(1);

    // Phase 6 artifact: exists, loads, and passes integrity verification.
    expect(durable.artifact.runId).toBe(sessionId);
    expect(durable.artifact.conditionId).toBe("C0");
    expect(durable.integrity.schemaVersionSupported).toBe(true);
    expect(durable.integrity.contentDigestValid).toBe(true);
    expect(durable.integrity.questionBankMatchesCurrent).toBe(true);
    expect(durable.integrity.issues).toEqual([]);
  });

  test("C2 (adaptive): completion summary, mastery estimates, and artifact integrity all agree with the durable SQLite record", async ({ page }) => {
    test.setTimeout(150_000);
    await page.goto("/practice");
    await expect(page.getByLabel("Topic")).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: /^Adaptive / }).click();
    await page.getByRole("button", { name: "Start Practice" }).click();
    await expect(page.getByText(/question 1 of/i)).toBeVisible({ timeout: 15_000 });

    const sessionId = await getCookieValue(page, "adaptiveTutorSessionId");
    const observedCorrectness = await driveSessionToCompletion(page, 30);
    await expect(page.getByText("Practice complete")).toBeVisible();

    const summaryText = (await page.locator("text=/You answered \\d+ of \\d+ questions correctly\\./").textContent()) ?? "";
    const { correct: domCorrect, total: domTotal } = parseCompletionSummary(summaryText);
    expect(domTotal).toBe(observedCorrectness.length);
    expect(domCorrect).toBe(observedCorrectness.filter(Boolean).length);

    // Scrape the completion screen's per-concept "After" mastery percentages, to compare against
    // the durable estimator state directly (not just response counts).
    const afterCells = await page.locator("table tbody tr td:last-child").allTextContents();
    const domAfterPercents = afterCells.map((t) => Number(t.replace("%", ""))).filter((n) => !Number.isNaN(n));

    const durable = readDurableSession("c2", sessionId);
    expect(durable.status).toBe("terminated");
    expect(durable.conditionId).toBe("C2");
    expect(durable.responses).toHaveLength(domTotal);
    expect(durable.responses.filter((r) => r.isCorrect)).toHaveLength(domCorrect);
    expect(durable.responses.map((r) => r.isCorrect)).toEqual(observedCorrectness);

    const dbAfterPercents = Object.values(durable.estimatorStates)
      .map((s) => Math.round(s.mastery * 100))
      .sort((a, b) => a - b);
    expect([...domAfterPercents].sort((a, b) => a - b)).toEqual(dbAfterPercents);

    expect(durable.eventSeqs.length).toBeGreaterThan(0);
    expect(new Set(durable.eventSeqs).size).toBe(durable.eventSeqs.length);
    expect([...durable.eventSeqs].sort((a, b) => a - b)).toEqual(Array.from({ length: durable.eventSeqs.length }, (_, i) => i + 1));
    expect(durable.eventTypes.filter((t) => t === "answer_submitted")).toHaveLength(domTotal);
    expect(durable.eventTypes.filter((t) => t === "session_completed")).toHaveLength(1);
    // C2 has a real estimator, so every answer should produce a matching mastery update event —
    // unlike C0 (null estimator), where this event type is never emitted at all (Stage 2 report).
    expect(durable.eventTypes.filter((t) => t === "estimator_updated").length).toBeGreaterThan(0);

    expect(durable.artifact.runId).toBe(sessionId);
    expect(durable.artifact.conditionId).toBe("C2");
    expect(Object.values(durable.artifact.finalEstimatorStates).map((s) => Math.round(s.mastery * 100)).sort((a, b) => a - b)).toEqual(dbAfterPercents);
    expect(durable.integrity.schemaVersionSupported).toBe(true);
    expect(durable.integrity.contentDigestValid).toBe(true);
    expect(durable.integrity.questionBankMatchesCurrent).toBe(true);
    expect(durable.integrity.issues).toEqual([]);
  });
});

// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SettingsClient from "@/app/settings/SettingsClient";
import * as adaptiveActions from "@/app/adaptive-tutor/actions";
import * as riseActions from "@/app/practice/riseNonAdaptiveActions";
import { recordSession } from "@/lib/studentHistory";
import { writeMasteryState } from "@/lib/studentMasteryState";
import { recordSeenQuestionIds } from "@/lib/studentQuestionHistory";
import { getOrCreateParticipantId } from "@/lib/studentIdentity";

vi.mock("@/app/adaptive-tutor/actions", () => ({
  listChaptersAction: vi.fn(),
  resetAdaptiveSessionAction: vi.fn(),
}));

vi.mock("@/app/practice/riseNonAdaptiveActions", () => ({
  resetNonAdaptiveRiseSessionAction: vi.fn(),
}));

function seedAllThreeStores() {
  recordSession({
    id: "s1",
    type: "adaptive",
    source: "practice",
    startedAt: "2026-01-01T00:00:00.000Z",
    completedAt: "2026-01-01T00:10:00.000Z",
    totalQuestions: 5,
    correctAnswers: 4,
    accuracy: 0.8,
    concepts: [],
    conceptsNeedingPractice: [],
  });
  writeMasteryState("v1", {
    c1: {
      conceptId: "c1",
      mastery: 0.7,
      initialMastery: 0.3,
      numObservations: 3,
      correctCount: 2,
      incorrectCount: 1,
      consecutiveCorrect: 1,
      consecutiveIncorrect: 0,
      modelVersion: "v1",
      createdAt: "2026-01-01T00:00:00.000Z",
      lastUpdatedAt: "2026-01-01T00:10:00.000Z",
    },
  });
  recordSeenQuestionIds(["q1", "q2"]);
}

async function summaryText(): Promise<string> {
  const node = await screen.findByTestId("local-data-summary");
  return node.textContent ?? "";
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  vi.mocked(adaptiveActions.listChaptersAction).mockResolvedValue({ ok: true, data: { chapters: [] } });
  vi.mocked(adaptiveActions.resetAdaptiveSessionAction).mockResolvedValue({ ok: true, data: { status: "no_session" } });
  vi.mocked(riseActions.resetNonAdaptiveRiseSessionAction).mockResolvedValue({ ok: true, data: { status: "no_session" } });
});

describe("SettingsClient — F-04 reset-semantics fix: three distinct, non-interchangeable operations", () => {
  it("'Clear session history' removes only session history, leaving mastery and question history intact", async () => {
    seedAllThreeStores();
    render(<SettingsClient />);
    expect(await summaryText()).toMatch(/1 completed session recorded, 1 concept with saved mastery, and 2 previously-seen questions tracked/);

    await userEvent.click(screen.getByRole("button", { name: "Clear session history" }));
    await userEvent.click(screen.getByRole("button", { name: /yes, clear session history/i }));

    await screen.findByText("Done.");
    expect(await summaryText()).toMatch(/0 completed sessions recorded, 1 concept with saved mastery, and 2 previously-seen questions tracked/);
  });

  it("'Reset adaptive progress' clears mastery and question history, leaving session history intact", async () => {
    seedAllThreeStores();
    render(<SettingsClient />);
    await summaryText();
    await userEvent.click(screen.getByRole("button", { name: "Reset adaptive progress" }));
    await userEvent.click(screen.getByRole("button", { name: /yes, reset adaptive progress/i }));

    await screen.findByText("Done.");
    expect(await summaryText()).toMatch(/1 completed session recorded, 0 concepts with saved mastery, and 0 previously-seen questions tracked/);
  });

  it("'Reset all student practice data' clears everything and ends any active session server-side", async () => {
    seedAllThreeStores();
    render(<SettingsClient />);
    await summaryText();
    await userEvent.click(screen.getByRole("button", { name: "Reset all student practice data" }));
    await userEvent.click(screen.getByRole("button", { name: /yes, reset all student practice data/i }));

    await screen.findByText("Done.");
    expect(await summaryText()).toMatch(/0 completed sessions recorded, 0 concepts with saved mastery, and 0 previously-seen questions tracked/);
    await waitFor(() => {
      expect(adaptiveActions.resetAdaptiveSessionAction).toHaveBeenCalled();
      expect(riseActions.resetNonAdaptiveRiseSessionAction).toHaveBeenCalled();
    });
  });

  it("requires explicit confirmation before any destructive operation runs, and Cancel performs no reset", async () => {
    seedAllThreeStores();
    render(<SettingsClient />);
    await summaryText();
    await userEvent.click(screen.getByRole("button", { name: "Clear session history" }));
    expect(screen.getByText(/are you sure/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByText(/are you sure/i)).not.toBeInTheDocument();
    expect(await summaryText()).toMatch(/1 completed session recorded/);
    expect(adaptiveActions.resetAdaptiveSessionAction).not.toHaveBeenCalled();
  });

  it("'Reset adaptive progress' retires the browser's participant id (Stage 3 Priority 2) so the next session cannot resolve the old durable mastery record under the same id", async () => {
    const before = getOrCreateParticipantId();
    seedAllThreeStores();
    render(<SettingsClient />);
    await summaryText();
    await userEvent.click(screen.getByRole("button", { name: "Reset adaptive progress" }));
    await userEvent.click(screen.getByRole("button", { name: /yes, reset adaptive progress/i }));
    await screen.findByText("Done.");

    const after = getOrCreateParticipantId();
    expect(after).not.toBe(before);
  });

  it("disables each reset control when there is nothing of its kind to reset", async () => {
    render(<SettingsClient />);
    expect(await summaryText()).toMatch(/0 completed sessions recorded, 0 concepts with saved mastery, and 0 previously-seen questions tracked/);
    expect(screen.getByRole("button", { name: "Clear session history" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Reset adaptive progress" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Reset all student practice data" })).toBeDisabled();
  });
});

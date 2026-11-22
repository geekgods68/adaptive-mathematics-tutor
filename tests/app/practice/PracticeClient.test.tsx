// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PracticeClient from "@/app/practice/PracticeClient";
import * as adaptiveActions from "@/app/adaptive-tutor/actions";
import * as nonAdaptiveRiseActions from "@/app/practice/riseNonAdaptiveActions";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/app/adaptive-tutor/actions", () => ({
  resumeAdaptiveSessionAction: vi.fn(),
  listChaptersAction: vi.fn(),
  startAdaptiveSessionAction: vi.fn(),
  submitAdaptiveAnswerAction: vi.fn(),
  advanceAdaptiveSessionAction: vi.fn(),
  resetAdaptiveSessionAction: vi.fn(),
  getCurrentMasteryStateAction: vi.fn(),
}));

vi.mock("@/app/practice/riseNonAdaptiveActions", () => ({
  resumeNonAdaptiveRiseSessionAction: vi.fn(),
  startNonAdaptiveRiseSessionAction: vi.fn(),
  submitNonAdaptiveRiseAnswerAction: vi.fn(),
  advanceNonAdaptiveRiseSessionAction: vi.fn(),
  resetNonAdaptiveRiseSessionAction: vi.fn(),
}));

// The real 14 RISE chapters (src/tutoring/adaptiveSession/curriculum.ts's CHAPTER_TITLES) —
// this is the exact existing dropdown data this redesign is required to preserve unchanged.
const REAL_CHAPTERS = [
  { chapterId: "CH01", title: "Algebra Foundations" },
  { chapterId: "CH02", title: "Functions" },
  { chapterId: "CH03", title: "Exponents" },
  { chapterId: "CH04", title: "Logarithms" },
  { chapterId: "CH05", title: "Differentiation" },
  { chapterId: "CH06", title: "Integration" },
  { chapterId: "CH07", title: "Geometry" },
  { chapterId: "CH08", title: "Trigonometry" },
  { chapterId: "CH09", title: "Vectors" },
  { chapterId: "CH10", title: "Probability" },
  { chapterId: "CH11", title: "Statistics" },
  { chapterId: "CH12", title: "Proofs and Logic" },
  { chapterId: "CH13", title: "Permutations and Combinations" },
  { chapterId: "CH14", title: "Complex Numbers" },
];

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  vi.mocked(adaptiveActions.resumeAdaptiveSessionAction).mockResolvedValue({ ok: true, data: { status: "no_session" } });
  vi.mocked(nonAdaptiveRiseActions.resumeNonAdaptiveRiseSessionAction).mockResolvedValue({ ok: true, data: { status: "no_session" } });
  vi.mocked(adaptiveActions.listChaptersAction).mockResolvedValue({ ok: true, data: { chapters: REAL_CHAPTERS } });
  vi.mocked(adaptiveActions.getCurrentMasteryStateAction).mockResolvedValue({ ok: true, data: { hasRecord: false } });
});

describe("PracticeClient — topic dropdown preservation (critical requirement)", () => {
  it("shows exactly 15 options: 'Across All Topics (Recommended)' first, then all 14 real chapters", async () => {
    render(<PracticeClient />);
    const select = await screen.findByLabelText("Topic");
    const options = within(select).getAllByRole("option");
    expect(options).toHaveLength(15);
    expect(options[0]).toHaveTextContent("Across All Topics (Recommended)");
    expect(options[0]).toHaveValue("");
    for (let i = 0; i < REAL_CHAPTERS.length; i++) {
      expect(options[i + 1]).toHaveTextContent(REAL_CHAPTERS[i].title);
      expect(options[i + 1]).toHaveValue(REAL_CHAPTERS[i].chapterId);
    }
  });

  it("the dropdown stays enabled in both Adaptive and Non-Adaptive mode (Stage 3 fix: chapter selection is backend-supported for non-adaptive too, not a UI-only-looking restriction)", async () => {
    render(<PracticeClient />);
    const select = await screen.findByLabelText("Topic");
    expect(select).toBeEnabled();

    await userEvent.click(screen.getByRole("button", { name: /^Non-Adaptive / }));
    expect(select).toBeEnabled();

    await userEvent.click(screen.getByRole("button", { name: /^Adaptive / }));
    expect(select).toBeEnabled();
  });

  it("selecting a chapter and starting NON-adaptive practice passes the exact chapterId to startNonAdaptiveRiseSessionAction (Stage 3: chapter selection now reaches the engine in both modes)", async () => {
    vi.mocked(nonAdaptiveRiseActions.startNonAdaptiveRiseSessionAction).mockResolvedValue({
      ok: true,
      data: { status: "active", sessionId: "s2", position: 0, maxQuestions: 20, chapterId: "CH03", question: { questionId: "q1", stem: "stem", options: [] }, answered: false },
    });
    render(<PracticeClient />);
    const select = await screen.findByLabelText("Topic");
    await userEvent.click(screen.getByRole("button", { name: /^Non-Adaptive / }));
    await userEvent.selectOptions(select, "CH03");
    await userEvent.click(screen.getByRole("button", { name: "Start Practice" }));
    expect(nonAdaptiveRiseActions.startNonAdaptiveRiseSessionAction).toHaveBeenCalledWith("CH03", []);
  });

  it("selecting a chapter and starting adaptive practice passes the exact chapterId to startAdaptiveSessionAction (preserved selection semantics)", async () => {
    vi.mocked(adaptiveActions.startAdaptiveSessionAction).mockResolvedValue({
      ok: true,
      data: { status: "active", sessionId: "s1", position: 0, maxQuestions: 20, chapterId: "CH07", question: { questionId: "q1", stem: "stem", options: [], selectionExplanation: "e" }, answered: false },
    });
    render(<PracticeClient />);
    const select = await screen.findByLabelText("Topic");
    await userEvent.selectOptions(select, "CH07");
    await userEvent.click(screen.getByRole("button", { name: "Start Practice" }));
    expect(adaptiveActions.startAdaptiveSessionAction).toHaveBeenCalledWith("CH07", {}, [], expect.any(String));
  });

  it("'Across All Topics (Recommended)' starts a session with no chapterId (undefined) -- the existing across-curriculum behavior, not a random mixture", async () => {
    vi.mocked(adaptiveActions.startAdaptiveSessionAction).mockResolvedValue({
      ok: true,
      data: { status: "active", sessionId: "s1", position: 0, maxQuestions: 20, question: { questionId: "q1", stem: "stem", options: [], selectionExplanation: "e" }, answered: false },
    });
    render(<PracticeClient />);
    await screen.findByLabelText("Topic");
    await userEvent.click(screen.getByRole("button", { name: "Start Practice" }));
    expect(adaptiveActions.startAdaptiveSessionAction).toHaveBeenCalledWith(undefined, {}, [], expect.any(String));
  });
});

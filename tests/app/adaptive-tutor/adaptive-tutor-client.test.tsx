// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AdaptiveTutorClient from "@/app/adaptive-tutor/adaptive-tutor-client";
import * as actions from "@/app/adaptive-tutor/actions";
import type { AdaptiveQuestionStateResult } from "@/app/adaptive-tutor/actionTypes";
import type { AdaptiveSessionSummary } from "@/tutoring/adaptiveSession/summary";

vi.mock("@/app/adaptive-tutor/actions", () => ({
  resumeAdaptiveSessionAction: vi.fn(),
  listChaptersAction: vi.fn(),
  startAdaptiveSessionAction: vi.fn(),
  submitAdaptiveAnswerAction: vi.fn(),
  advanceAdaptiveSessionAction: vi.fn(),
}));

function activeState(overrides: Partial<Extract<AdaptiveQuestionStateResult, { status: "active" }>> = {}) {
  return {
    status: "active" as const,
    sessionId: "s1",
    position: 0,
    maxQuestions: 20,
    chapterId: "CH01",
    question: {
      questionId: "q1",
      stem: "Evaluate x - 1 = 0",
      options: [
        { id: "o1", display: "x = 1" },
        { id: "o2", display: "x = -1" },
      ],
      selectionExplanation: "Starting with a question to see where you're at on this topic.",
    },
    answered: false,
    feedback: undefined,
    ...overrides,
  };
}

function completedState(): Extract<AdaptiveQuestionStateResult, { status: "completed" }> {
  const summary: AdaptiveSessionSummary = {
    totalQuestions: 5,
    correctAnswers: 3,
    incorrectAnswers: 2,
    accuracy: 0.6,
    conceptsPractised: ["Linear Equations"],
    progress: [{ conceptId: "c1", conceptName: "Linear Equations", chapterId: "CH01", observed: true, evidenceLevel: "Practised", masteryBeforePercent: 50, masteryAfterPercent: 68 }],
    conceptsNeedingPractice: [],
  };
  return { status: "completed" as const, sessionId: "s1", summary };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(actions.listChaptersAction).mockResolvedValue({ ok: true, data: { chapters: [{ chapterId: "CH01", title: "Algebra Foundations" }] } });
});

describe("AdaptiveTutorClient — setup", () => {
  it("shows the start screen with a chapter picker when there is no active session", async () => {
    vi.mocked(actions.resumeAdaptiveSessionAction).mockResolvedValue({ ok: true, data: { status: "no_session" } });
    render(<AdaptiveTutorClient />);
    expect(await screen.findByRole("button", { name: "Start adaptive practice" })).toBeInTheDocument();
    expect(screen.getByText(/adaptive mathematics practice/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/choose a starting topic/i)).toBeInTheDocument();
    expect(screen.getByText("Algebra Foundations")).toBeInTheDocument();
  });

  it("labels mastery as a model estimate, not a measurement, on the setup screen", async () => {
    vi.mocked(actions.resumeAdaptiveSessionAction).mockResolvedValue({ ok: true, data: { status: "no_session" } });
    render(<AdaptiveTutorClient />);
    await screen.findByRole("button", { name: "Start adaptive practice" });
    expect(screen.getByText(/model estimate, not a measurement/i)).toBeInTheDocument();
  });

  it("starting a session calls startAdaptiveSessionAction with the selected chapter and shows the first question", async () => {
    vi.mocked(actions.resumeAdaptiveSessionAction).mockResolvedValue({ ok: true, data: { status: "no_session" } });
    vi.mocked(actions.startAdaptiveSessionAction).mockResolvedValue({ ok: true, data: activeState() });

    render(<AdaptiveTutorClient />);
    await userEvent.selectOptions(await screen.findByLabelText(/choose a starting topic/i), "CH01");
    await userEvent.click(screen.getByRole("button", { name: "Start adaptive practice" }));

    expect(actions.startAdaptiveSessionAction).toHaveBeenCalledWith("CH01");
    expect(await screen.findByText("Question 1 of 20")).toBeInTheDocument();
    expect(screen.getByText(/starting with a question/i)).toBeInTheDocument();
  });
});

describe("AdaptiveTutorClient — question interaction", () => {
  it("disables Submit until an option is selected, then enables it", async () => {
    vi.mocked(actions.resumeAdaptiveSessionAction).mockResolvedValue({ ok: true, data: activeState() });
    render(<AdaptiveTutorClient />);
    const submitButton = await screen.findByRole("button", { name: "Submit" });
    expect(submitButton).toBeDisabled();
    await userEvent.click(screen.getByLabelText("x = 1"));
    expect(submitButton).not.toBeDisabled();
  });

  it("submitting calls submitAdaptiveAnswerAction with the selected option and shows feedback", async () => {
    vi.mocked(actions.resumeAdaptiveSessionAction).mockResolvedValue({ ok: true, data: activeState() });
    vi.mocked(actions.submitAdaptiveAnswerAction).mockResolvedValue({
      ok: true,
      data: activeState({
        answered: true,
        feedback: { isCorrect: true, selectedOptionId: "o1", correctOptionId: "o1", correctOptionDisplay: "x = 1", explanation: "Well done.", workedSolution: "Add 1 to both sides." },
      }),
    });

    render(<AdaptiveTutorClient />);
    await userEvent.click(await screen.findByLabelText("x = 1"));
    await userEvent.click(screen.getByRole("button", { name: "Submit" }));

    expect(actions.submitAdaptiveAnswerAction).toHaveBeenCalledWith("s1", "o1");
    expect(await screen.findByText("Correct.")).toBeInTheDocument();
    expect(screen.getByText("Worked solution")).toBeInTheDocument();
  });

  it("shows a pedagogical misconception note without asserting a diagnosis, when present", async () => {
    vi.mocked(actions.resumeAdaptiveSessionAction).mockResolvedValue({
      ok: true,
      data: activeState({
        answered: true,
        feedback: {
          isCorrect: false,
          selectedOptionId: "o2",
          correctOptionId: "o1",
          correctOptionDisplay: "x = 1",
          explanation: "Not quite.",
          workedSolution: "Add 1 to both sides.",
          misconceptionNote: "This is a common point of confusion — review the worked solution carefully.",
        },
      }),
    });
    render(<AdaptiveTutorClient />);
    expect(await screen.findByText(/common point of confusion/i)).toBeInTheDocument();
  });

  it("prevents duplicate submission: the fieldset disables once answered", async () => {
    vi.mocked(actions.resumeAdaptiveSessionAction).mockResolvedValue({
      ok: true,
      data: activeState({ answered: true, feedback: { isCorrect: true, selectedOptionId: "o1", correctOptionId: "o1", correctOptionDisplay: "x = 1", explanation: "Well done.", workedSolution: "w" } }),
    });
    render(<AdaptiveTutorClient />);
    await screen.findByText("Correct.");
    const fieldset = document.querySelector("fieldset");
    expect(fieldset).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Submit" })).not.toBeInTheDocument();
  });

  it("continuing calls advanceAdaptiveSessionAction and loads the next question", async () => {
    vi.mocked(actions.resumeAdaptiveSessionAction).mockResolvedValue({
      ok: true,
      data: activeState({ answered: true, feedback: { isCorrect: true, selectedOptionId: "o1", correctOptionId: "o1", correctOptionDisplay: "x = 1", explanation: "Well done.", workedSolution: "w" } }),
    });
    vi.mocked(actions.advanceAdaptiveSessionAction).mockResolvedValue({
      ok: true,
      data: activeState({ position: 1, question: { questionId: "q2", stem: "Next question", options: [{ id: "o3", display: "a" }], selectionExplanation: "Continuing to practise this topic." } }),
    });

    render(<AdaptiveTutorClient />);
    await userEvent.click(await screen.findByRole("button", { name: "Continue" }));
    expect(actions.advanceAdaptiveSessionAction).toHaveBeenCalledWith("s1");
    expect(await screen.findByText("Question 2 of 20")).toBeInTheDocument();
    expect(screen.getByText("Next question")).toBeInTheDocument();
  });
});

describe("AdaptiveTutorClient — completion", () => {
  it("shows the summary with mastery before/after, labeled as estimates", async () => {
    vi.mocked(actions.resumeAdaptiveSessionAction).mockResolvedValue({ ok: true, data: completedState() });
    render(<AdaptiveTutorClient />);
    expect(await screen.findByText("Session complete")).toBeInTheDocument();
    expect(screen.getByText(/you answered 3 of 5/i)).toBeInTheDocument();
    expect(screen.getByText("Linear Equations")).toBeInTheDocument();
    expect(screen.getByText("50%")).toBeInTheDocument();
    expect(screen.getByText("68%")).toBeInTheDocument();
    expect(screen.getByText(/not empirically calibrated/i)).toBeInTheDocument();
  });

  it("shows concepts needing further practice when present", async () => {
    const state = completedState();
    state.summary.conceptsNeedingPractice = [state.summary.progress[0]];
    vi.mocked(actions.resumeAdaptiveSessionAction).mockResolvedValue({ ok: true, data: state });
    render(<AdaptiveTutorClient />);
    expect(await screen.findByText(/may benefit from further practice/i)).toBeInTheDocument();
  });
});

describe("AdaptiveTutorClient — error handling", () => {
  it("shows a friendly error message without exposing internal details, on a resume failure", async () => {
    vi.mocked(actions.resumeAdaptiveSessionAction).mockResolvedValue({ ok: false, error: "Something went wrong. Please try refreshing the page." });
    render(<AdaptiveTutorClient />);
    expect(await screen.findByText(/something went wrong/i)).toBeInTheDocument();
  });

  it("shows an error if submitting fails", async () => {
    vi.mocked(actions.resumeAdaptiveSessionAction).mockResolvedValue({ ok: true, data: activeState() });
    vi.mocked(actions.submitAdaptiveAnswerAction).mockResolvedValue({ ok: false, error: "No question available." });
    render(<AdaptiveTutorClient />);
    await userEvent.click(await screen.findByLabelText("x = 1"));
    await userEvent.click(screen.getByRole("button", { name: "Submit" }));
    expect(await screen.findByText("No question available.")).toBeInTheDocument();
  });
});

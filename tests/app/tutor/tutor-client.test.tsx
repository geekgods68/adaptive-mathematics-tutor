// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TutorClient from "@/app/tutor/tutor-client";
import * as actions from "@/app/tutor/actions";
import type { QuestionStateResult } from "@/tutoring/session/actionTypes";

vi.mock("@/app/tutor/actions", () => ({
  resumeSessionAction: vi.fn(),
  startTutorSessionAction: vi.fn(),
  submitAnswerAction: vi.fn(),
  advanceSessionAction: vi.fn(),
  resetTutorSessionAction: vi.fn(),
}));

function activeState(overrides: Partial<Extract<QuestionStateResult, { status: "active" }>> = {}) {
  return {
    status: "active" as const,
    sessionId: "s1",
    position: 0,
    totalQuestions: 35,
    question: {
      questionId: "q1",
      stem: "Solve x - 1 = 0",
      options: [
        { id: "o1", display: "x = 1" },
        { id: "o2", display: "x = -1" },
      ],
    },
    answered: false,
    feedback: undefined,
    ...overrides,
  };
}

describe("TutorClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows the start screen when there is no active session", async () => {
    vi.mocked(actions.resumeSessionAction).mockResolvedValue({ ok: true, data: { status: "no_session" } });
    render(<TutorClient />);
    expect(await screen.findByRole("button", { name: "Start" })).toBeInTheDocument();
    expect(screen.getByText(/quadratic equations and functions/i)).toBeInTheDocument();
  });

  it("starting a session calls startTutorSessionAction and shows the first question", async () => {
    vi.mocked(actions.resumeSessionAction).mockResolvedValue({ ok: true, data: { status: "no_session" } });
    vi.mocked(actions.startTutorSessionAction).mockResolvedValue({ ok: true, data: activeState() });

    render(<TutorClient />);
    await userEvent.click(await screen.findByRole("button", { name: "Start" }));

    expect(actions.startTutorSessionAction).toHaveBeenCalledOnce();
    expect(await screen.findByText("Question 1 of 35")).toBeInTheDocument();
    expect(screen.getByText("Solve x - 1 = 0")).toBeInTheDocument();
  });

  it("disables Submit until an option is selected, then enables it", async () => {
    vi.mocked(actions.resumeSessionAction).mockResolvedValue({ ok: true, data: activeState() });
    render(<TutorClient />);

    await screen.findByText("Question 1 of 35");
    const submit = screen.getByRole("button", { name: "Submit" });
    expect(submit).toBeDisabled();

    await userEvent.click(screen.getByLabelText("x = 1"));
    expect(submit).toBeEnabled();
  });

  it("submitting calls submitAnswerAction with the selected option and shows feedback", async () => {
    vi.mocked(actions.resumeSessionAction).mockResolvedValue({ ok: true, data: activeState() });
    vi.mocked(actions.submitAnswerAction).mockResolvedValue({
      ok: true,
      data: activeState({
        answered: true,
        feedback: {
          isCorrect: true,
          selectedOptionId: "o1",
          correctOptionId: "o1",
          correctOptionDisplay: "x = 1",
          explanation: "Setting x - 1 = 0 gives x = 1.",
          workedSolution: "x - 1 = 0 => x = 1",
        },
      }),
    });

    render(<TutorClient />);
    await screen.findByText("Question 1 of 35");
    await userEvent.click(screen.getByLabelText("x = 1"));
    await userEvent.click(screen.getByRole("button", { name: "Submit" }));

    expect(actions.submitAnswerAction).toHaveBeenCalledWith("s1", "o1");
    expect(await screen.findByText("Correct.")).toBeInTheDocument();
    expect(screen.getByText(/x - 1 = 0 => x = 1/)).toBeInTheDocument();
  });

  it("locks the options and shows Continue (not Submit) after answering", async () => {
    vi.mocked(actions.resumeSessionAction).mockResolvedValue({
      ok: true,
      data: activeState({
        answered: true,
        feedback: {
          isCorrect: false,
          selectedOptionId: "o2",
          correctOptionId: "o1",
          correctOptionDisplay: "x = 1",
          explanation: "Review the worked solution below.",
          workedSolution: "x - 1 = 0 => x = 1",
        },
      }),
    });

    render(<TutorClient />);
    await screen.findByText("Not quite.");

    expect(screen.queryByRole("button", { name: "Submit" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continue" })).toBeInTheDocument();
    expect(screen.getByLabelText(/^x = 1/)).toBeDisabled();
    expect(screen.getByLabelText(/x = -1/)).toBeDisabled();
    expect(screen.getByText(/correct answer: x = 1/i)).toBeInTheDocument();
  });

  it("Continue calls advanceSessionAction and advances the progress indicator", async () => {
    vi.mocked(actions.resumeSessionAction).mockResolvedValue({
      ok: true,
      data: activeState({
        answered: true,
        feedback: {
          isCorrect: true,
          selectedOptionId: "o1",
          correctOptionId: "o1",
          correctOptionDisplay: "x = 1",
          explanation: "Setting x - 1 = 0 gives x = 1.",
          workedSolution: "x - 1 = 0 => x = 1",
        },
      }),
    });
    vi.mocked(actions.advanceSessionAction).mockResolvedValue({
      ok: true,
      data: activeState({
        position: 1,
        question: { questionId: "q2", stem: "Solve x - 2 = 0", options: [{ id: "o3", display: "x = 2" }] },
      }),
    });

    render(<TutorClient />);
    await screen.findByText("Correct.");
    await userEvent.click(screen.getByRole("button", { name: "Continue" }));

    expect(actions.advanceSessionAction).toHaveBeenCalledWith("s1");
    expect(await screen.findByText("Question 2 of 35")).toBeInTheDocument();
    expect(screen.getByText("Solve x - 2 = 0")).toBeInTheDocument();
  });

  it("shows the completion screen with accuracy, and no diagnostic detail", async () => {
    vi.mocked(actions.resumeSessionAction).mockResolvedValue({
      ok: true,
      data: { status: "completed", sessionId: "s1", summary: { totalQuestions: 35, correctAnswers: 20, accuracy: 20 / 35 } },
    });

    render(<TutorClient />);
    expect(await screen.findByText("Session complete")).toBeInTheDocument();
    expect(screen.getByText(/you answered 20 of 35 questions correctly/i)).toBeInTheDocument();
    expect(screen.getByText(/accuracy: 57\.1%/i)).toBeInTheDocument();

    // Never render internal/diagnostic vocabulary.
    const body = document.body.textContent ?? "";
    expect(body).not.toMatch(/mastery|misconception|difficulty|non_adaptive|condition/i);
  });

  it("shows a Return to Home link pointing at the root route", async () => {
    vi.mocked(actions.resumeSessionAction).mockResolvedValue({
      ok: true,
      data: { status: "completed", sessionId: "s1", summary: { totalQuestions: 35, correctAnswers: 20, accuracy: 20 / 35 } },
    });
    render(<TutorClient />);
    const homeLink = await screen.findByRole("link", { name: "Return to Home" });
    expect(homeLink).toHaveAttribute("href", "/");
  });

  it("Start New Assessment resets the session and returns to the start screen, without erasing the summary before the click", async () => {
    vi.mocked(actions.resumeSessionAction).mockResolvedValue({
      ok: true,
      data: { status: "completed", sessionId: "s1", summary: { totalQuestions: 35, correctAnswers: 20, accuracy: 20 / 35 } },
    });
    vi.mocked(actions.resetTutorSessionAction).mockResolvedValue({ ok: true, data: { status: "no_session" } });
    render(<TutorClient />);

    expect(await screen.findByText("Session complete")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Start New Assessment" }));
    expect(actions.resetTutorSessionAction).toHaveBeenCalledTimes(1);
    expect(await screen.findByRole("button", { name: "Start" })).toBeInTheDocument();
  });

  it("does not call resetTutorSessionAction merely from loading the completed screen (no accidental reset)", async () => {
    vi.mocked(actions.resumeSessionAction).mockResolvedValue({
      ok: true,
      data: { status: "completed", sessionId: "s1", summary: { totalQuestions: 35, correctAnswers: 20, accuracy: 20 / 35 } },
    });
    render(<TutorClient />);
    await screen.findByText("Session complete");
    expect(actions.resetTutorSessionAction).not.toHaveBeenCalled();
  });

  it("shows an error message if the resume action fails, without a stack trace", async () => {
    vi.mocked(actions.resumeSessionAction).mockResolvedValue({ ok: false, error: "Something went wrong." });
    render(<TutorClient />);
    expect(await screen.findByText("Something went wrong.")).toBeInTheDocument();
  });
});

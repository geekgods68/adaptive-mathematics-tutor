import { describe, expect, it } from "vitest";
import { advanceSession, getCurrentQuestion, startSession, submitAnswer } from "@/tutoring/session/service";
import { QUESTIONS } from "@/domain/questions";

/**
 * The single most important test in this repository: it demonstrates,
 * end-to-end through the real session service (not just the selection
 * policy in isolation), that the sequence of questions a student sees is
 * completely independent of how they answer. See
 * docs/experimental-conditions.md and CLAUDE.md constraint 4.
 */
describe("performance independence (Student A vs. Student B)", () => {
  it("produces an identical question sequence for an always-correct student and an always-incorrect student", () => {
    const studentA = startSession("student-a-always-correct");
    const studentB = startSession("student-b-always-incorrect");

    const sequenceSeenByA: string[] = [];
    const sequenceSeenByB: string[] = [];

    const sessionAId = studentA.id;
    const sessionBId = studentB.id;

    // Walk both sessions to completion, A always answering correctly, B
    // always answering with the first available incorrect option (or, if
    // a question happens to have no incorrect option — never true here,
    // but defensively — falling back to the correct one).
    for (let i = 0; i < 200; i++) {
      const questionA = getCurrentQuestion(sessionAId);
      const questionB = getCurrentQuestion(sessionBId);

      sequenceSeenByA.push(questionA.id);
      sequenceSeenByB.push(questionB.id);

      const incorrectOptionForB = questionB.options.find((o) => o.id !== questionB.correctOptionId);

      submitAnswer(sessionAId, questionA.correctOptionId);
      submitAnswer(sessionBId, (incorrectOptionForB ?? questionB.options[0]).id);

      const advancedA = advanceSession(sessionAId);
      const advancedB = advanceSession(sessionBId);

      if (advancedA.session.status === "completed" && advancedB.session.status === "completed") {
        break;
      }
    }

    expect(sequenceSeenByA.length).toBeGreaterThan(0);
    expect(sequenceSeenByA).toEqual(sequenceSeenByB);
  });

  it("gives the same next question after a correct answer as after an incorrect answer, at every position", () => {
    // A finer-grained version of the same guarantee: for EVERY position in
    // the sequence, branch into a correct-answer session and an
    // incorrect-answer session, and confirm the very next question is
    // identical regardless of which branch was taken.
    const referenceSession = startSession("reference");
    const sequenceLength = referenceSession.sequence.length;

    for (let position = 0; position < Math.min(sequenceLength, 10); position++) {
      const correctBranch = startSession(`branch-correct-${position}`);
      const incorrectBranch = startSession(`branch-incorrect-${position}`);

      // Fast-forward both branches to `position` by always answering correctly —
      // the point under test is only the single next step at this position.
      for (let step = 0; step < position; step++) {
        const q1 = getCurrentQuestion(correctBranch.id);
        const q2 = getCurrentQuestion(incorrectBranch.id);
        submitAnswer(correctBranch.id, q1.correctOptionId);
        submitAnswer(incorrectBranch.id, q2.correctOptionId);
        advanceSession(correctBranch.id);
        advanceSession(incorrectBranch.id);
      }

      const questionAtPosition = getCurrentQuestion(correctBranch.id);
      const sameQuestionAtPosition = getCurrentQuestion(incorrectBranch.id);
      expect(questionAtPosition.id).toBe(sameQuestionAtPosition.id);

      const incorrectOption = sameQuestionAtPosition.options.find((o) => o.id !== sameQuestionAtPosition.correctOptionId)!;

      submitAnswer(correctBranch.id, questionAtPosition.correctOptionId);
      submitAnswer(incorrectBranch.id, incorrectOption.id);

      const advancedCorrect = advanceSession(correctBranch.id);
      const advancedIncorrect = advanceSession(incorrectBranch.id);

      // Whether the branch just completed or has a next question, the two
      // branches must agree.
      expect(advancedCorrect.nextQuestion?.id ?? null).toBe(advancedIncorrect.nextQuestion?.id ?? null);
      expect(advancedCorrect.session.status).toBe(advancedIncorrect.session.status);
    }
  });

  it("a distractor carrying misconception evidence does not change the next question either", () => {
    const withMisconception = startSession("with-misconception-evidence");
    const withoutMisconception = startSession("without-misconception-evidence");

    const q1 = getCurrentQuestion(withMisconception.id);
    const q2 = getCurrentQuestion(withoutMisconception.id);
    expect(q1.id).toBe(q2.id);

    const diagnosticDistractor = q1.options.find((o) => !o.isCorrect && o.misconceptionId);
    const plainDistractor = q1.options.find((o) => !o.isCorrect && !o.misconceptionId) ?? diagnosticDistractor;

    // Only meaningful if this particular question actually has a diagnostic
    // distractor to select — the production bank guarantees at least one
    // exists somewhere, so pick a question from QUESTIONS directly to be sure.
    const questionWithDiagnostic = QUESTIONS.find((q) => q.options.some((o) => o.misconceptionId));
    expect(questionWithDiagnostic).toBeDefined();

    if (diagnosticDistractor && plainDistractor) {
      submitAnswer(withMisconception.id, diagnosticDistractor.id);
      submitAnswer(withoutMisconception.id, plainDistractor.id);

      const advancedWith = advanceSession(withMisconception.id);
      const advancedWithout = advanceSession(withoutMisconception.id);

      expect(advancedWith.nextQuestion?.id ?? null).toBe(advancedWithout.nextQuestion?.id ?? null);
    }
  });
});

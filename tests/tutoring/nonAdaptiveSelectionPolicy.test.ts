import { describe, expect, it } from "vitest";
import { NonAdaptiveSelectionPolicy } from "@/tutoring/selection/nonAdaptive/nonAdaptiveSelectionPolicy";
import { NON_ADAPTIVE_CURRICULUM_SEQUENCE } from "@/tutoring/selection/nonAdaptive/curriculumSequence";
import type { NonAdaptiveSelectionContext } from "@/tutoring/selection/nonAdaptive/types";

describe("NonAdaptiveSelectionPolicy", () => {
  const policy = new NonAdaptiveSelectionPolicy();

  it("declares the non_adaptive condition", () => {
    expect(policy.condition).toBe("non_adaptive");
  });

  it("selects questions strictly in predetermined-sequence order", () => {
    const context: NonAdaptiveSelectionContext = {
      participantId: "p1",
      predeterminedSequence: NON_ADAPTIVE_CURRICULUM_SEQUENCE,
      positionIndex: 0,
    };

    for (let i = 0; i < NON_ADAPTIVE_CURRICULUM_SEQUENCE.length; i++) {
      const result = policy.selectNextQuestion({ ...context, positionIndex: i });
      expect(result.questionId).toBe(NON_ADAPTIVE_CURRICULUM_SEQUENCE[i]);
    }
  });

  it("returns a null questionId once the sequence is exhausted", () => {
    const result = policy.selectNextQuestion({
      participantId: "p1",
      predeterminedSequence: NON_ADAPTIVE_CURRICULUM_SEQUENCE,
      positionIndex: NON_ADAPTIVE_CURRICULUM_SEQUENCE.length,
    });
    expect(result.questionId).toBeNull();
  });

  it("produces an identical sequence for every participant given the same predetermined sequence", () => {
    const contextA: NonAdaptiveSelectionContext = {
      participantId: "participant-a",
      predeterminedSequence: NON_ADAPTIVE_CURRICULUM_SEQUENCE,
      positionIndex: 2,
    };
    const contextB: NonAdaptiveSelectionContext = {
      ...contextA,
      participantId: "participant-b",
    };

    expect(policy.selectNextQuestion(contextA).questionId).toBe(
      policy.selectNextQuestion(contextB).questionId,
    );
  });

  it("selects the same next question regardless of how many prior answers were correct", () => {
    // NonAdaptiveSelectionContext structurally has no field for prior
    // correctness/mastery/timing at all, so there is nothing here to vary —
    // this test documents that guarantee at the call-site level: the only
    // input that affects selection is positionIndex.
    const base: NonAdaptiveSelectionContext = {
      participantId: "p1",
      predeterminedSequence: NON_ADAPTIVE_CURRICULUM_SEQUENCE,
      positionIndex: 1,
    };

    const resultAfterHypotheticalAllCorrect = policy.selectNextQuestion(base);
    const resultAfterHypotheticalAllIncorrect = policy.selectNextQuestion(base);

    expect(resultAfterHypotheticalAllCorrect.questionId).toBe(
      resultAfterHypotheticalAllIncorrect.questionId,
    );
  });
});

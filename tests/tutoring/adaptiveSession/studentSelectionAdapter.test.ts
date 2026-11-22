import { describe, expect, it, vi } from "vitest";
import { createCrossSessionAwareSelectionAdapter } from "@/tutoring/adaptiveSession/studentSelectionAdapter";
import type { Question } from "@/domain/questions/types";
import type { SelectionAdapter, SelectionAdapterInput } from "@/research/experiment/types";

function fakeQuestion(id: string): Question {
  return { id } as unknown as Question;
}

function baseInput(availableQuestions: Question[]): SelectionAdapterInput {
  return {
    learnerId: "learner-1",
    sessionId: "session-1",
    sequenceIndex: 0,
    availableQuestions,
    concepts: [],
    curriculumOrder: [],
    conceptMasteryStates: {},
    misconceptionTallies: {},
    presentedQuestionIds: [],
  };
}

/** A fake base adapter that always picks the first question in whatever pool it's given (null if empty) — lets these tests assert exactly which pool the wrapper passed through. */
function fakeBaseAdapter(): SelectionAdapter {
  return {
    policyType: "adaptive",
    version: "fake-1",
    parameters: {},
    selectNext: vi.fn((input: SelectionAdapterInput) => ({
      result: { questionId: input.availableQuestions[0]?.id ?? null, rationale: undefined },
    })),
  };
}

describe("createCrossSessionAwareSelectionAdapter", () => {
  it("passes through policyType/version/parameters from the base adapter unchanged", () => {
    const base = fakeBaseAdapter();
    const wrapped = createCrossSessionAwareSelectionAdapter(base, [fakeQuestion("q1")], []);
    expect(wrapped.policyType).toBe(base.policyType);
    expect(wrapped.version).toBe(base.version);
    expect(wrapped.parameters).toBe(base.parameters);
  });

  it("with no seen-question history, behaves identically to the base adapter (full bank, unchanged)", () => {
    const base = fakeBaseAdapter();
    const bank = [fakeQuestion("q1"), fakeQuestion("q2")];
    const wrapped = createCrossSessionAwareSelectionAdapter(base, bank, []);
    const result = wrapped.selectNext(baseInput(bank));
    expect(result.result.questionId).toBe("q1");
  });

  it("tier 1: excludes every seen question id from the candidate pool when an unseen candidate exists", () => {
    const base = fakeBaseAdapter();
    const bank = [fakeQuestion("q1"), fakeQuestion("q2"), fakeQuestion("q3")];
    const wrapped = createCrossSessionAwareSelectionAdapter(base, bank, ["q1", "q2"]);
    const result = wrapped.selectNext(baseInput(bank));
    expect(result.result.questionId).toBe("q3");
  });

  it("tier 2: when every candidate the base adapter could pick from an unseen pool is unavailable, allows reuse starting from the LEAST recently seen question", () => {
    // Base adapter only ever succeeds when "q1" specifically is in its candidate pool (simulating a
    // concept/difficulty constraint that only q1 satisfies) -- q1 is the OLDEST seen id, so tier 2
    // must expand the allowed-reuse set to include it before any other previously-seen id.
    const picksOnlyQ1: SelectionAdapter = {
      policyType: "adaptive",
      version: "fake-2",
      parameters: {},
      selectNext: vi.fn((input: SelectionAdapterInput) => ({
        result: { questionId: input.availableQuestions.some((q) => q.id === "q1") ? "q1" : null },
      })),
    };
    const bank = [fakeQuestion("q1"), fakeQuestion("q2"), fakeQuestion("q3")];
    // Every bank question has been seen -- oldest first: q1, q2, q3.
    const wrapped = createCrossSessionAwareSelectionAdapter(picksOnlyQ1, bank, ["q1", "q2", "q3"]);
    const result = wrapped.selectNext(baseInput(bank));
    expect(result.result.questionId).toBe("q1");
  });

  it("falls back to the complete, unmodified bank if no tier succeeds, deferring entirely to the base adapter's own terminal behavior", () => {
    const alwaysNull: SelectionAdapter = {
      policyType: "adaptive",
      version: "fake-3",
      parameters: {},
      selectNext: vi.fn(() => ({ result: { questionId: null } })),
    };
    const bank = [fakeQuestion("q1")];
    const wrapped = createCrossSessionAwareSelectionAdapter(alwaysNull, bank, ["q1"]);
    const result = wrapped.selectNext(baseInput(bank));
    expect(result.result.questionId).toBeNull();
    // Last call must have been given the full, unrestricted bank.
    const calls = vi.mocked(alwaysNull.selectNext).mock.calls;
    const lastCallPool = calls.at(-1)![0].availableQuestions;
    expect(lastCallPool.map((q) => q.id)).toEqual(["q1"]);
  });

  it("is deterministic: identical inputs and identical seen-history always select the same question", () => {
    const base = fakeBaseAdapter();
    const bank = [fakeQuestion("q1"), fakeQuestion("q2")];
    const wrappedA = createCrossSessionAwareSelectionAdapter(base, bank, ["q1"]);
    const wrappedB = createCrossSessionAwareSelectionAdapter(base, bank, ["q1"]);
    expect(wrappedA.selectNext(baseInput(bank)).result.questionId).toBe(wrappedB.selectNext(baseInput(bank)).result.questionId);
  });
});

import { describe, expect, it } from "vitest";
import { seededShuffle } from "@/tutoring/session/optionOrder";
import { toPublicQuestionView } from "@/tutoring/session/publicViews";
import { QUESTIONS } from "@/domain/questions";

describe("seededShuffle", () => {
  it("is a permutation of the input (same elements, same length)", () => {
    const items = ["a", "b", "c", "d", "e"];
    const shuffled = seededShuffle(items, "seed-1");
    expect(shuffled).toHaveLength(items.length);
    expect([...shuffled].sort()).toEqual([...items].sort());
  });

  it("produces the identical order every time for the same seed", () => {
    const items = ["a", "b", "c", "d"];
    const first = seededShuffle(items, "q-fixture-42");
    const second = seededShuffle(items, "q-fixture-42");
    expect(first).toEqual(second);
  });

  it("produces different orders for different seeds (not a no-op)", () => {
    const items = ["a", "b", "c", "d", "e", "f"];
    const orders = new Set(
      ["seed-a", "seed-b", "seed-c", "seed-d", "seed-e"].map((seed) => seededShuffle(items, seed).join(",")),
    );
    // Not every seed must differ, but they should not all collapse to one order.
    expect(orders.size).toBeGreaterThan(1);
  });

  it("does not mutate the input array", () => {
    const items = ["a", "b", "c"];
    const copy = [...items];
    seededShuffle(items, "seed");
    expect(items).toEqual(copy);
  });
});

describe("toPublicQuestionView option order (regression: no positional bias)", () => {
  it("does NOT always place the correct option first across the bank", () => {
    // This is a direct regression test for a real bug found during Phase 3
    // end-to-end testing: every bank question was authored with its
    // correct option first, which (left unshuffled) made "always pick the
    // first radio button" a 100%-accuracy strategy. See
    // src/tutoring/session/optionOrder.ts for the fix.
    const firstPositionIsCorrectCount = QUESTIONS.filter((q) => {
      const view = toPublicQuestionView(q);
      return view.options[0].id === q.correctOptionId;
    }).length;

    // With a real shuffle, the correct answer should land in the first
    // position roughly 1/(option count) of the time, not for every question.
    expect(firstPositionIsCorrectCount).toBeLessThan(QUESTIONS.length * 0.6);
  });

  it("still contains exactly the same set of option ids as the source question, just reordered", () => {
    for (const question of QUESTIONS.slice(0, 20)) {
      const view = toPublicQuestionView(question);
      expect(new Set(view.options.map((o) => o.id))).toEqual(new Set(question.options.map((o) => o.id)));
    }
  });

  it("produces a stable order across repeated calls for the same question (reproducible, not re-randomized per render)", () => {
    const question = QUESTIONS[0];
    const first = toPublicQuestionView(question).options.map((o) => o.id);
    const second = toPublicQuestionView(question).options.map((o) => o.id);
    expect(first).toEqual(second);
  });

  it("never exposes isCorrect, misconceptionId, or derivationNote on the public view", () => {
    const view = toPublicQuestionView(QUESTIONS[0]);
    for (const option of view.options) {
      expect(Object.keys(option).sort()).toEqual(["display", "id"]);
    }
  });
});

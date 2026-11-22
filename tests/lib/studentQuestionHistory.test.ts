// @vitest-environment jsdom
import { describe, expect, it, beforeEach } from "vitest";
import { clearSeenQuestionIds, readSeenQuestionIds, recordSeenQuestionIds } from "@/lib/studentQuestionHistory";

beforeEach(() => {
  localStorage.clear();
});

describe("studentQuestionHistory — cross-session seen-question tracking", () => {
  it("returns an empty list when nothing has ever been recorded", () => {
    expect(readSeenQuestionIds()).toEqual([]);
  });

  it("records ids in encounter order", () => {
    recordSeenQuestionIds(["q1"]);
    recordSeenQuestionIds(["q2"]);
    recordSeenQuestionIds(["q3"]);
    expect(readSeenQuestionIds()).toEqual(["q1", "q2", "q3"]);
  });

  it("de-duplicates: re-recording an already-seen id keeps its original (oldest) position", () => {
    recordSeenQuestionIds(["q1", "q2"]);
    recordSeenQuestionIds(["q1", "q3"]);
    expect(readSeenQuestionIds()).toEqual(["q1", "q2", "q3"]);
  });

  it("corrupted JSON in storage reads back as empty rather than throwing", () => {
    localStorage.setItem("rise-student-question-history-v1", "{not valid json");
    expect(() => readSeenQuestionIds()).not.toThrow();
    expect(readSeenQuestionIds()).toEqual([]);
  });

  it("clearSeenQuestionIds removes the stored history entirely", () => {
    recordSeenQuestionIds(["q1"]);
    clearSeenQuestionIds();
    expect(readSeenQuestionIds()).toEqual([]);
  });
});

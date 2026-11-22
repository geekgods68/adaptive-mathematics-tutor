// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import MathText from "@/components/MathText";
import { RISE_QUESTIONS } from "@/domain/rise";

/**
 * Stage 3 Priority 4/Part 9 — MathText.test.tsx already covers the
 * rendering MECHANICS (delimiters, malformed input, multiple segments)
 * with hand-crafted fixtures. This file instead renders REAL stems and
 * option text from every one of the 14 RISE chapters (question ids are
 * `MATH-CH<nn>-####`, so the chapter is read directly off the id, not
 * guessed), including each chapter's single LONGEST stem as a proxy for
 * "the most complex expression actually in the bank" for that chapter —
 * confirming no chapter's real content trips a KaTeX rendering error.
 */
function chapterOf(questionId: string): string {
  const match = questionId.match(/^MATH-(CH\d+)-/);
  if (!match) throw new Error(`Question id "${questionId}" doesn't match the expected MATH-CH##-#### pattern.`);
  return match[1];
}

const chapters = [...new Set(RISE_QUESTIONS.map((q) => chapterOf(q.id)))].sort();

describe("MathText — real RISE question content across all 14 chapters", () => {
  it("the bank actually spans all 14 chapters (sanity check for this test's own coverage claim)", () => {
    expect(chapters).toHaveLength(14);
  });

  it.each(chapters)("chapter %s's longest (most complex) real stem renders without a KaTeX error", (chapterId) => {
    const inChapter = RISE_QUESTIONS.filter((q) => chapterOf(q.id) === chapterId);
    const longest = inChapter.reduce((a, b) => (b.stem.length > a.stem.length ? b : a));

    const { container } = render(<MathText text={longest.stem} />);
    expect(container.querySelector(".katex-error")).toBeNull();
    expect(container.textContent).not.toBe("");
  });

  it.each(chapters)("chapter %s's longest real stem's answer OPTIONS also render without a KaTeX error", (chapterId) => {
    const inChapter = RISE_QUESTIONS.filter((q) => chapterOf(q.id) === chapterId);
    const longest = inChapter.reduce((a, b) => (b.stem.length > a.stem.length ? b : a));

    for (const option of longest.options) {
      const { container } = render(<MathText text={option.display} />);
      expect(container.querySelector(".katex-error")).toBeNull();
    }
  });

  it("a large random sample across the full bank (not just the longest-per-chapter) never trips a KaTeX error", () => {
    // Deterministic "random" sample via a fixed stride, so this test is reproducible rather than
    // flaky — every 37th question, covering a cross-section of all chapters and difficulty levels.
    const sample = RISE_QUESTIONS.filter((_, i) => i % 37 === 0);
    expect(sample.length).toBeGreaterThan(20);
    for (const question of sample) {
      const { container } = render(<MathText text={question.stem} />);
      expect(container.querySelector(".katex-error")).toBeNull();
    }
  });
});

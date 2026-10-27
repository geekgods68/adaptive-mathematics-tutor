// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import MathText from "@/components/MathText";

// NOTE: every `text` value below is passed via a JS expression container
// (`text={"..."}`), never a bare JSX attribute literal (`text="..."`).
// JSX attribute literals do NOT apply JavaScript's backslash-escape
// processing the way a real JS string literal does, so a bare
// `text="\\(x\\)"` attribute would actually pass the four-character
// sequence `\\(` rather than the two-character `\(` real question stems
// use — a mismatch that has nothing to do with MathText itself. Real
// usage (`<MathText text={data.question.stem} />` in
// adaptive-tutor-client.tsx) already passes a runtime string via an
// expression container, so it was never affected.

describe("MathText", () => {
  it("renders plain text with no delimiters as-is", () => {
    const { container } = render(<MathText text={"Solve for x."} />);
    expect(container.textContent).toBe("Solve for x.");
  });

  it("renders inline math delimited by \\( ... \\) via KaTeX", () => {
    const { container } = render(<MathText text={"Evaluate \\(x^2+1\\)."} />);
    expect(container.querySelector(".katex")).not.toBeNull();
    expect(container.querySelector(".katex-error")).toBeNull();
  });

  it("renders display-mode math delimited by \\[ ... \\]", () => {
    const { container } = render(<MathText text={"\\[x = \\frac{-b}{2a}\\]"} />);
    expect(container.querySelector(".katex-display")).not.toBeNull();
    expect(container.querySelector(".katex-error")).toBeNull();
  });

  it("renders multiple math segments within one string correctly", () => {
    const { container } = render(<MathText text={"Let \\(f(x)=2x\\) and \\(g(x)=x^2\\)."} />);
    expect(container.querySelectorAll(".katex").length).toBe(2);
  });

  it("does not crash on malformed LaTeX — renders KaTeX's own inline error rather than throwing", () => {
    expect(() => render(<MathText text={"Broken: \\(\\frac{1}{\\)"} />)).not.toThrow();
  });

  it("preserves plain text segments between math segments", () => {
    const { container } = render(<MathText text={"Before \\(x\\) after"} />);
    expect(container.textContent).toContain("Before");
    expect(container.textContent).toContain("after");
    expect(container.querySelector(".katex")).not.toBeNull();
  });

  it("matches the exact delimiter format used by the real RISE question bank", () => {
    const { container } = render(<MathText text={"Evaluate \\(-3^2+2(5-1)\\)."} />);
    expect(container.querySelector(".katex")).not.toBeNull();
    expect(container.querySelector(".katex-error")).toBeNull();
  });
});

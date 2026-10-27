"use client";

import katex from "katex";
import "katex/dist/katex.min.css";

/**
 * Renders text containing LaTeX math delimited `\( ... \)` (inline) and
 * `\[ ... \]` (display) — the delimiter convention the RISE question
 * bank's stems/options actually use (verified directly against the
 * data, not assumed). Plain text segments between delimiters are
 * rendered as-is, preserving whitespace/newlines.
 *
 * `katex.renderToString` is called with `throwOnError: false`, so a
 * malformed LaTeX fragment renders KaTeX's own inline error text
 * instead of crashing the page (requirement 11: "mathematical rendering
 * failures" must be handled, not propagate as an unhandled error).
 */

const MATH_SEGMENT_PATTERN = /\\\[([\s\S]+?)\\\]|\\\(([\s\S]+?)\\\)/g;

interface Segment {
  kind: "text" | "math";
  content: string;
  displayMode: boolean;
}

function splitIntoSegments(text: string): Segment[] {
  const segments: Segment[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  MATH_SEGMENT_PATTERN.lastIndex = 0;
  while ((match = MATH_SEGMENT_PATTERN.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ kind: "text", content: text.slice(lastIndex, match.index), displayMode: false });
    }
    const displayMode = match[1] !== undefined;
    segments.push({ kind: "math", content: (displayMode ? match[1] : match[2]) ?? "", displayMode });
    lastIndex = MATH_SEGMENT_PATTERN.lastIndex;
  }
  if (lastIndex < text.length) {
    segments.push({ kind: "text", content: text.slice(lastIndex), displayMode: false });
  }
  return segments;
}

function renderMath(latex: string, displayMode: boolean): string {
  try {
    return katex.renderToString(latex, { throwOnError: false, displayMode, output: "html" });
  } catch {
    // katex.renderToString with throwOnError:false already avoids
    // throwing for ordinary parse errors; this catch is a last-resort
    // guard against an unexpected internal KaTeX exception, so a single
    // malformed question never takes down the whole page.
    return `<span class="text-red-600">[math rendering error]</span>`;
  }
}

export default function MathText({ text, className }: { text: string; className?: string }) {
  const segments = splitIntoSegments(text);
  return (
    <span className={className}>
      {segments.map((segment, i) =>
        segment.kind === "text" ? (
          <span key={i} className="whitespace-pre-wrap">
            {segment.content}
          </span>
        ) : segment.displayMode ? (
          <span key={i} className="my-1 block" dangerouslySetInnerHTML={{ __html: renderMath(segment.content, true) }} />
        ) : (
          <span key={i} dangerouslySetInnerHTML={{ __html: renderMath(segment.content, false) }} />
        ),
      )}
    </span>
  );
}

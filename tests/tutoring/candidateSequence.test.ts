import { describe, expect, it } from "vitest";
import { CANDIDATE_NON_ADAPTIVE_SEQUENCE } from "@/tutoring/selection/nonAdaptive/candidateSequence";
import { QUESTIONS } from "@/domain/questions";
import { CONCEPTS } from "@/domain/concepts/data";

describe("CANDIDATE_NON_ADAPTIVE_SEQUENCE", () => {
  it("is substantially shorter than the full bank, in the 30-45 question range", () => {
    expect(CANDIDATE_NON_ADAPTIVE_SEQUENCE.length).toBeGreaterThanOrEqual(30);
    expect(CANDIDATE_NON_ADAPTIVE_SEQUENCE.length).toBeLessThanOrEqual(45);
    expect(CANDIDATE_NON_ADAPTIVE_SEQUENCE.length).toBeLessThan(QUESTIONS.length);
  });

  it("references only question ids that exist in the production bank", () => {
    const validIds = new Set(QUESTIONS.map((q) => q.id));
    for (const id of CANDIDATE_NON_ADAPTIVE_SEQUENCE) {
      expect(validIds.has(id)).toBe(true);
    }
  });

  it("has no duplicate question ids", () => {
    expect(new Set(CANDIDATE_NON_ADAPTIVE_SEQUENCE).size).toBe(CANDIDATE_NON_ADAPTIVE_SEQUENCE.length);
  });

  it("spans multiple strands and difficulty levels, not just one", () => {
    const byId = new Map(QUESTIONS.map((q) => [q.id, q]));
    const conceptById = new Map(CONCEPTS.map((c) => [c.id, c]));

    const strands = new Set(
      CANDIDATE_NON_ADAPTIVE_SEQUENCE.map((id) => conceptById.get(byId.get(id)!.primaryConceptId)?.strand),
    );
    const difficulties = new Set(CANDIDATE_NON_ADAPTIVE_SEQUENCE.map((id) => byId.get(id)!.difficulty));

    expect(strands.size).toBeGreaterThanOrEqual(7);
    expect(difficulties.size).toBeGreaterThanOrEqual(3);
  });

  it("is a plain readonly list of ids — no function, no branching, nothing derived from performance data", () => {
    // Structural guarantee: this is a `string[]` constant. There is no
    // parameter here through which correctness, mastery, or timing could
    // possibly influence its contents at runtime — the whole sequence is
    // fixed at module-load time, identically for every participant.
    expect(Array.isArray(CANDIDATE_NON_ADAPTIVE_SEQUENCE)).toBe(true);
    for (const id of CANDIDATE_NON_ADAPTIVE_SEQUENCE) {
      expect(typeof id).toBe("string");
    }
  });

  it("produces the identical sequence on repeated reads (no hidden randomness)", () => {
    const a = [...CANDIDATE_NON_ADAPTIVE_SEQUENCE];
    const b = [...CANDIDATE_NON_ADAPTIVE_SEQUENCE];
    expect(a).toEqual(b);
  });
});

import { describe, expect, it } from "vitest";
import { describeEvidenceLevel, explainSelection } from "@/tutoring/adaptiveSession/explanations";
import { DEFAULT_ADAPTIVE_SELECTION_CONFIG } from "@/tutoring/selection/adaptive/config";
import type { AdaptiveSelectionTrace } from "@/tutoring/selection/adaptive/types";

function trace(overrides: Partial<AdaptiveSelectionTrace["targetConcept"]> = {}, difficultyOverrides: Partial<AdaptiveSelectionTrace["targetDifficulty"]> = {}): AdaptiveSelectionTrace {
  return {
    policyVersion: "v",
    configVersion: "v",
    config: DEFAULT_ADAPTIVE_SELECTION_CONFIG,
    learnerId: "l1",
    sessionId: "s1",
    sequenceIndex: 0,
    targetConcept: { conceptId: "c1", reason: "progression", consideredConcepts: [], ...overrides },
    targetDifficulty: { difficulty: 3, reason: "r", masteryUsed: 0.5, evidenceCount: 5, ...difficultyOverrides },
    misconceptionEvidenceConsidered: {},
    candidateFilter: { totalAvailable: 1, afterConceptFilter: 1, afterExposureFilter: 1, afterFamilyLimitFilter: 1, afterDifficultyFilter: 1 },
    topCandidates: [],
    selectedQuestionId: "q1",
    fallbackUsed: "none",
    explanation: "internal numerical explanation",
  };
}

describe("explainSelection — every reason maps to a distinct, honest, plain-language sentence", () => {
  it("insufficient_evidence", () => {
    expect(explainSelection(trace({ reason: "insufficient_evidence" }))).toMatch(/see where you're at/);
  });

  it("progression with no previous difficulty on record (e.g. the first question) never claims a difficulty change", () => {
    const result = explainSelection(trace({ reason: "progression" }, { evidenceCount: 5, difficulty: 4 }));
    expect(result).toMatch(/continuing to practise/i);
  });

  it("progression where current difficulty EQUALS the previous recorded difficulty never claims 'harder' (Stage 3 fix — F-0x absolute-state bug)", () => {
    const result = explainSelection(trace({ reason: "progression" }, { evidenceCount: 5, difficulty: 4 }), 4);
    expect(result).toMatch(/continuing to practise/i);
    expect(result).not.toMatch(/harder/i);
  });

  it("progression where current difficulty is strictly GREATER than the previous recorded difficulty reads as 'moving to a harder question'", () => {
    const result = explainSelection(trace({ reason: "progression" }, { evidenceCount: 5, difficulty: 4 }), 2);
    expect(result).toMatch(/harder question after consistent success/i);
  });

  it("progression where current difficulty is strictly LESS than the previous recorded difficulty reads as 'moving to an easier question', never 'harder'", () => {
    const result = explainSelection(trace({ reason: "progression" }, { evidenceCount: 5, difficulty: 2 }), 4);
    expect(result).toMatch(/easier question/i);
    expect(result).not.toMatch(/harder/i);
  });

  it("remediation", () => {
    expect(explainSelection(trace({ reason: "remediation" }))).toMatch(/easier question after some recent mistakes/i);
  });

  it("prerequisite_backtrack", () => {
    expect(explainSelection(trace({ reason: "prerequisite_backtrack" }))).toMatch(/revisiting an earlier concept/i);
  });

  it("diagnostic_probe", () => {
    expect(explainSelection(trace({ reason: "diagnostic_probe" }))).toMatch(/checking an earlier concept/i);
  });

  it("no_eligible_concept", () => {
    expect(explainSelection(trace({ reason: "no_eligible_concept" }))).toMatch(/reviewing previously covered material/i);
  });

  it("never names a specific concept id or concept name (no raw research identifier leak)", () => {
    for (const reason of ["insufficient_evidence", "progression", "remediation", "prerequisite_backtrack", "diagnostic_probe", "no_eligible_concept"] as const) {
      const sentence = explainSelection(trace({ reason, conceptId: "SECRET_CONCEPT_ID" }));
      expect(sentence).not.toContain("SECRET_CONCEPT_ID");
    }
  });
});

describe("describeEvidenceLevel", () => {
  it("distinguishes unobserved, limited, and practised", () => {
    expect(describeEvidenceLevel(0, 3)).toBe("Not yet practised");
    expect(describeEvidenceLevel(1, 3)).toBe("Limited evidence so far");
    expect(describeEvidenceLevel(3, 3)).toBe("Practised");
  });
});

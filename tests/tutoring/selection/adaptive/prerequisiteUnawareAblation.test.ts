import { describe, expect, it } from "vitest";
import { chooseTargetConcept, chooseTargetDifficulty } from "@/tutoring/selection/adaptive/targeting";
import { DEFAULT_ADAPTIVE_SELECTION_CONFIG, PREREQUISITE_UNAWARE_ADAPTIVE_SELECTION_CONFIG } from "@/tutoring/selection/adaptive/config";
import { createInitialConceptState } from "@/domain/learner-model/initialize";
import type { ConceptMasteryState } from "@/domain/learner-model/types";
import type { Concept } from "@/domain/concepts/types";
import type { AdaptiveSelectionContext } from "@/tutoring/selection/adaptive/types";

const T0 = "2026-10-30T00:00:00.000Z";

function concept(id: string, prerequisiteIds: string[] = []): Concept {
  return { id, name: id, description: id, prerequisiteIds, strand: "algebra_foundations" };
}

function stateWith(conceptId: string, overrides: Partial<ConceptMasteryState>): ConceptMasteryState {
  return { ...createInitialConceptState("l1", conceptId, T0), ...overrides };
}

function baseContext(overrides: Partial<AdaptiveSelectionContext> = {}): AdaptiveSelectionContext {
  return {
    learnerId: "l1",
    sessionId: "s1",
    sequenceIndex: 20,
    availableQuestions: [],
    concepts: [],
    curriculumOrder: [],
    conceptMasteryStates: {},
    misconceptionTallies: {},
    presentedQuestionIds: [],
    ...overrides,
  };
}

describe("PREREQUISITE_UNAWARE_ADAPTIVE_SELECTION_CONFIG", () => {
  it("differs from the default config only in prerequisiteAware and version", () => {
    const restDefault = { ...DEFAULT_ADAPTIVE_SELECTION_CONFIG, version: undefined, prerequisiteAware: undefined };
    const restUnaware = { ...PREREQUISITE_UNAWARE_ADAPTIVE_SELECTION_CONFIG, version: undefined, prerequisiteAware: undefined };
    expect(restDefault).toEqual(restUnaware);
    expect(PREREQUISITE_UNAWARE_ADAPTIVE_SELECTION_CONFIG.prerequisiteAware).toBe(false);
    expect(DEFAULT_ADAPTIVE_SELECTION_CONFIG.prerequisiteAware).toBe(true);
  });
});

describe("prerequisiteAware: false — disables graph-based targeting only", () => {
  const concepts = [concept("top", ["mid"]), concept("mid", [])];
  const curriculumOrder = ["top"];

  it("never backtracks into a weak prerequisite, even where the aware config would", () => {
    const states = {
      top: stateWith("top", { mastery: 0.3, numObservations: 5, consecutiveIncorrect: 3 }),
      mid: stateWith("mid", { mastery: 0.1, numObservations: 1 }), // weak/under-evidenced
    };
    const awareContext = baseContext({ concepts, curriculumOrder, conceptMasteryStates: states });

    const awareDecision = chooseTargetConcept(awareContext, DEFAULT_ADAPTIVE_SELECTION_CONFIG);
    expect(awareDecision.reason).toBe("prerequisite_backtrack");
    expect(awareDecision.conceptId).toBe("mid");

    const unawareDecision = chooseTargetConcept(awareContext, PREREQUISITE_UNAWARE_ADAPTIVE_SELECTION_CONFIG);
    expect(unawareDecision.reason).toBe("remediation");
    expect(unawareDecision.conceptId).toBe("top");
  });

  it("never triggers a diagnostic probe into a previously-mastered prerequisite, even where the aware config would", () => {
    const states = {
      top: stateWith("top", { mastery: 0.5, numObservations: 5, consecutiveIncorrect: 4 }),
      mid: stateWith("mid", { mastery: 0.9, numObservations: 5, lastSequenceIndex: 0 }), // stale + mastered
    };
    const context = baseContext({ concepts, curriculumOrder, conceptMasteryStates: states, sequenceIndex: 20 });

    const awareDecision = chooseTargetConcept(context, DEFAULT_ADAPTIVE_SELECTION_CONFIG);
    expect(awareDecision.reason).toBe("diagnostic_probe");

    const unawareDecision = chooseTargetConcept(context, PREREQUISITE_UNAWARE_ADAPTIVE_SELECTION_CONFIG);
    expect(unawareDecision.reason).toBe("remediation");
    expect(unawareDecision.conceptId).toBe("top");
    expect(unawareDecision.diagnosticDetails).toBeUndefined();
    expect(unawareDecision.prerequisiteChain).toBeUndefined();
  });

  it("still progresses normally when there is no struggle (ablation doesn't disable progression)", () => {
    const states = { top: stateWith("top", { mastery: 0.5, numObservations: 5, consecutiveIncorrect: 0 }) };
    const context = baseContext({ concepts, curriculumOrder, conceptMasteryStates: states });
    const decision = chooseTargetConcept(context, PREREQUISITE_UNAWARE_ADAPTIVE_SELECTION_CONFIG);
    expect(decision.reason).toBe("progression");
  });

  it("does NOT disable mastery-based difficulty adaptation — chooseTargetDifficulty is identical under both configs", () => {
    const states = { top: stateWith("top", { mastery: 0.7, numObservations: 5 }) };
    const context = baseContext({ concepts, curriculumOrder, conceptMasteryStates: states });
    const awareDifficulty = chooseTargetDifficulty("top", context, DEFAULT_ADAPTIVE_SELECTION_CONFIG);
    const unawareDifficulty = chooseTargetDifficulty("top", context, PREREQUISITE_UNAWARE_ADAPTIVE_SELECTION_CONFIG);
    expect(unawareDifficulty.difficulty).toBe(awareDifficulty.difficulty);
    expect(unawareDifficulty.reason).toBe(awareDifficulty.reason);
  });

  it("still respects insufficient_evidence and no_eligible_concept paths identically to the aware config", () => {
    const emptyContext = baseContext({ concepts: [], curriculumOrder: [] });
    expect(chooseTargetConcept(emptyContext, PREREQUISITE_UNAWARE_ADAPTIVE_SELECTION_CONFIG).reason).toBe("no_eligible_concept");

    const coldContext = baseContext({ concepts, curriculumOrder, conceptMasteryStates: {} });
    const decision = chooseTargetConcept(coldContext, PREREQUISITE_UNAWARE_ADAPTIVE_SELECTION_CONFIG);
    expect(decision.reason).toBe("insufficient_evidence");
  });
});

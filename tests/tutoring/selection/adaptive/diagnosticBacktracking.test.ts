import { describe, expect, it } from "vitest";
import { chooseTargetConcept, findDiagnosticBacktrackTarget } from "@/tutoring/selection/adaptive/targeting";
import { DEFAULT_ADAPTIVE_SELECTION_CONFIG } from "@/tutoring/selection/adaptive/config";
import { createInitialConceptState } from "@/domain/learner-model/initialize";
import type { ConceptMasteryState } from "@/domain/learner-model/types";
import type { Concept } from "@/domain/concepts/types";
import type { AdaptiveSelectionContext } from "@/tutoring/selection/adaptive/types";

const T0 = "2026-10-30T00:00:00.000Z";
const config = DEFAULT_ADAPTIVE_SELECTION_CONFIG;

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

describe("findDiagnosticBacktrackTarget — can revisit previously-mastered prerequisites", () => {
  it("selects a direct prerequisite with high historical mastery, once its evidence is stale", () => {
    const concepts = [concept("top", ["mid"]), concept("mid", [])];
    const states = { mid: stateWith("mid", { mastery: 0.9, numObservations: 5, lastSequenceIndex: 0 }) };
    const result = findDiagnosticBacktrackTarget("top", states, concepts, config, 20); // gap = 20, >= staleness threshold 8
    expect(result.conceptId).toBe("mid");
    expect(result.chain).toEqual(["top", "mid"]);
    expect(result.prerequisitesConsidered[0].eligible).toBe(true);
  });

  it("does NOT select a prerequisite whose evidence is still recent, even with low mastery", () => {
    const concepts = [concept("top", ["mid"])];
    const states = { mid: stateWith("mid", { mastery: 0.2, numObservations: 5, lastSequenceIndex: 18 }) }; // gap = 2, < 8
    const result = findDiagnosticBacktrackTarget("top", states, concepts, config, 20);
    expect(result.conceptId).toBeNull();
    expect(result.prerequisitesConsidered[0].eligible).toBe(false);
  });

  it("prefers lower mastery among multiple equally-stale eligible candidates", () => {
    const concepts = [concept("top", ["highMastery", "lowMastery"])];
    const states = {
      highMastery: stateWith("highMastery", { mastery: 0.9, numObservations: 5, lastSequenceIndex: 0 }),
      lowMastery: stateWith("lowMastery", { mastery: 0.4, numObservations: 5, lastSequenceIndex: 0 }),
    };
    const result = findDiagnosticBacktrackTarget("top", states, concepts, config, 20);
    expect(result.conceptId).toBe("lowMastery");
  });

  it("prefers a never-observed prerequisite over a stale-but-observed one", () => {
    const concepts = [concept("top", ["neverObserved", "staleObserved"])];
    const states = { staleObserved: stateWith("staleObserved", { mastery: 0.9, numObservations: 5, lastSequenceIndex: 0 }) };
    const result = findDiagnosticBacktrackTarget("top", states, concepts, config, 20);
    expect(result.conceptId).toBe("neverObserved");
  });

  it("goes a second hop deeper when the direct prerequisite is fresh but a deeper one is stale (multi-level chains)", () => {
    const concepts = [concept("top", ["mid"]), concept("mid", ["leaf"]), concept("leaf", [])];
    const states = {
      mid: stateWith("mid", { mastery: 0.9, numObservations: 5, lastSequenceIndex: 19 }), // fresh, gap=1
      leaf: stateWith("leaf", { mastery: 0.9, numObservations: 5, lastSequenceIndex: 0 }), // stale, gap=20
    };
    const result = findDiagnosticBacktrackTarget("top", states, concepts, config, 20);
    expect(result.conceptId).toBe("leaf");
    expect(result.chain).toEqual(["top", "mid", "leaf"]);
  });

  it("respects maxPrerequisiteBacktrackDepth", () => {
    const concepts = [concept("top", ["mid"]), concept("mid", ["leaf"]), concept("leaf", [])];
    const shallowConfig = { ...config, maxPrerequisiteBacktrackDepth: 1 };
    const states = {
      mid: stateWith("mid", { mastery: 0.9, numObservations: 5, lastSequenceIndex: 19 }), // fresh at depth 1
      leaf: stateWith("leaf", { mastery: 0.9, numObservations: 5, lastSequenceIndex: 0 }), // stale, but at depth 2
    };
    const result = findDiagnosticBacktrackTarget("top", states, concepts, shallowConfig, 20);
    expect(result.conceptId).toBeNull();
  });

  it("does not infinite-loop on a cyclic prerequisite graph", () => {
    const cyclicConcepts = [concept("a", ["b"]), concept("b", ["a"])];
    const result = findDiagnosticBacktrackTarget("a", {}, cyclicConcepts, config, 20);
    expect(result.conceptId).toBe("b"); // never observed -> eligible; the key assertion is that this returns at all
  });

  it("does not mutate the states object (no automatic mastery penalty from being considered)", () => {
    const concepts = [concept("top", ["mid"])];
    const midState = stateWith("mid", { mastery: 0.9, numObservations: 5, lastSequenceIndex: 0 });
    const states = { mid: midState };
    const snapshot = JSON.parse(JSON.stringify(states));
    findDiagnosticBacktrackTarget("top", states, concepts, config, 20);
    expect(states).toEqual(snapshot);
    expect(states.mid).toBe(midState);
  });

  it("is deterministic", () => {
    const concepts = [concept("top", ["mid"])];
    const states = { mid: stateWith("mid", { mastery: 0.9, numObservations: 5, lastSequenceIndex: 0 }) };
    const r1 = findDiagnosticBacktrackTarget("top", states, concepts, config, 20);
    const r2 = findDiagnosticBacktrackTarget("top", states, concepts, config, 20);
    expect(r1).toEqual(r2);
  });
});

describe("chooseTargetConcept — diagnostic_probe integration", () => {
  const concepts = [concept("top", ["mid"]), concept("mid", [])];
  const curriculumOrder = ["top"]; // "mid" is a background prerequisite, not walked directly

  function topState(overrides: Partial<ConceptMasteryState> = {}): ConceptMasteryState {
    return stateWith("top", { mastery: 0.5, numObservations: 5, consecutiveIncorrect: 4, ...overrides });
  }

  it("triggers diagnostic_probe only once sustained difficulty crosses the (higher) diagnostic threshold, not the ordinary remediation threshold", () => {
    const states = {
      top: topState({ consecutiveIncorrect: 3 }), // >= remediation(2) but < diagnostic(4)
      mid: stateWith("mid", { mastery: 0.9, numObservations: 5, lastSequenceIndex: 0 }),
    };
    const context = baseContext({ concepts, curriculumOrder, conceptMasteryStates: states });
    const decision = chooseTargetConcept(context, config);
    expect(decision.reason).not.toBe("diagnostic_probe");
    expect(decision.reason).toBe("remediation"); // mid is mastered, so ordinary remediation finds nothing either
  });

  it("selects a previously-mastered, stale prerequisite once the diagnostic threshold is crossed", () => {
    const states = {
      top: topState({ consecutiveIncorrect: 4 }),
      mid: stateWith("mid", { mastery: 0.9, numObservations: 5, lastSequenceIndex: 0 }),
    };
    const context = baseContext({ concepts, curriculumOrder, conceptMasteryStates: states });
    const decision = chooseTargetConcept(context, config);
    expect(decision.conceptId).toBe("mid");
    expect(decision.reason).toBe("diagnostic_probe");
    expect(decision.diagnosticDetails?.originalConceptId).toBe("top");
    expect(decision.diagnosticDetails?.isTemporaryProbe).toBe(true);
    expect(decision.diagnosticDetails?.triggerConsecutiveIncorrect).toBe(4);
    expect(decision.prerequisiteChain).toEqual(["top", "mid"]);
  });

  it("records an accurate, reconstructable list of prerequisites considered, including ineligible ones", () => {
    const states = {
      top: topState({ consecutiveIncorrect: 4 }),
      mid: stateWith("mid", { mastery: 0.9, numObservations: 5, lastSequenceIndex: 19 }), // fresh -> ineligible
    };
    const context = baseContext({
      concepts: [concept("top", ["mid", "other"]), concept("mid", []), concept("other", [])],
      curriculumOrder,
      conceptMasteryStates: { ...states, other: stateWith("other", { mastery: 0.9, numObservations: 5, lastSequenceIndex: 0 }) },
    });
    const decision = chooseTargetConcept(context, config);
    expect(decision.conceptId).toBe("other");
    const considered = decision.diagnosticDetails!.prerequisitesConsidered;
    expect(considered.find((c) => c.conceptId === "mid")?.eligible).toBe(false);
    expect(considered.find((c) => c.conceptId === "other")?.eligible).toBe(true);
  });

  it("falls through to ordinary remediation when no prerequisite is eligible for diagnostic probing", () => {
    const states = {
      top: topState({ consecutiveIncorrect: 4 }),
      mid: stateWith("mid", { mastery: 0.9, numObservations: 5, lastSequenceIndex: 19 }), // fresh -> ineligible
    };
    const context = baseContext({ concepts, curriculumOrder, conceptMasteryStates: states });
    const decision = chooseTargetConcept(context, config);
    expect(decision.reason).toBe("remediation"); // mid ineligible for probing AND mastered (ordinary remediation also finds nothing)
    expect(decision.conceptId).toBe("top");
  });

  it("does not mutate conceptMasteryStates when producing a diagnostic_probe decision", () => {
    const midState = stateWith("mid", { mastery: 0.9, numObservations: 5, lastSequenceIndex: 0 });
    const states = { top: topState({ consecutiveIncorrect: 4 }), mid: midState };
    const context = baseContext({ concepts, curriculumOrder, conceptMasteryStates: states });
    chooseTargetConcept(context, config);
    expect(states.mid).toBe(midState);
    expect(states.mid.mastery).toBe(0.9);
  });

  it("is deterministic", () => {
    const states = { top: topState({ consecutiveIncorrect: 4 }), mid: stateWith("mid", { mastery: 0.9, numObservations: 5, lastSequenceIndex: 0 }) };
    const context = baseContext({ concepts, curriculumOrder, conceptMasteryStates: states });
    expect(chooseTargetConcept(context, config)).toEqual(chooseTargetConcept(context, config));
  });

  it("returns to the original downstream concept once the probed prerequisite is no longer stale (simulating the next round after a probe)", () => {
    // Round N: mid was stale and got probed (simulated directly by giving it
    // a fresh lastSequenceIndex, as applyResponseEvidence would after a
    // real response).
    const freshlyProbedMid = stateWith("mid", { mastery: 0.85, numObservations: 6, lastSequenceIndex: 20 });
    const states = { top: topState({ consecutiveIncorrect: 4 }), mid: freshlyProbedMid };
    const context = baseContext({ concepts, curriculumOrder, conceptMasteryStates: states, sequenceIndex: 21 });
    const decision = chooseTargetConcept(context, config);
    // gap = 21 - 20 = 1, well under the staleness threshold -> ineligible -> falls through
    expect(decision.reason).not.toBe("diagnostic_probe");
    expect(decision.conceptId).toBe("top");
  });
});

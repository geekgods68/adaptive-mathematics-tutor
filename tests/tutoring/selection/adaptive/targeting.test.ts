import { describe, expect, it } from "vitest";
import {
  chooseTargetConcept,
  chooseTargetDifficulty,
  findProgressionFrontier,
  findRemediationTarget,
  isConceptMastered,
  resolveDifficultyBand,
} from "@/tutoring/selection/adaptive/targeting";
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
    sequenceIndex: 0,
    availableQuestions: [],
    concepts: [],
    curriculumOrder: [],
    conceptMasteryStates: {},
    misconceptionTallies: {},
    presentedQuestionIds: [],
    ...overrides,
  };
}

describe("isConceptMastered / findProgressionFrontier", () => {
  it("requires BOTH mastery and evidence-count thresholds, not mastery alone", () => {
    const highMasteryLowEvidence = stateWith("c1", { mastery: 0.95, numObservations: 1 });
    expect(isConceptMastered(highMasteryLowEvidence, config)).toBe(false);
    const sufficientBoth = stateWith("c1", { mastery: 0.95, numObservations: 5 });
    expect(isConceptMastered(sufficientBoth, config)).toBe(true);
  });

  it("treats a concept with no state at all as not mastered", () => {
    expect(isConceptMastered(undefined, config)).toBe(false);
  });

  it("returns the first not-yet-mastered concept in curriculum order (new-learner initialization: nothing mastered yet)", () => {
    expect(findProgressionFrontier(["leaf", "mid", "root"], {}, config)).toBe("leaf");
  });

  it("advances past a mastered concept to the next one", () => {
    const states = { leaf: stateWith("leaf", { mastery: 0.9, numObservations: 5 }) };
    expect(findProgressionFrontier(["leaf", "mid", "root"], states, config)).toBe("mid");
  });

  it("returns the LAST concept (not null) once every concept is mastered — there is always more practice available", () => {
    const states = {
      leaf: stateWith("leaf", { mastery: 0.9, numObservations: 5 }),
      mid: stateWith("mid", { mastery: 0.9, numObservations: 5 }),
      root: stateWith("root", { mastery: 0.9, numObservations: 5 }),
    };
    expect(findProgressionFrontier(["leaf", "mid", "root"], states, config)).toBe("root");
  });

  it("returns null only for an empty curriculum", () => {
    expect(findProgressionFrontier([], {}, config)).toBeNull();
  });
});

describe("findRemediationTarget — prerequisite backtracking", () => {
  const concepts = [concept("top", ["mid"]), concept("mid", ["leaf"]), concept("leaf", [])];

  it("prefers the CLOSER (direct) prerequisite when both the direct and a deeper one need attention", () => {
    const states = {
      mid: stateWith("mid", { numObservations: 0 }), // needs attention (insufficient evidence)
      leaf: stateWith("leaf", { mastery: 0.1, numObservations: 5 }), // also needs attention
    };
    const result = findRemediationTarget("top", states, concepts, config);
    expect(result?.conceptId).toBe("mid");
    expect(result?.chain).toEqual(["top", "mid"]);
  });

  it("goes a second hop deeper when the direct prerequisite is fine but a deeper one is not", () => {
    const states = {
      mid: stateWith("mid", { mastery: 0.9, numObservations: 5 }), // fine
      leaf: stateWith("leaf", { mastery: 0.1, numObservations: 5 }), // needs attention
    };
    const result = findRemediationTarget("top", states, concepts, config);
    expect(result?.conceptId).toBe("leaf");
    expect(result?.chain).toEqual(["top", "mid", "leaf"]);
  });

  it("returns null when every prerequisite, at every depth within the bound, looks fine", () => {
    const states = {
      mid: stateWith("mid", { mastery: 0.9, numObservations: 5 }),
      leaf: stateWith("leaf", { mastery: 0.9, numObservations: 5 }),
    };
    expect(findRemediationTarget("top", states, concepts, config)).toBeNull();
  });

  it("respects maxPrerequisiteBacktrackDepth — does not look past the configured bound", () => {
    const shallowConfig = { ...config, maxPrerequisiteBacktrackDepth: 1 };
    const states = {
      mid: stateWith("mid", { mastery: 0.9, numObservations: 5 }), // fine at depth 1
      leaf: stateWith("leaf", { mastery: 0.1, numObservations: 5 }), // needs attention, but at depth 2
    };
    expect(findRemediationTarget("top", states, concepts, shallowConfig)).toBeNull();
  });

  it("does not infinite-loop on a cyclic (malformed) prerequisite graph", () => {
    const cyclicConcepts = [concept("a", ["b"]), concept("b", ["a"])];
    const result = findRemediationTarget("a", {}, cyclicConcepts, config);
    // both "a" (start, excluded from its own search) and "b" are explored;
    // "b" has no state -> needs attention -> found. The key assertion is
    // that this call RETURNS AT ALL rather than hanging.
    expect(result?.conceptId).toBe("b");
  });

  it("does not mutate the states object passed in (read-only, no automatic mastery credit)", () => {
    const states = { mid: stateWith("mid", { mastery: 0.1, numObservations: 1 }) };
    const snapshot = JSON.parse(JSON.stringify(states));
    findRemediationTarget("top", states, concepts, config);
    expect(states).toEqual(snapshot);
  });

  it("a concept id missing from the concepts list is skipped without throwing", () => {
    const result = findRemediationTarget("nonexistent-concept", {}, concepts, config);
    expect(result).toBeNull();
  });
});

describe("chooseTargetConcept — full decision", () => {
  const concepts = [concept("leaf", []), concept("mid", ["leaf"]), concept("root", ["mid"])];
  const curriculumOrder = ["leaf", "mid", "root"];

  it("a brand-new learner (no state anywhere) is targeted at the first curriculum concept with reason 'insufficient_evidence'", () => {
    const context = baseContext({ concepts, curriculumOrder, conceptMasteryStates: {} });
    const decision = chooseTargetConcept(context, config);
    expect(decision.conceptId).toBe("leaf");
    expect(decision.reason).toBe("insufficient_evidence");
  });

  it("a learner progressing normally (sufficient evidence, mastery below threshold, no streak of failures) gets reason 'progression'", () => {
    const states = { leaf: stateWith("leaf", { mastery: 0.5, numObservations: 4, consecutiveIncorrect: 0 }) };
    const context = baseContext({ concepts, curriculumOrder, conceptMasteryStates: states });
    const decision = chooseTargetConcept(context, config);
    expect(decision.conceptId).toBe("leaf");
    expect(decision.reason).toBe("progression");
  });

  it("a struggling learner with a well-mastered prerequisite gets reason 'remediation' (easier practice on the SAME concept, not a fabricated prerequisite gap)", () => {
    // "mid" is the frontier (leaf already mastered); mid is failing, but its
    // only prerequisite ("leaf") is itself already well-mastered.
    const states = {
      leaf: stateWith("leaf", { mastery: 0.9, numObservations: 5 }),
      mid: stateWith("mid", { mastery: 0.3, numObservations: 5, consecutiveIncorrect: 3 }),
    };
    const context = baseContext({ concepts, curriculumOrder, conceptMasteryStates: states });
    const decision = chooseTargetConcept(context, config);
    expect(decision.conceptId).toBe("mid");
    expect(decision.reason).toBe("remediation");
  });

  it("a struggling learner with a weak prerequisite gets reason 'prerequisite_backtrack', targeting the prerequisite instead", () => {
    // "leaf" is a prerequisite of "mid" in the concept GRAPH but is
    // deliberately NOT part of this session's walked curriculumOrder
    // (e.g. an assumed-background concept from an earlier unit) — so
    // frontier advancement never gated on it directly; backtracking is
    // what surfaces it when "mid" starts failing. (Note: a prerequisite
    // that WAS already advanced past via curriculumOrder can never be
    // re-flagged this way, by construction — isConceptMastered's bar is
    // higher than masteryRemediationThreshold, so anything the frontier
    // walked past already clears it. This off-path case is the realistic
    // scenario backtracking exists for.)
    const states = {
      leaf: stateWith("leaf", { mastery: 0.2, numObservations: 1 }), // weak/under-evidenced
      mid: stateWith("mid", { mastery: 0.3, numObservations: 5, consecutiveIncorrect: 3 }),
    };
    const context = baseContext({ concepts, curriculumOrder: ["mid", "root"], conceptMasteryStates: states });
    const decision = chooseTargetConcept(context, config);
    expect(decision.conceptId).toBe("leaf");
    expect(decision.reason).toBe("prerequisite_backtrack");
    expect(decision.prerequisiteChain).toEqual(["mid", "leaf"]);
  });

  it("does NOT treat failure on an advanced concept as proof a prerequisite is unmastered — it only SELECTS the prerequisite as the next target, without writing to its state", () => {
    const leafState = stateWith("leaf", { mastery: 0.2, numObservations: 1 });
    const states = { leaf: leafState, mid: stateWith("mid", { mastery: 0.3, numObservations: 5, consecutiveIncorrect: 3 }) };
    const context = baseContext({ concepts, curriculumOrder, conceptMasteryStates: states });
    chooseTargetConcept(context, config);
    expect(states.leaf).toBe(leafState); // same object reference — untouched
    expect(states.leaf.mastery).toBe(0.2); // not silently "corrected" to reflect the dependent's failure
  });

  it("returns reason 'no_eligible_concept' for an empty curriculum", () => {
    const context = baseContext({ concepts: [], curriculumOrder: [] });
    const decision = chooseTargetConcept(context, config);
    expect(decision.conceptId).toBeNull();
    expect(decision.reason).toBe("no_eligible_concept");
  });

  it("is deterministic — identical context and config always produce an identical decision", () => {
    const states = { leaf: stateWith("leaf", { mastery: 0.5, numObservations: 4 }) };
    const context = baseContext({ concepts, curriculumOrder, conceptMasteryStates: states });
    expect(chooseTargetConcept(context, config)).toEqual(chooseTargetConcept(context, config));
  });

  it("includes every curriculum concept in consideredConcepts, for trace reconstruction", () => {
    const context = baseContext({ concepts, curriculumOrder, conceptMasteryStates: {} });
    const decision = chooseTargetConcept(context, config);
    expect(decision.consideredConcepts.map((c) => c.conceptId)).toEqual(curriculumOrder);
  });
});

describe("resolveDifficultyBand", () => {
  it("maps mastery to the documented default bands exactly", () => {
    expect(resolveDifficultyBand(0.0, config.difficultyByMastery)).toBe(1);
    expect(resolveDifficultyBand(0.3, config.difficultyByMastery)).toBe(1);
    expect(resolveDifficultyBand(0.31, config.difficultyByMastery)).toBe(2);
    expect(resolveDifficultyBand(0.45, config.difficultyByMastery)).toBe(2);
    expect(resolveDifficultyBand(0.46, config.difficultyByMastery)).toBe(3);
    expect(resolveDifficultyBand(0.65, config.difficultyByMastery)).toBe(3);
    expect(resolveDifficultyBand(0.66, config.difficultyByMastery)).toBe(4);
    expect(resolveDifficultyBand(0.85, config.difficultyByMastery)).toBe(4);
    expect(resolveDifficultyBand(0.86, config.difficultyByMastery)).toBe(5);
    expect(resolveDifficultyBand(1.0, config.difficultyByMastery)).toBe(5);
  });

  it("falls back to the last band rather than throwing on a misconfigured (empty) table", () => {
    expect(resolveDifficultyBand(0.5, [])).toBe(3);
  });
});

describe("chooseTargetDifficulty", () => {
  const concepts = [concept("c1", [])];

  it("uses the diagnostic difficulty for a cold-start / low-evidence concept", () => {
    const context = baseContext({ concepts, curriculumOrder: ["c1"], conceptMasteryStates: {} });
    const decision = chooseTargetDifficulty("c1", context, config);
    expect(decision.difficulty).toBe(config.diagnosticDifficultyForLowEvidence);
    expect(decision.evidenceCount).toBe(0);
  });

  it("uses the mastery-based band once evidence is sufficient", () => {
    const states = { c1: stateWith("c1", { mastery: 0.5, numObservations: 5 }) };
    const context = baseContext({ concepts, curriculumOrder: ["c1"], conceptMasteryStates: states });
    const decision = chooseTargetDifficulty("c1", context, config);
    expect(decision.difficulty).toBe(3);
    expect(decision.masteryUsed).toBe(0.5);
  });

  it("nudges away from a difficulty repeated too many times in a row", () => {
    const states = { c1: stateWith("c1", { mastery: 0.5, numObservations: 5 }) };
    const questions = [
      { id: "q1", difficulty: 3 as const },
      { id: "q2", difficulty: 3 as const },
      { id: "q3", difficulty: 3 as const },
    ].map((q) => ({
      ...q,
      stem: "x",
      conceptIds: ["c1"],
      primaryConceptId: "c1",
      options: [],
      correctOptionId: "x",
      workedSolution: "x",
      version: 1,
    }));
    const context = baseContext({
      concepts,
      curriculumOrder: ["c1"],
      conceptMasteryStates: states,
      availableQuestions: questions,
      presentedQuestionIds: ["q1", "q2", "q3"],
    });
    const decision = chooseTargetDifficulty("c1", context, config);
    expect(decision.difficulty).not.toBe(3);
    expect(decision.difficulty).toBe(4);
  });

  it("returns null difficulty when there is no target concept", () => {
    const context = baseContext();
    expect(chooseTargetDifficulty(null, context, config).difficulty).toBeNull();
  });
});

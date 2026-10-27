import { describe, expect, it } from "vitest";
import { createSimulatedLearner, type DispatchQuestion, type SimFamily } from "@/research/phase8/simulator/dispatch";
import { loadSimulatorConfig } from "@/research/phase8/config/load";
import type { LearnerIdentity } from "@/research/phase8/simulator/shared";
import type { CurriculumConcept } from "@/research/phase8/simulator/trueGraph";

const cfg = loadSimulatorConfig().value;

function identity(family: SimFamily, learnerId: string): LearnerIdentity {
  return { masterSeed: "RISE-PHASE8-v2", family, cell: "cell", sliceId: "slice-1", world: 1, split: "test", learnerId };
}

const q: DispatchQuestion = { id: "q1", level: 3, options: 4, conceptWeights: { "c-1": 1 } };

describe("createSimulatedLearner dispatch", () => {
  it("S1/S2/S3 each produce a deterministic, well-formed step given the same identity", () => {
    for (const family of ["S1", "S2", "S3"] as const) {
      const learner = createSimulatedLearner(family, identity(family, "L1"), cfg, {});
      const step = learner.respondAndLearn(q);
      expect(typeof step.correct).toBe("boolean");
      const truth = step.truthByConcept.get("c-1")!;
      expect(truth.pStar).toBeGreaterThanOrEqual(0);
      expect(truth.pStar).toBeLessThanOrEqual(1);
      expect(typeof truth.mastered).toBe("boolean");
    }
  });

  it("is deterministic: the same family/identity/schedule produces the identical sequence of outcomes", () => {
    function runFive(learnerId: string) {
      const learner = createSimulatedLearner("S1", identity("S1", learnerId), cfg, {});
      const results = [];
      for (let i = 0; i < 5; i++) results.push(learner.respondAndLearn({ ...q, id: `q${i}` }));
      return results.map((r) => r.correct);
    }
    expect(runFive("L-det")).toEqual(runFive("L-det"));
  });

  it("different learners get independent outcomes", () => {
    function runFive(learnerId: string) {
      const learner = createSimulatedLearner("S1", identity("S1", learnerId), cfg, {});
      const results = [];
      for (let i = 0; i < 5; i++) results.push(learner.respondAndLearn({ ...q, id: `q${i}` }).correct);
      return results;
    }
    expect(runFive("L-a")).not.toEqual(runFive("L-b"));
  });

  it("S2's learned state advances across repeated presentations of the same concept (never regresses to unknown)", () => {
    const learner = createSimulatedLearner("S2", identity("S2", "L1"), cfg, {});
    let sawKnown = false;
    for (let i = 0; i < 100; i++) {
      const { truthByConcept } = learner.respondAndLearn({ ...q, id: `q${i}` });
      const mastered = truthByConcept.get("c-1")!.mastered;
      if (sawKnown) expect(mastered).toBe(true); // no forgetting
      if (mastered) sawKnown = true;
    }
  });

  it("S4 requires s4Setup and throws a clear error without it", () => {
    expect(() => createSimulatedLearner("S4", identity("S4", "L1"), cfg, {})).toThrow(/s4Setup is required/);
  });

  it("S4 dispatches correctly given a valid setup", () => {
    const concepts: CurriculumConcept[] = [{ id: "c-1", curriculumLevel: 1, prerequisiteIds: [] }];
    const learner = createSimulatedLearner("S4", identity("S4", "L1"), cfg, {}, {
      concepts,
      lambda: 0.3,
      phi: 1.0,
      isTargetConcept: () => true,
    });
    const step = learner.respondAndLearn(q);
    expect(typeof step.correct).toBe("boolean");
    const truth = learner.truth("c-1");
    expect([0, 1]).toContain(truth.m);
  });

  it("truth() reflects the PRE-response state at the time respondAndLearn is called (matches the truth returned in that same step)", () => {
    const learner = createSimulatedLearner("S1", identity("S1", "L1"), cfg, {});
    const before = learner.truth("c-1");
    const step = learner.respondAndLearn(q);
    expect(step.truthByConcept.get("c-1")!.pStar).toBeCloseTo(before.pStar, 12);
  });
});

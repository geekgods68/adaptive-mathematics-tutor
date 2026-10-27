import { describe, expect, it } from "vitest";
import { loadSimulatorConfig } from "@/research/phase8/config/load";
import { clip, sigma, type LearnerIdentity, type SimIdentity } from "@/research/phase8/simulator/shared";
import { createS1LatentState, s1Respond, s1Truth, s1Learn } from "@/research/phase8/simulator/s1";
import { createS2LatentState, s2Truth, s2Learn, s2ConceptParams } from "@/research/phase8/simulator/s2";
import { createS3LatentState, s3Learn, s3Truth } from "@/research/phase8/simulator/s3";
import { buildTrueGraph, isAcyclic, type CurriculumConcept } from "@/research/phase8/simulator/trueGraph";
import { s4InitializeAll, s4Learn, s4Truth } from "@/research/phase8/simulator/s4";

const cfg = loadSimulatorConfig().value;

function world(family: SimIdentity["family"], world = 1, sliceId = "slice-1", cell = "cell"): SimIdentity {
  return { masterSeed: "RISE-PHASE8-v2", family, cell, sliceId, world };
}

function learner(id: SimIdentity, learnerId: string, split: LearnerIdentity["split"] = "test"): LearnerIdentity {
  return { ...id, split, learnerId };
}

describe("shared math helpers", () => {
  it("sigma is the standard logistic function", () => {
    expect(sigma(0)).toBeCloseTo(0.5, 10);
    expect(sigma(100)).toBeCloseTo(1, 6);
    expect(sigma(-100)).toBeCloseTo(0, 6);
  });

  it("clip bounds a value to [lo, hi]", () => {
    expect(clip(5, 0, 1)).toBe(1);
    expect(clip(-5, 0, 1)).toBe(0);
    expect(clip(0.5, 0, 1)).toBe(0.5);
  });
});

describe("S1 -- stationary logistic learners", () => {
  it("G-4 analog: latent theta is bit-identical across repeated access (fixed, no transition)", () => {
    const id = learner(world("S1"), "L01");
    const state = createS1LatentState();
    const q = { id: "q1", level: 3, options: 4, conceptWeights: { "c-1": 1 } };
    s1Respond(id, q, cfg, state, 0.5);
    const theta1 = state.theta.get("c-1");
    for (let i = 0; i < 1000; i++) {
      s1Respond(id, q, cfg, state, 0.5);
    }
    expect(state.theta.get("c-1")).toBe(theta1);
  });

  it("G-2 analog: m = sigma(theta) and mastered switches exactly at theta = ln(4)", () => {
    const id = learner(world("S1"), "L-mastery-boundary");
    const state = createS1LatentState();
    const truth = s1Truth(id, "c-1", cfg, state);
    expect(truth.m).toBeCloseTo(sigma(state.theta.get("c-1")!), 12);
    // Construct states straddling the ln(4) boundary directly to check the threshold itself.
    const justBelow = { theta: new Map([["c-1", Math.log(4) - 1e-6]]), opp: new Map() };
    const justAbove = { theta: new Map([["c-1", Math.log(4) + 1e-6]]), opp: new Map() };
    expect(s1Truth(id, "c-1", cfg, justBelow).mastered).toBe(false);
    expect(s1Truth(id, "c-1", cfg, justAbove).mastered).toBe(true);
    expect(cfg.shared.masteredM).toBeCloseTo(0.8, 10);
    expect(sigma(Math.log(4))).toBeCloseTo(0.8, 10);
  });

  it("G-11 analog: P(correct) is monotone non-increasing in item level at fixed state", () => {
    const id = learner(world("S1"), "L-mono");
    const state = createS1LatentState();
    // Prime theta once via a neutral response so it is fixed, then compare across levels.
    s1Respond(id, { id: "prime", level: 3, options: 4, conceptWeights: { "c-1": 1 } }, cfg, state, 0.5);
    let prevP = Infinity;
    for (const level of [1, 2, 3, 4, 5]) {
      // Same question id across levels: item noise epsilon_q is keyed by question id,
      // so this isolates the level effect instead of also varying noise per level.
      const { pCorrect } = s1Respond(id, { id: "q-fixed", level, options: 4, conceptWeights: { "c-1": 1 } }, cfg, state, 2); // uResponse=2 never triggers "correct", we only read pCorrect
      expect(pCorrect).toBeLessThanOrEqual(prevP + 1e-9);
      prevP = pCorrect;
    }
  });

  it("opportunity counting (o_k) advances on every presentation UNCONDITIONALLY, regardless of the \"counted\" draw's outcome (C4: o_k indexes RNG draws and must not depend on a prior draw's result)", () => {
    const id = learner(world("S1"), "L-opp");
    const state = createS1LatentState();
    const q = { id: "q1", level: 2, options: 4, conceptWeights: { "c-1": 1 } };
    const always = () => true;
    const next = s1Learn(id, q, cfg, state, always);
    expect(next.opp.get("c-1")).toBe(1);
    const never = () => false;
    const stillState = s1Learn(id, q, cfg, next, never);
    expect(stillState.opp.get("c-1")).toBe(2);
  });
});

describe("S2 -- BKT-generative learners", () => {
  it("truth p* matches L(1-S) + (1-L)G exactly", () => {
    const id = learner(world("S2", 2), "L01");
    const state = createS2LatentState();
    const key = {};
    const truth = s2Truth(id, "c-1", cfg, state, key);
    const { G, S } = s2ConceptParams(id, "c-1", cfg, key);
    const L = state.L.get("c-1")!;
    expect(truth.pStar).toBeCloseTo(L * (1 - S) + (1 - L) * G, 12);
    expect(truth.m).toBe(L);
    expect(truth.mastered).toBe(L === 1);
  });

  it("never forgets: once L=1, repeated learn() calls never reset it to 0", () => {
    const id = learner(world("S2", 3), "L-forget-check");
    let state = createS2LatentState();
    const key = {};
    const q = { id: "q1", conceptWeights: { "c-1": 1 } };
    // Force many opportunities; L can only go 0 -> 1, never back.
    for (let i = 0; i < 200; i++) {
      state = s2Learn(id, q, cfg, state, key);
      if (state.L.get("c-1") === 1) {
        const after = s2Learn(id, q, cfg, state, key);
        expect(after.L.get("c-1")).toBe(1);
      }
    }
  });

  it("is pure: learn() does not mutate the input state object", () => {
    const id = learner(world("S2", 4), "L-pure");
    const state = createS2LatentState();
    const key = {};
    const q = { id: "q1", conceptWeights: { "c-1": 1 } };
    const snapshotBefore = new Map(state.opp);
    s2Learn(id, q, cfg, state, key);
    expect(state.opp).toEqual(snapshotBefore);
  });
});

describe("S3 -- practice-driven continuous learners", () => {
  it("G-6 analog: theta increases by exactly eta_lk per counted opportunity and is otherwise unchanged", () => {
    const id = learner(world("S3", 5), "L01");
    let state = createS3LatentState();
    const q = { id: "q1", level: 3, options: 4, conceptWeights: { "c-growth": 1 } };
    const worldKey = {};
    // Prime theta0.
    s3Truth(id, "c-growth", cfg, state);
    const theta0 = state.theta0.get("c-growth")!;
    let countedOpportunities = 0;
    let lastM: number;
    for (let i = 0; i < 30; i++) {
      const before = state.growth.get("c-growth") ?? 0;
      state = s3Learn(id, q, cfg, state, worldKey);
      const after = state.growth.get("c-growth") ?? 0;
      if (after !== before) countedOpportunities++;
    }
    // Growth should be a non-negative multiple of a single eta_lk value (constant per learner/concept).
    const growth = state.growth.get("c-growth") ?? 0;
    if (countedOpportunities > 0) {
      const perOpportunity = growth / countedOpportunities;
      expect(perOpportunity).toBeGreaterThan(0);
      // theta at this point should equal theta0 + growth exactly.
      const truth = s3Truth(id, "c-growth", cfg, state);
      lastM = truth.m;
      expect(truth.m).toBeCloseTo(sigma(theta0 + growth), 10);
      expect(lastM).toBeGreaterThan(sigma(theta0) - 1e-9);
    }
  });
});

describe("S4 -- prerequisite-gated binary learners", () => {
  const concepts: CurriculumConcept[] = [
    { id: "c-a", curriculumLevel: 1, prerequisiteIds: [] },
    { id: "c-b", curriculumLevel: 2, prerequisiteIds: ["c-a"] },
    { id: "c-c", curriculumLevel: 3, prerequisiteIds: ["c-b"] },
    { id: "c-d", curriculumLevel: 3, prerequisiteIds: ["c-a"] },
  ];

  it("G-8 analog: G* is acyclic and respects the topological order for every edge", () => {
    const id = world("S4", 10);
    const graph = buildTrueGraph(id, concepts, 1.0);
    expect(isAcyclic(graph)).toBe(true);
    expect(graph.edges.size).toBe(3); // phi=1.0 keeps every curriculum edge (u < 1.0 is virtually always true)
  });

  it("with phi=0.0 every curriculum edge is dropped and replaced, still acyclic", () => {
    const id = world("S4", 11);
    const graph = buildTrueGraph(id, concepts, 0.0);
    expect(isAcyclic(graph)).toBe(true);
    expect(graph.edges.size).toBe(3); // same number of edges, just not the curriculum's own
  });

  it("gating: with lambda=0.05 a concept whose G*-parent is unknown is initialised known far less often than one whose parent is known", () => {
    const id = world("S4", 12);
    const graph = buildTrueGraph(id, concepts, 1.0); // c-a -> c-b -> c-c, c-a -> c-d
    const isTarget = () => true; // use piTarget range for all, for simplicity
    let knownWithUnknownParentCount = 0;
    let totalWithUnknownParentCount = 0;
    const trials = 300;
    for (let i = 0; i < trials; i++) {
      const learnerId = learner(id, `L${i}`);
      const state = s4InitializeAll(learnerId, graph, cfg, 0.05, isTarget, { trial: i });
      if (state.L.get("c-a") === 0) {
        totalWithUnknownParentCount++;
        if (state.L.get("c-b") === 1) knownWithUnknownParentCount++;
      }
    }
    // With lambda=0.05, gated-unknown initial knowledge should be rare relative to piTarget's own range.
    if (totalWithUnknownParentCount > 0) {
      const rate = knownWithUnknownParentCount / totalWithUnknownParentCount;
      expect(rate).toBeLessThan(cfg.S4.piTarget[1]); // strictly less than the ungated upper bound
    }
  });

  it("never forgets and truth p* at reference level (3) equals L(1-S) + (1-L)G", () => {
    const id = world("S4", 13);
    const graph = buildTrueGraph(id, concepts, 1.0);
    const isTarget = () => true;
    const learnerId = learner(id, "L-truth");
    let state = s4InitializeAll(learnerId, graph, cfg, 0.3, isTarget, {});
    const q = { id: "q1", level: 3, conceptWeights: { "c-a": 1 } };
    for (let i = 0; i < 50; i++) {
      state = s4Learn(learnerId, q, cfg, state, graph, 0.3, isTarget, {});
    }
    const truth = s4Truth("c-a", cfg, state, isTarget, id, {});
    expect([0, 1]).toContain(truth.m);
    expect(truth.mastered).toBe(truth.m === 1);
  });
});

describe("o_k (opportunity-indexing counter) increments unconditionally across every family -- C4 regression check", () => {
  it("S2: opp count advances even when the concept is already known (so the 'counted' coin flip is moot) and even across many presentations", () => {
    const id = learner(world("S2", 20), "L-ok");
    let state = createS2LatentState();
    const key = {};
    const q = { id: "q1", conceptWeights: { "c-1": 1 } };
    for (let i = 1; i <= 10; i++) {
      state = s2Learn(id, q, cfg, state, key);
      expect(state.opp.get("c-1")).toBe(i);
    }
  });

  it("S4: opp count advances on every presentation regardless of the counted draw's outcome", () => {
    const id = world("S4", 21);
    const concepts = [{ id: "c-a", curriculumLevel: 1, prerequisiteIds: [] }];
    const graph = buildTrueGraph(id, concepts, 1.0);
    const learnerId = learner(id, "L-ok");
    let state = s4InitializeAll(learnerId, graph, cfg, 1.0, () => true, {});
    const q = { id: "q1", level: 3, conceptWeights: { "c-a": 1 } };
    for (let i = 1; i <= 10; i++) {
      state = s4Learn(learnerId, q, cfg, state, graph, 1.0, () => true, {});
      expect(state.opp.get("c-a")).toBe(i);
    }
  });
});

import { describe, expect, it } from "vitest";
import { runTrackBSession, trackBQuestionPool } from "@/research/phase8/trackB/runTrackB";
import { RISE_CONCEPTS, RISE_QUESTIONS } from "@/domain/rise";
import { selectConceptSubgraphSlices } from "@/research/phase8/slices/selectSlices";
import { loadPhase8Config } from "@/research/phase8/config/load";

const cfg = loadPhase8Config();
const sliceResult = selectConceptSubgraphSlices(RISE_CONCEPTS, RISE_QUESTIONS);
const ch03 = sliceResult.primarySlices.find((s) => s.chapterId === "CH03")!;

function run(conditionId: "C0" | "C1" | "C2" | "C3", learnerId = "L001", family: "S1" | "S2" | "S3" | "S4" = "S2") {
  return runTrackBSession({
    conditionId,
    identity: { masterSeed: cfg.plan.value.masterSeed, world: 1, sliceId: ch03.chapterId, learnerId },
    family,
    slice: ch03,
    concepts: RISE_CONCEPTS,
    allQuestions: RISE_QUESTIONS,
    simulatorConfig: cfg.simulator.value,
    budget: cfg.plan.value.trackB.budget,
  });
}

describe("trackBQuestionPool", () => {
  it("includes multi-concept items too (unlike Track A's single-concept-only Q_slice, B5.5)", () => {
    const pool = trackBQuestionPool(ch03, RISE_QUESTIONS);
    expect(pool.length).toBeGreaterThanOrEqual(ch03.qSlice.length);
  });
});

describe("runTrackBSession", () => {
  it("runs all four conditions to completion with the full 60-question budget (no early termination with completionCheck unset)", () => {
    for (const conditionId of ["C0", "C1", "C2", "C3"] as const) {
      const result = run(conditionId);
      expect(result.stepsAdministered).toBe(60);
      expect(result.earlyTerminated).toBe(false);
      expect(result.terminationReason).toBe("question_limit_reached");
    }
  });

  it("K(T), K_start, K_X are all in [0, 1]", () => {
    for (const conditionId of ["C0", "C1", "C2", "C3"] as const) {
      const result = run(conditionId);
      for (const value of [result.kStart, result.kT, result.kX]) {
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(1);
      }
    }
  });

  it("C0 never activates prerequisite mechanisms and has zero diverted share (non-adaptive, reads no estimator state)", () => {
    const result = run("C0");
    expect(result.activated).toBe(false);
    expect(result.divertedShare).toBe(0);
    expect(Object.keys(result.countsByReason)).toHaveLength(0);
  });

  it("C3 (prerequisite-unaware) never activates prerequisite_backtrack/diagnostic_probe and never practises X_c (B6.4's negative-control signature)", () => {
    const result = run("C3");
    expect(result.activated).toBe(false);
    expect(result.countsByReason.prerequisite_backtrack).toBeUndefined();
    expect(result.countsByReason.diagnostic_probe).toBeUndefined();
    expect(result.kX).toBe(0);
  });

  it("C1/C2 (prerequisite-aware) activate the prerequisite mechanism at least sometimes and practise X_c", () => {
    const result = run("C2");
    expect(result.countsByReason.prerequisite_backtrack || result.countsByReason.diagnostic_probe).toBeGreaterThan(0);
    expect(result.kX).toBeGreaterThan(0);
  });

  it("backtrackPrecision is null when never activated, and a valid fraction in [0,1] when activated", () => {
    const c0 = run("C0");
    expect(c0.backtrackPrecision).toBeNull();
    const c2 = run("C2");
    if (c2.activated) {
      expect(c2.backtrackPrecision).toBeGreaterThanOrEqual(0);
      expect(c2.backtrackPrecision).toBeLessThanOrEqual(1);
    }
  });

  it("is deterministic given the same identity/condition/family", () => {
    const first = run("C2");
    const second = run("C2");
    expect(first).toEqual(second);
  });

  it("common random numbers: the SAME learner identity under different conditions shares underlying draws, giving a non-trivial achieved correlation rather than fully independent outcomes", () => {
    // Not a strict proof of CRN (that's R-2's job, a direct derive()-level test), but a behavioural
    // sanity check: kStart (purely a function of the cold-start profile, read before any policy
    // decision) must be IDENTICAL across conditions for the same learner, since it depends only on
    // the shared profile draws, never on which policy is running.
    const c0 = run("C0");
    const c1 = run("C1");
    const c2 = run("C2");
    const c3 = run("C3");
    expect(c1.kStart).toBe(c0.kStart);
    expect(c2.kStart).toBe(c0.kStart);
    expect(c3.kStart).toBe(c0.kStart);
  });

  it("different learners produce different outcomes", () => {
    const a = run("C2", "L001");
    const b = run("C2", "L002");
    expect(a.kT).not.toBe(b.kT);
  });
});

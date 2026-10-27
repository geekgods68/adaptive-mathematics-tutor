import { describe, expect, it } from "vitest";
import {
  accumulateMisconceptionEvidence,
  type MisconceptionEvidenceRecord,
} from "@/domain/learner-model/misconceptionEvidence";

const T0 = "2026-10-30T00:00:00.000Z";

function record(overrides: Partial<MisconceptionEvidenceRecord> = {}): MisconceptionEvidenceRecord {
  return {
    questionId: "q-1",
    conceptId: "c1",
    selectedOptionId: "B",
    difficulty: 3,
    sequenceIndex: 0,
    timestamp: T0,
    ...overrides,
  };
}

describe("accumulateMisconceptionEvidence", () => {
  it("tallies a misconceptionId on its first occurrence", () => {
    const tally = accumulateMisconceptionEvidence({}, record({ misconceptionId: "M001" }));
    expect(tally).toEqual({ M001: 1 });
  });

  it("increments an existing tally rather than overwriting it", () => {
    let tally = accumulateMisconceptionEvidence({}, record({ misconceptionId: "M001" }));
    tally = accumulateMisconceptionEvidence(tally, record({ misconceptionId: "M001", sequenceIndex: 1 }));
    expect(tally).toEqual({ M001: 2 });
  });

  it("tracks multiple distinct misconceptions independently", () => {
    let tally = accumulateMisconceptionEvidence({}, record({ misconceptionId: "M001" }));
    tally = accumulateMisconceptionEvidence(tally, record({ misconceptionId: "M002", sequenceIndex: 1 }));
    expect(tally).toEqual({ M001: 1, M002: 1 });
  });

  it("leaves the tally byte-identical (===) when the record has no misconceptionId", () => {
    const tally = { M001: 3 };
    const result = accumulateMisconceptionEvidence(tally, record({ misconceptionId: undefined }));
    expect(result).toBe(tally);
  });

  it("does not mutate the input tally (pure function)", () => {
    const tally = { M001: 1 };
    const snapshot = { ...tally };
    accumulateMisconceptionEvidence(tally, record({ misconceptionId: "M001" }));
    expect(tally).toEqual(snapshot);
  });

  it("a single occurrence never implies a classification — the tally is only a count, with no derived verdict field", () => {
    const tally = accumulateMisconceptionEvidence({}, record({ misconceptionId: "M001" }));
    expect(Object.keys(tally)).toEqual(["M001"]);
    expect(typeof tally.M001).toBe("number");
  });

  it("preserves localErrorMechanism and questionFamily on the record without interpreting them (pass-through only)", () => {
    const r = record({ localErrorMechanism: "sign-flip on distribution", questionFamily: "fam-7" });
    expect(r.localErrorMechanism).toBe("sign-flip on distribution");
    expect(r.questionFamily).toBe("fam-7");
  });
});

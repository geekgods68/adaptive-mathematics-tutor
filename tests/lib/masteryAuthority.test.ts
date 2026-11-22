// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from "vitest";
import { resolveAuthoritativeMastery } from "@/lib/masteryAuthority";
import { writeMasteryState } from "@/lib/studentMasteryState";
import * as adaptiveActions from "@/app/adaptive-tutor/actions";
import type { PersistableConceptMasteryState } from "@/tutoring/adaptiveSession/masteryStateTransfer";

vi.mock("@/app/adaptive-tutor/actions", () => ({
  getCurrentMasteryStateAction: vi.fn(),
}));

const MODEL_VERSION = "v2-inverse-difficulty";

function fakeState(conceptId: string, mastery: number): PersistableConceptMasteryState {
  return {
    conceptId,
    mastery,
    initialMastery: 0.3,
    numObservations: 3,
    correctCount: 2,
    incorrectCount: 1,
    consecutiveCorrect: 1,
    consecutiveIncorrect: 0,
    modelVersion: MODEL_VERSION,
    createdAt: "2026-01-01T00:00:00.000Z",
    lastUpdatedAt: "2026-01-01T00:10:00.000Z",
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

describe("resolveAuthoritativeMastery — Stage 3 Priority 2", () => {
  it("a stale local snapshot CANNOT override newer authoritative (durable) mastery, even when the local value looks more recently written", () => {
    // The local snapshot claims a HIGHER, "fresher-looking" mastery and a later updatedAt than
    // what the durable record will report — if resolution were timestamp-based, the stale local
    // value could win. It must not: durable presence alone is decisive.
    writeMasteryState(MODEL_VERSION, { c1: fakeState("c1", 0.95) });
    vi.mocked(adaptiveActions.getCurrentMasteryStateAction).mockResolvedValue({
      ok: true,
      data: { hasRecord: true, modelVersion: MODEL_VERSION, persistableStates: { c1: fakeState("c1", 0.4) }, fromSessionId: "durable-session-1", fromCompletedAt: "2020-01-01T00:00:00.000Z" },
    });

    return resolveAuthoritativeMastery().then((resolved) => {
      expect(resolved.source).toBe("durable");
      expect(resolved.states.c1.mastery).toBe(0.4); // the durable value, NOT the local 0.95
      expect(resolved.fromSessionId).toBe("durable-session-1");
    });
  });

  it("falls back to the local snapshot only when no durable record exists yet for this participant", async () => {
    writeMasteryState(MODEL_VERSION, { c1: fakeState("c1", 0.6) });
    vi.mocked(adaptiveActions.getCurrentMasteryStateAction).mockResolvedValue({ ok: true, data: { hasRecord: false } });

    const resolved = await resolveAuthoritativeMastery();
    expect(resolved.source).toBe("local-fallback");
    expect(resolved.states.c1.mastery).toBe(0.6);
  });

  it("reports 'none' when neither a durable record nor a local snapshot exists", async () => {
    vi.mocked(adaptiveActions.getCurrentMasteryStateAction).mockResolvedValue({ ok: true, data: { hasRecord: false } });

    const resolved = await resolveAuthoritativeMastery();
    expect(resolved.source).toBe("none");
    expect(resolved.states).toEqual({});
  });

  it("degrades gracefully to the local snapshot if the durable lookup itself fails (network/server error), never throwing", async () => {
    writeMasteryState(MODEL_VERSION, { c1: fakeState("c1", 0.5) });
    vi.mocked(adaptiveActions.getCurrentMasteryStateAction).mockResolvedValue({ ok: false, error: "server unavailable" });

    const resolved = await resolveAuthoritativeMastery();
    expect(resolved.source).toBe("local-fallback");
    expect(resolved.states.c1.mastery).toBe(0.5);
  });

  it("once a durable record exists, a SUBSEQUENT local write (e.g. a stray old write) still cannot win on a later resolution", async () => {
    vi.mocked(adaptiveActions.getCurrentMasteryStateAction).mockResolvedValue({
      ok: true,
      data: { hasRecord: true, modelVersion: MODEL_VERSION, persistableStates: { c1: fakeState("c1", 0.7) }, fromSessionId: "s-later", fromCompletedAt: "2026-06-01T00:00:00.000Z" },
    });
    // Simulate a stray/old local write happening to exist with a DIFFERENT, newer-looking value.
    writeMasteryState(MODEL_VERSION, { c1: fakeState("c1", 0.99) });

    const resolved = await resolveAuthoritativeMastery();
    expect(resolved.source).toBe("durable");
    expect(resolved.states.c1.mastery).toBe(0.7);
  });
});

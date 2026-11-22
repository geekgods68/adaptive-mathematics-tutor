import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { getResearchDb, closeResearchDb } from "@/research/storage/db";
import { createDurableSessionStore } from "@/research/storage/durableSessionStore";
import type { StorableSessionEnvelope } from "@/research/storage/types";

function tempDbPath(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "stage2-store-test-"));
  return path.join(dir, "research.sqlite3");
}

interface FakeSession extends StorableSessionEnvelope {
  id: string;
  participantId: string;
  startedAt: string;
  completedAt?: string;
  experimentState: StorableSessionEnvelope["experimentState"];
}

function fakeSession(overrides: Partial<FakeSession["experimentState"]> = {}, id = "sess-1"): FakeSession {
  return {
    id,
    participantId: "participant-1",
    startedAt: "2026-01-01T00:00:00.000Z",
    experimentState: {
      conditionId: "C0",
      status: "active",
      sequenceIndex: 0,
      currentQuestionId: "Q1",
      presentedQuestionIds: ["Q1"],
      responses: [],
      estimatorStates: {},
      selectionTraces: [{ step: 0 }],
      estimatorTraces: [],
      ...overrides,
    },
  };
}

describe("durableSessionStore (Groups B/C/D/E/F)", () => {
  afterEach(() => {
    closeResearchDb();
  });

  it("Group B: a session survives a full close+reopen 'restart' boundary, not just a new in-process reference", () => {
    const dbPath = tempDbPath();
    const store = createDurableSessionStore<FakeSession>("c0", () => getResearchDb(dbPath));
    store.save(fakeSession());

    closeResearchDb(); // simulate server restart

    const store2 = createDurableSessionStore<FakeSession>("c0", () => getResearchDb(dbPath));
    const restored = store2.get("sess-1");
    expect(restored).toBeDefined();
    expect(restored!.experimentState.currentQuestionId).toBe("Q1");
  });

  it("Group E: event ordering is unambiguous, ids are unique, and events are only appended for real transitions", () => {
    const store = createDurableSessionStore<FakeSession>("c0", () => getResearchDb(":memory:"));
    store.save(fakeSession());
    store.save(
      fakeSession(
        {
          sequenceIndex: 0,
          responses: [{ sequenceIndex: 0, questionId: "Q1", isCorrect: true, timestamp: "2026-01-01T00:01:00.000Z" }],
        },
      ),
    );
    store.save(
      fakeSession({
        sequenceIndex: 1,
        currentQuestionId: "Q2",
        presentedQuestionIds: ["Q1", "Q2"],
        responses: [{ sequenceIndex: 0, questionId: "Q1", isCorrect: true, timestamp: "2026-01-01T00:01:00.000Z" }],
        selectionTraces: [{ step: 0 }, { step: 1 }],
      }),
    );

    const events = store.getEvents("sess-1");
    const seqs = events.map((e) => e.eventSeq);
    expect(seqs).toEqual([...seqs].sort((a, b) => a - b)); // strictly ordered
    expect(new Set(seqs).size).toBe(seqs.length); // unique
    expect(new Set(events.map((e) => e.eventId)).size).toBe(events.length); // globally unique ids
    expect(events.map((e) => e.eventType)).toContain("answer_submitted");
    expect(events.map((e) => e.eventType)).toContain("session_advanced");
    // No event was fabricated for a transition that didn't happen: no "estimator_updated"
    // when estimatorStates never changed.
    expect(events.map((e) => e.eventType)).not.toContain("estimator_updated");
  });

  it("Group F: re-saving the SAME unchanged session (e.g. a duplicated/retried write) appends NO new events", () => {
    const store = createDurableSessionStore<FakeSession>("c0", () => getResearchDb(":memory:"));
    const s = fakeSession();
    store.save(s);
    const countAfterFirst = store.getEvents("sess-1").length;
    store.save(s); // identical save again
    const countAfterSecond = store.getEvents("sess-1").length;
    expect(countAfterSecond).toBe(countAfterFirst);
  });

  it("Group B: listCompleted only returns terminated sessions, filterable by condition and participant", () => {
    const store = createDurableSessionStore<FakeSession>("c0", () => getResearchDb(":memory:"));
    store.save(fakeSession({ status: "active" }, "active-1"));
    store.save(fakeSession({ status: "terminated", currentQuestionId: null }, "done-1"));
    store.save({ ...fakeSession({ status: "terminated", currentQuestionId: null }, "done-2"), participantId: "participant-2" });

    const allCompleted = store.listCompleted();
    expect(allCompleted.map((r) => r.sessionId).sort()).toEqual(["done-1", "done-2"]);

    const byParticipant = store.listCompleted({ participantId: "participant-2" });
    expect(byParticipant.map((r) => r.sessionId)).toEqual(["done-2"]);
  });

  it("Group B: listActive returns only active sessions", () => {
    const store = createDurableSessionStore<FakeSession>("c0", () => getResearchDb(":memory:"));
    store.save(fakeSession({ status: "active" }, "active-1"));
    store.save(fakeSession({ status: "terminated", currentQuestionId: null }, "done-1"));
    expect(store.listActive().map((r) => r.sessionId)).toEqual(["active-1"]);
  });

  it("delete removes both the session row and its event log", () => {
    const store = createDurableSessionStore<FakeSession>("c0", () => getResearchDb(":memory:"));
    store.save(fakeSession());
    expect(store.get("sess-1")).toBeDefined();
    expect(store.getEvents("sess-1").length).toBeGreaterThan(0);
    store.delete("sess-1");
    expect(store.get("sess-1")).toBeUndefined();
    expect(store.getEvents("sess-1")).toEqual([]);
  });

  it("two independently constructed stores for different 'kind' partitions never see each other's sessions, even with the same session id", () => {
    const db = getResearchDb(":memory:");
    const c0Store = createDurableSessionStore<FakeSession>("c0", () => db);
    const c2Store = createDurableSessionStore<FakeSession>("c2", () => db);
    c0Store.save(fakeSession({}, "shared-id"));
    expect(c2Store.get("shared-id")).toBeUndefined();
    expect(c0Store.get("shared-id")).toBeDefined();
  });
});

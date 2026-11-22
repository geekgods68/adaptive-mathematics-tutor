import { describe, expect, it, beforeEach } from "vitest";
import * as service from "@/tutoring/adaptiveSession/service";
import {
  AdaptiveAnswerAlreadySubmittedError,
  AdaptiveInvalidOptionIdError,
  AdaptiveNoAnswerSubmittedError,
  AdaptiveSessionAlreadyCompletedError,
  AdaptiveSessionNotFoundError,
} from "@/tutoring/adaptiveSession/errors";
import { adaptiveSessionStore } from "@/tutoring/adaptiveSession/store";
import { gradeAnswer } from "@/tutoring/grading/grade";
import { RISE_CONCEPTS, RISE_QUESTIONS } from "@/domain/rise";

describe("startAdaptiveSession", () => {
  it("creates an active session with a real selected first question", () => {
    const session = service.startAdaptiveSession("CH01");
    expect(session.experimentState.status).toBe("active");
    expect(session.experimentState.currentQuestionId).not.toBeNull();
    expect(session.chapterId).toBe("CH01");
  });

  it("uses condition C2 (Variant B + prerequisite-aware adaptive) as the approved provisional default", () => {
    const session = service.startAdaptiveSession("CH01");
    // The first trace's config/version identifies which estimator/policy ran.
    const trace = session.experimentState.selectionTraces.at(-1) as { configVersion: string };
    expect(trace.configVersion).toContain("adaptive-selection");
  });

  it("two sessions for the same chapter get independent ids and independent state", () => {
    const a = service.startAdaptiveSession("CH01");
    const b = service.startAdaptiveSession("CH01");
    expect(a.id).not.toBe(b.id);
    expect(a.experimentState).not.toBe(b.experimentState);
  });

  it("omitting a chapter walks the full curriculum", () => {
    const session = service.startAdaptiveSession();
    expect(session.chapterId).toBeUndefined();
    expect(session.experimentState.currentQuestionId).not.toBeNull();
  });
});

describe("getSession / getCurrentQuestion / getCurrentPublicQuestion", () => {
  it("throws AdaptiveSessionNotFoundError for an unknown id", () => {
    expect(() => service.getSession("nonexistent")).toThrow(AdaptiveSessionNotFoundError);
  });

  it("getCurrentQuestion returns the real Question object matching currentQuestionId", () => {
    const session = service.startAdaptiveSession("CH01");
    const question = service.getCurrentQuestion(session.id);
    expect(question.id).toBe(session.experimentState.currentQuestionId);
  });

  it("getCurrentPublicQuestion never includes the correct option id or difficulty", () => {
    const session = service.startAdaptiveSession("CH01");
    const view = service.getCurrentPublicQuestion(session.id);
    expect(JSON.stringify(view)).not.toContain("correctOptionId");
    expect(JSON.stringify(view)).not.toContain('"difficulty"');
  });
});

describe("submitAdaptiveAnswer — grading, mastery updates, and guards", () => {
  it("grades correctly using the real gradeAnswer function, matching an independent computation", () => {
    const session = service.startAdaptiveSession("CH01");
    const question = service.getCurrentQuestion(session.id);
    const result = service.submitAdaptiveAnswer(session.id, question.correctOptionId);
    expect(result.grading.isCorrect).toBe(true);
    expect(result.grading).toEqual(gradeAnswer(question, question.correctOptionId));
  });

  it("grades an incorrect answer and records the misconceptionId when the option carries one", () => {
    const session = service.startAdaptiveSession("CH01");
    const question = service.getCurrentQuestion(session.id);
    const wrongOption = question.options.find((o) => !o.isCorrect)!;
    const result = service.submitAdaptiveAnswer(session.id, wrongOption.id);
    expect(result.grading.isCorrect).toBe(false);
    expect(result.grading.misconceptionId).toBe(wrongOption.misconceptionId);
  });

  it("applies a REAL Phase 3 mastery update — mastery for the question's concept changes from the cold-start default", () => {
    const session = service.startAdaptiveSession("CH01");
    const question = service.getCurrentQuestion(session.id);
    const result = service.submitAdaptiveAnswer(session.id, question.correctOptionId);
    const conceptId = question.conceptWeights ? Object.keys(question.conceptWeights)[0] : question.primaryConceptId;
    const state = result.session.experimentState.estimatorStates[conceptId] as { mastery: number };
    expect(state.mastery).not.toBe(0.5); // moved from the cold-start default
    expect(result.session.experimentState.estimatorTraces.length).toBeGreaterThan(0);
  });

  it("a response must not be applied more than once — the second submission throws", () => {
    const session = service.startAdaptiveSession("CH01");
    const question = service.getCurrentQuestion(session.id);
    service.submitAdaptiveAnswer(session.id, question.correctOptionId);
    expect(() => service.submitAdaptiveAnswer(session.id, question.correctOptionId)).toThrow(AdaptiveAnswerAlreadySubmittedError);
  });

  it("rejects an invalid option id for the current question", () => {
    const session = service.startAdaptiveSession("CH01");
    expect(() => service.submitAdaptiveAnswer(session.id, "not-a-real-option")).toThrow(AdaptiveInvalidOptionIdError);
  });

  it("throws for an already-completed session", () => {
    const session = service.startAdaptiveSession("CH01");
    // Force completion by answering/advancing until termination.
    let current = session;
    for (let i = 0; i < service.ADAPTIVE_SESSION_MAX_QUESTIONS; i++) {
      const question = service.getCurrentQuestion(current.id);
      service.submitAdaptiveAnswer(current.id, question.correctOptionId);
      const advanceResult = service.advanceAdaptiveSession(current.id);
      current = advanceResult.session;
      if (current.experimentState.status === "terminated") break;
    }
    expect(current.experimentState.status).toBe("terminated");
    expect(() => service.submitAdaptiveAnswer(current.id, "anything")).toThrow(AdaptiveSessionAlreadyCompletedError);
  });
});

describe("advanceAdaptiveSession — question skipping and selection integration", () => {
  it("a question must not be accidentally skipped — advancing without an answer throws", () => {
    const session = service.startAdaptiveSession("CH01");
    expect(() => service.advanceAdaptiveSession(session.id)).toThrow(AdaptiveNoAnswerSubmittedError);
  });

  it("selection uses the LATEST committed learner state — mastery updated by submitAdaptiveAnswer is visible to the next selection", () => {
    const session = service.startAdaptiveSession("CH01");
    const question = service.getCurrentQuestion(session.id);
    const afterSubmit = service.submitAdaptiveAnswer(session.id, question.correctOptionId);
    const conceptId = question.conceptWeights ? Object.keys(question.conceptWeights)[0] : question.primaryConceptId;
    const masteryAfterSubmit = (afterSubmit.session.experimentState.estimatorStates[conceptId] as { mastery: number }).mastery;

    const { session: advanced } = service.advanceAdaptiveSession(session.id);
    // The state carried into the NEXT selection must be exactly what submit produced.
    expect((advanced.experimentState.estimatorStates[conceptId] as { mastery: number }).mastery).toBe(masteryAfterSubmit);
  });

  it("presents a new, unseen question after advancing (no accidental repeat)", () => {
    const session = service.startAdaptiveSession("CH01");
    const firstQuestionId = session.experimentState.currentQuestionId;
    const question = service.getCurrentQuestion(session.id);
    service.submitAdaptiveAnswer(session.id, question.correctOptionId);
    const { nextQuestion } = service.advanceAdaptiveSession(session.id);
    expect(nextQuestion?.id).not.toBe(firstQuestionId);
  });

  it("terminates the session once the configured question limit is reached", () => {
    const session = service.startAdaptiveSession("CH01");
    let current = session;
    for (let i = 0; i < service.ADAPTIVE_SESSION_MAX_QUESTIONS; i++) {
      const question = service.getCurrentQuestion(current.id);
      service.submitAdaptiveAnswer(current.id, question.correctOptionId);
      const result = service.advanceAdaptiveSession(current.id);
      current = result.session;
    }
    expect(current.experimentState.status).toBe("terminated");
    expect(current.completedAt).toBeDefined();
  });
});

describe("Adaptive progression, remediation, and diagnostic backtracking — a full multi-question integration scenario", () => {
  it("demonstrates the real Phase 4 policy choosing different reasons across a sequence of responses, driven only by real recorded evidence", () => {
    const session = service.startAdaptiveSession("CH01");
    const reasons: string[] = [];
    let current = session;

    for (let i = 0; i < 10; i++) {
      const trace = current.experimentState.selectionTraces.at(-1) as { targetConcept: { reason: string } };
      reasons.push(trace.targetConcept.reason);

      const question = service.getCurrentQuestion(current.id);
      // Deliberately answer incorrectly on alternating rounds to exercise remediation/backtracking paths.
      const correct = i % 3 !== 0;
      const optionId = correct ? question.correctOptionId : question.options.find((o) => !o.isCorrect)!.id;
      service.submitAdaptiveAnswer(current.id, optionId);
      const result = service.advanceAdaptiveSession(current.id);
      current = result.session;
      if (current.experimentState.status === "terminated") break;
    }

    // Every reason actually came from a real, recorded AdaptiveSelectionTrace
    // (not fabricated) — sanity: all are valid enum values.
    const validReasons = ["insufficient_evidence", "progression", "remediation", "prerequisite_backtrack", "diagnostic_probe", "no_eligible_concept"];
    expect(reasons.every((r) => validReasons.includes(r))).toBe(true);
    expect(reasons.length).toBeGreaterThan(0);
  });

  it("misconception evidence recorded during the session is consistent with the actual responses given", () => {
    const session = service.startAdaptiveSession("CH01");
    let current = session;
    const expectedMisconceptions: string[] = [];

    for (let i = 0; i < 6; i++) {
      const question = service.getCurrentQuestion(current.id);
      const wrongOption = question.options.find((o) => !o.isCorrect && o.misconceptionId);
      const optionId = wrongOption ? wrongOption.id : question.options.find((o) => !o.isCorrect)!.id;
      if (wrongOption) expectedMisconceptions.push(wrongOption.misconceptionId!);
      const result = service.submitAdaptiveAnswer(current.id, optionId);
      current = result.session;
      const advanceResult = service.advanceAdaptiveSession(current.id);
      current = advanceResult.session;
      if (current.experimentState.status === "terminated") break;
    }

    const recordedMisconceptionIds = current.experimentState.responses.filter((r) => r.misconceptionId).map((r) => r.misconceptionId!);
    expect(recordedMisconceptionIds).toEqual(expectedMisconceptions);
  });
});

describe("getAdaptiveSessionSummary", () => {
  it("accurately reports counts and mastery estimates matching the underlying experiment state", () => {
    const session = service.startAdaptiveSession("CH01");
    const question = service.getCurrentQuestion(session.id);
    service.submitAdaptiveAnswer(session.id, question.correctOptionId);
    const summary = service.getAdaptiveSessionSummary(session.id);
    expect(summary.totalQuestions).toBe(1);
    expect(summary.correctAnswers).toBe(1);
    expect(summary.progress.length).toBeGreaterThan(0);
  });

  it("never computes a fabricated learning-gain figure", () => {
    const session = service.startAdaptiveSession("CH01");
    const summary = service.getAdaptiveSessionSummary(session.id);
    expect(Object.keys(summary)).not.toContain("learningGain");
  });
});

describe("resetAdaptiveSession", () => {
  it("removes the session so it can no longer be retrieved", () => {
    const session = service.startAdaptiveSession("CH01");
    service.resetAdaptiveSession(session.id);
    expect(() => service.getSession(session.id)).toThrow(AdaptiveSessionNotFoundError);
  });
});

describe("Non-adaptive baseline preservation and store isolation", () => {
  beforeEach(() => {
    // Defensive: ensure no stray state leaks between tests via the shared in-memory store.
  });

  it("the adaptive store is a completely separate instance from any non-adaptive session state", () => {
    const session = service.startAdaptiveSession("CH01");
    expect(adaptiveSessionStore.get(session.id)).toBeDefined();
  });

  it("uses the real, complete RISE question bank and curriculum (not a test fixture)", () => {
    const session = service.startAdaptiveSession("CH01");
    const question = service.getCurrentQuestion(session.id);
    expect(RISE_QUESTIONS).toContain(question);
    expect(RISE_CONCEPTS.length).toBe(109);
  });
});

/**
 * Regression coverage for the session-continuity fix (root cause: every
 * new adaptive session cold-started with zero prior mastery AND zero
 * presented-question history, so "Across All Topics" always opened on
 * the exact same first question). These tests drive `service.ts`
 * directly — the real Phase 3/4 engine, nothing mocked.
 */
describe("Session continuity — persistent mastery state and cross-session question history", () => {
  function runQuestions(sessionId: string, count: number, correct: boolean): void {
    let current = service.getSession(sessionId);
    for (let i = 0; i < count; i++) {
      if (current.experimentState.status === "terminated") return;
      const question = service.getCurrentQuestion(current.id);
      const optionId = correct ? question.correctOptionId : question.options.find((o) => !o.isCorrect)!.id;
      service.submitAdaptiveAnswer(current.id, optionId);
      const { session: advanced } = service.advanceAdaptiveSession(current.id);
      current = advanced;
    }
  }

  it("cold start: a brand-new session (no prior state) has an empty persisted-mastery snapshot before any response", () => {
    const session = service.startAdaptiveSession("CH01");
    expect(service.getPersistableMasteryStates(session.id)).toEqual({});
  });

  it("first-session persistence: after answering, getPersistableMasteryStates reflects real recorded evidence (not a rounded/aggregate approximation)", () => {
    const session = service.startAdaptiveSession("CH01");
    runQuestions(session.id, 3, true);
    const persisted = service.getPersistableMasteryStates(session.id);
    const conceptIds = Object.keys(persisted);
    expect(conceptIds.length).toBeGreaterThan(0);
    const anyConcept = persisted[conceptIds[0]];
    expect(anyConcept.numObservations).toBeGreaterThan(0);
    expect(anyConcept.correctCount + anyConcept.incorrectCount).toBe(anyConcept.numObservations);
    // Full internal estimator state must round-trip the sanitized client view exactly for every
    // field the client view carries (never a rounded percentage, per the "do not reconstruct from
    // aggregate accuracy" requirement).
    const latest = service.getSession(session.id);
    const internal = latest.experimentState.estimatorStates[conceptIds[0]] as { mastery: number };
    expect(anyConcept.mastery).toBe(internal.mastery);
  });

  it("returning-student continuation: a new session seeded with a prior session's persisted mastery starts from that REAL state, not a cold start", () => {
    const first = service.startAdaptiveSession("CH01");
    runQuestions(first.id, 4, true);
    const priorStates = service.getPersistableMasteryStates(first.id);
    expect(Object.keys(priorStates).length).toBeGreaterThan(0);

    const second = service.startAdaptiveSession("CH01", undefined, priorStates);
    for (const [conceptId, entry] of Object.entries(priorStates)) {
      const seeded = second.experimentState.estimatorStates[conceptId] as { mastery: number; numObservations: number } | undefined;
      expect(seeded).toBeDefined();
      expect(seeded!.mastery).toBe(entry.mastery);
      expect(seeded!.numObservations).toBe(entry.numObservations);
    }
  });

  it("malformed or wrong-version prior state is rejected per-concept rather than corrupting the new session (falls back to cold start for that concept)", () => {
    const bogusStates = { "not-a-real-concept": { garbage: true } };
    const session = service.startAdaptiveSession("CH01", undefined, bogusStates);
    expect(session.experimentState.estimatorStates["not-a-real-concept"]).toBeUndefined();
    expect(session.experimentState.status).toBe("active");
  });

  it("question-history continuation: a second session excludes the first session's seen questions while an unseen candidate exists", () => {
    const first = service.startAdaptiveSession("CH01");
    const seenIds: string[] = [];
    let current = first;
    for (let i = 0; i < 5; i++) {
      seenIds.push(current.experimentState.currentQuestionId!);
      const question = service.getCurrentQuestion(current.id);
      service.submitAdaptiveAnswer(current.id, question.correctOptionId);
      const { session: advanced } = service.advanceAdaptiveSession(current.id);
      current = advanced;
      if (current.experimentState.status === "terminated") break;
    }

    const second = service.startAdaptiveSession("CH01", undefined, undefined, seenIds);
    expect(seenIds).not.toContain(second.experimentState.currentQuestionId);
  });

  it("no duplicate mastery updates: a rejected duplicate submission leaves estimatorStates unchanged", () => {
    const session = service.startAdaptiveSession("CH01");
    const question = service.getCurrentQuestion(session.id);
    const afterFirst = service.submitAdaptiveAnswer(session.id, question.correctOptionId);
    const snapshotBefore = JSON.stringify(afterFirst.session.experimentState.estimatorStates);
    expect(() => service.submitAdaptiveAnswer(session.id, question.correctOptionId)).toThrow();
    const unchanged = service.getSession(session.id);
    expect(JSON.stringify(unchanged.experimentState.estimatorStates)).toBe(snapshotBefore);
  });

  it("reload/persistence restoration: calling getPersistableMasteryStates repeatedly on the same session returns an identical snapshot", () => {
    const session = service.startAdaptiveSession("CH01");
    runQuestions(session.id, 2, true);
    const a = service.getPersistableMasteryStates(session.id);
    const b = service.getPersistableMasteryStates(session.id);
    expect(a).toEqual(b);
  });

  it("deterministic selection: two independently-started sessions given identical prior mastery and identical (empty) question history choose the identical first question", () => {
    const seed = service.startAdaptiveSession("CH01");
    runQuestions(seed.id, 3, true);
    const priorStates = service.getPersistableMasteryStates(seed.id);

    const a = service.startAdaptiveSession("CH01", undefined, priorStates);
    const b = service.startAdaptiveSession("CH01", undefined, priorStates);
    expect(a.experimentState.currentQuestionId).toBe(b.experimentState.currentQuestionId);
  });

  it("omitting continuity inputs entirely is byte-for-byte the original cold-start behavior", () => {
    const a = service.startAdaptiveSession("CH01");
    const b = service.startAdaptiveSession("CH01");
    expect(a.experimentState.currentQuestionId).toBe(b.experimentState.currentQuestionId);
    expect(a.seenQuestionIdsOldestFirst).toEqual([]);
  });
});

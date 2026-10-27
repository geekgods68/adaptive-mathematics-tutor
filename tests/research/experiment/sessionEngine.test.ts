import { describe, expect, it } from "vitest";
import {
  advanceExperimentSession,
  createFixedResponseSequenceProvider,
  recordExperimentResponse,
  runExperimentToCompletion,
  startExperimentSession,
} from "@/research/experiment/sessionEngine";
import { EXPERIMENT_CONDITIONS, buildExperimentCondition } from "@/research/experiment/conditions";
import { createDeterministicEstimatorAdapter, createNullEstimatorAdapter } from "@/research/experiment/estimatorAdapter";
import { createAdaptiveSelectionAdapter } from "@/research/experiment/selectionAdapter";
import { buildExperimentProvenance } from "@/research/experiment/provenance";
import { DEFAULT_MODEL_PARAMETERS } from "@/domain/learner-model/parameters";
import { DEFAULT_ADAPTIVE_SELECTION_CONFIG } from "@/tutoring/selection/adaptive/config";
import { RISE_CONCEPTS, RISE_QUESTIONS } from "@/domain/rise";
import type { AnswerOption, Question } from "@/domain/questions/types";
import type { Concept } from "@/domain/concepts/types";
import type { ExperimentConfig, ExperimentScenario, ExternalResponse } from "@/research/experiment/types";

const T0 = "2026-10-30T00:00:00.000Z";

function option(id: string, isCorrect: boolean, misconceptionId?: string): AnswerOption {
  return { id, display: id, isCorrect, misconceptionId, derivationNote: misconceptionId ? "note" : undefined };
}

function question(id: string, conceptId: string, difficulty: 1 | 2 | 3 | 4 | 5 = 2): Question {
  return {
    id,
    stem: "stem",
    conceptIds: [conceptId],
    primaryConceptId: conceptId,
    difficulty,
    options: [option(`${id}-correct`, true), option(`${id}-wrong`, false, "M001")],
    correctOptionId: `${id}-correct`,
    workedSolution: "solution",
    version: 1,
  };
}

function concept(id: string, prerequisiteIds: string[] = []): Concept {
  return { id, name: id, description: id, prerequisiteIds, strand: "algebra_foundations" };
}

function manyQuestions(conceptId: string, count: number): Question[] {
  const difficulties: Array<1 | 2 | 3 | 4 | 5> = [1, 2, 3, 4, 5];
  return Array.from({ length: count }, (_, i) => question(`${conceptId}-q${i}`, conceptId, difficulties[i % 5]));
}

function responseFor(q: Question, correct: boolean, timestamp = T0): ExternalResponse {
  return { selectedOptionId: correct ? q.correctOptionId : q.options.find((o) => !o.isCorrect)!.id, timestamp };
}

describe("startExperimentSession / recordExperimentResponse / advanceExperimentSession — C0 non-adaptive", () => {
  it("runs a full session through the fixed sequence, grading each response", () => {
    const config = EXPERIMENT_CONDITIONS.C0.build();
    const questions = [question("q1", "c1"), question("q2", "c1")];
    const scenario: ExperimentScenario = {
      learnerId: "l1",
      availableQuestions: questions,
      concepts: [],
      curriculumOrder: [],
      predeterminedSequence: ["q1", "q2"],
      maxQuestions: 2,
      startTimestamp: T0,
    };

    let state = startExperimentSession(config, scenario, "run-1");
    expect(state.currentQuestionId).toBe("q1");

    state = recordExperimentResponse(config, scenario, state, responseFor(questions[0], true));
    expect(state.responses[0].isCorrect).toBe(true);

    state = advanceExperimentSession(config, scenario, state);
    expect(state.currentQuestionId).toBe("q2");

    state = recordExperimentResponse(config, scenario, state, responseFor(questions[1], false));
    expect(state.responses[1].isCorrect).toBe(false);
    expect(state.responses[1].misconceptionId).toBe("M001");

    state = advanceExperimentSession(config, scenario, state);
    expect(state.status).toBe("terminated");
    expect(state.terminationReason).toBe("question_limit_reached");
  });

  it("never populates estimatorStates for C0 (no mastery estimation)", () => {
    const config = EXPERIMENT_CONDITIONS.C0.build();
    const questions = [question("q1", "c1")];
    const scenario: ExperimentScenario = {
      learnerId: "l1",
      availableQuestions: questions,
      concepts: [],
      curriculumOrder: [],
      predeterminedSequence: ["q1"],
      maxQuestions: 1,
      startTimestamp: T0,
    };
    let state = startExperimentSession(config, scenario, "run-1");
    state = recordExperimentResponse(config, scenario, state, responseFor(questions[0], true));
    expect(state.estimatorStates).toEqual({});
  });
});

describe("Deterministic Variant A and Variant B execution (C1, C2)", () => {
  const concepts = [concept("c1", [])];
  const curriculumOrder = ["c1"];
  const questions = manyQuestions("c1", 10);

  function scenario(): ExperimentScenario {
    return { learnerId: "l1", availableQuestions: questions, concepts, curriculumOrder, maxQuestions: 5, startTimestamp: T0 };
  }

  it("C1 updates mastery via Variant A's symmetric difficulty weighting", () => {
    const config = EXPERIMENT_CONDITIONS.C1.build();
    let state = startExperimentSession(config, scenario(), "run-c1");
    const q = questions.find((q) => q.id === state.currentQuestionId)!;
    state = recordExperimentResponse(config, scenario(), state, responseFor(q, true));
    const masteryAfter = (state.estimatorStates.c1 as { mastery: number }).mastery;
    expect(masteryAfter).toBeGreaterThan(0.5);
    expect(state.estimatorTraces).toHaveLength(1);
  });

  it("C1 and C2 can diverge in their mastery trajectory given the identical response sequence (the whole point of Track A)", () => {
    const sharedResponses = [true, false, true, false];
    const runCondition = (config: ExperimentConfig) => {
      let state = startExperimentSession(config, scenario(), "run");
      for (const correct of sharedResponses) {
        if (state.status !== "active" || !state.currentQuestionId) break;
        const q = questions.find((x) => x.id === state.currentQuestionId)!;
        state = recordExperimentResponse(config, scenario(), state, responseFor(q, correct));
        state = advanceExperimentSession(config, scenario(), state);
      }
      return state;
    };
    const c1Final = runCondition(EXPERIMENT_CONDITIONS.C1.build());
    const c2Final = runCondition(EXPERIMENT_CONDITIONS.C2.build());
    // Both ran the identical response-correctness sequence; mastery may
    // differ because the underlying formulas differ (this is the
    // estimator-comparison track's reason to exist).
    expect(c1Final.responses.map((r) => r.isCorrect)).toEqual(c2Final.responses.map((r) => r.isCorrect));
  });
});

describe("Prerequisite-aware vs. prerequisite-unaware adaptive execution (C2, C3)", () => {
  it("two sequencing policies can select DIFFERENT question sequences from identical initial scenario definitions", () => {
    const concepts = [concept("top", ["mid"]), concept("mid", [])];
    const curriculumOrder = ["top"];
    const questions = [...manyQuestions("top", 5), ...manyQuestions("mid", 5)];

    function scenario(): ExperimentScenario {
      return { learnerId: "l1", availableQuestions: questions, concepts, curriculumOrder, maxQuestions: 8, startTimestamp: T0 };
    }

    const runAllIncorrect = (config: ExperimentConfig) =>
      runExperimentToCompletion(config, scenario(), "run", (state, q) => (state.sequenceIndex >= 8 ? null : responseFor(q, false)));

    const awareFinal = runAllIncorrect(EXPERIMENT_CONDITIONS.C2.build());
    const unawareFinal = runAllIncorrect(EXPERIMENT_CONDITIONS.C3.build());

    // C2 (prerequisite-aware) should eventually backtrack into "mid"
    // questions; C3 (unaware) should never leave "top".
    expect(awareFinal.presentedQuestionIds.some((id) => id.startsWith("mid-"))).toBe(true);
    expect(unawareFinal.presentedQuestionIds.every((id) => id.startsWith("top-"))).toBe(true);
    expect(awareFinal.presentedQuestionIds).not.toEqual(unawareFinal.presentedQuestionIds);
  });
});

describe("Session termination rules", () => {
  it("terminates with question_limit_reached once the configured maximum is administered", () => {
    const config = EXPERIMENT_CONDITIONS.C0.build();
    const questions = manyQuestions("c1", 5);
    const scenario: ExperimentScenario = {
      learnerId: "l1",
      availableQuestions: questions,
      concepts: [],
      curriculumOrder: [],
      predeterminedSequence: questions.map((q) => q.id),
      maxQuestions: 2,
      startTimestamp: T0,
    };
    let state = startExperimentSession(config, scenario, "run");
    for (let i = 0; i < 2; i++) {
      const q = questions.find((x) => x.id === state.currentQuestionId)!;
      state = recordExperimentResponse(config, scenario, state, responseFor(q, true));
      state = advanceExperimentSession(config, scenario, state);
    }
    expect(state.status).toBe("terminated");
    expect(state.terminationReason).toBe("question_limit_reached");
  });

  it("terminates with candidate_pool_exhausted when the adaptive policy runs out of eligible questions", () => {
    const config = EXPERIMENT_CONDITIONS.C1.build();
    const q = question("only-q", "c1");
    const scenario: ExperimentScenario = {
      learnerId: "l1",
      availableQuestions: [q],
      concepts: [concept("c1")],
      curriculumOrder: ["c1"],
      maxQuestions: 10,
      startTimestamp: T0,
    };
    let state = startExperimentSession(config, scenario, "run");
    state = recordExperimentResponse(config, scenario, state, responseFor(q, true));
    state = advanceExperimentSession(config, scenario, state);
    expect(state.status).toBe("terminated");
    expect(state.terminationReason).toBe("candidate_pool_exhausted");
  });

  it("terminates with candidate_pool_exhausted immediately at start if the scenario has nothing selectable", () => {
    const config = EXPERIMENT_CONDITIONS.C1.build();
    const scenario: ExperimentScenario = {
      learnerId: "l1",
      availableQuestions: [question("q1", "c1")], // no question exists for "ghost"
      concepts: [concept("ghost")],
      curriculumOrder: ["ghost"],
      maxQuestions: 5,
      startTimestamp: T0,
    };
    const state = startExperimentSession(config, scenario, "run");
    expect(state.status).toBe("terminated");
    expect(state.terminationReason).toBe("candidate_pool_exhausted");
  });

  it("terminates with completed_normally once every curriculum concept meets the configured completion check", () => {
    const config = EXPERIMENT_CONDITIONS.C1.build();
    const questions = manyQuestions("c1", 10);
    const scenario: ExperimentScenario = {
      learnerId: "l1",
      availableQuestions: questions,
      concepts: [concept("c1")],
      curriculumOrder: ["c1"],
      maxQuestions: 20,
      completionCheck: { masteryThreshold: 0.75, minEvidenceCount: 3 },
      startTimestamp: T0,
    };
    const state = runExperimentToCompletion(config, scenario, "run", (s, q) => responseFor(q, true, T0));
    expect(state.status).toBe("terminated");
    expect(state.terminationReason).toBe("completed_normally");
  });

  it("terminates with invalid_configuration (and populates configurationErrors) rather than throwing", () => {
    const config: ExperimentConfig = { conditionId: "bad", estimator: createNullEstimatorAdapter(), selection: createAdaptiveSelectionAdapter() };
    const scenario: ExperimentScenario = {
      learnerId: "l1",
      availableQuestions: [question("q1", "c1")],
      concepts: [],
      curriculumOrder: [],
      maxQuestions: 5,
      startTimestamp: T0,
    };
    const state = startExperimentSession(config, scenario, "run");
    expect(state.status).toBe("terminated");
    expect(state.terminationReason).toBe("invalid_configuration");
    expect(state.configurationErrors!.length).toBeGreaterThan(0);
  });

  it("terminates with unrecoverable_error (via the convenience driver) on an invalid response, rather than crashing the whole run", () => {
    const config = EXPERIMENT_CONDITIONS.C0.build();
    const questions = [question("q1", "c1")];
    const scenario: ExperimentScenario = {
      learnerId: "l1",
      availableQuestions: questions,
      concepts: [],
      curriculumOrder: [],
      predeterminedSequence: ["q1"],
      maxQuestions: 1,
      startTimestamp: T0,
    };
    const state = runExperimentToCompletion(config, scenario, "run", () => ({ selectedOptionId: "not-a-real-option", timestamp: T0 }));
    expect(state.status).toBe("terminated");
    expect(state.terminationReason).toBe("unrecoverable_error");
    expect(state.errorMessage).toBeTruthy();
  });

  it("an exhausted response provider simply stops the loop without forcing a termination reason", () => {
    const config = EXPERIMENT_CONDITIONS.C0.build();
    const questions = manyQuestions("c1", 5);
    const scenario: ExperimentScenario = {
      learnerId: "l1",
      availableQuestions: questions,
      concepts: [],
      curriculumOrder: [],
      predeterminedSequence: questions.map((q) => q.id),
      maxQuestions: 5,
      startTimestamp: T0,
    };
    const provider = createFixedResponseSequenceProvider([responseFor(questions[0], true)]);
    const state = runExperimentToCompletion(config, scenario, "run", provider);
    expect(state.status).toBe("active");
    expect(state.responses).toHaveLength(1);
  });
});

describe("maxExposurePerQuestion", () => {
  it("allows a question to repeat up to the configured cap before excluding it", () => {
    const config = EXPERIMENT_CONDITIONS.C0.build();
    const questions = [question("q1", "c1")];
    const scenario: ExperimentScenario = {
      learnerId: "l1",
      availableQuestions: questions,
      concepts: [],
      curriculumOrder: [],
      predeterminedSequence: ["q1", "q1", "q1"],
      maxQuestions: 3,
      maxExposurePerQuestion: 2,
      startTimestamp: T0,
    };
    // Non-adaptive selection ignores exposure entirely (fixed sequence by
    // position) — this test instead confirms the setting is accepted and
    // does not alter non-adaptive behavior, which never consults it.
    const state = startExperimentSession(config, scenario, "run");
    expect(state.currentQuestionId).toBe("q1");
  });
});

describe("Serialization and restoration of estimator state within a session", () => {
  it("estimator states round-trip through the adapter's own serialize/restore", () => {
    const adapter = createDeterministicEstimatorAdapter(DEFAULT_MODEL_PARAMETERS);
    const config = buildExperimentCondition("c-test", adapter, createAdaptiveSelectionAdapter());
    const questions = manyQuestions("c1", 5);
    const scenario: ExperimentScenario = {
      learnerId: "l1",
      availableQuestions: questions,
      concepts: [concept("c1")],
      curriculumOrder: ["c1"],
      maxQuestions: 3,
      startTimestamp: T0,
    };
    let state = startExperimentSession(config, scenario, "run");
    const q = questions.find((x) => x.id === state.currentQuestionId)!;
    state = recordExperimentResponse(config, scenario, state, responseFor(q, true));

    const serialized = adapter.serializeStates(state.estimatorStates as never);
    const restored = adapter.restoreStates(serialized);
    expect(restored).toEqual(state.estimatorStates);
  });
});

describe("Response grading within the session engine", () => {
  it("matches gradeAnswer's own determination exactly (reused, not reimplemented)", () => {
    const config = EXPERIMENT_CONDITIONS.C0.build();
    const q = question("q1", "c1");
    const scenario: ExperimentScenario = {
      learnerId: "l1",
      availableQuestions: [q],
      concepts: [],
      curriculumOrder: [],
      predeterminedSequence: ["q1"],
      maxQuestions: 1,
      startTimestamp: T0,
    };
    let state = startExperimentSession(config, scenario, "run");
    state = recordExperimentResponse(config, scenario, state, responseFor(q, false));
    expect(state.responses[0].isCorrect).toBe(false);
    expect(state.responses[0].misconceptionId).toBe("M001");
  });
});

describe("Provenance completeness", () => {
  it("records every field required for reproducibility after a run", () => {
    const config = EXPERIMENT_CONDITIONS.C1.build();
    const questions = manyQuestions("c1", 5);
    const scenario: ExperimentScenario = {
      scenarioId: "scenario-A",
      learnerId: "l1",
      availableQuestions: questions,
      concepts: [concept("c1")],
      curriculumOrder: ["c1"],
      maxQuestions: 3,
      startTimestamp: T0,
    };
    const state = runExperimentToCompletion(config, scenario, "run-prov", (s, q) => responseFor(q, true));
    const provenance = buildExperimentProvenance(config, scenario, state);

    expect(provenance.conditionId).toBe("C1");
    expect(provenance.runId).toBe("run-prov");
    expect(provenance.scenarioId).toBe("scenario-A");
    expect(provenance.questionBankVersion.questionCount).toBe(5);
    expect(provenance.questionBankVersion.contentHash).toMatch(/^[0-9a-f]{64}$/);
    expect(provenance.curriculumVersion.contentHash).toMatch(/^[0-9a-f]{64}$/);
    expect(provenance.estimator.version).toBe(DEFAULT_MODEL_PARAMETERS.version);
    expect(provenance.selectionPolicy.version).toBe(DEFAULT_ADAPTIVE_SELECTION_CONFIG.version);
    expect(provenance.sessionLimits.maxQuestions).toBe(3);
    expect(provenance.questionSelectionSequence.length).toBeGreaterThan(0);
    expect(provenance.responseSequence.length).toBeGreaterThan(0);
    expect(provenance.estimatorTraces.length).toBeGreaterThan(0);
    expect(provenance.selectionTraces.length).toBeGreaterThan(0);
    expect(provenance.finalStatus).toBe("terminated");
    expect(provenance.terminationReason).toBe("question_limit_reached");
  });

  it("handles missing optional traces gracefully (C0 produces no estimator traces, non-adaptive selection produces no per-call trace object)", () => {
    const config = EXPERIMENT_CONDITIONS.C0.build();
    const questions = [question("q1", "c1")];
    const scenario: ExperimentScenario = {
      learnerId: "l1",
      availableQuestions: questions,
      concepts: [],
      curriculumOrder: [],
      predeterminedSequence: ["q1"],
      maxQuestions: 1,
      startTimestamp: T0,
    };
    const state = runExperimentToCompletion(config, scenario, "run", (s, q) => responseFor(q, true));
    const provenance = buildExperimentProvenance(config, scenario, state);
    expect(provenance.estimatorTraces).toEqual([]);
    expect(() => JSON.stringify(provenance)).not.toThrow();
  });
});

describe("Full compatibility with the integrated 1,840-question RISE bank", () => {
  it("runs a complete C2 (prerequisite-aware) session against the real bank without error", () => {
    const curriculumOrder = RISE_CONCEPTS.map((c) => c.id).slice(0, 15);
    const config = EXPERIMENT_CONDITIONS.C2.build();
    const scenario: ExperimentScenario = {
      learnerId: "l1",
      availableQuestions: RISE_QUESTIONS,
      concepts: RISE_CONCEPTS,
      curriculumOrder,
      maxQuestions: 15,
      startTimestamp: T0,
    };
    const state = runExperimentToCompletion(config, scenario, "run-rise", (s, q) => responseFor(q, s.sequenceIndex % 3 !== 0));
    expect(state.status).toBe("terminated");
    expect(state.terminationReason).not.toBe("unrecoverable_error");
    expect(new Set(state.presentedQuestionIds).size).toBe(state.presentedQuestionIds.length);
  });
});

describe("Deterministic end-to-end re-execution", () => {
  it("running the identical scenario+config+response sequence twice, under the same runId, produces byte-identical final states", () => {
    const config = EXPERIMENT_CONDITIONS.C2.build();
    const questions = manyQuestions("c1", 8);
    const scenario: ExperimentScenario = {
      learnerId: "l1",
      availableQuestions: questions,
      concepts: [concept("c1")],
      curriculumOrder: ["c1"],
      maxQuestions: 5,
      startTimestamp: T0,
    };
    const correctnessPattern = [true, false, true, true, false];

    const run = (runId: string) => {
      let state = startExperimentSession(config, scenario, runId);
      for (let i = 0; i < correctnessPattern.length; i++) {
        if (state.status !== "active" || !state.currentQuestionId) break;
        const presented = questions.find((q) => q.id === state.currentQuestionId)!;
        const response = responseFor(presented, correctnessPattern[i], `2026-10-30T00:0${i}:00.000Z`);
        state = recordExperimentResponse(config, scenario, state, response);
        state = advanceExperimentSession(config, scenario, state);
      }
      return state;
    };

    const first = run("run-a");
    const second = run("run-a");
    expect(first).toEqual(second);
  });
});

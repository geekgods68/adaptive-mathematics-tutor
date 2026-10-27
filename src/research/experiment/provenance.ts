import { createHash } from "node:crypto";
import type { Concept } from "@/domain/concepts/types";
import type { Question } from "@/domain/questions/types";
import type { ExperimentConfig, ExperimentScenario, ExperimentSessionState } from "@/research/experiment/types";

export interface ExperimentProvenance {
  conditionId: string;
  runId: string;
  scenarioId?: string;
  questionBankVersion: { questionCount: number; contentHash: string };
  curriculumVersion: { conceptCount: number; curriculumOrderLength: number; contentHash: string };
  estimator: { estimatorType: string; version: string; parameters: Readonly<Record<string, unknown>> };
  selectionPolicy: { policyType: string; version: string; parameters: Readonly<Record<string, unknown>> };
  sessionLimits: {
    maxQuestions: number;
    maxExposurePerQuestion: number;
    completionCheck?: ExperimentScenario["completionCheck"];
  };
  questionSelectionSequence: string[];
  responseSequence: ExperimentSessionState["responses"];
  estimatorTraces: unknown[];
  selectionTraces: unknown[];
  finalStatus: ExperimentSessionState["status"];
  terminationReason?: ExperimentSessionState["terminationReason"];
}

function hashContent(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

/**
 * A stable content fingerprint for a question bank slice — changes if
 * any question is added, removed, or has its correct answer or version
 * bumped; does NOT hash full question text (unnecessary for provenance/
 * equality purposes and keeps this fast over 1,840+ questions). Exported
 * (not just used internally) so Phase 6's artifact integrity checks
 * (src/research/artifact/integrity.ts) can recompute the SAME hash
 * against a live bank to detect "this run's referenced dataset no
 * longer matches what's currently loaded" — reusing this function
 * rather than re-deriving the fingerprint definition a second time.
 */
export function hashQuestionBank(questions: Question[]): string {
  const summary = questions
    .map((q) => `${q.id}:${q.version}:${q.correctOptionId}`)
    .sort()
    .join("|");
  return hashContent(summary);
}

/** Exported for the same reason as `hashQuestionBank` above. */
export function hashCurriculum(concepts: Concept[], curriculumOrder: string[]): string {
  const conceptSummary = concepts
    .map((c) => `${c.id}:${[...c.prerequisiteIds].sort().join(",")}`)
    .sort()
    .join("|");
  return hashContent(`${conceptSummary}::${curriculumOrder.join(">")}`);
}

/**
 * Builds the complete, reproducibility-sufficient record for one
 * experiment run — see docs/research-decisions.md RD-0006, requirement
 * 9. Every field here is a DIRECT copy of something the session engine
 * already produced (selection traces, estimator traces, the actual
 * response/selection sequences) — nothing is recomputed or
 * re-explained after the fact, so provenance can never drift from what
 * actually happened during the run.
 */
export function buildExperimentProvenance(
  config: ExperimentConfig,
  scenario: ExperimentScenario,
  state: ExperimentSessionState,
): ExperimentProvenance {
  return {
    conditionId: config.conditionId,
    runId: state.runId,
    scenarioId: scenario.scenarioId,
    questionBankVersion: {
      questionCount: scenario.availableQuestions.length,
      contentHash: hashQuestionBank(scenario.availableQuestions),
    },
    curriculumVersion: {
      conceptCount: scenario.concepts.length,
      curriculumOrderLength: scenario.curriculumOrder.length,
      contentHash: hashCurriculum(scenario.concepts, scenario.curriculumOrder),
    },
    estimator: {
      estimatorType: config.estimator.estimatorType,
      version: config.estimator.version,
      parameters: config.estimator.parameters,
    },
    selectionPolicy: {
      policyType: config.selection.policyType,
      version: config.selection.version,
      parameters: config.selection.parameters,
    },
    sessionLimits: {
      maxQuestions: scenario.maxQuestions,
      maxExposurePerQuestion: scenario.maxExposurePerQuestion ?? 1,
      completionCheck: scenario.completionCheck,
    },
    questionSelectionSequence: state.presentedQuestionIds,
    responseSequence: state.responses,
    estimatorTraces: state.estimatorTraces,
    selectionTraces: state.selectionTraces,
    finalStatus: state.status,
    terminationReason: state.terminationReason,
  };
}

import type { Question } from "@/domain/questions/types";
import type { MasteryUpdateTrace } from "@/domain/learner-model/types";
import type { AdaptiveSelectionTrace } from "@/tutoring/selection/adaptive/types";
import type { ExperimentRunArtifact } from "@/research/artifact/types";

function isMasteryUpdateTraceShape(trace: unknown): trace is MasteryUpdateTrace {
  return !!trace && typeof trace === "object" && "termsComputed" in trace && "newMastery" in trace && "conceptId" in trace;
}

function isAdaptiveSelectionTraceShape(trace: unknown): trace is AdaptiveSelectionTrace {
  return !!trace && typeof trace === "object" && "targetConcept" in trace && "targetDifficulty" in trace;
}

// --- A. Run-level summary --------------------------------------------

export interface RunSummaryRow {
  runId: string;
  experimentId: string;
  conditionId: string;
  scenarioId: string;
  track: string;
  estimatorType: string;
  estimatorVersion: string;
  selectionPolicyType: string;
  selectionPolicyVersion: string;
  questionBankCount: number;
  questionBankHash: string;
  questionCount: number;
  correctCount: number;
  incorrectCount: number;
  terminationStatus: string;
  terminationReason: string;
  sessionStartTimestamp: string;
  createdAt: string;
  softwareVersion: string;
}

export const RUN_SUMMARY_COLUMNS: (keyof RunSummaryRow)[] = [
  "runId",
  "experimentId",
  "conditionId",
  "scenarioId",
  "track",
  "estimatorType",
  "estimatorVersion",
  "selectionPolicyType",
  "selectionPolicyVersion",
  "questionBankCount",
  "questionBankHash",
  "questionCount",
  "correctCount",
  "incorrectCount",
  "terminationStatus",
  "terminationReason",
  "sessionStartTimestamp",
  "createdAt",
  "softwareVersion",
];

/**
 * One row per run. Deliberately does NOT compute any "learning gain" or
 * "mastery accuracy" figure — those require simulated ground truth
 * (Phase 8), which this phase does not have. Only directly-observed
 * counts (administered/correct/incorrect) are included.
 */
export function buildRunSummaryRow(artifact: ExperimentRunArtifact): RunSummaryRow {
  const correctCount = artifact.provenance.responseSequence.filter((r) => r.isCorrect).length;
  return {
    runId: artifact.runId,
    experimentId: artifact.experimentId ?? "",
    conditionId: artifact.conditionId,
    scenarioId: artifact.scenarioId ?? "",
    track: artifact.track ?? "",
    estimatorType: artifact.provenance.estimator.estimatorType,
    estimatorVersion: artifact.provenance.estimator.version,
    selectionPolicyType: artifact.provenance.selectionPolicy.policyType,
    selectionPolicyVersion: artifact.provenance.selectionPolicy.version,
    questionBankCount: artifact.provenance.questionBankVersion.questionCount,
    questionBankHash: artifact.provenance.questionBankVersion.contentHash,
    questionCount: artifact.provenance.responseSequence.length,
    correctCount,
    incorrectCount: artifact.provenance.responseSequence.length - correctCount,
    terminationStatus: artifact.provenance.finalStatus,
    terminationReason: artifact.provenance.terminationReason ?? "",
    sessionStartTimestamp: artifact.sessionStartTimestamp,
    createdAt: artifact.createdAt,
    softwareVersion: artifact.softwareVersion.packageVersion,
  };
}

// --- B. Question-response observations --------------------------------

export interface QuestionResponseRow {
  runId: string;
  conditionId: string;
  sequenceIndex: number;
  questionId: string;
  conceptIds: string;
  difficulty: number | "";
  selectedOptionId: string;
  correctOptionId: string;
  isCorrect: boolean;
  misconceptionId: string;
  usedHint: string;
  timestamp: string;
}

export const QUESTION_RESPONSE_COLUMNS: (keyof QuestionResponseRow)[] = [
  "runId",
  "conditionId",
  "sequenceIndex",
  "questionId",
  "conceptIds",
  "difficulty",
  "selectedOptionId",
  "correctOptionId",
  "isCorrect",
  "misconceptionId",
  "usedHint",
  "timestamp",
];

/**
 * One row per administered question. `questionsById` is a caller-
 * supplied lookup into the LIVE question bank rather than bank content
 * duplicated inside the artifact (requirement 9: "avoid unnecessary
 * duplication of static question-bank content... store references...
 * instead"). `usedHint` cannot be recovered here — `RecordedExperimentResponse`
 * does not retain it (only the estimator's own trace does, per concept) —
 * so it is sourced from the matching estimator trace when one exists for
 * this question's primary concept, and left blank otherwise, rather than
 * guessed.
 */
export function buildQuestionResponseRows(artifact: ExperimentRunArtifact, questionsById: Map<string, Question>): QuestionResponseRow[] {
  const hintByQuestionId = new Map<string, boolean>();
  for (const trace of artifact.provenance.estimatorTraces) {
    if (isMasteryUpdateTraceShape(trace)) hintByQuestionId.set(trace.questionId, trace.usedHint);
  }

  return artifact.provenance.responseSequence.map((response) => {
    const question = questionsById.get(response.questionId);
    const usedHint = hintByQuestionId.get(response.questionId);
    return {
      runId: artifact.runId,
      conditionId: artifact.conditionId,
      sequenceIndex: response.sequenceIndex,
      questionId: response.questionId,
      conceptIds: question ? question.conceptIds.join(";") : "",
      difficulty: question?.difficulty ?? "",
      selectedOptionId: response.selectedOptionId,
      correctOptionId: question?.correctOptionId ?? "",
      isCorrect: response.isCorrect,
      misconceptionId: response.misconceptionId ?? "",
      usedHint: usedHint === undefined ? "" : String(usedHint),
      timestamp: response.timestamp,
    };
  });
}

// --- C. Concept mastery trajectories ------------------------------------

export interface MasteryTrajectoryRow {
  runId: string;
  sequenceIndex: number;
  conceptId: string;
  questionId: string;
  conceptWeight: number;
  masteryBefore: number;
  masteryAfter: number;
  appliedDelta: number;
  difficulty: number;
  correct: boolean;
  modelVersion: string;
}

export const MASTERY_TRAJECTORY_COLUMNS: (keyof MasteryTrajectoryRow)[] = [
  "runId",
  "sequenceIndex",
  "conceptId",
  "questionId",
  "conceptWeight",
  "masteryBefore",
  "masteryAfter",
  "appliedDelta",
  "difficulty",
  "correct",
  "modelVersion",
];

/**
 * One row per concept-level mastery UPDATE (not per question — a
 * multi-concept question produces one row per concept it touched,
 * correctly attributed via `conceptWeight`, never collapsed into a
 * single undifferentiated row). Sourced directly from
 * `MasteryUpdateTrace` — the exact, full-precision values the Phase 3
 * formula actually computed, never re-derived or rounded. Currently
 * supports the deterministic-mastery trace shape specifically; an
 * unrecognized trace shape (e.g. a future BKT estimator's own trace
 * format) is skipped here rather than crashing — this export function,
 * unlike the session engine itself, is allowed to be estimator-specific.
 */
export function buildMasteryTrajectoryRows(artifact: ExperimentRunArtifact): MasteryTrajectoryRow[] {
  const rows: MasteryTrajectoryRow[] = [];
  for (const trace of artifact.provenance.estimatorTraces) {
    if (!isMasteryUpdateTraceShape(trace)) continue;
    rows.push({
      runId: artifact.runId,
      sequenceIndex: trace.sequenceIndex,
      conceptId: trace.conceptId,
      questionId: trace.questionId,
      conceptWeight: trace.conceptWeight,
      masteryBefore: trace.previousMastery,
      masteryAfter: trace.newMastery,
      appliedDelta: trace.termsComputed.appliedDelta,
      difficulty: trace.difficulty,
      correct: trace.correct,
      modelVersion: trace.modelVersion,
    });
  }
  return rows;
}

// --- D. Selection-decision records --------------------------------------

export interface SelectionDecisionRow {
  runId: string;
  sequenceIndex: number;
  targetConceptId: string;
  targetDifficulty: number | "";
  selectedQuestionId: string;
  reason: string;
  prerequisiteBacktrackOccurred: boolean;
  diagnosticProbeOccurred: boolean;
  policyVersion: string;
}

export const SELECTION_DECISION_COLUMNS: (keyof SelectionDecisionRow)[] = [
  "runId",
  "sequenceIndex",
  "targetConceptId",
  "targetDifficulty",
  "selectedQuestionId",
  "reason",
  "prerequisiteBacktrackOccurred",
  "diagnosticProbeOccurred",
  "policyVersion",
];

/**
 * One row per adaptive selection decision. Non-adaptive conditions
 * produce no trace per call (fixed-position selection needs none to
 * explain itself) and so contribute no rows here — this is a correct
 * reflection of what happened, not a gap in the export.
 */
export function buildSelectionDecisionRows(artifact: ExperimentRunArtifact): SelectionDecisionRow[] {
  const rows: SelectionDecisionRow[] = [];
  for (const trace of artifact.provenance.selectionTraces) {
    if (!isAdaptiveSelectionTraceShape(trace)) continue;
    rows.push({
      runId: artifact.runId,
      sequenceIndex: trace.sequenceIndex,
      targetConceptId: trace.targetConcept.conceptId ?? "",
      targetDifficulty: trace.targetDifficulty.difficulty ?? "",
      selectedQuestionId: trace.selectedQuestionId ?? "",
      reason: trace.targetConcept.reason,
      prerequisiteBacktrackOccurred: trace.targetConcept.reason === "prerequisite_backtrack",
      diagnosticProbeOccurred: trace.targetConcept.reason === "diagnostic_probe",
      policyVersion: trace.policyVersion,
    });
  }
  return rows;
}

// --- E. Misconception evidence -------------------------------------------

export interface MisconceptionEvidenceRow {
  runId: string;
  sequenceIndex: number;
  questionId: string;
  selectedOptionId: string;
  misconceptionId: string;
  /** Always `false` — a selected distractor is EVIDENCE consistent with a misconception, never a confirmed diagnosis (CLAUDE.md principle 7, docs/misconception-taxonomy.md). This field exists so a downstream analyst cannot mistake this export for a diagnosis table even by accident. */
  isConfirmedDiagnosis: false;
}

export const MISCONCEPTION_EVIDENCE_COLUMNS: (keyof MisconceptionEvidenceRow)[] = [
  "runId",
  "sequenceIndex",
  "questionId",
  "selectedOptionId",
  "misconceptionId",
  "isConfirmedDiagnosis",
];

/** One row per response that evidenced a misconception-tagged distractor — a subset of the question-response observations, isolated for analysts who only want this signal. */
export function buildMisconceptionEvidenceRows(artifact: ExperimentRunArtifact): MisconceptionEvidenceRow[] {
  return artifact.provenance.responseSequence
    .filter((r): r is typeof r & { misconceptionId: string } => r.misconceptionId !== undefined)
    .map((r) => ({
      runId: artifact.runId,
      sequenceIndex: r.sequenceIndex,
      questionId: r.questionId,
      selectedOptionId: r.selectedOptionId,
      misconceptionId: r.misconceptionId,
      isConfirmedDiagnosis: false as const,
    }));
}

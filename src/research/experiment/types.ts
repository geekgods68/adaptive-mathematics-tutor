import type { Concept } from "@/domain/concepts/types";
import type { Question } from "@/domain/questions/types";
import type { MisconceptionEvidenceTally } from "@/domain/learner-model/misconceptionEvidence";
import type { QuestionSelectionResult } from "@/tutoring/selection/types";

/**
 * A common, estimator-agnostic contract the experiment session engine
 * programs against — see docs/research-decisions.md RD-0006. Wraps
 * (does not replace) the Phase 3 `MasteryEstimator`
 * (src/domain/learner-model/estimatorInterface.ts), adding the
 * multi-concept fan-out, serialization, and identity fields the
 * experiment layer needs. `TState` is intentionally opaque to the
 * session engine — it never inspects state shape directly, only through
 * this interface, so a future estimator (e.g. BKT) with a completely
 * different internal representation (a probabilistic latent state
 * instead of an explicitly-updated scalar) can conform without changing
 * the engine. NOT implemented here beyond the two deterministic variants
 * and a no-op "none" estimator — see createNullEstimatorAdapter /
 * createDeterministicEstimatorAdapter in estimatorAdapter.ts.
 */
export interface EstimatorAdapter<TState = unknown> {
  readonly estimatorType: string;
  readonly version: string;
  readonly parameters: Readonly<Record<string, unknown>>;

  /** Cold-start state for one concept. */
  initConcept(learnerId: string, conceptId: string, timestamp: string): TState;

  /**
   * Applies one externally-supplied response's evidence across every
   * concept the question is attributed to, returning the updated state
   * map and whatever structured trace(s) this estimator produces (an
   * empty array for an estimator with no trace concept). Never mutates
   * `currentStates`.
   */
  applyResponse(
    currentStates: Readonly<Record<string, TState>>,
    evidence: EstimatorResponseEvidence,
    learnerId: string,
  ): { updatedStates: Record<string, TState>; traces: readonly unknown[] };

  /** This estimator's current mastery ESTIMATE for a concept, in [0,1], or `undefined` if this estimator doesn't expose one (distinguish from a simulated ground-truth value, which this interface never provides — ground truth exists only in a future simulated-learner phase). */
  readMastery(state: TState): number | undefined;

  /** A predicted probability of a correct response at the given difficulty, or `undefined` if this estimator doesn't support prediction. Distinct from `readMastery` — a mastery estimate and a response prediction are not the same quantity, even for estimators (like the deterministic one) that derive the latter trivially from the former. */
  predictCorrectness?(state: TState, difficulty: Question["difficulty"]): number | undefined;

  serializeStates(states: Readonly<Record<string, TState>>): string;
  restoreStates(serialized: string): Record<string, TState>;
}

/** The subset of ResponseEvidence (src/domain/learner-model/types.ts) the experiment layer needs to pass to an estimator — kept separate so this module doesn't need to import the Phase 3 type name into its own public contract. */
export interface EstimatorResponseEvidence {
  questionId: string;
  conceptWeights: Record<string, number>;
  difficulty: Question["difficulty"];
  correct: boolean;
  selectedOptionId: string;
  misconceptionId?: string;
  usedHint: boolean;
  sequenceIndex: number;
  timestamp: string;
}

/**
 * A common contract over `QuestionSelectionPolicy` (see
 * src/tutoring/selection/types.ts) so the session engine can select
 * through configuration rather than branching on condition. Unlike
 * `QuestionSelectionPolicy<TContext>` (which fixes a context shape per
 * policy), this adapter owns constructing its own policy-specific
 * context internally from the generic `SelectionAdapterInput` below —
 * that's the seam that lets the engine stay policy-agnostic.
 */
export interface SelectionAdapter {
  readonly policyType: "non_adaptive" | "adaptive";
  readonly version: string;
  readonly parameters: Readonly<Record<string, unknown>>;

  selectNext(input: SelectionAdapterInput): { result: QuestionSelectionResult; trace?: unknown };
}

export interface SelectionAdapterInput {
  learnerId: string;
  sessionId: string;
  sequenceIndex: number;
  availableQuestions: Question[];
  concepts: Concept[];
  curriculumOrder: string[];
  /** Non-adaptive policies only: the fixed sequence to walk. Ignored by adaptive adapters. */
  predeterminedSequence?: string[];
  /** Opaque to this interface — an adaptive adapter casts this to `Record<string, ConceptMasteryState>` internally; a non-adaptive adapter ignores it entirely (structurally cannot read it — see NonAdaptiveSelectionContext). */
  conceptMasteryStates: Readonly<Record<string, unknown>>;
  misconceptionTallies: Readonly<Record<string, MisconceptionEvidenceTally>>;
  presentedQuestionIds: readonly string[];
}

export type ExperimentTerminationReason =
  | "completed_normally"
  | "question_limit_reached"
  | "candidate_pool_exhausted"
  | "invalid_configuration"
  | "unrecoverable_error";

export interface ExperimentScenario {
  /** Identifies a fixed starting point (learner profile, bank, curriculum) so multiple conditions can be compared on equal footing — see docs/research-decisions.md RD-0006 "matched scenarios." Optional: omit for an ad hoc, unmatched run. */
  scenarioId?: string;
  learnerId: string;
  availableQuestions: Question[];
  concepts: Concept[];
  curriculumOrder: string[];
  /** Required only for a non-adaptive SelectionAdapter; ignored otherwise. */
  predeterminedSequence?: string[];
  /** Pre-seeded estimator state, e.g. to start several conditions from an identical non-cold-start profile. Omit for an ordinary cold start. */
  initialEstimatorStates?: Record<string, unknown>;
  maxQuestions: number;
  /** How many times the SAME question may be presented before it is excluded entirely, regardless of what the selection adapter itself would otherwise allow. Defaults to 1 (no repeats) — matching both existing policies' own built-in exposure-avoidance exactly, so leaving this unset changes nothing about current behavior. */
  maxExposurePerQuestion?: number;
  /** If present, the session terminates with "completed_normally" once every concept in `curriculumOrder` has an estimator state whose `mastery`/`numObservations` fields (duck-typed — works for any estimator state following that naming convention, e.g. ConceptMasteryState) both clear these thresholds. Omit to disable this check (e.g. for condition C0, or an estimator with no numeric mastery notion). */
  completionCheck?: { masteryThreshold: number; minEvidenceCount: number };
  startTimestamp: string;
}

/** One externally-supplied answer — the engine never invents this itself (see CLAUDE.md's MCQ-only/no-fabricated-response principles, extended here to "no fabricated learner" for the experiment layer). */
export interface ExternalResponse {
  selectedOptionId: string;
  timestamp: string;
  usedHint?: boolean;
}

export interface RecordedExperimentResponse {
  sequenceIndex: number;
  questionId: string;
  selectedOptionId: string;
  isCorrect: boolean;
  misconceptionId?: string;
  timestamp: string;
}

/** Everything about one experiment session's progress — deliberately plain, JSON-serializable data (no class instances, no closures) so it can be the unit a replay compares byte-for-byte. */
export interface ExperimentSessionState {
  runId: string;
  conditionId: string;
  scenarioId?: string;
  learnerId: string;
  sequenceIndex: number;
  status: "active" | "terminated";
  terminationReason?: ExperimentTerminationReason;
  /** Populated only when terminationReason === "invalid_configuration" — the structural/compatibility problems found by validateExperimentConfig (see validation.ts), so an invalid run fails with a diagnosable reason rather than a bare rejection. */
  configurationErrors?: { field: string; message: string }[];
  /** Populated only when terminationReason === "unrecoverable_error" — the thrown error's message, preserved for diagnosis rather than discarded (see "do not silently treat unsuccessful sessions as valid completed experiments"). */
  errorMessage?: string;
  currentQuestionId: string | null;
  estimatorStates: Record<string, unknown>;
  misconceptionTallies: Record<string, MisconceptionEvidenceTally>;
  presentedQuestionIds: string[];
  responses: RecordedExperimentResponse[];
  selectionTraces: unknown[];
  estimatorTraces: unknown[];
}

export interface ExperimentConfig {
  conditionId: string;
  estimator: EstimatorAdapter;
  selection: SelectionAdapter;
}

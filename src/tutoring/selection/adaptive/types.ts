import type { Question, DifficultyLevel } from "@/domain/questions/types";
import type { Concept } from "@/domain/concepts/types";
import type { ConceptMasteryState } from "@/domain/learner-model/types";
import type { MisconceptionEvidenceTally } from "@/domain/learner-model/misconceptionEvidence";
import type { AdaptiveSelectionConfig } from "@/tutoring/selection/adaptive/config";

/**
 * Everything the adaptive policy is allowed to read. Supersedes the
 * Phase 0 placeholder (which referenced the architecture-only
 * `StudentModel`/`ConceptMastery` types in `src/domain/student/types.ts`)
 * now that the Phase 3 learner model gives this real content — see
 * docs/research-decisions.md RD-0005.
 *
 * Unlike `NonAdaptiveSelectionContext`, this type is explicitly where
 * performance information IS allowed to flow (mirrors
 * `src/tutoring/selection/nonAdaptive/types.ts`'s comment about the
 * opposite guarantee). `conceptMasteryStates` and
 * `misconceptionTallies` are caller-supplied (built by the Phase 3
 * learner model and `accumulateMisconceptionEvidence` respectively) —
 * this policy never updates mastery or misconception evidence itself,
 * it only reads what has already been computed, preserving the
 * estimation/selection separation from Phase 3.
 */
export type AdaptiveSelectionContext = {
  learnerId: string;
  sessionId: string;
  /** 0-based index of the question about to be presented — included on the trace for audit, not used to index anything itself. */
  sequenceIndex: number;

  /** The question pool this session draws from (e.g. the original 161-question bank, RISE_QUESTIONS, or ALL_QUESTIONS — the caller's choice, not this policy's). */
  availableQuestions: Question[];
  /** The concept graph matching `availableQuestions` (their `conceptIds`/`prerequisiteConceptIds` must resolve against this list). */
  concepts: Concept[];
  /** A total teaching order over (a subset of) `concepts`, consistent with the prerequisite graph — e.g. RECOMMENDED_CURRICULUM_ORDER. Drives the progression frontier. */
  curriculumOrder: string[];

  /** Current mastery-estimate state per concept, as produced by `applyResponseEvidence` (src/domain/learner-model). Concepts with no entry are untouched cold starts. */
  conceptMasteryStates: Record<string, ConceptMasteryState>;
  /** Per-concept misconception tally, as accumulated by `accumulateMisconceptionEvidence` over the full response history (NOT truncated the way ConceptMasteryState.recentEvidence is) — the only data this policy uses for misconception-aware diagnosis. */
  misconceptionTallies: Record<string, MisconceptionEvidenceTally>;

  /** Every question id already presented this session, in presentation order — used for exposure avoidance and family/difficulty-repetition tracking. */
  presentedQuestionIds: string[];

  config?: AdaptiveSelectionConfig;
};

/** One row of the "which concepts did the engine look at, and why did/didn't it pick each" trace. */
export interface ConsideredConceptTrace {
  conceptId: string;
  mastery: number | undefined;
  numObservations: number;
  eligible: boolean;
  ineligibleReason?: string;
}

/** One prerequisite considered (and whether it was eligible) during a diagnostic-backtracking search — see `findDiagnosticBacktrackTarget` in targeting.ts. Unlike ordinary remediation's considered list, this can include previously-mastered concepts. */
export interface DiagnosticCandidateInfo {
  conceptId: string;
  mastery: number | undefined;
  numObservations: number;
  /** Sequence steps since this concept's last recorded observation (Infinity-like large value if never observed). */
  sequenceGap: number;
  /** True if stale/under-evidenced enough to be probed regardless of historical mastery. */
  eligible: boolean;
}

/** Populated only when `TargetConceptDecision.reason === "diagnostic_probe"` — see docs/research-decisions.md RD-0005's diagnostic-backtracking refinement. */
export interface DiagnosticProbeDetails {
  /** The downstream concept the sustained-difficulty trigger actually fired on (not the prerequisite being probed). */
  originalConceptId: string;
  triggerConsecutiveIncorrect: number;
  /** Always true for this reason — included explicitly so a trace reader doesn't have to infer it from the reason string alone (requirement: "distinguish temporary diagnostic probing from permanent curriculum regression"). */
  isTemporaryProbe: true;
  prerequisitesConsidered: DiagnosticCandidateInfo[];
  /** Human-readable statement of what has to happen for selection to stop probing and resume targeting `originalConceptId`. */
  returnCondition: string;
}

export interface TargetConceptDecision {
  conceptId: string | null;
  reason: "insufficient_evidence" | "progression" | "remediation" | "prerequisite_backtrack" | "diagnostic_probe" | "no_eligible_concept";
  consideredConcepts: ConsideredConceptTrace[];
  /** Populated when reason === "prerequisite_backtrack" OR "diagnostic_probe": the hop chain walked, starting from the concept the trigger fired on. */
  prerequisiteChain?: string[];
  /** Populated only when reason === "diagnostic_probe". */
  diagnosticDetails?: DiagnosticProbeDetails;
}

export interface TargetDifficultyDecision {
  difficulty: DifficultyLevel | null;
  reason: string;
  masteryUsed: number | undefined;
  evidenceCount: number;
}

export interface CandidateScore {
  questionId: string;
  score: number;
  difficulty: DifficultyLevel;
  misconceptionOverlap: number;
}

export type FallbackMode = "none" | "widened_difficulty" | "any_difficulty_for_concept" | "next_eligible_concept" | "exhausted";

/**
 * Full decision trace for one adaptive selection call — the central
 * deliverable for this phase's decision-traceability requirement (B8).
 * `explanation` is generated FROM the fields above it, in the same
 * spirit as `MasteryUpdateTrace.explanation` in the Phase 3 learner
 * model — never authored independently of what was actually computed.
 */
export interface AdaptiveSelectionTrace {
  policyVersion: string;
  configVersion: string;
  config: AdaptiveSelectionConfig;
  learnerId: string;
  sessionId: string;
  sequenceIndex: number;
  targetConcept: TargetConceptDecision;
  targetDifficulty: TargetDifficultyDecision;
  misconceptionEvidenceConsidered: MisconceptionEvidenceTally;
  candidateFilter: {
    totalAvailable: number;
    afterConceptFilter: number;
    afterExposureFilter: number;
    afterFamilyLimitFilter: number;
    afterDifficultyFilter: number;
  };
  /** Top-ranked candidates only (bounded — see candidateSelection.ts), not every question in the bank, to keep traces a manageable size while still letting the choice be reconstructed. */
  topCandidates: CandidateScore[];
  selectedQuestionId: string | null;
  fallbackUsed: FallbackMode;
  explanation: string;
}

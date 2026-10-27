import type { DifficultyLevel } from "@/domain/questions/types";

/**
 * A mastery → difficulty band. `maxMastery` is the inclusive upper bound
 * of the band; bands must be given in ascending `maxMastery` order and
 * the last one should be exactly `1` so every mastery value in [0,1]
 * matches something (see `resolveDifficultyBand` in targeting.ts).
 */
export interface MasteryDifficultyBand {
  readonly maxMastery: number;
  readonly difficulty: DifficultyLevel;
}

/**
 * Every research-relevant, centrally-tunable choice the adaptive
 * selection engine makes. Every value here is a researcher-defined
 * heuristic threshold, NOT an empirically calibrated educational
 * standard — see docs/research-decisions.md RD-0005. Kept in one
 * versioned object so Phase 8-style sensitivity analyses/ablations can
 * swap it out wholesale without touching selection logic.
 */
export interface AdaptiveSelectionConfig {
  readonly version: string;

  /** Mastery at/above which a concept is considered "done" and the engine moves on, PROVIDED evidence is also sufficient (see minEvidenceCount). */
  readonly masteryProgressionThreshold: number;
  /** Mastery at/below which a concept (typically a prerequisite found during backtracking) is treated as needing remediation. */
  readonly masteryRemediationThreshold: number;
  /** Minimum ConceptMasteryState.numObservations before a mastery estimate is trusted enough to drive progression or remediation decisions; below this, the concept is treated as "insufficient evidence" and a diagnostic question is preferred. */
  readonly minEvidenceCount: number;
  /** Consecutive incorrect responses on the current target concept that trigger a prerequisite-backtracking check (searches only for a prerequisite with insufficient evidence or mastery below masteryRemediationThreshold — see findRemediationTarget). */
  readonly consecutiveIncorrectRemediationThreshold: number;
  /**
   * Consecutive incorrect responses that trigger the stronger DIAGNOSTIC
   * backtracking mechanism (see docs/research-decisions.md RD-0005's
   * refinement and `findDiagnosticBacktrackTarget` in targeting.ts) —
   * must be >= `consecutiveIncorrectRemediationThreshold`, since crossing
   * it implies ordinary remediation has already been tried and failed to
   * resolve the struggle. Unlike ordinary remediation, this mechanism
   * CAN select a previously-progressed (already-mastered) prerequisite
   * for a one-off diagnostic probe — see `diagnosticStalenessThreshold`.
   */
  readonly diagnosticBacktrackConsecutiveIncorrectThreshold: number;
  /**
   * How many sequence steps must have passed since a prerequisite's last
   * recorded observation before it is eligible for diagnostic
   * re-probing, regardless of how high its historical mastery is. This
   * is what makes a just-probed prerequisite ineligible again
   * immediately afterward (its `lastSequenceIndex` just updated), which
   * is the mechanism that returns control to the original downstream
   * concept rather than probing the same prerequisite every round.
   */
  readonly diagnosticStalenessThreshold: number;
  /** Hard cap on how many prerequisite hops EITHER backtracking search (ordinary or diagnostic) will walk, independent of the curriculum graph's own acyclicity guarantee — a second, defence-in-depth bound against runaway traversal (see B6's "do not allow infinite prerequisite-backtracking loops"). */
  readonly maxPrerequisiteBacktrackDepth: number;

  /** Mastery → difficulty mapping used once a concept has sufficient evidence (see minEvidenceCount). Ascending maxMastery, last entry must be 1. */
  readonly difficultyByMastery: readonly MasteryDifficultyBand[];
  /** Difficulty offered when a concept has fewer than minEvidenceCount observations (an initial diagnostic probe, not yet mastery-driven). */
  readonly diagnosticDifficultyForLowEvidence: DifficultyLevel;
  /** If the same difficulty has been presented this many times in a row, the engine nudges away from it rather than repeating it a further time. */
  readonly maxConsecutiveSameDifficulty: number;

  /** How many times a question_family may already appear in the presented history before the engine deprioritises (not forbids) further questions from it. */
  readonly questionFamilyRepetitionLimit: number;
  /** Minimum tally count for a misconceptionId before the engine treats it as "worth diagnosing" rather than a single isolated mistake (see CLAUDE.md principle 7 — evidence, not diagnosis, even above this threshold). */
  readonly misconceptionEvidenceMinCount: number;

  /**
   * When `false`, disables ALL prerequisite-graph-based targeting:
   * `chooseTargetConcept` never calls `findRemediationTarget` or
   * `findDiagnosticBacktrackTarget`, so a struggling concept is always
   * remediated on itself (reason "remediation"), never backtracked into
   * a prerequisite. This is the prerequisite-UNAWARE adaptive ablation
   * (Phase 5's condition C3) — a controlled comparison point against the
   * prerequisite-aware policy, not a separate selection engine. It does
   * NOT affect mastery-based difficulty adaptation
   * (`chooseTargetDifficulty` is unconditional on this flag) — only
   * graph traversal is disabled, per docs/research-decisions.md RD-0006.
   * Defaults to `true` (prerequisite-aware), preserving Phase 4's
   * existing behavior unchanged.
   */
  readonly prerequisiteAware: boolean;
}

/**
 * Provisional defaults — researcher-defined starting points, explicitly
 * NOT tuned against any evaluation dataset (per instruction not to
 * optimise against the final evaluation data during implementation).
 * See docs/research-decisions.md RD-0005.
 */
export const DEFAULT_ADAPTIVE_SELECTION_CONFIG: AdaptiveSelectionConfig = {
  version: "adaptive-selection-v2",
  masteryProgressionThreshold: 0.75,
  masteryRemediationThreshold: 0.35,
  minEvidenceCount: 3,
  consecutiveIncorrectRemediationThreshold: 2,
  diagnosticBacktrackConsecutiveIncorrectThreshold: 4,
  diagnosticStalenessThreshold: 8,
  maxPrerequisiteBacktrackDepth: 5,
  difficultyByMastery: [
    { maxMastery: 0.3, difficulty: 1 },
    { maxMastery: 0.45, difficulty: 2 },
    { maxMastery: 0.65, difficulty: 3 },
    { maxMastery: 0.85, difficulty: 4 },
    { maxMastery: 1, difficulty: 5 },
  ],
  diagnosticDifficultyForLowEvidence: 2,
  maxConsecutiveSameDifficulty: 3,
  questionFamilyRepetitionLimit: 1,
  misconceptionEvidenceMinCount: 2,
  prerequisiteAware: true,
};

/**
 * The prerequisite-UNAWARE ablation (Phase 5 condition C3) — identical
 * to `DEFAULT_ADAPTIVE_SELECTION_CONFIG` except `prerequisiteAware:
 * false`. A separate named export (rather than asking every caller to
 * remember to override one field) so C3 is as easy to select as C1/C2.
 */
export const PREREQUISITE_UNAWARE_ADAPTIVE_SELECTION_CONFIG: AdaptiveSelectionConfig = {
  ...DEFAULT_ADAPTIVE_SELECTION_CONFIG,
  version: "adaptive-selection-v2-prerequisite-unaware",
  prerequisiteAware: false,
};

import type { DifficultyLevel } from "@/domain/questions/types";

/**
 * Every constant the mastery-update formula uses, gathered in one
 * explicit, versioned place — mirrors the sibling `adaptive-math-tutor`
 * repo's `MasteryPolicy` convention (see docs/research-decisions.md
 * RD-0003 for why this formula, not a new one, was adopted).
 *
 * This is a researcher-defined deterministic heuristic, NOT Bayesian
 * Knowledge Tracing, Item Response Theory, an Elo model, or an
 * empirically calibrated measurement instrument. "Mastery" means
 * "what this specific, inspectable formula currently outputs," nothing
 * more, until a later phase validates it against simulated or real data.
 */
export interface ModelParameters {
  /** Stable identifier, bumped whenever the formula or any constant below changes. Logged on every trace. */
  readonly version: string;
  /** M_0 — mastery assigned to a concept with no prior evidence. */
  readonly initialMastery: number;
  /** α — positive-evidence learning rate (fraction of the remaining gap-to-1 gained on a correct, standard-difficulty, unhinted response). */
  readonly correctGainRate: number;
  /** β — negative-evidence penalty rate (fraction of current mastery lost on an incorrect, standard-difficulty response). */
  readonly incorrectLossRate: number;
  /** w_h — multiplier applied ONLY to a correct response that used a hint. Never applied to incorrect responses. */
  readonly hintGainMultiplier: number;
  /** w_d table — the raw per-difficulty weight. How it is APPLIED to the incorrect branch depends on `incorrectDifficultyWeighting` below; the correct branch always multiplies by this value directly. */
  readonly difficultyWeights: Readonly<Record<DifficultyLevel, number>>;
  /**
   * Which variant of the incorrect-response formula this parameter set
   * uses (see docs/research-decisions.md RD-0003 for the original open
   * question and RD-0004 for the resolution):
   * - "multiplicative" (Variant A, the original `deterministic-mastery-v1`
   *   baseline): incorrect penalty = β·M_old·w_d — a harder question
   *   produces a LARGER penalty, symmetric with the correct branch.
   * - "inverse" (Variant B): incorrect penalty = β·M_old·(1/w_d) — a
   *   harder question produces a SMALLER penalty (failing an easy
   *   question is stronger evidence of a gap than failing a hard one).
   * This is a researcher-defined heuristic choice, not an empirically
   * validated one either way.
   */
  readonly incorrectDifficultyWeighting: "multiplicative" | "inverse";
  /** Maximum number of ResponseEvidenceRecord entries kept per concept state. */
  readonly recentEvidenceLimit: number;
}

/** One unit of observed response evidence for a single concept, as attributed by `updateMastery`. Kept for traceability and for Phase 4's misconception-diagnosis and research-evaluation consumers. */
export interface ResponseEvidenceRecord {
  questionId: string;
  correct: boolean;
  difficulty: DifficultyLevel;
  usedHint: boolean;
  /** This concept's share of the question's total evidence (see ResponseEvidence.conceptWeights). 1.0 for a single-concept question. */
  conceptWeight: number;
  /** Present only on an incorrect response whose selected option carries a misconceptionId. */
  misconceptionId?: string;
  sequenceIndex: number;
  timestamp: string;
}

/**
 * Concept-level learner state. One instance per (learnerId, conceptId)
 * pair. `mastery` is the tutor's ESTIMATE — never a ground-truth value;
 * ground truth exists only inside controlled simulations (a later phase),
 * never here.
 */
export interface ConceptMasteryState {
  learnerId: string;
  conceptId: string;
  /** Current mastery estimate, in [0, 1]. */
  mastery: number;
  /** M_0 this state was initialised with (retained even as `mastery` changes, so the total movement is always reconstructable). */
  initialMastery: number;
  numObservations: number;
  correctCount: number;
  incorrectCount: number;
  consecutiveCorrect: number;
  consecutiveIncorrect: number;
  /** Most recent evidence first is NOT assumed — stored oldest-first, capped at `ModelParameters.recentEvidenceLimit`. */
  recentEvidence: ResponseEvidenceRecord[];
  /** The `ModelParameters.version` this state was initialised under. A state's whole history used one parameter set unless explicitly migrated — see docs/research-decisions.md RD-0003 for why parameters are not changed mid-stream silently. */
  modelVersion: string;
  /** Sequence index of the last update applied (monotonically increasing per learner, supplied by the caller — not a wall-clock substitute). */
  lastSequenceIndex: number;
  createdAt: string;
  lastUpdatedAt: string;
}

/**
 * The input to one mastery update: everything known about a single
 * learner response to a single question. `conceptWeights` is the
 * question's full attribution map (see docs/research-decisions.md RD-0003
 * for the multi-concept attribution rule) — `updateMastery`'s caller is
 * expected to have already resolved this from the Question's own
 * `conceptWeights` field (`{ [primaryConceptId]: 1 }` for a
 * single-concept question).
 */
export interface ResponseEvidence {
  questionId: string;
  conceptWeights: Record<string, number>;
  difficulty: DifficultyLevel;
  correct: boolean;
  selectedOptionId: string;
  /** Present only when the selected option is incorrect AND carries a misconceptionId (mirrors AnswerOption.misconceptionId — evidence, not diagnosis, per CLAUDE.md principle 7). */
  misconceptionId?: string;
  usedHint: boolean;
  /** Caller-supplied, monotonically increasing per learner — the ordering authority for traces and recentEvidence, since wall-clock timestamps can collide or be unavailable in simulation. */
  sequenceIndex: number;
  timestamp: string;
}

/**
 * A complete, structured record of ONE concept's mastery update —
 * sufficient to reconstruct the exact arithmetic without re-running the
 * code. This is the central deliverable for the research's "explicit
 * decision traceability" requirement: `explanation` is built FROM
 * `termsComputed` below, never written independently of the calculation.
 */
export interface MasteryUpdateTrace {
  modelVersion: string;
  parameters: ModelParameters;
  learnerId: string;
  conceptId: string;
  questionId: string;
  selectedOptionId: string;
  misconceptionId?: string;
  correct: boolean;
  difficulty: DifficultyLevel;
  usedHint: boolean;
  /** This concept's attribution weight for the question that produced this update (1.0 for single-concept). */
  conceptWeight: number;
  sequenceIndex: number;
  timestamp: string;
  previousMastery: number;
  termsComputed: {
    /** (1 - M_t) for a correct update, or M_t for an incorrect update — the term the rate is multiplied against. */
    gapOrCurrentTerm: number;
    /** The raw w_d table value for this difficulty, regardless of variant. */
    difficultyWeight: number;
    /** The factor actually multiplied into unweightedDelta: equals difficultyWeight on every correct update and on an incorrect update under "multiplicative"; equals 1/difficultyWeight on an incorrect update under "inverse". Distinct from difficultyWeight so the trace shows both the raw table value and what was actually applied. */
    difficultyFactorApplied: number;
    hintMultiplier: number;
    /** The rate constant used (α for correct, β for incorrect) — included so the trace alone identifies which branch of the formula ran. */
    rateConstant: "correctGainRate" | "incorrectLossRate";
    /** rateConstant_value * gapOrCurrentTerm * difficultyFactorApplied * hintMultiplier, i.e. the full per-concept delta BEFORE conceptWeight scaling. */
    unweightedDelta: number;
    /** unweightedDelta * conceptWeight — the delta actually applied before clamping. */
    appliedDelta: number;
    /** clamp(previousMastery + appliedDelta, 0, 1) — repeated here (not just as newMastery below) so the clamp's effect, if any, is visible directly in the terms. */
    clampedResult: number;
  };
  newMastery: number;
  /** A human-readable rendering of termsComputed — generated, not authored, so it cannot drift from the actual calculation. See buildExplanation() in updateMastery.ts. */
  explanation: string;
}

/** The result of applying one full ResponseEvidence (possibly spanning multiple concepts) to a learner's existing concept states. */
export interface ApplyResponseResult {
  updatedStates: Record<string, ConceptMasteryState>;
  traces: MasteryUpdateTrace[];
}

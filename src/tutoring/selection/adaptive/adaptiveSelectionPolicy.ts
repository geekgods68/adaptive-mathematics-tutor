import type { QuestionSelectionPolicy, QuestionSelectionResult } from "@/tutoring/selection/types";
import type {
  AdaptiveSelectionContext,
  AdaptiveSelectionTrace,
  CandidateScore,
  FallbackMode,
  TargetConceptDecision,
  TargetDifficultyDecision,
} from "@/tutoring/selection/adaptive/types";
import { DEFAULT_ADAPTIVE_SELECTION_CONFIG, type AdaptiveSelectionConfig } from "@/tutoring/selection/adaptive/config";
import { chooseTargetConcept, chooseTargetDifficulty } from "@/tutoring/selection/adaptive/targeting";
import { selectCandidateQuestion, type CandidateSelectionResult } from "@/tutoring/selection/adaptive/candidateSelection";

const POLICY_VERSION = "adaptive-selection-policy-v2";

const EMPTY_FILTER_COUNTS: CandidateSelectionResult["filterCounts"] = {
  totalAvailable: 0,
  afterConceptFilter: 0,
  afterExposureFilter: 0,
  afterFamilyLimitFilter: 0,
  afterDifficultyFilter: 0,
};

function buildExplanation(
  targetConcept: TargetConceptDecision,
  targetDifficulty: TargetDifficultyDecision,
  usedConceptId: string | null,
  candidateResult: CandidateSelectionResult | null,
  fallbackUsed: FallbackMode,
): string {
  if (!candidateResult?.selected) {
    return (
      `No question could be selected. Target concept decision: "${targetConcept.reason}"` +
      `${targetConcept.conceptId ? ` (${targetConcept.conceptId})` : ""}. ` +
      `No unseen, eligible question was found for any concept tried in curriculum order (fallback: ${fallbackUsed}).`
    );
  }
  const chainClause = targetConcept.prerequisiteChain ? `, prerequisite chain: ${targetConcept.prerequisiteChain.join(" -> ")}` : "";
  const probeClause = targetConcept.reason === "diagnostic_probe" && targetConcept.diagnosticDetails
    ? ` [TEMPORARY DIAGNOSTIC PROBE — triggered by ${targetConcept.diagnosticDetails.triggerConsecutiveIncorrect} consecutive incorrect on "${targetConcept.diagnosticDetails.originalConceptId}"; not a permanent curriculum regression; ${targetConcept.diagnosticDetails.returnCondition}]`
    : "";
  const topScore: CandidateScore | undefined = candidateResult.topCandidates[0];
  const misconceptionClause = topScore && topScore.misconceptionOverlap > 0 ? ` (misconception overlap: ${topScore.misconceptionOverlap})` : "";
  const fallbackClause = fallbackUsed !== "none" ? ` [fallback: ${fallbackUsed}]` : "";
  return (
    `Target concept: ${usedConceptId} (${targetConcept.reason}${chainClause})${probeClause}. ` +
    `Target difficulty: ${targetDifficulty.difficulty} (${targetDifficulty.reason}). ` +
    `Selected question ${candidateResult.selected.id} from ${candidateResult.filterCounts.afterDifficultyFilter} eligible candidate(s)${misconceptionClause}${fallbackClause}.`
  );
}

/**
 * The full deterministic selection computation, independent of the
 * `QuestionSelectionPolicy` wrapper below so it can be unit-tested
 * directly and so its full `AdaptiveSelectionTrace` is available to
 * callers that want it (the shared `QuestionSelectionResult` type is
 * deliberately minimal — see src/tutoring/selection/types.ts — and can't
 * carry a structured trace itself).
 *
 * Tries the concept `chooseTargetConcept` identifies first; if that
 * concept's question pool is exhausted (every matching question already
 * presented, or none exist at all), falls through to the NEXT
 * not-yet-mastered concept in `context.curriculumOrder`, bounded by the
 * curriculum's own length (B6's "exhausted question pools" + "avoid
 * infinite loops" — this loop visits each concept at most once).
 */
export function selectAdaptiveQuestion(context: AdaptiveSelectionContext, configOverride?: AdaptiveSelectionConfig): AdaptiveSelectionTrace {
  const config = configOverride ?? context.config ?? DEFAULT_ADAPTIVE_SELECTION_CONFIG;
  const targetConcept = chooseTargetConcept(context, config);

  const candidateConceptOrder: string[] = [];
  if (targetConcept.conceptId !== null) candidateConceptOrder.push(targetConcept.conceptId);
  for (const conceptId of context.curriculumOrder) {
    if (!candidateConceptOrder.includes(conceptId)) candidateConceptOrder.push(conceptId);
  }

  let targetDifficulty: TargetDifficultyDecision = {
    difficulty: null,
    reason: "no concept was available to target",
    masteryUsed: undefined,
    evidenceCount: 0,
  };
  let candidateResult: CandidateSelectionResult | null = null;
  let usedConceptId: string | null = null;
  let fallbackUsed: FallbackMode = "exhausted";

  for (let i = 0; i < candidateConceptOrder.length; i++) {
    const conceptId = candidateConceptOrder[i];
    const difficultyDecision = chooseTargetDifficulty(conceptId, context, config);
    if (difficultyDecision.difficulty === null) continue;

    const result = selectCandidateQuestion(conceptId, difficultyDecision.difficulty, context, config);
    if (result.selected) {
      targetDifficulty = difficultyDecision;
      candidateResult = result;
      usedConceptId = conceptId;
      fallbackUsed = i === 0 ? result.fallbackUsed : "next_eligible_concept";
      break;
    }
  }

  const explanation = buildExplanation(targetConcept, targetDifficulty, usedConceptId, candidateResult, fallbackUsed);

  return {
    policyVersion: POLICY_VERSION,
    configVersion: config.version,
    config,
    learnerId: context.learnerId,
    sessionId: context.sessionId,
    sequenceIndex: context.sequenceIndex,
    targetConcept,
    targetDifficulty,
    misconceptionEvidenceConsidered: (usedConceptId && context.misconceptionTallies[usedConceptId]) || {},
    candidateFilter: candidateResult?.filterCounts ?? EMPTY_FILTER_COUNTS,
    topCandidates: candidateResult?.topCandidates ?? [],
    selectedQuestionId: candidateResult?.selected?.id ?? null,
    fallbackUsed,
    explanation,
  };
}

/**
 * Implements `QuestionSelectionPolicy<AdaptiveSelectionContext>` for
 * real (no longer a throwing skeleton — see
 * docs/research-decisions.md RD-0005 for why building this here was
 * explicitly authorised, and CLAUDE.md's "Shared infrastructure"
 * section for the architectural boundary this preserves:
 * `NonAdaptiveSelectionPolicy` and `/tutor` are completely unaffected by
 * this class existing).
 */
export class AdaptiveSelectionPolicy implements QuestionSelectionPolicy<AdaptiveSelectionContext> {
  readonly condition = "adaptive" as const;

  constructor(private readonly defaultConfig: AdaptiveSelectionConfig = DEFAULT_ADAPTIVE_SELECTION_CONFIG) {}

  selectNextQuestion(context: AdaptiveSelectionContext): QuestionSelectionResult {
    const trace = selectAdaptiveQuestion(context, context.config ?? this.defaultConfig);
    return { questionId: trace.selectedQuestionId, rationale: trace.explanation };
  }

  /** Same decision as `selectNextQuestion`, but also returns the full structured `AdaptiveSelectionTrace` for research logging/audit (B8) — `QuestionSelectionResult.rationale` alone is a one-line summary, not a reconstructable trace. */
  selectNextQuestionWithTrace(context: AdaptiveSelectionContext): { result: QuestionSelectionResult; trace: AdaptiveSelectionTrace } {
    const trace = selectAdaptiveQuestion(context, context.config ?? this.defaultConfig);
    return { result: { questionId: trace.selectedQuestionId, rationale: trace.explanation }, trace };
  }
}

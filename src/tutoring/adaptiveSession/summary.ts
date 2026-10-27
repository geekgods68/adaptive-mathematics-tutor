import type { Concept } from "@/domain/concepts/types";
import type { ConceptMasteryState } from "@/domain/learner-model/types";
import type { ExperimentSessionState } from "@/research/experiment/types";
import { buildProgressView, conceptsNeedingPractice, type ConceptProgressRow } from "@/tutoring/adaptiveSession/progress";

export interface AdaptiveSessionSummary {
  totalQuestions: number;
  correctAnswers: number;
  incorrectAnswers: number;
  accuracy: number;
  conceptsPractised: string[];
  progress: ConceptProgressRow[];
  conceptsNeedingPractice: ConceptProgressRow[];
}

/**
 * Student-facing summary (section 4.D). Deliberately does NOT compute or
 * display a "learning gain" figure — an increased heuristic mastery
 * score is not demonstrated learning (see docs/research-decisions.md
 * RD-0006's run-summary export, which applies the same restraint). Every
 * mastery value flows straight from `ExperimentSessionState.estimatorStates`,
 * the Phase 3 estimator's own recorded values.
 */
export function buildAdaptiveSessionSummary(
  state: ExperimentSessionState,
  concepts: Concept[],
  masteryProgressionThreshold: number,
  minEvidenceCount: number,
): AdaptiveSessionSummary {
  const correctAnswers = state.responses.filter((r) => r.isCorrect).length;
  const totalQuestions = state.responses.length;
  const progress = buildProgressView(state.estimatorStates as Record<string, ConceptMasteryState>, concepts, minEvidenceCount);

  return {
    totalQuestions,
    correctAnswers,
    incorrectAnswers: totalQuestions - correctAnswers,
    accuracy: totalQuestions === 0 ? 0 : correctAnswers / totalQuestions,
    conceptsPractised: progress.map((p) => p.conceptName),
    progress,
    conceptsNeedingPractice: conceptsNeedingPractice(progress, Math.round(masteryProgressionThreshold * 100)),
  };
}

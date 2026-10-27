import type { Concept } from "@/domain/concepts/types";
import type { ConceptMasteryState } from "@/domain/learner-model/types";
import { describeEvidenceLevel } from "@/tutoring/adaptiveSession/explanations";

/**
 * One row of the student-facing progress view (section 7). Every number
 * here is the Phase 3 estimator's own value, relabeled for display —
 * never recomputed, never implying empirical calibration (see
 * docs/research-decisions.md RD-0003: "mastery" is this specific,
 * inspectable formula's output, nothing more).
 */
export interface ConceptProgressRow {
  conceptId: string;
  conceptName: string;
  chapterId?: string;
  /** False for a concept that exists in the curriculum but has no recorded observation yet — distinct from "observed but low mastery." */
  observed: boolean;
  evidenceLevel: string;
  /** M_0 — the cold-start value this concept's estimate began from (effectively "before this session," since every concept starts cold-start within one session). */
  masteryBeforePercent: number;
  /** The CURRENT estimate — labeled "estimated," never "demonstrated" or "actual" knowledge. */
  masteryAfterPercent: number;
}

/** Only concepts the learner-model actually holds state for (i.e. touched this session) — an untouched concept is reported by `observed: false` rows built separately by the caller, if it wants to show the full curriculum rather than just what's been seen. */
export function buildProgressView(
  estimatorStates: Record<string, ConceptMasteryState>,
  concepts: Concept[],
  minEvidenceCount: number,
): ConceptProgressRow[] {
  return Object.entries(estimatorStates)
    .map(([conceptId, state]) => {
      const concept = concepts.find((c) => c.id === conceptId);
      return {
        conceptId,
        conceptName: concept?.name ?? conceptId,
        chapterId: concept?.chapterId,
        observed: state.numObservations > 0,
        evidenceLevel: describeEvidenceLevel(state.numObservations, minEvidenceCount),
        masteryBeforePercent: Math.round(state.initialMastery * 100),
        masteryAfterPercent: Math.round(state.mastery * 100),
      };
    })
    .sort((a, b) => a.conceptName.localeCompare(b.conceptName));
}

/** Concepts worth suggesting for further practice: observed, but below the progression threshold — never concepts with zero evidence (nothing to suggest revisiting if it was never tried). */
export function conceptsNeedingPractice(rows: ConceptProgressRow[], masteryProgressionThresholdPercent: number): ConceptProgressRow[] {
  return rows.filter((r) => r.observed && r.masteryAfterPercent < masteryProgressionThresholdPercent);
}

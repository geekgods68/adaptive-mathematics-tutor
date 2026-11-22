import { describeEvidenceLevel } from "@/tutoring/adaptiveSession/explanations";

/** Only the fields `buildProgressView` actually reads from a concept — satisfied by both the domain `Concept` type and the client-facing `ConceptNode` DTO (`src/tutoring/adaptiveSession/conceptGraph.ts`), so Dashboard/Progress can call this function directly with whichever concept list they already have in hand. */
export interface ConceptForProgressView {
  id: string;
  name: string;
  chapterId?: string;
}

/**
 * Only the fields `buildProgressView` actually reads — deliberately a
 * `Pick`-shaped structural type rather than the full server-only
 * `ConceptMasteryState`, so this function (and this whole file — no
 * other import here is server-only) can run identically on the server's
 * real `Record<string, ConceptMasteryState>` AND on the client-safe
 * `Record<string, PersistableConceptMasteryState>` (Phase G's
 * `masteryStateTransfer.ts`), which carries the same three fields.
 * Stage 3 (Priority 2 — mastery-state duplication fix) relies on this:
 * Dashboard/Progress call this SAME function, directly, on whichever
 * source turned out to be authoritative, instead of each re-deriving its
 * own notion of "current mastery."
 */
export interface MasteryStateForProgressView {
  numObservations: number;
  initialMastery: number;
  mastery: number;
}

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
  estimatorStates: Record<string, MasteryStateForProgressView>,
  concepts: ConceptForProgressView[],
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

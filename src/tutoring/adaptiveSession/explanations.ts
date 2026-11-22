import type { DifficultyLevel } from "@/domain/questions/types";
import type { AdaptiveSelectionTrace } from "@/tutoring/selection/adaptive/types";

/**
 * Translates a REAL `AdaptiveSelectionTrace` (Phase 4's actual decision
 * output, never a description of intent — see
 * src/tutoring/selection/adaptive/adaptiveSelectionPolicy.ts) into one
 * short, honest, student-facing sentence. Every branch below is driven
 * by `trace.targetConcept.reason`, the exact enum value the policy
 * already computed — this function never invents an explanation from a
 * question's appearance or guesses at why a question was chosen (see
 * CLAUDE.md principle 7's spirit, extended here: an explanation is only
 * as trustworthy as the computation it's derived from).
 *
 * The full numerical trace (`AdaptiveSelectionTrace`) remains available,
 * unmodified, to the researcher-only `/dev/adaptive-session` view — this
 * function is strictly an ADDITIONAL, simplified presentation layer, not
 * a replacement for it.
 *
 * `previousDifficulty` (Stage 3, 2026-11-02 — see docs/system-audit's
 * ADAPTIVE_ENGINE_DIAGNOSTICS.md and FINDINGS_REGISTER.md) is the
 * immediately preceding selection's own `targetDifficulty.difficulty`
 * for this same session, read from `selectionTraces.at(-2)` by the
 * caller — never recomputed or guessed here. Before this change,
 * "Moving to a harder question" fired off an ABSOLUTE check
 * (`evidenceCount >= 3 && difficulty >= 4`) with no reference to the
 * previous question at all, so it could display even when difficulty
 * had not actually changed (e.g. two consecutive questions both at
 * difficulty 4). It now requires a genuine difficulty increase between
 * two real, recorded trace values; with no previous trace (the first
 * question of a session) or an unchanged/lower difficulty, it falls back
 * to a claim that doesn't assert a difficulty comparison.
 */
export function explainSelection(trace: AdaptiveSelectionTrace, previousDifficulty?: DifficultyLevel | null): string {
  const { targetConcept, targetDifficulty } = trace;

  switch (targetConcept.reason) {
    case "insufficient_evidence":
      return "Starting with a question to see where you're at on this topic.";
    case "progression": {
      const current = targetDifficulty.difficulty;
      if (current != null && previousDifficulty != null && current > previousDifficulty) {
        return "Moving to a harder question after consistent success.";
      }
      if (current != null && previousDifficulty != null && current < previousDifficulty) {
        return "Moving to an easier question to build confidence on this topic.";
      }
      return "Continuing to practise this topic.";
    }
    case "remediation":
      return "Practising this concept again with an easier question after some recent mistakes.";
    case "prerequisite_backtrack":
      return "Revisiting an earlier concept that this topic depends on, to check it's solid.";
    case "diagnostic_probe":
      return "Briefly checking an earlier concept you haven't practised in a while, given the recent difficulty here.";
    case "no_eligible_concept":
      return "Reviewing previously covered material.";
    default: {
      const exhaustiveCheck: never = targetConcept.reason;
      return exhaustiveCheck;
    }
  }
}

/** One line distinguishing "limited evidence so far" from "comfortably practising" — for the progress view, not the question screen. */
export function describeEvidenceLevel(numObservations: number, minEvidenceCount: number): string {
  if (numObservations === 0) return "Not yet practised";
  if (numObservations < minEvidenceCount) return "Limited evidence so far";
  return "Practised";
}

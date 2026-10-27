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
 */
export function explainSelection(trace: AdaptiveSelectionTrace): string {
  const { targetConcept, targetDifficulty } = trace;

  switch (targetConcept.reason) {
    case "insufficient_evidence":
      return "Starting with a question to see where you're at on this topic.";
    case "progression":
      return targetDifficulty.evidenceCount >= 3 && (targetDifficulty.difficulty ?? 0) >= 4
        ? "Moving to a harder question after consistent success."
        : "Continuing to practise this topic.";
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

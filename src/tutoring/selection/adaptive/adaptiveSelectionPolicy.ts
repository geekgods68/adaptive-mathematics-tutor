import type { QuestionSelectionPolicy, QuestionSelectionResult } from "@/tutoring/selection/types";
import type { AdaptiveSelectionContext } from "@/tutoring/selection/adaptive/types";

/**
 * SKELETON ONLY — this repository builds and validates the non-adaptive
 * tutor (this is the `non-adaptive-tutor` repo; the adaptive condition is
 * developed separately). This class exists so the QuestionSelectionPolicy
 * abstraction is visibly implementable by both conditions, and so
 * experimental-separation tests can assert both sides of the interface
 * compile against their own context type. It intentionally does not
 * implement mastery-driven sequencing.
 */
export class AdaptiveSelectionPolicy implements QuestionSelectionPolicy<AdaptiveSelectionContext> {
  readonly condition = "adaptive" as const;

  selectNextQuestion(_context: AdaptiveSelectionContext): QuestionSelectionResult {
    throw new Error(
      "AdaptiveSelectionPolicy is not implemented here. Mastery-driven sequencing is developed in the adaptive-tutor repository.",
    );
  }
}

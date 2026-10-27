import { NonAdaptiveSelectionPolicy } from "@/tutoring/selection/nonAdaptive/nonAdaptiveSelectionPolicy";
import type { NonAdaptiveSelectionContext } from "@/tutoring/selection/nonAdaptive/types";
import { AdaptiveSelectionPolicy } from "@/tutoring/selection/adaptive/adaptiveSelectionPolicy";
import { DEFAULT_ADAPTIVE_SELECTION_CONFIG, type AdaptiveSelectionConfig } from "@/tutoring/selection/adaptive/config";
import type { AdaptiveSelectionContext } from "@/tutoring/selection/adaptive/types";
import type { ConceptMasteryState } from "@/domain/learner-model/types";
import type { SelectionAdapter, SelectionAdapterInput } from "@/research/experiment/types";

/**
 * Wraps `NonAdaptiveSelectionPolicy` behind the common `SelectionAdapter`
 * contract. Builds a real `NonAdaptiveSelectionContext` internally —
 * `conceptMasteryStates`/`misconceptionTallies` on `SelectionAdapterInput`
 * are simply never read, preserving the structural guarantee that this
 * condition cannot use performance data (see CLAUDE.md hard constraint
 * 4 and src/tutoring/selection/nonAdaptive/types.ts).
 */
export function createNonAdaptiveSelectionAdapter(): SelectionAdapter {
  const policy = new NonAdaptiveSelectionPolicy();
  return {
    policyType: "non_adaptive",
    version: "non-adaptive-selection-v1",
    parameters: {},
    selectNext: (input: SelectionAdapterInput) => {
      if (!input.predeterminedSequence) {
        throw new Error("createNonAdaptiveSelectionAdapter: ExperimentScenario.predeterminedSequence is required for a non-adaptive condition.");
      }
      const context: NonAdaptiveSelectionContext = {
        participantId: input.learnerId,
        predeterminedSequence: input.predeterminedSequence,
        positionIndex: input.sequenceIndex,
      };
      return { result: policy.selectNextQuestion(context) };
    },
  };
}

/**
 * Wraps `AdaptiveSelectionPolicy` behind the common `SelectionAdapter`
 * contract, exposing its full `AdaptiveSelectionTrace` via the adapter's
 * optional `trace` field. `config.prerequisiteAware` (see
 * src/tutoring/selection/adaptive/config.ts) is what distinguishes
 * condition C1/C2 (prerequisite-aware, the default) from C3
 * (prerequisite-unaware ablation) — both go through this SAME adapter
 * constructor with a different config, not a separate policy
 * implementation.
 */
export function createAdaptiveSelectionAdapter(config: AdaptiveSelectionConfig = DEFAULT_ADAPTIVE_SELECTION_CONFIG): SelectionAdapter {
  const policy = new AdaptiveSelectionPolicy(config);
  return {
    policyType: "adaptive",
    version: config.version,
    parameters: config as unknown as Record<string, unknown>,
    selectNext: (input: SelectionAdapterInput) => {
      const context: AdaptiveSelectionContext = {
        learnerId: input.learnerId,
        sessionId: input.sessionId,
        sequenceIndex: input.sequenceIndex,
        availableQuestions: input.availableQuestions,
        concepts: input.concepts,
        curriculumOrder: input.curriculumOrder,
        conceptMasteryStates: input.conceptMasteryStates as Record<string, ConceptMasteryState>,
        misconceptionTallies: input.misconceptionTallies as AdaptiveSelectionContext["misconceptionTallies"],
        presentedQuestionIds: [...input.presentedQuestionIds],
      };
      const { result, trace } = policy.selectNextQuestionWithTrace(context);
      return { result, trace };
    },
  };
}

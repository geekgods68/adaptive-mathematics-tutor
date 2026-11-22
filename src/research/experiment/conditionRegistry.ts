import { EXPERIMENT_CONDITIONS } from "@/research/experiment/conditions";

/**
 * Stage 1 Part 6.4 (docs/research-decisions.md RD-0010): a documented,
 * programmatically-inspectable map from each registered Phase 5
 * condition id to the research-design facts that are otherwise only
 * ever written down in prose (docs/research-decisions.md RD-0006) —
 * canonical question-bank, curriculum scope, session budget, stopping
 * criterion, which research track it supports, and its intended
 * interpretation. This is METADATA ONLY: it does not change, wrap, or
 * re-implement anything `EXPERIMENT_CONDITIONS` (conditions.ts) already
 * builds — `validateConditionRegistry` below cross-checks this metadata
 * against the real, unmodified registry so the two can never silently
 * drift apart.
 */

export type ResearchTrack = "A" | "B" | "both" | "neither";

export interface ConditionRegistryEntry {
  conditionId: "C0" | "C1" | "C2" | "C3";
  estimatorType: "none" | "deterministic-mastery";
  selectionPolicyType: "non_adaptive" | "adaptive";
  /** The question bank this condition is intended to run against in the live product and in Phase 8 — currently always RISE (the canonical shared bank as of Stage 1); the field exists so a future second canonical bank is a data change here, not a new code path. */
  canonicalQuestionBank: "RISE";
  /** Whether this condition's question-selection is restricted to a prerequisite-aware subgraph of the curriculum (adaptive conditions only — the non-adaptive condition has no prerequisite awareness by construction, hard constraint 4). */
  prerequisiteAware: boolean;
  /** "fixed" = always runs exactly `maxQuestions` (or fewer if content runs out); "mastery-threshold" = may stop earlier once a per-concept mastery/evidence threshold is met (Questions-to-Mastery-style stopping). */
  stoppingCriterion: "fixed" | "mastery-threshold";
  supportedTrack: ResearchTrack;
  intendedInterpretation: string;
}

export const CONDITION_REGISTRY: readonly ConditionRegistryEntry[] = [
  {
    conditionId: "C0",
    estimatorType: "none",
    selectionPolicyType: "non_adaptive",
    canonicalQuestionBank: "RISE",
    prerequisiteAware: false,
    stoppingCriterion: "fixed",
    supportedTrack: "B",
    intendedInterpretation: "The non-adaptive sequencing control. No mastery estimation; a fixed, performance-independent predetermined sequence. The baseline every adaptive condition (C1-C3) is compared against for Track B (sequencing value).",
  },
  {
    conditionId: "C1",
    estimatorType: "deterministic-mastery",
    selectionPolicyType: "adaptive",
    canonicalQuestionBank: "RISE",
    prerequisiteAware: true,
    stoppingCriterion: "mastery-threshold",
    supportedTrack: "both",
    intendedInterpretation: "Deterministic mastery Variant A (symmetric difficulty weighting) + prerequisite-aware adaptive selection. An alternative estimator-variant arm for Track A; a full adaptive arm for Track B.",
  },
  {
    conditionId: "C2",
    estimatorType: "deterministic-mastery",
    selectionPolicyType: "adaptive",
    canonicalQuestionBank: "RISE",
    prerequisiteAware: true,
    stoppingCriterion: "mastery-threshold",
    supportedTrack: "both",
    intendedInterpretation: "Deterministic mastery Variant B (inverse difficulty weighting) + prerequisite-aware adaptive selection. The approved provisional default for the live adaptive product (docs/research-decisions.md RD-0004/RD-0006) and the primary Track A/B comparison arm.",
  },
  {
    conditionId: "C3",
    estimatorType: "deterministic-mastery",
    selectionPolicyType: "adaptive",
    canonicalQuestionBank: "RISE",
    prerequisiteAware: false,
    stoppingCriterion: "mastery-threshold",
    supportedTrack: "B",
    intendedInterpretation: "Same estimator as C2, with prerequisite-aware targeting disabled — the controlled ablation isolating the prerequisite graph's contribution to Track B's sequencing-value outcome.",
  },
];

export function getConditionRegistryEntry(conditionId: "C0" | "C1" | "C2" | "C3"): ConditionRegistryEntry {
  const entry = CONDITION_REGISTRY.find((e) => e.conditionId === conditionId);
  if (!entry) throw new Error(`No condition registry entry for "${conditionId}" — this should never happen (every EXPERIMENT_CONDITIONS key must have a matching entry here).`);
  return entry;
}

/**
 * Cross-checks this metadata table against the real `EXPERIMENT_CONDITIONS`
 * registry (conditions.ts) — every condition id must appear in both, and
 * `prerequisiteAware`/`selectionPolicyType`/`estimatorType` here must
 * match what the real `build()` output actually produces, not just what
 * this file claims. Returns a list of human-readable mismatches; an empty
 * array means the two are consistent. Intended to run as part of the
 * Stage 1 regression suite (see tests/tutoring/stage1/conditionRegistry.test.ts)
 * so a future change to either file that silently breaks this mapping is
 * caught immediately, not discovered later in an analysis script.
 */
export function validateConditionRegistry(): string[] {
  const errors: string[] = [];
  const registryIds = new Set(CONDITION_REGISTRY.map((e) => e.conditionId));
  const liveIds = Object.keys(EXPERIMENT_CONDITIONS) as Array<keyof typeof EXPERIMENT_CONDITIONS>;

  for (const id of liveIds) {
    if (!registryIds.has(id)) errors.push(`EXPERIMENT_CONDITIONS has "${id}" but CONDITION_REGISTRY does not document it`);
  }
  for (const entry of CONDITION_REGISTRY) {
    if (!(entry.conditionId in EXPERIMENT_CONDITIONS)) {
      errors.push(`CONDITION_REGISTRY documents "${entry.conditionId}" but EXPERIMENT_CONDITIONS does not register it`);
      continue;
    }
    const built = EXPERIMENT_CONDITIONS[entry.conditionId].build();
    if (built.selection.policyType !== entry.selectionPolicyType) {
      errors.push(`"${entry.conditionId}": registry says selectionPolicyType="${entry.selectionPolicyType}" but the real build() produces "${built.selection.policyType}"`);
    }
    const realEstimatorType = built.estimator.estimatorType === "none" ? "none" : "deterministic-mastery";
    if (realEstimatorType !== entry.estimatorType) {
      errors.push(`"${entry.conditionId}": registry says estimatorType="${entry.estimatorType}" but the real build() produces estimatorType "${built.estimator.estimatorType}"`);
    }
    const realPrerequisiteAware = typeof built.selection.parameters.prerequisiteAware === "boolean" ? built.selection.parameters.prerequisiteAware : undefined;
    if (realPrerequisiteAware !== undefined && realPrerequisiteAware !== entry.prerequisiteAware) {
      errors.push(`"${entry.conditionId}": registry says prerequisiteAware=${entry.prerequisiteAware} but the real selection config has prerequisiteAware=${realPrerequisiteAware}`);
    }
  }
  return errors;
}

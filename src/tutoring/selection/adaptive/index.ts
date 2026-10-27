export type { AdaptiveSelectionConfig, MasteryDifficultyBand } from "@/tutoring/selection/adaptive/config";
export { DEFAULT_ADAPTIVE_SELECTION_CONFIG } from "@/tutoring/selection/adaptive/config";
export type {
  AdaptiveSelectionContext,
  AdaptiveSelectionTrace,
  CandidateScore,
  ConsideredConceptTrace,
  DiagnosticCandidateInfo,
  DiagnosticProbeDetails,
  FallbackMode,
  TargetConceptDecision,
  TargetDifficultyDecision,
} from "@/tutoring/selection/adaptive/types";
export {
  chooseTargetConcept,
  chooseTargetDifficulty,
  findDiagnosticBacktrackTarget,
  findProgressionFrontier,
  findRemediationTarget,
  isConceptMastered,
  resolveDifficultyBand,
  type DiagnosticBacktrackResult,
} from "@/tutoring/selection/adaptive/targeting";
export { selectCandidateQuestion, type CandidateSelectionResult } from "@/tutoring/selection/adaptive/candidateSelection";
export { AdaptiveSelectionPolicy, selectAdaptiveQuestion } from "@/tutoring/selection/adaptive/adaptiveSelectionPolicy";

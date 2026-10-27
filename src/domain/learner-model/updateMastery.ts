import type {
  ApplyResponseResult,
  ConceptMasteryState,
  MasteryUpdateTrace,
  ModelParameters,
  ResponseEvidence,
  ResponseEvidenceRecord,
} from "@/domain/learner-model/types";
import { DEFAULT_MODEL_PARAMETERS } from "@/domain/learner-model/parameters";
import { createInitialConceptState } from "@/domain/learner-model/initialize";

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Builds the human-readable explanation FROM the already-computed terms —
 * never written independently of the calculation, so it cannot describe
 * anything other than what actually ran (the research brief's explicit
 * "avoid explanations that merely describe what the model was supposed to
 * do" requirement).
 */
function buildExplanation(
  correct: boolean,
  previousMastery: number,
  terms: MasteryUpdateTrace["termsComputed"],
  conceptWeight: number,
  incorrectDifficultyWeighting: ModelParameters["incorrectDifficultyWeighting"],
): string {
  const pct = (n: number) => n.toFixed(4);
  if (correct) {
    const weightClause = conceptWeight === 1 ? "" : ` × conceptWeight(${pct(conceptWeight)})`;
    return (
      `Correct response: M_new = M_old + α×(1−M_old)×w_d×w_h${weightClause ? " × weight" : ""} = ` +
      `${pct(previousMastery)} + α×(1−${pct(previousMastery)})×${pct(terms.difficultyWeight)}×${pct(terms.hintMultiplier)}${weightClause} = ` +
      `${pct(previousMastery)} + ${pct(terms.appliedDelta)} = ${pct(terms.clampedResult)}` +
      (terms.clampedResult !== previousMastery + terms.appliedDelta ? " (clamped)" : "")
    );
  }
  const weightClause = conceptWeight === 1 ? "" : ` × conceptWeight(${pct(conceptWeight)})`;
  const difficultyTerm = incorrectDifficultyWeighting === "inverse" ? `(1/w_d)=${pct(terms.difficultyFactorApplied)}` : `w_d=${pct(terms.difficultyFactorApplied)}`;
  return (
    `Incorrect response [${incorrectDifficultyWeighting}]: M_new = M_old − β×M_old×${incorrectDifficultyWeighting === "inverse" ? "(1/w_d)" : "w_d"}${weightClause ? " × weight" : ""} = ` +
    `${pct(previousMastery)} − β×${pct(previousMastery)}×${difficultyTerm}${weightClause} = ` +
    `${pct(previousMastery)} − ${pct(Math.abs(terms.appliedDelta))} = ${pct(terms.clampedResult)}` +
    (terms.clampedResult !== previousMastery + terms.appliedDelta ? " (clamped)" : "")
  );
}

/**
 * The approved single-concept deterministic mastery update (see
 * docs/research-decisions.md RD-0003 for the full specification):
 *
 *   Correct:   M_new = M_old + α(1 − M_old)·w_d·w_h
 *   Incorrect: M_new = M_old − β·M_old·w_d
 *
 * `conceptWeight` scales the resulting delta (not M_old itself) — see
 * RD-0003's multi-concept attribution rule. At `conceptWeight = 1` (the
 * single-concept case) this is byte-for-byte the formula above with no
 * scaling, which is verified by a dedicated test.
 *
 * Pure and deterministic: identical inputs always produce an identical
 * {state, trace} pair.
 */
export function updateMastery(
  previousState: ConceptMasteryState,
  evidence: ResponseEvidence,
  conceptWeight: number,
  parameters: ModelParameters = DEFAULT_MODEL_PARAMETERS,
): { state: ConceptMasteryState; trace: MasteryUpdateTrace } {
  const { correct, difficulty, usedHint } = evidence;
  const difficultyWeight = parameters.difficultyWeights[difficulty];
  if (difficultyWeight === undefined) {
    throw new Error(`updateMastery: no difficultyWeight configured for difficulty "${difficulty}"`);
  }
  // w_h is a POSITIVE-response evidence weight only -- never applied to an
  // incorrect response, regardless of usedHint (matches the approved spec
  // and the sibling formula's documented rule: a hint never reduces
  // mastery on its own, it only reduces the GAIN of an otherwise-correct
  // answer).
  const hintMultiplier = correct && usedHint ? parameters.hintGainMultiplier : 1;

  // The correct branch always multiplies by w_d directly (unchanged by
  // the variant below, which only governs the INCORRECT branch — see
  // docs/research-decisions.md RD-0004). The incorrect branch's factor
  // depends on `incorrectDifficultyWeighting`:
  //  - "multiplicative" (Variant A / deterministic-mastery-v1): w_d —
  //    harder incorrect responses are penalised MORE.
  //  - "inverse" (Variant B): 1/w_d — harder incorrect responses are
  //    penalised LESS (failing an easy question is treated as stronger
  //    evidence of a gap than failing a hard one).
  let difficultyFactorApplied = difficultyWeight;
  if (!correct && parameters.incorrectDifficultyWeighting === "inverse") {
    if (difficultyWeight === 0) {
      throw new Error("updateMastery: incorrectDifficultyWeighting is \"inverse\" but difficultyWeight is 0 — 1/w_d is undefined.");
    }
    difficultyFactorApplied = 1 / difficultyWeight;
  }

  const gapOrCurrentTerm = correct ? 1 - previousState.mastery : previousState.mastery;
  const rateConstant: MasteryUpdateTrace["termsComputed"]["rateConstant"] = correct ? "correctGainRate" : "incorrectLossRate";
  const rateValue = correct ? parameters.correctGainRate : parameters.incorrectLossRate;
  const signedRate = correct ? rateValue : -rateValue;

  const unweightedDelta = signedRate * gapOrCurrentTerm * difficultyFactorApplied * hintMultiplier;
  const appliedDelta = unweightedDelta * conceptWeight;
  const clampedResult = clamp(previousState.mastery + appliedDelta, 0, 1);

  const termsComputed: MasteryUpdateTrace["termsComputed"] = {
    gapOrCurrentTerm,
    difficultyWeight,
    difficultyFactorApplied,
    hintMultiplier,
    rateConstant,
    unweightedDelta,
    appliedDelta,
    clampedResult,
  };

  const evidenceRecord: ResponseEvidenceRecord = {
    questionId: evidence.questionId,
    correct,
    difficulty,
    usedHint,
    conceptWeight,
    ...(correct ? {} : evidence.misconceptionId ? { misconceptionId: evidence.misconceptionId } : {}),
    sequenceIndex: evidence.sequenceIndex,
    timestamp: evidence.timestamp,
  };

  const recentEvidence = [...previousState.recentEvidence, evidenceRecord].slice(-parameters.recentEvidenceLimit);

  const newState: ConceptMasteryState = {
    ...previousState,
    mastery: clampedResult,
    numObservations: previousState.numObservations + 1,
    correctCount: previousState.correctCount + (correct ? 1 : 0),
    incorrectCount: previousState.incorrectCount + (correct ? 0 : 1),
    consecutiveCorrect: correct ? previousState.consecutiveCorrect + 1 : 0,
    consecutiveIncorrect: correct ? 0 : previousState.consecutiveIncorrect + 1,
    recentEvidence,
    lastSequenceIndex: evidence.sequenceIndex,
    lastUpdatedAt: evidence.timestamp,
  };

  const trace: MasteryUpdateTrace = {
    modelVersion: parameters.version,
    parameters,
    learnerId: previousState.learnerId,
    conceptId: previousState.conceptId,
    questionId: evidence.questionId,
    selectedOptionId: evidence.selectedOptionId,
    ...(evidence.misconceptionId ? { misconceptionId: evidence.misconceptionId } : {}),
    correct,
    difficulty,
    usedHint,
    conceptWeight,
    sequenceIndex: evidence.sequenceIndex,
    timestamp: evidence.timestamp,
    previousMastery: previousState.mastery,
    termsComputed,
    newMastery: clampedResult,
    explanation: buildExplanation(correct, previousState.mastery, termsComputed, conceptWeight, parameters.incorrectDifficultyWeighting),
  };

  return { state: newState, trace };
}

/**
 * Fans ONE ResponseEvidence out across every concept in its
 * `conceptWeights` map, updating each concept's state independently (see
 * docs/research-decisions.md RD-0003's multi-concept attribution rule).
 * Creates a fresh cold-start state for any concept not already present in
 * `currentStates` (section 4's cold-start handling, generalised to the
 * multi-concept case).
 *
 * Does NOT touch any concept outside `evidence.conceptWeights` — in
 * particular, a question's `prerequisiteConceptIds` are never updated
 * here, by design (section 4: "do not automatically award mastery to
 * prerequisite concepts merely because a dependent question was answered
 * correctly").
 */
export function applyResponseEvidence(
  currentStates: Record<string, ConceptMasteryState>,
  evidence: ResponseEvidence,
  learnerId: string,
  parameters: ModelParameters = DEFAULT_MODEL_PARAMETERS,
): ApplyResponseResult {
  const updatedStates: Record<string, ConceptMasteryState> = { ...currentStates };
  const traces: MasteryUpdateTrace[] = [];

  const conceptIds = Object.keys(evidence.conceptWeights);
  if (conceptIds.length === 0) {
    throw new Error(`applyResponseEvidence: evidence for question "${evidence.questionId}" has an empty conceptWeights map`);
  }

  for (const conceptId of conceptIds) {
    const weight = evidence.conceptWeights[conceptId];
    const existing = currentStates[conceptId] ?? createInitialConceptState(learnerId, conceptId, evidence.timestamp, parameters);
    const { state, trace } = updateMastery(existing, evidence, weight, parameters);
    updatedStates[conceptId] = state;
    traces.push(trace);
  }

  return { updatedStates, traces };
}
